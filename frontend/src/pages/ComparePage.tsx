import { useState } from "react";
import { apiPost } from "../lib/api";
import SubgraphView from "../components/SubgraphView";

interface Citation {
  article_id: string;
  title: string;
  source: string;
  url: string;
}

interface GraphNode {
  id: string;
  name: string;
  type: string;
}

interface GraphEdge {
  source: string;
  target: string;
  type: string;
}

interface GraphAnswer {
  answer: string;
  citations: Citation[];
  subgraph: { nodes: GraphNode[]; edges: GraphEdge[] };
}

interface VanillaAnswer {
  answer: string;
  citations: Citation[];
}

interface CompareResponse {
  graph_rag: GraphAnswer;
  vanilla_rag: VanillaAnswer;
}

function CitationList({ citations }: { citations: Citation[] }) {
  if (citations.length === 0) return null;
  return (
    <ol className="text-sm space-y-1 list-decimal list-inside mt-3">
      {citations.map((c) => (
        <li key={c.article_id}>
          <a href={c.url} target="_blank" rel="noreferrer" className="underline">
            {c.title}
          </a>{" "}
          <span className="text-gray-500">— {c.source}</span>
        </li>
      ))}
    </ol>
  );
}

export default function ComparePage() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CompareResponse | null>(null);
  const [error, setError] = useState("");

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim() || loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await apiPost<CompareResponse>("/query/compare", { question });
      setResult(res);
    } catch {
      setError("Query failed — is the backend running and has the corpus been ingested?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-xl font-semibold mb-1">Comparison</h1>
      <p className="text-gray-500 text-sm mb-4">Vanilla RAG vs Graph RAG, side by side.</p>

      <form onSubmit={ask} className="flex gap-2 mb-6">
        <input
          className="flex-1 border rounded px-3 py-2"
          placeholder="e.g. Which companies did Sam Altman work at before founding OpenAI?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? "Asking..." : "Ask"}
        </button>
      </form>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {result && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border rounded p-4">
            <h2 className="font-semibold mb-2">Vanilla RAG</h2>
            <p className="whitespace-pre-wrap text-sm">{result.vanilla_rag.answer}</p>
            <CitationList citations={result.vanilla_rag.citations} />
          </div>
          <div className="border rounded p-4">
            <h2 className="font-semibold mb-2">Graph RAG</h2>
            <p className="whitespace-pre-wrap text-sm">{result.graph_rag.answer}</p>
            <CitationList citations={result.graph_rag.citations} />
            {result.graph_rag.subgraph.nodes.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-gray-500 mb-2">Retrieval path</h3>
                <SubgraphView nodes={result.graph_rag.subgraph.nodes} edges={result.graph_rag.subgraph.edges} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { FileText, RefreshCw, Send } from "lucide-react";
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

interface GenericAnswer {
  answer: string;
  citations: Citation[];
}

interface CompareResponse {
  graph_rag: GraphAnswer;
  generic_rag: GenericAnswer;
}

function CitationList({ citations }: { citations: Citation[] }) {
  if (citations.length === 0) return null;
  return (
    <div className="mt-5 space-y-1.5 border-t border-[var(--border)] pt-4">
      {citations.map((c) => (
        <a
          key={c.article_id}
          href={c.url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
        >
          <FileText className="h-3.5 w-3.5 shrink-0 text-[var(--text-faint)]" />
          <span className="truncate">{c.title}</span>
          <span className="ml-auto shrink-0 text-[var(--text-faint)]">{c.source}</span>
        </a>
      ))}
    </div>
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
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-6">
        <div className="label mb-2">A / B retrieval</div>
        <h1 className="text-2xl font-semibold tracking-tight">Comparison</h1>
        <p className="mt-1.5 text-sm text-[var(--text-muted)]">
          Same question, same corpus — only the retrieval strategy changes.
        </p>
      </div>

      <form onSubmit={ask} className="card flex items-center gap-2 p-2">
        <input
          className="flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-[var(--text-faint)]"
          placeholder="e.g. Which companies did Sam Altman work at before founding OpenAI?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <button
          type="submit"
          disabled={loading}
          className="flex h-9 items-center gap-1.5 rounded-md bg-[var(--accent)] px-3.5 text-sm font-medium text-[var(--accent-foreground)] disabled:opacity-40"
        >
          {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {loading ? "Asking" : "Ask"}
        </button>
      </form>

      {error && <p className="mt-4 text-sm text-[var(--danger)]">{error}</p>}

      {result && (
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="card p-5">
            <div className="label mb-1">Baseline · vector only</div>
            <h2 className="text-base font-semibold">Generic RAG</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6.5 text-[var(--text-muted)]">
              {result.generic_rag.answer}
            </p>
            <CitationList citations={result.generic_rag.citations} />
          </div>
          <div className="card border-[var(--accent)]/25 p-5" style={{ borderColor: "color-mix(in srgb, var(--accent) 25%, var(--border))" }}>
            <div className="label mb-1" style={{ color: "var(--accent)" }}>
              Hybrid · graph + vector
            </div>
            <h2 className="text-base font-semibold">Graph RAG</h2>
            <p className="mt-3 whitespace-pre-wrap text-[15px] leading-7">{result.graph_rag.answer}</p>
            <CitationList citations={result.graph_rag.citations} />
            {result.graph_rag.subgraph.nodes.length > 0 && (
              <div className="mt-5 border-t border-[var(--border)] pt-4">
                <div className="label mb-3" style={{ color: "var(--accent)" }}>
                  Subgraph used
                </div>
                <SubgraphView nodes={result.graph_rag.subgraph.nodes} edges={result.graph_rag.subgraph.edges} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

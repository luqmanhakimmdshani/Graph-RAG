import { useState } from "react";
import { ChevronDown, ChevronUp, FileText, Send, Sparkles } from "lucide-react";
import { apiPost } from "../lib/api";
import SubgraphView from "../components/SubgraphView";

interface Citation {
  article_id: string;
  title: string;
  source: string;
  url: string;
}

interface CommunityCitation {
  community_id: number;
  size: number;
  summary: string;
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

interface QueryResponse {
  answer: string;
  citations: Citation[] | CommunityCitation[];
  subgraph: { nodes: GraphNode[]; edges: GraphEdge[] };
  mode?: "graph" | "global" | "error";
  error?: string;
}

export default function ChatPage() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResponse | null>(null);
  const [error, setError] = useState("");
  const [showSubgraph, setShowSubgraph] = useState(false);

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim() || loading) return;
    setLoading(true);
    setError("");
    setResult(null);
    setShowSubgraph(false);
    try {
      const res = await apiPost<QueryResponse>("/query", { question });
      if (res.error) setError(res.error);
      else setResult(res);
    } catch {
      setError("Query failed — is the backend running and has the corpus been ingested?");
    } finally {
      setLoading(false);
    }
  }

  const isCommunityCitations = result?.mode === "global";
  const hasSubgraph = !!result && result.subgraph.nodes.length > 0;

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-6">
        <div className="label mb-2">Graph RAG</div>
        <h1 className="text-2xl font-semibold tracking-tight">Chat</h1>
        <p className="mt-1.5 text-sm text-[var(--text-muted)]">
          Answers grounded in the knowledge graph, falling back to corpus-wide summaries for
          broader questions. See <span className="text-[var(--text)]">Compare</span> for generic RAG side by side.
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
          {loading ? <Sparkles className="h-4 w-4 animate-pulse" /> : <Send className="h-4 w-4" />}
          {loading ? "Asking" : "Ask"}
        </button>
      </form>

      {error && <p className="mt-4 text-sm text-[var(--danger)]">{error}</p>}

      {result && (
        <div className="card mt-4 p-5">
          {result.mode === "global" && (
            <div
              className="mb-3 inline-flex items-center rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-medium"
              style={{ color: "var(--accent)" }}
            >
              Answered from corpus-wide summaries
            </div>
          )}
          <p className="whitespace-pre-wrap text-[15px] leading-7">{result.answer}</p>

          {hasSubgraph && (
            <button
              onClick={() => setShowSubgraph((s) => !s)}
              className="mt-4 flex items-center gap-1.5 text-xs font-medium text-[var(--accent)]"
            >
              {showSubgraph ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {showSubgraph ? "Hide" : "Show"} subgraph used
            </button>
          )}
          {hasSubgraph && showSubgraph && (
            <div className="card mt-3 p-4">
              <SubgraphView nodes={result.subgraph.nodes} edges={result.subgraph.edges} />
            </div>
          )}

          {result.citations.length > 0 && (
            <div className="mt-5 border-t border-[var(--border)] pt-4">
              <div className="label mb-2.5">{isCommunityCitations ? "Cluster summaries used" : "Sources"}</div>
              <div className="space-y-1.5">
                {isCommunityCitations
                  ? (result.citations as CommunityCitation[]).map((c) => (
                      <div key={c.community_id} className="rounded-md px-2.5 py-1.5 text-sm text-[var(--text-muted)]">
                        <span className="mono text-xs text-[var(--text-faint)]">[{c.size} entities]</span> {c.summary}
                      </div>
                    ))
                  : (result.citations as Citation[]).map((c) => (
                      <a
                        key={c.article_id}
                        href={c.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
                      >
                        <FileText className="h-3.5 w-3.5 shrink-0 text-[var(--text-faint)]" />
                        <span className="truncate">{c.title}</span>
                        <span className="ml-auto shrink-0 text-xs text-[var(--text-faint)]">{c.source}</span>
                      </a>
                    ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

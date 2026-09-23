import { useEffect, useState } from "react";
import { FileText, RefreshCw, Send } from "lucide-react";
import { apiGet, apiPost } from "../lib/api";
import SubgraphView from "../components/SubgraphView";

interface BenchmarkQuestion {
  id: string;
  category: string;
  question: string;
}

const CATEGORY_LABELS: Record<string, string> = { local: "Local", multi_hop: "Multi-hop", global: "Global" };

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

interface GraphAnswer {
  answer: string;
  citations: Citation[] | CommunityCitation[];
  subgraph: { nodes: GraphNode[]; edges: GraphEdge[] };
  mode?: "graph" | "global" | "error";
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

function CommunityCitationList({ citations }: { citations: CommunityCitation[] }) {
  if (citations.length === 0) return null;
  return (
    <div className="mt-5 space-y-1.5 border-t border-[var(--border)] pt-4">
      {citations.map((c) => (
        <div key={c.community_id} className="rounded-md px-2 py-1.5 text-xs text-[var(--text-muted)]">
          <span className="mono text-[var(--text-faint)]">[{c.size} entities]</span> {c.summary}
        </div>
      ))}
    </div>
  );
}

export default function ComparePage() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CompareResponse | null>(null);
  const [error, setError] = useState("");
  const [presets, setPresets] = useState<BenchmarkQuestion[]>([]);

  useEffect(() => {
    apiGet<BenchmarkQuestion[]>("/eval/questions").then(setPresets).catch(() => {});
  }, []);

  async function ask(q: string) {
    if (!q.trim() || loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await apiPost<CompareResponse>("/query/compare", { question: q });
      setResult(res);
    } catch {
      setError("Query failed — is the backend running and has the corpus been ingested?");
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    void ask(question);
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

      {presets.length > 0 && (
        <select
          className="mb-3 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text-muted)] outline-none"
          value=""
          disabled={loading}
          onChange={(e) => {
            const q = presets.find((p) => p.id === e.target.value)?.question;
            if (!q) return;
            setQuestion(q);
            void ask(q);
          }}
        >
          <option value="" disabled>
            Or pick a benchmark question…
          </option>
          {presets.map((p) => (
            <option key={p.id} value={p.id}>
              [{CATEGORY_LABELS[p.category] ?? p.category}] {p.question}
            </option>
          ))}
        </select>
      )}

      <form onSubmit={onSubmit} className="card flex items-center gap-2 p-2">
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
              {result.graph_rag.mode === "global" ? "Corpus-wide summaries" : "Hybrid · graph + vector"}
            </div>
            <h2 className="text-base font-semibold">Graph RAG</h2>
            <p className="mt-3 whitespace-pre-wrap text-[15px] leading-7">{result.graph_rag.answer}</p>
            {result.graph_rag.mode === "global" ? (
              <CommunityCitationList citations={result.graph_rag.citations as CommunityCitation[]} />
            ) : (
              <CitationList citations={result.graph_rag.citations as Citation[]} />
            )}
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

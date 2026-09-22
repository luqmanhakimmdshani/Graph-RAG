import { useEffect, useState } from "react";
import { ChevronRight, RefreshCw } from "lucide-react";
import { apiGet, apiPost } from "../lib/api";

interface CategorySummary {
  n: number;
  vanilla_relevance: number;
  vanilla_faithfulness: number;
  graph_relevance: number;
  graph_faithfulness: number;
}

interface EvalRow {
  id: string;
  category: string;
  question: string;
  reference_answer: string;
  vanilla_answer: string;
  vanilla_relevance: number;
  vanilla_faithfulness: number;
  graph_answer: string;
  graph_relevance: number;
  graph_faithfulness: number;
}

interface EvalResponse {
  results: EvalRow[];
  summary: Record<string, CategorySummary>;
}

const CATEGORY_LABELS: Record<string, string> = {
  local: "Local",
  multi_hop: "Multi-hop",
  global: "Global",
  overall: "Overall",
};
const CATEGORY_ORDER = ["local", "multi_hop", "global", "overall"];

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div className="flex items-center gap-2.5 text-xs">
      <span className="w-20 shrink-0 text-[var(--text-faint)]">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--surface-hover)]">
        <div className="h-full rounded-full" style={{ width: `${(value / max) * 100}%`, backgroundColor: color }} />
      </div>
      <span className="w-6 shrink-0 text-right text-[var(--text-muted)]">{value.toFixed(1)}</span>
    </div>
  );
}

export default function EvalPage() {
  const [data, setData] = useState<EvalResponse | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    apiGet<EvalResponse>("/eval/results").then(setData).catch(() => {});
  }, []);

  async function run() {
    setRunning(true);
    setError("");
    try {
      const res = await apiPost<EvalResponse>("/eval/run", {});
      setData(res);
    } catch {
      setError("Benchmark run failed — is the backend running?");
    } finally {
      setRunning(false);
    }
  }

  const categories = data ? CATEGORY_ORDER.filter((c) => data.summary[c]) : [];

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="label mb-2">Evaluation harness</div>
          <h1 className="text-2xl font-semibold tracking-tight">Evaluation</h1>
          <p className="mt-1.5 text-sm text-[var(--text-muted)]">
            Benchmark scores per system, per category — relevance / faithfulness, 0-5, LLM-as-judge.
          </p>
        </div>
        <button
          onClick={run}
          disabled={running}
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-[var(--accent)] px-3.5 text-sm font-medium text-[var(--accent-foreground)] disabled:opacity-40"
        >
          <RefreshCw className={`h-4 w-4 ${running ? "animate-spin" : ""}`} />
          {running ? "Running…" : "Run benchmark"}
        </button>
      </div>
      {error && <p className="mb-4 text-sm text-[var(--danger)]">{error}</p>}

      {!data && !running && <p className="text-sm text-[var(--text-faint)]">No results yet — run the benchmark.</p>}

      {data && categories.length > 0 && (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2">
            {categories.map((cat) => {
              const s = data.summary[cat];
              return (
                <div key={cat} className="card p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-sm font-semibold">{CATEGORY_LABELS[cat] ?? cat}</h2>
                    <span className="text-xs text-[var(--text-faint)]">{s.n} questions</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                    <div className="space-y-1.5">
                      <p className="mb-0.5 text-[10px] uppercase tracking-wider text-[var(--text-faint)]">Vanilla</p>
                      <Bar label="Relevance" value={s.vanilla_relevance} max={5} color="var(--text-faint)" />
                      <Bar label="Faithfulness" value={s.vanilla_faithfulness} max={5} color="var(--text-faint)" />
                    </div>
                    <div className="space-y-1.5">
                      <p className="mb-0.5 text-[10px] uppercase tracking-wider" style={{ color: "var(--accent)" }}>
                        Graph RAG
                      </p>
                      <Bar label="Relevance" value={s.graph_relevance} max={5} color="var(--accent)" />
                      <Bar label="Faithfulness" value={s.graph_faithfulness} max={5} color="var(--accent)" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div>
            <div className="label mb-2.5">Per-question results</div>
            <div className="card divide-y divide-[var(--border)] overflow-hidden p-0">
              {data.results.map((r) => (
                <div key={r.id}>
                  <button
                    className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-[var(--surface-hover)]"
                    onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <ChevronRight
                        className={`h-3.5 w-3.5 shrink-0 text-[var(--text-faint)] transition-transform ${expanded === r.id ? "rotate-90" : ""}`}
                      />
                      <span className="shrink-0 text-xs text-[var(--text-faint)]">
                        [{CATEGORY_LABELS[r.category] ?? r.category}]
                      </span>
                      <span className="truncate">{r.question}</span>
                    </span>
                    <span className="shrink-0 text-xs text-[var(--text-faint)]">
                      V {r.vanilla_relevance}/{r.vanilla_faithfulness} · G {r.graph_relevance}/{r.graph_faithfulness}
                    </span>
                  </button>
                  {expanded === r.id && (
                    <div className="space-y-2 px-4 pb-4 pl-10 text-sm">
                      <p>
                        <span className="text-[var(--text-faint)]">Reference: </span>
                        {r.reference_answer}
                      </p>
                      <p>
                        <span className="text-[var(--text-faint)]">Vanilla: </span>
                        {r.vanilla_answer}
                      </p>
                      <p>
                        <span className="text-[var(--text-faint)]">Graph RAG: </span>
                        {r.graph_answer}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

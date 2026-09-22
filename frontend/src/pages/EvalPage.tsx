import { useEffect, useState } from "react";
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
    <div className="flex items-center gap-2 text-xs">
      <span className="w-24 text-gray-500 shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 rounded h-3 overflow-hidden">
        <div className="h-full rounded" style={{ width: `${(value / max) * 100}%`, backgroundColor: color }} />
      </div>
      <span className="w-8 text-right shrink-0">{value.toFixed(1)}</span>
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
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-xl font-semibold mb-1">Evaluation</h1>
      <p className="text-gray-500 text-sm mb-4">
        Benchmark scores per system, per question category (relevance / faithfulness, 0-5, LLM-as-judge).
      </p>

      <button
        onClick={run}
        disabled={running}
        className="bg-black text-white px-4 py-2 rounded disabled:opacity-50 mb-2"
      >
        {running ? "Running benchmark (several minutes)..." : "Run benchmark"}
      </button>
      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {!data && !running && <p className="text-sm text-gray-500 mt-4">No results yet — run the benchmark.</p>}

      {data && categories.length > 0 && (
        <div className="mt-6 space-y-6">
          {categories.map((cat) => {
            const s = data.summary[cat];
            return (
              <div key={cat} className="border rounded p-4">
                <h2 className="font-semibold mb-1">
                  {CATEGORY_LABELS[cat] ?? cat} <span className="text-gray-400 font-normal text-sm">({s.n} questions)</span>
                </h2>
                <div className="grid grid-cols-2 gap-x-8 gap-y-1 mt-3">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-gray-500 mb-1">Vanilla RAG</p>
                    <Bar label="Relevance" value={s.vanilla_relevance} max={5} color="#9ca3af" />
                    <Bar label="Faithfulness" value={s.vanilla_faithfulness} max={5} color="#9ca3af" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-gray-500 mb-1">Graph RAG</p>
                    <Bar label="Relevance" value={s.graph_relevance} max={5} color="#2563eb" />
                    <Bar label="Faithfulness" value={s.graph_faithfulness} max={5} color="#2563eb" />
                  </div>
                </div>
              </div>
            );
          })}

          <div>
            <h2 className="text-sm font-semibold text-gray-500 mb-2">Per-question results</h2>
            <div className="space-y-2">
              {data.results.map((r) => (
                <div key={r.id} className="border rounded">
                  <button
                    className="w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-2"
                    onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                  >
                    <span>
                      <span className="text-gray-400 mr-2">[{CATEGORY_LABELS[r.category] ?? r.category}]</span>
                      {r.question}
                    </span>
                    <span className="text-gray-400 shrink-0">
                      V {r.vanilla_relevance}/{r.vanilla_faithfulness} · G {r.graph_relevance}/{r.graph_faithfulness}
                    </span>
                  </button>
                  {expanded === r.id && (
                    <div className="px-3 pb-3 text-sm space-y-2 border-t pt-2">
                      <p><span className="text-gray-500">Reference:</span> {r.reference_answer}</p>
                      <p><span className="text-gray-500">Vanilla:</span> {r.vanilla_answer}</p>
                      <p><span className="text-gray-500">Graph RAG:</span> {r.graph_answer}</p>
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

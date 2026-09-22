import { useState } from "react";
import { Search } from "lucide-react";
import { apiGet } from "../lib/api";
import SubgraphView from "../components/SubgraphView";

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

interface SubgraphResponse {
  entity: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  error?: string;
}

export default function ExplorerPage() {
  const [query, setQuery] = useState("");
  const [hops, setHops] = useState(2);
  const [data, setData] = useState<SubgraphResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function search(entity: string, e?: React.FormEvent) {
    e?.preventDefault();
    if (!entity.trim() || loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await apiGet<SubgraphResponse>(
        `/graph/subgraph?entity=${encodeURIComponent(entity)}&hops=${hops}`
      );
      if (res.error) {
        setError(`Backend error: ${res.error}`);
        setData(null);
      } else if (res.nodes.length === 0) {
        setError(`No entity matching "${entity}" found in the graph.`);
        setData(null);
      } else {
        setData(res);
        setQuery(entity);
      }
    } catch {
      setError("Lookup failed — is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  const neighbors = data
    ? Array.from(new Set(data.nodes.filter((n) => n.name !== data.entity).map((n) => n.name)))
    : [];

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-6">
        <div className="label mb-2">Knowledge graph</div>
        <h1 className="text-2xl font-semibold tracking-tight">Explorer</h1>
        <p className="mt-1.5 text-sm text-[var(--text-muted)]">
          Search an entity to see its neighbors in the knowledge graph.
        </p>
      </div>

      <form onSubmit={(e) => search(query, e)} className="card flex items-center gap-2 p-2">
        <Search className="ml-1.5 h-4 w-4 shrink-0 text-[var(--text-faint)]" />
        <input
          className="flex-1 bg-transparent px-2 py-2 text-sm outline-none placeholder:text-[var(--text-faint)]"
          placeholder="e.g. OpenAI"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-sm text-[var(--text-muted)] outline-none"
          value={hops}
          onChange={(e) => setHops(Number(e.target.value))}
        >
          <option value={1}>1 hop</option>
          <option value={2}>2 hops</option>
          <option value={3}>3 hops</option>
        </select>
        <button
          type="submit"
          disabled={loading}
          className="h-9 shrink-0 rounded-md bg-[var(--accent)] px-3.5 text-sm font-medium text-[var(--accent-foreground)] disabled:opacity-40"
        >
          {loading ? "Searching" : "Search"}
        </button>
      </form>

      {error && <p className="mt-4 text-sm text-[var(--danger)]">{error}</p>}

      {data && (
        <div className="mt-6">
          <p className="mb-3 text-xs text-[var(--text-faint)]">
            {data.nodes.length} nodes, {data.edges.length} edges around "{data.entity}"
          </p>
          <div className="card p-4">
            <SubgraphView nodes={data.nodes} edges={data.edges} onNodeClick={(name) => search(name)} />
          </div>
          {neighbors.length > 0 && (
            <div className="mt-5">
              <div className="label mb-2.5">Neighbors</div>
              <div className="flex flex-wrap gap-1.5">
                {neighbors.map((n) => (
                  <button
                    key={n}
                    onClick={() => search(n)}
                    className="rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--text-muted)] transition-colors hover:border-[var(--accent)]/40 hover:text-[var(--text)]"
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

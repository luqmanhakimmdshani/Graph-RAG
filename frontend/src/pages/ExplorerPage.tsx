import { useState } from "react";
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
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold mb-1">Graph Explorer</h1>
      <p className="text-gray-500 text-sm mb-4">Search an entity to see its neighbors in the knowledge graph.</p>

      <form onSubmit={(e) => search(query, e)} className="flex gap-2 mb-6">
        <input
          className="flex-1 border rounded px-3 py-2"
          placeholder="e.g. OpenAI"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="border rounded px-2"
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
          className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {data && (
        <div>
          <p className="text-sm text-gray-500 mb-2">
            {data.nodes.length} nodes, {data.edges.length} edges around "{data.entity}"
          </p>
          <SubgraphView nodes={data.nodes} edges={data.edges} onNodeClick={(name) => search(name)} />
          {neighbors.length > 0 && (
            <div className="mt-4">
              <h2 className="text-sm font-semibold text-gray-500 mb-2">Neighbors</h2>
              <div className="flex flex-wrap gap-2">
                {neighbors.map((n) => (
                  <button
                    key={n}
                    onClick={() => search(n)}
                    className="text-sm border rounded-full px-3 py-1 hover:bg-gray-100"
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

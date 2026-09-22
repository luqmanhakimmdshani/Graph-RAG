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

const TYPE_COLORS: Record<string, string> = {
  PERSON: "#2563eb",
  ORG: "#16a34a",
  PRODUCT: "#d97706",
};

const MAX_NODES = 40;

// ponytail: fixed circular layout, not a force simulation - fine at this node
// count and avoids pulling in a graph-viz dependency for a demo-scale subgraph.
export default function SubgraphView({
  nodes,
  edges,
  onNodeClick,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodeClick?: (name: string) => void;
}) {
  if (nodes.length === 0) return <p className="text-sm text-gray-500">No graph data.</p>;

  const shown = nodes.slice(0, MAX_NODES);
  const shownIds = new Set(shown.map((n) => n.id));
  const visibleEdges = edges.filter((e) => shownIds.has(e.source) && shownIds.has(e.target));

  const size = 480;
  const center = size / 2;
  const radius = size / 2 - 70;
  const positions = new Map(
    shown.map((n, i) => {
      const angle = (2 * Math.PI * i) / shown.length;
      return [n.id, { x: center + radius * Math.cos(angle), y: center + radius * Math.sin(angle) }] as const;
    })
  );

  return (
    <div>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-lg border rounded bg-white">
        {visibleEdges.map((e, i) => {
          const a = positions.get(e.source);
          const b = positions.get(e.target);
          if (!a || !b) return null;
          return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#d1d5db" strokeWidth={1} />;
        })}
        {shown.map((n) => {
          const p = positions.get(n.id)!;
          return (
            <g
              key={n.id}
              transform={`translate(${p.x}, ${p.y})`}
              className={onNodeClick ? "cursor-pointer" : undefined}
              onClick={() => onNodeClick?.(n.name)}
            >
              <circle r={7} fill={TYPE_COLORS[n.type] ?? "#6b7280"} />
              <text x={10} y={4} fontSize={10} fill="#374151">
                {n.name}
              </text>
            </g>
          );
        })}
      </svg>
      {nodes.length > MAX_NODES && (
        <p className="text-xs text-gray-400 mt-1">
          showing {MAX_NODES} of {nodes.length} nodes
        </p>
      )}
    </div>
  );
}

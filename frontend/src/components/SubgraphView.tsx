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
  PERSON: "#f0a860",
  ORG: "var(--accent)",
  PRODUCT: "#6ba3f0",
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
  if (nodes.length === 0) return <p className="text-sm text-[var(--text-faint)]">No graph data.</p>;

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
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-lg">
        {visibleEdges.map((e, i) => {
          const a = positions.get(e.source);
          const b = positions.get(e.target);
          if (!a || !b) return null;
          return (
            <line
              key={i}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              style={{ stroke: "var(--border)" }}
              strokeWidth={1}
            />
          );
        })}
        {shown.map((n) => {
          const p = positions.get(n.id)!;
          const color = TYPE_COLORS[n.type] ?? "var(--text-faint)";
          return (
            <g
              key={n.id}
              transform={`translate(${p.x}, ${p.y})`}
              className={onNodeClick ? "cursor-pointer" : undefined}
              onClick={() => onNodeClick?.(n.name)}
            >
              <circle r={6.5} style={{ fill: color, filter: `drop-shadow(0 0 4px color-mix(in srgb, ${color} 60%, transparent))` }} />
              <text x={10} y={4} fontSize={10} className="mono" style={{ fill: "var(--text-muted)" }}>
                {n.name}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mono mt-3 flex items-center gap-4 text-[11px] text-[var(--text-faint)]">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: TYPE_COLORS.PERSON }} /> person
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: "var(--accent)" }} /> organization
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: TYPE_COLORS.PRODUCT }} /> product
        </span>
        {nodes.length > MAX_NODES && <span className="ml-auto">showing {MAX_NODES} of {nodes.length}</span>}
      </div>
    </div>
  );
}

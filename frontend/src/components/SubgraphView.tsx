import { useEffect, useRef } from "react";
import ForceGraph3D from "3d-force-graph";
import { Vector2 } from "three";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

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

type Node3D = GraphNode & { x?: number; y?: number; z?: number };

const TYPE_COLORS: Record<string, string> = {
  PERSON: "#f0a860",
  PRODUCT: "#6ba3f0",
};

// 3D + orbit controls handle far more nodes legibly than the old flat circle
// ever could - this is just a sanity ceiling for pathological hub entities.
const MAX_NODES = 300;

// Bloom adds light, so it only reads as glow on the dark theme - on the light
// one it washes the pale background out into haze. Checked once at mount: the
// theme follows the OS / data-theme attribute and has no in-app toggle.
function isDarkTheme(): boolean {
  const attr = document.documentElement.dataset.theme;
  return attr === "dark" || (attr !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
}

function cssVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

// ponytail: reaching for 3d-force-graph (wraps three.js + d3-force-3d) rather
// than hand-rolling a 3D force simulation and camera/orbit controls - that's
// exactly the kind of thing a library should own.
export default function SubgraphView({
  nodes,
  edges,
  onNodeClick,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodeClick?: (name: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  // 3d-force-graph's default export isn't generic-parameterized at the call
  // site, so the instance is typed loosely here; our own accessors below
  // still declare the real (Node3D/Link3D) shape they expect.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(null);
  const onNodeClickRef = useRef(onNodeClick);
  onNodeClickRef.current = onNodeClick;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const accent = cssVar("--accent", "#c3ef61");
    const linkColor = cssVar("--border", "rgba(255,255,255,0.15)");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const graph: any = new ForceGraph3D(el);
    graph
      .backgroundColor("rgba(0,0,0,0)")
      .showNavInfo(false)
      .nodeRelSize(4)
      .nodeLabel((n: Node3D) => n.name)
      .nodeColor((n: Node3D) => TYPE_COLORS[n.type] ?? accent)
      .linkColor(() => linkColor)
      .linkOpacity(0.55)
      .linkWidth(0.5)
      .onNodeClick((n: Node3D) => onNodeClickRef.current?.(n.name))
      .height(420);
    graph.width(el.clientWidth);

    // Same postprocessing bloom as CodeGraphHero, dialled down (strength/radius
    // 2.4/0.85 -> 1.3/0.6): at the hero's values a hub entity's dense core
    // bloomed to white, washing out the person/org/product colours the legend
    // relies on. Threshold stays low so small zoomed-out nodes still glow.
    if (isDarkTheme()) {
      graph.postProcessingComposer().addPass(new UnrealBloomPass(new Vector2(el.clientWidth, 420), 1.3, 0.6, 0.04));
    }

    graphRef.current = graph;

    const onResize = () => graph.width(el.clientWidth);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      graph._destructor();
      el.replaceChildren();
      graphRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;
    const shown = nodes.slice(0, MAX_NODES);
    const shownIds = new Set(shown.map((n) => n.id));
    const links = edges
      .filter((e) => shownIds.has(e.source) && shownIds.has(e.target))
      .map((e) => ({ source: e.source, target: e.target, type: e.type }));
    graph.graphData({ nodes: shown.map((n) => ({ ...n })), links });
    graph.zoomToFit(400, 40);
  }, [nodes, edges]);

  if (nodes.length === 0) return <p className="text-sm text-[var(--text-faint)]">No graph data.</p>;

  return (
    <div>
      <div ref={containerRef} className="h-[420px] w-full overflow-hidden rounded-md" />
      <div className="mono mt-3 flex flex-wrap items-center gap-4 text-[11px] text-[var(--text-faint)]">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: TYPE_COLORS.PERSON }} /> person
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: "var(--accent)" }} /> organization
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: TYPE_COLORS.PRODUCT }} /> product
        </span>
        <span className="ml-auto">
          {onNodeClick ? "drag to orbit · scroll to zoom · click a node to expand" : "drag to orbit · scroll to zoom"}
        </span>
        {nodes.length > MAX_NODES && <span>showing {MAX_NODES} of {nodes.length}</span>}
      </div>
    </div>
  );
}

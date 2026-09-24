import { useEffect, useRef } from "react";
import ForceGraph3D from "3d-force-graph";
import { Vector2, type Light } from "three";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { applyGraphTheme } from "../lib/graphTheme";
import { useAppliedTheme } from "../lib/theme";

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

// The library's zoomToFit measures rendered objects, which here still report
// one node at the origin (+-4 units) after the layout spans +-130 - so it
// always framed a single node. Fit to the layout's own node positions instead:
// back the camera off, along its current direction, until the sphere holding
// every node fits the narrower of the two fields of view.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fitCamera(graph: any, ms: number) {
  const nodes: Node3D[] = graph.graphData().nodes;
  const radius = Math.max(...nodes.map((n) => Math.hypot(n.x ?? 0, n.y ?? 0, n.z ?? 0))) + 10;
  const camera = graph.camera();
  const halfFov = Math.tan((camera.fov * Math.PI) / 360) * Math.min(1, camera.aspect);
  const distance = radius / halfFov + radius * 0.2;
  const dir = camera.position.clone().normalize();
  if (!Number.isFinite(dir.x)) dir.set(0, 0, 1);
  const pos = dir.multiplyScalar(distance);
  graph.cameraPosition({ x: pos.x, y: pos.y, z: pos.z }, { x: 0, y: 0, z: 0 }, ms);
}

// Colours come from the theme's CSS vars, re-read whenever the toggle flips.
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
  const hasFitRef = useRef(false);
  const bloomRef = useRef<UnrealBloomPass | null>(null);
  const darkLightsRef = useRef<Light[]>([]);
  const theme = useAppliedTheme();
  const onNodeClickRef = useRef(onNodeClick);
  onNodeClickRef.current = onNodeClick;

  // Built once: a theme switch restyles the live graph (effect below) instead
  // of rebuilding it, which reran the layout and reset the camera.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const graph: any = new ForceGraph3D(el);
    graph
      .backgroundColor("rgba(0,0,0,0)")
      .showNavInfo(false)
      .nodeRelSize(4)
      .nodeLabel((n: Node3D) => n.name)
      .linkOpacity(0.55)
      .linkWidth(0.5)
      .onNodeClick((n: Node3D) => onNodeClickRef.current?.(n.name))
      .height(420);
    graph.width(el.clientWidth);

    // Same postprocessing bloom as CodeGraphHero, dialled down (strength/radius
    // 2.4/0.85 -> 1.3/0.6): at the hero's values a hub entity's dense core
    // bloomed to white, washing out the person/org/product colours the legend
    // relies on. Threshold stays low so small zoomed-out nodes still glow.
    // Added to the composer by applyGraphTheme on dark only.
    bloomRef.current = new UnrealBloomPass(new Vector2(el.clientWidth, 420), 1.3, 0.6, 0.04);
    darkLightsRef.current = graph.lights();

    graphRef.current = graph;
    hasFitRef.current = false;

    const onResize = () => graph.width(el.clientWidth);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      graph._destructor();
      el.replaceChildren();
      graphRef.current = null;
    };
  }, []);

  // Colours are read from CSS vars, which the theme swap has already applied.
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || !bloomRef.current) return;
    const accent = cssVar("--accent", "#c3ef61");
    const linkColor = cssVar("--border", "rgba(255,255,255,0.15)");
    graph.nodeColor((n: Node3D) => TYPE_COLORS[n.type] ?? accent).linkColor(() => linkColor);
    applyGraphTheme(graph, bloomRef.current, darkLightsRef.current, theme, { ambient: 0.35, resolution: 20 });
  }, [theme]);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;
    const shown = nodes.slice(0, MAX_NODES);
    const shownIds = new Set(shown.map((n) => n.id));
    const links = edges
      .filter((e) => shownIds.has(e.source) && shownIds.has(e.target))
      .map((e) => ({ source: e.source, target: e.target, type: e.type }));
    // Warm-up runs the whole layout (~300 ticks, d3's default decay to rest)
    // before the first frame, so the camera fits the finished graph - fitting
    // part-way through framed a graph that then kept expanding past the edges.
    // The library applies graphData on a 1ms debounce, so the fit waits a beat.
    graph.warmupTicks(300).graphData({ nodes: shown.map((n) => ({ ...n })), links });
    // First fit is instant - nothing to animate from; later ones (Explorer's
    // expand) glide so the user can follow where the new nodes went.
    const fit = setTimeout(() => {
      fitCamera(graph, hasFitRef.current ? 400 : 0);
      hasFitRef.current = true;
    }, 50);
    return () => clearTimeout(fit);
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

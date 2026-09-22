import { useEffect, useRef } from "react";
import ForceGraph3D from "3d-force-graph";
import { Vector2 } from "three";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import codeGraph from "../data/codeGraph.json";
import savedPositions from "../data/codeGraphPositions.json";

interface CodeNode {
  id: string;
  label: string;
  community: number;
  x?: number;
  y?: number;
  z?: number;
  fx?: number;
  fy?: number;
  fz?: number;
}

// Deterministic hue per community, cycling the accent's hue family so the
// hero reads as "one system, many parts" rather than a random rainbow.
function communityColor(community: number): string {
  const hue = (140 + community * 47) % 360;
  return `hsl(${hue} 70% 62%)`;
}

// codeGraphPositions.json is a saved snapshot of a settled, hand-tuned layout
// (captured live via window.__capturePositions - see git history), scaled
// 1.5x from the captured values for more breathing room between nodes, and
// positional - matched 1:1 by index to codeGraph.json's node order. Scaling
// uniformly (rather than re-tuning and re-running the force simulation)
// guarantees every pairwise distance grows by exactly the same 50% without
// risking new overlap or outliers - it can only ever spread nodes apart.
// Pinning fx/fy/fz to it means the hero renders in that exact shape on every
// load instead of re-settling from a fresh randomized layout each time - no
// two page loads looking different, no re-running the physics settle
// animation. Falls back to a live simulation if the two files ever drift out
// of sync (e.g. codeGraph.json regenerated without a matching position
// re-capture) rather than silently mis-pinning nodes.
const positionsMatch = savedPositions.length === codeGraph.nodes.length;
const seededNodes: CodeNode[] = codeGraph.nodes.map((n, i) => {
  if (!positionsMatch) return n;
  const [x, y, z] = savedPositions[i];
  return { ...n, x, y, z, fx: x, fy: y, fz: z };
});

// Fully interactive, like SubgraphView (orbit, zoom, hover) - it just also
// auto-rotates when idle, and has no click-to-expand since the code graph is
// a static snapshot, not a live endpoint to traverse. Auto-rotate stops the
// instant the user grabs the camera so it never fights their input (apple-
// design's interruptibility principle). Still pauses its render loop when
// scrolled offscreen, and skips auto-rotate under prefers-reduced-motion -
// direct manipulation stays available either way, only the ambient motion
// is gated.
export default function CodeGraphHero() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const graph: any = new ForceGraph3D(el);
    graph
      .backgroundColor("rgba(0,0,0,0)")
      .showNavInfo(false)
      .nodeRelSize(2.6)
      .nodeLabel((n: CodeNode) => n.label)
      .nodeColor((n: CodeNode) => communityColor(n.community))
      .linkColor(() => "rgba(255,255,255,0.12)")
      .linkOpacity(0.4)
      .linkWidth(0.4)
      .height(el.clientHeight)
      .width(el.clientWidth)
      .graphData({ nodes: seededNodes, links: codeGraph.links });

    // Same tuning that produced the pinned snapshot in the first place - kept
    // as the fallback layout for the (unpinned) case, so a positions/graph
    // mismatch still degrades to a reasonable shape rather than the loose
    // d3-force-3d defaults (link distance ~30, charge ~-30, uncapped
    // repulsion range flinging low-degree nodes out into empty space).
    graph.d3Force("link")?.distance(14);
    graph.d3Force("charge")?.strength(-14).distanceMax(160);
    graph.d3Force("center")?.strength(1.2);

    const controls = graph.controls();
    controls.autoRotate = !reduceMotion;
    controls.autoRotateSpeed = 0.6;
    // Camera pulled back 1.5x along with the position snapshot (below) so the
    // now-50%-larger structure keeps the same relative framing in the hero.
    graph.cameraPosition({ z: 480 });

    // Real glow, not a CSS filter - this is a WebGL scene, so bloom has to be
    // a postprocessing render pass over the composer 3d-force-graph already
    // sets up, not a drop-shadow (which only affects the flat DOM element).
    const bloom = new UnrealBloomPass(new Vector2(el.clientWidth, el.clientHeight), 1.5, 0.6, 0.1);
    graph.postProcessingComposer().addPass(bloom);

    // Hand full control to the user the moment they grab the camera.
    const stopAutoRotate = () => {
      controls.autoRotate = false;
    };
    el.addEventListener("pointerdown", stopAutoRotate, { once: true });

    const onResize = () => {
      graph.width(el.clientWidth).height(el.clientHeight);
      bloom.setSize(el.clientWidth, el.clientHeight);
    };
    window.addEventListener("resize", onResize);

    // Pause the render loop entirely while the hero is scrolled out of view.
    const observer = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? graph.resumeAnimation() : graph.pauseAnimation()),
      { threshold: 0.05 }
    );
    observer.observe(el);

    return () => {
      el.removeEventListener("pointerdown", stopAutoRotate);
      window.removeEventListener("resize", onResize);
      observer.disconnect();
      graph._destructor();
      el.replaceChildren();
    };
  }, []);

  return <div ref={containerRef} className="h-full w-full cursor-grab active:cursor-grabbing" />;
}

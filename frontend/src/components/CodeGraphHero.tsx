import { useEffect, useRef } from "react";
import ForceGraph3D from "3d-force-graph";
import { Vector2, type Light } from "three";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import codeGraph from "../data/codeGraph.json";
import { applyGraphTheme } from "../lib/graphTheme";
import { useAppliedTheme, type Theme } from "../lib/theme";

interface CodeNode {
  id: string;
  label: string;
  community: number;
}

// Deterministic hue per community, cycling the accent's hue family so the
// hero reads as "one system, many parts" rather than a random rainbow.
// Light theme drops lightness so nodes hold contrast on the pale background.
function communityColor(community: number, theme: Theme): string {
  const hue = (140 + community * 47) % 360;
  return theme === "dark" ? `hsl(${hue} 70% 62%)` : `hsl(${hue} 65% 44%)`;
}

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
  const theme = useAppliedTheme();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(null);
  const bloomRef = useRef<UnrealBloomPass | null>(null);
  const darkLightsRef = useRef<Light[]>([]);

  // Built once: a theme switch restyles the live graph (effect below) instead
  // of rebuilding it, which reran the random layout and reset the camera.
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
      .linkOpacity(0.4)
      .linkWidth(0.4)
      .height(el.clientHeight)
      .width(el.clientWidth)
      .graphData(codeGraph);

    const controls = graph.controls();
    controls.autoRotate = !reduceMotion;
    controls.autoRotateSpeed = 0.6;
    graph.cameraPosition({ z: 420 });

    // Real glow, not a CSS filter - this is a WebGL scene, so bloom has to be
    // a postprocessing render pass over the composer 3d-force-graph already
    // sets up, not a drop-shadow (which only affects the flat DOM element).
    // Stronger strength + lower threshold than before (1.5/0.1 -> 2.4/0.04) so
    // the glow still reads once a node is only a few pixels across zoomed out,
    // not just up close; wider radius (0.6 -> 0.85) spreads that into a softer
    // halo instead of just a brighter point.
    // Added to the composer by applyGraphTheme on dark only.
    const bloom = new UnrealBloomPass(new Vector2(el.clientWidth, el.clientHeight), 2.4, 0.85, 0.04);
    graphRef.current = graph;
    bloomRef.current = bloom;
    darkLightsRef.current = graph.lights();

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
      graphRef.current = null;
    };
  }, []);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || !bloomRef.current) return;
    graph
      .nodeColor((n: CodeNode) => communityColor(n.community, theme))
      .linkColor(() => (theme === "dark" ? "rgba(255,255,255,0.12)" : "rgba(20,24,20,0.3)"));
    applyGraphTheme(graph, bloomRef.current, darkLightsRef.current, theme, { ambient: 0.45, resolution: 12 });
  }, [theme]);

  return <div ref={containerRef} className="h-full w-full cursor-grab active:cursor-grabbing" />;
}

import { useEffect, useRef } from "react";
import ForceGraph3D from "3d-force-graph";
import codeGraph from "../data/codeGraph.json";

interface CodeNode {
  id: string;
  label: string;
  community: number;
}

// Deterministic hue per community, cycling the accent's hue family so the
// hero reads as "one system, many parts" rather than a random rainbow.
function communityColor(community: number): string {
  const hue = (140 + community * 47) % 360;
  return `hsl(${hue} 70% 62%)`;
}

// Ambient/decorative - not interactive like SubgraphView. Auto-rotates,
// pauses when scrolled offscreen or under prefers-reduced-motion (the
// ui-ux-pro-max 3D-hero guidance: never spend GPU on an unseen or
// motion-sensitive canvas), and has no click/expand behavior of its own.
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
      .enableNodeDrag(false)
      .enablePointerInteraction(!reduceMotion)
      .nodeRelSize(2.6)
      .nodeLabel((n: CodeNode) => n.label)
      .nodeColor((n: CodeNode) => communityColor(n.community))
      .linkColor(() => "rgba(255,255,255,0.12)")
      .linkOpacity(0.4)
      .linkWidth(0.4)
      .height(el.clientHeight)
      .width(el.clientWidth)
      .graphData(codeGraph);

    graph.controls().autoRotate = !reduceMotion;
    graph.controls().autoRotateSpeed = 0.6;
    graph.cameraPosition({ z: 420 });

    const onResize = () => graph.width(el.clientWidth).height(el.clientHeight);
    window.addEventListener("resize", onResize);

    // Pause the render loop entirely while the hero is scrolled out of view.
    const observer = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? graph.resumeAnimation() : graph.pauseAnimation()),
      { threshold: 0.05 }
    );
    observer.observe(el);

    return () => {
      window.removeEventListener("resize", onResize);
      observer.disconnect();
      graph._destructor();
      el.replaceChildren();
    };
  }, []);

  return <div ref={containerRef} className="h-full w-full" aria-hidden="true" />;
}

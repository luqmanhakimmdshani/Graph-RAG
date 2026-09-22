import { useEffect, useRef } from "react";
import ForceGraph3D from "3d-force-graph";
import { Vector2 } from "three";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
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

// Fully interactive, like SubgraphView (orbit, zoom, hover) - it just also
// auto-rotates when idle, and has no click-to-expand since the code graph is
// a static snapshot, not a live endpoint to traverse. Auto-rotate stops the
// instant the user grabs the camera so it never fights their input (apple-
// design's interruptibility principle). Still pauses its render loop when
// scrolled offscreen, and skips auto-rotate under prefers-reduced-motion -
// direct manipulation stays available either way, only the ambient motion
// is gated.
//
// Runs a fresh live force simulation on every load, same as graphify's own
// graph.html viewer (vis-network: physics on until stabilized, then off) -
// no saved/pinned coordinates. The tuned forces below always converge to the
// same overall shape, so it still reads as consistent across loads even
// though the settle-in animation - and the exact final coordinates - differ
// each time.
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
      .graphData(codeGraph);

    // Tighter than the d3-force-3d defaults (link distance ~30, charge ~-30),
    // then scaled 1.5x (link 14->21, charge -14->-21, distanceMax 160->240)
    // for the extra breathing room requested later - keeps the same density
    // ratio that avoided both an overly sparse haze and a clumped-up core.
    //
    // Uncapped repulsion (the default) flings low-degree/leaf nodes - the
    // ones with nothing but the link force to pull them back - out into
    // empty space once they clear the dense core, so the result reads as one
    // cluster plus stray outliers "in the void" instead of one consistent
    // shape. Capping distanceMax stops charge from acting past local range,
    // and a slightly stronger center pull reins in anything still drifting.
    graph.d3Force("link")?.distance(21);
    graph.d3Force("charge")?.strength(-21).distanceMax(240);
    graph.d3Force("center")?.strength(1.2);

    // Slower alpha decay than the d3 default (~0.0228) stretches the settle-in
    // out over several seconds instead of it snapping into place almost
    // immediately, so the entrance animation actually reads as motion.
    graph.d3AlphaDecay(0.008);

    const controls = graph.controls();
    controls.autoRotate = !reduceMotion;
    controls.autoRotateSpeed = 0.6;
    // Pulled back to match the 1.5x-wider force layout above.
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

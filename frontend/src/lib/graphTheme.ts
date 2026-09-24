import { AmbientLight, DirectionalLight, type Light } from "three";
import type { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import type { Theme } from "./theme";

/** Restyle a live 3d-force-graph for the theme without rebuilding it, so the
 *  layout and camera stay put when the toggle flips.
 *  Bloom adds light, so it only reads as glow on dark - on light it washes the
 *  page into haze. Light gets lit, solid spheres instead: a dim ambient plus a
 *  top-left key light gives each sphere a lit and a shaded side. */
export function applyGraphTheme(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  graph: any,
  bloom: UnrealBloomPass,
  darkLights: Light[],
  theme: Theme,
  light: { ambient: number; resolution: number },
) {
  const composer = graph.postProcessingComposer();
  const hasBloom = composer.passes.includes(bloom);
  if (theme === "dark") {
    if (!hasBloom) composer.addPass(bloom);
    // 0.75 / 8 are the library's own defaults.
    graph.lights(darkLights).nodeOpacity(0.75).nodeResolution(8);
  } else {
    if (hasBloom) composer.removePass(bloom);
    const key = new DirectionalLight(0xffffff, 2.2 * Math.PI);
    key.position.set(-1, 1.2, 1);
    graph
      .lights([new AmbientLight(0xffffff, light.ambient * Math.PI), key])
      .nodeOpacity(1)
      .nodeResolution(light.resolution);
  }
}

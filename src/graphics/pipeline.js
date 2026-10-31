export { QualityGovernor } from "./quality.js";
import * as T from "../../vendor/three.module.js";
import { EffectComposer } from "../../vendor/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "../../vendor/addons/postprocessing/RenderPass.js";
import { GTAOPass } from "../../vendor/addons/postprocessing/GTAOPass.js";
import { UnrealBloomPass } from "../../vendor/addons/postprocessing/UnrealBloomPass.js";
import { BokehPass } from "../../vendor/addons/postprocessing/BokehPass.js";
import { OutputPass } from "../../vendor/addons/postprocessing/OutputPass.js";
export function createPipeline(renderer, scene, camera) {
  const composer = new EffectComposer(renderer),
    render = new RenderPass(scene, camera);
  const ao = new GTAOPass(scene, camera, 256, 256);
  ao.blendIntensity = 0.7;
  ao.updateGtaoMaterial({
    radius: 0.45,
    distanceExponent: 1.5,
    thickness: 0.7,
  });
  const bloom = new UnrealBloomPass(new T.Vector2(256, 256), 0.28, 0.35, 0.85);
  const bokeh = new BokehPass(scene, camera, {
    focus: 4.6,
    aperture: 0.00006,
    maxblur: 0.006,
  });
  bokeh.enabled = false;
  const output = new OutputPass();
  for (const pass of [render, ao, bloom, bokeh, output]) composer.addPass(pass);
  let profile,
    width = 1,
    height = 1;
  function resize(w, h) {
    width = w;
    height = h;
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(w, h);
    if (profile)
      ao.setSize(
        Math.max(1, Math.floor(w * renderer.getPixelRatio() * profile.aoScale)),
        Math.max(1, Math.floor(h * renderer.getPixelRatio() * profile.aoScale)),
      );
  }
  return {
    composer,
    ao,
    bloom,
    bokeh,
    setQuality(p) {
      profile = p;
      ao.enabled = p.ao;
      bloom.enabled = p.bloom;
      resize(width, height);
    },
    resize,
    setDepthOfField(enabled) {
      bokeh.enabled = enabled;
    },
    render(dt, focus = 4.6) {
      bokeh.uniforms.focus.value = focus;
      composer.render(dt);
    },
    dispose() {
      for (const p of composer.passes) p.dispose?.();
      composer.dispose();
    },
  };
}

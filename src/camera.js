import * as T from "../vendor/three.module.js";
import { config as c } from "./config.js";
export function createCamera() {
  const camera = new T.PerspectiveCamera(49, 1, 0.1, 60);
  return {
    camera,
    update(w, h) {
      camera.aspect = w / h;
      const portrait = w / h < 1.25;
      camera.position.set(
        c.player.x + (portrait ? 3.6 : 3.1),
        portrait ? 3.8 : 3.1,
        c.player.z - (portrait ? 8.7 : 6),
      );
      camera.lookAt(c.player.x, 2, 2.5);
      camera.updateProjectionMatrix();
    },
  };
}

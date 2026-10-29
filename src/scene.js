import { createGym } from "./gym.js";
import * as T from "../vendor/three.module.js";
import { config as c } from "./config.js";
import { createCamera } from "./camera.js";
import { createPlayer } from "./player.js";
import { velocity } from "./physics.js";
export function createScene(canvas) {
  const renderer = new T.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  const scene = new T.Scene();
  scene.background = new T.Color("#202c3a");
  scene.fog = new T.Fog("#202c3a", 35, 100);
  scene.add(new T.HemisphereLight("#f6f2e8", "#6d727d", 1.4));
  const light = new T.DirectionalLight("#fff2d6", 1.3);
  light.position.set(-4, 10, -2);
  light.castShadow = true;
  Object.assign(light.shadow.camera, {
    left: -12,
    right: 12,
    top: 12,
    bottom: -12,
  });
  light.shadow.bias = -0.001;
  light.shadow.mapSize.set(1024, 1024);
  scene.add(light);
  const mat = (color, extra = {}) =>
    new T.MeshStandardMaterial({ color, roughness: 0.7, ...extra });
  function mesh(g, m, x, y, z) {
    const o = new T.Mesh(g, m);
    o.position.set(x, y, z);
    o.castShadow = true;
    o.receiveShadow = true;
    scene.add(o);
    return o;
  }
  function line(points, color) {
    const o = new T.Line(
      new T.BufferGeometry().setFromPoints(
        points.map((p) => new T.Vector3(...p)),
      ),
      new T.LineBasicMaterial({ color }),
    );
    scene.add(o);
    return o;
  }
  createGym(scene);
  const ball = mesh(
    new T.SphereGeometry(c.ballRadius, 24, 16),
    mat("#ed9953"),
    0,
    2.1,
    0,
  );
  for (const rot of [0, Math.PI / 2]) {
    const seam = new T.Mesh(
      new T.TorusGeometry(c.ballRadius + 0.001, 0.004, 4, 48),
      mat("#754629"),
    );
    seam.rotation.y = rot;
    ball.add(seam);
  }
  const player = createPlayer(scene);
  const rig = createCamera();
  const guide = line([], "#dbef95");
  guide.material.transparent = true;
  guide.material.opacity = 0.6;
  return {
    render(shot, dt = 1 / 60) {
      const w = canvas.clientWidth,
        h = canvas.clientHeight;
      renderer.setSize(w, h, false);
      rig.update(w, h, shot, dt);
      player.update(shot);
      ball.position.set(shot.ball.x, shot.ball.y, shot.ball.z);
      ball.rotation.x += shot.phase === "flight" ? 0.025 : 0;
      guide.visible = ["ready", "charging"].includes(shot.phase);
      if (guide.visible) {
        const v = velocity(
            shot.phase === "charging" ? shot.power : 0.42,
            shot.aim.yaw,
            shot.aim.angle,
          ),
          pts = [];
        for (let t = 0; t < 2; t += 0.04) {
          const y = shot.origin().y + v.vy * t - 0.5 * c.gravity * t * t;
          if (y < 0.12) break;
          pts.push(
            new T.Vector3(
              shot.origin().x + v.vx * t,
              y,
              shot.origin().z + v.vz * t,
            ),
          );
        }
        guide.geometry.dispose();
        guide.geometry = new T.BufferGeometry().setFromPoints(pts);
      }
      renderer.render(scene, rig.camera);
    },
  };
}

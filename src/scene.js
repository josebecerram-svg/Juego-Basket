import * as T from "../vendor/three.module.js";
import { config as c } from "./config.js";
import { createCamera } from "./camera.js";
import { createPlayer } from "./player.js";
import { velocity } from "./physics.js";
export function createScene(canvas) {
  const renderer = new T.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  const scene = new T.Scene();
  scene.background = new T.Color("#20352f");
  scene.fog = new T.Fog("#20352f", 18, 40);
  scene.add(new T.HemisphereLight("#eff4d9", "#344938", 2.4));
  const light = new T.DirectionalLight("#fff2d6", 3);
  light.position.set(-4, 10, -2);
  light.castShadow = true;
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
  const floor = mesh(new T.PlaneGeometry(12, 16), mat("#536047"), 0, -0.01, 2);
  floor.rotation.x = -Math.PI / 2;
  function line(points, color = "#d9dec0") {
    const o = new T.Line(
      new T.BufferGeometry().setFromPoints(
        points.map((p) => new T.Vector3(...p)),
      ),
      new T.LineBasicMaterial({ color }),
    );
    scene.add(o);
    return o;
  }
  line([
    [-5, 0.005, -5],
    [5, 0.005, -5],
    [5, 0.005, 9],
    [-5, 0.005, 9],
    [-5, 0.005, -5],
  ]);
  line([
    [-2, 0.01, 5.7],
    [-2, 0.01, 0.5],
    [2, 0.01, 0.5],
    [2, 0.01, 5.7],
  ]);
  for (const z of [-4, -2, 0, 2, 4, 6, 8])
    line(
      [
        [-5, 0, z],
        [5, 0, z],
      ],
      "#667252",
    );
  const arc = [];
  for (let i = 0; i <= 64; i++) {
    let a = (i / 64) * Math.PI * 2;
    arc.push([Math.cos(a) * 1.7, 0.015, 0.5 + Math.sin(a) * 1.7]);
  }
  line(arc);
  const h = c.hoop;
  mesh(new T.BoxGeometry(0.16, 3.6, 0.16), mat("#859782"), 0, 1.8, 5.15);
  mesh(new T.BoxGeometry(0.16, 0.12, 0.5), mat("#859782"), 0, 3.55, 4.93);
  mesh(
    new T.BoxGeometry(
      c.board.halfWidth * 2,
      c.board.top - c.board.bottom,
      0.06,
    ),
    mat("#d8e4ce", { transparent: true, opacity: 0.65 }),
    0,
    (c.board.top + c.board.bottom) / 2,
    c.board.z,
  );
  line(
    [
      [-0.3, 3.1, 4.68],
      [-0.3, 3.65, 4.68],
      [0.3, 3.65, 4.68],
      [0.3, 3.1, 4.68],
      [-0.3, 3.1, 4.68],
    ],
    "#fff5dc",
  );
  const ring = mesh(
    new T.TorusGeometry(h.radius, h.tube, 12, 64),
    mat("#f39855"),
    h.x,
    h.y,
    h.z,
  );
  ring.rotation.x = Math.PI / 2;
  mesh(new T.BoxGeometry(0.1, 0.05, 0.18), mat("#f39855"), 0, h.y, 4.62);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    line(
      [
        [Math.cos(a) * h.radius, h.y, h.z + Math.sin(a) * h.radius],
        [Math.cos(a) * 0.14, 2.58, h.z + Math.sin(a) * 0.14],
      ],
      "#c1cfb6",
    );
  }
  for (const y of [2.6, 2.8]) {
    const pts = [];
    const r = 0.14 + ((y - 2.58) / 0.47) * 0.1;
    for (let i = 0; i <= 32; i++) {
      let a = (i / 32) * Math.PI * 2;
      pts.push([r * Math.cos(a), y, h.z + r * Math.sin(a)]);
    }
    line(pts, "#c1cfb6");
  }
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
    render(shot) {
      const w = canvas.clientWidth,
        h = canvas.clientHeight;
      renderer.setSize(w, h, false);
      rig.update(w, h);
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
          const y = c.initial.y + v.vy * t - 0.5 * c.gravity * t * t;
          if (y < 0.12) break;
          pts.push(
            new T.Vector3(c.initial.x + v.vx * t, y, c.initial.z + v.vz * t),
          );
        }
        guide.geometry.dispose();
        guide.geometry = new T.BufferGeometry().setFromPoints(pts);
      }
      renderer.render(scene, rig.camera);
    },
  };
}

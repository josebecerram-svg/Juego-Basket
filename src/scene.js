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
  const companion = createPlayer(scene, {
    name: "SILVA",
    number: "12",
    skin: "#c99773",
  });
  function marker(color) {
    const m = new T.Mesh(
      new T.RingGeometry(0.38, 0.43, 40),
      new T.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.8,
        side: T.DoubleSide,
      }),
    );
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.04;
    scene.add(m);
    return m;
  }
  const playerMarker = marker("#d5ff5f"),
    companionMarker = marker("#7acaff");
  const cv = document.createElement("canvas");
  cv.width = 256;
  cv.height = 64;
  const context = cv.getContext("2d");
  context.fillStyle = "#10202bee";
  context.fillRect(0, 0, 256, 64);
  context.fillStyle = "#ecf5f5";
  context.textAlign = "center";
  context.font = "bold 24px Arial";
  context.fillText("12  SILVA", 128, 41);
  const labelTex = new T.CanvasTexture(cv);
  labelTex.colorSpace = T.SRGBColorSpace;
  const label = new T.Sprite(
    new T.SpriteMaterial({
      map: labelTex,
      transparent: true,
      depthTest: false,
    }),
  );
  label.scale.set(1, 0.25, 1);
  scene.add(label);
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
      player.update(shot, dt);
      if (shot.companion) {
        companion.update(shot.companionState(), dt);
        label.position.set(shot.companion.x, 2.18, shot.companion.z);
        companionMarker.position.set(shot.companion.x, 0.04, shot.companion.z);
      }
      playerMarker.position.set(shot.player.x, 0.04, shot.player.z);
      playerMarker.material.opacity = shot.possession === "player" ? 0.9 : 0.2;
      companionMarker.material.opacity =
        shot.possession === "companion" ? 0.9 : 0.2;
      ball.position.set(shot.ball.x, shot.ball.y, shot.ball.z);
      ball.rotation.x +=
        shot.phase === "flight"
          ? dt * 6
          : shot.phase === "passing"
            ? dt * 9
            : 0;
      guide.visible = ["ready", "charging"].includes(shot.phase);
      if (guide.visible) {
        const v = velocity(
            shot.phase === "charging" ? shot.power : 0.42,
            shot.aimYaw(),
            shot.aim.angle,
          ),
          pts = [];
        for (let t = 0; t < 2; t += 0.04) {
          const y = c.initial.y + v.vy * t - 0.5 * c.gravity * t * t;
          if (y < 0.12) break;
          pts.push(
            new T.Vector3(
              shot.player.x + Math.sin(shot.aimYaw()) * 0.38 + v.vx * t,
              y,
              shot.player.z + Math.cos(shot.aimYaw()) * 0.38 + v.vz * t,
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

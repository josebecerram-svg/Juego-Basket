import { createGym } from "./gym.js";
import * as T from "../vendor/three.module.js";
import { config as c } from "./config.js";
import { createCamera } from "./camera.js";
import { createPlayer } from "./player.js";
import { athletes } from "./athletes.js";

export function createScene(canvas) {
  const renderer = new T.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  const scene = new T.Scene();
  scene.background = new T.Color("#202c3a");
  scene.fog = new T.Fog("#202c3a", 35, 100);
  scene.add(new T.HemisphereLight("#f6f2e8", "#6d727d", 1.4));
  const light = new T.DirectionalLight("#fff2d6", 1.3);
  light.position.set(-4, 10, -2);
  light.castShadow = true;
  light.shadow.radius = 3;
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
  const cameraObstacles = createGym(scene);
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
  const models = {
    rivera: createPlayer(scene, athletes.rivera),
    silva: createPlayer(scene, athletes.silva),
    vega: createPlayer(scene, athletes.vega),
    rios: createPlayer(scene, athletes.rios),
  };
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
  const labels = {};
  for (const [id, number, name] of [
    ["rivera", "07", "RIVERA"],
    ["silva", "12", "SILVA"],
    ["vega", "23", "VEGA"],
    ["rios", "31", "RÍOS"],
  ]) {
    labels[id] = {};
    for (const role of ["TÚ", "IA"]) {
      const cv = document.createElement("canvas");
      cv.width = 384;
      cv.height = 64;
      const context = cv.getContext("2d");
      context.fillStyle = "#10202bee";
      context.fillRect(0, 0, 384, 64);
      context.fillStyle = role === "TÚ" ? "#d5ff5f" : "#ecf5f5";
      context.textAlign = "center";
      context.font = "bold 24px Arial";
      context.fillText(number + " " + name + " · " + role, 192, 41);
      const texture = new T.CanvasTexture(cv);
      texture.colorSpace = T.SRGBColorSpace;
      const label = new T.Sprite(
        new T.SpriteMaterial({
          map: texture,
          transparent: true,
          depthTest: false,
        }),
      );
      label.scale.set(1.3, 0.22, 1);
      scene.add(label);
      labels[id][role] = label;
    }
  }
  const rig = createCamera({ obstacles: cameraObstacles });
  return {
    render(shot, dt = 1 / 60) {
      const w = canvas.clientWidth,
        h = canvas.clientHeight;
      renderer.setSize(w, h, false);
      rig.update(w, h, shot, dt);
      models[shot.player.id].update(shot, dt);
      for (const a of shot.defenders ?? []) {
        models[a.id].group.visible = !shot.practiceMode;
        if (!shot.practiceMode) models[a.id].update(shot.opponentState(a), dt);
      }
      models[shot.companion.id].update(
        { ...shot.companionState(), gazeTarget: shot.ball },
        dt,
      );
      for (const actor of shot.actors)
        for (const role of ["TÚ", "IA"]) {
          const label = labels[actor.id][role];
          label.position.set(
            actor.x,
            athletes[actor.id].height + 0.26 + (actor.y ?? 0),
            actor.z,
          );
          label.visible =
            !(shot.practiceMode && actor.team === "away") &&
            (actor === shot.player) === (role === "TÚ") &&
            !(actor === shot.player && shot.dunk?.active);
        }
      companionMarker.position.set(shot.companion.x, 0.04, shot.companion.z);
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
      renderer.render(scene, rig.camera);
      const origin = rig.camera.position;
      shot.visibleHoops = c.baskets
        .map((b) => b.hoop)
        .filter((h) => {
          const target = new T.Vector3(h.x, h.y, h.z),
            projected = target.clone().project(rig.camera);
          if (
            projected.z < -1 ||
            projected.z > 1 ||
            Math.abs(projected.x) > 0.98 ||
            Math.abs(projected.y) > 0.98
          )
            return false;
          const delta = target.clone().sub(origin),
            distance = delta.length(),
            ray = new T.Ray(origin, delta.normalize());
          return !cameraObstacles.some((box) => {
            if (box.min.y >= 2.8 && box.max.z - box.min.z < 0.15) return false; // Transparent backboard.
            const hit = ray.intersectBox(box, new T.Vector3());
            return hit && hit.distanceTo(origin) < distance - 0.12;
          });
        });
      const indicator = document.querySelector("#aim-lock");
      if (indicator) {
        indicator.hidden = !shot.aimLock;
        indicator.textContent = "● ARO FIJADO · clic derecho libera";
      }
    },
  };
}

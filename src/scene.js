import { createArena } from "./graphics/arena.js";
import { createAvatar } from "./graphics/avatars.js";
import { stadiumLighting } from "./graphics/environment.js";
import { createPipeline, QualityGovernor } from "./graphics/pipeline.js";
import { basketballMaterial } from "./graphics/materials.js";
import { graphics } from "./graphics/settings.js";
import * as T from "../vendor/three.module.js";
import { config as c } from "./config.js";
import { createCamera } from "./camera.js";
import { athletes } from "./athletes.js";

export async function createScene(canvas) {
  const renderer = new T.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = graphics.exposure;
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.info.autoReset = false;
  const scene = new T.Scene();
  const lighting = await stadiumLighting(renderer, scene);
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
  const arena = createArena(scene),
    cameraObstacles = arena.obstacles;
  const ball = mesh(
    new T.SphereGeometry(c.ballRadius, 24, 16),
    basketballMaterial(),
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
    rivera: await createAvatar(scene, athletes.rivera),
    silva: await createAvatar(scene, athletes.silva),
    vega: await createAvatar(scene, athletes.vega),
    rios: await createAvatar(scene, athletes.rios),
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
  const pipeline = createPipeline(renderer, scene, rig.camera);
  const extension = renderer
    .getContext()
    .getExtension("WEBGL_debug_renderer_info");
  const device = extension
    ? renderer.getContext().getParameter(extension.UNMASKED_RENDERER_WEBGL)
    : "";
  const software = /swiftshader|llvmpipe|software/i.test(device);
  let mode = new URLSearchParams(location.search).get("quality") ?? "auto";
  if (!["auto", "high", "balanced", "low"].includes(mode)) mode = "auto";
  let quality = mode === "auto" ? (software ? "low" : "balanced") : mode;
  let profile = graphics.profiles[quality],
    width = 0,
    height = 0,
    lastFrame = performance.now(),
    frameAverage = 0,
    fps = 0;
  const governor = new QualityGovernor(quality);
  function setQuality(name) {
    quality = name;
    profile = graphics.profiles[name];
    renderer.setPixelRatio(Math.min(devicePixelRatio, profile.pixelRatio));
    lighting.setQuality(profile);
    arena.setQuality(profile);
    pipeline.setQuality(profile);
    width = 0;
  }
  setQuality(quality);
  const select = document.querySelector("#graphics-quality");
  if (select) {
    select.value = mode;
    select.addEventListener("change", () => {
      mode = select.value;
      setQuality(mode === "auto" ? (software ? "low" : "balanced") : mode);
      governor.level = quality;
      governor.warmup = 4;
    });
  }
  document
    .querySelector("#depth-of-field")
    ?.addEventListener("change", (e) =>
      pipeline.setDepthOfField(e.target.checked),
    );
  const diagnostics = {
    quality,
    mode,
    fps: 0,
    drawCalls: 0,
    triangles: 0,
    models,
  };

  return {
    resetTiming() {
      lastFrame = performance.now();
    },
    diagnostics,
    renderer,
    scene,
    pipeline,
    arena,
    render(shot, dt = 1 / 60) {
      const w = canvas.clientWidth,
        h = canvas.clientHeight;
      if (w !== width || h !== height) {
        width = w;
        height = h;
        renderer.setSize(w, h, false);
        pipeline.resize(w, h);
      }
      const now = performance.now(),
        seconds = (now - lastFrame) / 1000;
      lastFrame = now;
      if (seconds > 0 && seconds < 2) {
        frameAverage = frameAverage
          ? frameAverage * 0.9 + seconds * 0.1
          : seconds;
        fps = 1 / frameAverage;
      }
      if (mode === "auto") {
        const next = governor.sample(seconds);
        if (next) setQuality(next);
      }
      arena.update(shot, dt);

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
      renderer.info.reset();
      // Update light-space shadows once, then reuse them in reflections/AO/DOF.
      renderer.shadowMap.needsUpdate = true;
      pipeline.render(
        dt,
        rig.camera.position.distanceTo(
          new T.Vector3(
            shot.player.x,
            1.4 + (shot.player.y ?? 0),
            shot.player.z,
          ),
        ),
      );
      Object.assign(diagnostics, {
        quality,
        mode,
        fps,
        drawCalls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
      });
      const stats = document.querySelector("#graphics-stats");
      if (stats)
        stats.textContent =
          Math.round(fps) +
          " FPS · " +
          { high: "Alta", balanced: "Equilibrada", low: "Baja" }[quality];

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

import * as T from "../../vendor/three.module.js";
import { Reflector } from "../../vendor/addons/objects/Reflector.js";
import { config as c } from "../config.js";
import { courtTextures } from "./materials.js";
export function createArena(scene) {
  const obstacles = [],
    glasses = [],
    nets = [];
  let frame = 0,
    profile;
  const physical = (color, extra = {}) =>
    new T.MeshPhysicalMaterial({ color, roughness: 0.65, ...extra });
  const steel = physical("#909ba3", { metalness: 0.9, roughness: 0.28 }),
    concrete = physical("#777e85"),
    seat = physical("#233e59");
  function mesh(g, m, x, y, z, collision = false) {
    const o = new T.Mesh(g, m);
    o.position.set(x, y, z);
    o.receiveShadow = true;
    o.castShadow = collision;
    scene.add(o);
    if (collision) obstacles.push(new T.Box3().setFromObject(o));
    return o;
  }
  function box(w, h, d, mat, x, y, z, collision = false) {
    return mesh(new T.BoxGeometry(w, h, d), mat, x, y, z, collision);
  }
  const base = mesh(
    new T.PlaneGeometry(50, 60),
    physical("#3f4852"),
    0,
    -0.045,
    -8.2,
  );
  base.rotation.x = -Math.PI / 2;
  const wood = new T.MeshPhysicalMaterial({
    color: "#ffffff",
    ...courtTextures(),
    roughness: 0.34,
    clearcoat: 1,
    clearcoatRoughness: 0.1,
    envMapIntensity: 0.8,
  });
  const court = mesh(new T.PlaneGeometry(15, 28), wood, 0, 0, -8.2);
  court.rotation.x = -Math.PI / 2;
  const reflection = new Reflector(new T.PlaneGeometry(15, 28), {
    textureWidth: 512,
    textureHeight: 512,
    color: 0xe3d5bf,
    clipBias: 0.003,
  });
  reflection.rotation.x = -Math.PI / 2;
  reflection.position.set(0, 0.003, -8.2);
  reflection.material.transparent = true;
  reflection.material.depthWrite = false;
  reflection.material.fragmentShader =
    reflection.material.fragmentShader.replace(
      "gl_FragColor = vec4( blendOverlay( base.rgb, color ), 1.0 );",
      "gl_FragColor = vec4( blendOverlay( base.rgb, color ), 0.16 );",
    );
  let refreshed = -1;
  const reflect = reflection.onBeforeRender;
  reflection.onBeforeRender = function (...args) {
    if (
      !args[1].overrideMaterial &&
      refreshed !== frame &&
      profile &&
      frame % profile.reflectionEvery === 0
    ) {
      refreshed = frame;
      reflect.apply(this, args);
    }
  };
  scene.add(reflection);
  const rails = [];
  function beam(a, b, width = 0.12) {
    rails.push({ a: new T.Vector3(...a), b: new T.Vector3(...b), width });
  }
  const spectatorPositions = [];
  for (const side of [-1, 1])
    for (let row = 0; row < 10; row++) {
      const x = side * (10 + row * 1.08),
        y = row * 0.62;
      box(1.1, 0.62, 36, concrete, x, y + 0.3, -8.2, true);
      for (let n = 0; n < 43; n++) {
        if (n % 14 === 0) continue;
        spectatorPositions.push({ x, y: y + 0.76, z: -25.1 + n * 0.8, row });
      }
      beam(
        [x + side * 0.52, y + 1.3, -26],
        [x + side * 0.52, y + 1.3, 9.5],
        0.035,
      );
    }
  for (const side of [-1, 1])
    for (let row = 0; row < 8; row++) {
      const z = (side > 0 ? 10 : -26.4) + side * row * 1.1,
        y = row * 0.62;
      box(19, 0.62, 1.1, concrete, 0, y + 0.3, z, true);
      for (let n = 0; n < 24; n++)
        spectatorPositions.push({ x: -9.2 + n * 0.8, y: y + 0.76, z, row });
    }
  // Two draw calls for the crowd, with per-instance size and clothing colors.
  spectatorPositions.sort((a, b) => a.row - b.row);
  const bodies = new T.InstancedMesh(
    new T.CapsuleGeometry(0.17, 0.4, 2, 5),
    physical("#ffffff"),
    spectatorPositions.length,
  );
  const heads = new T.InstancedMesh(
    new T.SphereGeometry(0.105, 6, 4),
    physical("#ffffff"),
    spectatorPositions.length,
  );
  const chairs = new T.InstancedMesh(
      new T.BoxGeometry(0.56, 0.15, 0.6),
      seat,
      spectatorPositions.length,
    ),
    o = new T.Object3D();
  const colors = [
    "#b53c35",
    "#316287",
    "#e6d3b2",
    "#d4a035",
    "#202d42",
    "#77824b",
  ];
  spectatorPositions.forEach((p, i) => {
    o.position.set(p.x, p.y, p.z);
    o.scale.setScalar(0.9 + (i % 7) * 0.025);
    o.rotation.z = Math.sin(i * 2.1) * 0.07;
    o.updateMatrix();
    bodies.setMatrixAt(i, o.matrix);
    bodies.setColorAt(i, new T.Color(colors[i % colors.length]));
    o.position.y = p.y + 0.4;
    o.updateMatrix();
    heads.setMatrixAt(i, o.matrix);
    heads.setColorAt(i, new T.Color(["#ad785a", "#704c38", "#d2a383"][i % 3]));
    o.position.y = p.y - 0.36;
    o.rotation.z = 0;
    o.updateMatrix();
    chairs.setMatrixAt(i, o.matrix);
  });
  for (const m of [bodies, heads, chairs]) {
    m.computeBoundingSphere();
    scene.add(m);
  }
  for (const x of [-23, 23]) {
    const wall = mesh(
      new T.PlaneGeometry(64, 20),
      physical("#656a70"),
      x,
      10,
      -8.2,
    );
    wall.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2;
  }
  for (const z of [-39, 22]) {
    const wall = mesh(
      new T.PlaneGeometry(46, 20),
      physical("#626972"),
      0,
      10,
      z,
    );
    wall.rotation.y = z > 0 ? Math.PI : 0;
  }
  const roof = mesh(
    new T.PlaneGeometry(48, 64),
    physical("#8a8d8a"),
    0,
    19,
    -8.2,
  );
  roof.rotation.x = Math.PI / 2;
  for (const z of [-34, -26, -18, -10, -2, 6, 14]) {
    beam([-23, 18, z], [23, 18, z], 0.16);
    beam([-23, 16.8, z], [23, 16.8, z], 0.1);
    for (let x = -23; x < 22; x += 3) beam([x, 16.8, z], [x + 3, 18, z], 0.07);
  }
  for (const x of [-21, 21]) {
    box(1, 0.6, 60, steel, x, 10, -8.2);
    beam([x, 10.8, -38], [x, 10.8, 21], 0.08);
  }
  const trusses = new T.InstancedMesh(
    new T.BoxGeometry(1, 1, 1),
    steel,
    rails.length,
  );
  rails.forEach(({ a, b, width }, i) => {
    const d = b.clone().sub(a);
    o.position.copy(a).add(b).multiplyScalar(0.5);
    o.scale.set(width, d.length(), width);
    o.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize());
    o.updateMatrix();
    trusses.setMatrixAt(i, o.matrix);
  });
  trusses.computeBoundingSphere();
  scene.add(trusses);
  const ledCanvas = document.createElement("canvas");
  ledCanvas.width = 2048;
  ledCanvas.height = 128;
  const led = ledCanvas.getContext("2d");
  led.fillStyle = "#071b32";
  led.fillRect(0, 0, 2048, 128);
  led.fillStyle = "#b5ebff";
  led.font = "bold 58px Arial";
  led.fillText(
    "BASELINE   •   MAKE YOUR GAME   •   BASELINE   •   MAKE YOUR GAME",
    35,
    86,
  );
  const ledMap = new T.CanvasTexture(ledCanvas);
  ledMap.colorSpace = T.SRGBColorSpace;
  ledMap.wrapS = T.RepeatWrapping;
  const ledMat = new T.MeshBasicMaterial({
    map: ledMap,
    color: new T.Color(1.3, 1.5, 1.8),
    toneMapped: false,
  });
  for (const x of [-8.9, 8.9]) {
    const sign = mesh(new T.PlaneGeometry(32, 0.7), ledMat, x, 0.85, -8.2);
    sign.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2;
  }
  for (const z of [-24.1, 7.7]) {
    const sign = mesh(new T.PlaneGeometry(17, 0.7), ledMat, 0, 0.85, z);
    sign.rotation.y = z > 0 ? Math.PI : 0;
  }
  const scoreCanvas = document.createElement("canvas");
  scoreCanvas.width = 1024;
  scoreCanvas.height = 512;
  const scoreCtx = scoreCanvas.getContext("2d"),
    scoreMap = new T.CanvasTexture(scoreCanvas);
  scoreMap.colorSpace = T.SRGBColorSpace;
  const scoreMat = new T.MeshBasicMaterial({
    map: scoreMap,
    toneMapped: false,
    color: new T.Color(1.2, 1.2, 1.2),
  });
  box(5.6, 3.4, 5.6, physical("#152330", { metalness: 0.6 }), 0, 11, -8.2);
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    const screen = mesh(
      new T.PlaneGeometry(5.2, 2.8),
      scoreMat,
      Math.sin(a) * 2.82,
      11,
      -8.2 + Math.cos(a) * 2.82,
    );
    screen.rotation.y = a;
    box(0.04, 5.3, 0.04, steel, Math.sin(a) * 2, 15.35, -8.2 + Math.cos(a) * 2);
  }
  for (const { hoop: h, board: b } of c.baskets) {
    const sign = h.z > 0 ? 1 : -1,
      baseline = sign > 0 ? 5.8 : -22.2,
      support = baseline + sign * 0.9;
    box(0.3, 3.8, 0.35, steel, 0, 1.9, support, true);
    box(1.1, 1.4, 0.65, physical("#183c63"), 0, 0.7, support, true);
    box(
      0.22,
      0.2,
      Math.abs(support - b.z),
      steel,
      0,
      3.65,
      (support + b.z) / 2,
      true,
    );
    const glass = box(
      1.8,
      1.05,
      0.035,
      physical("#e4f5ff", {
        transmission: 0.85,
        thickness: 0.035,
        ior: 1.5,
        roughness: 0.06,
        transparent: true,
        opacity: 0.55,
        clearcoat: 1,
      }),
      0,
      3.425,
      b.z,
      true,
    );
    glasses.push(glass.material);
    const frameMat = physical("#eff5ef", { roughness: 0.4 });
    for (const x of [-0.9, 0.9])
      box(0.035, 1.05, 0.04, frameMat, x, 3.425, b.z - sign * 0.03);
    for (const y of [2.9, 3.95])
      box(1.8, 0.035, 0.04, frameMat, 0, y, b.z - sign * 0.03);
    for (const x of [-0.295, 0.295])
      box(0.025, 0.45, 0.015, frameMat, x, 3.275, b.z - sign * 0.04);
    for (const y of [3.05, 3.5])
      box(0.59, 0.025, 0.015, frameMat, 0, y, b.z - sign * 0.04);
    const rim = mesh(
      new T.TorusGeometry(h.radius, h.tube, 10, 48),
      physical("#e65b19", { metalness: 0.72, roughness: 0.24 }),
      h.x,
      h.y,
      h.z,
    );
    rim.rotation.x = Math.PI / 2;
    box(0.1, 0.04, Math.abs(b.z - h.z), steel, 0, h.y, (b.z + h.z) / 2);
    const positions = [],
      levels = 6,
      segments = 16;
    const point = (ring, i, drop = 0) => {
      const a = (i / segments) * Math.PI * 2 + ring * 0.08,
        r = h.radius - ((h.radius - 0.125) * ring) / (levels - 1);
      return [
        h.x + Math.cos(a) * r,
        h.y - (ring / (levels - 1)) * 0.45 - drop,
        h.z + Math.sin(a) * r,
      ];
    };
    for (let r = 0; r < levels - 1; r++)
      for (let i = 0; i < segments; i++) {
        positions.push(
          ...point(r, i),
          ...point(r + 1, i + 1),
          ...point(r, i),
          ...point(r + 1, i - 1),
        );
      }
    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
    const net = new T.LineSegments(
      geo,
      new T.LineBasicMaterial({
        color: "#fff5e1",
        transparent: true,
        opacity: 0.85,
      }),
    );
    scene.add(net);
    nets.push({
      h,
      geo,
      point,
      displacement: 0,
      velocity: 0,
      rest: new Float32Array(positions),
    });
  }
  let elapsed = 0,
    lastScore = -1;
  return {
    obstacles,
    wood,
    reflection,
    bodies,
    heads,
    setQuality(p) {
      profile = p;
      for (const material of glasses) {
        material.transmission = p.ao ? 0.85 : 0;
        material.needsUpdate = true;
      }
      reflection.visible = p.reflection > 0;
      if (p.reflection)
        reflection.getRenderTarget().setSize(p.reflection, p.reflection);
      bodies.count =
        heads.count =
        chairs.count =
          Math.floor((spectatorPositions.length * p.crowdRows) / 10);
    },
    update(shot, dt) {
      frame++;
      elapsed += dt;
      ledMap.offset.x = (elapsed * 0.03) % 1;
      if (frame === 1 || frame % 15 === 0) {
        scoreCtx.fillStyle = "#071423";
        scoreCtx.fillRect(0, 0, 1024, 512);
        scoreCtx.textAlign = "center";
        scoreCtx.fillStyle = "#def7ff";
        scoreCtx.font = "bold 65px Arial";
        scoreCtx.fillText("BASELINE ARENA", 512, 100);
        scoreCtx.font = "bold 180px Arial";
        scoreCtx.fillText(
          String(shot.stats.points).padStart(2, "0") +
            " : " +
            String(shot.opponentPoints ?? 0).padStart(2, "0"),
          512,
          310,
        );
        scoreCtx.font = "36px Arial";
        scoreCtx.fillText(
          "HOME     •     " +
            (shot.paused ? "PAUSE" : "LIVE") +
            "     •     AWAY",
          512,
          420,
        );
        scoreMap.needsUpdate = true;
      }
      const total = shot.stats.made + (shot.opponentPoints ?? 0) / 2;
      for (const n of nets) {
        if (
          total !== lastScore &&
          lastScore >= 0 &&
          Math.hypot(shot.ball.x - n.h.x, shot.ball.z - n.h.z) < 0.5
        )
          n.velocity += 1.8;
        const delta = Math.min(dt, 1 / 30);
        n.velocity += (-n.displacement * 100 - n.velocity * 12) * delta;
        n.displacement += n.velocity * delta;
        const a = n.geo.attributes.position;
        for (let i = 0; i < a.count; i++) {
          const weight = (n.h.y - n.rest[i * 3 + 1]) / 0.45;
          a.setY(i, n.rest[i * 3 + 1] - n.displacement * weight);
          a.setX(
            i,
            n.rest[i * 3] +
              Math.sin(elapsed * 13) * n.displacement * weight * 0.15,
          );
        }
        a.needsUpdate = true;
      }
      lastScore = total;
    },
    dispose() {
      reflection.getRenderTarget().dispose();
      reflection.geometry.dispose();
      reflection.material.dispose();
    },
  };
}

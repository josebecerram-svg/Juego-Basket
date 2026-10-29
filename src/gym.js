import * as T from "../vendor/three.module.js";
import { config as c } from "./config.js";

// Procedural wood: the court is geometry and generated materials, never a photo.
function parquet() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1024;
  const ctx = canvas.getContext("2d");
  let seed = 32;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let row = 0; row < 32; row++) {
    const offset = (row % 3) * 70;
    for (let col = -1; col < 6; col++) {
      const x = col * 220 + offset,
        y = row * 32,
        v = Math.floor(random() * 22);
      ctx.fillStyle = `rgb(${205 + v},${167 + v},${113 + v})`;
      ctx.fillRect(x, y, 220, 32);
      ctx.strokeStyle = "rgba(95,59,25,.2)";
      ctx.strokeRect(x, y, 220, 32);
      for (let g = 0; g < 12; g++) {
        ctx.strokeStyle = `rgba(90,58,27,${random() * 0.09})`;
        ctx.beginPath();
        const yy = y + random() * 32;
        ctx.moveTo(x, yy);
        ctx.bezierCurveTo(x + 70, yy + 2, x + 140, yy - 2, x + 220, yy);
        ctx.stroke();
      }
    }
  }
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  texture.wrapS = texture.wrapT = T.RepeatWrapping;
  texture.repeat.set(3, 5);
  texture.anisotropy = 8;
  return texture;
}
export function createGym(scene) {
  const cameraSeats = [];
  const material = (color, extra = {}) =>
    new T.MeshStandardMaterial({ color, roughness: 0.65, ...extra });
  const wood = new T.MeshPhysicalMaterial({
    color: "#ffffff",
    clearcoat: 0.45,
    clearcoatRoughness: 0.32,
    map: parquet(),
    roughness: 0.38,
  });
  const blue = material("#2465a3", { roughness: 0.45 });
  const dark = material("#192634"),
    seat = material("#27394b"),
    steel = material("#84939d", { metalness: 0.65, roughness: 0.35 }),
    orange = material("#ef692a"),
    white = material("#fff8e8");
  function mesh(geometry, mat, x, y, z) {
    const m = new T.Mesh(geometry, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
    return m;
  }
  const plane = (width, length, mat, x, z, y = 0.012) => {
    const p = mesh(new T.PlaneGeometry(width, length), mat, x, y, z);
    p.rotation.x = -Math.PI / 2;
    return p;
  };
  plane(34, 42, material("#29323b"), 0, -8.2, -0.04);
  plane(15, 28, wood, 0, -8.2, 0);
  function line(points, color = "#fff9e9", radius = 0.022) {
    const geometry = new T.CylinderGeometry(radius, radius, 1, 6);
    const m = new T.InstancedMesh(geometry, material(color), points.length - 1);
    const object = new T.Object3D(),
      up = new T.Vector3(0, 1, 0);
    for (let i = 1; i < points.length; i++) {
      const a = new T.Vector3(...points[i - 1]),
        b = new T.Vector3(...points[i]);
      const delta = b.clone().sub(a);
      object.position.copy(a).add(b).multiplyScalar(0.5);
      object.scale.set(1, delta.length(), 1);
      object.quaternion.setFromUnitVectors(up, delta.normalize());
      object.updateMatrix();
      m.setMatrixAt(i - 1, object.matrix);
    }
    m.computeBoundingSphere();
    scene.add(m);
    return m;
  }

  function arc(x, z, r, start = 0, end = Math.PI * 2) {
    const pts = [];
    for (let i = 0; i <= 80; i++) {
      const a = start + ((end - start) * i) / 80;
      pts.push([x + Math.cos(a) * r, 0.03, z + Math.sin(a) * r]);
    }
    line(pts);
  }
  line([
    [-7.5, 0.03, -22.2],
    [7.5, 0.03, -22.2],
    [7.5, 0.03, 5.8],
    [-7.5, 0.03, 5.8],
    [-7.5, 0.03, -22.2],
  ]);
  line([
    [-7.5, 0.03, -8.2],
    [7.5, 0.03, -8.2],
  ]);
  arc(0, -8.2, 1.8);
  for (const { hoop: h, board: b } of c.baskets) {
    const sign = h.z > 0 ? 1 : -1,
      baseline = sign > 0 ? 5.8 : -22.2,
      free = baseline - sign * 5.8;
    plane(4.9, 5.8, blue, 0, baseline - sign * 2.9);
    line([
      [-2.45, 0.035, baseline],
      [-2.45, 0.035, free],
      [2.45, 0.035, free],
      [2.45, 0.035, baseline],
    ]);
    arc(0, free, 1.8);
    // Three-point arc meets the end line at both corners.
    const pts = [];
    for (let i = 0; i <= 90; i++) {
      const a = Math.PI + (i / 90) * Math.PI;
      pts.push([Math.cos(a) * 6.75, 0.032, h.z + sign * Math.sin(a) * 6.75]);
    }
    line(pts);
    line([
      [-6.75, 0.03, baseline],
      [-6.75, 0.03, h.z],
    ]);
    line([
      [6.75, 0.03, baseline],
      [6.75, 0.03, h.z],
    ]);
    arc(0, h.z, 1.25, sign > 0 ? Math.PI : 0, sign > 0 ? Math.PI * 2 : Math.PI);
    for (let i = 0; i < 4; i++)
      for (const side of [-1, 1])
        line([
          [side * 2.45, 0.04, free + sign * (1 + i * 0.85)],
          [side * 2.7, 0.04, free + sign * (1 + i * 0.85)],
        ]);
    const support = baseline + sign * 0.9;
    mesh(new T.BoxGeometry(0.22, 3.8, 0.22), steel, 0, 1.9, support);
    mesh(
      new T.BoxGeometry(0.8, 1.3, 0.45),
      blue,
      0,
      0.65,
      support - sign * 0.1,
    );
    mesh(
      new T.BoxGeometry(0.18, 0.16, Math.abs(support - b.z)),
      steel,
      0,
      3.65,
      (support + b.z) / 2,
    );
    mesh(
      new T.BoxGeometry(1.8, 1.05, 0.065),
      material("#b9d6e2", {
        transparent: true,
        opacity: 0.38,
        metalness: 0.1,
        roughness: 0.18,
      }),
      0,
      3.425,
      b.z,
    );
    const face = b.z - sign * 0.04;
    line(
      [
        [-0.9, 2.9, face],
        [-0.9, 3.95, face],
        [0.9, 3.95, face],
        [0.9, 2.9, face],
        [-0.9, 2.9, face],
      ],
      "#ffffff",
      0.028,
    );
    line(
      [
        [-0.295, 3.05, face],
        [-0.295, 3.5, face],
        [0.295, 3.5, face],
        [0.295, 3.05, face],
        [-0.295, 3.05, face],
      ],
      "#ffffff",
      0.018,
    );
    const rim = mesh(
      new T.TorusGeometry(h.radius, h.tube, 12, 64),
      orange,
      h.x,
      h.y,
      h.z,
    );
    rim.rotation.x = Math.PI / 2;
    mesh(
      new T.BoxGeometry(0.1, 0.04, Math.abs(b.z - h.z)),
      orange,
      0,
      h.y,
      (b.z + h.z) / 2,
    );
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      line(
        [
          [Math.cos(a) * h.radius, h.y, h.z + Math.sin(a) * h.radius],
          [Math.cos(a + 0.15) * 0.13, 2.62, h.z + Math.sin(a + 0.15) * 0.13],
        ],
        "#e5e9e4",
        0.007,
      );
    }
    for (const [y, r] of [
      [2.68, 0.145],
      [2.84, 0.18],
    ]) {
      const pts = [];
      for (let i = 0; i <= 32; i++) {
        const a = (i / 32) * Math.PI * 2;
        pts.push([r * Math.cos(a), y, h.z + r * Math.sin(a)]);
      }
      line(pts, "#e5e9e4", 0.006);
    }
  }
  // Instanced seats keep the gym inexpensive even when all stands are visible.
  const seats = [],
    backs = [];
  for (const side of [-1, 1])
    for (let row = 0; row < 6; row++) {
      const x = side * (9 + row * 0.8),
        y = row * 0.42;
      mesh(new T.BoxGeometry(0.83, 0.4, 30), dark, x, y + 0.2, -8.2);
      cameraSeats.push(
        new T.Box3(
          new T.Vector3(x - 0.48, y, -23.2),
          new T.Vector3(x + 0.48, y + 0.9, 6.8),
        ),
      );
      for (let n = 0; n < 35; n++) {
        if (n % 12 === 0) continue;
        const z = -22.3 + n * 0.82;
        seats.push([x, y + 0.48, z]);
        backs.push([x + side * 0.25, y + 0.66, z]);
      }
    }
  function instances(geometry, positions) {
    const m = new T.InstancedMesh(geometry, seat, positions.length);
    const transform = new T.Matrix4();
    positions.forEach((p, i) =>
      m.setMatrixAt(i, transform.makeTranslation(...p)),
    );
    m.castShadow = true;
    m.receiveShadow = true;
    m.computeBoundingSphere();
    scene.add(m);
  }
  instances(new T.BoxGeometry(0.52, 0.12, 0.57), seats);
  instances(new T.BoxGeometry(0.12, 0.38, 0.57), backs);
  const wall = material("#222e3b");
  // Interior-facing surfaces avoid hiding the court when framing both players from outside the gym shell.
  mesh(new T.PlaneGeometry(40, 10), wall, -15.5, 5, -8.2).rotation.y =
    Math.PI / 2;
  mesh(new T.PlaneGeometry(40, 10), wall, 15.5, 5, -8.2).rotation.y =
    -Math.PI / 2;
  for (const z of [-26, 9.6]) {
    mesh(new T.PlaneGeometry(31, 10), wall, 0, 5, z).rotation.y =
      z > 0 ? Math.PI : 0;
    mesh(
      new T.BoxGeometry(24, 0.18, 0.25),
      blue,
      0,
      2.2,
      z - signSafe(z) * 0.16,
    );
  }
  function signSafe(z) {
    return z > 0 ? 1 : -1;
  }
  const roof = mesh(
    new T.PlaneGeometry(32, 40),
    material("#263441", { side: T.FrontSide }),
    0,
    10.2,
    -8.2,
  );
  roof.rotation.x = Math.PI / 2;
  for (const z of [-21, -13, -5, 3]) {
    mesh(new T.BoxGeometry(30, 0.18, 0.18), steel, 0, 9.5, z);
    for (const x of [-5, 5]) {
      mesh(
        new T.BoxGeometry(2.8, 0.1, 0.8),
        material("#f7f2e5", { emissive: "#fff0d0", emissiveIntensity: 3 }),
        x,
        9.3,
        z,
      );
      const spot = new T.SpotLight("#fff1d6", 28, 25, Math.PI / 3, 0.6, 2);
      spot.position.set(x, 9, z);
      spot.target.position.set(x * 0.4, 0, z);
      scene.add(spot, spot.target);
    }
  }
  // End wall lettering is generated on a small sign, not a photographic backdrop.
  const sign = document.createElement("canvas");
  sign.width = 1024;
  sign.height = 128;
  const ctx = sign.getContext("2d");
  ctx.fillStyle = "#222e3b";
  ctx.fillRect(0, 0, 1024, 128);
  ctx.font = "bold 52px Arial";
  ctx.textAlign = "center";
  ctx.fillStyle = "#c3d4df";
  ctx.fillText("BASKET  /  PRÁCTICA LIBRE", 512, 84);
  const tex = new T.CanvasTexture(sign);
  tex.colorSpace = T.SRGBColorSpace;
  const banner = mesh(
    new T.PlaneGeometry(8, 1),
    new T.MeshBasicMaterial({ map: tex, side: T.DoubleSide }),
    0,
    6.5,
    9.4,
  );
  banner.rotation.y = Math.PI;
  scene.updateMatrixWorld(true);
  return scene.children
    .filter(
      (o) =>
        o.isMesh &&
        !o.isInstancedMesh &&
        (o.geometry.type === "BoxGeometry" ||
          (o.geometry.type === "PlaneGeometry" &&
            (o.position.y > 8 ||
              o.position.x === -15.5 ||
              o.position.x === 15.5 ||
              o.position.z === -26 ||
              o.position.z === 9.6))),
    )
    .map((o) => new T.Box3().setFromObject(o))
    .concat(cameraSeats);
}

import * as T from "../../vendor/three.module.js";
const cache = new Map();
export function microNormal(kind = "fabric") {
  if (cache.has(kind)) return cache.get(kind);
  const size = 256,
    data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const a =
        kind === "ball"
          ? Math.sin(x * 1.8) * Math.cos(y * 1.8)
          : kind === "skin"
            ? Math.sin(x * 2.13 + y * 1.7) * 0.35
            : Math.sin((x * Math.PI) / 2) * Math.cos((y * Math.PI) / 2);
      data[i] = 128 + a * 23;
      data[i + 1] = 128 + Math.cos(x * 1.2 - y * 2.1) * 14;
      data[i + 2] = 252;
      data[i + 3] = 255;
    }
  const texture = new T.DataTexture(data, size, size);
  texture.wrapS = texture.wrapT = T.RepeatWrapping;
  texture.needsUpdate = true;
  texture.repeat.set(kind === "ball" ? 18 : 5, kind === "ball" ? 12 : 5);
  cache.set(kind, texture);
  return texture;
}
export function physicalSkin(source) {
  return new T.MeshPhysicalMaterial({
    map: source.map,
    normalMap: source.normalMap ?? microNormal("skin"),
    normalScale: new T.Vector2(0.5, 0.5),
    roughness: 0.42,
    roughnessMap: source.roughnessMap,
    specularColorMap: source.specularColorMap,
    specularIntensity: 0.75,
    clearcoat: 0.22,
    clearcoatRoughness: 0.16,
    metalness: 0,
    ior: 1.45,
    envMapIntensity: 0.65,
  });
}
export function physicalUniform(color, source) {
  return new T.MeshPhysicalMaterial({
    color,
    normalMap: source?.normalMap ?? microNormal(),
    normalScale: new T.Vector2(0.5, 0.5),
    roughness: 0.78,
    roughnessMap: source?.roughnessMap,
    metalness: 0,
    sheen: 0.55,
    sheenRoughness: 0.8,
    sheenColor: new T.Color("#e0e7ee"),
    envMapIntensity: 0.4,
  });
}
export function basketballMaterial() {
  return new T.MeshPhysicalMaterial({
    color: "#d97d32",
    roughness: 0.7,
    normalMap: microNormal("ball"),
    normalScale: new T.Vector2(0.45, 0.45),
    clearcoat: 0.06,
  });
}
export function courtTextures() {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 4096;
  const ctx = canvas.getContext("2d");
  let seed = 17;
  const random = () =>
    (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  for (let row = 0; row < 128; row++)
    for (let col = -1; col < 8; col++) {
      const x = col * 300 + (row % 3) * 97,
        y = row * 32,
        v = random() * 18;
      ctx.fillStyle = `rgb(${190 + v},${141 + v},${82 + v})`;
      ctx.fillRect(x, y, 300, 32);
      ctx.strokeStyle = "#825c3438";
      ctx.strokeRect(x, y, 300, 32);
      for (let g = 0; g < 9; g++) {
        ctx.strokeStyle = `rgba(75,47,23,${random() * 0.12})`;
        ctx.beginPath();
        const gy = y + random() * 32;
        ctx.moveTo(x, gy);
        ctx.bezierCurveTo(
          x + 100,
          gy + random() * 2,
          x + 200,
          gy - 1,
          x + 300,
          gy,
        );
        ctx.stroke();
      }
    }
  ctx.save();
  ctx.scale(2048 / 15, 4096 / 28);
  ctx.translate(7.5, 22.2);
  ctx.fillStyle = "#1e5682";
  ctx.fillRect(-2.45, 0, 4.9, 5.8);
  ctx.fillRect(-2.45, -22.2, 4.9, 5.8);
  ctx.strokeStyle = "#f2eee2";
  ctx.lineWidth = 0.05;
  ctx.strokeRect(-7.47, -22.17, 14.94, 27.94);
  const line = (points) => {
    ctx.beginPath();
    points.forEach(([x, z], i) => (i ? ctx.lineTo(x, z) : ctx.moveTo(x, z)));
    ctx.stroke();
  };
  const arc = (x, z, r, a = 0, b = Math.PI * 2) => {
    ctx.beginPath();
    ctx.arc(x, z, r, a, b);
    ctx.stroke();
  };
  line([
    [-7.5, -8.2],
    [7.5, -8.2],
  ]);
  arc(0, -8.2, 1.8);
  for (const sign of [1, -1]) {
    const baseline = sign === 1 ? 5.8 : -22.2,
      free = baseline - sign * 5.8,
      h = sign === 1 ? 4.3 : -20.7;
    ctx.strokeRect(-2.45, Math.min(baseline, free), 4.9, 5.8);
    arc(0, free, 1.8);
    const p = [];
    for (let i = 0; i <= 100; i++) {
      const a = Math.PI + (i / 100) * Math.PI;
      p.push([Math.cos(a) * 6.75, h + sign * Math.sin(a) * 6.75]);
    }
    line(p);
    line([
      [-6.75, baseline],
      [-6.75, h],
    ]);
    line([
      [6.75, baseline],
      [6.75, h],
    ]);
    arc(
      0,
      h,
      1.25,
      sign === 1 ? Math.PI : 0,
      sign === 1 ? Math.PI * 2 : Math.PI,
    );
  }
  ctx.fillStyle = "#0d3555";
  ctx.font = "bold 0.62px Arial";
  ctx.textAlign = "center";
  ctx.fillText("BASELINE", 0, -8.05);
  ctx.restore();
  const map = new T.CanvasTexture(canvas);
  map.colorSpace = T.SRGBColorSpace;
  map.anisotropy = 8;
  const roughCanvas = document.createElement("canvas");
  roughCanvas.width = roughCanvas.height = 512;
  const rctx = roughCanvas.getContext("2d");
  const pixels = rctx.createImageData(512, 512);
  for (let i = 0; i < pixels.data.length; i += 4) {
    const v = 130 + random() * 45;
    pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = v;
    pixels.data[i + 3] = 255;
  }
  rctx.putImageData(pixels, 0, 0);
  const roughnessMap = new T.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = roughnessMap.wrapT = T.RepeatWrapping;
  roughnessMap.repeat.set(8, 16);
  return { map, roughnessMap };
}

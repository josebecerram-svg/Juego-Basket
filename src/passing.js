import { config as c } from "./config.js";
export const catchHand = (type) => ({
  x: 0,
  y: type === "overhead" ? 2.12 : 1.45,
  z: 0.42,
});
export const releaseHand = (type) => ({
  x: 0,
  y: type === "overhead" ? 2.15 : type === "bounce" ? 1.2 : 1.45,
  z: type === "overhead" ? 0.35 : 0.56,
});
export function passFlight(start, target, type) {
  const d = Math.hypot(target.x - start.x, target.z - start.z);
  return {
    start,
    target,
    type,
    duration:
      type === "bounce"
        ? Math.max(0.8, Math.min(1.6, d / 7))
        : type === "overhead"
          ? Math.max(0.85, Math.min(1.8, d / 6))
          : Math.max(0.45, Math.min(1.2, d / c.passing.speed)),
    arc: type === "overhead" ? Math.max(1.1, d * 0.18) : 0.18 + d * 0.035,
    bounces: 0,
  };
}
export function samplePass(pass, end, t) {
  const { start } = pass;
  const p = {
    x: start.x + (end.x - start.x) * t,
    z: start.z + (end.z - start.z) * t,
  };
  if (pass.type !== "bounce") {
    p.y = start.y + (end.y - start.y) * t + 4 * pass.arc * t * (1 - t);
    return p;
  }
  const fraction = 0.46,
    down = pass.duration * fraction,
    up = pass.duration - down;
  if (t <= fraction) {
    const seconds = t * pass.duration,
      vy = (c.ballRadius - start.y + 0.5 * c.gravity * down * down) / down;
    p.y = start.y + vy * seconds - 0.5 * c.gravity * seconds * seconds;
  } else {
    const seconds = (t - fraction) * pass.duration,
      vy = (end.y - c.ballRadius + 0.5 * c.gravity * up * up) / up;
    p.y = c.ballRadius + vy * seconds - 0.5 * c.gravity * seconds * seconds;
  }
  p.y = Math.max(c.ballRadius, p.y);
  return p;
}

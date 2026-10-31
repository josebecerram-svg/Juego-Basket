import { config as c } from "./config.js";
import { angleDelta } from "./movement.js";
export const wrapYaw = (y) => Math.atan2(Math.sin(y), Math.cos(y));
export function mouseAim(s, dx, dy) {
  if (s.phase === "windup" || s.dunk?.active) return;
  if (!s.aimLock) s.aim.yaw -= dx * c.aim.sensitivity;
  s.aim.angle = Math.max(
    c.minAngle,
    Math.min(c.maxAngle, s.aim.angle - dy * c.aim.sensitivity * 0.45),
  );
}
export function toggleHoopLock(s) {
  if (s.aimLock) {
    s.aimLock = null;
    s.notify("Mira libre");
    return true;
  }
  const candidates = (s.visibleHoops ?? []).filter(
    (h) => Math.hypot(h.x - s.player.x, h.z - s.player.z) <= c.aim.lockRange,
  );
  candidates.sort(
    (a, b) =>
      Math.hypot(a.x - s.player.x, a.z - s.player.z) -
      Math.hypot(b.x - s.player.x, b.z - s.player.z),
  );
  if (!candidates.length)
    return s.notify("No hay un aro visible dentro del alcance.");
  s.aimLock = candidates[0];
  s.lockLost = 0;
  s.notify("Aro fijado · clic derecho para liberar");
  return true;
}
export function updateAim(s, dt) {
  if (!s.aimLock) return;
  const h = s.aimLock,
    visible = (s.visibleHoops ?? []).some((v) => v.z === h.z && v.x === h.x);
  const reachable =
    Math.hypot(h.x - s.player.x, h.z - s.player.z) <= c.aim.lockRange;
  s.lockLost = visible && reachable ? 0 : (s.lockLost ?? 0) + dt;
  if (s.lockLost > c.aim.visibilityGrace) {
    s.aimLock = null;
    s.notify("Aro fuera de vista o alcance · mira libre");
    return;
  }
  if (s.phase === "windup" || s.dunk?.active) return;
  const yaw = Math.atan2(h.x - s.player.x, h.z - s.player.z);
  s.aim.yaw +=
    angleDelta(s.aim.yaw, yaw) * (1 - Math.exp(-c.aim.lockResponse * dt));
}

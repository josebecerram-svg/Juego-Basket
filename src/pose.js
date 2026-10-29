import { config as c } from "./config.js";
const smooth = (t) => {
  t = Math.max(0, Math.min(1, t));
  return t * t * (3 - 2 * t);
};
export function heldPosition(shot) {
  if (shot.phase === "charging") {
    const t = smooth(shot.time / 0.4);
    return { x: 0.24 * (1 - t), y: 1.5 + 0.45 * t, z: 0.42 - 0.04 * t };
  }
  if (shot.phase === "windup") {
    const t = smooth(shot.time / c.windup),
      from = shot.launch.held;
    return {
      x: (from.x ?? 0) * (1 - t),
      y: from.y + (c.initial.y - from.y) * t,
      z: from.z + (0.38 - from.z) * t,
    };
  }
  return { x: 0.24, y: 1.5, z: 0.42 };
}
export function playerPose(shot) {
  const speed = Math.min(
    1,
    Math.hypot(shot.movement?.vx ?? 0, shot.movement?.vz ?? 0) /
      c.movement.speed,
  );
  const stride = (shot.movement?.distance ?? 0) * 3.3;
  const charge =
    shot.phase === "charging"
      ? Math.min(1, shot.time / 0.4)
      : shot.phase === "windup"
        ? (shot.launch.crouch ?? 1) * (1 - smooth(shot.time / c.windup))
        : 0;
  const follow = shot.phase === "flight" ? 1 - smooth(shot.time / 0.85) : 0;
  const crouch = charge * 0.09,
    sway = Math.sin(stride * 2) * 0.015 * speed;
  const held = heldPosition(shot);
  const hand =
    shot.passPose ??
    (shot.hasBall === false &&
    !["windup", "flight", "result"].includes(shot.phase)
      ? { x: 0, y: 1.15, z: 0.12, spread: 0.16 }
      : null);
  return {
    speed,
    stride,
    crouch,
    sway,
    follow,
    hip: 0.96 - crouch + sway - speed * 0.085,
    hand:
      hand ??
      (shot.phase === "flight"
        ? { y: 1.22 + follow * 0.9, z: 0.18 + follow * 0.2 }
        : shot.phase === "result"
          ? { y: 1.22, z: 0.18 }
          : held),
  };
}

import { config as c } from "./config.js";
export const smooth = (t) => {
  t = Math.max(0, Math.min(1, t));
  return t * t * (3 - 2 * t);
};
const mix = (a, b, t) => a + (b - a) * t;
export const emptyHands = () => ({ x: 0, y: 1.15, z: 0.12, spread: 0.16 });
export function passFollow(time) {
  // Extension ends exactly at the release anchor, then relaxes without a pose cut.
  const extend = smooth(time / 0.13),
    recover = smooth((time - 0.22) / 0.48);
  return {
    x: 0,
    y: mix(1.45, 1.15, recover),
    z: mix(0.56 + 0.1 * extend, 0.12, recover),
    spread: 0.16 * recover,
  };
}
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
      y: mix(from.y, c.initial.y, t),
      z: mix(from.z, 0.38, t),
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
  const charging = shot.phase === "charging",
    winding = shot.phase === "windup",
    flying = shot.phase === "flight";
  const power =
    winding || flying ? (shot.launch?.power ?? 0) : (shot.power ?? 0);
  let crouch = charging ? smooth(shot.time / 0.4) * (0.075 + 0.04 * power) : 0;
  if (winding) {
    const t = Math.min(1, shot.time / c.windup),
      initial = shot.launch.crouchDepth ?? 0.09 * (shot.launch.crouch ?? 1);
    // Even a short tap has a small load; fully charged legs start from their existing bend.
    crouch =
      initial * (1 - smooth(t)) +
      0.035 * (1 - initial / 0.12) * Math.sin(Math.PI * t) ** 2;
  }
  const action = shot.action;
  let passLean = 0,
    passTwist = 0;
  if (action?.kind === "passPrepare") {
    const t = smooth(action.time / c.passing.preparation);
    crouch += 0.045 * Math.sin(Math.PI * t);
    passLean = -0.025 * Math.sin(Math.PI * t);
    passTwist = -0.07 * Math.sin(Math.PI * t);
  } else if (action?.kind === "passFollow") {
    const t = action.time;
    passLean = 0.075 * Math.sin(Math.PI * Math.min(1, t / 0.7));
    passTwist = 0.045 * Math.sin(Math.PI * Math.min(1, t / 0.7));
  } else if (action?.kind === "catchReady") {
    crouch += 0.035 * smooth(action.time / 0.3);
  } else if (action?.kind === "catch") {
    crouch +=
      0.035 * (1 - smooth(action.time / c.passing.catchTime)) +
      0.015 *
        Math.sin(Math.PI * Math.min(1, action.time / c.passing.catchTime));
  }
  const follow = flying ? 1 - smooth((shot.time - 0.2) / 0.65) : 0;
  const wrist = flying ? smooth(shot.time / 0.12) * follow : 0;
  const sway = Math.sin(stride * 2) * 0.015 * speed;
  let hand = shot.passPose;
  if (
    !hand &&
    shot.hasBall === false &&
    !["windup", "flight", "result"].includes(shot.phase)
  )
    hand = emptyHands();
  if (!hand && flying) {
    const t = smooth((shot.time - 0.2) / 0.65);
    hand = {
      x: 0,
      y: mix(c.initial.y, 1.22, t),
      z: mix(0.38, 0.18, t),
      spread: 0.12 * t,
    };
  }
  return {
    speed,
    stride,
    crouch,
    sway,
    follow,
    wrist,
    torsoPitch:
      passLean +
      (charging
        ? 0.035 * smooth(shot.time / 0.4)
        : flying
          ? -0.025 * follow
          : 0),
    torsoTwist: passTwist,
    hip: 0.96 - crouch + sway - speed * 0.085,
    hand:
      hand ??
      (shot.phase === "result"
        ? { x: 0, y: 1.22, z: 0.18, spread: 0.12 }
        : heldPosition(shot)),
  };
}

// Shared contact anchors make both render and tests use the same ball-sized grip.
export function handPosition(shot, pose, side) {
  let center = pose.hand;
  if (shot.phase === "flight" && side < 0) {
    const t = smooth((shot.time - 0.08) / 0.48);
    center = {
      x: 0,
      y: mix(c.initial.y, 1.22, t),
      z: mix(0.38, 0.18, t),
      spread: 0.12 * t,
    };
  }
  return {
    x: (center.x ?? 0) + side * (0.118 + (center.spread ?? 0)),
    y: center.y - 0.025,
    z: center.z - 0.015,
  };
}

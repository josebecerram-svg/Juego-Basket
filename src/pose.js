import { config as c } from "./config.js";
export const smooth = (t) => {
  t = Math.max(0, Math.min(1, t));
  return t * t * (3 - 2 * t);
};
const mix = (a, b, t) => a + (b - a) * t;
export const emptyHands = () => ({ x: 0, y: 1.15, z: 0.12, spread: 0.16 });
export function passFollow(time, type = "direct") {
  // Extension ends exactly at the release anchor, then relaxes without a pose cut.
  const extend = smooth(time / 0.13),
    recover = smooth((time - 0.22) / 0.48);
  return {
    x: 0,
    y: mix(
      type === "overhead" ? 2.15 : type === "bounce" ? 1.2 : 1.45,
      1.15,
      recover,
    ),
    z: mix((type === "overhead" ? 0.35 : 0.56) + 0.1 * extend, 0.12, recover),
    spread: 0.16 * recover,
  };
}
export function readyPosition(shot) {
  const m = shot.motion,
    guard = m?.guard ?? 0,
    d = m?.dribble ?? 0;
  const u = ((m?.dribblePhase ?? 0) + 0.5) % 1,
    top = 1.18 - 0.42 * guard;
  const bounce = c.ballRadius + (top - c.ballRadius) * 4 * u * (1 - u);
  return {
    x:
      0.24 +
      0.08 * guard +
      Math.min(0.07, Math.abs(shot.movement?.lateral ?? 0) * 0.02),
    y: m?.floorPulse ? c.ballRadius : mix(1.5 - 0.43 * guard, bounce, d),
    z: 0.42 - 0.22 * guard,
  };
}
export function heldPosition(shot) {
  if (shot.phase === "fake" || shot.phase === "fakeReturn") {
    const from = shot.fake.from;
    if (shot.phase === "fakeReturn") {
      const t = smooth(shot.time / 0.2);
      return {
        x: mix(from.x ?? 0, 0.24, t),
        y: mix(from.y, 1.5, t),
        z: mix(from.z, 0.42, t),
      };
    }
    const t = shot.time / c.actions.fakeDuration,
      lift = smooth(t / 0.45) * (1 - smooth((t - 0.5) / 0.5));
    return {
      x: mix(from.x ?? 0, 0, lift),
      y: mix(from.y, 1.95, lift),
      z: mix(from.z, 0.38, lift),
    };
  }
  if (shot.phase === "charging") {
    const t = smooth(shot.time / 0.4);
    const from = shot.chargeFrom ?? { x: 0.24, y: 1.5, z: 0.42 };
    return {
      x: mix(from.x ?? 0, 0, t),
      y: mix(from.y, 1.95, t),
      z: mix(from.z, 0.38, t),
    };
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
  return readyPosition(shot);
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
  const motion = shot.motion;
  const guard = motion?.guard ?? 0;
  if (motion?.jumpStage === "prepare")
    crouch += 0.11 * smooth(motion.jumpTime / c.actions.jumpPreparation);
  crouch += (motion?.landing ?? 0) * 0.1 + guard * 0.055;
  if (shot.phase === "fake")
    crouch +=
      0.075 *
      Math.sin(Math.PI * Math.min(1, shot.time / c.actions.fakeDuration));
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
    torsoTwist: passTwist - guard * 0.24,
    hip:
      0.96 -
      crouch +
      sway -
      speed * 0.085 -
      Math.max(
        0,
        Math.min(
          1,
          (Math.hypot(shot.movement?.vx ?? 0, shot.movement?.vz ?? 0) -
            c.movement.speed) /
            (c.movement.sprintSpeed - c.movement.speed),
        ),
      ) *
        0.085,
    dribbling:
      shot.hasBall !== false &&
      ((shot.phase === "ready" && (motion?.dribble ?? 0) > 0.001) ||
        (["charging", "fake", "fakeReturn"].includes(shot.phase) &&
          heldPosition(shot).y < 0.85)),
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
  if (pose.dribbling) {
    const blend =
      shot.phase === "ready" ? smooth((shot.motion?.dribble ?? 0) / 0.3) : 1;
    const grip = {
      x: (center.x ?? 0) + side * (0.118 + (center.spread ?? 0)),
      y: center.y - 0.025,
      z: center.z - 0.015,
    };
    if (side > 0)
      return {
        x: mix(grip.x, center.x + 0.025, blend),
        y: mix(grip.y, Math.max(1.02, center.y + c.ballRadius), blend),
        z: mix(grip.z, center.z, blend),
      };
    const guard = shot.motion?.guard ?? 0;
    return {
      x: mix(grip.x, -0.2 + 0.08 * guard, blend),
      y: mix(grip.y, 1.1 + 0.12 * guard, blend),
      z: mix(grip.z, 0.12 + 0.15 * guard, blend),
    };
  }
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

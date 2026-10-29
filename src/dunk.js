import { config as c } from "./config.js";
import { heldPosition, smooth } from "./pose.js";
import { angleDelta } from "./movement.js";
const mix = (a, b, t) => a + (b - a) * t;
export function inPaint(p, h) {
  const baseline = h.z > 0 ? c.court.maxZ : c.court.minZ;
  return (
    Math.abs(p.x) <= 2.45 &&
    (h.z > 0
      ? p.z >= baseline - 5.8 && p.z <= baseline
      : p.z >= baseline && p.z <= baseline + 5.8)
  );
}
export function nearestHoop(p) {
  return c.baskets.reduce(
    (h, b) =>
      Math.hypot(b.hoop.x - p.x, b.hoop.z - p.z) <
      Math.hypot(h.x - p.x, h.z - p.z)
        ? b.hoop
        : h,
    c.hoop,
  );
}
export function eligibleDunk(s) {
  const takeoff = s.motion?.takeoff,
    h = takeoff?.hoop;
  return !!(
    ["ready", "charging"].includes(s.phase) &&
    s.hasBall &&
    h &&
    takeoff.hasBall &&
    takeoff.running &&
    inPaint(takeoff, h) &&
    Math.hypot(takeoff.x - h.x, takeoff.z - h.z) <= c.dunk.reach &&
    Math.hypot(s.player.x - h.x, s.player.z - h.z) <= c.dunk.reach &&
    ["prepare", "air"].includes(s.motion.jumpStage) &&
    s.motion.airTime < 0.45
  );
}
export function startDunk(s) {
  if (!eligibleDunk(s)) return false;
  const h = s.motion.takeoff.hoop,
    yaw = Math.atan2(h.x - s.player.x, h.z - s.player.z);
  s.dunk = {
    active: true,
    age: 0,
    hoop: { ...h },
    start: { x: s.player.x, y: s.player.y ?? 0, z: s.player.z },
    vx: s.movement.vx,
    vz: s.movement.vz,
    startYaw: s.bodyYaw ?? s.aim.yaw,
    yaw,
    from: heldPosition(s),
    hand: heldPosition(s),
    ballReleased: false,
  };
  s.phase = "dunkCharge";
  s.time = 0;
  s.power = 0;
  s.notice = "Clavada · suelta en la zona verde";
  s.noticeTime = 1.5;
  return true;
}
function hermite(a, b, v, t, duration) {
  return (
    (2 * t ** 3 - 3 * t * t + 1) * a +
    (t ** 3 - 2 * t * t + t) * v * duration +
    (-2 * t ** 3 + 3 * t * t) * b
  );
}
function launchBall(s, made) {
  const d = s.dunk,
    h = d.hoop;
  const origin = made
    ? { x: h.x, y: h.y + 0.22, z: h.z }
    : s.pointFor("player", d.hand);
  let dx = origin.x - h.x,
    dz = origin.z - h.z,
    length = Math.hypot(dx, dz);
  if (length < 0.1) {
    dx = Math.cos(d.yaw);
    dz = -Math.sin(d.yaw);
    length = 1;
  }
  Object.assign(s.ball, origin, {
    vx: made ? 0 : (dx / length) * 3,
    vy: made ? -3 : 0.5,
    vz: made ? 0 : (dz / length) * 3,
  });
  d.releaseHand = { ...d.hand };
  d.ballReleased = true;
  d.landingTime = 0;
  d.landFrom = { x: s.player.x, y: s.player.y ?? 0, z: s.player.z };
  s.launch = {
    kind: "dunk",
    power: s.power,
    yaw: d.yaw,
    angle: c.angle,
    hoop: { ...h },
    origin: { ...origin },
  };
  s.phase = "flight";
  s.time = 0;
  s.possession = "shooting";
}
export function releaseDunk(s, forceMiss = false) {
  if (s.phase !== "dunkCharge") return false;
  const d = s.dunk;
  d.success =
    !forceMiss && s.power >= c.dunk.greenLow && s.power <= c.dunk.greenHigh;
  s.notice = d.success
    ? "Clavada en curso"
    : "Fuera de verde · clavada fallida";
  s.noticeTime = 1.3;
  s.stats.attempts++;
  d.finishTime = 0;
  s.phase = "dunkFinish";
  d.finishFrom = { ...d.hand };
  d.finishBody = { x: s.player.x, y: s.player.y ?? 0, z: s.player.z };
  if (!d.success) launchBall(s, false);
  return true;
}
export function stepDunk(s, dt) {
  const d = s.dunk,
    h = d.hoop,
    m = s.motion;
  d.age += dt;
  m.dribble = 0;
  m.guard = 0;
  m.floorPulse = false;
  m.jumpStage = "air";
  m.airTime += dt;
  const x = h.x - Math.sin(d.yaw) * 0.38,
    z = h.z - Math.cos(d.yaw) * 0.38;
  if (s.phase === "dunkCharge") {
    s.time += dt;
    s.power = Math.min(1, s.time / c.dunk.chargeSeconds);
    const t = Math.min(1, s.time / 0.6),
      u = smooth(t);
    s.player.x = hermite(d.start.x, x, d.vx, t, 0.6);
    s.player.z = hermite(d.start.z, z, d.vz, t, 0.6);
    s.player.y = mix(d.start.y, c.dunk.peak, u);
    s.bodyYaw = d.startYaw + angleDelta(d.startYaw, d.yaw) * u;
    d.hand = {
      x: mix(d.from.x ?? 0, 0, u),
      y: mix(d.from.y, h.y + 0.22 - s.player.y, u),
      z: mix(d.from.z, 0.38, u),
    };
    Object.assign(s.ball, s.pointFor("player", d.hand));
    if (s.time >= c.dunk.maxHold) releaseDunk(s, true);
  } else if (s.phase === "dunkFinish") {
    d.finishTime += dt;
    const t = smooth(d.finishTime / c.dunk.finishSeconds);
    s.player.x = mix(d.finishBody.x, x, t);
    s.player.z = mix(d.finishBody.z, z, t);
    s.player.y = mix(d.finishBody.y, c.dunk.peak, t);
    s.bodyYaw =
      d.startYaw +
      angleDelta(d.startYaw, d.yaw) * smooth(Math.min(1, d.age / 0.6));
    d.hand = {
      x: mix(d.finishFrom.x ?? 0, 0, t),
      y: mix(d.finishFrom.y, h.y + 0.22 - s.player.y, t),
      z: mix(d.finishFrom.z, 0.38, t),
    };
    Object.assign(s.ball, s.pointFor("player", d.hand));
    if (d.finishTime >= c.dunk.finishSeconds) {
      s.bodyYaw = d.yaw;
      launchBall(s, true);
    }
  } else if (d.ballReleased) {
    d.landingTime += dt;
    const t = d.landingTime;
    s.player.y = Math.max(0, d.landFrom.y - 0.5 * c.gravity * t * t);
    m.vy = -c.gravity * t;
    if (s.player.y === 0) {
      m.jumpStage = "ground";
      m.vy = 0;
      m.landing = Math.max(
        0,
        1 - (t - Math.sqrt((2 * d.landFrom.y) / c.gravity)) * 4,
      );
      if (m.landing === 0) d.active = false;
    }
    if (d.success) {
      const contact = smooth(t / 0.07),
        recover = smooth((t - 0.12) / 0.48);
      const rimGrip = {
        x: h.radius - 0.118,
        y: h.y - s.player.y + 0.025,
        z: 0.395,
      };
      d.hand = {
        x: mix(mix(d.releaseHand.x ?? 0, rimGrip.x, contact), 0, recover),
        y: mix(mix(d.releaseHand.y, rimGrip.y, contact), 1.22, recover),
        z: mix(mix(d.releaseHand.z, rimGrip.z, contact), 0.18, recover),
        spread: 0.12 * recover,
      };
    } else {
      const u = smooth(t / 0.55);
      d.hand = {
        x: mix(d.releaseHand.x ?? 0, 0, u),
        y: mix(d.releaseHand.y, 1.22, u),
        z: mix(d.releaseHand.z, 0.18, u),
        spread: 0.12 * u,
      };
    }
  }
  s.movement.bodyYaw = s.bodyYaw;
  s.aim.yaw = s.bodyYaw;
  s.movement.vx = s.movement.vz = s.movement.ax = s.movement.az = 0;
}

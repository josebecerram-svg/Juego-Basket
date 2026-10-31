import { config as c } from "./config.js";
import { inPaint, nearestHoop } from "./dunk.js";
import { heldPosition, smooth } from "./pose.js";
import { angleDelta } from "./movement.js";
const lerp = (a, b, t) => a + (b - a) * t;

export function automaticDunk(s) {
  const h = nearestHoop(s.player),
    speed = Math.hypot(s.movement.vx, s.movement.vz);
  if (
    !s.hasBall ||
    !["ready", "charging"].includes(s.phase) ||
    !s.motion.takeoff?.running ||
    !inPaint(s.player, h)
  )
    return false;
  // Follow a bounded path from anywhere in the paint. The torso stops in front
  // of the hoop, on the court side of the backboard; only the hand reaches it.
  const sign = h.z > 0 ? 1 : -1,
    yaw = sign > 0 ? 0 : Math.PI;
  const power =
    s.phase === "charging"
      ? s.power
      : Math.max(0, Math.min(1, (speed - 2.8) / 3.5));
  const from = heldPosition(s);
  s.dunk = {
    active: true,
    automatic: true,
    age: 0,
    hoop: { ...h },
    start: { ...s.player },
    startYaw: s.bodyYaw ?? s.aim.yaw,
    yaw,
    from,
    hand: { ...from },
    power,
    peak: 1.05 + power * 0.18,
    approach: Math.max(0.7, Math.hypot(s.player.x - h.x, s.player.z - h.z) / 5),
    end: { x: h.x - 0.16 * Math.cos(yaw), z: h.z - sign * 0.63 },
    ballReleased: false,
  };
  const d = s.dunk,
    dx = d.end.x - d.start.x,
    dz = d.end.z - d.start.z;
  const lengthSquared = dx * dx + dz * dz;
  d.entrySpeed = speed;
  d.tangent =
    lengthSquared > 0.001
      ? Math.max(
          0,
          Math.min(
            2.5,
            ((s.movement.vx * dx + s.movement.vz * dz) * d.approach) /
              lengthSquared,
          ),
        )
      : 0;
  s.phase = "autoDunk";
  s.time = 0;
  s.power = power;
  s.notify("Clavada automática · impulso " + Math.round(power * 100) + " %");
  return true;
}
export function stepAutomaticDunk(s, dt) {
  const d = s.dunk,
    h = d.hoop;
  d.age += dt;
  const progress = Math.min(1, d.age / d.approach),
    u =
      -2 * progress ** 3 +
      3 * progress ** 2 +
      (progress ** 3 - 2 * progress ** 2 + progress) * d.tangent;
  if (!d.ballReleased) {
    const previous = { x: s.player.x, z: s.player.z };
    s.player.x = lerp(d.start.x, d.end.x, u);
    s.player.z = lerp(d.start.z, d.end.z, u);
    s.movement.distance += Math.hypot(
      s.player.x - previous.x,
      s.player.z - previous.z,
    );
    // Grounded gathering step, then one rise to the contact point.
    const lift = smooth((progress - 0.16) / 0.84);
    s.player.y = lerp(d.start.y ?? 0, d.peak, lift);
    s.bodyYaw =
      d.startYaw + angleDelta(d.startYaw, d.yaw) * smooth(progress / 0.65);
    d.hand = {
      x: lerp(d.from.x ?? 0, 0.16, lift),
      y: lerp(d.from.y, h.y + 0.22 - s.player.y, lift),
      z: lerp(d.from.z, 0.63, lift),
    };
    Object.assign(s.ball, s.pointFor("player", d.hand));
    s.motion.jumpStage = progress < 0.16 ? "prepare" : "air";
    s.motion.jumpTime = d.age;
    s.motion.airTime = Math.max(0, d.age - d.approach * 0.16);
    if (progress === 1) {
      // Release at the same hand anchor on every attempt. Force changes the
      // outgoing velocity, never whether the animation reaches the basket.
      d.ballReleased = true;
      d.landingTime = 0;
      d.releaseHand = { ...d.hand };
      const error =
        d.power < 0.45
          ? (d.power - 0.45) * 18
          : d.power > 0.85
            ? (d.power - 0.85) * 30
            : 0;
      s.ball.vx = error * Math.cos(d.yaw);
      s.ball.vz = 0;
      s.ball.vy = -2.5 - 2 * d.power;
      s.launch = {
        kind: "dunk",
        power: d.power,
        yaw: d.yaw,
        angle: c.angle,
        hoop: { ...h },
        origin: { ...s.ball },
      };
      s.stats.attempts++;
      s.scored = false;
      s.grounded = false;
      s.contacts = new Set();
      s.phase = "flight";
      s.possession = "shooting";
      s.time = 0;
    }
  } else {
    d.landingTime += dt;
    const t = d.landingTime;
    s.player.y = Math.max(0, d.peak - 0.5 * c.gravity * t * t);
    s.motion.vy = -c.gravity * t;
    s.motion.airTime += dt;
    const recover = smooth(t / 0.65);
    d.hand = {
      x: lerp(0.16, 0.24, recover),
      y: lerp(h.y + 0.22 - s.player.y, 1.22, recover),
      z: lerp(0.63, 0.18, recover),
    };
    if (!s.player.y) {
      s.motion.jumpStage = "ground";
      s.motion.vy = 0;
      s.motion.landing = Math.max(
        0,
        1 - (t - Math.sqrt((2 * d.peak) / c.gravity)) * 4,
      );
      if (!s.motion.landing) d.active = false;
    }
  }
  s.motion.dribble = 0;
  s.motion.guard = 0;
  s.aim.yaw = s.bodyYaw;
  s.movement.bodyYaw = s.bodyYaw;
  s.movement.vx = s.movement.vz = s.movement.ax = s.movement.az = 0;
}

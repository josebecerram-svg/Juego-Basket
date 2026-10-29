import { config as c } from "./config.js";
export const angleDelta = (from, to) =>
  Math.atan2(Math.sin(to - from), Math.cos(to - from));
export function turnTowards(from, to, maxStep) {
  return from + Math.max(-maxStep, Math.min(maxStep, angleDelta(from, to)));
}
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const smooth = (t) => {
  t = clamp(t, 0, 1);
  return t * t * (3 - 2 * t);
};
function turn(angle, velocity, target, rate, dt) {
  const delta = angleDelta(angle, target),
    desired = clamp(delta * 10, -rate, rate),
    v =
      velocity +
      clamp(
        desired - velocity,
        -c.movement.turnAcceleration * dt,
        c.movement.turnAcceleration * dt,
      );
  if (Math.abs(v * dt) > Math.abs(delta) && v * delta > 0)
    return [angle + delta, 0];
  return [angle + v * dt, v];
}
export class Movement {
  constructor(player) {
    this.player = player;
    this.keys = new Set();
    this.vx = 0;
    this.vz = 0;
    this.ax = 0;
    this.az = 0;
    this.distance = 0;
    this.yaw = 0;
    this.viewYaw = 0;
    this.bodyYaw = 0;
    this.viewTurnVelocity = 0;
    this.bodyTurnVelocity = 0;
    this.forward = 0;
    this.lateral = 0;
    this.intentTime = 0;
    this.state = "idle";
    this.gait = { idle: 1, walk: 0, trot: 0, run: 0, strafe: 0, back: 0 };
  }
  clear() {
    this.keys.clear();
    this.vx = this.vz = this.ax = this.az = 0;
    this.targetVelocity = null;
    this.intentTime = 0;
  }
  step(dt, phase) {
    [this.viewYaw, this.viewTurnVelocity] = turn(
      this.viewYaw,
      this.viewTurnVelocity,
      this.yaw,
      c.movement.turnSpeed,
      dt,
    );
    let x =
        Number(this.keys.has(c.controls.left)) -
        Number(this.keys.has(c.controls.right)),
      z =
        Number(this.keys.has(c.controls.forward)) -
        Number(this.keys.has(c.controls.backward));
    const input = Math.hypot(x, z);
    this.intentTime = input ? this.intentTime + dt : 0;
    const lx = x / (input || 1),
      lz = z / (input || 1);
    const directional = lz < -0.2 ? 0.8 : Math.abs(lx) > 0.7 ? 0.9 : 1;
    const pace =
      (1.85 + (c.movement.speed - 1.85) * smooth(this.intentTime / 0.5)) *
      directional;
    x = (lx * Math.cos(this.viewYaw) + lz * Math.sin(this.viewYaw)) * pace;
    z = (lz * Math.cos(this.viewYaw) - lx * Math.sin(this.viewYaw)) * pace;
    if (this.targetVelocity) {
      x = this.targetVelocity.x;
      z = this.targetVelocity.z;
    }
    const preparing = phase === "windup" || phase === "passWindup";
    if (preparing) x = z = 0;
    const braking = x * this.vx + z * this.vz < 0 || Math.hypot(x, z) < 0.01,
      limit = braking ? c.movement.deceleration : c.movement.acceleration;
    const dx = x - this.vx,
      dz = z - this.vz,
      d = Math.hypot(dx, dz),
      gain = Math.min(12, limit / Math.max(0.001, d));
    const targetAx = dx * gain,
      targetAz = dz * gain,
      ad = Math.hypot(targetAx - this.ax, targetAz - this.az),
      f = Math.min(1, (c.movement.jerk * dt) / Math.max(0.001, ad));
    this.ax += (targetAx - this.ax) * f;
    this.az += (targetAz - this.az) * f;
    const nextX = this.vx + this.ax * dt,
      nextZ = this.vz + this.az * dt;
    if (dx * (x - nextX) + dz * (z - nextZ) < 0) {
      this.vx = x;
      this.vz = z;
      this.ax = this.az = 0;
    } else {
      this.vx = nextX;
      this.vz = nextZ;
    }
    if (
      !input &&
      !this.targetVelocity &&
      Math.hypot(this.vx, this.vz) < 0.003
    ) {
      this.vx = this.vz = this.ax = this.az = 0;
    }
    const old = { ...this.player },
      m = c.movement.margin;
    this.player.x = clamp(
      this.player.x + this.vx * dt,
      -c.court.halfWidth + m,
      c.court.halfWidth - m,
    );
    this.player.z = clamp(
      this.player.z + this.vz * dt,
      c.court.minZ + m,
      c.court.maxZ - m,
    );
    this.vx = (this.player.x - old.x) / dt;
    this.vz = (this.player.z - old.z) / dt;
    const speed = Math.hypot(this.vx, this.vz);
    this.distance += speed * dt;
    const forward =
        this.vx * Math.sin(this.viewYaw) + this.vz * Math.cos(this.viewYaw),
      side =
        this.vx * Math.cos(this.viewYaw) - this.vz * Math.sin(this.viewYaw);
    const offset =
      clamp(Math.atan2(side, Math.max(0.5, Math.abs(forward))), -0.5, 0.5) *
      Math.min(1, speed) *
      0.65;
    [this.bodyYaw, this.bodyTurnVelocity] = turn(
      this.bodyYaw,
      this.bodyTurnVelocity,
      (this.facingTarget ?? this.yaw) +
        (preparing || this.facingTarget !== undefined ? 0 : offset),
      c.movement.bodyTurnSpeed,
      dt,
    );
    this.forward =
      this.vx * Math.sin(this.bodyYaw) + this.vz * Math.cos(this.bodyYaw);
    this.lateral =
      this.vx * Math.cos(this.bodyYaw) - this.vz * Math.sin(this.bodyYaw);
    this.state =
      speed < 0.05
        ? "idle"
        : Math.abs(this.lateral) > Math.abs(this.forward)
          ? this.lateral > 0
            ? "left"
            : "right"
          : this.forward < 0
            ? "backward"
            : "forward";
    const moving = smooth(speed / 0.3),
      run = smooth((speed - 2.3) / 1.1),
      trot = smooth((speed - 1.1) / 1.3) * (1 - run),
      walk = 1 - run - trot;
    const desired = {
      idle: 1 - moving,
      walk: walk * moving,
      trot: trot * moving,
      run: run * moving,
      strafe: Math.abs(this.lateral) / Math.max(0.01, speed),
      back: clamp(-this.forward / Math.max(0.01, speed), 0, 1),
    };
    for (const key in this.gait)
      this.gait[key] +=
        (desired[key] - this.gait[key]) * (1 - Math.exp(-dt / 0.12));
  }
}

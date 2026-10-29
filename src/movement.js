import { config as c } from "./config.js";
export const angleDelta = (from, to) =>
  Math.atan2(Math.sin(to - from), Math.cos(to - from));
export function turnTowards(from, to, maxStep) {
  return from + Math.max(-maxStep, Math.min(maxStep, angleDelta(from, to)));
}
export class Movement {
  constructor(player) {
    this.player = player;
    this.keys = new Set();
    this.vx = 0;
    this.vz = 0;
    this.distance = 0;
    this.yaw = 0;
    this.viewYaw = 0;
    this.bodyYaw = 0;
    this.forward = 0;
    this.lateral = 0;
    this.state = "idle";
  }
  clear() {
    this.keys.clear();
    this.vx = this.vz = 0;
    this.targetVelocity = null;
  }
  step(dt, phase) {
    this.viewYaw = turnTowards(
      this.viewYaw,
      this.yaw,
      c.movement.turnSpeed * dt,
    );
    let x =
        Number(this.keys.has(c.controls.left)) -
        Number(this.keys.has(c.controls.right)),
      z =
        Number(this.keys.has(c.controls.forward)) -
        Number(this.keys.has(c.controls.backward));
    const length = Math.hypot(x, z) || 1,
      lx = x / length,
      lz = z / length;
    x =
      (lx * Math.cos(this.viewYaw) + lz * Math.sin(this.viewYaw)) *
      c.movement.speed;
    z =
      (lz * Math.cos(this.viewYaw) - lx * Math.sin(this.viewYaw)) *
      c.movement.speed;
    if (this.targetVelocity) {
      x = this.targetVelocity.x;
      z = this.targetVelocity.z;
    }
    const frozen = phase === "windup";
    if (frozen) {
      x = z = 0;
    }
    const braking = x * this.vx + z * this.vz < 0 || Math.hypot(x, z) < 0.01;
    const maxChange =
      (braking ? c.movement.deceleration : c.movement.acceleration) * dt;
    const dx = x - this.vx,
      dz = z - this.vz,
      d = Math.hypot(dx, dz),
      factor = d > 0 ? Math.min(1, maxChange / d) : 0;
    this.vx += dx * factor;
    this.vz += dz * factor;
    const old = { ...this.player },
      m = c.movement.margin;
    this.player.x = Math.max(
      -c.court.halfWidth + m,
      Math.min(c.court.halfWidth - m, this.player.x + this.vx * dt),
    );
    this.player.z = Math.max(
      c.court.minZ + m,
      Math.min(c.court.maxZ - m, this.player.z + this.vz * dt),
    );
    this.vx = (this.player.x - old.x) / dt;
    this.vz = (this.player.z - old.z) / dt;
    const speed = Math.hypot(this.vx, this.vz);
    this.distance += speed * dt;
    const localForward =
        this.vx * Math.sin(this.viewYaw) + this.vz * Math.cos(this.viewYaw),
      localSide =
        this.vx * Math.cos(this.viewYaw) - this.vz * Math.sin(this.viewYaw);
    const offset =
      Math.max(
        -0.5,
        Math.min(
          0.5,
          Math.atan2(localSide, Math.max(0.5, Math.abs(localForward))),
        ),
      ) *
      Math.min(1, speed) *
      0.65;
    this.bodyYaw = turnTowards(
      this.bodyYaw,
      (this.facingTarget ?? this.yaw) +
        (frozen || this.facingTarget !== undefined ? 0 : offset),
      c.movement.bodyTurnSpeed * dt,
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
  }
}

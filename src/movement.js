import { config as c } from "./config.js";
export class Movement {
  constructor(player) {
    this.player = player;
    this.keys = new Set();
    this.vx = 0;
    this.vz = 0;
    this.distance = 0;
    this.yaw = 0;
  }
  clear() {
    this.keys.clear();
    this.vx = this.vz = 0;
  }
  step(dt, phase) {
    if (phase === "windup") {
      this.vx = this.vz = 0;
      return;
    }
    // Move relative to the player facing direction, which the camera follows.
    let x =
      Number(this.keys.has(c.controls.left)) -
      Number(this.keys.has(c.controls.right));
    let z =
      Number(this.keys.has(c.controls.forward)) -
      Number(this.keys.has(c.controls.backward));
    const localX = x,
      localZ = z;
    x = localX * Math.cos(this.yaw) + localZ * Math.sin(this.yaw);
    z = localZ * Math.cos(this.yaw) - localX * Math.sin(this.yaw);
    const length = Math.hypot(x, z) || 1,
      blend = 1 - Math.exp(-c.movement.acceleration * dt);
    this.vx += ((x / length) * c.movement.speed - this.vx) * blend;
    this.vz += ((z / length) * c.movement.speed - this.vz) * blend;
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
    this.distance += Math.hypot(this.player.x - old.x, this.player.z - old.z);
  }
}

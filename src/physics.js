import { config as c } from "./config.js";
export function velocity(power, yaw = 0, angle = c.angle) {
  const speed = c.minForce + (c.maxForce - c.minForce) * power,
    h = speed * Math.cos(angle);
  return {
    vx: Math.sin(yaw) * h,
    vy: speed * Math.sin(angle),
    vz: Math.cos(yaw) * h,
  };
}
export class Shot {
  constructor() {
    this.aim = { yaw: 0, angle: c.angle };
    this.reset();
  }
  reset() {
    this.phase = "ready";
    this.ball = { ...c.initial, vx: 0, vy: 0, vz: 0 };
    this.time = 0;
    this.power = 0;
    this.scored = false;
    this.result = null;
    this.contacts = new Set();
    this.grounded = false;
  }
  charge() {
    if (this.phase !== "ready") return false;
    this.phase = "charging";
    this.time = 0;
    return true;
  }
  release() {
    if (this.phase !== "charging") return false;
    this.launch = { power: this.power, ...this.aim };
    this.phase = "windup";
    this.time = 0;
    return true;
  }
  cancel() {
    if (this.phase === "charging") this.reset();
  }
  step(dt) {
    this.time += dt;
    if (this.phase === "charging") {
      this.power = Math.min(1, this.time / c.chargeSeconds);
      return;
    }
    if (this.phase === "windup") {
      if (this.time >= c.windup) {
        this.phase = "flight";
        this.time = 0;
        this.ball = {
          ...c.initial,
          ...velocity(this.launch.power, this.launch.yaw, this.launch.angle),
        };
      }
      return;
    }
    if (this.phase === "result") {
      if (this.time >= c.resetDelay) this.reset();
      return;
    }
    if (this.phase !== "flight") return;
    const b = this.ball,
      p = { ...b },
      r = c.ballRadius,
      h = c.hoop;
    b.vy -= c.gravity * dt;
    for (const a of ["x", "y", "z"]) b[a] += b["v" + a] * dt;
    const face = c.board.z + (b.vz > 0 ? -r : r);
    if (
      Math.abs(b.x) < c.board.halfWidth + r &&
      b.y + r > c.board.bottom &&
      b.y - r < c.board.top &&
      (p.z - face) * (b.z - face) <= 0 &&
      b.vz !== 0
    ) {
      b.z = face;
      b.vz *= -c.restitution;
      this.contacts.add("board");
    }
    // Closest point on the horizontal ring: a sphere against a torus in 3D.
    const dx = b.x - h.x,
      dz = b.z - h.z,
      rho = Math.hypot(dx, dz);
    if (rho > 0) {
      const qx = h.x + (dx / rho) * h.radius,
        qz = h.z + (dz / rho) * h.radius,
        nx = b.x - qx,
        ny = b.y - h.y,
        nz = b.z - qz,
        d = Math.hypot(nx, ny, nz),
        rr = r + h.tube;
      if (d > 0 && d < rr) {
        const n = { x: nx / d, y: ny / d, z: nz / d },
          dot = b.vx * n.x + b.vy * n.y + b.vz * n.z;
        for (const a of ["x", "y", "z"]) {
          b[a] += n[a] * (rr - d);
          if (dot < 0) b["v" + a] -= (1 + c.restitution) * dot * n[a];
        }
        this.contacts.add("rim");
      }
    }
    if (!this.scored && !this.grounded && p.y > h.y && b.y <= h.y && b.vy < 0) {
      const t = (p.y - h.y) / (p.y - b.y);
      if (
        Math.hypot(p.x + (b.x - p.x) * t - h.x, p.z + (b.z - p.z) * t - h.z) <
        h.radius - r
      ) {
        this.scored = true;
      }
    }
    if (b.y < r) {
      b.y = r;
      b.vy = Math.abs(b.vy) * 0.52;
      b.vx *= 0.72;
      b.vz *= 0.72;
      this.grounded = true;
      this.contacts.add("floor");
    }
    const slow = this.grounded && Math.hypot(b.vx, b.vy, b.vz) < 0.4;
    if (slow || this.time > c.maxFlight) {
      this.phase = "result";
      this.result = this.scored ? "¡Canasta!" : "Fallaste";
      this.time = 0;
    }
  }
}

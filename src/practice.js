import { Shot } from "./physics.js";
import { Movement } from "./movement.js";
import { config as c } from "./config.js";
const mix = (a, b, t) => a + (b - a) * t;
export class Practice extends Shot {
  constructor() {
    super();
    this.companion = { ...c.companion };
    this.companionMovement = new Movement(this.companion);
    this.companionMovement.bodyYaw =
      this.companionMovement.viewYaw =
      this.companionMovement.yaw =
        Math.atan2(
          this.player.x - this.companion.x,
          this.player.z - this.companion.z,
        );
    this.notice = "";
    this.noticeTime = 0;
    this.supporting = false;
  }
  reset() {
    this.possession = "player";
    this.pass = null;
    super.reset();
  }
  get hasBall() {
    return this.possession === "player";
  }
  get passPose() {
    return this.handFor("player");
  }
  handFor(person) {
    const sender = this.pass?.sender,
      receiver = this.pass?.receiver;
    const empty = { x: 0, y: 1.15, z: 0.12, spread: 0.16 };
    if (this.phase === "passWindup" && sender === person) {
      const t = Math.min(1, this.time / c.passing.preparation);
      return {
        x: 0.24 * (1 - t),
        y: 1.5 - 0.05 * t,
        z: 0.42 - 0.12 * Math.sin(t * Math.PI),
      };
    }
    if (this.phase === "passing") {
      if (sender === person) {
        const t = Math.min(1, this.time / 0.4);
        return {
          x: 0,
          y: 1.45 - 0.3 * t,
          z: 0.56 - 0.4 * t,
          spread: 0.04 + 0.12 * t,
        };
      }
      if (receiver === person) {
        const t = Math.min(1, this.time / this.pass.duration);
        return { x: 0, y: 1.45, z: 0.3 + 0.12 * t, spread: 0 };
      }
    }
    if (
      (this.phase === "receive" && person === "player") ||
      (this.phase === "companionHold" && person === "companion")
    ) {
      const t = Math.min(1, this.time / c.passing.catchTime);
      return { x: 0.24 * t, y: 1.45 + 0.05 * t, z: 0.42 };
    }
    if (person === "companion") return empty;
    if (
      this.possession !== "player" &&
      !["windup", "flight", "result"].includes(this.phase)
    )
      return empty;
    return null;
  }
  pointFor(person, hand) {
    const p = person === "player" ? this.player : this.companion,
      yaw =
        person === "player" ? this.aimYaw() : this.companionMovement.bodyYaw;
    return {
      x: p.x + Math.sin(yaw) * hand.z + Math.cos(yaw) * (hand.x ?? 0),
      y: hand.y,
      z: p.z + Math.cos(yaw) * hand.z - Math.sin(yaw) * (hand.x ?? 0),
    };
  }
  origin() {
    const hand = this.companion && this.handFor("player");
    return hand && this.possession === "player"
      ? this.pointFor("player", hand)
      : super.origin();
  }
  notify(text) {
    this.notice = text;
    this.noticeTime = 1.8;
    return false;
  }
  charge() {
    if (this.possession !== "player")
      return this.notify("Tiro no disponible: recupera el balón con E.");
    return super.charge();
  }
  release() {
    const ok = super.release();
    if (ok) this.possession = "shooting";
    return ok;
  }
  requestPass() {
    const available =
      (this.phase === "ready" && this.possession === "player") ||
      (this.phase === "companionHold" && this.time >= c.passing.catchTime);
    if (!available)
      return this.notify(
        this.phase === "charging"
          ? "Pase no disponible: termina el tiro cargado."
          : "Pase no disponible: espera a que termine la recepción o el vuelo.",
      );
    if (
      Math.hypot(
        this.companion.x - this.player.x,
        this.companion.z - this.player.z,
      ) > c.passing.maxDistance
    )
      return this.notify("Acércate al compañero para pasar (máx. 12 m).");
    const sender = this.possession,
      receiver = sender === "player" ? "companion" : "player";
    this.pass = { sender, receiver };
    this.phase = "passWindup";
    this.time = 0;
    this.power = 0;
    this.notice = "";
    this.noticeTime = 0;
    return true;
  }
  updateCompanion(dt) {
    const m = this.companionMovement,
      d = Math.hypot(
        this.player.x - this.companion.x,
        this.player.z - this.companion.z,
      );
    const target = {
      x: Math.max(-6.6, Math.min(6.6, this.player.x - 3.2)),
      z: Math.max(
        c.court.minZ + 0.8,
        Math.min(c.court.maxZ - 0.8, this.player.z + 1.4),
      ),
    };
    if (d > 6 || d < 1.65) this.supporting = true;
    const delta = {
        x: target.x - this.companion.x,
        z: target.z - this.companion.z,
      },
      length = Math.hypot(delta.x, delta.z);
    if (length < 0.2) this.supporting = false;
    const moving =
      this.supporting &&
      !["passWindup", "passing", "receive"].includes(this.phase);
    const speed = moving ? Math.min(2.8, length * 2) : 0;
    m.targetVelocity = {
      x: length > 0 ? (delta.x / length) * speed : 0,
      z: length > 0 ? (delta.z / length) * speed : 0,
    };
    m.yaw = Math.atan2(
      this.player.x - this.companion.x,
      this.player.z - this.companion.z,
    );
    m.step(dt, "ready");
  }
  companionState() {
    return {
      player: this.companion,
      aim: { yaw: this.companionMovement.bodyYaw, angle: c.angle },
      bodyYaw: this.companionMovement.bodyYaw,
      movement: this.companionMovement,
      phase: "ready",
      time: this.time,
      power: 0,
      hasBall: this.possession === "companion",
      passPose: this.handFor("companion"),
    };
  }
  step(dt) {
    if (this.noticeTime > 0) {
      this.noticeTime = Math.max(0, this.noticeTime - dt);
      if (!this.noticeTime) this.notice = "";
    }
    this.updateCompanion(dt);
    if (this.phase === "passWindup") {
      this.time += dt;
      const hand = this.handFor(this.pass.sender);
      Object.assign(this.ball, this.pointFor(this.pass.sender, hand));
      if (this.time >= c.passing.preparation) {
        const target = this.pointFor(this.pass.receiver, {
            x: 0,
            y: 1.45,
            z: 0.42,
          }),
          start = { ...this.ball },
          d = Math.hypot(target.x - start.x, target.z - start.z);
        Object.assign(this.pass, {
          start,
          duration: Math.max(0.45, Math.min(1.2, d / c.passing.speed)),
          arc: 0.18 + d * 0.035,
        });
        this.phase = "passing";
        this.possession = "air";
        this.time = 0;
      }
      return;
    }
    if (this.phase === "passing") {
      this.time += dt;
      const t = Math.min(1, this.time / this.pass.duration),
        end = this.pointFor(this.pass.receiver, { x: 0, y: 1.45, z: 0.42 });
      for (const a of ["x", "y", "z"])
        this.ball[a] = mix(this.pass.start[a], end[a], t);
      this.ball.y += 4 * this.pass.arc * t * (1 - t);
      if (t === 1) {
        this.possession = this.pass.receiver;
        this.phase = this.possession === "player" ? "receive" : "companionHold";
        this.time = 0;
        Object.assign(
          this.ball,
          this.pointFor(this.possession, this.handFor(this.possession)),
        );
      }
      return;
    }
    if (["companionHold", "receive"].includes(this.phase)) {
      this.time += dt;
      Object.assign(
        this.ball,
        this.pointFor(this.possession, this.handFor(this.possession)),
      );
      if (this.phase === "receive" && this.time >= c.passing.catchTime) {
        this.phase = "ready";
        this.time = 0;
        this.pass = null;
        this.hold();
      }
      return;
    }
    super.step(dt);
  }
}

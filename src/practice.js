import { Shot } from "./physics.js";
import { Movement, angleDelta } from "./movement.js";
import { emptyHands, passFollow, smooth } from "./pose.js";
import { config as c } from "./config.js";
const mix = (a, b, t) => a + (b - a) * t;
export class Practice extends Shot {
  constructor() {
    super();
    Object.assign(this.player, {
      id: "rivera",
      name: "RIVERA",
      fullName: "Adrián Rivera",
      number: "07",
    });
    this.companion = { ...c.companion, id: "silva", fullName: "Mateo Silva" };
    this.actors = [this.player, this.companion];
    this.inputKeys = new Set();
    this.movement = new Movement(this.player);
    this.movement.keys = this.inputKeys;
    this.controlChanges = 0;
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
    for (const actor of this.actors ?? []) actor.gesture = null;
    super.reset();
  }
  get hasBall() {
    return this.possession === "player";
  }
  get action() {
    return this.player.gesture;
  }
  get passPose() {
    return this.handFor("player");
  }
  handFor(person) {
    const sender = this.pass?.sender,
      receiver = this.pass?.receiver;
    const actor = person === "player" ? this.player : this.companion;
    const empty = emptyHands();
    if (actor?.gesture?.kind === "passFollow")
      return passFollow(actor.gesture.time);
    if (this.phase === "passWindup" && receiver === person) {
      const t = smooth(this.time / c.passing.preparation);
      return {
        x: 0,
        y: mix(1.15, 1.45, t),
        z: mix(0.12, 0.3, t),
        spread: 0.16 * (1 - t),
      };
    }
    if (this.phase === "passWindup" && sender === person) {
      const t = smooth(
        (this.pass.motionTime ?? this.time) / c.passing.preparation,
      );
      return {
        x: 0.24 * (1 - t),
        y: 1.5 - 0.05 * t,
        z:
          0.42 -
          0.12 * Math.sin(t * Math.PI) +
          0.14 * smooth((t - 0.45) / 0.55),
      };
    }
    if (this.phase === "passing") {
      if (receiver === person) {
        const t = smooth(this.time / this.pass.duration);
        return { x: 0, y: 1.45, z: 0.3 + 0.12 * t, spread: 0 };
      }
    }
    if (this.phase === "receive" && person === "player") {
      const v = Math.min(1, this.time / c.passing.catchTime),
        t = v * v * (3 - 2 * v);
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
      return this.notify("Tiro no disponible: espera la recepción.");
    return super.charge();
  }
  release() {
    const ok = super.release();
    if (ok) this.possession = "shooting";
    return ok;
  }
  requestPass() {
    const available = this.phase === "ready" && this.possession === "player";
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
    const sender = "player",
      receiver = "companion";
    this.pass = { sender, receiver, motionTime: 0 };
    this.player.gesture = { kind: "passPrepare", time: 0 };
    this.companion.gesture = { kind: "catchReady", time: 0 };
    this.phase = "passWindup";
    this.time = 0;
    this.power = 0;
    this.notice = "";
    this.noticeTime = 0;
    return true;
  }
  completeReception() {
    // Actor objects and their animation controllers keep their identities.
    const oldPlayer = this.player,
      oldMovement = this.movement;
    oldMovement.keys = new Set();
    oldMovement.facingTarget = undefined;
    oldMovement.targetVelocity = { x: 0, z: 0 };
    this.player = this.companion;
    this.companion = oldPlayer;
    this.movement = this.companionMovement;
    this.companionMovement = oldMovement;
    this.movement.keys = this.inputKeys;
    this.movement.targetVelocity = null;
    this.movement.facingTarget = undefined;
    this.bodyYaw = this.movement.bodyYaw;
    this.aim = { yaw: this.bodyYaw, angle: c.angle };
    this.movement.yaw = this.bodyYaw;
    this.supporting = false;
    this.controlChanges++;
    this.player.gesture = { kind: "catch", time: 0 };
    this.possession = "player";
    this.phase = "receive";
    this.time = 0;
    this.power = 0;
    this.pass.sender = "companion";
    this.pass.receiver = "player";
    this.notify(
      "Ahora controlas a " + this.player.name + " · " + this.player.number,
    );
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
  updateMovement(dt) {
    const m = this.movement;
    m.yaw = this.phase === "windup" ? this.launch.yaw : this.aim.yaw;
    m.facingTarget =
      this.pass && ["passWindup", "passing", "receive"].includes(this.phase)
        ? Math.atan2(
            this.companion.x - this.player.x,
            this.companion.z - this.player.z,
          )
        : undefined;
    m.step(dt, this.phase);
    this.bodyYaw = m.bodyYaw;
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
      action: this.companion.gesture,
    };
  }
  step(dt) {
    for (const actor of this.actors)
      if (actor.gesture) {
        actor.gesture.time += dt;
        if (
          (actor.gesture.kind === "passFollow" && actor.gesture.time > 0.7) ||
          (actor.gesture.kind === "catch" &&
            actor.gesture.time >= c.passing.catchTime)
        )
          actor.gesture = null;
      }
    if (this.noticeTime > 0) {
      this.noticeTime = Math.max(0, this.noticeTime - dt);
      if (!this.noticeTime) this.notice = "";
    }
    this.updateCompanion(dt);
    if (this.phase === "passWindup") {
      this.time += dt;
      const targetYaw = Math.atan2(
        this.companion.x - this.player.x,
        this.companion.z - this.player.z,
      );
      const delta =
        this.bodyYaw === undefined
          ? 0
          : Math.abs(angleDelta(this.bodyYaw, targetYaw));
      if (delta < 0.4) this.pass.motionTime += dt;
      this.player.gesture.time = this.pass.motionTime;
      const hand = this.handFor(this.pass.sender);
      Object.assign(this.ball, this.pointFor(this.pass.sender, hand));
      if (this.pass.motionTime >= c.passing.preparation && delta < 0.12) {
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
          target,
        });
        this.player.gesture = { kind: "passFollow", time: 0 };
        this.phase = "passing";
        this.possession = "air";
        this.time = 0;
      }
      return;
    }
    if (this.phase === "passing") {
      this.time += dt;
      const t = Math.min(1, this.time / this.pass.duration),
        receiver = this.pointFor("companion", { x: 0, y: 1.45, z: 0.42 });
      const correction = {
        x: receiver.x - this.pass.target.x,
        z: receiver.z - this.pass.target.z,
      };
      const len = Math.hypot(correction.x, correction.z),
        assist = Math.min(1, c.passing.catchAssist / Math.max(0.001, len));
      const end = {
        x: this.pass.target.x + correction.x * assist,
        y: receiver.y,
        z: this.pass.target.z + correction.z * assist,
      };
      const previous = { ...this.ball };
      for (const a of ["x", "y", "z"])
        this.ball[a] = mix(this.pass.start[a], end[a], t);
      this.ball.y += 4 * this.pass.arc * t * (1 - t);
      if (t === 1) {
        const caught =
          Math.hypot(
            this.ball.x - receiver.x,
            this.ball.y - receiver.y,
            this.ball.z - receiver.z,
          ) <= c.passing.catchRadius;
        if (caught) {
          this.completeReception();
          Object.assign(
            this.ball,
            this.pointFor("player", this.handFor("player")),
          );
        } else {
          for (const a of ["x", "y", "z"])
            this.ball["v" + a] = (this.ball[a] - previous[a]) / dt;
          this.companion.gesture = null;
          this.phase = "passMiss";
          this.time = 0;
          this.possession = "air";
          this.notify("Pase no recibido · recuperando el balón");
        }
      }
      return;
    }
    if (this.phase === "passMiss") {
      this.time += dt;
      this.ball.vy -= c.gravity * dt;
      for (const a of ["x", "y", "z"]) this.ball[a] += this.ball["v" + a] * dt;
      if (this.ball.y < c.ballRadius) {
        this.ball.y = c.ballRadius;
        this.ball.vy = Math.abs(this.ball.vy) * 0.4;
        this.ball.vx *= 0.95;
        this.ball.vz *= 0.95;
      }
      if (this.time > 1.6) this.reset();
      return;
    }
    if (this.phase === "receive") {
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

import { Practice } from "./practice.js";
import { Shot, velocity } from "./physics.js";
import { Movement, angleDelta } from "./movement.js";
import { createMotion, stepMotion, jump } from "./actions.js";
import { automaticDunk, stepAutomaticDunk } from "./automatic-dunk.js";
import { nearestHoop } from "./dunk.js";
import { config as c } from "./config.js";
import { heldPosition, readyPosition, smooth } from "./pose.js";
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export class Match extends Practice {
  constructor({ random = Math.random } = {}) {
    super();
    this.random = random;
    this.paused = false;
    this.practiceMode = false;
    this.player.team = this.companion.team = "home";
    this.defenders = [
      {
        id: "vega",
        name: "VEGA",
        fullName: "Lucas Vega",
        number: "23",
        x: -1.4,
        z: 2,
      },
      {
        id: "rios",
        name: "RÍOS",
        fullName: "Nicolás Ríos",
        number: "31",
        x: 2.3,
        z: 1,
      },
    ];
    for (const a of this.defenders) {
      a.team = "away";
      a.y = 0;
      a.motion = createMotion();
      a.controller = new Movement(a);
      a.defense = { cooldown: 0, reaction: 0.4, raised: 0 };
    }
    this.actors.push(...this.defenders);
    this.player.defense = { cooldown: 0, raised: 0 };
    this.companion.defense = { cooldown: 0, raised: 0 };
    this.opponentPoints = 0;
    this.opponentAge = 0;
  }
  get carrier() {
    return this.possession === "player"
      ? this.player
      : this.possession === "companion"
        ? this.companion
        : this.defenders?.find((a) => a.id === this.possession);
  }
  get activeDefenders() {
    return this.practiceMode ? [] : this.defenders;
  }
  togglePause() {
    this.paused = !this.paused;
    this.inputKeys.clear();
    if (this.player.defense) this.player.defense.holding = false;
    if (!this.paused && this.pendingRelease) {
      this.pendingRelease = false;
      this.release();
    }
    return this.paused;
  }
  exitToPractice() {
    this.practiceMode = true;
    this.paused = false;
    this.inputKeys.clear();
    this.dunk = null;
    for (const a of this.actors) {
      a.y = 0;
      a.motion = createMotion();
      a.defense = { cooldown: 0, raised: 0 };
    }
    this.player.x = 0;
    this.player.z = -0.38;
    this.movement.clear();
    this.companionMovement.clear();
    this.reset();
    this.notify("Práctica libre · sin defensores");
  }
  requestJump() {
    if (this.paused || this.phase === "out") return false;
    if (this.dunk?.active) return false;
    const running =
      (this.inputKeys.has(c.controls.sprint) ||
        this.inputKeys.has(c.controls.sprintAlt)) &&
      Math.hypot(this.movement.vx, this.movement.vz) >= c.dunk.minRunSpeed;
    const ok = jump(this.player);
    if (ok) {
      this.motion.takeoff = { running };
      if (automaticDunk(this)) this.shotTeam = "home";
    }
    return ok;
  }
  charge() {
    if (this.paused || this.phase === "out") return false;
    if (this.dunk?.active) return false;
    if (!this.hasBall) {
      this.player.defense.holding = true;
      return this.contest(this.player);
    }
    // Only Space starts an automatic dunk; a click always remains a shot.
    if (["fake", "fakeReturn"].includes(this.phase)) return super.charge();
    this.dunk = null;
    return Shot.prototype.charge.call(this);
  }
  release() {
    if (this.paused) {
      this.pendingRelease = true;
      return false;
    }
    if (this.dunk?.automatic && this.dunk.active) return false;
    if (!this.hasBall) {
      this.player.defense.holding = false;
      this.player.defense.raised = Math.min(this.player.defense.raised, 0.15);
      return false;
    }
    return super.release();
  }
  cancel() {
    if (this.player?.defense) this.player.defense.holding = false;
    if (this.paused || (this.dunk?.automatic && this.dunk.active)) return false;
    return super.cancel();
  }
  requestFake() {
    if (this.paused) return false;
    return super.requestFake();
  }
  tapPass() {
    if (this.paused || this.dunk?.active) return false;
    if (!this.hasBall) return this.steal(this.player);
    return super.tapPass();
  }
  requestPass(type = "direct") {
    if (this.paused || this.dunk?.active) return false;
    if (!this.hasBall) return this.swat(this.player);
    return super.requestPass(type);
  }
  contest(a) {
    if (
      this.paused ||
      this.phase === "out" ||
      a === this.carrier ||
      (a === this.player && this.dunk?.active)
    )
      return false;
    a.defense.raised = 0.7;
    return true;
  }
  facing(a, target) {
    const yaw = a === this.player ? this.bodyYaw : (a.controller?.bodyYaw ?? 0);
    return (
      Math.abs(angleDelta(yaw, Math.atan2(target.x - a.x, target.z - a.z))) <
      0.95
    );
  }
  steal(a) {
    if (this.paused || this.phase === "out" || a.defense.cooldown > 0)
      return false;
    a.defense.cooldown = 0.9;
    a.defense.steal = 0.18;
    if (a === this.player)
      this.notify("Intento de robo · alcance y momento importan");
    return true;
  }
  swat(a) {
    if (this.paused || this.phase === "out" || a.defense.cooldown > 0)
      return false;
    a.defense.cooldown = 0.65;
    a.defense.swat = 0.23;
    if (a === this.player) this.notify("Manotazo · disputa el balón cercano");
    return true;
  }
  loosen(vx = 0, vz = 0, vy = 1) {
    this.possession = "loose";
    this.phase = "loose";
    this.time = 0;
    this.pickup = null;
    this.pass = null;
    this.lastPassTap = null;
    for (const a of this.actors) a.gesture = null;
    Object.assign(this.ball, { vx, vz, vy });
    this.notify("Balón suelto · acércate para recoger");
  }
  defensePose(a) {
    const d = a.defense,
      low =
        a === this.player
          ? this.inputKeys.has(c.controls.protect)
          : a.defending;
    if (this.pickup?.actor === a) {
      const lift = smooth((this.pickup.time - 0.15) / 0.2);
      return { x: 0.24 * lift, y: 0.35 + 1.15 * lift, z: 0.4, spread: 0.04 };
    }
    if (d.steal > 0 || d.swat > 0)
      return { x: d.swat > 0 ? 0.36 : 0.12, y: 1.15, z: 0.65, spread: 0.12 };
    if (d.raised > 0) return { x: 0, y: 2.18, z: 0.38, spread: 0.2 };
    if (low) return { x: 0, y: 1.18, z: 0.3, spread: 0.5 };
    return null;
  }
  get passPose() {
    return !this.hasBall
      ? (this.defensePose(this.player) ?? super.passPose)
      : super.passPose;
  }
  opponentState(a) {
    return {
      player: a,
      aim: { yaw: a.controller.bodyYaw, angle: c.angle },
      bodyYaw: a.controller.bodyYaw,
      movement: a.controller,
      phase:
        this.carrier === a && this.phase === "opponentWindup"
          ? "charging"
          : "ready",
      time: this.time,
      power: 0.6,
      chargeFrom: a.shotFrom,
      hasBall: this.carrier === a,
      motion: a.motion,
      passPose: this.carrier === a ? null : this.defensePose(a),
      gazeTarget: this.ball,
      action: a.gesture,
    };
  }
  companionState() {
    const state = super.companionState();
    if (this.pickup?.actor === this.companion)
      state.passPose = this.defensePose(this.companion);
    return state;
  }
  updateMovement(dt) {
    if (this.paused || this.phase === "out") return;
    if (
      !this.hasBall &&
      this.inputKeys.has(c.controls.protect) &&
      this.carrier
    ) {
      const target = Math.atan2(
        this.carrier.x - this.player.x,
        this.carrier.z - this.player.z,
      );
      this.aim.yaw +=
        angleDelta(this.aim.yaw, target) * (1 - Math.exp(-dt * 9));
    }
    super.updateMovement(dt);
  }
  updateAI(dt) {
    const carrier = this.carrier,
      h =
        carrier?.team === "away" ? c.baskets[1].hoop : nearestHoop(this.player);
    for (const [i, a] of this.activeDefenders.entries()) {
      if (a.gesture) {
        a.gesture.time += dt;
        if (a.gesture.time > 0.7) a.gesture = null;
      }
      const m = a.controller;
      a.defending = carrier?.team !== "away";
      a.defense.reaction -= dt;
      if (a.defense.reaction <= 0) {
        a.defense.reaction = 0.18 + this.random() * 0.28;
        const mark = i === 0 ? this.player : this.companion;
        if (["loose", "flight", "passing"].includes(this.phase))
          a.target = { x: this.ball.x + (i ? 0.5 : 0), z: this.ball.z };
        else if (carrier?.team === "away")
          a.target =
            carrier === a
              ? { x: h.x, z: h.z + 3 }
              : { x: carrier.x + 2, z: carrier.z + 1 };
        else {
          const dx = h.x - mark.x,
            dz = h.z - mark.z,
            len = Math.hypot(dx, dz) || 1;
          a.target = {
            x: mark.x + (dx / len) * 1.5 + (this.random() - 0.5) * 0.65,
            z: mark.z + (dz / len) * 1.5,
          };
        }
        if (
          ["flight", "passing"].includes(this.phase) &&
          distance(a, this.ball) < 2.3 &&
          this.random() > 0.3
        ) {
          this.contest(a);
          if (this.ball.y > 2.4 && a.motion.jumpStage === "ground") {
            a.motion.jumpStage = "prepare";
            a.motion.jumpTime = 0;
            a.motion.airTime = 0;
          }
          if (distance(a, this.ball) < 1.1) this.swat(a);
        }
        if (carrier && carrier.team !== a.team && this.random() > 0.3) {
          if (distance(a, carrier) < 1.1) this.steal(a);
          if (
            ["charging", "windup", "flight", "autoDunk"].includes(this.phase) &&
            distance(a, carrier) < 2.2
          ) {
            this.contest(a);
            if (this.random() > 0.55 && a.motion.jumpStage === "ground") {
              a.motion.jumpStage = "prepare";
              a.motion.jumpTime = 0;
              a.motion.airTime = 0;
            }
          }
          if (distance(a, this.ball) < 1.1 && this.random() > 0.5) this.swat(a);
        }
      }
      const target = a.target ?? a,
        dx = target.x - a.x,
        dz = target.z - a.z,
        len = Math.hypot(dx, dz),
        speed = Math.min(carrier === a ? 3 : 3.6, len * 3);
      m.targetVelocity = {
        x: (dx / (len || 1)) * speed,
        z: (dz / (len || 1)) * speed,
      };
      const look = carrier && carrier !== a ? carrier : this.ball;
      m.yaw = Math.atan2(look.x - a.x, look.z - a.z);
      m.step(dt, "ready");
      stepMotion(a, new Set(), "ready", carrier === a, m, dt);
      a.motion.guard +=
        (Number(a.defending) - a.motion.guard) * (1 - Math.exp(-dt * 12));
    }
  }
  separate() {
    const actors = [this.player, this.companion, ...this.activeDefenders];
    for (let pass = 0; pass < 3; pass++)
      for (let i = 0; i < actors.length; i++)
        for (let j = i + 1; j < actors.length; j++) {
          const a = actors[i],
            b = actors[j];
          let dx = b.x - a.x,
            dz = b.z - a.z,
            len = Math.hypot(dx, dz);
          if (len >= 0.72) continue;
          if (len < 0.001) {
            dx = 1;
            dz = 0;
            len = 1;
          }
          const overlap = 0.72 - distance(a, b),
            fixed = this.dunk?.active && a === this.player;
          a.x -= (dx / len) * overlap * (fixed ? 0 : 0.5);
          a.z -= (dz / len) * overlap * (fixed ? 0 : 0.5);
          b.x += (dx / len) * overlap * (fixed ? 1 : 0.5);
          b.z += (dz / len) * overlap * (fixed ? 1 : 0.5);
        }
    for (const a of actors) {
      a.x = clamp(a.x, -7.15, 7.15);
      a.z = clamp(a.z, c.court.minZ + 0.35, c.court.maxZ - 0.35);
    }
  }
  resolveDefense(dt) {
    if (this.phase === "out") return;
    for (const a of [this.player, this.companion, ...this.activeDefenders]) {
      const d = a.defense;
      if (!d) continue;
      const carrier = this.carrier;
      if (d.holding) d.raised = 0.7;
      if (
        d.steal > 0 &&
        d.steal <= dt &&
        carrier &&
        carrier.team !== a.team &&
        distance(a, carrier) < 1 &&
        Math.abs(this.ball.y - ((a.y ?? 0) + 1.15)) < 0.8 &&
        this.facing(a, carrier)
      ) {
        const exposed =
          (carrier.motion?.guard ?? 0) < 0.45 &&
          (((carrier.motion?.dribblePhase ?? 0) > 0.35 &&
            (carrier.motion?.dribblePhase ?? 0) < 0.7) ||
            this.phase === "windup" ||
            this.phase === "opponentWindup");
        if (exposed && !this.dunk?.active)
          this.loosen((this.ball.x - a.x) * 3, (this.ball.z - a.z) * 3, 0.8);
      }
      if (
        a !== this.carrier &&
        (this.carrier?.team !== a.team || !this.carrier) &&
        (!this.dunk?.active || this.dunk.ballReleased)
      ) {
        const dx = this.ball.x - a.x,
          dz = this.ball.z - a.z,
          y = this.ball.y - (a.y ?? 0);
        const flying = ["flight", "passing", "loose"].includes(this.phase);
        const reachable =
          Math.hypot(dx, dz) < 0.85 && this.facing(a, this.ball);
        if (
          reachable &&
          ((d.swat > 0 && y > 0.05 && y < 1.7) ||
            (flying && d.raised > 0 && y > 1.5 && y < 2.5))
        ) {
          const len = Math.hypot(dx, dz) || 1;
          this.loosen((dx / len) * 3.5, (dz / len) * 3.5, 1.6);
          d.raised = 0;
          d.swat = 0;
          this.notify("Balón desviado · sigue en juego");
        }
      }
      for (const key of ["cooldown", "raised", "steal", "swat"])
        d[key] = Math.max(0, (d[key] ?? 0) - dt);
    }
  }
  opponentStep(dt) {
    const a = this.carrier;
    if (!a) return;
    this.opponentAge += dt;
    const hand =
      this.phase === "opponentWindup"
        ? heldPosition(this.opponentState(a))
        : readyPosition(this.opponentState(a));
    const yaw = a.controller.bodyYaw;
    Object.assign(this.ball, {
      x: a.x + Math.sin(yaw) * hand.z + Math.cos(yaw) * (hand.x ?? 0),
      y: hand.y + (a.y ?? 0),
      z: a.z + Math.cos(yaw) * hand.z - Math.sin(yaw) * (hand.x ?? 0),
      vx: 0,
      vy: 0,
      vz: 0,
    });
    if (this.phase === "opponentWindup") {
      if (this.time >= 0.45) {
        const h = c.baskets[1].hoop,
          dist = distance(a, h),
          angle = c.angle;
        const speed = Math.sqrt(
          (c.gravity * dist * dist) /
            (2 *
              Math.cos(angle) ** 2 *
              (dist * Math.tan(angle) - (h.y - this.ball.y))),
        );
        const yaw =
          Math.atan2(h.x - a.x, h.z - a.z) + (this.random() - 0.5) * 0.12;
        Object.assign(
          this.ball,
          velocity(
            clamp((speed - c.minForce) / (c.maxForce - c.minForce), 0, 1),
            yaw,
            angle,
          ),
        );
        this.shotTeam = "away";
        this.scored = false;
        this.grounded = false;
        this.contacts = new Set();
        this.phase = "flight";
        this.possession = "shooting";
        this.time = 0;
        a.gesture = { kind: "passFollow", type: "overhead", time: 0 };
      }
    } else {
      if (this.opponentAge > 2.5 && distance(a, c.baskets[1].hoop) < 9) {
        this.phase = "opponentWindup";
        this.time = 0;
        a.shotFrom = hand;
      }
    }
  }
  looseStep(dt) {
    const b = this.ball;
    this.phase = "flight";
    Shot.prototype.step.call(this, dt);
    this.phase = "loose";
    if (b.y === c.ballRadius && Math.abs(b.vy) < 0.6) {
      b.vy = 0;
      b.vx *= Math.exp(-dt * 5);
      b.vz *= Math.exp(-dt * 5);
    }
    if (this.outOfBounds()) return;
    if (this.dunk?.active) return;
    const available = [this.player, this.companion, ...this.activeDefenders]
      .filter(
        (a) =>
          !a.y &&
          distance(a, b) < 0.72 &&
          (b.y < 1.2 || this.pickup?.actor === a) &&
          Math.hypot(b.vx, b.vy, b.vz) < 5,
      )
      .sort((a, z) => distance(a, b) - distance(z, b));
    const a = available[0];
    if (!a) {
      this.pickup = null;
      return;
    }
    if (this.pickup?.actor !== a)
      this.pickup = { actor: a, time: 0, from: { ...b } };
    this.pickup.time += dt;
    a.motion.landing = 0.8;
    const lift = smooth((this.pickup.time - 0.15) / 0.2);
    if (lift > 0) {
      const yaw =
        a === this.player
          ? this.bodyYaw
          : a === this.companion
            ? this.companionMovement.bodyYaw
            : a.controller.bodyYaw;
      const to = {
        x: a.x + Math.sin(yaw) * 0.4 + Math.cos(yaw) * 0.24,
        y: 1.5,
        z: a.z + Math.cos(yaw) * 0.4 - Math.sin(yaw) * 0.24,
      };
      for (const axis of ["x", "y", "z"])
        b[axis] =
          this.pickup.from[axis] + (to[axis] - this.pickup.from[axis]) * lift;
      b.vx = b.vy = b.vz = 0;
    }
    if (this.pickup.time < 0.35) return;
    this.pickup = null;
    this.scored = false;
    this.result = null;
    this.dunk = null;
    if (a === this.companion) {
      this.pass = { type: "direct" };
      this.completeReception();
    } else if (a === this.player) {
      this.possession = "player";
      this.phase = "ready";
      this.time = 0;
      this.hold();
    } else {
      this.possession = a.id;
      this.phase = "opponent";
      this.opponentAge = 0;
      this.time = 0;
    }
    this.notify(a.name + " controla el balón");
  }
  outOfBounds() {
    const b = this.ball,
      r = c.ballRadius;
    if (
      Math.abs(b.x) - r <= c.court.halfWidth &&
      b.z + r >= c.court.minZ &&
      b.z - r <= c.court.maxZ
    )
      return false;
    this.phase = "out";
    this.possession = "none";
    this.notify("BALÓN FUERA · Enter o botón para reponer");
    return true;
  }
  inbound() {
    if (this.phase !== "out" || this.paused) return false;
    this.dunk = null;
    this.player.x = 0;
    this.player.z = -0.38;
    this.player.y = 0;
    this.player.motion = createMotion();
    this.movement.clear();
    this.reset();
    return true;
  }
  step(dt) {
    if (this.paused || this.phase === "out") return;
    const before = this.stats.points,
      made = this.stats.made;
    this.updateAI(dt);
    if (this.dunk?.automatic && this.dunk.active) {
      this.elapsed += dt;
      stepAutomaticDunk(this, dt);
      this.updateCompanion(dt);
      if (this.dunk.ballReleased) {
        if (this.phase === "flight") Shot.prototype.step.call(this, dt);
        else if (this.phase === "loose") this.looseStep(dt);
      }
    } else if (["loose", "opponent", "opponentWindup"].includes(this.phase)) {
      this.elapsed += dt;
      this.time += dt;
      stepMotion(
        this.player,
        this.inputKeys,
        "ready",
        false,
        this.movement,
        dt,
      );
      this.player.motion.guard +=
        (Number(this.inputKeys.has(c.controls.protect)) -
          this.player.motion.guard) *
        (1 - Math.exp(-dt * 12));
      this.updateCompanion(dt);
      if (this.phase === "loose") this.looseStep(dt);
      else this.opponentStep(dt);
    } else {
      this.shotTeam = this.phase === "windup" ? "home" : this.shotTeam;
      super.step(dt);
    }
    if (this.shotTeam === "away" && this.stats.points > before) {
      this.opponentPoints += this.stats.points - before;
      this.stats.points = before;
      this.stats.made = made;
      this.stats.lastResult = "Canasta rival";
    }
    if (this.phase === "passMiss") {
      this.phase = "loose";
      this.possession = "loose";
      this.pickup = null;
    }
    if (this.phase === "result") {
      this.phase = "loose";
      this.possession = "loose";
      this.pickup = null;
      this.notify(
        this.scored ? "¡Canasta! · balón en juego" : "Rebote · balón en juego",
      );
    }
    if (["flight", "passing", "loose"].includes(this.phase)) this.outOfBounds();
    if (!this.hasBall)
      this.player.motion.guard +=
        (Number(this.inputKeys.has(c.controls.protect)) -
          this.player.motion.guard) *
        (1 - Math.exp(-dt * 12));
    this.resolveDefense(dt);
    this.separate();
  }
}

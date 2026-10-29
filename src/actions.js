import { config as c } from "./config.js";
export function createMotion() {
  return {
    guard: 0,
    dribble: 0,
    dribblePhase: 0,
    jumpStage: "ground",
    jumpTime: 0,
    airTime: 0,
    vy: 0,
    landing: 0,
    floorPulse: false,
    bounces: 0,
  };
}
export function jump(actor) {
  const m = actor.motion;
  if (m.jumpStage !== "ground" || m.landing > 0.1) return false;
  m.jumpStage = "prepare";
  m.jumpTime = 0;
  return true;
}
export function stepMotion(actor, keys, phase, hasBall, movement, dt) {
  const m = actor.motion;
  m.landing = Math.max(0, m.landing - dt * 4);
  if (m.jumpStage === "prepare") {
    m.jumpTime += dt;
    if (m.jumpTime >= c.actions.jumpPreparation) {
      m.jumpStage = "air";
      m.airTime = 0;
      m.vy = c.actions.jumpImpulse;
    }
  } else if (m.jumpStage === "air") {
    m.airTime += dt;
    actor.y = (actor.y ?? 0) + m.vy * dt - 0.5 * c.gravity * dt * dt;
    m.vy -= c.gravity * dt;
    if (actor.y <= 0) {
      actor.y = 0;
      m.vy = 0;
      m.jumpStage = "ground";
      m.landing = 1;
    }
  }
  const guard =
    hasBall && phase === "ready" && keys.has(c.controls.protect) ? 1 : 0;
  m.guard += (guard - m.guard) * (1 - Math.exp(-dt * 13));
  const speed = Math.hypot(movement.vx, movement.vz);
  const dribble =
    hasBall && phase === "ready" && m.jumpStage === "ground"
      ? Math.min(1, speed / 0.65)
      : 0;
  m.dribble += (dribble - m.dribble) * (1 - Math.exp(-dt * 16));
  const previous = m.dribblePhase;
  m.dribblePhase = (m.dribblePhase + dt * (1.3 + speed * 0.22)) % 1;
  m.floorPulse = previous < 0.5 && m.dribblePhase >= 0.5 && m.dribble > 0.95;
  if (m.floorPulse) {
    m.dribblePhase = 0.5;
    m.bounces++;
  }
}

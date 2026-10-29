import test from "node:test";
import assert from "node:assert/strict";
import { Practice } from "../src/practice.js";
import { config as c } from "../src/config.js";
import { playerPose, heldPosition } from "../src/pose.js";
import { Footwork } from "../src/footwork.js";
const dt = 1 / 240;
const tick = (s) => {
  s.updateMovement(dt);
  s.step(dt);
};
const advance = (s, time) => {
  for (let i = 0; i < time / dt; i++) tick(s);
};
const until = (s, predicate) => {
  for (let i = 0; i < 1500 && !predicate(); i++) tick(s);
  assert.ok(predicate());
};
test("Shift accelerates beyond ordinary speed; dribble reaches floor, follows speed, settles and protects lower", () => {
  const s = new Practice();
  s.player.z = -18;
  s.inputKeys.add("KeyW");
  advance(s, 1);
  const ordinary = Math.hypot(s.movement.vx, s.movement.vz);
  s.inputKeys.add("ShiftLeft");
  advance(s, 1);
  assert.ok(s.movement.vz > ordinary + 1);
  let floor = Infinity,
    top = 0;
  for (let i = 0; i < 240; i++) {
    tick(s);
    floor = Math.min(floor, s.ball.y);
    top = Math.max(top, s.ball.y);
  }
  assert.equal(floor, c.ballRadius);
  assert.ok(top > 1.1);
  assert.ok(s.motion.bounces >= 2);
  s.inputKeys.add("ControlLeft");
  advance(s, 1);
  assert.ok(s.motion.guard > 0.99);
  let protectedTop = 0;
  for (let i = 0; i < 240; i++) {
    tick(s);
    protectedTop = Math.max(protectedTop, s.ball.y);
  }
  assert.ok(protectedTop < 0.8);
  assert.equal(s.stats.attempts, 0);
  assert.ok(s.hasBall);
  s.inputKeys.clear();
  advance(s, 1.4);
  assert.ok(s.motion.dribble < 0.001);
  assert.ok(Math.abs(s.ball.y - 1.5) < 0.001);
});
test("single natural jump has preparation, apex and landing; repeated air requests do not add impulse", () => {
  const s = new Practice();
  assert.ok(s.requestJump());
  assert.equal(s.requestJump(), false);
  let max = 0;
  for (let i = 0; i < 320; i++) {
    tick(s);
    max = Math.max(max, s.player.y);
    if (s.motion.jumpStage === "air") assert.equal(s.requestJump(), false);
  }
  assert.ok(max > 0.9 && max < 1.1);
  assert.equal(s.player.y, 0);
  assert.ok(s.hasBall);
  assert.equal(s.stats.attempts, 0);
  assert.ok(s.requestJump());
});
test("jumping without possession never attaches a flying shot or changes its velocity", () => {
  const s = new Practice();
  s.charge();
  advance(s, 0.67);
  s.release();
  advance(s, 0.3);
  assert.equal(s.phase, "flight");
  s.requestJump();
  const before = { ...s.ball };
  tick(s);
  assert.ok(Math.abs(s.ball.vy - (before.vy - c.gravity * dt)) < 1e-8);
  assert.ok(Math.abs(s.ball.z - (before.z + before.vz * dt)) < 1e-8);
  advance(s, 0.2);
  assert.ok(s.player.y > 0);
  assert.equal(s.possession, "shooting");
});
test("F fake lifts and returns ball, cancels into movement, charge or pass and never counts an attempt", () => {
  const s = new Practice();
  assert.ok(s.requestFake());
  advance(s, 0.28);
  assert.ok(s.ball.y > 1.85);
  assert.equal(s.release(), false);
  assert.equal(s.stats.attempts, 0);
  assert.ok(s.requestFake());
  advance(s, 0.3);
  assert.equal(s.phase, "ready");
  assert.ok(s.hasBall);
  s.requestFake();
  advance(s, 0.2);
  const p = { ...s.ball };
  assert.ok(s.charge());
  tick(s);
  assert.ok(Math.abs(s.ball.y - p.y) < 0.02);
  s.cancel();
  s.requestFake();
  s.inputKeys.add("KeyW");
  tick(s);
  assert.equal(s.phase, "fakeReturn");
  s.inputKeys.clear();
  advance(s, 0.3);
  s.requestFake();
  assert.ok(s.requestPass());
  until(s, () => s.phase === "receive");
  assert.equal(s.player.id, "silva");
  assert.equal(s.stats.attempts, 0);
});
test("E single remains direct, fast EE becomes bounce while held; late or airborne E cannot start a simultaneous pass", () => {
  const s = new Practice();
  assert.ok(s.tapPass());
  advance(s, 0.1);
  assert.ok(s.tapPass());
  assert.equal(s.pass.type, "bounce");
  assert.equal(s.player.id, "rivera");
  until(s, () => s.phase === "passing");
  const ball = s.ball;
  assert.equal(s.tapPass(), false);
  assert.equal(s.requestPass("overhead"), false);
  assert.equal(s.ball, ball);
  until(s, () => s.phase === "ready");
  assert.equal(s.player.id, "silva");
  assert.equal(s.power, 0);
  s.tapPass();
  advance(s, 0.28);
  s.tapPass();
  assert.equal(s.pass.type, "direct");
});
test("all three pass types release from hands, are distinct in flight and transfer exclusive control on reception", () => {
  for (const type of ["direct", "bounce", "overhead"]) {
    const s = new Practice();
    s.updateMovement(dt);
    s.requestPass(type);
    until(s, () => s.phase === "passing");
    const origin = s.pointFor("player", s.handFor("player"));
    assert.ok(
      Math.hypot(
        s.ball.x - origin.x,
        s.ball.y - origin.y,
        s.ball.z - origin.z,
      ) < 1e-8,
    );
    let max = 0,
      min = 99,
      changes = 0;
    while (s.phase === "passing") {
      tick(s);
      max = Math.max(max, s.ball.y);
      min = Math.min(min, s.ball.y);
      if (s.phase === "passing") assert.equal(s.player.id, "rivera");
      changes = s.controlChanges;
    }
    assert.equal(s.player.id, "silva");
    assert.equal(changes, 1);
    assert.equal(s.movement.keys, s.inputKeys);
    assert.notEqual(s.companionMovement.keys, s.inputKeys);
    if (type === "bounce") {
      assert.equal(s.pass.bounces, 1);
      assert.equal(min, c.ballRadius);
    }
    if (type === "overhead") {
      assert.ok(max > 3);
      assert.ok(playerPose(s).hand.y > 2);
    }
    assert.equal(s.phase, "receive");
    advance(s, 0.4);
    assert.equal(s.phase, "ready");
    assert.ok(s.hasBall);
    assert.equal(s.stats.attempts, 0);
  }
});
test("missed direct, bounce and overhead passes keep sender control and recover", () => {
  for (const type of ["direct", "bounce", "overhead"]) {
    const s = new Practice();
    s.requestPass(type);
    until(s, () => s.phase === "passing");
    s.companion.x = 6;
    s.companion.z = -10;
    until(s, () => s.phase !== "passing");
    assert.equal(s.phase, "passMiss");
    assert.equal(s.player.id, "rivera");
    assert.equal(s.controlChanges, 0);
    advance(s, 2);
    assert.equal(s.phase, "ready");
  }
});
test("sprint foot placement stays within leg reach and airborne pose does not remove possession", () => {
  const s = new Practice(),
    feet = new Footwork();
  s.player.z = -18;
  s.inputKeys.add("KeyW");
  s.inputKeys.add("ShiftLeft");
  for (let i = 0; i < 700; i++) {
    tick(s);
    const pose = playerPose(s);
    for (const foot of feet.update(dt, s.player, s.bodyYaw, s.movement)) {
      const dx = foot.position.x - s.player.x - foot.side * 0.105,
        dz = foot.position.z - s.player.z;
      assert.ok(
        Math.hypot(dx, pose.hip + 0.02 - 0.12 - foot.position.y, dz) < 0.935,
      );
    }
  }
  const before = heldPosition(s);
  s.requestJump();
  tick(s);
  assert.ok(s.hasBall);
  assert.ok(Number.isFinite(before.y));
});

test("held modifiers transfer to the receiver only and a fake cancels a charged shot without counting", () => {
  const s = new Practice();
  s.inputKeys.add("ShiftLeft");
  s.inputKeys.add("ControlLeft");
  s.requestPass("overhead");
  until(s, () => s.phase === "receive");
  const old = s.companion;
  advance(s, 0.8);
  assert.ok(s.motion.guard > 0.9);
  assert.ok(old.motion.guard < 0.001);
  assert.equal(s.companionMovement.keys.size, 0);
  assert.equal(s.movement.keys, s.inputKeys);
  s.inputKeys.clear();
  s.charge();
  advance(s, 0.3);
  s.requestFake();
  assert.equal(s.release(), false);
  assert.equal(s.stats.attempts, 0);
  assert.ok(s.hasBall);
});
test("airborne shot begins at current hand height and keeps independent flight", () => {
  const s = new Practice();
  s.requestJump();
  advance(s, 0.3);
  s.charge();
  advance(s, 0.1);
  s.release();
  until(s, () => s.phase === "flight");
  assert.ok(Math.abs(s.ball.y - (c.initial.y + s.player.y)) < 0.0001);
  assert.ok(s.ball.y > c.initial.y + 0.5);
  assert.equal(s.stats.attempts, 1);
});

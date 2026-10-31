import test from "node:test";
import assert from "node:assert/strict";
import { Match } from "../src/match.js";
import { config as c } from "../src/config.js";
const dt = 1 / 240;
function advance(s, t) {
  for (let i = 0; i < t / dt; i++) {
    s.updateMovement(dt);
    s.step(dt);
  }
}
function run(x = 0, z = 2, speed = 4.8) {
  const s = new Match({ random: () => 0.2 });
  s.practiceMode = true;
  s.player.x = x;
  s.player.z = z;
  s.movement.vz = speed;
  s.inputKeys.add("ShiftLeft");
  s.hold();
  return s;
}
test("Space starts an automatic dunk from different paint positions and both hoops; release stays at the hand, torso never crosses board", () => {
  for (const reverse of [false, true])
    for (const [x, z] of [
      [0, 0.2],
      [-2.3, 1],
      [2.3, 5.4],
      [0, 4.4],
    ]) {
      const s = run(x, reverse ? -16.4 - z : z);
      if (reverse) {
        s.movement.vz = -4.8;
        s.bodyYaw = s.aim.yaw = s.movement.bodyYaw = Math.PI;
      }
      s.hold();
      assert.ok(s.requestJump());
      assert.equal(s.phase, "autoDunk");
      const d = s.dunk,
        h = d.hoop;
      let last = { ...s.ball };
      while (!d.ballReleased) {
        advance(s, dt);
        assert.ok(Math.abs(s.player.x) <= 2.45);
        const board = reverse ? c.baskets[1].board : c.board;
        if (s.player.y + 2.06 > board.bottom)
          assert.ok(Math.abs(s.player.z - board.z) > 0.3);
        assert.ok(
          Math.hypot(s.ball.x - last.x, s.ball.y - last.y, s.ball.z - last.z) <
            0.15,
        );
        last = { ...s.ball };
      }
      assert.ok(Math.abs(s.ball.x - h.x) < 0.001);
      assert.ok(Math.abs(s.ball.z - h.z) < 0.001);
      assert.equal(s.stats.attempts, 1);
      advance(s, 0.85);
      assert.equal(d.active, false);
      assert.equal(s.player.y, 0);
      assert.equal(s.stats.made, 1);
    }
});
test("force changes dunk result, not completion; mouse release never selects contact time", () => {
  for (const power of [0.1, 0.6, 1]) {
    const s = run();
    s.charge();
    s.power = power;
    s.requestJump();
    assert.equal(s.phase, "autoDunk");
    assert.equal(s.release(), false);
    advance(s, s.dunk.approach + 0.8);
    assert.equal(s.dunk.active, false);
    assert.equal(s.stats.made, power === 0.6 ? 1 : 0);
    if (power !== 0.6) assert.ok(s.contacts.has("rim"));
  }
});
test("Space without running, possession, or paint is an ordinary jump", () => {
  for (const missing of ["run", "ball", "paint"]) {
    const s = run();
    if (missing === "run") s.movement.vz = 0;
    if (missing === "ball") {
      s.possession = "vega";
      s.phase = "opponent";
    }
    if (missing === "paint") s.player.x = 3;
    assert.ok(s.requestJump());
    assert.equal(s.dunk, null);
    assert.equal(s.motion.jumpStage, "prepare");
  }
});
function defenseSetup() {
  const s = new Match({ random: () => 0.2 });
  const a = s.defenders[0];
  s.player.x = 0;
  s.player.z = 0;
  s.bodyYaw = s.aim.yaw = 0;
  a.x = 0;
  a.z = 0.8;
  a.motion.dribblePhase = 0.5;
  a.motion.guard = 0;
  s.possession = a.id;
  s.phase = "opponent";
  return { s, a };
}
test("E steals only in range, facing the exposed carrier, after the reach delay; protection and cooldown resist", () => {
  for (const mode of ["valid", "far", "behind", "protected", "wrongTiming"]) {
    const { s, a } = defenseSetup();
    if (mode === "far") a.z = 3;
    if (mode === "behind") s.bodyYaw = Math.PI;
    if (mode === "protected") a.motion.guard = 1;
    if (mode === "wrongTiming") a.motion.dribblePhase = 0.1;
    assert.ok(s.tapPass());
    assert.equal(s.possession, a.id);
    assert.equal(s.tapPass(), false);
    for (let i = 0; i < 45; i++) s.resolveDefense(dt);
    assert.equal(s.possession, mode === "valid" ? "loose" : a.id, mode);
  }
});
test("Q swats a close ball without awarding possession; distant or backwards swats fail", () => {
  for (const mode of ["valid", "far", "behind"]) {
    const { s, a } = defenseSetup();
    Object.assign(s.ball, { x: 0, y: 1.2, z: 0.7 });
    if (mode === "far") s.ball.z = 3;
    if (mode === "behind") s.bodyYaw = Math.PI;
    assert.ok(s.requestPass("overhead"));
    s.resolveDefense(dt);
    assert.equal(s.possession, mode === "valid" ? "loose" : a.id);
  }
});
test("hands can block reachable shots including during a jump; late, low or distant hands do not block", () => {
  for (const [height, jumping, expect] of [
    [2.1, false, true],
    [3.0, true, true],
    [3.0, false, false],
    [2.1, false, false],
  ]) {
    const { s } = defenseSetup();
    s.phase = "flight";
    s.possession = "shooting";
    Object.assign(s.ball, {
      x: 0,
      y: height,
      z: expect || height === 3 ? 0.6 : 2,
      vx: 0,
      vy: 2,
      vz: 1,
    });
    if (jumping) s.player.y = 0.9;
    s.charge();
    s.resolveDefense(dt);
    assert.equal(s.phase === "loose", expect);
  }
});
test("AI reacts with a delay, changes targets on a pass, uses defensive actions, and separation prevents overlap", () => {
  const s = new Match({ random: () => 0.8 });
  const a = s.defenders[0];
  const original = { x: a.x, z: a.z };
  advance(s, 0.1);
  assert.equal(a.target, undefined);
  advance(s, 0.4);
  assert.ok(a.target);
  assert.ok(Math.hypot(a.x - original.x, a.z - original.z) > 0.01);
  s.phase = "passing";
  s.possession = "air";
  s.pass = { type: "direct", duration: 2, target: { x: 0, y: 1, z: 0 } };
  Object.assign(s.ball, { x: 4, y: 1, z: -2 });
  a.defense.reaction = 0;
  s.updateAI(dt);
  assert.equal(a.target.x, 4);
  s.phase = "windup";
  s.possession = "player";
  a.x = s.player.x;
  a.z = s.player.z + 0.7;
  a.defense.reaction = 0;
  s.updateAI(dt);
  assert.ok(a.defense.raised > 0);
  assert.ok(a.defense.steal > 0);
  a.x = s.player.x;
  a.z = s.player.z;
  s.defenders[1].x = a.x;
  s.defenders[1].z = a.z;
  for (let i = 0; i < 8; i++) s.separate();
  for (const other of [s.player, s.defenders[1]])
    assert.ok(Math.hypot(a.x - other.x, a.z - other.z) > 0.7);
});
test("loose resting balls persist, pickup takes time and transfers only on control; completely outside stops play", () => {
  const s = run();
  s.movement.clear();
  s.inputKeys.clear();
  s.player.x = 4;
  s.player.z = 0;
  Object.assign(s.ball, { x: 0, y: c.ballRadius, z: 0 });
  s.loosen();
  advance(s, 5);
  assert.equal(s.phase, "loose");
  assert.equal(s.ball.y, c.ballRadius);
  s.player.x = 0;
  advance(s, 0.1);
  assert.equal(s.possession, "loose");
  advance(s, 0.4);
  assert.equal(s.possession, "player");
  const rival = new Match({ random: () => 0.2 });
  rival.player.x = -6;
  rival.player.z = -10;
  const a = rival.defenders[0];
  Object.assign(rival.ball, { x: a.x, y: c.ballRadius, z: a.z });
  rival.loosen();
  for (let i = 0; i < 90; i++) rival.looseStep(dt);
  assert.equal(rival.possession, a.id);
  Object.assign(s.ball, { x: c.court.halfWidth + 0.1, y: 1, z: 0 });
  s.loosen();
  assert.equal(s.outOfBounds(), false);
  s.ball.x += 0.1;
  assert.equal(s.outOfBounds(), true);
  const snapshot = JSON.stringify(s.ball);
  advance(s, 1);
  assert.equal(JSON.stringify(s.ball), snapshot);
  assert.ok(s.inbound());
  assert.equal(s.phase, "ready");
});
test("pause freezes ball, animation, AI and action timers; exit returns to free practice", () => {
  const s = new Match();
  s.charge();
  advance(s, 0.2);
  s.togglePause();
  const snapshot = JSON.stringify(
    { ball: s.ball, actors: s.actors, elapsed: s.elapsed, time: s.time },
    (k, v) => (k === "controller" || k === "player" ? undefined : v),
  );
  advance(s, 2);
  assert.equal(
    JSON.stringify(
      { ball: s.ball, actors: s.actors, elapsed: s.elapsed, time: s.time },
      (k, v) => (k === "controller" || k === "player" ? undefined : v),
    ),
    snapshot,
  );
  assert.equal(s.requestJump(), false);
  assert.equal(s.tapPass(), false);
  s.togglePause();
  advance(s, 0.1);
  assert.ok(s.time > 0.2);
  s.togglePause();
  s.exitToPractice();
  assert.equal(s.paused, false);
  assert.equal(s.practiceMode, true);
  assert.equal(s.activeDefenders.length, 0);
  assert.equal(s.phase, "ready");
});

test("all three passes still transfer on reception in the new game, and missed shots never teleport back", () => {
  for (const type of ["direct", "bounce", "overhead"]) {
    const s = new Match();
    s.practiceMode = true;
    const receiver = s.companion.id;
    assert.ok(s.requestPass(type));
    advance(s, 4);
    assert.equal(s.player.id, receiver);
    assert.equal(s.possession, "player");
  }
  const s = new Match();
  s.practiceMode = true;
  assert.ok(s.charge());
  advance(s, 0.1);
  assert.ok(s.release());
  s.player.x = 6;
  s.player.z = -10;
  s.companion.x = -6;
  s.companion.z = -15;
  advance(s, 4);
  assert.notEqual(s.possession, "player");
  assert.ok(["flight", "loose", "out"].includes(s.phase));
});

test("pausing midway through an automatic dunk preserves the contact path and resumes it", () => {
  const s = run();
  s.requestJump();
  advance(s, 0.3);
  s.togglePause();
  const before = JSON.stringify({
    ball: s.ball,
    player: s.player,
    age: s.dunk.age,
  });
  advance(s, 1);
  assert.equal(
    JSON.stringify({ ball: s.ball, player: s.player, age: s.dunk.age }),
    before,
  );
  s.togglePause();
  advance(s, 1.5);
  assert.equal(s.dunk.active, false);
  assert.equal(s.stats.attempts, 1);
});

test("defensive stance turns toward the carrier while retaining movement, and a paused shot can release after resuming", () => {
  const { s, a } = defenseSetup();
  s.practiceMode = true;
  a.x = 3;
  a.z = 0;
  s.inputKeys.add("ControlLeft");
  for (let i = 0; i < 480; i++) s.updateMovement(dt);
  assert.ok(Math.abs(s.bodyYaw - Math.PI / 2) < 0.02);
  s.inputKeys.add("KeyW");
  const x = s.player.x;
  for (let i = 0; i < 240; i++) s.updateMovement(dt);
  assert.ok(s.player.x > x + 0.1);
  const shot = run();
  shot.movement.clear();
  shot.charge();
  advance(shot, 0.3);
  const power = shot.power;
  shot.togglePause();
  shot.release();
  advance(shot, 1);
  assert.equal(shot.phase, "charging");
  assert.equal(shot.power, power);
  shot.togglePause();
  assert.equal(shot.phase, "windup");
  assert.equal(shot.launch.power, power);
});

test("opponents release a live shot from their hand and their baskets count on the rival scoreboard", () => {
  const s = new Match({ random: () => 0.5 }),
    a = s.defenders[0];
  s.possession = a.id;
  s.phase = "opponent";
  a.x = 0;
  a.z = -16;
  s.opponentAge = 3;
  s.opponentStep(dt);
  assert.equal(s.phase, "opponentWindup");
  s.time = 0.46;
  s.opponentStep(dt);
  assert.equal(s.phase, "flight");
  assert.ok(s.ball.vy > 0);
  assert.ok(s.ball.vz < 0);
  const h = c.baskets[1].hoop;
  Object.assign(s.ball, {
    x: h.x,
    y: h.y + 0.01,
    z: h.z,
    vx: 0,
    vy: -3,
    vz: 0,
  });
  advance(s, 0.05);
  assert.equal(s.opponentPoints, 2);
  assert.equal(s.stats.points, 0);
});

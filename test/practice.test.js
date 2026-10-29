import test from "node:test";
import assert from "node:assert/strict";
import { Practice } from "../src/practice.js";
import { config as c } from "../src/config.js";
const advance = (s, seconds) => {
  for (let i = 0; i < seconds * 240; i++) s.step(1 / 240);
};
test("control transfers only after catch; identities, input ownership, one ball and stats survive repeat passes", () => {
  const s = new Practice(),
    rivera = s.player,
    silva = s.companion,
    ball = s.ball,
    riveraMovement = s.movement,
    silvaMovement = s.companionMovement;
  s.inputKeys.add("KeyW");
  assert.ok(s.requestPass());
  advance(s, c.passing.preparation + 0.03);
  assert.equal(s.phase, "passing");
  assert.equal(s.player, rivera);
  assert.equal(s.controlChanges, 0);
  assert.equal(s.requestPass(), false);
  assert.equal(s.charge(), false);
  while (s.phase === "passing") s.step(1 / 240);
  assert.equal(s.phase, "receive");
  assert.equal(s.player, silva);
  assert.equal(s.companion, rivera);
  assert.equal(s.controlChanges, 1);
  assert.equal(s.movement, silvaMovement);
  assert.equal(s.companionMovement, riveraMovement);
  assert.equal(s.movement.keys, s.inputKeys);
  assert.equal(s.companionMovement.keys.size, 0);
  assert.notEqual(s.companionMovement.keys, s.inputKeys);
  assert.equal(s.movement.targetVelocity, null);
  advance(s, 0.4);
  assert.equal(s.phase, "ready");
  assert.equal(s.possession, "player");
  assert.ok(s.requestPass());
  advance(s, 2);
  assert.equal(s.player, rivera);
  assert.equal(s.controlChanges, 2);
  assert.equal(s.phase, "ready");
  assert.equal(s.stats.attempts, 0);
  assert.equal(s.power, 0);
  assert.equal(s.ball, ball);
});
test("a missed pass keeps control with the sender and recovers without a phantom possession switch", () => {
  const s = new Practice(),
    sender = s.player;
  s.requestPass();
  advance(s, c.passing.preparation + 0.02);
  s.companion.x = 6;
  s.companion.z = -9;
  while (s.phase === "passing") s.step(1 / 240);
  assert.equal(s.phase, "passMiss");
  assert.equal(s.player, sender);
  assert.equal(s.controlChanges, 0);
  assert.match(s.notice, /no recibido/);
  assert.equal(s.requestPass(), false);
  advance(s, 2);
  assert.equal(s.phase, "ready");
  assert.equal(s.player, sender);
  assert.equal(s.possession, "player");
});
test("charging and shot flight reject passes; returned ball can still score", () => {
  const s = new Practice();
  s.charge();
  advance(s, 0.4167 * c.chargeSeconds);
  assert.equal(s.requestPass(), false);
  assert.equal(s.phase, "charging");
  s.release();
  advance(s, 0.3);
  assert.equal(s.requestPass(), false);
  advance(s, 7);
  assert.equal(s.stats.points, 2);
  assert.equal(s.possession, "player");
  s.requestPass();
  advance(s, 2);
  s.requestPass();
  advance(s, 2);
  assert.equal(s.phase, "ready");
  assert.ok(s.charge());
  assert.equal(s.stats.attempts, 1);
});
test("AI adjusts support position on the court and E never changes shot power", () => {
  const s = new Practice();
  s.player.x = 6;
  s.player.z = -12;
  const d0 = Math.hypot(s.player.x - s.companion.x, s.player.z - s.companion.z);
  advance(s, 6);
  assert.ok(
    Math.hypot(s.player.x - s.companion.x, s.player.z - s.companion.z) < d0,
  );
  assert.ok(Math.abs(s.companion.x) < c.court.halfWidth);
  assert.ok(s.companion.z >= c.court.minZ && s.companion.z <= c.court.maxZ);
  s.requestPass();
  advance(s, 2);
  assert.equal(s.power, 0);
});

test("a shot released while moving leaves the current hand position after preparation", () => {
  const s = new Practice();
  s.charge();
  advance(s, 0.6);
  s.release();
  s.player.x = 1;
  s.player.z = 0.5;
  advance(s, c.windup + 0.001);
  assert.equal(s.phase, "flight");
  assert.ok(Math.abs(s.ball.x - 1) < 0.02);
  assert.ok(Math.abs(s.ball.z - (0.5 + 0.38)) < 0.02);
});

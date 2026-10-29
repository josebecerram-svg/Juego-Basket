import test from "node:test";
import assert from "node:assert/strict";
import { Practice } from "../src/practice.js";
import { config as c } from "../src/config.js";
const advance = (s, seconds) => {
  for (let i = 0; i < seconds * 240; i++) s.step(1 / 240);
};
test("E pass has one ball, blocks extra passes/shots in air, catches and holds with companion, E returns to moving player", () => {
  const s = new Practice(),
    ball = s.ball;
  assert.ok(s.requestPass());
  assert.equal(s.power, 0);
  assert.equal(s.requestPass(), false);
  advance(s, c.passing.preparation + 0.03);
  assert.equal(s.phase, "passing");
  assert.equal(s.possession, "air");
  const a = { ...s.ball };
  advance(s, 0.1);
  assert.notEqual(s.ball.x, a.x);
  assert.ok(s.ball.y > 1.45);
  assert.equal(s.requestPass(), false);
  assert.match(s.notice, /no disponible/);
  assert.equal(s.charge(), false);
  advance(s, 1.5);
  assert.equal(s.possession, "companion");
  assert.equal(s.phase, "companionHold");
  const held = { ...s.ball };
  advance(s, 0.5);
  assert.equal(s.phase, "companionHold");
  assert.ok(
    Math.hypot(s.ball.x - s.companion.x, s.ball.z - s.companion.z) < 0.6,
  );
  assert.ok(s.requestPass());
  advance(s, c.passing.preparation + 0.03);
  s.player.x = 1;
  s.player.z = -1;
  advance(s, 1.5);
  assert.equal(s.phase, "ready");
  assert.equal(s.possession, "player");
  assert.deepEqual({ x: s.ball.x, y: s.ball.y, z: s.ball.z }, s.origin());
  assert.equal(s.stats.attempts, 0);
  assert.equal(s.stats.points, 0);
  assert.equal(s.power, 0);
  assert.equal(s.ball, ball);
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

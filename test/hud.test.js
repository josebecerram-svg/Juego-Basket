import test from "node:test";
import assert from "node:assert/strict";
import { Shot } from "../src/physics.js";
import { powerFeedback } from "../src/hud.js";
import { config as c } from "../src/config.js";
function attempt(s, power) {
  assert.ok(s.charge());
  s.step(0.5);
  s.power = power;
  assert.ok(s.release());
  const frozen = s.power;
  let result;
  for (let i = 0; i < 2200; i++) {
    s.step(1 / 240);
    assert.equal(s.power, frozen);
    if (s.phase === "result") {
      result = s.result;
      break;
    }
  }
  assert.ok(result);
  s.step(c.resetDelay);
  return result;
}
test("score increases once per basket and survives reset; misses count attempts only", () => {
  const s = new Shot();
  for (let i = 1; i <= 3; i++) {
    assert.equal(attempt(s, 0.4167), "¡Canasta!");
    assert.equal(s.stats.points, i * 2);
    assert.equal(s.stats.made, i);
    assert.equal(s.stats.attempts, i);
    assert.equal(s.stats.lastResult, "¡Canasta!");
  }
  assert.equal(attempt(s, 0.1), "Fallaste");
  assert.deepEqual(s.stats, {
    points: 6,
    made: 3,
    attempts: 4,
    lastResult: "Fallaste",
  });
  s.charge();
  s.cancel();
  assert.equal(s.stats.attempts, 4);
});
test("power zones reflect distance/elevation and hold on release", () => {
  const s = new Shot();
  s.power = 0.1;
  assert.equal(powerFeedback(s).zone, "low");
  s.power = 0.4167;
  assert.equal(powerFeedback(s).zone, "ideal");
  s.power = 0.9;
  assert.equal(powerFeedback(s).zone, "high");
  const before = powerFeedback(s).low;
  s.player.z = -3;
  assert.ok(powerFeedback(s).low > before);
  s.player.z = -20;
  s.aim.angle = c.minAngle;
  assert.equal(powerFeedback(s).reachable, false);
});
test("ball rises visibly from ready to charge to release, without a discontinuity at release", () => {
  const s = new Shot();
  assert.equal(s.ball.y, 1.5);
  s.charge();
  s.step(0.2);
  assert.ok(s.ball.y > 1.5 && s.ball.y < 1.95);
  const charging = s.ball.y;
  s.release();
  s.step(0.001);
  assert.ok(Math.abs(s.ball.y - charging) < 0.02);
  s.step(c.windup);
  assert.equal(s.phase, "flight");
  assert.equal(s.ball.y, c.initial.y);
});

test("release freezes the power reference while the player moves and re-aims", () => {
  const s = new Shot();
  s.charge();
  s.step(0.65);
  s.release();
  const before = powerFeedback(s);
  s.player.x = 6;
  s.player.z = -8;
  s.aim.yaw = 1;
  s.aim.angle = c.maxAngle;
  assert.deepEqual(powerFeedback(s), before);
});

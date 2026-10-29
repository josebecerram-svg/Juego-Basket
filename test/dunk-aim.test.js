import test from "node:test";
import assert from "node:assert/strict";
import { Practice } from "../src/practice.js";
import { config as c } from "../src/config.js";
import { inPaint } from "../src/dunk.js";
import { mouseAim, toggleHoopLock, updateAim } from "../src/aim.js";
const dt = 1 / 240;
const tick = (s) => {
  s.updateMovement(dt);
  s.step(dt);
};
const advance = (s, time) => {
  for (let i = 0; i < time / dt; i++) tick(s);
};
function setup(reverse = false) {
  const s = new Practice();
  const h = reverse ? c.baskets[1].hoop : c.hoop,
    sign = reverse ? -1 : 1;
  s.player.z = h.z - sign * 2.25;
  s.aim.yaw = reverse ? Math.PI : 0;
  s.movement.bodyYaw = s.bodyYaw = s.aim.yaw;
  s.movement.viewYaw = s.aim.yaw;
  s.movement.vz = sign * 4.5;
  s.inputKeys.add("ShiftLeft");
  s.inputKeys.add("KeyW");
  return s;
}
test("running jump from blue paint starts a dunk at either basket, but missing any prerequisite gives normal shot", () => {
  for (const reverse of [false, true]) {
    const s = setup(reverse);
    assert.ok(s.requestJump());
    advance(s, 0.14);
    assert.ok(s.charge());
    assert.equal(s.phase, "dunkCharge");
  }
  for (const missing of ["possession", "run", "paint", "jump", "reach"]) {
    const s = setup();
    if (missing === "run") s.inputKeys.delete("ShiftLeft");
    if (missing === "paint") s.player.x = 2.5;
    if (missing === "reach") s.player.z = 0.1;
    if (missing !== "jump") s.requestJump();
    if (missing === "possession") s.possession = "air";
    s.charge();
    assert.notEqual(s.phase, "dunkCharge", missing);
    if (missing !== "possession") assert.equal(s.phase, "charging");
  }
  assert.ok(inPaint({ x: 0, z: 2 }, c.hoop));
  assert.equal(inPaint({ x: 2.46, z: 2 }, c.hoop), false);
});
test("green release dunks, scores exactly once and lands; early and late release miss physically", () => {
  for (const reverse of [false, true])
    for (const power of [0.1, 0.56, 0.9]) {
      const s = setup(reverse);
      s.requestJump();
      advance(s, 0.14);
      s.charge();
      advance(s, power * c.dunk.chargeSeconds);
      s.release();
      assert.equal(s.stats.attempts, 1);
      assert.equal(s.requestJump(), false);
      assert.equal(s.requestFake(), false);
      assert.equal(s.requestPass(), false);
      assert.equal(s.charge(), false);
      advance(s, 1.5);
      assert.equal(s.stats.points, power === 0.56 ? 2 : 0);
      assert.equal(s.stats.made, power === 0.56 ? 1 : 0);
      assert.equal(s.player.y, 0);
      assert.equal(s.dunk.active, false);
      advance(s, 7);
      assert.equal(s.phase, "ready");
      assert.equal(s.stats.points, power === 0.56 ? 2 : 0);
      assert.equal(
        s.stats.lastResult,
        power === 0.56 ? "¡Canasta!" : "Fallaste",
      );
    }
});
test("holding the mouse before a qualifying jump converts the charge; timeout or cancellation never awards points", () => {
  const s = setup();
  s.charge();
  assert.equal(s.phase, "charging");
  s.requestJump();
  assert.equal(s.phase, "dunkCharge");
  advance(s, c.dunk.maxHold + 0.1);
  assert.equal(s.dunk.success, false);
  advance(s, 8);
  assert.equal(s.stats.points, 0);
  assert.equal(s.stats.attempts, 1);
  const other = setup();
  other.requestJump();
  other.charge();
  other.cancel();
  advance(other, 8);
  assert.equal(other.stats.points, 0);
  assert.equal(other.phase, "ready");
});
test("dunk ball stays on the current hand anchor until separation, and a later attempt is available", () => {
  const s = setup();
  s.requestJump();
  s.charge();
  for (let i = 0; i < 100; i++) {
    tick(s);
    const p = s.pointFor("player", s.dunk.hand);
    assert.ok(
      Math.hypot(p.x - s.ball.x, p.y - s.ball.y, p.z - s.ball.z) < 0.00001,
    );
  }
  s.release();
  while (s.phase === "dunkFinish") tick(s);
  assert.equal(s.phase, "flight");
  assert.ok(s.ball.vy < 0);
  advance(s, 8);
  assert.ok(s.charge());
  assert.equal(s.phase, "charging");
});
test("relative mouse aiming accumulates multiple full rotations without horizontal clamp", () => {
  const s = new Practice();
  for (let i = 0; i < 400; i++) {
    mouseAim(s, 20, 0);
    advance(s, 0.025);
  }
  assert.ok(s.aim.yaw < -Math.PI * 8);
  assert.ok(s.bodyYaw < -Math.PI * 7);
  mouseAim(s, 0, 100000);
  assert.equal(s.aim.angle, c.minAngle);
  mouseAim(s, 0, -100000);
  assert.equal(s.aim.angle, c.maxAngle);
});
test("right lock selects nearest visible hoop, never shoots, follows movement and releases on toggle, range or occlusion", () => {
  const s = new Practice();
  s.visibleHoops = [c.hoop, c.baskets[1].hoop];
  assert.ok(toggleHoopLock(s));
  assert.equal(s.aimLock, c.hoop);
  assert.equal(s.phase, "ready");
  assert.equal(s.stats.attempts, 0);
  s.player.x = 2;
  updateAim(s, dt);
  assert.ok(
    Math.abs(s.aim.yaw - Math.atan2(-2, c.hoop.z - s.player.z)) < 0.000001,
  );
  const yaw = s.aim.yaw;
  mouseAim(s, 500, 0);
  assert.equal(s.aim.yaw, yaw);
  toggleHoopLock(s);
  assert.equal(s.aimLock, null);
  mouseAim(s, 500, 0);
  assert.notEqual(s.aim.yaw, yaw);
  toggleHoopLock(s);
  s.visibleHoops = [];
  for (let i = 0; i < 70; i++) updateAim(s, dt);
  assert.equal(s.aimLock, null);
  assert.match(s.notice, /fuera de vista/);
  assert.equal(toggleHoopLock(s), false);
  s.visibleHoops = [c.hoop];
  toggleHoopLock(s);
  s.player.z = -22;
  for (let i = 0; i < 70; i++) updateAim(s, dt);
  assert.equal(s.aimLock, null);
});

import test from "node:test";
import assert from "node:assert/strict";
import { Shot } from "../src/physics.js";
import { config as c } from "../src/config.js";
function run(s) {
  let crossing = null;
  for (let i = 0; i < 2400; i++) {
    const prev = { ...s.ball };
    s.step(1 / 240);
    if (prev.y > c.hoop.y && s.ball.y <= c.hoop.y)
      crossing = { x: s.ball.x, z: s.ball.z };
    if (s.phase === "result") return { result: s.result, crossing };
  }
  throw Error("El intento no terminó");
}
function launch(power, yaw = 0) {
  const s = new Shot();
  s.aim.yaw = yaw;
  s.charge();
  s.power = power;
  s.release();
  return s;
}
test("short, long, lateral miss and made basket", () => {
  const short = run(launch(0.1));
  assert.equal(short.result, "Fallaste");
  assert.ok(short.crossing.z < 3);
  const long = run(launch(0.95));
  assert.equal(long.result, "Fallaste");
  assert.ok(long.crossing.z > 6);
  const lateral = run(launch(0.4167, 0.3));
  assert.equal(lateral.result, "Fallaste");
  assert.ok(Math.abs(lateral.crossing.x) > 1);
  assert.equal(run(launch(0.4167)).result, "¡Canasta!");
});
test("three attempts: held ball, release from hands, exclusive flight and reset", () => {
  const s = new Shot();
  for (let attempt = 0; attempt < 3; attempt++) {
    assert.ok(s.charge());
    s.step(0.4167 * c.chargeSeconds);
    assert.deepEqual(
      { x: s.ball.x, y: s.ball.y, z: s.ball.z },
      { ...c.initial, y: 1.95 },
    );
    assert.ok(s.release());
    assert.equal(s.charge(), false);
    s.step(c.windup);
    assert.equal(s.phase, "flight");
    assert.deepEqual({ x: s.ball.x, y: s.ball.y, z: s.ball.z }, c.initial);
    assert.ok(s.ball.vz > 0);
    assert.equal(s.release(), false);
    assert.equal(run(s).result, "¡Canasta!");
    s.step(c.resetDelay);
    assert.equal(s.phase, "ready");
    assert.equal(s.scored, false);
  }
});
test("floor bounce, backboard reflection and off-centre 3D rim deflection", () => {
  let s = new Shot();
  s.phase = "flight";
  s.ball = { x: 0, y: 0.121, z: 1, vx: 1, vy: -3, vz: 1 };
  s.step(0.01);
  assert.ok(s.ball.vy > 0);
  assert.ok(s.contacts.has("floor"));
  s = new Shot();
  s.phase = "flight";
  s.ball = { x: 0.4, y: 3.5, z: c.board.z - 0.13, vx: 0, vy: 0, vz: 3 };
  s.step(0.01);
  assert.ok(s.ball.vz < 0);
  assert.ok(s.contacts.has("board"));
  s = new Shot();
  s.phase = "flight";
  s.ball = { x: c.hoop.radius, y: 3.2, z: c.hoop.z, vx: 0, vy: -2, vz: 0 };
  s.step(0.01);
  assert.ok(s.ball.vy > 0);
  assert.ok(s.contacts.has("rim"));
});
test("score requires downward interior crossing before floor; does not repeat", () => {
  const s = new Shot();
  s.phase = "flight";
  s.ball = { x: 0, y: 3.04, z: 4.3, vx: 0, vy: 2, vz: 0 };
  s.step(0.02);
  assert.equal(s.scored, false);
  s.ball = { x: 1, y: 3.06, z: 4.3, vx: 0, vy: -2, vz: 0 };
  s.step(0.02);
  assert.equal(s.scored, false);
  s.ball = { x: 0, y: 3.06, z: 4.3, vx: 0, vy: -2, vz: 0 };
  s.step(0.02);
  assert.equal(s.scored, true);
  s.ball = { x: 0, y: 3.06, z: 4.3, vx: 0, vy: -2, vz: 0 };
  s.step(0.02);
  assert.equal(s.scored, true);
  s.scored = false;
  s.grounded = true;
  s.ball = { x: 0, y: 3.06, z: 4.3, vx: 0, vy: -2, vz: 0 };
  s.step(0.02);
  assert.equal(s.scored, false);
});
test("charge caps, cancellation permits retry, direction and elevation change velocity", () => {
  let s = new Shot();
  s.charge();
  s.step(5);
  assert.equal(s.power, 1);
  s.cancel();
  assert.equal(s.phase, "ready");
  s = launch(0.4, 0.25);
  s.step(c.windup);
  assert.ok(s.ball.vx > 0);
  const vy = s.ball.vy;
  s = new Shot();
  s.aim.angle = c.maxAngle;
  s.charge();
  s.power = 0.4;
  s.release();
  s.step(c.windup);
  assert.ok(s.ball.vy > vy);
});

test("moving origin follows player and direction, flight remains independent, reset returns to new position", () => {
  const s = new Shot();
  s.player.x = 2;
  s.player.z = -3;
  s.aim.yaw = Math.PI / 2;
  s.step(0.01);
  assert.ok(Math.abs(s.ball.x - 2.42) < 1e-8);
  assert.ok(Math.abs(s.ball.z + 3.24) < 1e-8);
  s.charge();
  s.power = 0.4;
  s.release();
  s.step(c.windup);
  const start = { ...s.ball };
  s.player.x = -2;
  s.step(0.01);
  assert.ok(s.ball.x > start.x);
  assert.equal(s.ball.z, start.z);
  s.reset();
  assert.ok(Math.abs(s.ball.x + 1.58) < 1e-8);
  assert.equal(s.player.x, -2);
});

test("opposite basket also scores from a reversed shot", () => {
  const s = new Shot();
  s.player.z = -16.02;
  s.aim.yaw = Math.PI;
  s.charge();
  s.power = 0.4167;
  s.release();
  assert.equal(run(s).result, "¡Canasta!");
});

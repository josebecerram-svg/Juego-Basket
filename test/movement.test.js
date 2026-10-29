import test from "node:test";
import assert from "node:assert/strict";
import { Movement } from "../src/movement.js";
import { config as c } from "../src/config.js";
function move(keys, seconds = 1, yaw = 0) {
  const player = { x: 0, z: 0 },
    m = new Movement(player);
  m.yaw = m.viewYaw = m.bodyYaw = yaw;
  for (const key of keys) m.keys.add(key);
  for (let i = 0; i < seconds * 240; i++) m.step(1 / 240, "ready");
  return { player, m };
}
test("WASD directions relative to facing and diagonal normalization", () => {
  assert.ok(move(["KeyW"]).player.z > 0);
  assert.ok(move(["KeyS"]).player.z < 0);
  assert.ok(move(["KeyA"]).player.x > 0);
  assert.ok(move(["KeyD"]).player.x < 0);
  assert.ok(move(["KeyW"], 1, Math.PI).player.z < 0);
  const a = move(["KeyW"]),
    b = move(["KeyW", "KeyD"]);
  assert.ok(Math.hypot(b.player.x, b.player.z) <= a.player.z + 1e-6);
  assert.ok(Math.abs(Math.abs(b.player.x) - Math.abs(b.player.z)) < 1e-6);
});
test("court bounds and clearing held movement input", () => {
  for (const keys of [
    ["KeyW", "KeyA"],
    ["KeyS", "KeyD"],
  ]) {
    const { player } = move(keys, 30);
    assert.ok(Math.abs(player.x) <= c.court.halfWidth - c.movement.margin);
    assert.ok(
      player.z >= c.court.minZ + c.movement.margin &&
        player.z <= c.court.maxZ - c.movement.margin,
    );
  }
  const { m } = move(["KeyW"]);
  m.clear();
  assert.equal(m.keys.size, 0);
  assert.equal(m.vz, 0);
});

test("acceleration, braking, reversals and body yaw are rate limited", () => {
  const p = { x: 0, z: 0 },
    m = new Movement(p),
    dt = 1 / 240;
  m.keys.add("KeyW");
  m.step(dt, "ready");
  assert.ok(m.vz > 0 && m.vz <= c.movement.acceleration * dt + 1e-8);
  for (let i = 0; i < 200; i++) m.step(dt, "ready");
  assert.ok(m.vz > 3);
  m.keys.clear();
  m.keys.add("KeyS");
  const before = m.vz;
  m.step(dt, "ready");
  assert.ok(m.vz > 0);
  assert.ok(before - m.vz <= c.movement.deceleration * dt + 1e-8);
  m.yaw = Math.PI;
  const yaw = m.bodyYaw;
  m.step(dt, "ready");
  assert.ok(Math.abs(m.bodyYaw - yaw) <= c.movement.bodyTurnSpeed * dt + 1e-8);
  m.keys.clear();
  for (let i = 0; i < 200; i++) m.step(dt, "ready");
  assert.ok(Math.hypot(m.vx, m.vz) < 1e-6);
});

test("preparing a shot decelerates without snapping velocity to zero", () => {
  const { m } = move(["KeyW"]);
  const p = { ...m.player },
    v = m.vz;
  m.step(1 / 240, "windup");
  assert.ok(m.vz > 0 && m.vz < v);
  assert.ok(m.player.z > p.z);
});

test("walk, trot and run mix progressively without new keys; backward/lateral retain precision", () => {
  const p = { x: 0, z: 0 },
    m = new Movement(p);
  m.keys.add("KeyW");
  const maxima = { walk: 0, trot: 0, run: 0 };
  for (let i = 0; i < 360; i++) {
    m.step(1 / 240, "ready");
    for (const key in maxima) maxima[key] = Math.max(maxima[key], m.gait[key]);
    assert.ok(
      Math.abs(m.gait.idle + m.gait.walk + m.gait.trot + m.gait.run - 1) < 1e-8,
    );
  }
  assert.ok(maxima.walk > 0.3 && maxima.trot > 0.3 && maxima.run > 0.6);
  m.keys.clear();
  for (let i = 0; i < 240; i++) m.step(1 / 240, "ready");
  assert.ok(m.gait.idle > 0.98);
});
test("acceleration and turn speed ramp up rather than changing instantly", () => {
  const p = { x: 0, z: 0 },
    m = new Movement(p),
    dt = 1 / 240;
  m.keys.add("KeyW");
  m.yaw = Math.PI;
  for (let i = 0; i < 80; i++) {
    const ax = m.ax,
      az = m.az,
      angular = m.bodyTurnVelocity;
    m.step(dt, "ready");
    assert.ok(Math.hypot(m.ax - ax, m.az - az) <= c.movement.jerk * dt + 1e-6);
    assert.ok(
      Math.abs(m.bodyTurnVelocity - angular) <=
        c.movement.turnAcceleration * dt + 1e-6,
    );
  }
  assert.ok(m.bodyYaw < Math.PI);
});

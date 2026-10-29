import test from "node:test";
import assert from "node:assert/strict";
import { Movement } from "../src/movement.js";
import { config as c } from "../src/config.js";
function move(keys, seconds = 1, yaw = 0) {
  const player = { x: 0, z: 0 },
    m = new Movement(player);
  m.yaw = yaw;
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
  assert.ok(Math.abs(Math.hypot(b.player.x, b.player.z) - a.player.z) < 1e-6);
});
test("court bounds, acceleration, clear and brief windup lock", () => {
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
  const { player, m } = move(["KeyW"]);
  const z = player.z;
  m.step(1, "windup");
  assert.equal(player.z, z);
  m.clear();
  assert.equal(m.keys.size, 0);
  assert.equal(m.vz, 0);
});

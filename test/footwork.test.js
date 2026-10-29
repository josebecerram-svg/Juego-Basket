import test from "node:test";
import assert from "node:assert/strict";
import { Footwork } from "../src/footwork.js";
import { Movement } from "../src/movement.js";
test("planted feet remain at fixed world positions while player runs in all four directions", () => {
  for (const key of ["KeyW", "KeyS", "KeyA", "KeyD"]) {
    const p = { x: 0, z: 0 },
      m = new Movement(p),
      feet = new Footwork();
    m.keys.add(key);
    let planted = 0,
      swings = 0;
    feet.update(1 / 240, p, 0, m);
    for (let i = 0; i < 500; i++) {
      const prev = feet.feet.map((f) => ({
        position: { ...f.position },
        swing: !!f.swing,
      }));
      m.step(1 / 240, "ready");
      feet.update(1 / 240, p, m.bodyYaw, m);
      feet.feet.forEach((f, j) => {
        if (!prev[j].swing && !f.swing) {
          assert.equal(f.position.x, prev[j].position.x);
          assert.equal(f.position.z, prev[j].position.z);
          assert.equal(f.position.y, 0);
          planted++;
        } else swings++;
        assert.ok(f.position.y >= 0);
      });
    }
    assert.ok(planted > 20);
    assert.ok(swings > 20);
  }
});
test("feet settle on ground after stopping and step through an in-place turn", () => {
  const p = { x: 0, z: 0 },
    m = new Movement(p),
    f = new Footwork();
  m.keys.add("KeyW");
  for (let i = 0; i < 240; i++) {
    m.step(1 / 240, "ready");
    f.update(1 / 240, p, m.bodyYaw, m);
  }
  m.keys.clear();
  for (let i = 0; i < 350; i++) {
    m.step(1 / 240, "ready");
    f.update(1 / 240, p, m.bodyYaw, m);
  }
  for (const foot of f.feet) {
    assert.equal(foot.position.y, 0);
    assert.equal(foot.swing, null);
  }
  m.yaw = Math.PI / 2;
  let sawStep = false;
  for (let i = 0; i < 250; i++) {
    m.step(1 / 240, "ready");
    f.update(1 / 240, p, m.bodyYaw, m);
    if (f.feet.some((x) => x.swing)) sawStep = true;
  }
  assert.ok(sawStep);
});

test("direction changes keep a grounded support foot and knees within human leg reach", async () => {
  const { playerPose } = await import("../src/pose.js");
  const p = { x: 0, z: 0 },
    m = new Movement(p),
    f = new Footwork();
  for (let i = 0; i < 1200; i++) {
    m.keys.clear();
    m.keys.add(["KeyW", "KeyD", "KeyS", "KeyA"][Math.floor(i / 240) % 4]);
    if (i > 700) m.yaw = Math.PI;
    m.step(1 / 240, "ready");
    const pose = playerPose({ phase: "ready", time: 0, movement: m }),
      feet = f.update(1 / 240, p, m.bodyYaw, m);
    assert.ok(feet.some((foot) => foot.position.y === 0));
    for (const foot of feet) {
      const dx = foot.position.x - p.x,
        dz = foot.position.z - p.z,
        co = Math.cos(m.bodyYaw),
        si = Math.sin(m.bodyYaw);
      assert.ok(
        Math.hypot(
          dx * co - dz * si - foot.side * 0.105,
          pose.hip - 0.12 - foot.position.y,
          dx * si + dz * co,
        ) <= 0.915,
      );
    }
  }
});

test("landing eases to a fixed contact with negligible last-frame foot travel", () => {
  const p = { x: 0, z: 0 },
    m = new Movement(p),
    f = new Footwork(),
    dt = 1 / 240;
  m.keys.add("KeyW");
  let landings = 0;
  for (let i = 0; i < 700; i++) {
    const old = f.feet.map((foot) =>
      foot.position
        ? { position: { ...foot.position }, swing: !!foot.swing }
        : null,
    );
    m.step(dt, "ready");
    const feet = f.update(dt, p, m.bodyYaw, m);
    feet.forEach((foot, j) => {
      if (old[j]?.swing && !foot.swing) {
        assert.ok(
          Math.hypot(
            foot.position.x - old[j].position.x,
            foot.position.z - old[j].position.z,
          ) < 0.002,
        );
        assert.ok(foot.position.y === 0);
        landings++;
      }
    });
  }
  assert.ok(landings > 4);
});

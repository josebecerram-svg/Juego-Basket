import test from "node:test";
import assert from "node:assert/strict";
import * as T from "../vendor/three.module.js";
import { createCamera, sweepCamera } from "../src/camera.js";
import { Shot } from "../src/physics.js";
import { Practice } from "../src/practice.js";
import { config as c } from "../src/config.js";
function settle(rig, s, w = 1160, h = 660, frames = 100) {
  for (let i = 0; i < frames; i++) rig.update(w, h, s, 1 / 60);
  rig.camera.updateMatrixWorld();
}
test("camera stays close, behind and above the entire controlled player across court and headings", () => {
  for (const [w, h] of [
    [1160, 660],
    [358, 600],
  ])
    for (const [x, z] of [
      [0, -0.38],
      [7, 5],
      [-7, -21],
      [0, -9],
    ])
      for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
        const s = new Shot();
        s.player = { x, z };
        s.aim.yaw = yaw;
        const rig = createCamera();
        settle(rig, s, w, h);
        const camera = rig.camera,
          offset = camera.position.clone().sub(new T.Vector3(x, 0, z));
        assert.ok(Math.hypot(offset.x, offset.z) >= c.camera.minDistance);
        assert.ok(Math.hypot(offset.x, offset.z) < 5.5);
        assert.ok(
          offset.dot(new T.Vector3(Math.sin(yaw), 0, Math.cos(yaw))) < 0,
        );
        assert.ok(camera.position.y >= 2.45);
        for (const point of [
          [x - 0.3, 0, z],
          [x + 0.3, 0, z],
          [x - 0.3, 2.2, z],
          [x + 0.3, 2.2, z],
        ]) {
          const v = new T.Vector3(...point).project(camera);
          assert.ok(
            Math.abs(v.x) < 1 && Math.abs(v.y) < 1,
            JSON.stringify({ v, w, h, point, yaw }),
          );
        }
      }
});
test("initial aiming composition shows hoop, full body and ordinary shot trajectory without zooming away", () => {
  for (const [w, h] of [
    [1160, 660],
    [358, 600],
  ]) {
    const s = new Shot(),
      rig = createCamera();
    settle(rig, s, w, h);
    for (const point of [
      [0, 3.05, 4.3],
      [0, 4, 2],
      [s.player.x, 0, s.player.z],
    ]) {
      const v = new T.Vector3(...point).project(rig.camera);
      assert.ok(
        Math.abs(v.x) < 1 && Math.abs(v.y) < 1,
        JSON.stringify({ v, w, h, point }),
      );
    }
    assert.ok(
      rig.camera.position.distanceTo(
        new T.Vector3(s.player.x, 1.5, s.player.z),
      ) < 6,
    );
  }
});
test("camera body framing clears the existing HUD at normal close distance", () => {
  for (const [w, h] of [
    [1160, 660],
    [358, 600],
  ]) {
    const s = new Shot(),
      rig = createCamera();
    settle(rig, s, w, h);
    const portrait = w / h < 1.25;
    for (const point of [
      [-0.3, 0, -0.38],
      [0.3, 0, -0.38],
      [0, 2.2, -0.38],
      [0, 3.05, 4.3],
    ]) {
      const v = new T.Vector3(...point).project(rig.camera),
        x = ((v.x + 1) * w) / 2,
        y = ((1 - v.y) * h) / 2;
      assert.ok(
        !(
          x < (portrait ? 210 : 308) &&
          (y < (portrait ? 140 : 164) || y > h - (portrait ? 144 : 164))
        ),
        JSON.stringify({ x, y, w, h, point }),
      );
    }
  }
});
test("swept camera radius stops before supports, walls and teammate, including camera thickness", () => {
  const pivot = new T.Vector3(0, 1.5, 0),
    wall = new T.Box3(new T.Vector3(-2, 0, -3), new T.Vector3(2, 5, -2.8));
  const position = sweepCamera(pivot, new T.Vector3(0, 3, -4.6), [wall]);
  assert.ok(position.z > -2.8 + c.camera.radius);
  assert.equal(
    wall.clone().expandByScalar(c.camera.radius).containsPoint(position),
    false,
  );
  const buddy = new T.Box3(
    new T.Vector3(-0.4, 0, -3),
    new T.Vector3(0.4, 2.1, -2.2),
  );
  const p = sweepCamera(pivot, new T.Vector3(0, 2.6, -4.6), [buddy]);
  assert.equal(
    buddy.clone().expandByScalar(c.camera.radius).containsPoint(p),
    false,
  );
});
test("obstructed camera selects a safe shoulder angle while preserving third person", () => {
  const obstacles = [
    new T.Box3(new T.Vector3(-1.1, 0, -4), new T.Vector3(1.1, 4, -2.5)),
  ];
  const s = new Shot(),
    rig = createCamera({ obstacles });
  settle(rig, s);
  assert.ok(
    Math.hypot(
      rig.camera.position.x - s.player.x,
      rig.camera.position.z - s.player.z,
    ) >= c.camera.minDistance,
  );
  for (const b of obstacles)
    assert.equal(
      b
        .clone()
        .expandByScalar(c.camera.radius)
        .containsPoint(rig.camera.position),
      false,
    );
});
test("handoff and rapid mouse turns follow smoothly without entering either character or the floor", () => {
  const s = new Practice(),
    rig = createCamera();
  settle(rig, s);
  s.requestPass();
  while (s.phase !== "receive") s.step(1 / 240);
  const before = rig.camera.position.clone();
  rig.update(1160, 660, s, 1 / 60);
  assert.ok(rig.camera.position.distanceTo(before) < 1);
  for (let i = 0; i < 180; i++) {
    s.bodyYaw = Math.PI;
    rig.update(1160, 660, s, 1 / 60);
    assert.ok(rig.camera.position.y >= 2.45);
    assert.ok(
      Math.hypot(
        rig.camera.position.x - s.player.x,
        rig.camera.position.z - s.player.z,
      ) >=
        c.camera.minDistance - 1e-8,
    );
  }
  rig.camera.updateMatrixWorld();
  const v = new T.Vector3(s.player.x, 1, s.player.z).project(rig.camera);
  assert.ok(Math.abs(v.x) < 1 && Math.abs(v.y) < 1);
});

import test from "node:test";
import assert from "node:assert/strict";
import * as T from "../vendor/three.module.js";
import { createCamera } from "../src/camera.js";
import { Shot } from "../src/physics.js";
import { config as c } from "../src/config.js";
test("third person frames the player, nearest hoop and airborne ball across court and aim directions", () => {
  for (const [w, h] of [
    [1160, 470],
    [358, 390],
  ])
    for (const [x, z] of [
      [0, -0.38],
      [7, 5],
      [-7, -21],
      [0, -9],
    ])
      for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
        const shot = new Shot();
        shot.player = { x, z };
        shot.aim.yaw = yaw;
        shot.targetHoop = z < -8.2 ? c.baskets[1].hoop : c.hoop;
        shot.phase = "flight";
        shot.ball = { x: x + 2, y: 6, z: z + 3 };
        const rig = createCamera();
        rig.update(w, h, shot, 1 / 60);
        rig.camera.updateMatrixWorld();
        for (const point of [
          [x, 0.1, z],
          [x, 2.2, z],
          [shot.targetHoop.x, 4, shot.targetHoop.z],
          [shot.targetHoop.x, 3.05, shot.targetHoop.z],
          [shot.ball.x, 6, shot.ball.z],
        ]) {
          const p = new T.Vector3(...point).project(rig.camera);
          assert.ok(
            Math.abs(p.x) < 1 && Math.abs(p.y) < 1 && p.z < 1,
            JSON.stringify({ point, p, w, h, yaw }),
          );
        }
        assert.ok(rig.camera.position.y > 2.2);
        assert.ok(rig.camera.position.distanceTo(new T.Vector3(x, 1.7, z)) > 3);
      }
});

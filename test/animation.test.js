import test from "node:test";
import assert from "node:assert/strict";
import { Practice } from "../src/practice.js";
import { Shot } from "../src/physics.js";
import { playerPose, handPosition, passFollow } from "../src/pose.js";
import { config as c } from "../src/config.js";
import { angleDelta } from "../src/movement.js";
const dt = 1 / 240;
const tick = (s) => {
  s.updateMovement(dt);
  s.step(dt);
};
const vectorDistance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
function verifyGrip(s) {
  const pose = playerPose(s);
  const center = s.pointFor("player", pose.hand);
  assert.ok(
    vectorDistance(center, s.ball) < 0.0001,
    `ball/pose separation ${vectorDistance(center, s.ball)}`,
  );
  for (const side of [-1, 1]) {
    const palm = handPosition(s, pose, side);
    assert.ok(
      Math.abs(vectorDistance(palm, pose.hand) - c.ballRadius) < 0.01,
      "palm rests on ball surface",
    );
  }
}
test("pass release waits for body orientation; hands stay with ball before release at several court angles", () => {
  for (const [x, z] of [
    [-3, 1],
    [3, 1],
    [0, -4],
    [2, -3],
  ]) {
    const s = new Practice();
    s.companion.x = x;
    s.companion.z = z;
    s.updateMovement(dt);
    assert.ok(s.requestPass());
    let previous;
    for (let i = 0; i < 600 && s.phase === "passWindup"; i++) {
      tick(s);
      if (s.phase === "passWindup") {
        verifyGrip(s);
        previous = playerPose(s);
      }
    }
    assert.equal(s.phase, "passing");
    assert.ok(
      Math.abs(
        angleDelta(
          s.bodyYaw,
          Math.atan2(s.companion.x - s.player.x, s.companion.z - s.player.z),
        ),
      ) < 0.12,
    );
    assert.ok(
      vectorDistance(s.ball, s.pointFor("player", passFollow(0))) < 0.0001,
    );
    assert.ok(vectorDistance(previous.hand, passFollow(0)) < 0.002);
    assert.equal(s.player.id, "rivera");
    while (s.phase === "passing") tick(s);
    assert.equal(s.player.id, "silva");
    assert.equal(s.phase, "receive");
    verifyGrip(s);
    const sender = s.companion;
    if (sender.gesture) assert.equal(sender.gesture.kind, "passFollow");
    while (s.phase === "receive") {
      tick(s);
      verifyGrip(s);
    }
  }
});
test("charge, leg extension and shot release are continuous for tap, medium and full strength at different directions", () => {
  for (const seconds of [0.025, 0.67, 1.6])
    for (const yaw of [-1.1, 0, 0.8]) {
      const s = new Practice();
      s.aim.yaw = yaw;
      for (let i = 0; i < 300; i++) tick(s);
      s.charge();
      for (let i = 0; i < seconds / dt; i++) {
        tick(s);
        verifyGrip(s);
      }
      const before = playerPose(s);
      s.release();
      const after = playerPose(s);
      assert.ok(
        Math.abs(before.crouch - after.crouch) < 1e-8,
        "no knee pop on button release",
      );
      let previous = after;
      while (s.phase === "windup") {
        tick(s);
        const pose = playerPose(s);
        assert.ok(
          vectorDistance(previous.hand, pose.hand) < 0.04,
          "no hand jump at release",
        );
        assert.ok(
          Math.abs(previous.hip - pose.hip) < 0.01,
          "continuous leg extension",
        );
        if (s.phase === "windup") verifyGrip(s);
        previous = pose;
      }
      assert.equal(s.phase, "flight");
      assert.ok(
        vectorDistance(s.ball, s.pointFor("player", playerPose(s).hand)) <
          0.0001,
      );
      assert.equal(
        playerPose(s).wrist,
        0,
        "wrist starts continuously and bends after separation",
      );
      assert.ok(Math.abs(playerPose(s).hip - 0.96) < 0.001);
      for (let i = 0; i < 220; i++) tick(s);
      assert.ok(playerPose(s).follow < 0.02);
    }
});
test("failed pass never transfers input and clears receiver catch pose", () => {
  const s = new Practice();
  s.updateMovement(dt);
  s.requestPass();
  while (s.phase === "passWindup") tick(s);
  s.companion.x = 6;
  s.companion.z = -9;
  while (s.phase === "passing") tick(s);
  assert.equal(s.phase, "passMiss");
  assert.equal(s.controlChanges, 0);
  assert.equal(s.player.id, "rivera");
  assert.equal(s.companion.gesture, null);
});

import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { graphics, animationState } from "../src/graphics/settings.js";
import { QualityGovernor } from "../src/graphics/quality.js";
test("all four actual GLB rigs normalize to metres and preserve reachable hand targets", () => {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const run = spawnSync(
    process.execPath,
    [
      "--no-warnings",
      "--experimental-loader",
      "./scripts/three-node-loader.mjs",
      "./scripts/check-rigs.mjs",
    ],
    { cwd: root, encoding: "utf8", timeout: 15000 },
  );
  assert.equal(run.status, 0, run.stderr + run.stdout);
});
test("graphics animation states leave physical simulation unchanged", () => {
  const state = {
    phase: "ready",
    motion: { jumpStage: "ground" },
    movement: { vx: 0, vz: 0 },
  };
  assert.equal(animationState(state), "Idle");
  state.movement.vz = 4;
  assert.equal(animationState(state), "Run");
  for (const [phase, name] of [
    ["charging", "Shot"],
    ["passWindup", "Pass"],
    ["receive", "Pass"],
  ]) {
    state.phase = phase;
    assert.equal(animationState(state), name);
  }
  state.dunk = { active: true };
  const before = JSON.stringify(state);
  assert.equal(animationState(state), "Dunk");
  assert.equal(JSON.stringify(state), before);
  state.dunk.active = false;
  state.motion.jumpStage = "air";
  assert.equal(animationState(state), "Jump");
  state.motion.jumpStage = "ground";
  state.phase = "ready";
  state.motion.guard = 0.9;
  assert.equal(animationState(state), "Defense");
});
test("automatic quality reacts to sustained slow frames, ignores pauses, and retains high settings when fast", () => {
  const slow = new QualityGovernor("high");
  let changes = [];
  for (let i = 0; i < 500; i++) {
    const change = slow.sample(1 / 25);
    if (change) changes.push(change);
  }
  assert.deepEqual(changes, ["balanced", "low"]);
  const fast = new QualityGovernor("high");
  for (let i = 0; i < 1000; i++) {
    assert.equal(fast.sample(i % 40 === 0 ? 3 : 1 / 60), null);
  }
  assert.equal(fast.level, "high");
  assert.equal(graphics.profiles.high.shadow, 4096);
  assert.equal(graphics.exposure, 1.2);
});
test("bundled human assets contain skins, texture maps and valid animation channels; HDR is local", async () => {
  for (const file of ["human-demo.glb", "soldier-demo.glb"]) {
    const b = await readFile(
      new URL("../assets/characters/" + file, import.meta.url),
    );
    assert.equal(b.toString("ascii", 0, 4), "glTF");
    assert.equal(b.readUInt32LE(4), 2);
    const j = JSON.parse(b.toString("utf8", 20, 20 + b.readUInt32LE(12)));
    assert.ok(j.skins.length > 0);
    assert.ok(j.animations.length > 0);
    assert.ok(j.images.length > 0);
  }
  const hdr = await readFile(
    new URL("../assets/environment/arena.hdr", import.meta.url),
  );
  assert.ok(hdr.subarray(0, 100).toString().includes("FORMAT=32-bit_rle_rgbe"));
});

import assert from "node:assert/strict";
import * as T from "../vendor/three.module.js";
import { GLTFLoader } from "../vendor/addons/loaders/GLTFLoader.js";
import { createAvatar } from "../src/graphics/avatars.js";
import { athletes } from "../src/athletes.js";
import { Match } from "../src/match.js";
import { readFile } from "node:fs/promises";
globalThis.self = globalThis;
globalThis.createImageBitmap = async () => ({
  width: 1,
  height: 1,
  close() {},
});
globalThis.ProgressEvent = class {
  constructor(type, props) {
    Object.assign(this, props);
  }
};
globalThis.document = {
  createElement() {
    return {
      width: 256,
      height: 256,
      getContext() {
        return { fillText() {} };
      },
    };
  },
};
GLTFLoader.prototype.loadAsync = async function (url) {
  const b = await readFile(new URL(url));
  return this.parseAsync(
    b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength),
    "",
  );
};
const scene = new T.Scene(),
  s = new Match({ random: () => 0.2 });
for (const id of ["rivera", "silva", "vega", "rios"]) {
  const avatar = await createAvatar(scene, athletes[id]);
  const state =
    id === "rivera"
      ? s
      : id === "silva"
        ? s.companionState()
        : s.opponentState(s.defenders.find((a) => a.id === id));
  for (let i = 0; i < 60; i++) avatar.update(state, 1 / 60);
  let bones = [];
  avatar.group.traverse((o) => {
    if (o.isBone && /Hips|Head$|RightHand$/.test(o.name))
      bones.push({
        name: o.name,
        pos: o.getWorldPosition(new T.Vector3()).toArray(),
        scale: o.getWorldScale(new T.Vector3()).toArray(),
      });
  });
  assert.ok(
    avatar.group.children[0].scale.y < 2,
    "Model must remain human-sized",
  );
  assert.ok(
    avatar.group.userData.asset.handError < 0.2,
    "Hands must remain near the ball anchor",
  );
  console.log(
    JSON.stringify({
      id,
      diagnostics: avatar.group.userData.asset,
      root: avatar.group.children[0].scale.toArray(),
      position: avatar.group.children[0].position.toArray(),
      bones,
    }),
  );
}

import * as T from "../../vendor/three.module.js";
import { GLTFLoader } from "../../vendor/addons/loaders/GLTFLoader.js";
import { clone } from "../../vendor/addons/utils/SkeletonUtils.js";
import { graphics, animationState } from "./settings.js";
import { physicalSkin, physicalUniform } from "./materials.js";
import { playerPose, handPosition } from "../pose.js";
const loader = new GLTFLoader();
const loads = new Map();
const load = (url) => {
  if (!loads.has(url)) loads.set(url, loader.loadAsync(url));
  return loads.get(url);
};
const token = (name) =>
  graphics.boneMap[name] ??
  name.replace(/^mixamorig:?/, "").replace(/[^a-zA-Z0-9]/g, "");
function bonesOf(root) {
  const bones = new Map();
  root.traverse((o) => {
    if (o.isBone) bones.set(token(o.name), o);
  });
  return bones;
}
export function retargetRotations(clip, source, target) {
  const from = bonesOf(source),
    to = bonesOf(target),
    tracks = [];
  for (const track of clip.tracks) {
    if (!track.name.endsWith(".quaternion")) continue;
    const key = token(track.name.slice(0, -11)),
      a = from.get(key),
      b = to.get(key);
    if (!a || !b) continue;
    const values = track.values.slice(),
      q = new T.Quaternion();
    for (let i = 0; i < values.length; i += 4) {
      q.fromArray(values, i);
      q.premultiply(a.quaternion.clone().invert()).premultiply(b.quaternion);
      q.toArray(values, i);
    }
    tracks.push(
      new T.QuaternionKeyframeTrack(
        b.name + ".quaternion",
        track.times.slice(),
        values,
      ),
    );
  }
  return new T.AnimationClip(clip.name, clip.duration, tracks);
}
function sportsClip(name, bones, reference) {
  const frames = [0, 0.25, 0.55, 1],
    tracks = [];
  const rotations = {
    Jump: {
      LeftUpLeg: [0.35, 0, 0],
      RightUpLeg: [-0.18, 0, 0],
      LeftLeg: [-0.6, 0, 0],
      RightLeg: [-0.5, 0, 0],
    },
    Shot: {
      Spine: [-0.12, 0, 0],
      LeftUpLeg: [0.15, 0, 0],
      RightUpLeg: [0.15, 0, 0],
    },
    Dunk: {
      Spine: [-0.15, 0.08, 0],
      LeftUpLeg: [0.25, 0, 0],
      RightUpLeg: [-0.25, 0, 0],
      LeftLeg: [-0.7, 0, 0],
      RightLeg: [-0.5, 0, 0],
    },
    Pass: { Spine: [0.08, 0.12, 0] },
    Defense: {
      Spine: [0.18, 0, 0],
      LeftUpLeg: [-0.2, 0, -0.12],
      RightUpLeg: [-0.2, 0, 0.12],
      LeftLeg: [0.35, 0, 0],
      RightLeg: [0.35, 0, 0],
    },
  };
  for (const [key, bone] of bones) {
    const base = reference.get(key) ?? bone.quaternion,
      delta = rotations[name]?.[key] ?? [0, 0, 0],
      values = [];
    for (const t of frames) {
      const weight =
        name === "Defense"
          ? 1
          : Math.sin(Math.min(1, t / 0.9) * Math.PI) * 0.7 + 0.3;
      base
        .clone()
        .multiply(
          new T.Quaternion().setFromEuler(
            new T.Euler(...delta.map((x) => x * weight)),
          ),
        )
        .toArray(values, values.length);
    }
    tracks.push(
      new T.QuaternionKeyframeTrack(bone.name + ".quaternion", frames, values),
    );
  }
  return new T.AnimationClip(name, 1, tracks);
}
function splitMaterials(mesh, profile) {
  const original = Array.isArray(mesh.material)
    ? mesh.material[0]
    : mesh.material;
  const geometry = mesh.geometry.clone(),
    skin = geometry.attributes.skinIndex,
    weights = geometry.attributes.skinWeight;
  if (skin && geometry.index) {
    const lists = [[], [], []];
    const index = geometry.index.array;
    for (let i = 0; i < index.length; i += 3) {
      const scores = [0, 0, 0];
      for (let j = 0; j < 3; j++)
        for (let k = 0; k < 4; k++) {
          const vertex = index[i + j],
            bone = mesh.skeleton.bones[skin.getComponent(vertex, k)],
            name = token(bone?.name ?? "");
          const kind = /Head|Neck|Hand|ForeArm|Arm$/.test(name)
            ? 0
            : /Foot|Toe/.test(name)
              ? 2
              : 1;
          scores[kind] += weights.getComponent(vertex, k);
        }
      const kind = scores.indexOf(Math.max(...scores));
      lists[kind].push(index[i], index[i + 1], index[i + 2]);
    }
    geometry.setIndex(lists.flat());
    geometry.clearGroups();
    let start = 0;
    lists.forEach((list, i) => {
      geometry.addGroup(start, list.length, i);
      start += list.length;
    });
  }
  mesh.geometry = geometry;
  mesh.material = [
    physicalSkin(original),
    physicalUniform(profile.kit, original),
    physicalUniform(profile.shoe, original),
  ];
  mesh.castShadow = true;
  mesh.receiveShadow = true;
}
function rotateBone(bone, end, target) {
  bone.updateWorldMatrix(true, true);
  const origin = bone.getWorldPosition(new T.Vector3());
  const current = end.getWorldPosition(new T.Vector3()).sub(origin).normalize(),
    desired = target.clone().sub(origin).normalize();
  const world = new T.Quaternion()
    .setFromUnitVectors(current, desired)
    .multiply(bone.getWorldQuaternion(new T.Quaternion()));
  bone.quaternion.copy(
    bone.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(world),
  );
  bone.updateWorldMatrix(true, true);
}
export function solveArm(upper, lower, hand, target, side) {
  if (!upper || !lower || !hand) return 0;
  const a = upper.getWorldPosition(new T.Vector3()),
    b = lower.getWorldPosition(new T.Vector3()),
    tip = hand.getWorldPosition(new T.Vector3());
  const l1 = a.distanceTo(b),
    l2 = b.distanceTo(tip),
    direction = target.clone().sub(a),
    length = direction.length();
  if (length < 1e-5 || !l1 || !l2) return 0;
  direction.normalize();
  const reach = Math.min(length, l1 + l2 - 0.001),
    along = (l1 * l1 - l2 * l2 + reach * reach) / (2 * reach);
  const pole = new T.Vector3(side, 0.15, -0.45);
  pole.addScaledVector(direction, -pole.dot(direction)).normalize();
  const elbow = a
    .clone()
    .addScaledVector(direction, along)
    .addScaledVector(pole, Math.sqrt(Math.max(0, l1 * l1 - along * along)));
  rotateBone(upper, lower, elbow);
  rotateBone(lower, hand, a.clone().addScaledVector(direction, reach));
  return hand.getWorldPosition(new T.Vector3()).distanceTo(target);
}
function jerseyNumber(profile) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = profile.ink;
  ctx.textAlign = "center";
  ctx.font = "bold 145px Arial";
  ctx.fillText(profile.number, 128, 177);
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  return new T.MeshPhysicalMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.2,
    roughness: 0.8,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  });
}
export async function createAvatar(scene, profile) {
  const [asset, locomotion] = await Promise.all([
    load(profile.model ?? graphics.model),
    load(graphics.locomotion),
  ]);
  const model = clone(asset.scene),
    group = new T.Group();
  group.name = "gltf-athlete-" + profile.name;
  group.add(model);
  scene.add(group);
  // SkinnedMesh bounds depend on every bone's world matrix. Traversing bounds
  // before updating the whole hierarchy can measure an unposed, millimetric rig.
  group.updateMatrixWorld(true);
  model.traverse((o) => {
    if (o.isSkinnedMesh) o.computeBoundingBox();
  });
  const size = new T.Box3().setFromObject(model).getSize(new T.Vector3());
  if (!Number.isFinite(size.y) || size.y < 0.001)
    throw Error("Altura de esqueleto inválida");
  model.scale.multiplyScalar(profile.height / size.y);
  model.updateMatrixWorld(true);
  const bounds = new T.Box3().setFromObject(model);
  model.position.y -= bounds.min.y;
  model.updateMatrixWorld(true);
  const bones = bonesOf(model);
  let skinned = 0;
  model.traverse((o) => {
    if (o.isSkinnedMesh) {
      splitMaterials(o, profile);
      skinned++;
    }
  });
  if (!skinned || !bones.size)
    throw Error(
      "El avatar debe contener una malla con esqueleto: " + profile.name,
    );
  const clips = new Map(asset.animations.map((c) => [c.name, c]));
  for (const clip of locomotion.animations.filter((c) => c.name === "Run"))
    if (!clips.has(clip.name))
      clips.set(clip.name, retargetRotations(clip, locomotion.scene, model));
  const reference = new Map(
    [...bones].map(([key, bone]) => [key, bone.quaternion.clone()]),
  );
  for (const name of ["Idle", "Jump", "Shot", "Dunk", "Pass", "Defense"])
    if (!clips.has(graphics.clips[name]))
      clips.set(name, sportsClip(name, bones, reference));
  const baseY = model.position.y;
  const feet = ["LeftFoot", "RightFoot", "LeftToeBase", "RightToeBase"]
    .map((name) => bones.get(name))
    .filter(Boolean);
  const footReference = feet.length
    ? Math.min(...feet.map((b) => b.getWorldPosition(new T.Vector3()).y))
    : 0;
  const mixer = new T.AnimationMixer(model),
    actions = new Map();
  for (const name of Object.keys(graphics.clips)) {
    const clip = clips.get(graphics.clips[name]) ?? clips.get(name);
    if (!clip) throw Error("Falta animación " + name);
    const action = mixer.clipAction(clip);
    action.play();
    action.setEffectiveWeight(name === "Idle" ? 1 : 0);
    actions.set(name, action);
  }
  const numberMat = jerseyNumber(profile),
    numbers = [];
  for (const side of [-1, 1]) {
    const patch = new T.Mesh(new T.PlaneGeometry(0.29, 0.29), numberMat);
    patch.position.set(0, profile.height * 0.72, side * 0.155);
    patch.rotation.y = side < 0 ? Math.PI : 0;
    group.add(patch);
    numbers.push(patch);
  }
  let lastState = "Idle";
  group.userData.asset = {
    skinnedMeshes: skinned,
    bones: bones.size,
    source: "human-demo.glb",
    state: "Idle",
    handError: 0,
  };
  return {
    group,
    mixer,
    update(shot, dt) {
      group.position.set(shot.player.x, shot.player.y ?? 0, shot.player.z);
      group.rotation.y = shot.bodyYaw ?? shot.aim.yaw;
      const state = animationState(shot),
        speed = Math.hypot(shot.movement?.vx ?? 0, shot.movement?.vz ?? 0),
        run = Math.min(1, speed / 4.5);
      if (state !== lastState && !["Run", "Idle"].includes(state))
        actions.get(state).reset().play();
      for (const [name, action] of actions) {
        const target = ["Run", "Idle"].includes(state)
          ? name === "Run"
            ? run
            : name === "Idle"
              ? 1 - run
              : 0
          : Number(name === state);
        action.setEffectiveWeight(
          T.MathUtils.lerp(
            action.getEffectiveWeight(),
            target,
            1 - Math.exp(-dt * 12),
          ),
        );
      }
      actions.get("Run").setEffectiveTimeScale(Math.max(0.4, speed / 4.5));
      mixer.update(Math.min(dt, 0.05));
      lastState = state;
      model.position.y = baseY;
      group.updateMatrixWorld(true);
      if (feet.length && shot.motion?.jumpStage === "ground") {
        const footY =
          Math.min(...feet.map((b) => b.getWorldPosition(new T.Vector3()).y)) -
          (shot.player.y ?? 0);
        model.position.y += T.MathUtils.clamp(footReference - footY, -0.2, 0.2);
        group.updateMatrixWorld(true);
      }
      const pose = playerPose(shot);
      let error = 0;
      for (const [side, key] of [
        [-1, "Left"],
        [1, "Right"],
      ]) {
        const hand = handPosition(shot, pose, side);
        const target = group.localToWorld(
          new T.Vector3(hand.x, hand.y, hand.z),
        );
        error = Math.max(
          error,
          solveArm(
            bones.get(key + "Arm"),
            bones.get(key + "ForeArm"),
            bones.get(key + "Hand"),
            target,
            side,
          ),
        );
      }
      group.userData.asset.state = state;
      group.userData.asset.handError = error;
    },
    dispose() {
      mixer.stopAllAction();
      mixer.uncacheRoot(model);
      group.traverse((o) => {
        if (o.isMesh) {
          o.geometry.dispose();
          for (const m of Array.isArray(o.material) ? o.material : [o.material])
            m.dispose();
        }
      });
      group.removeFromParent();
    },
  };
}

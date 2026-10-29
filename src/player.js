import * as T from "../vendor/three.module.js";
import { config as c } from "./config.js";
import { Footwork } from "./footwork.js";
import { playerPose } from "./pose.js";

export function createPlayer(
  scene,
  profile = { name: "RIVERA", number: "07", skin: "#b88462" },
) {
  const group = new T.Group();
  scene.add(group);
  const mat = (color, roughness = 0.7) =>
    new T.MeshStandardMaterial({ color, roughness });
  const skin = mat(profile.skin ?? "#b88462"),
    skinShade = mat("#a87556"),
    hair = mat("#201d1b"),
    white = mat("#edf1ec"),
    navy = mat("#16334b"),
    trim = mat("#4d8ba5"),
    sole = mat("#c5cccf"),
    black = mat("#222a2f");
  function add(parent, g, m, x = 0, y = 0, z = 0) {
    const o = new T.Mesh(g, m);
    o.position.set(x, y, z);
    o.castShadow = true;
    o.receiveShadow = true;
    parent.add(o);
    return o;
  }
  function ellipsoid(parent, m, scale, x, y, z) {
    const o = add(parent, new T.SphereGeometry(1, 24, 16), m, x, y, z);
    o.scale.set(...scale);
    return o;
  }
  function limb(parent, m, r1, r2) {
    return add(parent, new T.CylinderGeometry(r1, r2, 1, 16), m);
  }
  function segment(mesh, a, b) {
    const d = b.clone().sub(a);
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.scale.y = d.length();
    mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize());
  }
  const body = new T.Group();
  group.add(body);
  body.name = "torso";
  const torso = add(
    body,
    new T.LatheGeometry(
      [
        [0.155, 1.06],
        [0.17, 1.1],
        [0.175, 1.19],
        [0.19, 1.33],
        [0.235, 1.44],
        [0.215, 1.51],
        [0.09, 1.55],
      ].map(([x, y]) => new T.Vector2(x, y)),
      32,
    ),
    white,
  );
  torso.scale.z = 0.68;
  // Sleeveless jersey with a separate collar, piping and printed fabric panels.
  const collar = add(
    body,
    new T.TorusGeometry(0.09, 0.012, 8, 32),
    navy,
    0,
    1.55,
    0,
  );
  collar.rotation.x = Math.PI / 2;
  collar.scale.y = 0.7;
  for (const side of [-1, 1]) {
    const pipe = add(
      body,
      new T.CylinderGeometry(0.012, 0.012, 0.42, 8),
      trim,
      side * 0.17,
      1.28,
      0,
    );
    pipe.rotation.z = side * -0.08;
  }
  add(body, new T.CylinderGeometry(0.06, 0.075, 0.13, 16), skin, 0, 1.6, 0);
  const head = new T.Group();
  head.position.y = 1.775;
  body.add(head);
  head.name = "head";
  ellipsoid(head, skin, [0.112, 0.145, 0.108], 0, 0, 0);
  ellipsoid(head, skinShade, [0.087, 0.07, 0.085], 0, -0.084, 0.018);
  ellipsoid(head, skin, [0.08, 0.054, 0.074], 0, -0.088, 0.045);
  // Brow, eyes, nose, ears and close-cropped hair define a human face.
  for (const side of [-1, 1]) {
    ellipsoid(head, skin, [0.022, 0.033, 0.018], side * 0.11, -0.013, -0.002);
    ellipsoid(head, white, [0.026, 0.011, 0.008], side * 0.042, 0.014, 0.096);
    ellipsoid(head, black, [0.009, 0.01, 0.006], side * 0.04, 0.013, 0.103);
    const brow = add(
      head,
      new T.BoxGeometry(0.047, 0.009, 0.009),
      hair,
      side * 0.042,
      0.039,
      0.095,
    );
    brow.rotation.z = side * -0.1;
  }
  ellipsoid(head, skinShade, [0.018, 0.03, 0.027], 0, -0.018, 0.11);
  ellipsoid(head, skin, [0.021, 0.015, 0.022], 0, -0.033, 0.122);
  ellipsoid(head, skinShade, [0.032, 0.005, 0.006], 0, -0.071, 0.105);
  const cap = add(
    head,
    new T.SphereGeometry(1, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.53),
    hair,
  );
  cap.scale.set(0.115, 0.15, 0.111);
  cap.position.y = 0.005;
  // Jersey text is generated locally and placed on front/back fabric.
  function print(text, number, back) {
    const cv = document.createElement("canvas");
    cv.width = 256;
    cv.height = 384;
    const ctx = cv.getContext("2d");
    ctx.clearRect(0, 0, 256, 384);
    ctx.textAlign = "center";
    ctx.fillStyle = "#16334b";
    ctx.font = "bold 27px Arial";
    ctx.fillText(text, 128, 65);
    ctx.font = "bold 172px Arial";
    ctx.fillText(number, 128, 250);
    const tex = new T.CanvasTexture(cv);
    tex.colorSpace = T.SRGBColorSpace;
    const panel = add(
      body,
      new T.PlaneGeometry(0.245, 0.36),
      new T.MeshStandardMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
        roughness: 0.85,
      }),
      0,
      1.3,
      back ? -0.135 : 0.14,
    );
    if (back) panel.rotation.y = Math.PI;
  }
  print(profile.name, profile.number, true);
  print("BASELINE", profile.number, false);
  const hips = new T.Group();
  group.add(hips);
  ellipsoid(hips, navy, [0.19, 0.13, 0.12], 0, 0.96, 0);
  add(
    hips,
    new T.CylinderGeometry(0.174, 0.18, 0.055, 24),
    navy,
    0,
    1.025,
    0,
  ).scale.z = 0.7;
  const legs = [];
  for (const side of [-1, 1]) {
    const short = limb(group, navy, 0.105, 0.115),
      thigh = limb(group, skin, 0.086, 0.065),
      shin = limb(group, skin, 0.057, 0.041);
    const knee = ellipsoid(group, skin, [0.063, 0.063, 0.063], 0, 0, 0);
    const foot = new T.Group();
    group.add(foot);
    foot.name = side < 0 ? "leftFoot" : "rightFoot";
    add(
      foot,
      new T.CylinderGeometry(0.045, 0.047, 0.14, 16),
      white,
      0,
      0.13,
      0,
    );
    const shoe = ellipsoid(foot, white, [0.072, 0.058, 0.15], 0, 0.045, 0.045);
    const outsole = ellipsoid(
      foot,
      sole,
      [0.075, 0.022, 0.155],
      0,
      0.012,
      0.045,
    );
    ellipsoid(foot, navy, [0.061, 0.045, 0.07], 0, 0.065, -0.026);
    for (let i = 0; i < 4; i++) {
      const lace = add(
        foot,
        new T.BoxGeometry(0.075, 0.007, 0.008),
        navy,
        0,
        0.09 - i * 0.007,
        0.025 + i * 0.018,
      );
      lace.rotation.y = i % 2 ? 0.15 : -0.15;
    }
    const sideStripe = add(
      foot,
      new T.BoxGeometry(0.009, 0.023, 0.08),
      trim,
      side * 0.067,
      0.047,
      0.055,
    );
    sideStripe.rotation.x = -0.2;
    const shortStripe = limb(group, trim, 0.012, 0.012);
    legs.push({ side, short, thigh, shin, knee, foot, shortStripe });
  }
  const arms = [];
  for (const side of [-1, 1]) {
    const shoulder = ellipsoid(group, skin, [0.078, 0.087, 0.085], 0, 0, 0);
    const upper = limb(group, skin, 0.067, 0.047),
      lower = limb(group, skin, 0.048, 0.034);
    const elbow = ellipsoid(group, skin, [0.047, 0.046, 0.045], 0, 0, 0);
    const hand = new T.Group();
    group.add(hand);
    ellipsoid(hand, skin, [0.037, 0.06, 0.022], 0, 0, 0);
    for (let i = 0; i < 4; i++) {
      const finger = add(
        hand,
        new T.CapsuleGeometry(0.008, 0.032 - (i === 3 ? 0.008 : 0), 3, 6),
        skin,
        (i - 1.5) * 0.017,
        0.066,
        0,
      );
      finger.rotation.x = -0.16;
    }
    const thumb = add(
      hand,
      new T.CapsuleGeometry(0.011, 0.035, 3, 7),
      skin,
      side * -0.041,
      0.018,
      0.006,
    );
    thumb.rotation.z = side * 0.55;
    const band = limb(group, white, 0.037, 0.037);
    arms.push({ side, shoulder, upper, lower, elbow, hand, band });
  }
  // Two-bone IK keeps the fingers around the ball through aiming and release.
  function elbowPoint(start, end, side) {
    const axis = end.clone().sub(start),
      distance = Math.min(0.615, axis.length());
    axis.normalize();
    const upper = 0.315,
      lower = 0.305,
      along =
        (upper * upper - lower * lower + distance * distance) / (2 * distance);
    let pole = new T.Vector3(side * 0.8, -0.45, 0.4);
    pole.addScaledVector(axis, -pole.dot(axis)).normalize();
    return start
      .clone()
      .addScaledVector(axis, along)
      .addScaledVector(
        pole,
        Math.sqrt(Math.max(0.0001, upper * upper - along * along)),
      );
  }
  const footwork = new Footwork();
  let poseHip = 0.96,
    animationTime = 0;
  const relax = (value) => 1 - Math.exp(-value);
  return {
    group,
    footwork,
    update(shot, dt = 1 / 60) {
      const pose = playerPose(shot);
      animationTime += dt;
      const blend = relax(dt * 12);
      poseHip += (pose.hip - poseHip) * blend;
      pose.hip = poseHip;
      group.position.set(shot.player.x, 0, shot.player.z);
      group.rotation.y =
        shot.bodyYaw ??
        (shot.phase === "windup" ? shot.launch.yaw : shot.aim.yaw);
      const headPitch =
        (-0.08 * (shot.aim.angle - c.minAngle)) / (c.maxAngle - c.minAngle) -
        pose.crouch * 0.4;
      head.rotation.x += (headPitch - head.rotation.x) * blend;
      body.position.y =
        pose.hip -
        0.96 +
        Math.sin(animationTime * 2.1) * 0.002 * (1 - pose.speed);
      const motion = shot.movement,
        cosYaw = Math.cos(group.rotation.y),
        sinYaw = Math.sin(group.rotation.y);
      const accelerationForward =
          (motion?.ax ?? 0) * sinYaw + (motion?.az ?? 0) * cosYaw,
        accelerationSide =
          (motion?.ax ?? 0) * cosYaw - (motion?.az ?? 0) * sinYaw;
      const leanX =
        ((motion?.forward ?? 0) / c.movement.speed) * 0.07 +
        accelerationForward * 0.009;
      const leanZ =
        (-(motion?.lateral ?? 0) / c.movement.speed) * 0.05 -
        accelerationSide * 0.007;
      body.rotation.x += (leanX - body.rotation.x) * blend;
      body.rotation.z += (leanZ - body.rotation.z) * blend;
      const lookingAtPass =
        shot.pass && ["passWindup", "passing", "receive"].includes(shot.phase);
      const headTarget = lookingAtPass ? group.rotation.y : shot.aim.yaw;
      const headYaw = Math.max(
        -0.4,
        Math.min(
          0.4,
          Math.atan2(
            Math.sin(headTarget - group.rotation.y),
            Math.cos(headTarget - group.rotation.y),
          ),
        ),
      );
      head.rotation.y += (headYaw - head.rotation.y) * blend;
      hips.position.y = pose.hip - 0.96;
      const feet = footwork.update(
        dt,
        shot.player,
        group.rotation.y,
        shot.movement,
      );
      for (const [index, leg] of legs.entries()) {
        const foot = feet[index],
          { side } = leg,
          dx = foot.position.x - shot.player.x,
          dz = foot.position.z - shot.player.z;
        const sin = Math.sin(group.rotation.y),
          cos = Math.cos(group.rotation.y);
        const hip = new T.Vector3(side * 0.105, pose.hip, 0),
          ankle = new T.Vector3(
            dx * cos - dz * sin,
            0.12 + foot.position.y,
            dx * sin + dz * cos,
          );
        const axis = ankle.clone().sub(hip),
          d = Math.min(0.909, axis.length());
        axis.normalize();
        const along = (0.46 * 0.46 - 0.45 * 0.45 + d * d) / (2 * d);
        const pole = new T.Vector3(0, 0, 1)
          .addScaledVector(axis, -axis.z)
          .normalize();
        const knee = hip
          .clone()
          .addScaledVector(axis, along)
          .addScaledVector(
            pole,
            Math.sqrt(Math.max(0, 0.46 * 0.46 - along * along)),
          );
        const shortEnd = hip.clone().lerp(knee, 0.55);
        segment(leg.short, hip, shortEnd);
        segment(leg.thigh, hip.clone().lerp(knee, 0.35), knee);
        segment(leg.shin, knee, ankle);
        leg.knee.position.copy(knee);
        leg.foot.position.copy(ankle).add(new T.Vector3(0, -0.12, 0));
        leg.foot.rotation.y = foot.yaw - group.rotation.y;
        leg.foot.rotation.x = foot.pitch ?? 0;
        segment(
          leg.shortStripe,
          hip.clone().add(new T.Vector3(side * 0.1, 0, 0)),
          shortEnd.clone().add(new T.Vector3(side * 0.1, 0, 0)),
        );
      }
      for (const arm of arms) {
        const { side } = arm,
          raise = Math.max(0, pose.hand.y - 1.6) * 0.23;
        const shoulder = new T.Vector3(
            side * 0.225,
            1.48 - pose.crouch + pose.sway + raise,
            0,
          ),
          hand = new T.Vector3(
            (pose.hand.x ?? 0) + side * (0.082 + (pose.hand.spread ?? 0)),
            pose.hand.y - 0.045,
            pose.hand.z - 0.015,
          );
        if ((pose.hand.spread ?? 0) > 0.1) {
          const opposite = feet[side < 0 ? 1 : 0],
            dx = opposite.position.x - shot.player.x,
            dz = opposite.position.z - shot.player.z;
          const strideForward =
            dx * Math.sin(group.rotation.y) + dz * Math.cos(group.rotation.y);
          hand.z -= strideForward * 0.55 * pose.speed;
          hand.y += Math.abs(strideForward) * 0.12 * pose.speed;
        }
        if (!arm.smoothedHand) arm.smoothedHand = hand.clone();
        const holding =
          shot.hasBall !== false && !["flight", "result"].includes(shot.phase);
        arm.smoothedHand.lerp(hand, holding ? 1 : relax(dt * 14));
        hand.copy(arm.smoothedHand);
        const elbow = elbowPoint(shoulder, hand, side);
        arm.shoulder.position.copy(shoulder);
        arm.elbow.position.copy(elbow);
        segment(arm.upper, shoulder, elbow);
        segment(arm.lower, elbow, hand);
        arm.hand.position.copy(hand);
        arm.hand.quaternion.setFromUnitVectors(
          new T.Vector3(0, 1, 0),
          hand.clone().sub(elbow).normalize(),
        );
        arm.hand.rotateX(pose.follow * 0.65);
        const nearWrist = hand.clone().lerp(elbow, 0.12);
        segment(arm.band, nearWrist, hand.clone().lerp(elbow, 0.22));
      }
    },
  };
}

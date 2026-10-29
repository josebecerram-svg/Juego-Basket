import * as T from "../vendor/three.module.js";
import { config as c } from "./config.js";
import { Footwork } from "./footwork.js";
import { playerPose, handPosition, smooth } from "./pose.js";
import { athletes } from "./athletes.js";

export function createPlayer(scene, profile = athletes.rivera) {
  profile = { ...athletes.rivera, ...profile };
  const bulk = profile.build,
    hipOffset = (profile.height - 1.92) / 2;
  const upperScale = 1 + hipOffset / 0.96;
  const group = new T.Group();
  group.name = `athlete-${profile.name.toLowerCase()}`;
  group.userData.profile = profile;
  scene.add(group);
  const mat = (color, roughness = 0.7) =>
    new T.MeshStandardMaterial({ color, roughness });
  const skin = mat(profile.skin ?? "#b88462"),
    skinShade = mat(new T.Color(profile.skin).multiplyScalar(0.84)),
    hair = mat(profile.hair, 0.94),
    white = mat("#edf1ec"),
    navy = mat(profile.shorts),
    trim = mat(profile.trim),
    shoeMaterial = mat(profile.shoe, 0.58),
    shoeAccent = mat(profile.shoeAccent, 0.65),
    sole = mat("#8d918e"),
    sockMaterial = mat(profile.socks ?? "#e5e9e3", 0.94),
    black = mat("#222a2f");
  const fabric = document.createElement("canvas");
  fabric.width = fabric.height = 128;
  const fabricContext = fabric.getContext("2d");
  fabricContext.fillStyle = profile.kit;
  fabricContext.fillRect(0, 0, 128, 128);
  fabricContext.strokeStyle = "rgba(45,69,77,.06)";
  fabricContext.lineWidth = 1;
  for (let i = 0; i < 128; i += 4) {
    fabricContext.beginPath();
    fabricContext.moveTo(i, 0);
    fabricContext.lineTo(i, 128);
    fabricContext.moveTo(0, i);
    fabricContext.lineTo(128, i);
    fabricContext.stroke();
  }
  const fabricTexture = new T.CanvasTexture(fabric);
  fabricTexture.colorSpace = T.SRGBColorSpace;
  fabricTexture.wrapS = fabricTexture.wrapT = T.RepeatWrapping;
  fabricTexture.repeat.set(3, 5);
  const jersey = mat("#ffffff", 0.88);
  jersey.map = fabricTexture;
  skin.roughness = 0.58;
  // Subtle local pore normals, no photographic likeness or external skin asset.
  const pores = document.createElement("canvas");
  pores.width = pores.height = 64;
  const pc = pores.getContext("2d"),
    pixels = pc.createImageData(64, 64);
  for (let i = 0; i < 4096; i++) {
    const x = i % 64,
      y = Math.floor(i / 64),
      v = Math.sin(x * 2.1 + y * 3.7) * Math.cos(y * 1.3 - x * 0.8);
    pixels.data.set(
      [128 + v * 10, 128 + Math.sin(x * 3.3 - y * 1.7) * 8, 254, 255],
      i * 4,
    );
  }
  pc.putImageData(pixels, 0, 0);
  const poreTexture = new T.CanvasTexture(pores);
  poreTexture.wrapS = poreTexture.wrapT = T.RepeatWrapping;
  poreTexture.repeat.set(5, 5);
  skin.normalMap = poreTexture;
  skin.normalScale.set(0.12, 0.12);
  const clothShade = mat(new T.Color(profile.kit).multiplyScalar(0.86), 0.95);
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
    // Soft muscle contours: broad proximal belly, narrow articulated ends.
    const rings = [
      [r1 * 0.83, -0.5],
      [r1, -0.35],
      [r1 * 0.98, -0.1],
      [(r1 + r2) * 0.48, 0.2],
      [r2, 0.42],
      [r2 * 0.95, 0.5],
    ];
    return add(
      parent,
      new T.LatheGeometry(
        new T.SplineCurve(
          rings.map(([r, y]) => new T.Vector2(r * bulk, y)),
        ).getPoints(28),
        28,
      ),
      m,
    );
  }
  function foldGeometry(geometry, amount) {
    const pos = geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i),
        y = pos.getY(i),
        z = pos.getZ(i),
        a = Math.atan2(z, x);
      const crease =
        1 +
        amount * (Math.sin(a * 9 + y * 17) + 0.45 * Math.sin(a * 17 - y * 23));
      pos.setXYZ(i, x * crease, y, z * crease);
    }
    geometry.computeVertexNormals();
    return geometry;
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
  body.scale.y = upperScale;
  // Loose basketball vest: more room at the hem and a strong shoulder line.
  const shirtProfile = [
    [0.187, 1.015],
    [0.19, 1.07],
    [0.18, 1.19],
    [0.194, 1.33],
    [0.235, 1.44],
    [0.215, 1.51],
    [0.09, 1.55],
  ];
  const shirtPoints = new T.SplineCurve(
    shirtProfile.map(([r, y]) => new T.Vector2(r, y)),
  ).getPoints(56);
  const torso = add(
    body,
    foldGeometry(new T.LatheGeometry(shirtPoints, 64), 0.024),
    jersey,
  );
  torso.scale.set(bulk, 1, 0.68 * bulk);
  // Stitched folds remain subtle, visible in the close third-person camera.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const crease = add(
        body,
        new T.CapsuleGeometry(0.0025, 0.075 + i * 0.01, 3, 6),
        clothShade,
        side * (0.11 + i * 0.009) * bulk,
        1.12 + i * 0.075,
        -0.111 * bulk,
      );
      crease.rotation.z = side * (0.7 + i * 0.14);
    }
  }
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
      side * 0.17 * bulk,
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
  head.scale.set(profile.faceWidth, 1, 1);
  const skull = new T.SphereGeometry(1, 64, 48);
  const vertices = skull.attributes.position;
  for (let i = 0; i < vertices.count; i++) {
    const y = vertices.getY(i),
      x = vertices.getX(i),
      z = vertices.getZ(i);
    const jaw =
      y < -0.2 ? 1 - (1 - profile.jaw) * Math.min(1, (-y - 0.2) * 1.4) : 1;
    const px = x * 0.108 * jaw,
      py = y * 0.145;
    const bump = (cx, cy, sx, sy) =>
      Math.exp(-(((px - cx) / sx) ** 2 + ((py - cy) / sy) ** 2));
    // Continuous cheeks/chin and orbital recesses replace overlapping facial blobs.
    const front = z > 0 ? Math.min(1, z * 4) : 0;
    const sculpt =
      0.009 *
        (bump(-0.057, -0.025, 0.027, 0.027) +
          bump(0.057, -0.025, 0.027, 0.027)) +
      0.018 * bump(0, -0.079, 0.057, 0.039) -
      0.004 *
        (bump(-0.04, 0.016, 0.026, 0.014) + bump(0.04, 0.016, 0.026, 0.014));
    vertices.setXYZ(i, px, py, z * 0.103 + sculpt * front);
  }
  skull.computeVertexNormals();
  add(head, skull, skin);

  const eyelids = [];
  // Brow, eyes, nose, ears and close-cropped hair define a human face.
  for (const side of [-1, 1]) {
    ellipsoid(head, skin, [0.022, 0.033, 0.018], side * 0.11, -0.013, -0.002);
    ellipsoid(
      head,
      skinShade,
      [0.026, 0.012, 0.009],
      side * 0.042,
      0.014,
      0.091,
    );
    ellipsoid(head, white, [0.02, 0.0065, 0.007], side * 0.042, 0.014, 0.099);
    ellipsoid(
      head,
      mat("#473b2c"),
      [0.008, 0.008, 0.004],
      side * 0.04,
      0.014,
      0.105,
    );
    ellipsoid(head, black, [0.004, 0.005, 0.003], side * 0.04, 0.014, 0.108);
    ellipsoid(
      head,
      white,
      [0.0018, 0.0018, 0.001],
      side * 0.04 - 0.002,
      0.017,
      0.111,
    );
    ellipsoid(head, skin, [0.029, 0.005, 0.008], side * 0.042, 0.023, 0.1);
    const lid = ellipsoid(
      head,
      skin,
      [0.024, 0.009, 0.007],
      side * 0.042,
      0.014,
      0.104,
    );
    lid.scale.y = 0.001;
    eyelids.push(lid);

    ellipsoid(
      head,
      skinShade,
      [0.012, 0.019, 0.009],
      side * 0.116,
      -0.012,
      0.009,
    );
    const brow = add(
      head,
      new T.BoxGeometry(0.047, 0.009, 0.009),
      hair,
      side * 0.042,
      0.039,
      0.095,
    );
    brow.rotation.z = side * profile.brow;
  }
  ellipsoid(
    head,
    skinShade,
    [0.014 * profile.nose, 0.029, 0.018],
    0,
    -0.018,
    0.104,
  );
  ellipsoid(head, skin, [0.016 * profile.nose, 0.012, 0.013], 0, -0.033, 0.12);
  const lips = mat(new T.Color(profile.skin).multiplyScalar(0.72));
  ellipsoid(head, lips, [0.029, 0.004, 0.007], 0, -0.067, 0.105);
  ellipsoid(head, skin, [0.027, 0.005, 0.007], 0, -0.075, 0.103);
  for (const side of [-1, 1])
    ellipsoid(
      head,
      skinShade,
      [0.005, 0.003, 0.005],
      side * 0.012,
      -0.04,
      0.132,
    );
  if (profile.beard) {
    // Original short goatee rather than a recognisable athlete's facial features.
    ellipsoid(head, hair, [0.038, 0.021, 0.009], 0, -0.103, 0.091);
    ellipsoid(head, hair, [0.029, 0.003, 0.004], 0, -0.058, 0.105);
  }
  const cap = add(
    head,
    new T.SphereGeometry(1, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.37),
    hair,
  );
  cap.scale.set(0.115, 0.15, 0.111);
  cap.position.y = 0.005;
  if (["coils", "texture"].includes(profile.hairStyle)) {
    cap.scale.y = 0.16;
    // Deterministic instanced curls: no external model or licensed likeness.
    const curls = new T.InstancedMesh(
      new T.SphereGeometry(
        profile.hairStyle === "texture" ? 0.006 : 0.012,
        7,
        5,
      ),
      hair,
      160,
    );
    const matrix = new T.Matrix4();
    for (let i = 0; i < 160; i++) {
      const y = 0.35 + (0.65 * (i + 0.5)) / 160,
        a = i * 2.39996323,
        r = Math.sqrt(1 - y * y);
      matrix.makeTranslation(
        0.112 * r * Math.cos(a),
        0.15 * y + 0.009,
        0.109 * r * Math.sin(a),
      );
      curls.setMatrixAt(i, matrix);
    }
    curls.castShadow = true;
    head.add(curls);
  }
  // Jersey text is generated locally and placed on front/back fabric.
  function print(text, number, back) {
    const cv = document.createElement("canvas");
    cv.width = 256;
    cv.height = 384;
    const ctx = cv.getContext("2d");
    ctx.clearRect(0, 0, 256, 384);
    ctx.textAlign = "center";
    ctx.fillStyle = profile.ink;
    ctx.font = "bold 27px Arial";
    ctx.fillText(text, 128, 65);
    ctx.font = "bold 172px Arial";
    ctx.fillText(number, 128, 250);
    const tex = new T.CanvasTexture(cv);
    tex.colorSpace = T.SRGBColorSpace;
    // Follow the curved jersey so surname/chest print never disappears inside it.
    const panelGeometry = new T.PlaneGeometry(0.245, 0.36, 10, 14);
    const panelVertices = panelGeometry.attributes.position;
    const chestRings = shirtPoints.map((p) => [p.y, p.x]);
    for (let i = 0; i < panelVertices.count; i++) {
      const y = panelVertices.getY(i) + 1.3,
        x = panelVertices.getX(i);
      let radius = 0.215;
      for (let r = 1; r < chestRings.length; r++)
        if (y <= chestRings[r][0]) {
          const [a, ra] = chestRings[r - 1],
            [b, rb] = chestRings[r];
          radius = ra + ((rb - ra) * (y - a)) / (b - a);
          break;
        }
      panelVertices.setZ(
        i,
        0.68 *
          bulk *
          Math.sqrt(Math.max(0.001, radius * radius - (x / bulk) ** 2)) +
          0.008,
      );
    }
    panelGeometry.computeVertexNormals();
    const panel = add(
      body,
      panelGeometry,
      new T.MeshStandardMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
        roughness: 0.85,
      }),
      0,
      1.3,
      0,
    );
    if (back) panel.rotation.y = Math.PI;
  }
  print(profile.name, profile.number, true);
  print("", profile.number, false);
  const hips = new T.Group();
  group.add(hips);
  hips.scale.x = hips.scale.z = bulk;
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
    const short = limb(group, navy, 0.112, 0.12),
      thigh = limb(group, skin, 0.095, 0.065),
      shin = limb(group, skin, 0.062, 0.041);
    short.geometry = foldGeometry(short.geometry, 0.025);
    const hem = add(
      short,
      new T.CylinderGeometry(0.122 * bulk, 0.122 * bulk, 0.028, 28, 1, true),
      trim,
      0,
      0.46,
      0,
    );
    hem.name = "shorts-hem";
    const knee = ellipsoid(
      group,
      skin,
      [0.063 * bulk, 0.063, 0.063 * bulk],
      0,
      0,
      0,
    );
    const foot = new T.Group();
    group.add(foot);
    foot.name = side < 0 ? "leftFoot" : "rightFoot";
    add(
      foot,
      new T.CylinderGeometry(0.045, 0.047, 0.14, 16),
      sockMaterial,
      0,
      0.13,
      0,
    );
    const shoe = ellipsoid(
      foot,
      shoeMaterial,
      [0.072, 0.058, 0.15],
      0,
      0.045,
      0.045,
    );
    const outsole = ellipsoid(
      foot,
      sole,
      [0.075, 0.022, 0.155],
      0,
      0.012,
      0.045,
    );
    ellipsoid(foot, shoeAccent, [0.061, 0.045, 0.07], 0, 0.065, -0.026);
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
    // Padded high collar, tongue, heel pull and an unbranded forefoot overlay.
    ellipsoid(foot, shoeMaterial, [0.056, 0.065, 0.055], 0, 0.098, -0.021);
    ellipsoid(foot, shoeAccent, [0.037, 0.012, 0.064], 0, 0.093, 0.036);
    add(
      foot,
      new T.BoxGeometry(0.025, 0.036, 0.012),
      shoeAccent,
      0,
      0.137,
      -0.06,
    );
    for (let i = 0; i < 5; i++)
      add(
        foot,
        new T.BoxGeometry(0.085, 0.004, 0.008),
        sole,
        0,
        0.019,
        0.055 + i * 0.019,
      );
    const sideStripe = add(
      foot,
      new T.BoxGeometry(0.009, 0.023, 0.08),
      shoeAccent,
      side * 0.067,
      0.047,
      0.055,
    );
    sideStripe.rotation.x = -0.2;
    const shortStripe = limb(group, trim, 0.006, 0.006);
    legs.push({ side, short, thigh, shin, knee, foot, shortStripe });
  }
  const arms = [];
  for (const side of [-1, 1]) {
    const shoulder = ellipsoid(
      group,
      skin,
      [0.08 * bulk, 0.087, 0.085 * bulk],
      0,
      0,
      0,
    );
    const upper = limb(group, skin, 0.067, 0.047),
      lower = limb(group, skin, 0.048, 0.034);
    const elbow = ellipsoid(group, skin, [0.047, 0.046, 0.045], 0, 0, 0);
    const hand = new T.Group();
    group.add(hand);
    hand.name = side < 0 ? "leftHand" : "rightHand";
    ellipsoid(hand, skin, [0.037, 0.06, 0.022], 0, 0, 0);
    const fingers = [];
    for (let i = 0; i < 4; i++) {
      const digit = new T.Group();
      digit.position.set((i - 1.5) * 0.016, 0.044, 0);
      hand.add(digit);
      const length = [0.042, 0.048, 0.044, 0.033][i];
      const finger = add(
        digit,
        new T.CapsuleGeometry(0.007, length * 0.5, 4, 8),
        skin,
        0,
        length * 0.2,
        0,
      );
      const tip = new T.Group();
      tip.position.y = length * 0.44;
      digit.add(tip);
      add(
        tip,
        new T.CapsuleGeometry(0.006, length * 0.36, 4, 8),
        skin,
        0,
        length * 0.18,
        0,
      );
      ellipsoid(
        tip,
        mat(new T.Color(profile.skin).lerp(new T.Color("#edc8b4"), 0.35)),
        [0.0045, 0.007, 0.0015],
        0,
        length * 0.25,
        -0.006,
      );
      fingers.push({ digit, tip, index: i });
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
    arms.push({ side, shoulder, upper, lower, elbow, hand, band, fingers });
  }
  // Two-bone IK keeps the fingers around the ball through aiming and release.
  function elbowPoint(start, end, side) {
    const axis = end.clone().sub(start),
      distance = Math.min(0.615 + hipOffset * 0.8, axis.length());
    axis.normalize();
    const upper = 0.315 + hipOffset * 0.4,
      lower = 0.305 + hipOffset * 0.4,
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
    animationTime = profile.rhythm;
  const relax = (value) => 1 - Math.exp(-value);
  return {
    group,
    footwork,
    update(shot, dt = 1 / 60) {
      const pose = playerPose(shot);
      animationTime += dt;
      const blend = relax(dt * 12);
      poseHip += (pose.hip + hipOffset - poseHip) * blend;
      pose.hip = poseHip;
      group.position.set(shot.player.x, shot.player.y ?? 0, shot.player.z);
      group.rotation.y =
        shot.bodyYaw ??
        (shot.phase === "windup" ? shot.launch.yaw : shot.aim.yaw);
      const airborne = (shot.player.y ?? 0) > 0;
      const sin = Math.sin(group.rotation.y),
        cos = Math.cos(group.rotation.y);
      if (airborne && !group.userData.airborne) {
        group.userData.takeoff = footwork.feet.map((f) => {
          const dx = (f.position?.x ?? shot.player.x) - shot.player.x,
            dz = (f.position?.z ?? shot.player.z) - shot.player.z;
          return {
            x: dx * cos - dz * sin,
            z: dx * sin + dz * cos,
            y: f.position?.y ?? 0,
            yaw: (f.yaw ?? group.rotation.y) - group.rotation.y,
          };
        });
      }
      if (!airborne && group.userData.airborne)
        for (const foot of footwork.feet) foot.position = null;
      group.userData.airborne = airborne;
      const tuck = smooth((shot.motion?.airTime ?? 0) / 0.14),
        landing = smooth((shot.player.y ?? 0) / 0.2);
      const feet = airborne
        ? [-1, 1].map((side, i) => {
            const from = group.userData.takeoff[i];
            const x = from.x + (side * 0.12 - from.x) * tuck,
              z = from.z + (-0.04 * landing - from.z) * tuck;
            return {
              position: {
                x: shot.player.x + x * cos + z * sin,
                z: shot.player.z + z * cos - x * sin,
                y: from.y + (0.04 * landing - from.y) * tuck,
              },
              yaw: group.rotation.y + from.yaw * (1 - tuck),
              pitch: -0.1 * tuck * landing,
            };
          })
        : footwork.update(dt, shot.player, group.rotation.y, shot.movement);
      // Lower the pelvis when a planted foot trails a sprint stop or court boundary.
      // This preserves contact without stretching a leg beyond its anatomical length.
      if (!airborne)
        for (const foot of feet) {
          const dx =
            foot.position.x -
            shot.player.x -
            Math.cos(group.rotation.y) * foot.side * 0.105 * bulk;
          const dz =
            foot.position.z -
            shot.player.z +
            Math.sin(group.rotation.y) * foot.side * 0.105 * bulk;
          const reach = 0.905 + hipOffset;
          const maxHip =
            0.12 +
            foot.position.y +
            Math.sqrt(Math.max(0.2, reach * reach - dx * dx - dz * dz));
          pose.hip = Math.min(pose.hip, maxHip);
        }
      poseHip = pose.hip;
      const gazeTarget =
        shot.gazeTarget ??
        (shot.phase === "passWindup" && shot.companion
          ? { x: shot.companion.x, y: 1.8, z: shot.companion.z }
          : null) ??
        (["flight", "passing", "passMiss"].includes(shot.phase)
          ? shot.ball
          : null);
      const gazeDistance = gazeTarget
        ? Math.hypot(gazeTarget.x - shot.player.x, gazeTarget.z - shot.player.z)
        : 0;
      const headPitch =
        gazeTarget && gazeDistance > 0.4
          ? Math.max(
              -0.4,
              Math.min(
                0.3,
                -Math.atan2(
                  gazeTarget.y - (profile.height - 0.14 + (shot.player.y ?? 0)),
                  gazeDistance,
                ),
              ),
            )
          : (-0.08 * (shot.aim.angle - c.minAngle)) /
              (c.maxAngle - c.minAngle) -
            pose.crouch * 0.4;
      head.rotation.x += (headPitch - head.rotation.x) * blend;
      const blinkPhase = animationTime % 4.7;
      const blink = Math.max(0, 1 - Math.abs(blinkPhase - 0.12) / 0.095);
      for (const lid of eyelids) lid.scale.y = 0.009 * blink + 0.00001;
      body.position.y =
        pose.hip -
        0.96 * upperScale +
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
        accelerationForward * 0.009 +
        pose.torsoPitch;
      const leanZ =
        (-(motion?.lateral ?? 0) / c.movement.speed) * 0.05 -
        accelerationSide * 0.007;
      const counterTurn =
        -(motion?.bodyTurnVelocity ?? 0) * 0.012 + pose.torsoTwist;
      body.rotation.y += (counterTurn - body.rotation.y) * blend;
      body.rotation.x += (leanX - body.rotation.x) * blend;
      body.rotation.z += (leanZ - body.rotation.z) * blend;
      const lookingAtPass =
        shot.pass && ["passWindup", "passing", "receive"].includes(shot.phase);
      const headTarget =
        gazeTarget && gazeDistance > 0.4
          ? Math.atan2(
              gazeTarget.x - shot.player.x,
              gazeTarget.z - shot.player.z,
            )
          : lookingAtPass
            ? group.rotation.y
            : shot.aim.yaw;
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
      hips.rotation.y += (-body.rotation.y * 0.45 - hips.rotation.y) * blend;
      for (const [index, leg] of legs.entries()) {
        const foot = feet[index],
          { side } = leg,
          dx = foot.position.x - shot.player.x,
          dz = foot.position.z - shot.player.z;
        const sin = Math.sin(group.rotation.y),
          cos = Math.cos(group.rotation.y);
        const hip = new T.Vector3(side * 0.105 * bulk, pose.hip, 0),
          ankle = new T.Vector3(
            dx * cos - dz * sin,
            0.12 + foot.position.y,
            dx * sin + dz * cos,
          );
        const axis = ankle.clone().sub(hip),
          d = Math.min(0.909 + hipOffset, axis.length());
        axis.normalize();
        const upperLeg = 0.46 + hipOffset * 0.5,
          lowerLeg = 0.45 + hipOffset * 0.5;
        const along =
          (upperLeg * upperLeg - lowerLeg * lowerLeg + d * d) / (2 * d);
        const pole = new T.Vector3(0, 0, 1)
          .addScaledVector(axis, -axis.z)
          .normalize();
        const knee = hip
          .clone()
          .addScaledVector(axis, along)
          .addScaledVector(
            pole,
            Math.sqrt(Math.max(0, upperLeg * upperLeg - along * along)),
          );
        const shortEnd = hip.clone().lerp(knee, profile.shortsLength ?? 0.82);
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
      body.updateMatrix();
      for (const arm of arms) {
        const { side } = arm,
          raise = Math.max(0, pose.hand.y - 1.6) * 0.23;
        const shoulder = new T.Vector3(
            side * 0.225 * bulk,
            1.48 + raise / upperScale,
            0,
          ).applyMatrix4(body.matrix),
          contact = handPosition(shot, pose, side),
          hand = new T.Vector3(contact.x, contact.y, contact.z);
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
          (shot.dunk?.active &&
            (!shot.dunk.ballReleased ||
              (shot.dunk.success && shot.dunk.landingTime < 0.14))) ||
          shot.phase === "windup" ||
          (!pose.dribbling &&
            shot.hasBall !== false &&
            !["flight", "result"].includes(shot.phase));
        arm.smoothedHand.lerp(hand, holding ? 1 : relax(dt * 14));
        hand.copy(arm.smoothedHand);
        const elbow = elbowPoint(shoulder, hand, side);
        arm.shoulder.position.copy(shoulder);
        arm.elbow.position.copy(elbow);
        segment(arm.upper, shoulder, elbow);
        segment(arm.lower, elbow, hand);
        arm.hand.position.copy(hand);
        const wristRotation = new T.Quaternion();
        if (holding || shot.action?.kind === "catchReady") {
          const normal = new T.Vector3(
            (pose.hand.x ?? 0) - hand.x,
            pose.hand.y - hand.y,
            pose.hand.z - hand.z,
          ).normalize();
          const up = new T.Vector3(0, 1, 0)
            .addScaledVector(normal, -normal.y)
            .normalize();
          const across = new T.Vector3().crossVectors(up, normal).normalize();
          wristRotation.setFromRotationMatrix(
            new T.Matrix4().makeBasis(across, up, normal),
          );
        } else {
          wristRotation.setFromUnitVectors(
            new T.Vector3(0, 1, 0),
            hand.clone().sub(elbow).normalize(),
          );
          wristRotation.multiply(
            new T.Quaternion().setFromAxisAngle(
              new T.Vector3(1, 0, 0),
              pose.wrist * (side > 0 ? 0.65 : 0.2),
            ),
          );
        }
        arm.hand.quaternion.slerp(wristRotation, blend);
        arm.hand.userData.holding = holding;
        // Curl fingers around the ball, then relax progressively after release.
        for (const finger of arm.fingers) {
          const curl = holding
            ? 0.28
            : 0.48 + 0.06 * Math.sin(animationTime * 2 + finger.index);
          finger.digit.rotation.x += (curl - finger.digit.rotation.x) * blend;
          finger.tip.rotation.x +=
            ((holding ? 0.5 : 0.65) - finger.tip.rotation.x) * blend;
          finger.digit.rotation.z =
            (finger.index - 1.5) * (holding ? 0.04 : 0.025);
        }
        const nearWrist = hand.clone().lerp(elbow, 0.12);
        segment(arm.band, nearWrist, hand.clone().lerp(elbow, 0.22));
      }
    },
  };
}

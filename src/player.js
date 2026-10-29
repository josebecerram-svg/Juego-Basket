import * as T from "../vendor/three.module.js";
import { config as c } from "./config.js";

export function createPlayer(scene) {
  const group = new T.Group();
  group.position.set(c.player.x, 0, c.player.z);
  scene.add(group);
  const material = (color) =>
    new T.MeshStandardMaterial({ color, roughness: 0.8 });
  const skin = material("#d3aa83"),
    shirt = material("#ddec91");
  const shorts = material("#283a31"),
    shoe = material("#eff0d8");
  function part(geometry, material, x, y, z) {
    const mesh = new T.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    group.add(mesh);
    return mesh;
  }
  part(new T.CylinderGeometry(0.24, 0.2, 0.62, 12), shirt, 0, 1.18, 0);
  part(new T.BoxGeometry(0.44, 0.28, 0.28), shorts, 0, 0.77, 0);
  part(new T.SphereGeometry(0.18, 16, 12), skin, 0, 1.76, 0);
  const legs = [];
  for (const x of [-0.14, 0.14]) {
    legs.push(
      part(new T.CylinderGeometry(0.08, 0.09, 0.55, 10), skin, x, 0.4, 0),
    );
    part(new T.BoxGeometry(0.18, 0.12, 0.33), shoe, x, 0.09, 0.06);
  }
  const arms = [-1, 1].map((side) => ({
    side,
    upper: part(new T.CylinderGeometry(0.065, 0.07, 1, 10), skin, 0, 0, 0),
    lower: part(new T.CylinderGeometry(0.055, 0.065, 1, 10), skin, 0, 0, 0),
  }));
  function segment(mesh, from, to) {
    const delta = new T.Vector3().subVectors(to, from);
    mesh.position.copy(from).add(to).multiplyScalar(0.5);
    mesh.scale.y = delta.length();
    mesh.quaternion.setFromUnitVectors(
      new T.Vector3(0, 1, 0),
      delta.normalize(),
    );
  }
  return {
    update(shot) {
      group.position.set(shot.player.x, 0, shot.player.z);
      group.rotation.y =
        shot.phase === "windup" ? shot.launch.yaw : shot.aim.yaw;
      const follow =
        shot.phase === "flight"
          ? Math.max(0, 1 - shot.time * 2)
          : shot.phase === "windup"
            ? shot.time / c.windup
            : 0;
      const stride = shot.movement
        ? Math.sin(shot.movement.distance * 7) *
          Math.min(1, Math.hypot(shot.movement.vx, shot.movement.vz)) *
          0.22
        : 0;
      legs.forEach((leg, i) => (leg.rotation.x = (i ? 1 : -1) * stride));
      for (const { side, upper, lower } of arms) {
        const shoulder = new T.Vector3(side * 0.25, 1.42, 0);
        const elbow = new T.Vector3(side * 0.3, 1.67 + follow * 0.16, 0.24);
        const hand = new T.Vector3(side * 0.08, 2.04 + follow * 0.05, 0.36);
        segment(upper, shoulder, elbow);
        segment(lower, elbow, hand);
      }
    },
  };
}

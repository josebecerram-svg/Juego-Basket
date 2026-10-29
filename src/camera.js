import * as T from "../vendor/three.module.js";
import { config as c } from "./config.js";
export function createCamera() {
  const camera = new T.PerspectiveCamera(49, 1, 0.1, 150);
  let initialized = false;
  let viewYaw = 0,
    lastDistance = 6;
  return {
    camera,
    update(w, h, shot, dt) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      // Fit player, active hoop and ball; the camera always remains behind and above.
      const targetHoop = shot.targetHoop ?? c.hoop;
      const points = [
        new T.Vector3(shot.player.x, 0.1, shot.player.z),
        new T.Vector3(shot.player.x, 2.2, shot.player.z),
        new T.Vector3(targetHoop.x, 4, targetHoop.z),
        new T.Vector3(targetHoop.x, 2.55, targetHoop.z),
        new T.Vector3(targetHoop.x - 0.95, 3.4, targetHoop.z),
        new T.Vector3(targetHoop.x + 0.95, 3.4, targetHoop.z),
      ];
      for (const x of [-0.36, 0.36])
        for (const y of [0, 2.25])
          for (const z of [-0.4, 0.4])
            points.push(new T.Vector3(shot.player.x + x, y, shot.player.z + z));
      if (shot.phase === "flight")
        points.push(new T.Vector3(shot.ball.x, shot.ball.y, shot.ball.z));
      const box = new T.Box3().setFromPoints(points),
        center = box.getCenter(new T.Vector3());
      const yawDelta = Math.atan2(
        Math.sin(shot.aim.yaw - viewYaw),
        Math.cos(shot.aim.yaw - viewYaw),
      );
      viewYaw += yawDelta * (initialized ? 1 - Math.exp(-5 * dt) : 1);
      const sin = Math.sin(viewYaw),
        cos = Math.cos(viewYaw);
      const direction = new T.Vector3(
        0.22 * cos - sin,
        0.34,
        -0.22 * sin - cos,
      ).normalize();
      const right = new T.Vector3(
        -cos - 0.22 * sin,
        0,
        sin - 0.22 * cos,
      ).normalize();
      const up = new T.Vector3().crossVectors(direction, right).normalize();
      const tanY = Math.tan((camera.fov * Math.PI) / 360),
        tanX = tanY * camera.aspect;
      let distance = 6;
      for (const point of points) {
        const d = point.clone().sub(center);
        distance = Math.max(
          distance,
          Math.abs(d.dot(right)) / tanX + d.dot(direction) + 1.4,
          Math.abs(d.dot(up)) / tanY + d.dot(direction) + 1.4,
        );
      }
      lastDistance = initialized
        ? Math.max(
            distance,
            lastDistance + (distance - lastDistance) * (1 - Math.exp(-5 * dt)),
          )
        : distance;
      camera.position.copy(center).addScaledVector(direction, lastDistance);
      camera.lookAt(center);
      initialized = true;
    },
  };
}

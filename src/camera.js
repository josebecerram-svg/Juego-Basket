import * as T from "../vendor/three.module.js";
import { config as c } from "./config.js";
export function createCamera() {
  const camera = new T.PerspectiveCamera(49, 1, 0.1, 150);
  let initialized = false;
  const focus = new T.Vector3();
  let cameraTurnVelocity = 0;
  let viewYaw = 0,
    lastDistance = 6;
  return {
    camera,
    update(w, h, shot, dt) {
      camera.aspect = w / h;
      const portrait = w / h < 1.25;
      camera.setViewOffset(w, h, portrait ? 0 : -w * 0.12, 0, w, h);
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
      if (shot.companion)
        for (const x of [-0.38, 0.38])
          for (const y of [0, 2.15])
            for (const z of [-0.4, 0.4])
              points.push(
                new T.Vector3(shot.companion.x + x, y, shot.companion.z + z),
              );
      if (
        ["flight", "passing", "passWindup", "receive", "passMiss"].includes(
          shot.phase,
        )
      )
        points.push(new T.Vector3(shot.ball.x, shot.ball.y, shot.ball.z));
      const box = new T.Box3().setFromPoints(points);
      const targetFocus = box
        .getCenter(new T.Vector3())
        .lerp(new T.Vector3(shot.player.x, 1.6, shot.player.z), 0.22);
      if (!initialized) focus.copy(targetFocus);
      else focus.lerp(targetFocus, 1 - Math.exp(-dt * 6));
      const center = focus.clone();
      const yawDelta = Math.atan2(
        Math.sin((shot.bodyYaw ?? shot.aim.yaw) - viewYaw),
        Math.cos((shot.bodyYaw ?? shot.aim.yaw) - viewYaw),
      );
      if (!initialized) viewYaw += yawDelta;
      else {
        const desired = Math.max(-3.2, Math.min(3.2, yawDelta * 7));
        cameraTurnVelocity += Math.max(
          -10 * dt,
          Math.min(10 * dt, desired - cameraTurnVelocity),
        );
        const step = cameraTurnVelocity * dt;
        if (Math.abs(step) > Math.abs(yawDelta) && step * yawDelta > 0) {
          viewYaw += yawDelta;
          cameraTurnVelocity = 0;
        } else viewYaw += step;
      }
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
        tanX = tanY * camera.aspect * (portrait ? 0.88 : 0.72);
      const safeTanY = tanY * (portrait ? 0.4 : 0.86);
      let distance = 6;
      for (const point of points) {
        const d = point.clone().sub(center);
        distance = Math.max(
          distance,
          Math.abs(d.dot(right)) / tanX + d.dot(direction) + 1.4,
          Math.abs(d.dot(up)) / safeTanY + d.dot(direction) + 1.4,
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

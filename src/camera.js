import * as T from "../vendor/three.module.js";
import { config as c } from "./config.js";
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// Swept camera radius against static world bounds, including the teammate.
export function sweepCamera(
  pivot,
  desired,
  obstacles,
  radius = c.camera.radius,
) {
  const direction = desired.clone().sub(pivot),
    length = direction.length();
  if (!length) return desired.clone();
  direction.normalize();
  const ray = new T.Ray(pivot, direction);
  let distance = length;
  for (const obstacle of obstacles) {
    const box = radius ? obstacle.clone().expandByScalar(radius) : obstacle;
    if (box.containsPoint(pivot)) continue;
    const hit = ray.intersectBox(box, new T.Vector3());
    if (hit)
      distance = Math.min(
        distance,
        Math.max(0.05, pivot.distanceTo(hit) - 0.08),
      );
  }
  return pivot.clone().addScaledVector(direction, distance);
}
export function createCamera({ obstacles = [] } = {}) {
  const camera = new T.PerspectiveCamera(c.camera.fov, 1, 0.08, 100),
    anchor = new T.Vector3(),
    anchorVelocity = new T.Vector3();
  const expandedObstacles = obstacles.map((box) =>
    box.clone().expandByScalar(c.camera.radius),
  );
  let initialized = false,
    viewYaw = 0,
    turnVelocity = 0,
    distance = c.camera.distance,
    avoidAngle = 0,
    boomHeight = c.camera.height,
    lookHeight = c.camera.lookHeight;
  return {
    camera,
    update(w, h, shot, dt) {
      dt = Math.min(0.05, Math.max(0, dt));
      const p = shot.player,
        portrait = w / h < 1.25;
      camera.aspect = w / h;
      camera.fov = portrait ? 70 : c.camera.fov;
      camera.setViewOffset(w, h, portrait ? -w * 0.035 : -w * 0.075, 0, w, h);
      camera.updateProjectionMatrix();
      const target = new T.Vector3(p.x, 0, p.z),
        yaw = shot.bodyYaw ?? shot.aim.yaw;
      if (!initialized) {
        anchor.copy(target);
        viewYaw = yaw;
      } else {
        const force = target
          .clone()
          .sub(anchor)
          .multiplyScalar(70)
          .addScaledVector(anchorVelocity, -17);
        anchorVelocity.addScaledVector(force, dt);
        if (anchorVelocity.length() > 8) anchorVelocity.setLength(8);
        anchor.addScaledVector(anchorVelocity, dt);
        const delta = Math.atan2(
            Math.sin(yaw - viewYaw),
            Math.cos(yaw - viewYaw),
          ),
          desired = clamp(delta * 9, -3.8, 3.8);
        turnVelocity += clamp(desired - turnVelocity, -12 * dt, 12 * dt);
        const step = turnVelocity * dt;
        if (step * delta > 0 && Math.abs(step) > Math.abs(delta)) {
          viewYaw += delta;
          turnVelocity = 0;
        } else viewYaw += step;
      }
      const flight =
        shot.phase === "flight" ? clamp((shot.ball.y - 4) * 0.18, 0, 0.7) : 0;
      distance +=
        (c.camera.distance + flight - distance) * (1 - Math.exp(-dt * 4));
      const pivot = new T.Vector3(p.x, 1.5, p.z),
        boxes = [...expandedObstacles];
      if (shot.companion)
        boxes.push(
          new T.Box3(
            new T.Vector3(shot.companion.x - 0.34, 0, shot.companion.z - 0.34),
            new T.Vector3(
              shot.companion.x + 0.34,
              2.05,
              shot.companion.z + 0.34,
            ),
          ).expandByScalar(c.camera.radius),
        );
      function candidate(angle, height = c.camera.height) {
        const a = viewYaw + angle;
        return new T.Vector3(
          anchor.x - Math.sin(a) * distance + Math.cos(a) * c.camera.shoulder,
          height,
          anchor.z - Math.cos(a) * distance - Math.sin(a) * c.camera.shoulder,
        );
      }
      let best = { angle: 0, height: c.camera.height, score: -Infinity };
      for (const angle of [0, -0.35, 0.35, -0.7, 0.7, -1, 1])
        for (const height of [c.camera.height, c.camera.height + 0.65]) {
          const safe = sweepCamera(pivot, candidate(angle, height), boxes, 0),
            horizontal = Math.hypot(safe.x - p.x, safe.z - p.z);
          const score =
            Math.min(horizontal, c.camera.distance) -
            Math.abs(angle) * 1.2 -
            Math.abs(angle - avoidAngle) * 0.3 -
            (height - c.camera.height) * 0.7;
          if (score > best.score) best = { angle, height, score };
        }
      avoidAngle += (best.angle - avoidAngle) * (1 - Math.exp(-dt * 12));
      boomHeight += (best.height - boomHeight) * (1 - Math.exp(-dt * 8));
      let position = sweepCamera(
        pivot,
        candidate(avoidAngle, boomHeight),
        boxes,
        0,
      );
      if (
        Math.hypot(position.x - p.x, position.z - p.z) < c.camera.minDistance
      ) {
        avoidAngle = best.angle;
        position = sweepCamera(
          pivot,
          candidate(best.angle, best.height),
          boxes,
          0,
        );
      }
      // A third-person safety envelope also covers a control handoff near the camera.
      let dx = position.x - p.x,
        dz = position.z - p.z,
        horizontal = Math.hypot(dx, dz);
      if (horizontal < c.camera.minDistance) {
        if (horizontal < 0.001) {
          dx = -Math.sin(viewYaw);
          dz = -Math.cos(viewYaw);
          horizontal = 1;
        }
        position.x = p.x + (dx / horizontal) * c.camera.minDistance;
        position.z = p.z + (dz / horizontal) * c.camera.minDistance;
      }
      position.y = Math.max(2.45, position.y);
      camera.position.copy(position);
      const lookAhead =
        c.camera.lookAhead * Math.max(0.2, Math.cos(avoidAngle) ** 2);
      const targetHeight =
        c.camera.lookHeight + (shot.aim.angle - c.angle) * 0.5 + flight * 0.22;
      lookHeight += (targetHeight - lookHeight) * (1 - Math.exp(-dt * 10));
      camera.lookAt(
        anchor.x + Math.sin(viewYaw) * lookAhead,
        lookHeight,
        anchor.z + Math.cos(viewYaw) * lookAhead,
      );
      initialized = true;
    },
  };
}

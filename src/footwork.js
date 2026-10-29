// Each stance foot stays at its world-space contact point until its next step.
const clamp = (t) => Math.max(0, Math.min(1, t));
const smooth = (t) => {
  t = clamp(t);
  return t * t * (3 - 2 * t);
};
const smoother = (t) => {
  t = clamp(t);
  return t * t * t * (t * (t * 6 - 15) + 10);
};
const lerp = (a, b, t) => a + (b - a) * t;
export class Footwork {
  constructor() {
    this.feet = [{ side: -1 }, { side: 1 }];
    this.nextFoot = 1;
  }
  update(dt, player, yaw, movement) {
    const vx = movement?.vx ?? 0,
      vz = movement?.vz ?? 0,
      speed = Math.hypot(vx, vz);
    const home = (foot) => ({
      x: player.x + Math.cos(yaw) * foot.side * 0.12,
      z: player.z - Math.sin(yaw) * foot.side * 0.12,
    });
    for (const foot of this.feet) {
      if (
        !foot.position ||
        Math.hypot(foot.position.x - player.x, foot.position.z - player.z) > 1.2
      ) {
        foot.position = { ...home(foot), y: 0 };
        foot.yaw = yaw;
        foot.pitch = 0;
        foot.swing = null;
      }
    }
    if (!this.feet.some((f) => f.swing)) {
      let index = this.nextFoot,
        settle = false;
      if (speed > 0.08) {
        const behind = this.feet.map(
          (f) =>
            ((player.x - f.position.x) * vx + (player.z - f.position.z) * vz) /
            speed,
        );
        if (Math.abs(behind[0] - behind[1]) > 0.01)
          index = behind[0] > behind[1] ? 0 : 1;
      }
      if (speed <= 0.08) {
        index = this.feet.findIndex((f) => {
          const h = home(f);
          return (
            Math.hypot(f.position.x - h.x, f.position.z - h.z) > 0.065 ||
            Math.abs(Math.atan2(Math.sin(yaw - f.yaw), Math.cos(yaw - f.yaw))) >
              0.35
          );
        });
        settle = true;
      }
      if (index >= 0) {
        const foot = this.feet[index],
          behind =
            ((player.x - foot.position.x) * vx +
              (player.z - foot.position.z) * vz) /
            Math.max(0.001, speed);
        if (settle || behind > 0.025) {
          foot.swing = {
            start: { ...foot.position },
            time: 0,
            duration: settle
              ? 0.2
              : 0.215 +
                0.035 * (1 - Math.min(1, speed / 3.4)) +
                0.015 * (movement?.gait?.strafe ?? 0),
            settle,
            target: { ...home(foot) },
            startYaw: foot.yaw,
            targetYaw: yaw,
            lift: settle
              ? 0.035
              : 0.035 +
                0.065 * (movement?.gait?.run ?? Math.min(1, speed / 3.4)) +
                0.02 * (movement?.gait?.trot ?? 0),
          };
          this.nextFoot = 1 - index;
        }
      }
    }
    for (const foot of this.feet) {
      if (!foot.swing) continue;
      const swing = foot.swing;
      swing.time += dt;
      const t = clamp(swing.time / swing.duration),
        s = smoother(t),
        h = home(foot),
        remaining = Math.max(0, swing.duration - swing.time),
        lead = swing.settle ? 0 : 0.11;
      const ax = movement?.ax ?? 0,
        az = movement?.az ?? 0;
      const prediction = {
        x:
          h.x +
          vx * (remaining + lead) +
          ax * (0.5 * remaining * remaining + remaining * lead),
        z:
          h.z +
          vz * (remaining + lead) +
          az * (0.5 * remaining * remaining + remaining * lead),
      };
      if (swing.time <= dt) {
        swing.target = prediction;
        swing.targetYaw = yaw;
      }
      const correction =
        (1 - smooth((t - 0.4) / 0.3)) * (1 - Math.exp(-dt * 15));
      swing.target.x = lerp(swing.target.x, prediction.x, correction);
      swing.target.z = lerp(swing.target.z, prediction.z, correction);
      swing.targetYaw +=
        Math.atan2(
          Math.sin(yaw - swing.targetYaw),
          Math.cos(yaw - swing.targetYaw),
        ) * correction;
      foot.position = {
        x: lerp(swing.start.x, swing.target.x, s),
        y: Math.sin(Math.PI * t) ** 2 * swing.lift,
        z: lerp(swing.start.z, swing.target.z, s),
      };
      foot.yaw =
        swing.startYaw +
        Math.atan2(
          Math.sin(swing.targetYaw - swing.startYaw),
          Math.cos(swing.targetYaw - swing.startYaw),
        ) *
          s;
      foot.pitch = Math.max(
        -foot.position.y / 0.16,
        Math.min(foot.position.y / 0.16, -0.16 * Math.sin(t * Math.PI * 2)),
      );
      if (t === 1) {
        foot.position.y = 0;
        foot.yaw = swing.targetYaw;
        foot.pitch = 0;
        foot.swing = null;
      }
    }
    return this.feet;
  }
}

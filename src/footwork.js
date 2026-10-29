// Each stance foot stays at its world-space contact point until its next step.
const clamp = (t) => Math.max(0, Math.min(1, t));
const smooth = (t) => {
  t = clamp(t);
  return t * t * (3 - 2 * t);
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
              ? 0.18
              : 0.22 + 0.03 * (1 - Math.min(1, speed / 3.4)),
            settle,
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
        s = smooth(t),
        h = home(foot),
        lead = swing.settle ? 0 : 0.11;
      foot.position = {
        x: lerp(swing.start.x, h.x + vx * lead, s),
        y: Math.sin(Math.PI * t) * (swing.settle ? 0.045 : 0.105),
        z: lerp(swing.start.z, h.z + vz * lead, s),
      };
      foot.yaw +=
        Math.atan2(Math.sin(yaw - foot.yaw), Math.cos(yaw - foot.yaw)) *
        Math.min(1, dt * 14);
      if (t === 1) {
        foot.position.y = 0;
        foot.yaw = yaw;
        foot.swing = null;
      }
    }
    return this.feet;
  }
}

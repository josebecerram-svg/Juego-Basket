import { config as c } from "./config.js";
export function bindControls(button, shot, canvas, movement) {
  const yaw = document.querySelector("#direction"),
    angle = document.querySelector("#angle");
  yaw.min = -180;
  yaw.max = 180;
  angle.min = (c.minAngle * 180) / Math.PI;
  angle.max = (c.maxAngle * 180) / Math.PI;
  let owner = null;
  function setAim() {
    if (shot.phase === "windup") return;
    shot.aim.yaw = (Number(yaw.value) * Math.PI) / 180;
    shot.aim.angle = (Number(angle.value) * Math.PI) / 180;
  }
  yaw.addEventListener("input", setAim);
  angle.addEventListener("input", setAim);
  function point(e) {
    if (shot.phase === "windup") return;
    const r = canvas.getBoundingClientRect();
    // Screen-right is court -X because the third-person view looks toward +Z.
    shot.aim.yaw =
      -(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) - 0.5) *
      Math.PI *
      2;
    shot.aim.angle =
      c.maxAngle -
      Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)) *
        (c.maxAngle - c.minAngle);
  }
  canvas.addEventListener("pointermove", point);
  for (const surface of [canvas, button]) {
    surface.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || owner !== null) return;
      if (surface === canvas) {
        canvas.focus({ preventScroll: true });
        point(e);
      }
      if (shot.charge()) {
        owner = { surface, id: e.pointerId };
        surface.setPointerCapture(e.pointerId);
        e.preventDefault();
      }
    });
    surface.addEventListener("pointerup", (e) => {
      if (owner?.surface === surface && owner.id === e.pointerId) {
        shot.release();
        owner = null;
      }
    });
    surface.addEventListener("pointercancel", () => {
      shot.cancel();
      owner = null;
    });
    surface.addEventListener("lostpointercapture", () => {
      if (owner?.surface === surface) {
        shot.cancel();
        owner = null;
      }
    });
  }
  const isInput = (e) =>
    e.target instanceof HTMLElement &&
    !!e.target.closest("input,button,a,textarea,select,[contenteditable]");
  window.addEventListener("keydown", (e) => {
    if (isInput(e)) return;
    if (Object.values(c.controls).includes(e.code)) {
      movement.keys.add(e.code);
      e.preventDefault();
    }
  });
  window.addEventListener("keyup", (e) => movement.keys.delete(e.code));
  button.addEventListener("keydown", (e) => {
    if ([" ", "Enter"].includes(e.key) && !e.repeat) {
      e.preventDefault();
      shot.charge();
    }
  });
  button.addEventListener("keyup", (e) => {
    if ([" ", "Enter"].includes(e.key)) {
      e.preventDefault();
      shot.release();
    }
  });
  function clear() {
    movement.clear();
    shot.cancel();
    owner = null;
  }
  window.addEventListener("blur", clear);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) clear();
  });
  return () => {
    button.disabled = !["ready", "charging"].includes(shot.phase);
    yaw.disabled = angle.disabled = shot.phase === "windup";
    yaw.value = Math.round((shot.aim.yaw * 180) / Math.PI);
    angle.value = Math.round((shot.aim.angle * 180) / Math.PI);
    document.querySelector("#direction-value").textContent = yaw.value + "°";
    document.querySelector("#angle-value").textContent = angle.value + "°";
  };
}

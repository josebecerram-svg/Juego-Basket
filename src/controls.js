import { config as c } from "./config.js";
export function bindControls(button, shot, canvas) {
  const yaw = document.querySelector("#direction"),
    angle = document.querySelector("#angle");
  yaw.min = -Math.round((c.maxYaw * 180) / Math.PI);
  yaw.max = Math.round((c.maxYaw * 180) / Math.PI);
  angle.min = Math.round((c.minAngle * 180) / Math.PI);
  angle.max = Math.round((c.maxAngle * 180) / Math.PI);
  function aim() {
    shot.aim.yaw = (Number(yaw.value) * Math.PI) / 180;
    shot.aim.angle = (Number(angle.value) * Math.PI) / 180;
    document.querySelector("#direction-value").textContent = yaw.value + "°";
    document.querySelector("#angle-value").textContent = angle.value + "°";
  }
  yaw.oninput = angle.oninput = aim;
  canvas.addEventListener("pointerdown", (e) => {
    if (shot.phase !== "ready") return;
    canvas.setPointerCapture(e.pointerId);
    point(e);
  });
  function point(e) {
    if (shot.phase !== "ready") return;
    const r = canvas.getBoundingClientRect();
    yaw.value = Math.round(
      ((e.clientX - r.left) / r.width - 0.5) *
        (Number(yaw.max) - Number(yaw.min)),
    );
    angle.value = Math.round(
      Number(angle.max) -
        ((e.clientY - r.top) / r.height) *
          (Number(angle.max) - Number(angle.min)),
    );
    aim();
  }
  canvas.addEventListener("pointermove", (e) => {
    if (canvas.hasPointerCapture(e.pointerId)) point(e);
  });
  button.addEventListener("pointerdown", (e) => {
    if (shot.charge()) {
      button.setPointerCapture(e.pointerId);
      e.preventDefault();
    }
  });
  button.addEventListener("pointerup", () => shot.release());
  button.addEventListener("pointercancel", () => shot.cancel());
  button.addEventListener("keydown", (e) => {
    if ((e.key === " " || e.key === "Enter") && !e.repeat) {
      e.preventDefault();
      shot.charge();
    }
  });
  button.addEventListener("keyup", (e) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      shot.release();
    }
  });
  window.addEventListener("blur", () => shot.cancel());
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) shot.cancel();
  });
  return () => {
    const busy = !["ready", "charging"].includes(shot.phase);
    button.disabled = busy;
    yaw.disabled = angle.disabled = shot.phase !== "ready";
    document.querySelector("#power").value = shot.power;
    document.querySelector("#power-value").textContent =
      Math.round(shot.power * 100) + " %";
  };
}

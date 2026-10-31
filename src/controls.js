import { mouseAim, wrapYaw } from "./aim.js";
import { config as c } from "./config.js";
export function bindControls(button, shot, canvas) {
  const yaw = document.querySelector("#direction"),
    angle = document.querySelector("#angle");
  yaw.min = -180;
  yaw.max = 180;
  angle.min = (c.minAngle * 180) / Math.PI;
  angle.max = (c.maxAngle * 180) / Math.PI;
  let owner = null;
  function setAim() {
    if (shot.paused || shot.phase === "windup" || shot.dunk?.active) return;
    shot.aim.yaw = (Number(yaw.value) * Math.PI) / 180;
    shot.aim.angle = (Number(angle.value) * Math.PI) / 180;
  }
  yaw.addEventListener("input", setAim);
  angle.addEventListener("input", setAim);
  let lastPoint = null;
  function point(e) {
    const locked = document.pointerLockElement === canvas;
    if (lastPoint || locked)
      mouseAim(
        shot,
        locked ? e.movementX : e.clientX - lastPoint.x,
        locked ? e.movementY : e.clientY - lastPoint.y,
      );
    lastPoint = { x: e.clientX, y: e.clientY };
  }
  canvas.addEventListener("mousemove", point);
  canvas.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") point(e);
  });
  canvas.addEventListener("mouseleave", () => {
    if (document.pointerLockElement !== canvas) lastPoint = null;
  });
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  canvas.addEventListener("mousedown", (e) => {
    if (e.button === 2) {
      e.preventDefault();
      canvas.focus({ preventScroll: true });
      shot.toggleHoopLock();
    }
  });
  const capture = document.querySelector("#mouse-lock");
  capture?.addEventListener("click", async () => {
    if (document.pointerLockElement === canvas) {
      document.exitPointerLock();
      return;
    }
    try {
      await canvas.requestPointerLock();
      canvas.focus();
    } catch {
      shot.notify(
        "No se pudo capturar el mouse. Puedes orientar la vista sobre la cancha.",
      );
    }
  });
  let wasLocked = false;
  document.addEventListener("pointerlockchange", () => {
    if (wasLocked && document.pointerLockElement !== canvas && !shot.paused)
      shot.togglePause?.();
    wasLocked = document.pointerLockElement === canvas;
    lastPoint = null;
    if (capture)
      capture.textContent =
        document.pointerLockElement === canvas
          ? "Esc · liberar mouse"
          : "Capturar mouse · 360°";
  });
  for (const surface of [canvas, button]) {
    surface.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || owner !== null) return;
      if (surface === canvas) {
        canvas.focus({ preventScroll: true });
        if (!lastPoint) lastPoint = { x: e.clientX, y: e.clientY };
      }
      if (shot.charge()) {
        owner = { surface, id: e.pointerId };
        surface.setPointerCapture(e.pointerId);
        e.preventDefault();
      }
    });
    surface.addEventListener("pointerup", (e) => {
      if (e.button !== 0) return;
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
  // Mouse buttons share a pointer ID; a right-button release must never release a left-button charge.
  window.addEventListener("mouseup", (e) => {
    if (e.button === 0 && (owner || shot.phase === "charging")) {
      shot.release();
      owner = null;
    }
  });
  for (const surface of [canvas, button])
    surface.addEventListener("mousedown", (e) => {
      if (e.button !== 0 || owner !== null) return;
      if (surface === canvas) {
        canvas.focus({ preventScroll: true });
        if (!lastPoint) lastPoint = { x: e.clientX, y: e.clientY };
      }
      if (shot.charge()) {
        owner = { surface, id: null };
        e.preventDefault();
      }
    });
  document
    .querySelector("#pass")
    .addEventListener("click", () => shot.tapPass());
  const isInput = (e) =>
    e.target instanceof HTMLElement &&
    !!e.target.closest("input,button,a,textarea,select,[contenteditable]");
  window.addEventListener("keydown", (e) => {
    if (e.code === "Escape" && !e.repeat && shot.togglePause) {
      e.preventDefault();
      shot.togglePause();
      if (document.pointerLockElement === canvas) document.exitPointerLock();
      return;
    }
    if (shot.paused) return;
    if (e.code === "Enter" && shot.phase === "out") {
      e.preventDefault();
      shot.inbound();
      return;
    }
    if (
      e.code === c.controls.pass &&
      !e.repeat &&
      (!isInput(e) || e.target.id === "pass")
    ) {
      e.preventDefault();
      shot.tapPass();
      return;
    }
    if (isInput(e)) return;
    if ([c.controls.jump, c.controls.fake, c.controls.lob].includes(e.code)) {
      e.preventDefault();
      if (e.repeat) return;
      if (e.code === c.controls.jump) shot.requestJump();
      if (e.code === c.controls.fake) shot.requestFake();
      if (e.code === c.controls.lob) shot.requestPass("overhead");
      return;
    }
    if (Object.values(c.controls).includes(e.code)) {
      shot.inputKeys.add(e.code);
      e.preventDefault();
    }
  });
  window.addEventListener("keyup", (e) => shot.inputKeys.delete(e.code));
  function clear() {
    shot.inputKeys.clear();
    shot.movement.clear();
    shot.companionMovement.clear();
    shot.cancel();
    owner = null;
    lastPoint = null;
  }
  window.addEventListener("blur", clear);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) clear();
  });
  return () => {
    button.disabled =
      shot.paused ||
      !!shot.dunk?.active ||
      (shot.defenders && !shot.hasBall
        ? shot.phase === "out"
        : !["ready", "charging", "fake", "fakeReturn", "dunkCharge"].includes(
            shot.phase,
          ));
    yaw.disabled =
      shot.phase === "windup" || !!shot.aimLock || !!shot.dunk?.active;
    angle.disabled = shot.phase === "windup" || !!shot.dunk?.active;
    yaw.value = Math.round((wrapYaw(shot.aim.yaw) * 180) / Math.PI);
    angle.value = Math.round((shot.aim.angle * 180) / Math.PI);
    document.querySelector("#direction-value").textContent = yaw.value + "°";
    document.querySelector("#angle-value").textContent = angle.value + "°";
  };
}

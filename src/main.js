import { createHud } from "./hud.js";
import { Movement } from "./movement.js";
import { config as c } from "./config.js";
import { Practice } from "./practice.js";
import { createScene } from "./scene.js";
import { bindControls } from "./controls.js";
const canvas = document.querySelector("canvas"),
  shot = new Practice();
const movement = new Movement(shot.player);
shot.movement = movement;
try {
  const scene = createScene(canvas),
    updateControls = bindControls(
      document.querySelector("#shoot"),
      shot,
      canvas,
      movement,
    );
  const updateHud = createHud();
  let last = performance.now(),
    accumulator = 0;
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.1);
    accumulator += dt;
    last = now;
    while (accumulator >= 1 / 240) {
      movement.yaw = shot.phase === "windup" ? shot.launch.yaw : shot.aim.yaw;
      movement.facingTarget =
        shot.pass && ["passWindup", "passing", "receive"].includes(shot.phase)
          ? Math.atan2(
              shot.companion.x - shot.player.x,
              shot.companion.z - shot.player.z,
            )
          : undefined;
      movement.step(1 / 240, shot.phase);
      shot.bodyYaw = movement.bodyYaw;
      shot.targetHoop = c.baskets.reduce(
        (best, b) =>
          Math.hypot(b.hoop.x - shot.player.x, b.hoop.z - shot.player.z) <
          Math.hypot(best.x - shot.player.x, best.z - shot.player.z)
            ? b.hoop
            : best,
        c.hoop,
      );
      shot.step(1 / 240);
      accumulator -= 1 / 240;
    }
    updateControls();
    updateHud(shot);
    document.querySelector("#hint").textContent =
      shot.notice ||
      (shot.phase === "companionHold"
        ? "Silva tiene el balón. Pulsa E para pedir la devolución."
        : ["passing", "passWindup", "receive"].includes(shot.phase)
          ? "Pase en curso · Espera a la recepción."
          : shot.phase === "ready"
            ? "WASD para moverte · Mouse para apuntar · Mantén clic izquierdo y suelta."
            : shot.phase === "charging"
              ? "Suelta el clic izquierdo o Lanzar para tirar."
              : "Espera a que termine el intento.");
    scene.render(shot, dt);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
} catch (e) {
  document.querySelector(".feedback").textContent =
    "No se pudo iniciar WebGL. Prueba un navegador con aceleración gráfica.";
  document.querySelector("#shoot").disabled = true;
  console.error(e);
}

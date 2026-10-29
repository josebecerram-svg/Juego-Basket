import { createHud } from "./hud.js";
import { Movement } from "./movement.js";
import { config as c } from "./config.js";
import { Shot } from "./physics.js";
import { createScene } from "./scene.js";
import { bindControls } from "./controls.js";
const canvas = document.querySelector("canvas"),
  shot = new Shot();
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
      movement.yaw = shot.aim.yaw;
      movement.step(1 / 240, shot.phase);
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
      shot.phase === "ready"
        ? "WASD para moverte · Mouse para apuntar · Mantén clic izquierdo y suelta."
        : shot.phase === "charging"
          ? "Suelta el clic izquierdo o Lanzar para tirar."
          : "Espera a que termine el intento.";
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

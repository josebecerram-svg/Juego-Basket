import { createHud } from "./hud.js";
import { config as c } from "./config.js";
import { Practice } from "./practice.js";
import { createScene } from "./scene.js";
import { bindControls } from "./controls.js";
const canvas = document.querySelector("canvas"),
  shot = new Practice();

try {
  const scene = createScene(canvas),
    updateControls = bindControls(
      document.querySelector("#shoot"),
      shot,
      canvas,
    );
  const updateHud = createHud();
  let last = performance.now(),
    accumulator = 0;
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.1);
    accumulator += dt;
    last = now;
    while (accumulator >= 1 / 240) {
      shot.updateMovement(1 / 240);
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
      (["passing", "passWindup", "receive"].includes(shot.phase)
        ? "El control cambia solo después de recibir el balón."
        : shot.phase === "passMiss"
          ? "Pase no recibido. Se conserva el jugador controlado."
          : shot.phase === "ready"
            ? "Shift correr · Ctrl proteger · Espacio saltar · F amagar · E / EE / Q pasar."
            : ["fake", "fakeReturn"].includes(shot.phase)
              ? "Amague sin suelta · F cancela · clic prepara el tiro."
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

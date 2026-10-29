import { Shot } from "./physics.js";
import { createScene } from "./scene.js";
import { bindControls } from "./controls.js";
const canvas = document.querySelector("canvas"),
  shot = new Shot();
try {
  const scene = createScene(canvas),
    updateControls = bindControls(
      document.querySelector("#shoot"),
      shot,
      canvas,
    );
  let last = performance.now(),
    accumulator = 0;
  function frame(now) {
    accumulator += Math.min((now - last) / 1000, 0.1);
    last = now;
    while (accumulator >= 1 / 240) {
      shot.step(1 / 240);
      accumulator -= 1 / 240;
    }
    updateControls();
    document.querySelector(".feedback").textContent =
      shot.result ??
      {
        ready: "Listo para lanzar",
        charging: "Cargando potencia…",
        windup: "Preparando el tiro…",
        flight: "Balón en el aire…",
      }[shot.phase];
    document.querySelector("#hint").textContent =
      shot.phase === "ready"
        ? "Apunta, mantén Lanzar y suelta para tirar."
        : shot.phase === "charging"
          ? "Suelta Lanzar para soltar el balón."
          : "Espera a que termine el intento.";
    scene.render(shot);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
} catch (e) {
  document.querySelector(".feedback").textContent =
    "No se pudo iniciar WebGL. Prueba un navegador con aceleración gráfica.";
  document.querySelector("#shoot").disabled = true;
  console.error(e);
}

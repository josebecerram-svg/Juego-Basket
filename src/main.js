import { createHud } from "./hud.js";
import { config as c } from "./config.js";
import { Match } from "./match.js";
import { createScene } from "./scene.js";
import { bindControls } from "./controls.js";
const canvas = document.querySelector("canvas"),
  shot = new Match();

try {
  const scene = createScene(canvas),
    updateControls = bindControls(
      document.querySelector("#shoot"),
      shot,
      canvas,
    );
  const updateHud = createHud();
  document.querySelector("#resume").addEventListener("click", () => {
    if (shot.paused) shot.togglePause();
    canvas.focus();
  });
  document.querySelector("#practice").addEventListener("click", () => {
    shot.exitToPractice();
    canvas.focus();
  });
  document.querySelector("#inbound").addEventListener("click", () => {
    shot.inbound();
    canvas.focus();
  });
  let last = performance.now(),
    accumulator = 0;
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.1);
    document.querySelector("#pause-menu").hidden = !shot.paused;
    document.querySelector("#out-menu").hidden =
      shot.phase !== "out" || shot.paused;
    document.querySelector("#mode-label").textContent = shot.practiceMode
      ? "PRÁCTICA LIBRE"
      : "2 CONTRA 2 · ROJO / AZUL";
    document.querySelector("#opponent-score").textContent =
      "RIVAL " + String(shot.opponentPoints).padStart(2, "0");
    if (shot.paused) {
      last = now;
      accumulator = 0;
      requestAnimationFrame(frame);
      return;
    }
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
            ? "Shift + Espacio en pintura: clavada automática · Esc: pausa."
            : ["fake", "fakeReturn"].includes(shot.phase)
              ? "Amague sin suelta · F cancela · clic prepara el tiro."
              : shot.phase === "charging"
                ? "Suelta el clic izquierdo o Lanzar para tirar."
                : "Espera a que termine el intento.");
    scene.render(shot, shot.phase === "out" ? 0 : dt);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
} catch (e) {
  document.querySelector(".feedback").textContent =
    "No se pudo iniciar WebGL. Prueba un navegador con aceleración gráfica.";
  document.querySelector("#shoot").disabled = true;
  console.error(e);
}

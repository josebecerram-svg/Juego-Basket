import { config as c } from "./config.js";
export function powerFeedback(shot) {
  const frozen =
    ["windup", "flight", "result"].includes(shot.phase) && shot.launch;
  const origin = frozen
    ? shot.launch.origin
    : {
        x: shot.player.x + Math.sin(shot.aimYaw()) * 0.38,
        y: c.initial.y,
        z: shot.player.z + Math.cos(shot.aimYaw()) * 0.38,
      };
  const hoop = (frozen ? shot.launch.hoop : shot.targetHoop) ?? c.hoop,
    d = Math.hypot(hoop.x - origin.x, hoop.z - origin.z),
    a = frozen ? shot.launch.angle : shot.aim.angle;
  const denom = 2 * Math.cos(a) ** 2 * (d * Math.tan(a) - (hoop.y - origin.y));
  const ideal =
    denom > 0
      ? (Math.sqrt((c.gravity * d * d) / denom) - c.minForce) /
        (c.maxForce - c.minForce)
      : NaN;
  const reachable = Number.isFinite(ideal) && ideal >= 0 && ideal <= 1;
  const low = reachable ? Math.max(0, ideal - 0.025) : 1,
    high = reachable ? Math.min(1, ideal + 0.025) : 1;
  return {
    low,
    high,
    reachable,
    zone:
      shot.power < low
        ? "low"
        : shot.power <= high && reachable
          ? "ideal"
          : "high",
  };
}
export function createHud() {
  const $ = (s) => document.querySelector(s),
    bar = $("#power-fill"),
    meter = $("#power"),
    card = $(".player-hud"),
    band = $("#ideal-band");
  return (shot) => {
    $("#controlled-name").textContent = shot.player.fullName;
    $("#controlled-number").textContent = shot.player.number;
    $("#score-player-name").textContent = shot.player.name;
    $("#score-jersey").textContent = shot.player.number;
    const p = powerFeedback(shot),
      stats = shot.stats;
    $("#score").textContent = String(stats.points).padStart(2, "0");
    $("#made").textContent = stats.made;
    $("#attempts").textContent = stats.attempts;
    $("#last-result").textContent = stats.lastResult ?? "Sin lanzamientos";
    $("#last-result").dataset.result =
      stats.lastResult === "¡Canasta!"
        ? "made"
        : stats.lastResult === "Fallaste"
          ? "miss"
          : "none";
    bar.style.width = shot.power * 100 + "%";
    card.dataset.zone = p.zone;
    band.hidden = !p.reachable;
    band.style.left = p.low * 100 + "%";
    band.style.width = (p.high - p.low) * 100 + "%";
    meter.setAttribute("aria-valuenow", Math.round(shot.power * 100));
    $("#power-value").textContent = Math.round(shot.power * 100) + "%";
    $("#power-state").textContent = [
      "passWindup",
      "passing",
      "receive",
    ].includes(shot.phase)
      ? "PASE EN CURSO"
      : shot.phase === "passMiss"
        ? "RECUPERANDO BALÓN"
        : shot.phase === "charging"
          ? {
              low: "POTENCIA BAJA",
              ideal: "ZONA IDEAL",
              high: "POTENCIA EXCESIVA",
            }[p.zone]
          : shot.phase === "ready"
            ? "LISTO PARA LANZAR"
            : "POTENCIA DEL TIRO";
    $(".feedback").textContent =
      (shot.scored ? "¡Canasta!" : shot.result) ??
      {
        ready: "Encuentra tu tiro",
        charging: "Cargando tiro",
        windup: "Lanzando",
        flight: "Balón en juego",
        passWindup: "Preparando pase",
        passing: "Pase en vuelo",
        receive: "Recibiendo el balón",
        passMiss: "Pase no recibido",
      }[shot.phase];
    $("#possession").textContent =
      shot.possession === "player"
        ? shot.player.number + " · " + shot.player.name
        : shot.possession === "companion"
          ? shot.companion.number + " · " + shot.companion.name
          : "BALÓN EN VUELO";
    $("#pass-action").textContent = "Pasar";
    $("#pass-status").textContent =
      shot.notice ||
      (shot.phase === "ready"
        ? "E — Pasar"
        : shot.phase === "receive"
          ? "Recepción · cambio de control"
          : "Pase no disponible");
    $(".possession-hud").dataset.owner = shot.possession;
    $(".game").dataset.phase = shot.phase;
    $(".game").dataset.result = shot.scored
      ? "made"
      : shot.result
        ? "miss"
        : "none";
  };
}

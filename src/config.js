export const config = {
  court: { halfWidth: 7.5, minZ: -22.2, maxZ: 5.8 },
  movement: { speed: 3.4, acceleration: 12, margin: 0.35 },
  controls: { forward: "KeyW", left: "KeyA", backward: "KeyS", right: "KeyD" },
  gravity: 9.81,
  angle: (55 * Math.PI) / 180,
  minForce: 4.8,
  maxForce: 10.8,
  chargeSeconds: 1.6,
  initial: { x: 0, y: 2.1, z: 0 },
  player: { x: 0, z: -0.38 },
  ballRadius: 0.12,
  restitution: 0.65,
  hoop: { x: 0, y: 3.05, z: 4.3, radius: 0.225, tube: 0.02 },
  board: { z: 4.72, bottom: 2.9, top: 3.95, halfWidth: 0.9 },
  windup: 0.28,
  resetDelay: 1.3,
  maxFlight: 6,
  maxYaw: Math.PI,
  minAngle: (40 * Math.PI) / 180,
  maxAngle: (70 * Math.PI) / 180,
};

config.baskets = [
  { hoop: config.hoop, board: config.board },
  { hoop: { ...config.hoop, z: -20.7 }, board: { ...config.board, z: -21.12 } },
];

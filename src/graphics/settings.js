// All asset paths are local and resolved relative to this module, including on GitHub Pages.
function asset(path) {
  const url = new URL(path, import.meta.url);
  const version =
    typeof document === "undefined"
      ? null
      : document.documentElement.dataset.build;
  if (version) url.searchParams.set("v", version);
  return url.href;
}
export const graphics = {
  model: asset("../../assets/characters/human-demo.glb"),
  locomotion: asset("../../assets/characters/soldier-demo.glb"),
  environment: asset("../../assets/environment/arena.hdr"),
  // Replace these aliases with the clip names exported by your sports animation library.
  clips: {
    Idle: "Idle",
    Run: "Run",
    Jump: "Jump",
    Shot: "Shot",
    Dunk: "Dunk",
    Pass: "Pass",
    Defense: "Defense",
  },
  // Map non-Mixamo bone names to canonical names (LeftArm, LeftForeArm, LeftHand, etc.).
  boneMap: {},
  exposure: 1.2,
  profiles: {
    high: {
      pixelRatio: 1.5,
      shadow: 4096,
      reflection: 1024,
      reflectionEvery: 1,
      ao: true,
      aoScale: 0.65,
      bloom: true,
      crowdRows: 10,
    },
    balanced: {
      pixelRatio: 1.25,
      shadow: 2048,
      reflection: 512,
      reflectionEvery: 2,
      ao: true,
      aoScale: 0.5,
      bloom: true,
      crowdRows: 7,
    },
    low: {
      pixelRatio: 0.75,
      shadow: 1024,
      reflection: 0,
      reflectionEvery: 4,
      ao: false,
      aoScale: 0.5,
      bloom: false,
      crowdRows: 4,
    },
  },
};
export function animationState(shot) {
  if (shot.dunk?.active) return "Dunk";
  if (shot.motion?.jumpStage !== "ground" && shot.motion?.jumpStage)
    return "Jump";
  if (["charging", "windup"].includes(shot.phase)) return "Shot";
  if (["passing", "passWindup", "receive"].includes(shot.phase)) return "Pass";
  if (shot.defending || shot.passPose?.spread > 0.3 || shot.motion?.guard > 0.3)
    return "Defense";
  return Math.hypot(shot.movement?.vx ?? 0, shot.movement?.vz ?? 0) > 0.25
    ? "Run"
    : "Idle";
}

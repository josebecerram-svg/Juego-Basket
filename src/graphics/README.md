# Graphics integration

The graphics layer reads game snapshots; it never moves gameplay actors, changes possession, or registers gameplay controls. `src/main.js` still runs `Match.updateMovement()` and `Match.step()` at 240 Hz, then renders the resulting state. Escape pauses before updating either graphics or simulation.

```js
import { createScene } from '../scene.js';
const presentation = await createScene(canvas);
// In your existing frame loop, after simulating the game:
presentation.render(game, deltaSeconds);
```

## Modules

| Module | Responsibility |
| --- | --- |
| `settings.js` | Local GLB/HDR URLs, clip aliases, bone aliases and graphics budgets. |
| `avatars.js` | Cached asynchronous GLTF loading, independent cloned skeletons, physical materials, mixer blends and two-bone arm IK. |
| `materials.js` | Skin, fabric and ball physical materials; normal detail; 2K × 4K court atlas and roughness map. |
| `arena.js` | Full stands/shell/roof, instanced crowd, LED canvas atlas, four-face scoreboard, tempered boards, metal hoops and damped spring nets. |
| `environment.js` | HDR loading, PMREM convolution, crossed overhead lighting and reusable shadow maps. |
| `pipeline.js` | EffectComposer with RenderPass → GTAO → bloom → optional Bokeh → OutputPass. |
| `quality.js` | Automatic degradation on sustained slow frames, excluding pauses and initial warmup. |

The geometry-based player and old gym modules have been removed. Every active player is an actual `SkinnedMesh` loaded from GLB, with a separate AnimationMixer; no procedural mannequin is used as a fallback. A missing model produces an explicit load error instead of silently drawing a different character.

## Asset contract

See [asset sources and production replacements](../../assets/README.md). Models must contain a valid bind pose and skin, UVs and normals. Update all skeleton world matrices before measuring skinned bounds: measuring an unposed hierarchy can normalize centimetre rigs hundreds of metres too large. The loader normalizes the full mesh to each athlete's configured height, retargets rotation tracks without world-space root motion, and clamps IK to anatomical arm reach. It only changes the visual hierarchy.

Configure clips using exported names:

```js
clips: {
  Idle: 'Basket_Idle', Run: 'Basket_Run', Jump: 'Jump_InPlace',
  Shot: 'JumpShot', Dunk: 'Dunk_Right', Pass: 'ChestPass', Defense: 'DefensiveStance'
}
```

Author these clips on the same skeleton as the mesh when possible. `boneMap` maps exported bone names to the canonical humanoid keys used by the adapter. Demo skeletal poses are a fallback for missing sports animation, not production sports motion capture. For a radically different rest pose or rig, implement a dedicated retarget adapter.

`profile.model` permits separate meshes per athlete; `settings.js` selects the default mesh, locomotion source and HDR. The current single-material demo is split by bone weights into skin, uniform and shoes. For production art, preserve explicitly authored material groups and adapt `splitMaterials` to your material names instead of using that heuristic.

## Quality and performance

High uses one 4096 shadow map, a crossed 2048 shadow, 1024 planar reflection, reduced-resolution GTAO and bloom. Balanced lowers shadows/reflection/crowd; Low disables AO, bloom, planar reflection and expensive glass transmission and renders at reduced pixel ratio. Optional DOF adds another depth pass. Shadows update once per displayed frame and are reused by reflection, AO and DOF passes. Crowd bodies, heads and chairs use three instanced draw calls.

Use `?quality=high`, `?quality=balanced` or `?quality=low` for reproducible comparisons. The settings panel controls the same profiles and shows observed FPS. `presentation.diagnostics` exposes FPS, draw calls, triangles and per-avatar rig/state data for developer measurement. It does not establish a 60 FPS guarantee; benchmark representative hardware and production assets before setting that acceptance threshold.

## Validation

- `npm test`: build-stamp consistency and gameplay/rendering-data regression tests.
- `node --test --test-isolation=none --test-reporter=spec`: expanded test counts on Node 24.
- `scripts/check-rigs.mjs`: loads the actual bundled GLBs through GLTFLoader in Node (using a test-only resolver), tests all four height normalizations and hand bounds. Image/canvas APIs are stubbed for this numerical test; shader validation is performed separately in Chromium.
- In a WebGL browser: verify profiles, visible meshes/jersey colors, the floor reflection, AO and bloom, optional DOF, pause/resume and the unchanged controls. All browser imports and binary resources are local and share the generated content stamp.

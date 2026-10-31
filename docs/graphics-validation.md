# Version 15 validation

## Passed

- `npm test`: asset/version consistency and all test files pass.
- Expanded Node 24 run: **72 tests pass, zero failed/skipped** (68 existing gameplay tests plus four graphics/data tests).
- Actual bundled GLB rigs load through GLTFLoader, normalize to human scale and stay numerically finite; regression tests guard the unposed-skeleton scale failure.
- Chromium/WebGL 2: all four visible avatars load as SkinnedMesh instances, each with 65 bones; physical floor clearcoat is 1 and the PMREM environment is present.
- High profile renders GTAO, bloom, planar reflection and 4096 primary shadows. Optional Bokeh also compiles and renders. No startup exceptions or shader console errors were observed.
- Procedural mannequin and old gym renderers were removed. Gameplay/controls modules remain unchanged by this refactor.

## Performance evidence and limit

The cloud browser reports `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)` — a software renderer.

A short low-profile run at a 960×800 browser viewport, with reduced internal pixel ratio, after four warmup frames, measured **3.15 FPS across 20 sampled frame intervals**, approximately 147 draw calls and 295,285 submitted triangles per displayed frame. The high profile rendered successfully, but that is not a 60 FPS validation.

**The 60 FPS acceptance criterion is not established and was not reached in this software-rendered environment.** Test on the target hardware/browser at the desired resolution and with final production assets before making that claim. The profiles and automatic quality governor provide controls for tuning; they do not guarantee a frame rate on arbitrary devices.

## Art scope

The supplied humans, animation fallback and synthetic HDR are demonstration assets approved for this iteration. They are not scanned basketball athletes, captured sports animation or photographic arena HDR. Production photorealism requires replacing them using the configuration and rig adapter described in `src/graphics/README.md` and the provenance notes in `assets/README.md`.

Binary resources and official Three.js 0.170.0 addons are served locally. No external asset CDN is required at runtime.

# Demo assets and replacement points

These are demonstration resources, not scanned professional basketball athletes.

| File | Source |
| --- | --- |
| `characters/human-demo.glb` | `Michelle.glb`, [Three.js r170 example](https://github.com/mrdoob/three.js/blob/r170/examples/models/gltf/Michelle.glb), Mixamo character; original embedded maps and skeleton retained. |
| `characters/soldier-demo.glb` | [Three.js r170 Soldier.glb](https://github.com/mrdoob/three.js/blob/r170/examples/models/gltf/Soldier.glb), Mixamo; only its Run animation rotations are used, not its soldier mesh. |
| `environment/arena.hdr` | Original synthetic indoor lighting probe generated for Baseline, Radiance RGBE 512×256, linear high dynamic range. It is not a photographic HDRI. |

The official Three.js examples credit Mixamo for the demo characters. Their asset use follows the provider's [Mixamo terms and FAQ](https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html); the Three.js MIT license covers engine/addon code, not an independent blanket license for third-party artwork. Preserve source attribution. Substitute your production assets and their applicable licenses before a commercial art release.

All files are served locally. There are no runtime requests to Mixamo, Three.js CDNs, or external texture services. Shader/addon code is vendored from `three@0.170.0`, installed via npm's integrity verification; its MIT license is in `vendor/THREE-LICENSE.txt`.

## Production replacements

Edit `src/graphics/settings.js`: `model`, `locomotion`, `environment`, `clips`, and `boneMap`. Individual athlete profiles may override `model`. The demo adapter recognizes Mixamo bone names; map other skeleton names to `Hips`, `Spine`, `Spine1`, `Spine2`, `Head`, `LeftArm`, `LeftForeArm`, `LeftHand` and their right-side equivalents. Use metre-scaled GLB or let the loader normalize the full skinned hierarchy to each athlete's height. Apply transforms in the DCC and supply a correct rest/bind pose.

For production use, provide a humanoid sports mesh with UVs and separate named skin/uniform/shoe materials, authored normal/roughness/specular maps, and in-place clips for Idle, Run, Jump, Shot, Dunk, Pass and Defense. The current demo automatically splits its single material by bone influence; production material groups should be authored explicitly. Missing sports clips use original, modest skeletal poses as a demonstration; they are not motion-captured sports animation.

The gameplay owns the actor's world position, jump and ball release. Clips must be in place. The visual adapter blends poses and solves both arm chains toward existing ball/defensive anchors; do not introduce root-motion movement that would desynchronize collisions or shots. More sophisticated humanoid retargeting may require a rig-specific rest-pose adapter.

After replacing assets run `npm run version:assets` and `npm test` so code, binary assets and the browser import map share a new content stamp.

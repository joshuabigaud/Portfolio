# Joshua — image-generated portfolio avatar

The current model comes from Joshua's concept-image → multiple-viewpoint → image-to-3D workflow. The supplied file is `C:\Users\joshu\Downloads\Hi3D_Untitled_allparts_20261006_075531.glb`. That original is unchanged.

The supplied GLB has one textured mesh, five million triangles, two 8192 × 8192 texture maps, and no skeleton or animation clips. The website uses lighter derivatives, retaining its appearance and UV coordinates: a static homepage model and a separate rigged model for the avatar viewer. See `assets/avatar/manifest.json` for static preparation measurements and `assets/avatar/rig-manifest.json` for the rig, clips, counts, and checksums.

The shading repair joins exact-coincident source vertices **before** polygon reduction while keeping texture coordinates per face corner. This prevents neighboring texture islands from being reduced into separate, slightly mismatched edges. The reduced mesh then uses 30° angle-based smoothing to keep the raised eyebrows and beard from stretching highlights across the face. The original download, character design, fixed pose, and texture maps are preserved. The repaired derivative has a new triangulation; it is not an identical copy of the earlier reduced mesh.

The bright facial streaks were reproduced without textures or self-shadowing, and the eye-line scratch was traced to gaps and T-junctions at a UV seam. This model has opaque materials and no Mirror modifier. Transparent-bounce, alpha-blending, and mirror-clipping changes therefore are not part of this repair. Weighted normals were compared but not retained because they made the face appear more planar. Blender's [angle-based smoothing](https://developer.blender.org/docs/release_notes/4.2/modeling/) supplies the appropriate edge treatment here.

## Interactive preview

The portfolio homepage also uses this model in its hero. Its poster appears first; the 3D module loads afterward. The hero supports horizontal drag, Left/Right keyboard rotation, a Home/reset control, and restrained pointer tilt. It preserves vertical touch scrolling and does not zoom on the mouse wheel. Rendering pauses offscreen and in hidden tabs, with a static poster fallback when WebGL or model loading fails. Reduced motion disables automatic tilt. These interactions rotate the fixed-pose mesh; they do not animate its limbs or face.

From the portfolio folder, run `npm ci` once, then `npm run dev`. Open `http://127.0.0.1:4173/avatar.html`.

- Drag to rotate; scroll or pinch to zoom. The focused canvas supports arrow keys and +/−.
- Choose a three-quarter, front, side, or back view.
- Select Rest, Greeting, or Present for a held pose; select Idle or Wave for animation, with Play/Pause and Reset pose controls.
- Switch between full-body and portrait framing, or enable the turntable. Motion respects the device's reduced-motion preference.
- Save a transparent PNG of the current pose and angle or download the rigged web GLB.

The separate viewer uses `joshua-avatar-rigged.glb` and its skeletal animation clips. With reduced motion enabled, selecting an animation leaves it paused until Play is pressed. The homepage continues to use the static model and poster.

## Editable working copy and animation

Open `avatar/hi3d-rigged.blend` in Blender 4.2 or newer to pose and animate the character. It contains a forward-kinematics (FK) body rig with 22 bones, including 21 deform bones. Controls cover the root, hips, spine, chest, neck, head, shoulders, arms, wrists, legs, feet, and toes. Body, Arms, and Legs bone collections organize the controls. `Grip.L` and `Grip.R` are attachment empties parented to the hand bones; align a prop to a grip and parent it there. No props are attached by default.

1. Select `Joshua_Rig`, then enter Pose Mode with Ctrl+Tab. Rotate a named bone with R; use Root to move the character. Alt+R clears selected bone rotations.
2. Change a Dope Sheet editor to **Action Editor** and choose Rest, Greeting, Present, Idle, or Wave. Set the playback range for the selected action, then scrub or play.
3. For a new animation, duplicate an action and give it a new name before editing. Insert rotation/location keyframes for the bones you change, and save your work to a separate `.blend` before running the generator again.

All actions use 30 fps. Rest, Greeting, and Present are one-second held poses (frames 1–31); Idle is a four-second loop (1–121), and Wave is a two-second loop (1–61). The actions are saved with fake users so unselected actions remain available. An in-file text note also describes the controls.

The rig uses the existing 119,994-triangle mesh without cutting or replacing its geometry, UVs, or materials. A temporary closed voxel proxy receives automatic bone-heat weights, which are transferred back to the source surface using barycentric interpolation. In the recorded build, 46 tiny unbound proxy vertices received nearby valid weights, with a strict distance limit below 0.075 model units. Connected surface regions distinguish the lower sleeves and hands from nearby jacket folds. Shoulder masks and rigid head weights receive 24 smoothing passes along actual mesh edges, so transitions soften without transferring weights across air gaps. The deliverable uses linear skinning with at most four normalized influences per vertex; the proxy is removed.

This is a body rig for moderate poses on generated triangular topology. It has no independent finger or facial controls, blinking, lip sync, inverse-kinematics (IK) controllers, or humanoid retargeting mapping. Inspect shoulder, elbow, hip, and knee deformation when making new poses, especially larger bends. Structural export checks do not establish visual quality for every possible pose.

The static preparation file `avatar/hi3d-portfolio.blend` remains separate and has no rig. It contains the reduced mesh, packed full-resolution maps, camera, and studio lights; F12 renders a transparent portfolio image. The static `.blend`, homepage GLB/poster, and original Downloads source are unchanged by rig generation.

## Files

| File | Purpose |
| --- | --- |
| `assets/avatar/joshua-avatar.glb` | Reduced, textured static homepage model |
| `assets/avatar/joshua-avatar-rigged.glb` | Skinned web model with five pose/animation clips and hand attachments |
| `assets/avatar/joshua-avatar.png` | Transparent render of the current model |
| `assets/avatar/manifest.json` | Source and preparation measurements |
| `assets/avatar/rig-manifest.json` | Rig measurements, bone/clip names, limits, and checksums |
| `avatar/hi3d-portfolio.blend` | Packed Blender working copy, without a rig |
| `avatar/hi3d-rigged.blend` | Separate packed Blender body rig and actions |
| `scripts/prepare-hi3d-avatar.py` | Import, uniform scaling, mesh reduction, Blender save and poster render |
| `scripts/avatar_source.py` | Validated, memory-bounded source reader; exact-position welding before reduction with per-corner UV preservation |
| `scripts/optimize-avatar-textures.py` | Resize only the web GLB's embedded maps to 2048px |
| `scripts/rig-hi3d-avatar.py` | Build the separate rig, actions, hand attachments, GLB, and rig manifest |
| `scripts/check-avatar-rig.mjs` | Validate exported geometry, skinning, buffers, source preservation, and animation data |
| `src/avatar.html`, `avatar.js`, `avatar.css` | Rigged-model pose and animation viewer |
| `src/hero-avatar.js` | Deferred homepage enhancement using the static model and poster |

Regenerate the rig from the existing static preparation file, then validate and build the site:

```powershell
& 'E:\BlenderPortable\blender-4.2.21-windows-x64\blender.exe' --background --threads 2 --python-exit-code 1 --python scripts/rig-hi3d-avatar.py
node scripts/check-avatar-rig.mjs
npm run build
npm run check
```

Rig generation replaces only its generated `.blend`, GLB, and rig manifest; save manual rig edits separately first. `node scripts/check-avatar-rig.mjs docs/assets/avatar/joshua-avatar-rigged.glb` checks a built copy. The validator checks embedded buffers and finite accessors, joint/weight validity, every vertex's normalized binding, original static GLB checksum, triangle-count preservation, positive clip durations, and changing Idle/Wave transforms. Review rendered poses separately after changing the rig or weights.

To regenerate the **static** preparation assets from the original download, use Blender and Python + Pillow:

```powershell
& 'E:\BlenderPortable\blender-4.2.21-windows-x64\blender.exe' --background --threads 1 --python-exit-code 1 --python scripts/prepare-hi3d-avatar.py
python scripts/optimize-avatar-textures.py
npm run build
npm run check
```

The first command reads the original Downloads file and replaces the static derivative assets and static working `.blend`. Save manual edits separately before rebuilding. The second command is required for web-sized textures; the `.blend` retains the original 8K maps. These static preparation commands do not rebuild the rig. Changes to the static mesh require reviewing the rig's joint landmarks, weights, and the validator's expected source checksum before regenerating the rig.

Use Blender 4.2 or newer and adjust the executable path for your installation. Single-thread reduction limits peak memory. The source helper checks the known original checksum and supported glTF layout before processing; a different model needs its assumptions reviewed. It loads the full-resolution material after reduction, avoiding a second high-resolution mesh in memory. The October 7 repair promotes the visually validated reduction; the durable helper was smoke-tested with the real source/material and a small UV-seam fixture, without repeating the full reduction.

## Earlier versions

The earlier professional procedural model and viewer are preserved in `avatar/versions/professional-v2/`. The first casual version is in `avatar/versions/casual-v1/`. These directories are outside the published site. The previous `avatar/joshua-avatar.blend` and `scripts/create-avatar.py` also refer to the older procedural character; running the old generator would overwrite the current web assets.

The site remains static and uses the locally bundled Three.js 0.180.0 under its MIT license. The About badge uses the existing poster, the homepage hero loads the static model, and the separate avatar utility loads the rigged derivative. No external model service is called by the website. The separate viewer stays outside the main portfolio navigation.

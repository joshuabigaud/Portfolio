# Portfolio image provenance

All shipped project images originate in existing application captures or direct captures of the owner’s real application/website. No generated portfolio-layout concepts or invented application screenshots are shipped.

The October 6, 2026 single-page redesign uses seven authentic project captures. On October 7, the owner supplied replacement Nebula, Omin, PatchMind, and VastiPost screenshots; their framing and view-specific descriptions were updated together. Decorative page illustrations, the avatar, and typography are documented separately below; they are not evidence of the applications’ interfaces or results.

| Asset | Source | Selected view |
| --- | --- | --- |
| `nomi.png` | Nomi-App `apps/desktop/screenshots/studio-pipeline-all-default-fit.png` | Original Studio pipeline-builder capture; the frame excludes the runtime footer. |
| `nebula.png` | Owner-supplied `Screenshot 2026-10-06 191603.png` | 3D IntelliVerse with project galaxies, names, and map controls retained; native title/menu bars are outside the displayed frame. |
| `omin.png` | Owner-supplied `Screenshot 2026-10-06 191034.png` | Game Development Template multi-dashboard workspace; all eight cards and their actual linked/unbound states remain visible. The unused lower workspace is outside the displayed frame. |
| `ouroshield.png` | OuroShield `ouroshield/design/ouroshield-dashboard-implementation.png` | Actual implementation capture, framed above the empty patch-queue area. |
| `patchmind.png` | Owner-supplied `Screenshot 2026-10-07 125930.png` | Cursor-free Local Test Lab capture displaying a completed test run. Only the native title bar is outside the displayed frame; logs, results, target, and recent runs are preserved. No test was run or data created for this portfolio. |
| `vastipost.png` | Owner-supplied `Screenshot 2026-10-07 125046.png` | Cursor-free Content library with Posted selected, framed to the central mobile interface. Browser chrome and developer controls outside that interface are excluded from the displayed view. |
| `imonic.png` | Public `https://imonicdesigns.com`, captured October 5, 2026 | Actual homepage introduction and Neon Guardian artwork. |

Images retain the original interface content, including any existing sample content in historical development captures. They are presented as interface design, not as customer metrics or proof of production readiness. No missing panels are painted over, no success values are changed, and no artificial app windows are added.

The four replacement files are byte-identical copies of the attachments in `C:/Users/joshu/OneDrive/Pictures/Screenshots/`. The attachments remain untouched. Cropping is CSS framing shared by the project card and enlargement dialog, with no generative edits, cursor inpainting, or blurring. Nebula's project names remain visible as supplied.

| Replacement | Source size | Displayed source rectangle (x, y, width, height) |
| --- | --- | --- |
| Nebula | 1920 × 1032 | 0, 49, 1920, 983 |
| Omin | 1920 × 1032 | 0, 0, 1920, 710 |
| PatchMind | 1486 × 933 | 0, 31, 1486, 902 |
| VastiPost | 1920 × 1032 | 764, 100, 393, 828 |

Public portfolio copy is grounded in the programs’ README files, relevant existing documentation, the user’s description, and the captured interfaces. The generated site is self-contained; visitors do not access local app files or any private service.

## Cartoon avatar

The current `assets/avatar/joshua-avatar.glb` is a web derivative of the owner-supplied `Hi3D_Untitled_allparts_20261006_075531.glb`, supplied October 6, 2026. The owner described creating concept images, generating multiple viewpoints, and generating the 3D asset from those images. This is an image-generated character, not a body scan. The source checksum and measured preparation results are in `assets/avatar/manifest.json`.

Preparation uniformly scales and centers the model, reduces five million triangles to approximately 120,000, and downsamples its two embedded 8K texture maps to 2K for the web copy. The source download remains unchanged. The web derivative preserves the generated design and material maps; it does not add new jewelry, markings, clothing, or facial details. `joshua-avatar.png` is a transparent render of the reduced mesh with its original full-resolution maps. The packed working copy is `avatar/hi3d-portfolio.blend`. Preparation scripts are `scripts/prepare-hi3d-avatar.py` and `scripts/optimize-avatar-textures.py`.

The supplied source and static homepage derivative have no skeleton, skin weights, or animation clips. The homepage hero rotates and gently tilts the fixed-pose mesh. The separate avatar utility uses the body-rigged derivative described below, with pose/animation selection, camera angles, portrait/full-body framing, turntable rotation, and transparent image export. Generated texture maps are embedded in both web GLBs. The original personal photographs, converted photo references, stock avatar icon, and animation-style reference are not copied as separate files to the public site.

The earlier procedural character, its rig, and its professional viewer are archived outside the published site in `avatar/versions/professional-v2/`; the first casual version is in `avatar/versions/casual-v1/`. The older mug and laptop assets remain available for future work but are not used by the current viewer. The avatar does not replace or alter any project screenshot.

### Avatar shading repair — October 7, 2026

The static web derivative is rebuilt from the unchanged owner-supplied Hi3D source. Exact-coincident source vertices are joined before reduction, with per-corner UVs retained, followed by 30° angle-based smoothing. This addresses geometric seam gaps and bright shading streaks. That preparation step does not add a rig or change the character's pose. The original web texture images are retained; the editable static Blender copy retains full-resolution maps and studio lighting. See `assets/avatar/manifest.json` for current counts and checksums and `avatar/README.md` for the reproducible preparation workflow.

### Separate body rig — October 7, 2026

`assets/avatar/joshua-avatar-rigged.glb` adds a skeleton, skin weights, hand attachments, and five clips to the prepared avatar. Its editable source is `avatar/hi3d-rigged.blend`; `assets/avatar/rig-manifest.json` records file checksums, geometry counts, file size, bone names, and clip durations. `scripts/rig-hi3d-avatar.py` builds these separate files from `avatar/hi3d-portfolio.blend`. It preserves the original download, static `.blend`, static homepage GLB/poster, and the prepared model's 119,994-triangle geometry, UVs, and materials. No topology cuts or new character details are introduced by rigging.

The forward-kinematics body skeleton has 22 bones, of which 21 deform the mesh, covering the torso, head, arms, wrists, legs, feet, and toes. Hand-parented attachment empties `Grip.L` and `Grip.R` support later prop placement; no props are attached in the current viewer. Rest, Greeting, and Present are one-second held poses. Idle is a four-second loop and Wave is a two-second loop, authored at 30 fps. These are newly authored body actions for this generated character, not captured human motion.

Weighting uses a temporary closed voxel proxy and automatic bone heat, followed by barycentric transfer to the unchanged visible mesh. The recorded build repairs 46 tiny unbound proxy vertices using the nearest weighted surface within 0.075 model units. Connected sleeve/torso regions reduce unwanted influence between the arms and jacket. Head detail weights and shoulder transitions receive 24 smoothing passes along mesh edges, without bridging air gaps. Each visible vertex receives at most four normalized influences. The temporary proxy is removed from the deliverables.

The rig supports moderate body poses on generated triangular topology. Independent fingers, facial controls, blinking, lip sync, IK controllers, and a humanoid retargeting mapping are not included. `scripts/check-avatar-rig.mjs` validates exported buffer/accessor structure, source preservation, triangle count, skin bindings, and clip data; those structural checks do not certify every possible deformation. The Blender posing steps and separate static/rig regeneration commands are documented in `avatar/README.md`.

## Decorative page assets

| Asset | Purpose and provenance |
| --- | --- |
| `assets/decor/lanyard.png` | Generated lanyard and clip decoration for the approved hanging-badge design. The identity, role, expertise, barcode treatment, flip control, and card faces are HTML/CSS rather than text baked into this image. |
| `assets/decor/contact-envelope.png` | Generated decorative contact illustration following the approved cream-and-yellow visual direction. It has no claim about a project, achievement, or real communication. |

These assets are decorative and use empty alternative text. Generated hero or application-layout studies are design references only and are not published as working application screenshots. Any sample Stack, journey, and achievement records are labeled examples in `.preview/demo/`, not personal claims, and are not part of `docs/`.

## Fonts and runtime licenses

| Shipped asset | Source | License |
| --- | --- | --- |
| `assets/fonts/InterVariable.woff2` | [Inter project](https://rsms.me/inter/) | SIL Open Font License 1.1, included as `assets/fonts/Inter-LICENSE.txt` |
| `assets/fonts/CormorantGaramond-Italic.ttf` | [Cormorant project](https://github.com/CatharsisFonts/Cormorant) | SIL Open Font License 1.1, included as `assets/fonts/CormorantGaramond-OFL.txt` |
| `vendor/three/` in generated output | Pinned local `three` package, version 0.180.0 | MIT, included as `vendor/three/LICENSE` |

All fonts, model files, decorative artwork, project images, and JavaScript runtime dependencies load from the generated site. No font or 3D model service is contacted at runtime.


## Stack content sources — October 6, 2026

The Stack describes tools present in project code and the AI-assisted workflow used to build this portfolio. These are usage descriptions, not proficiency ratings, years of experience, or qualifications. The public records live in `src/stack.mjs`; these source notes are not copied into `docs/`.

| Entries | Source checked locally |
| --- | --- |
| JavaScript, HTML, CSS, Node.js, npm, Three.js | This repository’s `package.json`, `src/render.mjs`, `src/app.js`, `src/styles.css`, `src/hero-avatar.js`, and `scripts/build.mjs`. |
| TypeScript, React, Electron | Current manifests and renderer source in `D:/Nomi_HOST/Nomi-App/apps/desktop`, `D:/Omin`, `E:/InmoWorkStation/projects/nebula`, and `D:/PatchMind`. |
| Tailwind CSS, Vite | Nebula’s `package.json`, `vite.config.ts`, and `styles/globals.css`; OuroShield and PatchMind’s current package manifests and build commands. |
| React Flow | Omin’s `src/renderer/components/control-center/SequenceEditor.tsx` and `package.json`. |
| Python, FastAPI | OuroShield’s `pyproject.toml` and `src/ouroshield/api.py`; this portfolio’s avatar preparation scripts. |
| SQL, SQLite | Omin’s `src/orchestrator/db.ts`; OuroShield’s `src/ouroshield/store.py`, `migrations.py`, and `service.py`. |
| PostgreSQL | Nebula’s `server/postgres-store.ts` and `server/state-store.ts`. The description says supported/config-selected storage, without claiming a verified live database. |
| Zod | Omin’s `src/orchestrator/app.ts` and `package.json`. |
| Playwright, Vitest | Omin’s Electron Playwright configuration/tests; OuroShield’s UI package scripts/dependencies; PatchMind’s package test scripts/dependencies. |
| Git | Application repository workflows and PatchMind’s documented Git-based change inspection and candidate preparation. |
| PowerShell, Codex | The Windows command workflow and AI-assisted planning, implementation, debugging, and review used for this portfolio. |
| Blender | `scripts/prepare-hi3d-avatar.py`, the existing editable avatar, and the recorded preparation/rendering workflow. |

No provider/model integration was treated as proof of personal use of that provider. Unverified technologies, degrees, employers, and proficiency levels were not added. Demo labels apply only to records explicitly marked as samples; the real Stack appears unchanged in both outputs.

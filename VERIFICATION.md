# Portfolio verification — October 7, 2026

## Result

The single-page redesign is implemented locally. `docs/` contains the real portfolio, seven compatibility redirect pages, and the separate avatar utility. `.preview/demo/` contains the labeled demonstration of optional sections. Nothing was published.

The normal configuration preserves all seven project IDs, the two stated qualifications, and the supplied contact address. Four project captures were replaced with owner-supplied screenshots on October 7, with view-specific copy updated as described below. The Stack contains 24 source-backed tools and technologies across four categories, described through project use and self-directed, AI-assisted workflows. Timeline and achievements remain empty, with their sections and navigation links absent. Demo records are not copied into `docs/`.

## Zoho contact connection — October 7, 2026

The owner-supplied Zoho Forms public iframe URL is configured in `contact.formEmbedUrl` for the real and demo builds. The basic embed loads on popup opening, sends no added `referrername` parameter, and uses `referrerpolicy="no-referrer"`. The iframe stays mounted across closing/reopening. A direct hosted-form link is available without site JavaScript and a separate-tab fallback remains inside the popup. No account credentials or private API keys are included.

In-app Chromium checks covered root hosting at 1440 × 1000 and `/portfolio-preview/` at 390 × 844 and 320 × 740. Both “Write a message” and the contact address open the live form. It marks Email, Single Line, and Multi Line as required, while name and file upload are optional. The owner should rename Single Line to Subject and Multi Line to Message in Zoho; these cross-origin labels are controlled by the hosted form. Required-field submission enforcement was not tested.

The hosted popup now sizes its frame to the available height, retaining visible close and fallback controls without nested outer scrolling at the tested sizes. There is no horizontal overflow in either the portfolio or the hosted form. Keyboard Tab reaches the upload and Submit area. Opening focuses the close control, Escape there dismisses the dialog, and closing restores the original opener. A temporary subject survived close/reopen and was cleared afterward. Escape from inside Zoho's cross-origin document did not dismiss the parent dialog; the visible close control remains available. The portfolio cannot intercept key events inside that external document.

Page identity, meaningful rendered content, screenshot evidence, and interactions were checked with no framework overlay or relevant console warnings/errors. Both builds, both output checks, and all 24 Node tests pass. The unconfigured test now uses an explicit empty configuration instead of assuming the real portfolio is unconnected. No message was submitted and no file was uploaded: provider acceptance, attachment handling, notification configuration, and inbox delivery still require an end-to-end test. These are desktop-browser viewport checks, not physical touch or cross-browser tests.

Captures are saved outside the repository in `C:/Users/joshu/.codex/visualizations/2026/10/06/01a11147-2a41-7c42-9537-eb58cad1099f/contact-form/zoho-connected/`. The host form keeps Zoho's styling and branding; its fields cannot inherit the portfolio's CSS across the iframe boundary. Implementation remains local and nothing was published.

## Initial contact popup, before Zoho connection — October 7, 2026

The contact address and new “Write a message” button open a native dialog with name, reply email, subject, message, and multiple attachments. Its appearance follows the portfolio's ivory, cream, navy, and yellow palette. The email-app link remains a no-JavaScript fallback. No email service account or endpoint has been configured; the real and demo previews visibly state this and disable Send. No live message or attachment was transmitted.

The local composer supports five files totaling 10 MB, removal controls, an in-memory draft retained on close/reopen, native field validation, explicit service acknowledgement, and error/timeout states that retain the draft. HTTPS delivery settings support either a multipart endpoint returning JSON `{ "ok": true }`, or a hosted form URL loaded into an iframe only when the popup opens. The latter provides a path for Zoho Forms after account/form setup. Provider-specific hosted fields, delivery, spam handling, upload limits, and branding must be configured and verified with the actual service; an arbitrary Zoho URL is not used as an AJAX endpoint.

All 24 Node tests pass, including six new contact checks for file limits, no transmission when unconfigured, multipart text/files, rejecting unacknowledged HTTP success, no automatic retries, and valid exclusive endpoint/embed configuration. Real/demo builds and output checks pass, with syntax checks for the interaction modules. Delivery requests in tests are simulated and do not contact a mail provider.

In-app Chromium checks covered root hosting at 1440 × 1000 and `/portfolio-preview/` at 390 × 844 and 320 × 740. Keyboard opening focuses the first field; Escape closes and restores the opener. Clicking the visible email address opens the popup instead of invoking an external mail application. Two test attachments could be added, one removed by keyboard, and the remaining file and message survived closing/reopening. An 11 MB file and a six-file selection were rejected without losing accepted files. A valid subsequent selection cleared the attachment error. Invalid reply-email syntax was recognized by native validity. The dialog scrolls at narrow sizes, its close control stays visible, and keyboard Tab reaches attachments without horizontal overflow. No relevant console warnings/errors or framework error overlay appeared. These are desktop-browser viewport checks, not physical touch or cross-browser tests.

Initial captures and inert test files are outside the repository in `C:/Users/joshu/.codex/visualizations/2026/10/06/01a11147-2a41-7c42-9537-eb58cad1099f/contact-form/`. At this stage no hosted link had been supplied; the connection and remaining delivery checks are documented above. Setup instructions and free-plan limitations are in `README.md`.

## Project screenshot refresh — October 7, 2026

Nebula now shows the 3D IntelliVerse; Omin shows the Game Development Template multi-dashboard workspace. PatchMind and VastiPost use the supplied cursor-free captures. CSS framing removes Nebula and PatchMind's native window chrome, Omin's unused lower workspace, and VastiPost's browser/developer controls. The four image assets are exact copies of the supplied PNGs. Original interface data and Nebula's project names remain visible. No generated application evidence or pixel retouching was introduced. Source paths and crop coordinates are recorded in `ASSET_PROVENANCE.md`.

Omin and VastiPost's captions, alternative text, and view-specific case-study paragraphs now describe the actual screens shown. All project IDs, primary development-status labels, and the other three screenshots remain unchanged. The normal and demo builds both use the replacement assets.

The flow checked was project selection or a direct project fragment → the replacement screenshot and caption → enlargement → Escape dismissal and focus restoration. Codex in-app Chromium checks covered all four cards and dialogs at 1536 × 1024 under `/portfolio-preview/`, then all four project fragments and dialogs at 390 × 844 under root hosting. Every image loaded at its source dimensions. The same crop class was retained in the dialog. Keyboard enlargement, Escape, and focus restoration passed; the project selector also switched to Omin. Meaningful portfolio content rendered without an error overlay, and no console warnings or errors were reported. The document had no horizontal overflow at 1536, 390, or 320 pixels; all four updated frames fit at 320 × 740. Physical touch and other browsers were not tested in this follow-up.

`npm run build`, `npm run check`, `npm run build:demo`, `npm run check:demo`, and all 18 `npm test` cases passed. Browser captures and responsive measurements are outside the repository in `C:/Users/joshu/.codex/visualizations/2026/10/06/01a11147-2a41-7c42-9537-eb58cad1099f/project-screenshot-update/`. The intentional differences from the attachments are only the documented framing and responsive scaling. The following sections retain earlier verification evidence for unrelated features; those broader suites were not repeated for this screenshot update.

## Separate body rig and pose viewer

The separate `avatar/hi3d-rigged.blend` and `assets/avatar/joshua-avatar-rigged.glb` provide a 22-bone FK body rig, hand attachment nodes, three held poses (Rest, Greeting, Present), and Idle/Wave loops. The standalone viewer now selects poses, plays/pauses animation, resets, and exports posed transparent PNGs. The homepage continues using the static asset.

The final rigged GLB SHA-256 is `cdd6c79615219bfbc18595796421133cddcc0040941d67f3eb5820f79a6cc2ff`; the built `docs/` copy matches. `npm run check:rig` verifies one skin, 22 joints, all 94,757 exported vertices bound, at most four normalized weights, unchanged 119,994 triangles, embedded resources, and all five clips. Maximum weight-sum error is below 0.00000014. Source static GLB, static Blender file, and original Downloads file hashes remain unchanged. The rigged Blender rest pose differs from the source by less than 0.0000005 model units.

Weight development exposed sleeve/torso influence leakage in direct proxy weights. Connected surface masks and 24 adjacency smoothing passes fixed the visible jacket stretching without changing mesh geometry. Blender renders were reviewed for Rest, Greeting, Present, a 28-degree thigh/50-degree knee bend, and a 16-degree torso turn. Head/neck, wrists, elbows, shoulders, and leg deformation were inspected. Moderate poses are usable; raised arms retain some underarm compression/stretching. This is not retopology or qualification for arbitrary extreme motion; there are no independent finger, facial, IK, or humanoid retargeting controls.

The final viewer passed 33/33 Playwright Chromium checks at desktop 1440 and mobile 390 widths, using `http://127.0.0.1:4173/portfolio-preview/avatar.html`. The Browser plugin was unavailable. Page identity/content, absence of overlays, all five clips, distinct pose pixels, real Idle/Wave motion, unchanged paused pixels, reset, camera/keyboard controls, PNG transparency, reduced motion, missing-clip fallback, and WebGL-loss handling passed. Console warnings/errors, runtime errors, failed requests, and external requests were empty. Ten further Greeting captures cover front, back, both sides, three-quarter, and portrait framing. No clipping or detached geometry was observed. Physical-device touch was not tested.

`npm run build`, `npm run check`, `npm run check:rig`, and all 18 `npm test` cases passed. The output remains local; nothing was published. Temporary QA scripts, JSON evidence, and screenshots are in `C:/Users/joshu/AppData/Local/Temp/portfolio-rig-qa/` (`qa-results.json`, `angle-inspection.json`, and `deformation.json`).

## Avatar shading repair (preceding the separate rig)

The facial highlights and eye-line scratch had different causes. Solid-material and self-shadow-disabled browser comparisons retained the bright streaks, while 30° angle-based smoothing removed them around the brows and beard. The eye/nose scratch was an actual geometric gap with T-junctions at a texture seam, not a light-colored mark in the texture. Rebuilding from exact-coincident source vertices joined before decimation closes that seam. Weighted normals were compared and rejected because they made the face appear more planar.

The repaired web model contains 119,994 triangles. The reduction targeted 120,000; six invalid faces were removed during validation. The two embedded 2K images, material parameters, and samplers are unchanged. Vertex positions differ from the older reduction, as expected for a new triangulation; the original design, fixed pose, and texture mapping are retained. The original download's SHA-256 remains `ebe65a7249fd0faaa706c6b3575e97990759fb14961a5b0cf7e7565ac5f15b64`.

An identical 1,262,301-sample front-ray grid across the narrow eye/nose seam found 4,989 uncovered samples in the old mesh and zero in the repaired mesh. There are no boundary edges in the tested eye band, no nonmanifold edges with more than two adjacent faces, no zero-area exported triangles, and all exported normals are finite and unit length. This targeted evidence establishes closure of that seam, not universal topology or animation readiness.

Diagnostic comparisons and the reproducible coverage check are stored outside the repository in `C:/Users/joshu/.codex/visualizations/2026/10/06/01a11147-2a41-7c42-9537-eb58cad1099f/avatar-shading/`. The untouched original and backups make the derivative repair reversible. This shading repair left the static derivative unrigged; browser lighting, material transparency, and interaction code were not changed in that step.

The final web GLB is byte-identical to the tested candidate, SHA-256 `bfca35cae1fd52455f2bae6bf05c790a27d02748722f2b90320edf0fd5a13fd3`. Real and demo builds contain identical copies of that GLB and the regenerated 960 × 1120 poster. The editable scene retains both packed 8K maps, the existing camera/lights, and Cycles at 32 samples. The preparation helper passed real-source parsing, material import, and a small welding fixture retaining distinct per-corner UVs. The full preparation command was not repeated; the repair reused the validated reduction.

Final Chromium checks cover the prefixed avatar utility at 1536 × 1024, the hero at desktop width, and the hero at 390 × 844. Root hosting also loads the repaired model and poster. Portrait/front selection, keyboard rotation, and reset work with the repaired model. The mobile document remains within its viewport, and no relevant console warnings/errors were reported. Captures are `final-front.png`, `final-hero-desktop.png`, and `final-hero-mobile.png` in the external evidence directory. Physical touch and the unchanged lifecycle fallback suite were not rerun for this asset-only update.

## Repeatable checks

All commands passed after the final source changes:

```powershell
npm run build
npm run check
npm run build:demo
npm run check:demo
npm test
```

- Real output: 9 pages, 65 local links/asset references checked.
- Demo output: 9 pages, 67 local links/asset references checked.
- 18 Node tests pass. They cover exact project narratives/images/crop identifiers, escaping, empty collections and fragments, larger collections, optional credential links, custom profile fields, stable ordering, duplicate IDs, missing references, local assets, and real/demo separation. Stack coverage checks the real records, category references, usage descriptions, no invented proficiency fields, no-JavaScript descriptions, compatible anchors, and isolated sample fallback.
- Syntax checks pass for the browser interaction and hero-avatar modules.
- All runtime resources are local. Font licenses and the pinned Three.js license ship with the output.

## Stack follow-up browser checks

The updated real page was checked in Codex Chromium at `http://127.0.0.1:4173/portfolio-preview/#skills`, with the title `Joshua Bigaud — Designer & Developer`. All 24 tools render in their original order. At 1536 × 1024, the Workflow filter dims 17 unrelated tiles and keyboard selection shows Codex's workflow description. The navigation label and active state say Stack; the existing `#skills` anchor remains compatible.

At 390 × 844, keyboard activation opens the mobile menu, selecting Stack closes it, and selecting PostgreSQL shows its configuration-scoped usage description. Its category dims 18 unrelated tiles. At 320 × 740, keyboard selection of Blender updates the preview with its scripted avatar-preparation role. The real document has no page-wide horizontal overflow at 1536, 1024, 390, or 320 pixels. No console warnings or errors were reported during these checks.

The demo retains the same 24 real Stack entries without sample labels on that section. Its Journey and Highlights entries remain explicitly labeled examples. Current captures are stored outside the repository in `C:/Users/joshu/.codex/visualizations/2026/10/06/01a11147-2a41-7c42-9537-eb58cad1099f/stack-desktop.png` and `stack-mobile.png`.

The broader browser evidence below records the completed redesign before this Stack content follow-up. Unchanged avatar, project, dialog, contact, and fallback interactions were not rerun for the content addition.

## Original redesign browser layout checks

Checked in the Codex in-app Chromium browser. Both real and demo output were checked at the requested dimensions:

| Viewport | Real document width | Demo document width | Page-wide horizontal overflow |
| --- | ---: | ---: | --- |
| 1536 × 1024 | 1521 | 1521 | None |
| 1024 × 768 | 1009 | 1009 | None |
| 390 × 844 | 375 | 375 | None |
| 320 × 740 | 305 | 305 | None |

The 15-pixel difference is the browser scrollbar. The demo highlights rail intentionally scrolls horizontally within its own region. Long-title/category/qualification/highlight fixtures also stayed within the page at 320, 1024, and 1536 pixels.

A 200% reflow equivalent was checked at 768 × 512 CSS pixels with device pixel ratio 2 for a 1536 × 1024 display. It had no page overflow. This is a viewport/density simulation, not a claim that the native browser zoom UI was tested.

## Interaction checks

- Keyboard Enter flips the badge and changes the control label. The inactive face receives `inert` and `aria-hidden`; reduced motion uses a zero-duration change.
- Mobile navigation opens by keyboard and closes after selecting a section. Desktop navigation tracks sections with the yellow active state.
- Skill category selection dims unrelated tiles without changing order. Keyboard focus/selection updates the name, category, symbol fallback, and description. The sample filter left 12 of 16 tiles dimmed.
- Project selection leaves one expanded panel and two neighboring collapsed panels on desktop. Mobile shows the vertical accordion. All seven selector destinations were exercised.
- “Read case study” opens the preserved narrative inline, updates the canonical project fragment, and focuses its disclosure. Back/Forward restores project selection and case-study expansion.
- All seven `projects/<id>.html` URLs were followed under `/portfolio-preview/`. Each reached the correct `index.html#project-<id>` and opened its case study.
- The shared screenshot dialog opens the authentic capture. Escape dismisses it and focus returns to its opener.
- All seven screenshots were confirmed loaded at their original natural widths after selection. Their established crop rules remain intact.
- The existing `mailto:` link is correct. Copying displays “Email address copied.”
- Desktop overflowing highlights use vertical scroll progress. The next control advances to the rail end when the remaining distance is less than a card. The demo contains exactly four cards, without duplication.
- Reduced motion switches highlights to native horizontal scrolling. Keyboard Next advanced the narrow rail by 344 pixels and updated progress to 33%; numeric values remain accessible as their final results.
- Avatar Left/Right and reset controls were exercised in the browser. The existing model renders without new pose or rig changes. The separate avatar utility loads and enables its original view controls.

## Fallback and lifecycle checks

With JavaScript disabled, all seven outer project disclosures remained readable. Clicking a native case-study summary opened its full narrative. The demo exposed a semantic list of all 16 skill names, categories, and descriptions. The poster and email link remained available. Mobile navigation uses a static, wrapping fallback so it does not obscure native fragment targets.

A local fixture made WebGL context creation unavailable. The hero retained its poster, hid the unavailable controls, and announced its fallback without removing other page content.

Nine additional instrumented checks execute the actual `src/hero-avatar.js` module with real Three.js scene objects and a fake GPU renderer. They passed for failed WebGL, failed model loading, offscreen/hidden suspension, bfcache resume, context loss, late completion after disposal, vertical versus horizontal touch handling, keyboard/reset controls, absence of wheel zoom, DPR 2 capped at 1.5, and reduced-motion tilt suppression.

These instrumented gesture checks verify controller decisions and the `touch-action: pan-y` declaration. They do not establish physical-touch hardware behavior or native browser gesture arbitration. The in-app browser did not support native touch dispatch; no physical phone test is claimed. Controller evidence is saved in `.preview/qa/avatar-lifecycle.json`, with its reusable harness alongside it.

## Requests and console

A clean pass through the prefixed real portfolio and every project found no external runtime requests, failed requests, HTTP error responses, or relevant console warnings/errors. All seven authentic images loaded. The deliberately forced WebGL failure was confined to its separate test fixture.

Evidence: `.preview/qa/network-and-images.json`, `.preview/qa/legacy-links.json`, viewport captures, and fallback captures. These local QA artifacts are excluded from the publishable build.

## Visual comparison and intentional differences

Browser captures were compared with the corrected hero and approved About, skills, Work, Learning, Journey, Highlights, and Contact concepts. The implementation retains ivory `#F7F4E9`, yellow `#EFE3A0`, navy `#23243B`, cream surfaces, fine dividers, Inter headings/body copy, and Cormorant Garamond italic phrases.

| Section | Implementation and intentional differences |
| --- | --- |
| Hero | Oversized background lettering, large mixed-type headline, left actions, and existing full-body clay avatar. The supplied fixed-pose GLB determines the character appearance. |
| About | Three desktop columns, separate lanyard/clip artwork, navy badge header, HTML front/reverse faces, and authentic profile fields. The reverse uses supported focus areas only. |
| Stack | Data-driven periodic tiles, category controls, and a symbol/logo detail preview. The follow-up supplies 24 tools with project/workflow descriptions, without proficiency scores or credential claims. Mobile labels were enlarged for readability. |
| Work | One wide project with two narrow neighbors and a selector for every record. Authentic captures retain their varied desktop/mobile crops. Original copy determines card and case-study height. |
| Learning | Two qualifications with generated numbering and a navy first row. Missing issuers, dates, and credential URLs are absent; unconfigured rows have no link arrow. |
| Journey | Alternating desktop entries and single-column mobile flow. Demo stages use Learn/Build/Next rather than invented dates. No extra hardcoded final entry. |
| Highlights | Unduplicated, data-driven cards with numeric or text results, controls, and measured progress. It switches to ordinary horizontal scrolling for reduced motion, touch, or insufficient viewport height. |
| Contact | Separate clay envelope illustration, supplied email, copy feedback, and back-to-top control. No unconfigured links or backend. |

Verification fixes included the contact illustration aspect ratio, clipped highlights screen-reader positioning, readable faded/mobile skill labels, the badge header, no-JS skill details and navigation offsets, retained project category text, and immediate loading of a selected cropped screenshot.

## Local boundary

No hosting configuration, deployment, public publishing, new personal claims, or avatar rigging was performed. Review the local real and demo previews using the commands in `README.md`.

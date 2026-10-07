# Joshua Bigaud — Portfolio

A single-page, content-driven portfolio for an independent designer and developer. The real portfolio retains seven authentic project captures, their development status and case-study copy, two stated qualifications, and Joshua’s contact address. Its visual system uses warm ivory, pale yellow, navy, and locally hosted Inter and Cormorant Garamond.

The page includes a fixed-pose interactive 3D avatar, a reversible developer badge, inline project case studies, screenshot enlargement, and contact actions. The Stack section shows tools used across the projects and AI-assisted workflows, with descriptions of their role. Journey and highlights remain omitted until supported personal content is supplied. A separate labeled demo demonstrates empty sections using sample records.

## Preview locally

Requires Node.js 20 or newer. Install the pinned dependency once, then build and serve:

```powershell
npm ci
npm run dev
```

Open [the real portfolio](http://127.0.0.1:4173). Stop the server with Ctrl+C. After editing source, run `npm run build` and refresh. `npm run preview` serves the existing `docs/` build without rebuilding it.

To see the complete template with the real Stack plus clearly labeled sample timeline entries and highlights:

```powershell
npm run preview:demo
```

Open [the demo preview](http://127.0.0.1:4174). This command builds and serves `.preview/demo/`; it never writes sample records or demo HTML into `docs/`. The demo includes a visible disclaimer and search-engine exclusion metadata. Do not publish it as personal portfolio content.

The preview server also accepts explicit options:

```powershell
node scripts/serve.mjs --root docs --port 4173
node scripts/serve.mjs --root .preview/demo --port 4174
```

Both servers support `/portfolio-preview/` to simulate a GitHub Pages repository prefix, for example [the prefixed real portfolio](http://127.0.0.1:4173/portfolio-preview/).

## Content and architecture

| Source | Responsibility |
| --- | --- |
| `src/content.mjs` | Real `PortfolioContent` configuration, JSDoc types, independent content copies, and build-time validation |
| `src/projects.mjs` | Preserved project narratives, stable IDs, original image filenames, captions, crop choices, and development status |
| `src/stack.mjs` | Stack categories and project/workflow usage descriptions; no proficiency ratings or credential claims |
| `src/demo-content.mjs` | Explicit sample records for empty optional collections, used only by the demo build |
| `src/render.mjs` | Semantic HTML rendering, section order, generated numbering, native project disclosures, and optional-section omission |
| `src/styles.css` | Design tokens, locally hosted fonts, responsive layouts, badge flip, and authentic screenshot framing |
| `src/app.js` | Navigation tracking, badge and skills controls, project selection/history, shared image dialog, highlights, and email-copy feedback |
| `src/hero-avatar.js` | Deferred Three.js hero enhancement, drag/keyboard rotation, bounded tilt, fallback, and rendering lifecycle |
| `scripts/build.mjs` | Real/demo output, assets and Three.js vendor copy, separate avatar utility, and old-project compatibility redirects |
| `assets/` | Original project captures, existing avatar, decorative illustrations, and licensed fonts |
| `docs/` | Generated real portfolio, ready for a separate publication step |

Edit profile text, expertise, quick facts, qualifications, optional content collections, and contact links in `src/content.mjs`. Edit existing project narratives and screenshots in `src/projects.mjs`. Edit the tools and their usage descriptions in `src/stack.mjs`, and the section introduction in `src/content.mjs` (`stackIntro`). The normal configuration deliberately has no dated employment/education history or achievement statistics. Existing qualification records remain separate from the Stack.

Each collection record has a stable lowercase ID. The Stack retains the existing `skills`/`skillCategories` configuration keys and `#skills` fragment for compatibility. Stack entries reference `categoryId`; optional project technology tags reference `skillIds`. Adding a record should not require copying HTML or changing layout code. Counts, section numbers, project selectors, and achievement progress follow the content collections. Missing optional credential, résumé, and social links are not rendered.

The validator rejects duplicate IDs, missing category or skill relationships, invalid numeric achievement values, missing referenced local assets, and assets that would escape the site or require an external host. Keep asset paths repository-relative, such as `assets/projects/nomi.png`. Keep the seven current project IDs stable so existing links continue to resolve.

## Interaction and compatibility

- The persistent navigation highlights the visible section; narrow screens use a menu button. Empty collections contribute neither sections nor navigation links.
- The badge’s reverse displays “What I am” from the expertise collection. Its visible button supports mouse, touch, and keyboard; inactive faces do not receive focus. Reduced motion changes faces without a rotating transition.
- Stack category controls fade unrelated tiles without rearranging them. Hover, focus, and touch selection update the preview. A missing logo falls back to the skill symbol.
- Project selection expands an inline panel. “Read case study” opens the preserved idea, design-focus, details, and current-status text. One shared dialog enlarges the actual screenshot and returns focus to its opener.
- Old `projects/<id>.html` URLs redirect to `index.html#project-<id>` and include an ordinary fallback link. Direct project fragments and browser Back/Forward restore the selected case study.
- Highlights use a horizontal rail, optional numeric counters, and previous/next controls. Touch and reduced-motion use ordinary horizontal scrolling. Results remain readable without animation.
- The contact address and “Write a message” control open a native popup with name, reply email, subject, message, and attachments. The unconnected state is explicit and cannot send. The email-app link remains a no-JavaScript fallback; it depends on the visitor's mail application setup. Copy-email feedback announces success or failure.

The page remains readable without JavaScript: all project panels are available as native disclosures, case-study text can be opened, navigation and contact links remain functional, the avatar poster stays visible, the badge’s expertise is repeated as text, and skill names/categories/descriptions are available as a semantic list. JavaScript enhances this HTML rather than supplying the primary content.

## Contact form delivery

The popup uses the owner-supplied public Zoho Forms embed configured in `src/content.mjs`. It loads only when a visitor opens the popup, with the basic embed and no added referrer tracking. Email and the subject/message fields are marked required; name and file upload are optional. The current published subject/message labels are still “Single Line” and “Multi Line”; rename these in the Zoho builder. A direct hosted-form link remains available without site JavaScript, and another opens the form separately if the embed cannot load. Recipient notifications and delivery are managed in Zoho Forms. Do not put SMTP passwords or private API keys in the source or generated output.

Configure one of these fields in `src/content.mjs`, then rebuild:

- `contact.formEmbedUrl`: a hosted form's public iframe URL, such as a Zoho Forms link from **Share → Embed → iframe**. The form loads only when the popup opens. The provider owns the fields, upload limits, CAPTCHA, validation, and delivery. Build the hosted form with name, reply email, subject, message, and a File Upload field, and configure owner email notifications to the portfolio's contact address. This mode uses the provider's form layout inside the portfolio popup; local composer fields are hidden. Zoho Forms Free retains branding and does not include uploaded files as email attachments; check the current plan before enabling it. See [Zoho's embedding guide](https://help.zoho.com/portal/en/kb/forms/embedding-forms/embedding-forms-in-webpages/articles/embed-using-iframe) and [free-plan limits](https://help.zoho.com/portal/en/kb/forms/faqs-frequently-asked-questions/general/articles/what-are-the-benefits-that-i-can-enjoy-in-free-plan).
- `contact.formEndpoint`: a public HTTPS endpoint for the styled local composer. The adapter posts multipart fields `name`, `email`, `subject`, `message`, `_gotcha`, and repeated `attachment` fields; it requires CORS support and an explicit JSON `{ "ok": true }` acceptance response. This matches a Formspree-style endpoint; an arbitrary email API or Zoho hosted-form URL is not interchangeable with it. Configure provider notifications, spam controls, and attachment support in that provider's dashboard.

When configured with `formEndpoint`, the local composer allows five files totaling up to 10 MB, with filenames, sizes, and removal controls. Files are kept in memory and are sent only on submission. Closing/reopening retains the current draft; reloading does not. Submitting disables repeated sends and field edits until the response arrives. Only an acknowledged success clears the draft. Timeouts and network errors preserve it without automatic retries or a false success message. These local limits do not apply to the hosted Zoho form, which controls its own uploads and submission behavior. No live submission has been performed; receipt in the owner's inbox still needs verification after notification setup.

## Interactive avatar

The hero displays `assets/avatar/joshua-avatar.png` immediately, then loads the existing GLB and locally bundled Three.js when the browser can perform the enhancement. The model stays in its supplied fixed pose. Drag horizontally or focus the canvas and press Left/Right to rotate; use Home or the visible reset button to return to the front. Fine pointers add restrained tilt. Vertical touch scrolling is preserved and the hero has no wheel zoom.

Rendering uses a maximum pixel ratio of 1.5, pauses offscreen and in hidden tabs, and retains the poster if the model or WebGL is unavailable. Reduced motion disables pointer-driven tilt. The homepage uses the original static derivative; body animation is available in the separate avatar utility.

The separate [avatar utility](http://127.0.0.1:4173/avatar.html) remains available at `avatar.html`, outside the main portfolio navigation. Its rigged model has 22 bones, Rest/Greeting/Present poses, and Idle/Wave animations with play/pause and reset. It also offers camera angles, full-body/portrait framing, optional turntable rotation, transparent PNG export, and download of the rigged GLB. The editable rig is `avatar/hi3d-rigged.blend`. This is a body rig for moderate poses; independent fingers and facial animation are not included. Blender posing and regeneration instructions are in [avatar/README.md](avatar/README.md).

## Validation

```powershell
npm test
npm run build
npm run check
npm run check:rig
npm run build:demo
npm run check:demo
```

Content tests cover preservation of authentic project fields, isolation of demo records, invalid references, missing assets, and extending the collections. Output checks verify relative local links and fragments, unique IDs, headings, contact links, authentic image references, section omission, compatibility redirects, local fonts, and absence of external runtime resources.

Run browser checks separately for interaction, responsive layouts, keyboard and touch use, reduced motion, unavailable WebGL, no JavaScript, and `/portfolio-preview/` hosting. Build or static-check success alone is not evidence of completed browser QA. Record current results in `VERIFICATION.md`; older verification records describe their dated version only.

The build updates generated pages, copies local assets, and removes obsolete generated project HTML when a project is removed. It does not remove old copied assets automatically; review unused assets before publishing. Demo output remains isolated under `.preview/`.

## Asset and copy policy

Use authentic screenshots of the applications or the owner’s existing website. Do not replace their interfaces with generated panels, change visible result values, invent personal accomplishments, or imply that a development project is released. Historical development captures show interface design, not proof that every feature is complete or a source of customer metrics. CSS framing preserves the selected original interface regions.

The badge lanyard and contact illustration are decorative generated artwork. They are separate from project evidence. The avatar is the existing owner-supplied image-generated character. See [asset provenance](ASSET_PROVENANCE.md) for sources and font licenses.

The profile retains the stated UX design and AI & Python development certificates without adding issuers, dates, degrees, employers, or locations. It describes the projects as independent and acknowledges AI tools in the process.

## Static hosting

`docs/` contains the complete real website and works at a domain root or repository prefix. Rendering uses no backend, private API keys, CDN, external font service, or analytics. Contact delivery is optional and needs a configured external form service: hosted embeds load on opening the popup; direct endpoints are contacted only on Send. With both settings empty, the contact composer makes no external requests. Three.js 0.180.0 and its MIT license are copied from the pinned local dependency; fonts and their SIL Open Font License notices ship locally.

To publish later through GitHub Pages, upload or commit the portfolio and rebuilt `docs/`, then select the branch and `/docs` folder in the repository’s **Settings → Pages**. Only this portfolio is needed; publishing it does not require publishing the application repositories. Follow the [GitHub Pages documentation](https://docs.github.com/en/pages/getting-started-with-github-pages) for the account’s available hosting options.

This redesign is local work. It does not create a repository or perform a public deployment.

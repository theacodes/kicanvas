# kicanvas_DU

This repo is a fork of [KiCanvas](https://github.com/theacodes/kicanvas), a
browser viewer for KiCad schematics and boards. It is used to review student
KiCad projects: students push their projects to GitHub, the reviewer opens the
repo link in KiCanvas and marks it up with comments.

- `origin`: https://github.com/gfm16617/kicanvas_DU (this fork)
- `upstream`: https://github.com/theacodes/kicanvas
- Forked from upstream commit `b031159` ("fix: file loading fails when path
  contains URL-encoded characters (#192)")

**Keep the change log below up to date.** Whenever you change code relative
to upstream, add an entry that says what changed, why, and which files were
touched. This makes it possible to merge upstream updates later.

## Running and checking

- `npm install`, then `npm run serve`, then open
  `http://localhost:8001/?github=<repo or folder URL>`. The page rebuilds
  automatically when files change.
- `npx tsc -p tsconfig.json` checks types, `npm run lint` runs eslint, tsc and
  prettier, and `npm test` runs the unit tests in headless Chrome.
- Formatting follows prettier: 4 spaces, 80 columns, trailing commas.
- Windows note: if `git push` fails with "unable to get local issuer
  certificate", push with
  `git -c http.sslBackend=schannel push`, or set it globally.

## Change log (differences from upstream)

### v1.1: review annotations (branch `kicanvas_DU_v1_1`, commit `3536dd4`)

The reviewer can draw comments on top of schematics and boards and save them
as a JSON file.

- **Drawing tools**: a toolbar at the top-left of each viewer offers
  select/move, pinned note, arrow, circle (Shift draws a perfect circle), box,
  freehand, and show/hide marks. Each mark has a severity (`info`,
  `suggestion`, `warning`, `error`, shown as "Must fix") and a comment. Click a
  mark to edit or delete it, or drag it to move it. Esc closes the editor and
  leaves the current tool.
- **Rendering**: marks are drawn in an SVG/HTML overlay on top of the canvas,
  not in the WebGL renderer. They are stored in document coordinates (mm,
  Y down) and projected to the screen every frame, so they follow pan, zoom
  and flip.
- **Anchors**: when a mark is created or moved, the footprint or symbol
  (reference, value, uuid), net, or hierarchical sheet under its target point
  is recorded. The target point is the note position, the arrow tip, the
  centre of a circle or box, or the first point of a freehand mark.
- **Review panel**: a "Review" sidebar tab lists every comment across all
  pages, grouped by page. Clicking a comment switches to its page and zooms to
  it. The panel also has a reviewer name field, Export/Import/Clear buttons,
  and the source repo and commit. It warns when the repo has moved to a newer
  commit than the one that was reviewed.
- **Persistence**: the review autosaves to `localStorage`. The key is
  `kicanvas:review:url:<source url>`, or the list of files when the project
  was opened from local files.
- **Source info**: the shell passes the opened URL to the review. For GitHub,
  the review records the owner, repo, ref and path, and looks up the commit
  SHA through the GitHub API.
- The tools and the panel only appear when `controls="full"`.

Files:

- New: `src/kicanvas/review/review.ts`, which holds the data model,
  `ReviewStore` (add, update, remove, autosave, `to_json`, `parse`) and the
  geometry helpers.
- New: `src/kicanvas/elements/common/review-layer.ts`, the `<kc-review-layer>`
  overlay with the drawing tools, editor popup and focus/zoom.
- New: `src/kicanvas/elements/common/review-panel.ts`, the
  `<kc-review-panel>` sidebar tab.
- `src/viewers/base/events.ts` and `src/viewers/base/viewer.ts`: added
  `KiCanvasDrawEvent`, which is sent at the end of every `on_draw()` so
  overlays can stay aligned with the canvas.
- `src/kicanvas/project.ts`: `Project.review` holds a `ReviewStore`.
- `src/kicanvas/elements/kicanvas-shell.ts`: `setup_project(vfs, source_url)`
  calls `project.review.attach(url, files)` after loading.
- `src/kicanvas/elements/common/app.ts`: adds `<kc-review-layer>` to the
  viewer area and the Review activity to the sidebar.

Review JSON format (`format: "kicanvas-review"`, `version: 1`, `units: "mm"`):

- The top level holds `source {url, host, owner, repo, ref, commit, path}`,
  `reviewer`, `created`, `modified`, `files[]` and `annotations[]`.
- Each annotation holds `id`, `number`, `type` (`note`, `arrow`, `ellipse`,
  `rect` or `pen`), `severity`, `text`, `doc_type` (`schematic` or `pcb`),
  `file`, `sheet_path`, `page_name`, `geometry`, `bbox [x, y, w, h]`,
  `anchor {reference, value, uuid, net, sheet}` (may be null), `author`,
  `created` and `modified`.
- Geometry per type:
    - `note`: `{at}`
    - `arrow`: `{from, to}`
    - `ellipse`: `{center, radius: [rx, ry]}`
    - `rect`: `{start, end}`
    - `pen`: `{points[]}`
    - All points are `[x, y]` in mm.
- A page is identified by `file` plus `sheet_path`. The key is
  `file:sheet_path`, matching `ProjectPage.project_path`.
- If the format changes, increase `REVIEW_VERSION` and keep `ReviewStore.parse`
  able to read older files.

### v1.1: KiCad colours toggle (branch `kicanvas_DU_v1_1`)

- A toolbar button at the top right of both viewers (`contrast` icon,
  `name="toggle_theme"`) switches the global theme between `witchhazel`
  (KiCanvas dark) and `kicad` (KiCad's default colours: cream schematic,
  dark navy PCB). The choice is saved in Preferences, so both viewers change
  together.
- The `controlslist` attribute has a new flag, `theme`, which is on by default
  when controls are enabled.
- The theme dropdown in the Preferences panel now follows changes made by the
  toggle.
- Files: `src/kicanvas/elements/common/app.ts`,
  `src/kicanvas/elements/common/preferences-panel.ts`.

## Ideas and next steps

- A `?review=<json url>` URL parameter, so a student can open the reviewer's
  marked-up review directly from a link.
- A KiCad plugin that loads the review JSON. On the PCB it would draw the
  marks and text on the `User.Comments` layer (pcbnew units are nm, so
  multiply mm by 1e6). Schematics are harder because KiCad's scripting support
  for editing schematics is limited.

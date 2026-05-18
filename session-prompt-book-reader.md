# Alexandria — Session Prompt: 3D Book Reader (Phase 4)

### New Chat Initialization · Phase 4: Book Reader Polish

---

## Read this entire prompt before doing anything. Confirm your understanding. Ask only what you need. Do not start work until the user tells you what they need.

---

## What We're Building This Session

Polish and fix the **3D Book Reader** built in Phase 3. The reader renders but has known issues to address (see Phase 4 work below). Comic format is explicitly **out of scope**. Book format only.

---

## What Is Already Done (do NOT rebuild or re-discuss)

### Phase 1 — Foundation (complete, committed)
- `ReadingMode` includes `'book'`; `Layer` has `is_spread_layer: boolean`
- `EditorRail`: Book as third reading mode; transition controls hidden for book
- `Reader.tsx`: `isBook` correctly defined and wired
- DB: `reading_mode` constraint updated, `is_spread_layer` and stroke-style columns added
- R3F installed: `@react-three/fiber`, `three`, `@react-three/drei`, `@types/three`

### Phase 2 — Book Spread Editor (complete, committed)
- `EditorFilmstrip`: spread-paired thumbnails ("1–2", "3–4"), Add Spread, delete spread
- `EditorCanvas`: two-page spread view with spine, page-number badges, grid overlay, empty-state upload button
- Layer selection bug fixed: page frames use `onMouseDown` not `onClick`
- **Spread layer feature fully implemented:**
  - "Spread layer" toggle in Properties rail (book mode only)
  - `is_spread_layer=true` layers render in a `pointer-events:none` overlay spanning the full 800×600 spread
  - Coordinate space: 800×600 for spread layers, 400×600 for page-local layers
  - Drag math uses `displayedSpreadSize` (measured via `spreadRef` ResizeObserver)

### Phase 3 — 3D Book Reader (complete, committed — Session 7)

All files created and pushed:

```
src/components/BookReader/index.tsx       — Canvas, keyboard nav, Navbar
src/components/BookReader/BookScene.tsx   — camera, lights, group scale, state dispatch
src/components/BookReader/BookCover.tsx   — textured plane with Suspense fallback
src/components/BookReader/BookSpread.tsx  — left+right BookPage + spine + spread-layer Html
src/components/BookReader/BookPage.tsx    — PlaneGeometry mesh + <Html transform> layer overlay
src/components/BookReader/usePageTurn.ts  — state machine (0=cover, 1..N=spreads, onEnd)
```

**Architecture as built:**
- Orthographic camera, `zoom: 1` (1 world unit = 1 CSS pixel)
- Pages: `PlaneGeometry(400, 600)` world units. Left page center `(-200, 0, 0)`, right `(200, 0, 0)`
- Group scale = `min(viewportH/600, viewportW/800) * 0.93` computed in `BookScene` via `useThree`
- `<Html transform>` containers: 400×600px (page-local), 800×600px (spread layers)
- Framer Motion `initial={{ opacity: 0 }} animate={{ opacity: 1 }}` inside Html for fade-in
- `key={spreadIndex}` on `BookSpread` forces fresh remount on each turn
- Navbar shown in reader; hidden in editor preview mode
- `.reader-book-container { position: fixed; inset: 0 }` in reader.css

**Known issue entering Phase 4:**
- Layer images appear very small on the page (not filling the page area). The `<Html transform>` + group scale interaction is not producing correct pixel mapping — layer content renders at native CSS pixel size before the group scale is applied, so it appears tiny on the mesh. Needs investigation and fix.

---

## Architecture Decisions (locked)

- **Page dimensions**: 400 × 600px per page (2:3 ratio). Full spread = 800 × 600px.
- **Two-page spread**: reader always shows left + right page together as an open book.
- **Page turn trigger**: click to advance. No drag-to-turn for MVP.
- **Pages = panels**: one panel per page. Spread N has left = `sortedPanels[N*2]`, right = `sortedPanels[N*2+1]`.
- **Cover**: book opens from a 3D cover. Cover uses `story.cover_url`.
- **Layers rendered via R3F Html overlay**: no texture baking. `<Html>` from `@react-three/drei` renders each page's layers as DOM inside the 3D scene.

---

## Phase 4 Work

**Primary task: Fix layer content scaling inside `<Html transform>`.**

The core issue: `<Html transform>` applies the camera's `viewProjectionMatrix * objectWorldMatrix` as a CSS `matrix3d`. With an orthographic camera at zoom=1 and a parent group scaled by `s`, the Html element's CSS transform includes the scale `s`. A 400px-wide HTML div then appears as `400 * s` pixels wide on screen — but the group scale is already making the mesh appear at the correct viewport size. So the layers render much too small (at their raw CSS px size before the scale factor inflates the mesh).

**Fix approaches to consider (discuss before implementing):**
1. Counter-scale the Html content by `1/s` so it fills the 400px container on-screen
2. Drop `<Html transform>` and use regular `<Html>` (non-transform), positioning the DOM containers manually over the canvas using projected 3D coordinates
3. Switch from PlaneGeometry(400,600) + group scale to PlaneGeometry(1,1.5) + camera-zoom approach, and use `distanceFactor` on Html to match the mesh size
4. Use `scale={1/400}` on the Html element with a 1px×1.5px world-unit container and let the group scale handle the rest

**Navigation (working as built):**
- Arrow keys / Space → next; Left arrow → prev
- Click right half → next, left half → prev
- Navbar prev/next buttons

---

## Key Files to Read Before Starting

```
src/components/BookReader/BookScene.tsx   — group scale logic
src/components/BookReader/BookPage.tsx    — Html transform setup
src/components/BookReader/BookSpread.tsx  — spread layer Html
src/components/BookReader/index.tsx       — Canvas camera setup
src/pages/Reader.tsx                      — wire-up, isBook, panels
src/types/index.ts                        — BOOK_PAGE_WIDTH, BOOK_PAGE_HEIGHT
```

---

## Model / Effort Guide

| Model | When to use |
|-------|------------|
| `claude-haiku-4-5` | Mechanical additions, null-check patches, simple reads |
| `claude-sonnet-4-6` | Standard UI, CSS, route wiring, Html overlay layer rendering |
| `claude-opus-4-7` | R3F scene setup, camera math, 3D page-turn animation, spring physics, any feature with 3+ interacting concerns |

---

## How We Work Together (non-negotiable)

1. Read all attached spec files before doing anything.
2. Discuss before building. Never start without confirming the approach.
3. Do not assume or guess. If unclear, ask. One question at a time.
4. Flag scope creep immediately. Push back on unnecessary complexity.
5. All mockups are HTML files. Never use chat widgets.
6. **Always include effort level + model with every Claude Code instruction block.**
7. **Auto-adjust model per task.** Confirm on arrival.
8. Never make unrequested changes. Flag first, ask, then act.
9. Update both living documents after every meaningful build session.

---

## On Arrival

1. Read this prompt in full.
2. Read all BookReader component files.
3. State your understanding of the known scaling bug and the fix options.
4. Confirm: "I will auto-adjust model and effort level per the guide."
5. Propose your preferred fix approach and ask for confirmation before writing any code.

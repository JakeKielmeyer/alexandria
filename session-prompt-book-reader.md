# Alexandria — Session Prompt: 3D Book Reader (Phase 3)

### New Chat Initialization · Phase 3: 3D Reader

---

## Read this entire prompt before doing anything. Confirm your understanding. Ask only what you need. Do not start work until the user tells you what they need.

---

## What We're Building This Session

The **3D Book reader** — Phase 3. Phases 1 and 2 are complete (see below). This session builds the actual reader experience: a React Three Fiber scene with a 3D book, page-turn animation, and HTML-overlaid layers.

Comic format is explicitly **out of scope**. Book format only.

---

## What Is Already Done (do NOT rebuild or re-discuss)

### Phase 1 — Foundation (complete, committed)
- `ReadingMode` includes `'book'`; `Layer` has `is_spread_layer: boolean`
- `EditorRail`: Book as third reading mode; transition controls hidden for book
- `Reader.tsx`: `isBook` branch stub — renders a placeholder `<div>` for now
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

---

## Architecture Decisions (locked)

- **Page dimensions**: 400 × 600px per page (2:3 ratio). Full spread = 800 × 600px.
- **Two-page spread**: reader always shows left + right page together as an open book.
- **Page turn trigger**: click to advance. No drag-to-turn for MVP.
- **Pages = panels**: one panel per page. Spread N has left = `sortedPanels[N*2]`, right = `sortedPanels[N*2+1]`.
- **Cover**: book opens from a 3D cover (spine visible, front cover shown). Cover uses `story.cover_url`.
- **Layers rendered via R3F Html overlay**: no texture baking. `<Html>` from `@react-three/drei` renders each page's layers as DOM inside the 3D scene.

---

## Phase 3 Build Plan

### Files to create

```
src/components/BookReader/index.tsx         — entry point, wraps Canvas
src/components/BookReader/BookScene.tsx     — R3F Canvas, camera, lights, state
src/components/BookReader/BookCover.tsx     — 3D closed book + open animation
src/components/BookReader/BookSpread.tsx    — two-page spread with Html overlays
src/components/BookReader/BookPage.tsx      — page geometry (flat for MVP; curl deferred)
src/components/BookReader/usePageTurn.ts   — state machine (cover → spread N → end)
```

### Wire-up in Reader.tsx

```tsx
// src/pages/Reader.tsx — already has isBook flag
// Replace the placeholder <div> with:
import BookReader from '../components/BookReader'
// ...
{isBook && <BookReader story={story} panels={sortedPanels} layers={layers} />}
```

### Camera and scene setup

- Orthographic camera looking straight at the spread (no perspective distortion for MVP)
- Or perspective with a shallow FOV (45°) positioned ~2 units back — more bookish feel
- Scene background: `var(--color-void)` (#0E0608)
- Ambient light + directional from above-left for soft page shadow

### Page geometry

- Each page: a `<mesh>` with `PlaneGeometry(1, 1.5)` (2:3 ratio), scaled to fill viewport
- Texture approach: **R3F `<Html>` overlay** (not texture baking — simpler, layers stay live DOM)
- `<Html transform>` from drei wraps each page's layer stack

### Page turn (MVP — click to turn, no curl)

- State: `spreadIndex` (0 = cover, 1 = spread 1, 2 = spread 2, …, N+1 = end page)
- Transition: Framer Motion opacity crossfade between spreads, OR a simple 3D rotation (Y-axis flip of the left page mesh, 0° → -180°, spring physics)
- For MVP: opacity fade is safest. The 3D flip can be layered on top.
- `usePageTurn` hook manages state, exposes `{ spreadIndex, goNext, goPrev, isAnimating }`

### Keyboard / click navigation

- Arrow keys (left/right), spacebar → `goNext`
- Click right half of spread → `goNext`, click left half → `goPrev`
- Escape → back to story list (existing reader escape behaviour)

---

## Key Files to Read Before Starting

```
src/pages/Reader.tsx                     — wire-up point; already has isBook stub
src/types/index.ts                       — Panel, Layer, Story, BOOK_PAGE_HEIGHT
src/hooks/useReaderData.ts               — how panels + layers are fetched
src/styles/reader.css                    — reader layout tokens; add book tokens here
```

Also read the existing cinematic reader components to understand the layer rendering pattern that must be replicated inside the R3F Html overlay.

---

## Model / Effort Guide

| Model | When to use |
|-------|------------|
| `claude-haiku-4-5` | Mechanical additions, null-check patches, simple reads |
| `claude-sonnet-4-6` | Standard UI, CSS, route wiring, Html overlay layer rendering |
| `claude-opus-4-7` | R3F scene setup, camera math, 3D page-turn animation, spring physics, any feature with 3+ interacting concerns |

**This session is heavy on `claude-opus-4-7`** — R3F scene, camera, page geometry, and animation state.

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
2. Read `src/pages/Reader.tsx` and the cinematic reader components to understand the existing layer render pattern.
3. Read `src/types/index.ts` for the data model.
4. State your understanding of what's built and what we're adding.
5. Confirm: "I will auto-adjust model and effort level per the guide."
6. Propose the Phase 3 build order and ask for confirmation before writing any code.

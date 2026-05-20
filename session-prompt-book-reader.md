# Alexandria — Session Prompt: Book Pivot (Phase 4 onwards)

### New Chat Initialization · Continue from Phases 0–3 complete

---

## IMPORTANT — READ BEFORE DOING ANYTHING

1. Run `git pull` and confirm you are on the latest commit on `master`. Show the output of `git log --oneline -5` so Jake can verify.
2. Read this entire prompt.
3. Read the plan file at `C:\Users\jakeK\.claude\plans\handoff-book-snug-stearns.md` in full.
4. Ask any clarifying questions you have before starting any work.
5. Do not write a single line of code until Jake tells you to proceed.

---

## What This Session Is

Continuing the Alexandria book-first pivot. Phases 0–3 are **complete and committed**. The next phase is **Phase 4: Portrait/Mobile View in BookReader**. However — read the plan, confirm your understanding, and ask any questions first.

---

## What Has Been Completed (do NOT rebuild or re-discuss)

### Phase 0 — Page Dimensions ✓
All constants updated from 400×600 to **796×879 per page / 1592×879 spread**:
- `BOOK_PAGE_WIDTH = 796`, `BOOK_PAGE_HEIGHT = 879`, `BOOK_SPREAD_WIDTH = 1592` in `src/types/index.ts`
- `BookCover`, `BookPage`, `BookSpread` — all `PlaneGeometry` args updated
- `EditorCanvas` — spread canvas updated to 1592×879

### Phase 1 — Layer Rendering Fix ✓
**Root cause found and resolved:** `<Html transform>` inside a scaled `<group>` uses a hardcoded matrix3d divisor (factor 40) that makes full-page content render at the wrong visual size regardless of CSS pixel value. Three separate approaches failed. Final fix:

- **Removed `<Html transform>` entirely** from all BookReader components
- **`BookPage.tsx`** — mesh only (PlaneGeometry + click handler)
- **`BookSpread.tsx`** — mesh only (two BookPage meshes + spine shadow)
- **`BookScene.tsx`** — mesh only (BookSpread + lights, no panel/layer data)
- **`BookReader/index.tsx`** — owns all layer rendering: CSS overlay (`position: absolute; inset: 0`) with native 796×879 content divs + `transform: scale(scale)` + `transformOrigin: top left`. Positioned using same formula as BookScene. PanelLayers renders at native size; CSS scale handles visual sizing at all viewport sizes.

### Navigation Fix ✓
- `Cover.tsx` (upstream HTML component) already shows the full cover page with "TAP TO BEGIN"
- `BookReader` now starts at `spreadIndex = 1` (first content spread) — no redundant 3D cover mesh
- `usePageTurn` accepts `startAt` param (default 1); `goPrev` min is `startAt`
- Left arrow disabled at spread 1

### Phase 2 — Reading Direction (LTR/RTL) ✓
- `stories.reading_direction text NOT NULL DEFAULT 'ltr'` — migration: `supabase-migrations/2026-05-20-reading-direction.sql`
- `ReadingDirection = 'ltr' | 'rtl'` type added to `src/types/index.ts`
- Panel swap in `BookReader/index.tsx`: `isRTL` flips `evenPanel`/`oddPanel` assignment to `leftPanel`/`rightPanel`
- Reading direction selector in EditorRail Publish tab (book-mode-only), `rail-option-btn` pattern, saves via `updateStory`
- Navigation arrows keep same semantics (right = next spread) in Phase 2; curl direction reversal deferred to Phase 5

### Phase 3 — Mobile Layer Override Columns ✓
- 5 new nullable columns on `layers`: `mobile_hidden boolean NOT NULL DEFAULT false`, `mobile_x_percent real`, `mobile_y_percent real`, `mobile_width_percent real`, `mobile_height_percent real`
- Migration: `supabase-migrations/2026-05-20-mobile-layer-overrides.sql`
- `Layer` interface in `src/types/index.ts` updated with all 5 fields
- `useAutoSave.ts` layer UPDATE payload includes all 5 fields
- **No** changes to `BookPage.tsx` yet — mobile override resolution is wired in Phase 4 when `isMobileView` exists

---

## Current Architecture

```
src/components/BookReader/
  index.tsx        — Canvas + CSS layer overlay + panel selection (RTL-aware) + ResizeObserver + nav
  BookScene.tsx    — R3F scene: lights, group scale, BookSpread mesh
  BookSpread.tsx   — Two BookPage meshes + spine shadow (mesh-only, no layers)
  BookPage.tsx     — PlaneGeometry(796, 879) + click handler (mesh-only)
  usePageTurn.ts   — spreadIndex state machine (starts at 1, not 0)
  BookCover.tsx    — Unused in normal flow; kept for potential future use
src/pages/
  Cover.tsx        — Full HTML cover page with "TAP TO BEGIN" CTA (upstream of BookReader)
  Reader.tsx       — Routes to Cover → BookReader for book mode
src/hooks/
  useAutoSave.ts   — Saves all story + layer fields including reading_direction and mobile_* columns
src/types/index.ts — ReadingDirection type, Story.reading_direction, Layer mobile override fields
```

**Scale formula** (identical in BookScene and the CSS overlay in index.tsx):
```ts
scale = Math.min(containerH / 879, containerW / 1592) * 0.93
```

**CSS overlay panel positions** (for spread, centerX = containerW/2, centerY = containerH/2):
```
Left page:  left = cx - 796*scale,  top = cy - 879*scale/2,  width=796, height=879, scale(scale)
Right page: left = cx,              top = cy - 879*scale/2,  width=796, height=879, scale(scale)
Spread:     left = cx - 796*scale,  top = cy - 879*scale/2,  width=1592, height=879, scale(scale)
```

**Panel selection** (in index.tsx, RTL-aware):
```ts
const isRTL = story.reading_direction === 'rtl'
const evenPanel = spreadIndex > 0 ? (panels[(spreadIndex - 1) * 2]     ?? null) : null
const oddPanel  = spreadIndex > 0 ? (panels[(spreadIndex - 1) * 2 + 1] ?? null) : null
const leftPanel  = isRTL ? oddPanel  : evenPanel
const rightPanel = isRTL ? evenPanel : oddPanel
```

**Mobile override cascade** (to be resolved in Phase 4 when `isMobileView` exists):
```ts
function mobileX(layer: Layer): number { return layer.mobile_x_percent ?? layer.x_percent }
// Same pattern for y, width, height. mobile_hidden = true → hide layer in mobile view.
```

---

## Next Phase: Phase 4 — Portrait/Mobile View in BookReader

See the plan file for full details. At a high level:
- Detect portrait orientation (`window.innerWidth < window.innerHeight` or width < 768px)
- Portrait path renders single `BookPage` (not BookSpread), full viewport
- `usePageTurn` advances one panel at a time in portrait (not two)
- Touch: `touchstart` / `touchend` swipe detection (dx threshold ~50px)
- Apply `mobile_hidden` and `mobile_x/y/w/h_percent` overrides to layers in portrait view
- 3D: portrait page inherits same R3F canvas; page turn is single-page curl (Phase 5)

**Files to modify:**
- `src/components/BookReader/index.tsx` — orientation detection, portrait branch
- `src/components/BookReader/BookPage.tsx` — accept `isMobile` prop, apply mobile overrides
- `src/components/reader/PanelLayers.tsx` — accept and apply mobile position overrides

**But read the plan before starting. Ask questions first.**

---

## Remaining Phases (from plan)

- **Phase 4** — Portrait/mobile view in BookReader (Sonnet, Normal) ← NEXT
- **Phase 5** — Paper curl / EndlessBook-style page turn (Opus, Max)
- **Phase 6** — Mobile editor canvas (Opus, Max)
- **Phase 7** — New platform-design-spec.html + launch plan (Opus, Max)

Full phase details, model/effort assignments, and timeline in the plan file.

---

## Key Files to Read on Arrival

```
C:\Users\jakeK\.claude\plans\handoff-book-snug-stearns.md   — full plan (READ THIS FIRST)
src/components/BookReader/index.tsx                          — CSS overlay, scale, nav, RTL panel swap
src/components/BookReader/BookScene.tsx                      — R3F scene
src/components/reader/PanelLayers.tsx                        — layer rendering (needs mobile override wiring in Phase 4)
src/pages/Reader.tsx                                         — reader entry point
src/types/index.ts                                           — all interfaces including new mobile fields
supabase-migrations/                                         — existing migration pattern to follow
```

---

## Standing Instructions

- **Auto-update documentation** after every meaningful phase: `platform-design-spec.html`, this session prompt, and `project_state.md` memory file — without being asked.
- **Auto-adjust model and effort** per the plan's model/effort table.
- **Confirm before coding.** Read the plan, ask questions, wait for go-ahead.
- **Do not assume or guess.** If something in the plan is unclear, ask.
- **SQL output in chat.** When a migration step is ready, print the SQL in chat for copy-paste before writing the file.
- Quality >>> speed. Jake's own stories are the real client.

# Alexandria — Session Prompt: Book Pivot (Phase 2 onwards)

### New Chat Initialization · Continue from Phase 1 complete

---

## IMPORTANT — READ BEFORE DOING ANYTHING

1. Read this entire prompt.
2. Read the plan file at `C:\Users\jakeK\.claude\plans\handoff-book-snug-stearns.md` in full.
3. Ask any clarifying questions you have before starting any work.
4. Do not write a single line of code until Jake tells you to proceed.

---

## What This Session Is

Continuing the Alexandria book-first pivot. Phases 0 and 1 are **complete and committed**. The next phase is **Phase 2: Reading Direction (LTR/RTL)**. However — read the plan, confirm your understanding, and ask any questions first.

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

---

## Current Architecture

```
src/components/BookReader/
  index.tsx        — Canvas + CSS layer overlay + panel selection + ResizeObserver + nav
  BookScene.tsx    — R3F scene: lights, group scale, BookSpread mesh
  BookSpread.tsx   — Two BookPage meshes + spine shadow (mesh-only, no layers)
  BookPage.tsx     — PlaneGeometry(796, 879) + click handler (mesh-only)
  usePageTurn.ts   — spreadIndex state machine (starts at 1, not 0)
  BookCover.tsx    — Unused in normal flow; kept for potential future use
src/pages/
  Cover.tsx        — Full HTML cover page with "TAP TO BEGIN" CTA (upstream of BookReader)
  Reader.tsx       — Routes to Cover → BookReader for book mode
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

**Panel selection** (in index.tsx):
```ts
leftPanel  = panels[(spreadIndex - 1) * 2]     // panels[0] on spread 1
rightPanel = panels[(spreadIndex - 1) * 2 + 1] // panels[1] on spread 1
```

---

## Next Phase: Phase 2 — Reading Direction (LTR / RTL)

See the plan file for full details. At a high level:
- New `reading_direction: 'ltr' | 'rtl'` column on stories table
- RTL swaps left/right panel assignment in `index.tsx`
- RTL also swaps page-turn direction (future: curl animation direction)
- New migration in `supabase-migrations/`
- Editor toggle in `EditorRail.tsx` (Publish tab)

**But read the plan before starting. Ask questions first.**

---

## Remaining Phases (from plan)

- **Phase 3** — Mobile layer override columns (Haiku, Normal)
- **Phase 4** — Portrait/mobile view in BookReader (Sonnet, Normal)
- **Phase 5** — Paper curl / EndlessBook-style page turn (Opus, Max)
- **Phase 6** — Mobile editor canvas (Opus, Max)
- **Phase 7** — New platform-design-spec.html + launch plan (Opus, Max)

Full phase details, model/effort assignments, and timeline in the plan file.

---

## Key Files to Read on Arrival

```
C:\Users\jakeK\.claude\plans\handoff-book-snug-stearns.md   — full plan (READ THIS FIRST)
src/components/BookReader/index.tsx                          — CSS overlay, scale, nav
src/components/BookReader/BookScene.tsx                      — R3F scene
src/pages/Reader.tsx                                         — reader entry point, isBook wiring
src/types/index.ts                                           — constants + all interfaces
supabase-migrations/                                         — existing migration pattern to follow
```

---

## Standing Instructions

- **Auto-update documentation** after every meaningful phase: `platform-design-spec.html`, this session prompt, and `project_state.md` memory file — without being asked.
- **Auto-adjust model and effort** per the plan's model/effort table.
- **Confirm before coding.** Read the plan, ask questions, wait for go-ahead.
- **Do not assume or guess.** If something in the plan is unclear, ask.
- Quality >>> speed. Jake's own stories are the real client.

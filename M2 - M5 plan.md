# Alexandria — M2–M5 Implementation Plan

## Context

M1 (StPageFlip engine) is complete. This document covers the remaining milestones to ship all three formats (comic, book, webtoon) in one platform.

---

## M2 — Paged Editor (desktop spread)

**Definition of done:** Rectangular panels + layer model + text/speech bubbles authored on a 2-page spread; autosave + publish.

### 2.1 Database migrations

**Step 1 — check if spreads migration already ran:**
```sql
select count(*) from spreads;  -- errors if table doesn't exist
```
If it errors, run `supabase-migrations/2026-05-28-spreads-table-page-pairing.sql`.

**Step 2 — new migration file: `supabase-migrations/2026-05-29-paged-columns.sql`**

Apply in order:
1. `stories.page_style TEXT NOT NULL DEFAULT 'hardback' CHECK (page_style IN ('paper','hardback'))`
2. `stories.back_cover_url TEXT`
3. `frames` table (full DDL in `Alexandria-paged-schema.md §3` item 4)
4. `layers.frame_id UUID REFERENCES frames(id) ON DELETE CASCADE` (item 5)
5. RLS for `frames` — mirror pattern from `2026-04-20-rls-policies.sql`

### 2.2 Types — `src/types/index.ts`

Add `Frame` interface:
```typescript
interface Frame {
  id: string
  panel_id: string
  story_id: string
  position: number
  reading_order: number | null
  x_percent: number
  y_percent: number
  width_percent: number
  height_percent: number
  clip: boolean
  gutter_px: number
  created_at: string
}
```

Update `Story` / `StoryWithCreator`:
```typescript
page_style: 'paper' | 'hardback'
back_cover_url: string | null
```
Remove the `(story as any)` casts in `FlipBookReader.tsx` once these fields are typed.

### 2.3 Editor store — `src/store/editorStore.ts`

Add to state: `frames: Frame[]`, `activeFrameId: string | null`

Add mutations: `addFrame`, `updateFrame`, `deleteFrame`, `setActiveFrameId`

Auto-save should include frame mutations (same trailing-debounce pattern as layers).

### 2.4 EditorCanvas — `src/components/editor/EditorCanvas.tsx`

Add **frame-draw tool** (toolbar button or `F` key):
- Mousedown → drag → mouseup draws a rectangle on the active page
- On mouseup: call `addFrame({ panel_id, x_percent, y_percent, width_percent, height_percent })`
- Render existing frames as labeled outlines (thin pink border, frame number badge)
- Click a frame outline → `setActiveFrameId` (layers inside that frame become editable)
- Layers parented to a frame use frame-relative % coordinates

All existing layer drag/resize patterns are unchanged.

### 2.5 EditorFilmstrip — `src/components/editor/EditorFilmstrip.tsx`

Already groups book panels in pairs. Refine:
- Use `spread.position` from the database instead of raw panel index math
- Thumbnail labels: "Spread 1 (pp 2–3)", "Spread 2 (pp 4–5)", etc.
- "Add Spread" creates two new panels linked to a new spread row

### 2.6 EditorRail — `src/components/editor/EditorRail.tsx`

In story Properties tab, add (book/comic mode only):
- `page_style` toggle: "Hardback" / "Paper (Comic)"
- `back_cover_url` image uploader (same upload widget as `cover_url`)

---

## M3 — Cascade + Breakpoint Editor

**Definition of done:** Auto-generated mobile reading order; per-breakpoint overrides (position/size/order); mobile side-swipe reader.

### 3.1 Database migration — `supabase-migrations/2026-05-29-breakpoint-overrides.sql`

1. `breakpoint_overrides` table (full DDL in `Alexandria-paged-schema.md §3` item 6)
2. Migrate existing `layers.mobile_*` rows into `breakpoint_overrides` (item 7)
3. RLS for `breakpoint_overrides`
4. Do NOT drop `mobile_*` columns yet — add a separate migration later after verification

### 3.2 Types — `src/types/index.ts`

Add `BreakpointOverride` interface:
```typescript
interface BreakpointOverride {
  id: string
  story_id: string
  target_type: 'frame' | 'layer'
  target_id: string
  breakpoint: 'tablet' | 'mobile'
  x_percent: number | null
  y_percent: number | null
  width_percent: number | null
  height_percent: number | null
  reading_order: number | null
  is_hidden: boolean
  created_at: string
}
```

### 3.3 Editor breakpoint switcher — `src/components/editor/EditorTopBar.tsx`

Add 3-way toggle: Desktop | Tablet | Mobile

Store active breakpoint in `editorStore`: `activeBreakpoint: 'desktop' | 'tablet' | 'mobile'`

When not Desktop, the canvas overlays the active breakpoint's overrides onto base coords. Layers with `is_hidden=true` for the active breakpoint show at 20% opacity with a ⊘ badge.

### 3.4 Override controls — `src/components/editor/EditorRail.tsx`

When `activeBreakpoint !== 'desktop'`, layer properties panel shows:
- Position/size fields (pre-filled with current override or base values; saved to `breakpoint_overrides` on change)
- "Hidden at this breakpoint" checkbox
- "Reset to desktop" button (deletes the override row)

Saves via upsert on `breakpoint_overrides` (unique constraint: target_type + target_id + breakpoint).

### 3.5 Cascade resolver — `src/lib/cascadeResolver.ts` (new file)

```typescript
function resolveLayer(layer: Layer, overrides: BreakpointOverride[], breakpoint: 'tablet' | 'mobile'): Layer
function resolveFrame(frame: Frame, overrides: BreakpointOverride[], breakpoint: 'tablet' | 'mobile'): Frame
```

Merges sparse override row onto base values. Replaces the current `mobile_hidden` / `mobile_x_percent` checks scattered in `PanelLayers.tsx`. Used in both editor preview and reader.

### 3.6 Mobile reader (comic/book)

In `Reader.tsx`, when `isBook && isPortrait`:
- Do not rely solely on StPageFlip portrait mode
- Show one page at a time using `reading_order` from the cascade resolver
- Horizontal swipe gesture (left/right) advances through pages in reading order

---

## M4 — Reader + Gates + Styling

**Definition of done:** Page-turn reader wired to gate flow; book vs comic (hardback/paper) styling; scene dressing.

### 4.1 Wire reader to spreads

Update (or supplement) `src/hooks/useReaderData.ts` for book mode:
- Fetch spreads ordered by `position`
- Fetch panels linked to each spread (left/right via `page_side`)
- Return `SpreadWithPages[]` alongside the existing flat `PanelWithMeta[]`

Update `FlipBookReader.tsx`:
- Page sequence: front cover (`cover_url`) → left/right pages per spread → back cover (`back_cover_url`)
- Remove the manual index-based pair logic; use explicit `page_side` from DB

### 4.2 Page style (hardback vs paper)

CSS-only changes in `FlipPage.tsx`:
- `page_style='paper'`: `#f5f0e8` background, thinner page-edge shadow
- `page_style='hardback'`: `#f0ece4` (current default), heavier edge shadow

### 4.3 Scene dressing — `src/components/BookReader/index.tsx`

Wrap `FlipBookReader` in a `book-shell` div:
- Border: `12px solid #2a1a0e`, `box-shadow: inset 0 0 20px rgba(0,0,0,0.6), 0 8px 40px rgba(0,0,0,0.7)`
- Spine shadow via absolute child at 50% width: `background: linear-gradient(to right, rgba(0,0,0,0.3), transparent 30%, transparent 70%, rgba(0,0,0,0.3))`
- Keep the existing vignette overlay

### 4.4 Gate flow verification

`BookReader` is already mounted inside `Reader.tsx` after gates clear. Verify end-to-end:
- Password → Age → Explicit consent → Cover → BookReader → EndPage
- `read_count` increments once on gate pass (existing `increment_story_read_count` RPC)

---

## M5 — Dashboard + Webtoon Integration

**Definition of done:** All three formats live in one library/dashboard; webtoon untouched and working.

### 5.1 Dashboard story cards — `src/pages/Dashboard.tsx`

Add format badge to each story card derived from `reading_mode + page_style`:
- `reading_mode='book' + page_style='hardback'` → "Book"
- `reading_mode='book' + page_style='paper'` → "Comic"
- `reading_mode='cinematic' | 'scroll'` → "Webtoon"

### 5.2 Create story modal

Add a format picker step before title input — three choices:
- **Book** (illustration spread, hardback)
- **Comic** (panel grid, paper)
- **Webtoon** (vertical scroll)

Sets `reading_mode` and `page_style` on the new story row. Routes to `/editor/:storyId` regardless of format (editor adapts based on `reading_mode`).

### 5.3 Reader routing

`Reader.tsx` already routes `isBook` to `BookReader`. Verify:
- `reading_mode='book'` (both page_style values) → `BookReader`
- `reading_mode='cinematic'` or `'scroll'` → `ScrollReader`
- `isBook && isPortrait` → cascade swipe reader (M3.6)

---

## Build order

| Step | Milestone | Primary files |
|---|---|---|
| 1 | M2 | Apply spreads migration (if not done) + new `2026-05-29-paged-columns.sql` |
| 2 | M2 | `src/types/index.ts` — add Frame, update Story |
| 3 | M2 | `src/store/editorStore.ts` — frames state + CRUD |
| 4 | M2 | `src/components/editor/EditorCanvas.tsx` — frame-draw tool |
| 5 | M2 | `src/components/editor/EditorFilmstrip.tsx` — spread-aware ordering |
| 6 | M2 | `src/components/editor/EditorRail.tsx` — page_style toggle + back_cover_url |
| 7 | M3 | `supabase-migrations/2026-05-29-breakpoint-overrides.sql` + mobile_* backfill |
| 8 | M3 | `src/types/index.ts` — BreakpointOverride |
| 9 | M3 | `src/lib/cascadeResolver.ts` — new utility |
| 10 | M3 | `EditorTopBar.tsx` + `EditorRail.tsx` — breakpoint switcher + override controls |
| 11 | M3 | `src/components/reader/PanelLayers.tsx` — replace mobile_* with cascadeResolver |
| 12 | M4 | `src/hooks/useReaderData.ts` — spreads-based fetch for book mode |
| 13 | M4 | `src/components/BookReader/FlipBookReader.tsx` — iterate spreads not raw panels |
| 14 | M4 | `src/components/BookReader/FlipPage.tsx` + `index.tsx` — page_style CSS + scene dressing |
| 15 | M5 | `src/pages/Dashboard.tsx` — format badge + create modal format picker |

## Verification

- **M2:** Create a book story → draw a frame on page 1 → add an image layer inside the frame → reload and confirm frame + layer persist
- **M3:** Switch editor to Mobile breakpoint → move a layer → switch back to Desktop → confirm desktop position unchanged; verify mobile position in narrow browser
- **M4:** Open published book story → pass gates → page-turn works with correct page_style CSS → back cover shows
- **M5:** Create all three format types from dashboard → publish each → all three read correctly

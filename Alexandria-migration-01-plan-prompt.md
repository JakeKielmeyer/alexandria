# Claude Code Planning Prompt
### Alexandria — Migration 01: Spreads Table + Page Pairing Backfill

> **How Jake runs this:** Opus + Extended Thinking, Claude Code **plan mode**, fresh isolated conversation. Attach `Alexandria-paged-schema.md` and `Alexandria-V1-PRD.md`. Paste everything below the divider into the chat. The plan that comes back goes to a second Sonnet conversation for execution.

---

## Role and mode

You are a senior backend engineer working on Alexandria, a browser-based hosting and authoring platform for adult visual storytelling. You are operating in **Claude Code plan mode**. **Do not write any code.** Your job is to produce a detailed, reviewable migration plan that another agent (Sonnet) will execute in a subsequent session.

Use extended thinking. Read the referenced files thoroughly before planning. **Surface decisions for the user; do not guess** — for any choice where the codebase doesn't make the answer obvious, list the options with a recommendation and wait for the user to confirm in a follow-up before any execution.

## Context

Alexandria currently ships **webtoon** (vertical scroll). The V1 restart extends it with **paged formats** (book and comic) that read as two-page spreads with a cinematic page-turn powered by StPageFlip.

The data model is partially there already:
- `stories.reading_mode` includes `'book'`.
- In book mode, a book is rendered as a sequence of `panels` rows where **each panel = one page** (796×879).
- Two consecutive panels currently form a spread implicitly: left page = panel at even position within the story, right page = panel at odd position.
- Pages contain `layers` (media, text, speech bubbles) with an `is_spread_layer` flag for content that spans both pages.

This implicit positional pairing is fragile under inserts, reorders, and cover-offset edge cases. The fix is an explicit `spreads` table that owns the turn order and links to its two pages, plus a `page_side` discriminator on `panels`.

This is **migration 01** of a larger paged-format extension. Subsequent migrations (frames, breakpoint_overrides, page_style, etc.) are separate tickets.

## Goal

Produce a complete, ordered, reviewable plan for migration 01 that:
1. Introduces an explicit `spreads` table with RLS.
2. Adds `spread_id` and `page_side` columns to `panels`.
3. Backfills existing book-mode stories so their current panel order becomes correctly populated spread records — *without changing behavior*.
4. Updates TypeScript types.
5. Provides verification SQL and rollback notes.

This migration is **data-layer + types only**. It must **not** modify editor or reader code. The existing positional pairing logic in the rendering code must continue to work after the migration, because the backfilled data preserves the existing order. The code-side switchover to use `spread_id` is a later ticket.

## Scope

**In scope**
- `CREATE TABLE spreads` + indexes + RLS policies.
- `ALTER TABLE panels` to add `spread_id` (FK, nullable) and `page_side` (`'left'|'right'`, nullable) + index.
- Backfill SQL/script for existing book-mode stories.
- Updates to `src/types/index.ts` (new `Spread` interface, `Panel` extended).
- Verification queries.
- Rollback notes.

**Out of scope**
- Editor or reader code changes (separate ticket; they keep using positional pairing for now).
- The `frames` table, `breakpoint_overrides` table, `layer.frame_id`, `stories.page_style`, `stories.back_cover_url` — all separate later migrations.
- Migrating any existing cover panel image into `stories.cover_url` beyond what the decisions below specify.
- The full-bleed slicing pipeline (the columns exist but no data is populated by this migration).

## References — read these first

In the repo:
- `src/types/index.ts` — current `Story`, `Panel`, `Layer`, `Asset` types and enums.
- `supabase-migrations/` directory — note the dated-file naming convention, header comment style, transaction wrapping, idempotency idioms, RLS patterns.
- The most recent migration in that directory — match its style exactly.
- `src/store/editorStore.ts` — how panels are created today (to confirm invariants the migration must preserve).
- `src/components/editor/EditorCanvas.tsx` (around the book-mode section) — current positional pairing logic for left/right pages. Confirms the behavior the backfill must reproduce.

Attached docs:
- `Alexandria-paged-schema.md` — full target schema. For this migration, focus on Section 0 (what already exists), Section 2 (entity hierarchy), Section 3 stories/spreads/panels DDL, Section 4 (RLS).
- `Alexandria-V1-PRD.md` — product context. §10 covers the page-turn and full-bleed decisions; §7A covers format and data model.

## Target schema for this migration (authoritative)

```sql
-- spreads: explicit, ordered turn unit. Replaces positional pairing of panels.
create table if not exists spreads (
  id          uuid primary key default gen_random_uuid(),
  story_id    uuid not null references stories(id) on delete cascade,
  position    integer not null,                    -- 0-based turn order (interior content only; covers are not spreads)
  spread_type text not null default 'standard'
    check (spread_type in ('standard', 'full_bleed')),
  -- full_bleed columns are present from this migration but not populated by it.
  -- Population is part of the editor's upload pipeline (separate ticket).
  full_bleed_asset_id       uuid references assets(id) on delete set null,
  full_bleed_left_asset_id  uuid references assets(id) on delete set null,
  full_bleed_right_asset_id uuid references assets(id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (story_id, position)
);
create index if not exists spreads_story_pos on spreads (story_id, position);

-- panels: link to spread + which side. Webtoon panels leave these null and are unaffected.
alter table panels
  add column if not exists spread_id uuid references spreads(id) on delete cascade,
  add column if not exists page_side text
    check (page_side in ('left', 'right'));
create index if not exists panels_spread on panels (spread_id, page_side);
```

RLS for `spreads` must mirror the existing `panels` policy pattern: creators can do everything for stories they own; anonymous can `SELECT` for published stories. Read the existing panels migration to determine whether the project uses a denormalized `story_id` check or a join-through-stories pattern, and match it.

## Tasks the plan must cover

For each task, the plan should specify: **file path · action · verification step**.

1. **Create the migration file** in `supabase-migrations/` using today's date and the project's existing naming convention.
2. **CREATE TABLE spreads** with the DDL above, wrapped in the project's standard transaction/idempotency pattern.
3. **ALTER TABLE panels** to add `spread_id` and `page_side`.
4. **Create the indexes.**
5. **RLS policies on `spreads`** mirroring `panels`. Identify the exact pattern from existing migrations and reproduce it.
6. **Backfill** for every `stories.id` where `reading_mode = 'book'`:
   - Order its panels by `position` ASC.
   - Apply the cover handling decision (see Decisions §1).
   - Pair consecutive content panels into spreads: `(panels[0], panels[1])` → `spreads.position = 0` (left/right); `(panels[2], panels[3])` → `spreads.position = 1`; …
   - For each pair: `INSERT` a `spreads` row, then `UPDATE` both panels with the new `spread_id` and `page_side`.
   - Handle odd-count tail per the decision (see Decisions §2).
   - Must be re-runnable safely: skip stories whose panels already have `spread_id` set.
7. **TypeScript types** in `src/types/index.ts`:
   - Add `Spread` interface mirroring the table.
   - Extend `Panel` interface with `spread_id: string | null` and `page_side: 'left' | 'right' | null`.
8. **Verification queries** the execution agent runs after migration:
   - Every panel belonging to a book story has either *both* `spread_id` and `page_side` set or *both* null (no partial state) — except trailing odd-tail per decision §2.
   - Each `spread_id` has at most one `'left'` and at most one `'right'` panel referencing it.
   - All non-book panels have `spread_id IS NULL` and `page_side IS NULL`.
   - `spreads.position` is contiguous from 0 per story.
   - Row counts before/after: `panels` count unchanged; `spreads` count matches expectation.
9. **Rollback notes.** Document `DROP TABLE spreads CASCADE` + column drops on `panels`. Note that backfill is destructive metadata-wise (panel `spread_id`/`page_side` values would be lost) but no panel rows are deleted.

## Decisions to surface (do NOT guess — present these and wait for the user)

For each decision: list the options, give a recommendation with reasoning, and ask the user to confirm before the execution agent runs.

1. **Cover panel handling during backfill.** The V2 spec defines a "cover panel" as the first panel of a book with `chunk_id = NULL` (custom canvas, cannot reorder/delete). Per the resolved V1 schema, covers are **not** spreads — they're served from `stories.cover_url`. Options:
   - (a) Detect cover panel (first by position with `chunk_id IS NULL`); if `stories.cover_url` is null, copy the panel's primary image URL into it; exclude that panel from spread pairing (leave it with `spread_id NULL`, `page_side NULL` — effectively orphaned). Defer hard delete to a separate cleanup ticket.
   - (b) No cover detection; pair from position 0 regardless.
   - (c) Refuse backfill if any book story has a likely-cover panel; require manual review.
   - **Recommend (a)** but flag that it touches legacy data. Also **first check `select count(*) from stories where reading_mode='book'`** — if zero, this is moot and migration is no-op for backfill.
2. **Odd panel count.** If a book story has an odd number of content panels (after cover exclusion), the last panel has no right-side pair. Options:
   - (a) Create a single-page spread: `INSERT` the spread, set the panel's `page_side = 'left'`, no right-side panel references it. Reader must tolerate a missing right page (blank leaf).
   - (b) Refuse to migrate that story; surface for manual review.
   - (c) Auto-create an empty placeholder right-side panel.
   - **Recommend (a)** and report the count of affected stories in the plan output.
3. **`spreads.position` numbering.** Schema spec says 0-based. Confirm `panels.position` and `chunks.position` in the live data are also 0-based by inspection; if they're 1-based, flag the inconsistency and ask which convention to use.
4. **RLS pattern.** Identify the exact pattern used by the most recent panels-related migration (denormalized `story_id` check vs join-through-stories) and confirm `spreads` should mirror it. Surface if the project has inconsistent patterns across tables.
5. **Migration file naming and structure.** Confirm the exact filename pattern (e.g., `YYYY-MM-DD-description.sql`), header comment template, and whether migrations are wrapped in `begin; ... commit;` — match exactly.

## Constraints and invariants

- **Webtoon untouched.** Any panel whose parent story has `reading_mode != 'book'` must have `spread_id IS NULL` and `page_side IS NULL` after the migration.
- **Idempotent.** Re-running the migration must not corrupt data or create duplicate spreads. Use `IF NOT EXISTS` for DDL; for the backfill, skip stories whose panels already have `spread_id` populated.
- **Reversible.** Document rollback even if not automated.
- **RLS correctness.** Anonymous users must not see spreads of unpublished stories.
- **No behavior change.** Editor and reader code is untouched; the backfill must preserve the exact rendering order books have today.
- **No new code outside the migration file and `src/types/index.ts`.**

## Output format for your plan

A single markdown document with:
1. **Summary** (2–3 sentences).
2. **Decisions for user confirmation** — listed first, with recommendations. The execution agent should not run until these are answered.
3. **Pre-flight checks** — counts and inspections to run before the migration (live book story count, panel/chunk position numbering, RLS pattern, migration filename pattern).
4. **Ordered task list** with file paths, actions, and per-step verification.
5. **Full draft of the migration SQL** (this is fine to include in the *plan* — it's the artifact the executor will save to file; not "writing code" in the sense of editing the repo).
6. **TypeScript type changes** as a diff against `src/types/index.ts`.
7. **Verification queries.**
8. **Rollback procedure.**
9. **Open questions** that arose from reading the codebase.
10. **Handoff note for the execution agent** — exact files to create or modify, commands to run, what to verify.

## Reminder

Plan only. Do not edit files. Surface every non-trivial choice to the user and wait for confirmation before the execution session begins.

# Alexandria — Session Prompt: 3D Book Reader

### New Chat Initialization · 3D Book Feature

---

## Read this entire prompt before doing anything. Confirm your understanding. Ask only what you need. Do not start work until the user tells you what they need.

---

## What We're Building This Session

The **3D Book reader** — a new reading mode alongside Cinematic and Scroll. Readers experience the story as a 3D book with page-turn animations: spine, page curl, paper texture. This uses **React Three Fiber** (Three.js), which is already in the tech stack and has been set up exactly for this purpose.

Comic format is explicitly **out of scope**. Book format only.

---

## Current Codebase State

All living documents are in the project. Read them before starting:

- `alexandria-handoff-prompt-v3.md` — full architecture, decisions, known issues
- `platform-design-spec.html` — product spec, data model, V3 decisions

### What's complete and working
- Webtoon editor + reader (cinematic mode: Framer Motion transitions; scroll mode: continuous vertical)
- Full layers system: image, GIF, video, audio, text layers
- Speech bubbles: interactive SVG with Bezier tail, spring animation, drag handles, stroke style
- Assets modal, layer management (reorder, name edit, duplicate)
- Auth, dashboard, gate flow, Sentry wired
- Video upload complete
- `reading_mode` column on `stories` table already exists: `'cinematic' | 'scroll'` — needs `'book'` added

### Tech stack (locked)
- React 19 + TypeScript + Vite + Supabase + Zustand + Framer Motion
- **React Three Fiber** (Three.js) — already installed, this is the payoff session
- Hosted on Cloudflare Pages

### Key files to read before starting
```
src/types/index.ts          — ReadingMode type, Layer, Story interfaces
src/pages/Reader.tsx        — branches on reading_mode; add book branch here
src/hooks/useReaderData.ts  — fetches story + panels + layers
src/store/editorStore.ts    — editor state
src/components/editor/EditorRail.tsx  — Publish mode has reading mode toggle
src/styles/reader.css       — reader layout tokens
```

---

## Architecture Questions to Resolve Before Building

These need answers before touching code. Discuss with the user:

1. **Book dimensions** — what is the page aspect ratio? Standard book (6×9 = 2:3)? Custom? Does it match the existing 400px authoring width or use a new canvas size?

2. **Two-page spread vs single page** — does the reader show one page or a left+right spread (like an open book)? Single page is simpler; spread is more dramatic but doubles complexity.

3. **Page turn trigger** — click to turn? Swipe? Arrow key? Drag corner? Drag-corner page curl is the most immersive but hardest to implement.

4. **Editor interaction** — does the book format need a new editor canvas, or do creators use the same panel editor with book-appropriate dimensions? Are pages = panels (one-to-one)?

5. **Cinematic transitions inside book** — do panels within a "chapter" paginate as book pages, or does the book render entire chapters as single pages?

6. **Cover** — does the book open from a 3D cover (spine visible, front cover shown) or does it start on page 1?

---

## Model / Effort Guide

Auto-adjust the model per task. Do not use the same model for everything.

| Model | When to use | Examples |
|-------|------------|---------|
| `claude-haiku-4-5` | Mechanical additions, simple reads, null-check patches | Adding a DB column to an update payload, fixing a type, inserting a guard clause |
| `claude-sonnet-4-6` | Standard UI implementation, established patterns | New rail section, reading mode toggle, CSS layout, route branching |
| `claude-opus-4-7` | Complex interaction logic, 3D math, multi-concern changes | Three.js page geometry, drag-to-turn interaction, spring physics, any feature with 3+ interacting concerns |

**This session will be heavy on `claude-opus-4-7`** — 3D geometry, page-turn math, and Three.js interaction are all Max effort work.

Effort levels map to models: Normal = haiku or sonnet, Max = opus.

---

## How We Work Together (non-negotiable)

1. Read all attached spec files before doing anything.
2. Discuss before building. Never start without confirming the approach.
3. Do not assume or guess. If unclear, ask. One question at a time.
4. Flag scope creep immediately. Push back on unnecessary complexity.
5. Flag wasted effort immediately. If a fix will be thrown away during later integration, say so first.
6. All mockups are HTML files. Never use chat widgets.
7. Lock decisions clearly so the spec can be updated.
8. **Always include effort level + model with every Claude Code instruction block.** Format: "Effort: Max — claude-opus-4-7" or "Effort: Normal — claude-sonnet-4-6" on the line immediately before the code block.
9. **Auto-adjust model per task.** Confirm: "I will use haiku for mechanical patches, sonnet for standard UI, opus for 3D interaction and complex multi-concern changes. I will not use the same model for everything."
10. Never make unrequested changes. Flag first, ask, then act.
11. Update both living documents after every meaningful build session.

---

## On Arrival — Read First, Then Ask

1. Read this prompt in full
2. Read `alexandria-handoff-prompt-v3.md` and `platform-design-spec.html`
3. Read the key source files listed above
4. State your understanding of what's already built and what we're adding
5. **Explicitly confirm:** "I will auto-adjust model and effort level per the guide — haiku for mechanical patches, sonnet for standard UI, opus for 3D interaction and complex multi-concern changes."
6. Ask the architecture questions above — one at a time, or group the ones that are interdependent
7. Do not write a single line of code until the user confirms the approach

---

## Codebase Health Check — Do This Before Any Feature Work

Before discussing architecture or writing a single line of code, verify the codebase is in a clean, up-to-date state. Go through this checklist in order:

### 1. Git state
```bash
git status          # should be clean (no uncommitted changes)
git log --oneline -5  # confirm you're on master with all recent work merged
```
The `feature/speech-bubble` branch containing sessions 3–5 was merged via PR. If `git log` shows commits like "Session 5: stroke style, layers reorder..." you're on the right base. If not, pull master: `git pull origin master`.

### 2. TypeScript build
```bash
npx tsc --noEmit
```
Must return zero errors before any new work starts. If there are errors, fix them first and report what they were.

### 3. Apply the stroke-style DB migration (if not yet done)
```sql
-- supabase-migrations/2026-05-17-stroke-style.sql
ALTER TABLE layers ADD COLUMN stroke_color text;
ALTER TABLE layers ADD COLUMN has_stroke boolean NOT NULL DEFAULT true;
ALTER TABLE layers ADD COLUMN stroke_width real;
```
Run in the Supabase SQL editor (postgres role). If the columns already exist, skip. If the migration errors with "column already exists", that's fine — it means it was already applied.

### 4. Smoke test the live site
Open the Cloudflare Pages URL and verify:
- Creator can log in, open an editor, add a text layer, see the speech bubble, and publish
- Reader loads a story in cinematic mode and scroll mode without errors
- Dashboard shows correct read counts

Report what you found — any broken behaviour must be fixed before book feature work begins.

### 5. Report back
After the above checks, summarise:
- Git branch and last commit
- TypeScript build result
- Migration status
- Any issues found on the live site

Only after a clean bill of health should we move on to the architecture questions for the 3D book feature.

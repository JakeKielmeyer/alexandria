# Alexandria — Technical Map & Frontend Learning Roadmap

> Read-only analysis. No code changes proposed. Output is a reference document + a sequenced learning plan for taking ownership of the frontend.

---

## Context

You're the product owner of Alexandria, a browser-based webtoon authoring + hosting platform. Engineering is currently delegated, but you want to take real ownership of the frontend so you can iterate on UI, fix small bugs, ship polish, and reduce dependence on outside help. You need (a) a complete technical map of what exists and where, and (b) a phased roadmap that turns "I can read the code" into "I can ship a feature."

This document is built from a full pass over `C:\Users\Owner\Desktop\alexandria` and reflects the codebase as of 2026-04-22 (the day the reader 3D system was rebuilt). Where the codebase contradicts your spec, the codebase wins and the discrepancy is flagged.

---

## 0. Stack confirmation (codebase ground truth)

From `package.json`:

| Dep | Version | Notes |
|---|---|---|
| `react` / `react-dom` | ^19.2.4 | React 19 |
| `react-router-dom` | ^7.14.0 | v7 (data routers) |
| `framer-motion` | ^12.38.0 | All reader animations |
| `zustand` | ^5.0.12 | All client state |
| `@supabase/supabase-js` | ^2.103.0 | DB + Auth + Storage |
| `vite` | ^8.0.4 | Build |
| `@vitejs/plugin-react` | ^6.0.1 | React fast refresh |
| `typescript` | ~6.0.2 | Strict |

**Discrepancies vs. your spec brief:**

- The spec mentions **React Three Fiber / Three.js**. `package.json` has **no `three` or `@react-three/fiber` dependency**. The 3D effect in the reader is pure CSS `perspective` + Framer Motion `useTransform` on `rotateX`/`scale`/`opacity`. R3F has not been wired up yet — treat it as planned for V3, not "wired in V2." This is good news: you have one less library to learn.
- `vite.config.ts` is the bare default — no aliases, no proxy. Whatever you read in that file is the whole story.

---

## 1. Top-level file map

```
src/
├── App.tsx                        # Router + Supabase session bootstrap
├── main.tsx                       # ReactDOM root
├── components/
│   ├── AuthGuard.tsx              # Protected-route wrapper
│   ├── GateLogo.tsx               # Lighthouse SVG + wordmark
│   ├── GateShell.tsx              # Diagonal-stripe gate container
│   ├── LegalShell.tsx             # Container for legal pages
│   ├── Navbar.tsx                 # Reader navbar (7 buttons)
│   ├── PhoneShell.tsx             # Legacy — NOT used in current layout
│   ├── VideoThumbnail.tsx         # Frame-grab or paused <video> for thumbnails
│   ├── editor/
│   │   ├── EditorTopBar.tsx
│   │   ├── EditorFilmstrip.tsx
│   │   ├── EditorCanvas.tsx       # Includes inline LayerCanvas drag/resize
│   │   └── EditorRail.tsx
│   └── reader/
│       ├── PanelScrollItem.tsx    # Scroll-driven 3D panel wrapper
│       └── ReaderThumbnailStrip.tsx
├── pages/
│   ├── Reader.tsx                 # Orchestrates gates → cover → ScrollReader
│   ├── Cover.tsx
│   ├── Interstitial.tsx           # Audio prefs gate
│   ├── Password.tsx               # SHA-256 client-side gate
│   ├── AgeGate.tsx
│   ├── ExplicitConsent.tsx
│   ├── EndPage.tsx
│   ├── Decline.tsx
│   ├── Editor.tsx                 # Loads data, mounts 5-region layout
│   ├── Dashboard.tsx
│   ├── SignIn.tsx / SignUp.tsx
│   ├── NotFound.tsx
│   └── legal/                     # Terms, Privacy, DMCA, Notice2257
├── store/
│   ├── authStore.ts               # user, loading, signOut
│   ├── editorStore.ts             # story/panels/layers/active*/saveStatus/editorMode/grid
│   ├── gateStore.ts               # storyId, story, clearedGates[]
│   └── readerStore.ts             # videoSfxEnabled, musicEnabled
├── hooks/
│   ├── useAutoSave.ts             # 2s debounce → Supabase
│   ├── useReaderData.ts           # Fetch chunks/panels/layers; project to PanelWithMeta
│   └── useDocumentHead.ts         # OG/Twitter meta
├── lib/
│   ├── supabase.ts                # createClient(env URL, env anon key)
│   ├── upload.ts                  # uploadToPanelsBucket, panelLayerPath, coverPath
│   ├── gateFlow.ts                # getRequiredGates(story)
│   ├── errorBoundary.tsx
│   └── telemetry.ts
├── styles/
│   ├── reader.css                 # .reader-stage / .reader-panel-slot / .reader-panel-card / navbar / thumbs
│   ├── editor.css                 # 5-region layout + dark tokens
│   ├── dashboard.css              # Story grid + dark tokens
│   ├── auth.css                   # Sign-in/up cards
│   ├── legal.css                  # Terms/Privacy
│   └── shell.css                  # Reset + .fluid-shell (gate diagonal stripe)
├── types/
│   └── index.ts                   # Single source of truth for all DB shapes
└── (no supabase/ migrations folder in the repo — schema lives in Supabase project)
```

There is **no** `src/utils/` or `src/lib/queries.ts`. Supabase calls are inlined where they're used (`Editor.tsx`, `Dashboard.tsx`, `useReaderData.ts`, `useAutoSave.ts`, `Password.tsx`, etc.). That's a deliberate simplification for MVP scale.

---

## 2. Technical map

### 2.1 Reader

| Area | What it does | Files | State / hooks | Backend touch | Complexity |
|---|---|---|---|---|---|
| **Gate orchestration** | Computes required gates from story (`password_hash`, `content_rating`), renders next uncleared gate. | [Reader.tsx](src/pages/Reader.tsx), [lib/gateFlow.ts](src/lib/gateFlow.ts) | `gateStore.clearedGates[]` | Reads `stories` row | Low |
| **Password gate** | SHA-256 hex(input) === `story.password_hash`. No backend call. | [Password.tsx](src/pages/Password.tsx) | `gateStore.clearGate('password')` | None (hash compare client-side) | Low |
| **Age gate** | Two-button "I'm 18+" / "Leave". | [AgeGate.tsx](src/pages/AgeGate.tsx) | `gateStore.clearGate('age')` | None | Low |
| **Explicit consent** | Two-button. "Go Back" calls `unClearGate('age')` so user re-enters age gate. | [ExplicitConsent.tsx](src/pages/ExplicitConsent.tsx) | `gateStore` | None | Low |
| **Interstitial** | Two toggles (Video & SFX, Music) + Enter Story. Music toggle is UI-only. | [Interstitial.tsx](src/pages/Interstitial.tsx) | `readerStore.videoSfxEnabled`, `musicEnabled` | None | Low |
| **Cover screen** | Full `.reader-panel-card--cover`, gradient-darkened image, "Tap to begin" with up-arrow SVG. | [Cover.tsx](src/pages/Cover.tsx) | None | None (uses preloaded story) | Low |
| **Reader stage / slot / card** | 3-layer DOM: `.reader-stage` (bg + scroll host) → `.reader-panel-slot` (perspective container) → `.reader-panel-card` (3D transform target). | [styles/reader.css](src/styles/reader.css), [Reader.tsx](src/pages/Reader.tsx) | None directly | None | Medium |
| **PanelScrollItem (3D scroll-driven)** | `useScroll({ target, offset: ['start end','center center','end start'] })` → `useTransform` to `rotateX`/`scale`/`opacity`/`boxShadow`. Cards pivot from `top` while incoming, `bottom` while outgoing. | [components/reader/PanelScrollItem.tsx](src/components/reader/PanelScrollItem.tsx) | None (props only) | None | High |
| **First-panel intro** | When `introVariant="first"`, an *inner* `motion.div` runs a one-shot `scale 0.55→1, y 180→0, rotateX -60→0` over 0.9s with easeOutCubic. Compounded inside the scroll transform. | [components/reader/PanelScrollItem.tsx](src/components/reader/PanelScrollItem.tsx) | None | None | High |
| **Cover → reader handoff** | Outer `<AnimatePresence mode="wait">` opacity crossfade (0.35s), inner first-panel intro starts simultaneously. Opacity-only at outer layer to avoid trapping fixed Navbar. | [Reader.tsx](src/pages/Reader.tsx) | local `screen` state | None | Medium |
| **PanelMedia** | Renders top visual layer as `<img>` or `<video>`. Sets `playbackRate`. IntersectionObserver (threshold 0.5) drives play/pause; on exit, `currentTime = 0` (panel videos restart on re-entry, per spec). | [Reader.tsx](src/pages/Reader.tsx) (lines 40–117) | reads `readerStore.videoSfxEnabled` | None | High |
| **Audio sync (the imperative bit)** | `effectiveMuted = panel.muted \|\| !videoSfxEnabled`. Imperative `useEffect(() => { videoRef.current.muted = effectiveMuted })`. React's `muted` prop alone won't update mid-playback in all browsers. | [Reader.tsx](src/pages/Reader.tsx) PanelMedia | `readerStore.videoSfxEnabled` | None | High — non-obvious |
| **Reading mode (cinematic vs scroll)** | `story.reading_mode` is `'cinematic' \| 'scroll'`. Cinematic adds `scroll-snap-type: y mandatory` to `<html>` + `--snap` class on each slot. Programmatic scrolls toggle snap off during the tween. | [Reader.tsx](src/pages/Reader.tsx) ScrollReader | local | None | Medium |
| **Navbar** | 9 elements: skipBack, zoom (UI-only), grid, prev, label "Ch.X · Y", next, skipFwd, audio toggle, fullscreen. Fixed-bottom. | [components/Navbar.tsx](src/components/Navbar.tsx) | reads/writes `readerStore.videoSfxEnabled` (via parent) | None | Low |
| **Thumbnail strip** | Bottom drawer that slides up via `motion.div initial/animate/exit y: 100% → 0` with `[0.16,1,0.3,1]` ease. Chapters grouped, horizontal scroll within each. ESC closes. | [components/reader/ReaderThumbnailStrip.tsx](src/components/reader/ReaderThumbnailStrip.tsx) | local | None | Medium |
| **End page** | "The End" + creator bio + creator links + Restart/Exit buttons (both go to cover). | [pages/EndPage.tsx](src/pages/EndPage.tsx) | reads `gateStore.story` | None | Low |
| **useReaderData** | Sequential Supabase: `chunks` → `panels` → `layers in (panelIds)`. Builds `PanelWithMeta[]` (top visual layer per panel, page-in-chapter, isFirstInChapter). Re-runs only on `story?.id` change. | [hooks/useReaderData.ts](src/hooks/useReaderData.ts) | — | `chunks`, `panels`, `layers` SELECTs | Medium |
| **Keyboard nav** | ArrowRight/Down → next; ArrowLeft/Up → prev. Skips when focus in INPUT/TEXTAREA. | [Reader.tsx](src/pages/Reader.tsx) ScrollReader | local | None | Low |
| **Programmatic scroll** | Framer's `animate(window.scrollY, targetY, { duration: story.transition_duration_ms/1000, ease: easeOutCubic, onUpdate: window.scrollTo })`. Snap toggled off for the tween, restored on complete. | [Reader.tsx](src/pages/Reader.tsx) | — | None | Medium |
| **End-of-story detection** | When last panel ≥90% visible for 1400ms, navigate to `/u/:username/s/:slug/end`. | [Reader.tsx](src/pages/Reader.tsx) | local | None | Low |
| **Preview mode** | `?preview=1` skips visual gates if `currentUser.id === story.user_id`. | [Reader.tsx](src/pages/Reader.tsx) | `authStore.user` | Reads `stories.user_id` | Low |

### 2.2 Editor

| Area | What it does | Files | State / hooks | Backend touch | Complexity |
|---|---|---|---|---|---|
| **5-region root** | `.editor-root[data-theme="dark"]` → top bar + body (filmstrip + canvas + rail). | [pages/Editor.tsx](src/pages/Editor.tsx) | `editorStore`, `authStore` | Initial fetch of story+panels+layers | Low |
| **Top bar** | Logo (with unsaved-warning back guard), title, save status pill, Design/Transitions/Publish mode tabs, Publish toggle. | [components/editor/EditorTopBar.tsx](src/components/editor/EditorTopBar.tsx) | `editorStore.{story, saveStatus, editorMode}` | UPDATE `stories` (publish toggle) | Medium |
| **Filmstrip** | Panel thumbnail list. Add/Delete buttons. Active panel ring. (Reorder buttons exist but are noted as broken — deferred.) | [components/editor/EditorFilmstrip.tsx](src/components/editor/EditorFilmstrip.tsx) | `editorStore.{panels, activePanelId, addPanel, deletePanel}` | INSERT/DELETE `panels` | Medium |
| **Canvas toolbar** | Height presets (`PANEL_HEIGHT_PRESETS`), custom height input, Add Media file picker. Cinematic mode shows fixed "400 × 640px" label instead. | [components/editor/EditorCanvas.tsx](src/components/editor/EditorCanvas.tsx) (lines ~375–435) | `editorStore.updatePanel` | None directly | Low |
| **Canvas viewport** | Renders the active panel at 400px reference width, dot grid background, layer stack on top. | [EditorCanvas.tsx](src/components/editor/EditorCanvas.tsx) | `editorStore.layers (filter active)` | None | Medium |
| **LayerCanvas (drag/resize)** | Inline component in `EditorCanvas.tsx` (search "Drag handle component"). Tracks pointerdown on body (move) or on 8 handles (`tl/tr/bl/br/t/r/b/l`). Math: `dx = (clientX - startX) / panelWidth * 100` → percent-based `x_percent` / `width_percent`. Shift key constrains corner resize to `startAspectRatio`. Uses `window.addEventListener('mousemove'/'mouseup')` so the gesture survives leaving the layer bounds. | [EditorCanvas.tsx](src/components/editor/EditorCanvas.tsx) (lines 43–260) | local `dragRef` + `editorStore.updateLayer` | None during drag; auto-save fires after | High |
| **Right rail (modes)** | Tabs: Design (story-level: title, content rating, reading mode), Transitions (style + duration), Publish (cover upload, slug, publish toggle), Layer-context (when a layer is selected: position/size/fill/autoplay/loop/muted/playback rate). | [components/editor/EditorRail.tsx](src/components/editor/EditorRail.tsx) | `editorStore.{editorMode, story, activeLayerId, layers}` | UPDATE `stories`, INSERT cover via Storage | Medium |
| **Layer system** | Layer = positioned media child of a panel. `position` = z-order. `is_fill: true` ignores width/height/x/y and fills the panel; `false` uses percent coords. Top visual layer (highest position, non-audio, has URL) becomes the panel's "image" for the reader. | [types/index.ts](src/types/index.ts), reader/editor render code | `editorStore.layers` | Layer CRUD on save | Medium |
| **Media upload flow** | File picker → `getMediaType(file)` (mime sniff) → `uploadToPanelsBucket(file, panelLayerPath(storyId, panelId, file))` → `INSERT layers { ...LAYER_DEFAULTS[type], media_url }` → `addLayer(data)` to store → set as active layer. | [EditorCanvas.tsx](src/components/editor/EditorCanvas.tsx) `handleUpload` (lines 318–365), [lib/upload.ts](src/lib/upload.ts) | `editorStore.{addLayer, setActiveLayerId, setSaveStatus}` | Storage `panels` bucket upload + `layers` INSERT | Medium |
| **useAutoSave** | 2s trailing debounce on `saveStatus === 'unsaved'`. Sequentially: UPDATE `stories` → loop UPDATE `panels` → loop UPDATE `layers`. Uses `requestIdRef` to discard stale runs. The layer UPDATE includes `autoplay/loop/muted/playback_rate` — these were silently dropped before, which is why the global Video & SFX toggle had nothing to flip against. | [hooks/useAutoSave.ts](src/hooks/useAutoSave.ts) | `editorStore.{story, panels, layers, saveStatus, setSaveStatus}` | UPDATEs to all three tables | High |

### 2.3 Creator Dashboard

| Area | What it does | Files | State / hooks | Backend touch | Complexity |
|---|---|---|---|---|---|
| **Story grid** | Cards per story, status badge (Live/Draft), share URL chip, Edit/Delete buttons. | [pages/Dashboard.tsx](src/pages/Dashboard.tsx) | local | SELECT `stories WHERE user_id` | Low |
| **New Story flow** | `generateSlug()` → INSERT `stories { title:'Untitled Story', slug, user_id, ... }` → navigate to `/editor/:storyId`. | [Dashboard.tsx](src/pages/Dashboard.tsx) `handleNewStory` (lines 103+) | local | INSERT `stories` | Low |
| **Publish toggle** | Optimistic UI + UPDATE `stories.is_published`. | [Dashboard.tsx](src/pages/Dashboard.tsx) | local | UPDATE `stories` | Low |
| **Share URL** | Copy-to-clipboard chip, brief "Copied" feedback. | [Dashboard.tsx](src/pages/Dashboard.tsx) | local | None | Low |
| **2-click delete** | First click sets `deletingId = id` → button label flips "Delete" → "Sure?". `useEffect` fires `setTimeout(setDeletingId(null), 3000)`. Second click within 3s runs the actual DELETE. | [Dashboard.tsx](src/pages/Dashboard.tsx) lines 97–101, 161+ | local | DELETE `stories` | Low |
| **Sticky nav** | Top nav with blur-backdrop. Light/dark toggle stub (dark-only in Layer 1). | [Dashboard.tsx](src/pages/Dashboard.tsx), [styles/dashboard.css](src/styles/dashboard.css) | local | None | Low |

### 2.4 Auth + routing + types

| Area | What it does | Files | Notes |
|---|---|---|---|
| **Routes** | See full table in §3 below. | [App.tsx](src/App.tsx) | React Router 7 |
| **Supabase client** | `createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)` at module load. | [lib/supabase.ts](src/lib/supabase.ts) | Single instance, imported everywhere |
| **Session bootstrap** | `App.tsx` calls `supabase.auth.getSession()` once + subscribes to `onAuthStateChange`. Writes to `authStore`. | [App.tsx](src/App.tsx) | Subscription cleanup on unmount |
| **AuthGuard** | If `loading` → render GateShell loader. If no `user` → `<Navigate to="/signin" replace />`. Else children. | [components/AuthGuard.tsx](src/components/AuthGuard.tsx) | Wraps `/dashboard` and `/editor/:storyId` |
| **Sign in / Sign up** | Full-page card layout (not phone shell). TOS checkbox on signup. Bottom legal links. | [pages/SignIn.tsx](src/pages/SignIn.tsx), [pages/SignUp.tsx](src/pages/SignUp.tsx) | Email confirmation enabled in Supabase dashboard, redirects to `/signin` |
| **Canonical types** | All shared shapes. | [types/index.ts](src/types/index.ts) | `User`, `Story`, `StoryWithCreator`, `Chunk`, `Panel`, `Layer`, `MediaType`, `ReadingMode`, `ContentRating`, `TransitionStyle`, `LAYER_DEFAULTS`, `PANEL_HEIGHT_PRESETS` |

### 2.5 Design system

- **Tokens** are CSS variables scoped to `[data-theme="dark"]` on each page's root (`.editor-root`, `.dashboard-root`). They are *not* on `:root`. Light theme is stubbed but unbuilt.
- **Editor tokens** ([editor.css](src/styles/editor.css)): `--bg-app/editor/bar/rail/dd`, `--text-primary/secondary/tertiary/muted/faint`, `--rose-deep/dark/accent/soft`, `--btn-*`, `--input-*`, `--canvas-grid/glow`, `--focus-ring`. ~30 tokens.
- **Dashboard tokens** ([dashboard.css](src/styles/dashboard.css)): `--db-*` prefix, ~40 tokens, mirrors editor with grid/card/badge variants.
- **Six core colors** (consistent across files): Void `#0E0608`, Cream `#F5EEE8`, Deep Rose `#C93060`, Rose Dark `#8C1F42`, Rose Accent `#DC5A8A`, Rose Soft `#E87FAA`.
- **Fonts** loaded in [index.html](index.html) from Google Fonts: Cinzel (logo), DM Serif Display (headings), DM Sans (body). Bangers + Lato italic also loaded but unused in current scope.
- **Gate texture** ([shell.css](src/styles/shell.css)) — `repeating-linear-gradient(45deg, #200810, #200810 2px, #2e0e1a 2px, #2e0e1a 8px)` at 0.35 opacity.

### 2.6 Backend shape (read-only understanding)

Tables (inferred from `types/index.ts` and runtime queries — there is no `supabase/migrations/` folder in the working dir):

- `users` — id, username, display_name, bio, avatar_url, created_at. Auto-created by Supabase trigger on auth signup.
- `stories` — id, user_id, title, slug, content_rating, reading_mode, password_hash, is_published, cover_url, font_manifest (jsonb), creator_bio, creator_links (jsonb), transition_style, transition_duration_ms, created_at, updated_at.
- `chunks` — id, story_id, chapter_number, chapter_title, position, created_at. (Chapter-break records; reader uses these to label panels.)
- `panels` — id, chunk_id (nullable), story_id, position, image_url (legacy field), height, created_at.
- `layers` — id, panel_id, story_id, position (z-order), media_type, media_url, x_percent, y_percent, width_percent (nullable), height_percent (nullable), is_fill, opacity, autoplay, loop, muted, playback_rate, created_at.

Storage:

- Single bucket: `panels`.
- Path patterns (from [lib/upload.ts](src/lib/upload.ts)):
  - Layer media: `{storyId}/{panelId}/{timestamp}.{ext}`
  - Cover: `{storyId}/cover/{timestamp}.{ext}`
- Public URLs via `supabase.storage.from('panels').getPublicUrl(path)`.

RLS / policies live in the Supabase project (not in the repo). Per the decision log: tables have RLS; the `panels` bucket policy is intentionally permissive for now and slated for tightening to story-ownership later.

---

## 3. Route table

| Path | Component | Auth | Notes |
|---|---|---|---|
| `/` | HomeRedirect (in App.tsx) | Conditional | Authed → `/dashboard`, anon → `/signin` |
| `/signin` | SignIn | Public | |
| `/signup` | SignUp | Public | TOS checkbox; email confirmation |
| `/u/:username/s/:slug` | Reader | Public | Gate flow inline (single route) |
| `/u/:username/s/:slug/end` | EndPage | Public | |
| `/decline` | Decline | Public | After "Leave" on age gate |
| `/dashboard` | Dashboard | **AuthGuard** | |
| `/editor/:storyId` | Editor | **AuthGuard** | |
| `/terms` `/privacy` `/dmca` `/2257` | Legal pages | Public | |
| `*` | NotFound | — | 404 |

---

## 4. Frontend / backend boundary

| Kind of work | What it touches | Where it lives | You can own it? |
|---|---|---|---|
| Visual changes (color, type, spacing, hover, shadow, motion timing) | CSS files only | `src/styles/*.css` | **Yes — pure frontend.** |
| New UI component, layout, conditional render | TSX + CSS | `src/components/`, `src/pages/` | **Yes — pure frontend.** |
| New Zustand state field or action | TS | `src/store/*.ts` | **Yes — pure frontend.** |
| New computed view of existing data | TS | hooks or component | **Yes — pure frontend.** |
| Reading existing data from a new screen | Supabase `.select()` query | New hook or inline | **Yes — frontend Supabase work.** Pattern lives in `useReaderData.ts`. |
| Writing to an existing column | `.update()` | inline or via auto-save | **Yes — frontend Supabase work** as long as the column already exists. |
| Adding a new optional column to an existing table | Supabase SQL migration **then** type update **then** code | DB + `types/index.ts` + code | **Backend territory.** You can write the frontend half but the migration must run server-side (you, in the Supabase dashboard). |
| New table, RLS policy, or Storage bucket | Supabase SQL | DB only | **Backend territory.** Not frontend work. |
| Triggers, edge functions, server-side validation | Supabase SQL/Edge Functions | DB | **Backend territory.** |
| Auth flow changes (provider, redirect URLs, email templates) | Supabase Auth dashboard | DB / dashboard | **Backend territory.** |

**Practical rule:** if your change is `SELECT` / `INSERT` / `UPDATE` / `DELETE` against existing columns, that's a frontend task in this stack. If it changes the *shape* of the database, it's backend.

---

## 5. Learning roadmap

Each phase assumes 2–3 focused hours per session. Estimates are total time-to-comfort, not calendar time.

### Phase 0 — Orientation (4–6 h)

**Goal:** boot the project, find your way around, read code without panicking.

- Run `pnpm install` then `pnpm dev`. Open the dev URL. Click through: `/signin` → sign up → `/dashboard` → New Story → editor.
- Open `src/App.tsx` and trace one click through to the rendered page. Confirm: route → component → store hook → JSX.
- Open [src/types/index.ts](src/types/index.ts). Read it end-to-end. This is your contract for everything below.
- Open [src/store/authStore.ts](src/store/authStore.ts) (smallest store). Notice the pattern: `create<State>((set) => ({ ...fields, ...actions }))`. Every store is the same shape.

**Hands-on:** change the `<title>` in [index.html](index.html) from `alexandria` to your name. Reload. Done. You have shipped a change.

**Resources:**
- **Vite docs — Getting Started**: https://vitejs.dev/guide/ (skim only — you don't need to configure it).
- **React docs — "Quick Start"** (the new official react.dev): https://react.dev/learn — read the first three pages: *Quick Start*, *Thinking in React*, *Tutorial: Tic-Tac-Toe*. The mental model from the tutorial maps directly onto how this codebase passes state down + callbacks up.
- **TypeScript Handbook — "The Basics" + "Everyday Types"**: https://www.typescriptlang.org/docs/handbook/2/basic-types.html. Skip generics for now; you'll meet them naturally in Phase 2.
- **Web Dev Simplified — "Learn React Router v6 In 45 Minutes"** (YouTube channel: Web Dev Simplified). React Router 7 is a near-superset of v6 for the patterns in this app — search YouTube. Watch at 1.5×.
- **MDN — DOM basics**: https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model/Introduction. Background reading; you'll need it when you read the imperative `videoRef.current.muted` code in Phase 4.

### Phase 1 — Design system & CSS (6–10 h)

**Goal:** add or change UI without breaking the visual system.

- Read [src/styles/editor.css](src/styles/editor.css) top-to-bottom — focus on the `--rose-*`, `--text-*`, `--bg-*` token block. Then [dashboard.css](src/styles/dashboard.css). Notice that `--db-*` mirrors editor tokens.
- Read [shell.css](src/styles/shell.css) to see the diagonal-stripe gate texture (line you want: `repeating-linear-gradient(45deg, ...)`).
- Try the six-color palette in DevTools: pick an element on `/dashboard`, override `--db-rose-accent` live and watch what changes. This is the fastest way to learn the token graph.

**Hands-on:** in [Dashboard.tsx](src/pages/Dashboard.tsx), change the empty-state copy or add a faint subtitle under the page heading using the existing `--db-text-tertiary` token. No new colors, no new spacing.

**Resources:**
- **MDN — CSS custom properties (variables)**: https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties. Read the *Inheritance* and *Cascading variables* sections — that's exactly how `[data-theme="dark"]` scoping works in this codebase.
- **MDN — `repeating-linear-gradient()`**: https://developer.mozilla.org/en-US/docs/Web/CSS/gradient/repeating-linear-gradient. The gate texture is one line of this; understanding the syntax means you can skin it.
- **MDN — Flexbox guide**: https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_flexible_box_layout/Basic_concepts_of_flexbox. The whole UI is flexbox; this is the highest-leverage CSS topic.
- **CSS-Tricks — "A Complete Guide to Flexbox"**: https://css-tricks.com/snippets/css/a-guide-to-flexbox/. Skim as a reference card.
- **Kevin Powell — YouTube channel** (https://www.youtube.com/@KevinPowell). His CSS variables and flexbox videos are the gold standard. Watch one of his "CSS variables" intros.
- **Refactoring UI** (Adam Wathan & Steve Schoger book/site, https://www.refactoringui.com/). Optional but useful for understanding *why* the design tokens are structured the way they are. Free sample chapters online.

### Phase 2 — React + TypeScript in this codebase (8–12 h)

**Goal:** read any component fluently and write a new one that fits.

- Pick a small component: [GateShell.tsx](src/components/GateShell.tsx), [GateLogo.tsx](src/components/GateLogo.tsx), [Navbar.tsx](src/components/Navbar.tsx). Read each twice — once for what it renders, once for how its props are typed.
- Open [pages/AgeGate.tsx](src/pages/AgeGate.tsx). It's the cleanest example of "props in, callbacks out, no store."
- Then a store-touching one: [pages/Interstitial.tsx](src/pages/Interstitial.tsx) — reads + writes `readerStore`.
- Note the patterns this codebase uses: function components, `useState` / `useEffect` / `useCallback` / `useRef`, typed props as an interface beside the component, store via custom hooks (`useEditorStore()`).

**Hands-on:** add a console.log in [Reader.tsx](src/pages/Reader.tsx) inside the gate flow. Reload a story and watch which gate fires when. Remove it after.

**Resources:**
- **React docs — "Describing the UI"** and **"Adding Interactivity"**: https://react.dev/learn/describing-the-ui and https://react.dev/learn/adding-interactivity. These two sections cover ~80% of the patterns in the codebase.
- **React docs — "Managing State"**: https://react.dev/learn/managing-state — especially *Choosing the State Structure* and *Sharing State Between Components*. These articles are short.
- **React docs — built-in hook references** (use these as a *dictionary*, not a tutorial): https://react.dev/reference/react. Bookmark `useEffect`, `useCallback`, `useRef`, `useState`.
- **Dan Abramov — "A Complete Guide to useEffect"**: https://overreacted.io/a-complete-guide-to-useeffect/. Long but worth it. The single best piece of writing on the most-misused hook.
- **TypeScript Handbook — "Object Types" + "Type Manipulation: Generics"**: https://www.typescriptlang.org/docs/handbook/2/objects.html. After this, `Partial<Layer>` (used in `editorStore.updateLayer`) will read naturally.
- **Theo (t3.gg) — YouTube channel**: short, opinionated React + TS videos. Search his channel for "React 19" and "useEffect" videos for current-practice perspective.
- **Matt Pocock — "Total TypeScript" free Beginner's Tutorial**: https://www.totaltypescript.com/tutorials/beginners-typescript. ~2 hours, hands-on, calibrated for the kind of TypeScript this codebase uses (props interfaces, narrowing, `as` assertions).

### Phase 3 — Zustand state management (4–6 h)

**Goal:** read/write any store, understand the auto-save side effect.

- Read all four stores in order: [authStore.ts](src/store/authStore.ts) → [readerStore.ts](src/store/readerStore.ts) → [gateStore.ts](src/store/gateStore.ts) → [editorStore.ts](src/store/editorStore.ts). Each adds complexity.
- Trace one full edit cycle: in [EditorCanvas.tsx](src/components/editor/EditorCanvas.tsx), find a place where `setSaveStatus('unsaved')` is called → jump to [useAutoSave.ts](src/hooks/useAutoSave.ts) → see the 2s debounce → see the three sequential UPDATEs. **This is the core "state → side effect → DB" pattern in the whole app.**
- Notice the comment block in [useAutoSave.ts](src/hooks/useAutoSave.ts) lines 79–83 about why playback fields had to be added back. That's a real bug-fix-from-experience comment — read it.

**Hands-on:** in [readerStore.ts](src/store/readerStore.ts), add a `console.log` inside `toggleVideoSfx`. Open a story, hit the navbar speaker. Confirm it fires. Remove it.

**Resources:**
- **Zustand official README + docs**: https://zustand.docs.pmnd.rs/ and https://github.com/pmndrs/zustand. The README alone is enough to read every store in this app. Read *Recipes* → *Updating state* and *Slices pattern*.
- **Jack Herrington — "Zustand: How and Why"** (YouTube channel: Jack Herrington). His Zustand walkthroughs are short and match the patterns used here. Search his channel.
- **Cosden Solutions — "Zustand Crash Course"** (YouTube). Good 30-minute primer if you want video-first learning.
- **Kent C. Dodds — "Application State Management with React"**: https://kentcdodds.com/blog/application-state-management-with-react. Background on *why* Zustand-style stores beat prop drilling — useful even though Kent advocates for context.
- **React docs — "You Might Not Need an Effect"**: https://react.dev/learn/you-might-not-need-an-effect. Critical reading before you touch `useAutoSave.ts` — explains when `useEffect` is the right tool (it is, here) versus when it's a code smell.

### Phase 4 — Reader system deep dive (10–14 h)

**Goal:** modify the reader's animation, layout, or audio behavior with confidence.

- Read [styles/reader.css](src/styles/reader.css) focused on the three classes: `.reader-stage`, `.reader-panel-slot` (this is where `perspective: 1400px` lives — note the comment about why it's NOT on the stage), `.reader-panel-card` (`transform-style: preserve-3d`, `backface-visibility: hidden`).
- Read [components/reader/PanelScrollItem.tsx](src/components/reader/PanelScrollItem.tsx) end-to-end. The key block:
  ```ts
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end','center center','end start'] })
  const rotateX = useTransform(scrollYProgress, [0,0.5,1], [-30, 0, 40])
  const scale   = useTransform(scrollYProgress, [0,0.5,1], [0.88, 1, 0.84])
  const opacity = useTransform(scrollYProgress, [0,0.5,1], [0.45, 1, 0.25])
  ```
  These three numeric arrays are the entire 3D effect. Tweak them and you tweak the feel of the reader.
- Find the `introVariant === 'first'` block in the same file. That's the cover→panel-1 entry.
- Find PanelMedia in [Reader.tsx](src/pages/Reader.tsx) (lines 40–117). Read the IntersectionObserver block and the `useEffect(() => { el.muted = effectiveMuted })` block. The mute sync is the single most-bug-prone part of the reader.

**Hands-on (safe, reversible):** in [PanelScrollItem.tsx](src/components/reader/PanelScrollItem.tsx), change the outgoing rotateX from `40` to `25`. Reload. Less aggressive page turn. Revert to 40 when you're done.

**Resources:**
- **Framer Motion docs — "Scroll-triggered animations"**: https://www.framer.com/motion/scroll-animations/. The `useScroll` + `useTransform` pattern in `PanelScrollItem.tsx` is straight out of this page.
- **Framer Motion docs — `useTransform`**: https://www.framer.com/motion/use-transform/. Read *Mapping value ranges* — that's the `[0, 0.5, 1] → [-30, 0, 40]` pattern.
- **Framer Motion docs — `AnimatePresence`**: https://www.framer.com/motion/animate-presence/. Used in the cover→reader handoff.
- **MDN — CSS `perspective`**: https://developer.mozilla.org/en-US/docs/Web/CSS/perspective and **`transform-style`**: https://developer.mozilla.org/en-US/docs/Web/CSS/transform-style. Read both. The "containing block trap" comment in the codebase only makes sense after you've read these.
- **MDN — "Containing block"**: https://developer.mozilla.org/en-US/docs/Web/CSS/Containing_block. The exact reason perspective is on the slot, not the stage. Re-read after the perspective page.
- **MDN — Intersection Observer API**: https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API. PanelMedia uses this for video play/pause; the page's example is a near-clone of the codebase pattern.
- **MDN — HTMLMediaElement (`<video>` / `<audio>`)**: https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement. Especially the `muted`, `play()`, `pause()`, `currentTime` properties — these are all imperative DOM, not React.
- **Sam Selikoff — YouTube channel** (https://www.youtube.com/@samselikoff). His Framer Motion videos are the most "production-realistic" walkthroughs online. Search "Sam Selikoff framer motion."
- **web.dev — "Smooth scrolling and scroll-driven animations"**: https://web.dev/articles/scroll-driven-animations. Background reading on the broader pattern; the codebase implements this pattern with Framer rather than the new CSS `animation-timeline`, but the *concepts* transfer.
- **Josh W. Comeau — "An Interactive Guide to CSS Transforms"**: https://www.joshwcomeau.com/css/transforms/. The clearest explanation of `transform-origin`, perspective, and 3D transforms anywhere.

### Phase 5 — Editor system deep dive (12–18 h)

**Goal:** add or modify a control on the right rail or canvas.

- Read [pages/Editor.tsx](src/pages/Editor.tsx) — it's the orchestrator: load → init store → mount regions → call `useAutoSave()`.
- Read [components/editor/EditorTopBar.tsx](src/components/editor/EditorTopBar.tsx), [EditorFilmstrip.tsx](src/components/editor/EditorFilmstrip.tsx), [EditorRail.tsx](src/components/editor/EditorRail.tsx) in any order — each is independent.
- Read [components/editor/EditorCanvas.tsx](src/components/editor/EditorCanvas.tsx) very carefully. It contains:
  - The inline LayerCanvas drag/resize component (lines ~43–260). Re-read the `handleMouseMove` block — the `me.shiftKey` constraint at the corners is how proportional resize works.
  - `handleUpload` (lines 318–365) — the canonical Supabase Storage upload pattern.
  - The dot-grid CSS lives in [editor.css](src/styles/editor.css) under `.editor-canvas-area` / `.editor-canvas-viewport`.
- Read [hooks/useAutoSave.ts](src/hooks/useAutoSave.ts) one more time, slowly. It's only ~115 lines and it owns *all* persistence in the editor.

**Hands-on:** in EditorCanvas's resize handle JSX (~lines 245–253), change one corner handle's color from `#DC5A8A` to `#E87FAA` (Rose Soft). Open the editor, select a non-fill layer, see the corner color change.

**Resources:**
- **MDN — Pointer Events** (`pointerdown`, `pointermove`, `pointerup`): https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events. The codebase uses MouseEvent, but Pointer Events are the modern equivalent — same mental model. Read this for the *concept* of "start gesture, listen on window, end gesture."
- **MDN — `useRef` + DOM access**: https://react.dev/reference/react/useRef#manipulating-the-dom-with-a-ref. The drag state in `LayerCanvas` lives in a `useRef`, not state, because mutating it shouldn't re-render. Read the "Why a ref instead of state?" section.
- **MDN — `getBoundingClientRect()`**: https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect. The percentage math `(clientX - startX) / panelWidth * 100` builds on this.
- **Web Dev Simplified — "Drag and Drop in Vanilla JS"** (YouTube). Conceptual prep before reading the LayerCanvas drag code. Skim at 2×.
- **Josh W. Comeau — "useEffect cheatsheet" / "the surprising power of useDebounce"**: https://www.joshwcomeau.com/. Helpful before reading `useAutoSave.ts` — the trailing-debounce pattern shows up.
- **Lodash docs — `_.debounce`**: https://lodash.com/docs/#debounce. Don't import lodash, but read the *signature* — it'll click why `useAutoSave` clears the timer on every re-fire.
- **TkDodo — "Practical React Query"** series (https://tkdodo.eu/blog/all). You won't use React Query in this codebase, but his thinking on async state, request races, and `requestIdRef`-style patterns is the best on the internet. Read the first three posts.

### Phase 6 — Supabase as a frontend tool (4–6 h)

**Goal:** add or modify a query without help.

- Read [lib/supabase.ts](src/lib/supabase.ts). It's 4 lines.
- Read every Supabase call in the codebase as a template library. The cleanest references:
  - **SELECT with filter and order:** [hooks/useReaderData.ts](src/hooks/useReaderData.ts) lines containing `.from('chunks').select('*').eq('story_id', ...).order('position', ...)`.
  - **INSERT returning the row:** [Dashboard.tsx](src/pages/Dashboard.tsx) `handleNewStory` (lines 103+) — `.insert({ ... }).select().single()`.
  - **UPDATE by id:** all over [useAutoSave.ts](src/hooks/useAutoSave.ts).
  - **DELETE by id:** [Dashboard.tsx](src/pages/Dashboard.tsx) `handleDeleteClick` (line 161+).
  - **Storage upload + public URL:** [lib/upload.ts](src/lib/upload.ts) `uploadToPanelsBucket`.
- When a query returns `{ error }`, you handle it. RLS rejections show up as a non-null `error` (no exception thrown). Read [Dashboard.tsx](src/pages/Dashboard.tsx) to see the standard try/catch + setError pattern.

**Hands-on:** in [Dashboard.tsx](src/pages/Dashboard.tsx), add a `console.log(stories.length, 'stories')` inside `fetchStories`. Open the dashboard. Confirm it logs. Remove.

**Resources:**
- **Supabase docs — "Using the JavaScript Client"**: https://supabase.com/docs/reference/javascript/introduction. The *Filters*, *Modifiers*, and *Insert/Update/Delete* sections are your daily reference.
- **Supabase docs — "Auth with React"**: https://supabase.com/docs/guides/auth/quickstarts/react. Mirrors what's already in `App.tsx` — confirms you understand the bootstrap pattern.
- **Supabase docs — "Storage"**: https://supabase.com/docs/guides/storage. Read the *Uploading files* and *Public buckets* pages — that's all `lib/upload.ts` is doing.
- **Supabase docs — "Row Level Security"**: https://supabase.com/docs/guides/auth/row-level-security. You won't write policies, but knowing what an RLS rejection *looks like* (a non-throwing `{ error }` with code `42501`) saves debugging hours.
- **Supabase YouTube channel** (https://www.youtube.com/@Supabase). Their "Build in public" series shows the full INSERT/SELECT/UPDATE loop in real apps. Watch one full-stack walkthrough.
- **Jon Meyers — "Build a Full Stack App with Next.js and Supabase"** (YouTube, on the Supabase channel). The Next.js parts are different from this stack but the Supabase calls are identical to what you'll write here.
- **PostgreSQL docs — "SQL Syntax: Lexical Structure"** (skim only): https://www.postgresql.org/docs/current/sql-syntax-lexical.html. You don't need to write SQL, but recognizing it when an error message references a query helps.

### Phase 7 — First real contributions (varies)

Three approachable tasks from the known backlog, in order of difficulty:

1. **Wire the Music toggle in Interstitial / Navbar.** Currently `readerStore.musicEnabled` is set from the toggle but nothing reads it. There's no music layer in the reader yet, so this is partly UX-design-first. The contained version: pick an audio layer (where `media_type === 'audio'`) and gate its playback on `musicEnabled` the same way `videoSfxEnabled` gates video. Files: [readerStore.ts](src/store/readerStore.ts), [Reader.tsx](src/pages/Reader.tsx) PanelMedia (or a new audio sibling). **Frontend-only.**
2. **Add a "Duplicate panel" button to the filmstrip.** Insert a new panel after the active one, copy its layers (new ids, same `media_url` references — Storage doesn't need re-upload), set save status to unsaved. Files: [editorStore.ts](src/store/editorStore.ts) (add action), [EditorFilmstrip.tsx](src/components/editor/EditorFilmstrip.tsx) (button + handler). **Frontend-only**, including the Supabase INSERT for the new panel + layers.
3. **Add a creator-side "Preview as reader" button.** Open `/u/:username/s/:slug?preview=1` in a new tab. The preview-mode plumbing already exists in [Reader.tsx](src/pages/Reader.tsx). All you need is a button in [EditorTopBar.tsx](src/components/editor/EditorTopBar.tsx) that opens the URL. **Frontend-only**, ~10 lines.

---

## 6. Things to know before you start

**Architectural patterns that aren't standard React:**

1. **Per-slot 3D perspective, not stage-level.** [styles/reader.css](src/styles/reader.css) puts `perspective: 1400px` on `.reader-panel-slot`, *not* on `.reader-stage`. Putting it on the stage would create a containing block that traps `position: fixed` descendants — Navbar, ThumbnailStrip, ExitPreview would all become anchored to the stage instead of the viewport. If you ever feel tempted to move perspective up, don't.
2. **Imperative video.muted sync.** [Reader.tsx](src/pages/Reader.tsx) PanelMedia has `useEffect(() => { videoRef.current.muted = effectiveMuted })`. React's declarative `muted` prop on `<video>` does NOT update mid-playback in all browsers. Without this effect, the navbar speaker button silently fails on already-playing videos.
3. **Window scroll, not container scroll.** Framer's `useScroll` is called without a `container` argument so it tracks `window.scrollY`. A scoped overflow container would re-create the fixed-positioning trap.
4. **`scroll-snap-type` toggled off during programmatic scrolls.** When the reader programmatically scrolls in cinematic mode, snap is set to `'none'` for the duration of the Framer tween, then restored. Otherwise the browser snap algorithm hijacks the tween.
5. **First-panel intro is on an INNER `motion.div`.** The outer `motion.div` already carries scroll-driven transforms. Compounding the entry on the same element would conflict. The intro lives on a nested element with its own `transform-style: preserve-3d`.
6. **`react-hooks/exhaustive-deps` suppressions.** Zustand setters (`setSaveStatus`, `setUser`, etc.) are stable references across renders — Zustand guarantees this. So pulling them out of `useEffect` deps is safe, even though ESLint complains. Per the decision log: suppressions are intentional when the missing dep is a Zustand setter. Don't "fix" them by re-adding the setter to deps; you'll cause re-runs.
7. **Auto-save is sequential, not parallel.** [useAutoSave.ts](src/hooks/useAutoSave.ts) UPDATEs the story, then loops panels, then loops layers. For a story with 30 panels and 60 layers that's 91 sequential network calls. Acceptable for MVP, but a known perf cliff to flag if it becomes a problem.

**Known fragility / tech debt that touches the frontend:**

- Gate screens use **inline styles** (not the CSS token system). This is a deliberate "ship it" choice; refactor later but don't expect the design tokens to apply automatically there.
- [PhoneShell.tsx](src/components/PhoneShell.tsx) **exists but is not used** in the current layout. Don't build new things on top of it. Same goes for any reference to `OverlayCanvas` / `overlay.css` / the `overlays` table — all dropped, do not write code against them.
- The filmstrip **reorder buttons exist but are noted as broken**. Drag-to-reorder is deferred. Don't trust the arrows yet.
- Cover URL is **not retroactively backfilled** for stories created before that flow existed. New stories only.
- The free-tier **branding badge is always shown** — there's no tier system yet, so the conditional is hardcoded.

**Pending operator action (NOT a frontend task — flag this for whoever owns the Supabase project):**

> Run this once in the Supabase SQL editor:
> ```sql
> UPDATE layers SET muted = false WHERE media_type = 'video' AND muted = true;
> ```
> The default for `LAYER_DEFAULTS.video.muted` was changed from `true` → `false` so new videos defer to the viewer's global preference. Existing rows need to be brought in line. Creator-set hard-mutes will already be `true` and should *not* be touched (this query unmutes everything that was the old default; if some videos were intentionally muted by creators before the change, those are indistinguishable from defaults and would also flip — accept this as a one-time reset).

**Discrepancies vs. the spec brief you provided:**

- Spec says React Three Fiber / Three.js is "wired up in V2." **Codebase: not installed.** Treat 3D as pure-CSS-perspective + Framer for now.
- Spec describes the reader rebuild on `.reader-stage` / `.reader-panel-slot` / `.reader-panel-card`. **Codebase confirms** — those exact class names exist in [styles/reader.css](src/styles/reader.css).
- Spec mentions Backblaze B2 + Cloudflare Stream. **Codebase: only Supabase Storage.** B2/Stream are deferred-post-MVP per the decision log.
- Spec implies a `supabase/migrations/` folder might exist. **It does not** in the working dir — schema lives in the Supabase project console.

---

## 6.1 Always-on references (bookmark these)

These don't belong to any one phase — keep them open in pinned tabs:

- **react.dev** — official React docs. Use the *Reference* sidebar as a dictionary.
- **MDN Web Docs** (https://developer.mozilla.org) — the canonical source for HTML, CSS, JS, and DOM APIs. If a Stack Overflow answer disagrees with MDN, MDN is right.
- **Framer Motion docs** (https://www.framer.com/motion/).
- **Zustand docs** (https://zustand.docs.pmnd.rs/).
- **Supabase docs** (https://supabase.com/docs).
- **TypeScript Handbook** (https://www.typescriptlang.org/docs/handbook/intro.html).
- **Can I Use** (https://caniuse.com) — when you wonder if a CSS or JS feature is safe to ship, this is the answer.
- **CSS-Tricks Almanac** (https://css-tricks.com/almanac/) — quick-reference for any CSS property.
- **Josh W. Comeau's blog** (https://www.joshwcomeau.com/) — best CSS + React explainers on the internet, period.

**Communities worth lurking in (read-only is fine):**

- **r/reactjs** — when you hit a React-specific WTF, search here first.
- **Supabase Discord** (linked from supabase.com) — fastest place to confirm RLS / Storage gotchas.
- **TkDodo's blog** (https://tkdodo.eu/blog) — async state and React mental-model writing.

**Optional but high-leverage paid courses (only if you want a structured push):**

- **Epic React** by Kent C. Dodds (https://epicreact.dev) — comprehensive, expensive, and overkill for this codebase but excellent if you want career-grade depth.
- **Total TypeScript** by Matt Pocock (https://www.totaltypescript.com) — has free tutorials; the paid courses are TS-deep.
- **Josh Comeau's "CSS for JS Developers"** (https://css-for-js.dev) — if CSS keeps tripping you up after Phase 1, this is the cure.

---

## 7. Verification

This is a documentation deliverable, not a code change. To verify the document against reality:

1. Open three or four of the file links above and confirm the line numbers / quoted code still match. (Files I cite by line number are pinned to the state I read them in.)
2. Run `pnpm dev`, sign in, open a story in the editor, and walk through the 5 regions while reading §2.2. The labels should match what you see.
3. Open a published story in the reader, scroll once, and confirm the panel-card pivots — that's `useScroll` + `useTransform` from [PanelScrollItem.tsx](src/components/reader/PanelScrollItem.tsx) doing its job.

If anything in this map drifts from the codebase later, the codebase wins — re-read the cited file and update your mental model.

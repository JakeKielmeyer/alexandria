# Alexandria — Session Prompt: Page Curl Animation Polish

### New Chat Initialization · Dedicated curl improvement session

---

## IMPORTANT — READ BEFORE DOING ANYTHING

1. Run `git pull` and confirm you are on the latest commit on `master`. Show `git log --oneline -5`.
2. Read this entire prompt carefully.
3. Ask any clarifying questions before touching any code.
4. Do not write a single line of code until Jake tells you to proceed.

---

## What This Session Is

The page curl animation (Phase 5) is implemented and committed. The mechanics work — spring
physics, html2canvas texture baking, CSS overlay state machine — but the visual result isn't
good enough yet. This session is focused **exclusively** on improving how the curl looks and
feels. Model: `claude-opus-4-7`, Effort: Max.

---

## Current Implementation (do NOT rebuild, only improve)

### Architecture

```
src/components/BookReader/
  BookPage.tsx     — PlaneGeometry(796, 879, 32, 32), custom spring in useFrame, vertex deform
  BookSpread.tsx   — Two BookPage meshes + spine shadow
  BookScene.tsx    — R3F scene: lights, group scale, BookSpread or single BookPage
  index.tsx        — html2canvas baking, CurlPhase state machine, CSS overlay hide/show
```

### State machine (index.tsx)

```
'idle' → user nav → 'baking' (html2canvas runs, 100–300ms) → 'curling' → spring settles → 'idle'
```

- Nav action fires **at the START** of `'curling'` (not at end) so destination content renders
  invisibly during the animation and is ready when the curl ends.
- All CSS overlays are hidden (`opacity: 0`) during `'curling'`, restored on `'idle'`.

### Spring (BookPage.tsx)

Semi-implicit Euler, all state in refs (no React re-renders during animation):

```ts
const STIFFNESS = 200   // spring stiffness
const DAMPING   = 40    // spring damping
const RADIUS    = 150   // cylinder radius
const EDGE      = 398   // page half-width (page is 796 wide)
const SWEEP     = 1096  // foldX sweeps from ±398 to ±(398+698) off-screen
```

Spring settles in ~0.6–0.8 s with no bounce. `onCurlComplete` fires exactly once when
`progress` settles at 1.

### Vertex deformation (BookPage.tsx)

Cylindrical fold: for each vertex at `origX`, compute distance from fold line `foldX`,
wrap into a cylinder of radius `RADIUS`. The fold sweeps from the page edge off-screen.

```ts
const foldX = curlFromRight ? EDGE - p * SWEEP : -EDGE + p * SWEEP
const d     = curlFromRight ? ox - foldX : foldX - ox
if (d > 0) {
  angle = min(d / RADIUS, π)
  newX  = foldX ± RADIUS * sin(angle)
  newZ  = RADIUS * (1 - cos(angle))   // lifts toward viewer
}
```

### Lighting (BookScene.tsx)

```tsx
<ambientLight intensity={0.35} />
<directionalLight position={[5, 5, 8]} intensity={1.1} />
```

### Critical constraint — @react-spring/three is BROKEN on this stack

React 19 + R3F v9 use a custom reconciler that does **not** share the React dispatcher.
Any hook from `@react-spring/three` (or `@react-spring/core`) called inside a component
that lives inside `<Canvas>` will throw `Cannot read properties of null (reading 'useMemo')`.
**Do not use @react-spring/three or any external spring library inside R3F components.**
The custom spring in `useFrame` is the correct pattern for this stack.

---

## Known Issues (what still looks wrong)

### 1. Curl looks flat — orthographic camera kills depth

The camera is orthographic (`<Canvas orthographic camera={{ zoom: 1 }}>`). Orthographic
projection means Z-movement is completely invisible — the page lifts 300 units toward the
viewer but visually appears to only slide sideways. This is the biggest gap vs. EndlessBook.

The CSS overlay system aligns with the orthographic camera using a scale formula:
```ts
scale = Math.min(containerH / 879, containerW / 1592) * 0.93
```
CSS overlays use this same scale for pixel-exact alignment. Switching to a **perspective
camera** would create real 3D depth but requires re-deriving the scale formula and verifying
CSS overlay alignment doesn't break.

### 2. Back face of the curl shows blank parchment

When the page curls past 90°, the back face becomes visible. Currently it shows only the
parchment base color (`#f0ece4`) because `meshStandardMaterial` with `DoubleSide` uses the
same texture on both sides — and no back-face texture is provided.

In a real book curl, the back of the turning page shows the **destination page's content**.
The fix requires either:
- A GLSL `ShaderMaterial` that checks `gl_FrontFacing` and samples a different texture per side
- Two meshes sharing the same geometry: one `FrontSide` with the source texture, one `BackSide`
  with the destination texture

The destination page content must be pre-baked (html2canvas of the **next** panel's overlay
div) before the curl starts.

### 3. No shadow beneath the curl

A real page peeling off a surface casts a shadow on the page underneath. There is currently
no shadow. A simple semi-transparent dark quad (positioned just behind the fold line, Z ≈ -1)
that sweeps with `foldX` would add significant depth perception.

### 4. html2canvas latency (100–300ms blank pause before curl starts)

During `'baking'` phase the user sees nothing happen — a perceptible pause before the
animation starts. Options: pre-bake on hover, show a subtle "lift" hint during baking, or
use a faster DOM capture method.

---

## Priority Order (suggest tackling in this order)

1. **Back-face texture** (biggest visual win — shows next-page content through the curl)
2. **Perspective camera** (true 3D depth — requires CSS overlay alignment verification)
3. **Shadow plane** (depth cue, relatively simple to add)
4. **Baking latency** (polish, address last)

---

## Key Files

```
src/components/BookReader/BookPage.tsx     — spring + vertex deform (primary)
src/components/BookReader/BookScene.tsx    — lights, camera scale
src/components/BookReader/BookSpread.tsx   — curl routing to left/right page
src/components/BookReader/index.tsx        — html2canvas, CurlPhase state machine
src/types/index.ts                         — BOOK_PAGE_WIDTH=796, BOOK_PAGE_HEIGHT=879
```

---

## Curl Direction Reference

| Mode         | Action      | page       | curlFromRight |
|---|---|---|---|
| Landscape LTR | goNext     | `'right'`  | `true`  |
| Landscape LTR | goPrev     | `'left'`   | `false` |
| Landscape RTL | goNext     | `'left'`   | `false` |
| Landscape RTL | goPrev     | `'right'`  | `true`  |
| Portrait LTR  | goNextPanel | `'center'` | `true`  |
| Portrait LTR  | goPrevPanel | `'center'` | `false` |
| Portrait RTL  | goNextPanel | `'center'` | `false` |
| Portrait RTL  | goPrevPanel | `'center'` | `true`  |

---

## Standing Instructions

- **Confirm before coding.** Read through the files, ask questions, wait for go-ahead.
- **Do not assume or guess.** If anything is unclear, ask.
- **Do not rebuild working parts.** The spring, vertex math, and state machine work — improve around them.
- **TypeScript must stay clean.** `npx tsc --noEmit` after every change.
- **No @react-spring/three** inside Canvas. See constraint above.
- Quality >>> speed.

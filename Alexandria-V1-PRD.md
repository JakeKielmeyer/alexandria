# Alexandria — Product Requirements Document
### V1 Multi-Format Restart · Comic · Book · Webtoon

> **How to read the tags.** Every major item is marked **[Carry-over]** (keep from V2 essentially as-is), **[Throw-out]** (V2 approach is being replaced), or **[Open]** (decision not yet made — needs your call before that section is built). The tags are the point of this document: they make the restart a set of explicit decisions rather than a vibe.

| | |
|---|---|
| **Owner** | Jake |
| **Status** | Draft |
| **Last updated** | May 28, 2026 |
| **Version** | 0.1 |
| **Supersedes** | Alexandria V2 MVP Spec (April 25, 2026) |

---

## 1. Summary

Alexandria is a browser-based authoring and hosting platform for adult visual storytelling. V1 unifies **three formats**: **comic** and **book** (page-based, read as a two-page spread with a cinematic page-turn) and **webtoon** (continuous vertical scroll). Creators author once on a desktop/tablet spread; the layout **cascades responsively** to tablet and mobile, where a comic/book page becomes a single-page, side-swipe reading sequence — with per-breakpoint creator overrides, like CSS breakpoints. Stories live at permanent hosted URLs that creators share directly with their audience. There is no public discovery feed.

The defining bet of V1 over V2: a **browser-native, cinematic page-turn** for paged formats, plus a **responsive cascade** that lets one authored page read well on every screen.

## 2. Problem

Creators of adult and explicit visual stories — dark romance, horror, grimdark, explicit illustrated work — are banned or restricted on every mainstream platform, and existing adult-friendly hosts offer no presentation quality. **[Carry-over]** V2 proved the hosted-link model with webtoon. The V1 problem is narrower and sharper: creators want *paged* formats (comic and book) with a page-turn that feels cinematic, and no browser tool gives them that alongside adult-content hosting. The V2 attempt at a 3D page-turn failed (see §10), so "ship comic/book with a page-turn that actually feels good" is the core problem V1 solves.

## 3. Goals & Non-Goals

**Goals**
- Ship three formats at launch — comic, book, webtoon — in one platform with one library.
- Deliver a cinematic, **browser-native** page-turn for comic/book that meets the prototype/Heyzine quality bar.
- Make one authored page read well across desktop, tablet, and mobile via an auto-generated cascade plus per-breakpoint overrides.
- Reuse the V2 foundation (auth, gates, dashboard, content policy, Supabase, panel/layer model) wherever it carries.
- Preserve the working webtoon builder/reader as a parallel system.

**Non-Goals (V1)** — explicitly deferred so they stop competing for attention
- **[Throw-out]** True physically-simulated 3D / WebGL paper (Unity / EndlessBook tier). Browser 2.5D curl is the bar.
- **[Resolved → V2]** Irregular / overlapping / angled panels and bleeds. V1 is **rectangular panels only**; richer geometry lands in V2.
- Mixed formats *within a single story or page*. Mixing is **library-level only** (a library holds comic, book, and webtoon stories side by side).
- Public discovery feed.
- **[Resolved → V2]** Monetization / payments. Pulled forward from V3 to V2; still out of V1.
- **[Carry-over]** Real-time multi-session editing (V1 remains single-session, last-write-wins).

## 4. Target Users

**[Carry-over]** Creator segments unchanged from V2:
- **Priority 1 — Adult webtoon (dark romance & BL):** 2k–50k followers, 50–800 patrons, $200–$3,000/mo.
- **Priority 2 — Adult horror webtoon & comic:** 1k–30k followers, 30–400 patrons, $150–$2,000/mo.
- **Priority 3 — Explicit adult webtoon (harem, ecchi, BL/GL):** 500–20k followers, 50–600 subscribers, $300–$4,000/mo.

New emphasis: Priority 2's *comic* creators and a *book*/illustrated-prose segment become first-class in V1, since paged formats are the new capability.

**Readers** reach a story via a shared link, pass any gates, and read in the format the creator published.

## 5. User Stories

- As a **comic creator**, I author a page as a two-page spread, draw rectangular panels, drop media and text into them, mark the panel reading order for mobile, preview the mobile cascade, fine-tune it, and publish.
- As a **book creator**, I lay out spreads of text and images, choose a hardback "book" or paper "comic" presentation in publish settings, and publish to a permanent URL.
- As a **webtoon creator**, I build a vertical scroll story essentially as I do today.
- As a **reader on desktop**, I open a comic/book and turn pages with a cinematic curl, with sound if enabled.
- As a **reader on mobile**, the same comic reads as a single-page, side-swipe sequence in the creator's intended order.
- As a **reader**, I pass the appropriate gates (password / age / explicit consent) before any content.

## 6. Scope — What Ships in V1

| Capability | Priority | Tag | Notes |
|---|---|---|---|
| Paged comic/book editor — rectangular panels + layer model + text | P0 | Mixed | Layer model **[Carry-over]**; paged canvas & text **[Throw-out/rebuild]** |
| StPageFlip-based page-turn engine, ported into Alexandria | P0 | **[Throw-out]** R3F | Replaces failed R3F turn |
| Full-bleed spread ingestion — **image and video** (pre-slice, gutter-safe) | P0 | **[Resolved]** | Fixes the duplication bug; video uses spread-overlay at rest + sliced poster during turn; see §10 |
| Responsive cascade: desktop/tablet spread → mobile single-page side-swipe | P0 | **[Open→spec'd]** | The largest new surface |
| Per-breakpoint overrides (position, size, order, gutters/spacing) | P0 | **[Open→spec'd]** | CSS-breakpoint analogy |
| In-app text authoring (body text; speech bubbles) | P0 | **[Carry-over]** assets | Reuse prototype TextBlock + repo SpeechBubble |
| Webtoon builder/reader preserved | P0 | **[Carry-over]** | Parallel system |
| Reader gate flow (password / age / explicit consent) | P0 | **[Carry-over]** | Unchanged |
| Auth, dashboard, content policy, Supabase backend | P0 | **[Carry-over]** | Unchanged |
| Per-panel / per-page audio | P1 | **[Carry-over]** | Pipeline exists |
| Thumbnail nav, zoom, fullscreen | P1 | **[Carry-over]** | Prototype + V2 both have it |
| Book vs comic material styling (hardback vs paper) | P1 | **[Open→spec'd]** | Set in publish settings |
| Page-turn sound + ambient music | P1 | **[Carry-over]** | Prototype proven |

## 7. Functional Requirements

### A. Formats & data model **[Open — must be decided before building]**
1. A story has exactly one **format**: `comic`, `book`, or `webtoon`. Format is chosen at creation and set in publish settings; changing it after publish requires re-publishing.
2. Comic and book share one paged engine and data model; they differ only in **presentation** (paper vs hardback) and default styling. Book defaults to a 2-page spread (pages 1–2); the creator can invoke the panel tool to subdivide a page into comic-style panels. Media types (image / GIF / video / audio) and text are available in both.
3. Webtoon retains the V2 model (panels with `height`, vertical scroll). **[Carry-over]**
4. The paged model must represent: story → spread → page (left/right) → panel (rectangular) → layer (the existing layer fields: media, position %, fill mode, focal point, opacity, video flags). Plus **breakpoint overrides** keyed by breakpoint (see C).
5. Migration path from the V2 `panels`/`layers` schema to the paged model is **[Open]** — needs a decision: migrate existing webtoon data untouched (parallel) and introduce new tables for paged spreads, vs. a unified schema.

### B. Paged editor (comic / book)
1. Authoring surface is a **two-page spread** at a fixed reference size (desktop/tablet). **[Carry-over]** five-region editor layout adapts from V2.
2. **Panel tool:** creator draws rectangular panels on a page; rectangular only for V1. **[Open→out]** irregular/angled/overlap/bleed deferred.
3. Each panel contains the full **layer model** **[Carry-over]**: z-order, fill modes (crop/stretch/custom), focal point, opacity, video autoplay/loop/muted/rate.
4. **Text** **[Carry-over assets]**: body text blocks (reuse prototype `TextBlock`: font, size, color, position, align, shadow) and **speech bubbles** (reuse repo `SpeechBubble`). Text participates in the cascade (see C/§10 reflow risk).
5. **Full-bleed spread (image or video):** an explicit option to place one artwork across both pages. **Image:** pre-sliced into two page-halves at upload, rendered as two ordinary page layers. **Video:** the video plays at rest as a spread-overlay (via `is_spread_layer` mechanics); during the page-turn each leaf shows its half of a sliced poster frame. A **gutter-safe guide** warns when a subject sits on the spine. (Root-cause fix for the duplication bug; see §10.)
6. Autosave **[Carry-over]**: trailing 2s debounce, Zustand as source of truth, explicit Publish action.

### C. Responsive cascade & breakpoint editor **[Open — core new capability]**
1. Breakpoints: **desktop, tablet, mobile** (mobile = vertical orientation, single page). Desktop/tablet render the 2-page spread; mobile splits into single pages.
2. On cascade, the system **auto-generates a guided reading order**, panel by panel, from the authored spread.
3. Creators assign explicit panel order numbers (1, 2, 3…) that determine mobile sequence.
4. The **mobile editor** can override, per breakpoint: panel **position**, **size**, **reading order**, **gutters/spacing**, and which panels appear. Full CSS-breakpoint-style control.
5. Mobile reading gesture for comic/book is **horizontal side-swipe**, panel-by-panel — deliberately distinct from webtoon's vertical scroll.

### D. Page-turn engine **[Throw-out R3F → port StPageFlip]**
1. Port the prototype's StPageFlip-based engine: fixed two-page landscape spread on desktop/tablet, StPageFlip **portrait/single-page mode** on mobile.
2. Scene dressing carried from prototype: leather board shell, procedural SVG paper/leather grain, vignette, page-rustle sound, optional ambient music.
3. **Mid-turn media behavior (accepted):** video/animated panels freeze to a poster frame during the curl and resume when the page settles. Requires poster auto-generation (the prototype's planned-but-unbuilt piece). **[Open]** poster generation is a build item.
4. Visible-spread-only video playback and adjacent-spread preloading carried from prototype. **[Carry-over]**

### E. Reader flow & gates **[Carry-over — unchanged from V2]**
Password gate → age gate (Mature/Explicit) → explicit consent (Explicit) → pre-cover interstitial → cover → reader → end page. Content rating flags (General / Mature / Explicit) required at publish.

### F. Dashboard, auth, content policy **[Carry-over — unchanged from V2]**
Story cards, status/rating badges, share URL, password toggle, edit/delete. Supabase email/password auth. Content policy and absolute prohibitions unchanged.

## 8. Non-Functional Requirements
- **Performance:** page-turn should hold ~60fps on desktop; mobile turn must stay smooth at the cost of mid-turn media (poster freeze accepted). Cascade preview must be fast enough to iterate.
- **Accessibility** **[Carry-over]:** existing token system, focus rings, 44×44px targets, contrast floor, non-color-alone active states.
- **Content restrictions** **[Carry-over]:** illustrated only, adult characters only, no real-person sexual content, no photographs of people, no minors.
- **Browsers:** modern evergreen desktop + mobile browsers; StPageFlip and the cascade must be verified on mobile Safari and Chrome specifically.
- **Reliability:** autosave + explicit publish; single-session last-write-wins.

## 9. Key Flows
1. **Comic authoring → cascade:** create comic → author spread → draw panels → add layers/text → set panel order → preview mobile → override per breakpoint → publish.
2. **Book reading (desktop):** open link → gates → cover → page-turn through spreads with sound → end page.
3. **Comic reading (mobile):** open link → gates → cover → side-swipe single pages in authored order → end page.
4. **Webtoon reading:** **[Carry-over]** vertical scroll, video autoplay at 50% viewport.

## 10. Technical Considerations

**Stack** **[Carry-over]:** React 19 + TypeScript, Zustand, Supabase, Vite, Cloudflare Pages, Framer Motion. **Add:** `page-flip` (StPageFlip). **Remove:** React Three Fiber / three.js / drei **entirely** — resolved; R3F is not retained for any future format. (Confirmed clean: `SpeechBubble` is pure SVG/DOM math with no R3F dependency and is already wired into the editor and reader, so removal does not affect text/bubbles.)

**Load-bearing decisions**
- **Page-turn = StPageFlip port**, not R3F. The current R3F "turn" doesn't animate — `usePageTurn` is an index counter and `BookSpread` is remounted via `key`, hard-swapping a flat plane. The prototype's StPageFlip path is a real, mature curl. Evidence: your own working prototype, plus Heyzine/Visme, all achieve the cinematic feel with the same 2.5D-canvas approach; EndlessBook (true 3D) is Unity, not browser-native.
- **Full-bleed spread = pre-slice at upload, image and video in V1.** The duplication artifact came from one image being assigned to both pages independently. Fix: route full-bleed art through a single-reference type, pre-slice into two page-halves on upload, render as two ordinary StPageFlip pages. **Image:** halves are slices of the source. **Video:** source plays at rest as a spread-overlay (via `is_spread_layer`); during the turn each leaf shows its half of a sliced *poster* frame (reusing the poster generation needed for the mid-turn freeze). Gutter-safe guide warns when content sits on the spine.
- **Covers = single source from `stories.cover_url` (front) + optional `back_cover_url` (back); not modeled as spreads.** The marketing/Cover-Screen artwork and the StPageFlip front-cover leaf are the same image — one field avoids drift. Single-sided hard covers don't fit the two-page spread table; the page-turn engine prepends front cover and appends back cover around the interior `spreads`. The V2 end-page CTA screen (restart/exit/links) stays separate as today.
- **Mid-turn media = poster freeze (accepted).** Keeps us on StPageFlip. Requires poster auto-generation.
- **Cascade = responsive overrides on a base spread layout**, with auto-generated reading order + per-breakpoint overrides.

**Key risks**
1. **Cascade of multi-panel pages is the single largest surface** — bigger than the page-turn. Auto-generation must produce a usable default so creators rarely hand-fix. Mitigation: rectangular-only V1, explicit order numbers, override editor.
2. **Layered video / future irregular panels vs StPageFlip rasterization during the curl.** Mitigated for V1 by rectangular-only + poster-freeze; revisit before adding irregular geometry.
3. **Data-model migration** from V2 panels/layers to paged spreads + breakpoint overrides. **[Open]**
4. **Text reflow across breakpoints** — fixed page geometry fights reflowable text; define whether text scales/repositions or reflows.

**Must be decided before building:** the paged data model incl. breakpoint overrides (A5, C) — *now drafted in the paged-schema doc, awaiting confirmation of #3–#5 in that doc*; poster auto-generation approach (D3) — *now critical, since it serves both mid-turn freeze AND full-bleed video slicing*. *Resolved since last revision:* R3F removal, full-bleed handling (image + video), cover handling.

## 11. Out of Scope / Future
Irregular / overlapping / angled panels and bleeds **(→ V2)** · freeform (non-fixed) pages · monetization & payments **(→ V2)** · public discovery · multi-session editing · magazine format · true-3D/WebGL or Unity page-turn · creator profile pages (V3, URL namespace reserved).

### Version roadmap (taxonomy)
- **V1 (this restart):** three formats, rectangular panels, page-turn, responsive cascade, no payments. *(Folds in the old "V2 webtoon build" — that naming is retired.)*
- **V2 (next):** irregular/angled/overlapping panels + bleeds; monetization (Free/Creator/Pro tiers, Stripe).
- **V3+ (later):** magazine format, creator profile pages, custom domains, analytics, multi-session editing.

## 12. Success Metrics
- Founding-creator test **[Carry-over]**: 3–5 creators, 25–50 readers.
- A creator can complete a full story end-to-end in **each** format without engineering help.
- Creators judge the comic/book page-turn "good enough to ship" (qualitative bar = Heyzine-class).
- For a majority of authored pages, the **auto-generated mobile cascade is usable with little or no manual fixing**.
- Readers complete a story on both desktop and mobile without getting stuck.

## 13. Risks & Open Questions

| Risk / Question | Impact | Mitigation / Next step |
|---|---|---|
| Cascade auto-order quality | High | Prototype the auto-generator early; measure manual-fix rate |
| Paged data model + breakpoint overrides | High | Design schema before editor build (blocks B, C) |
| Migrate or parallel V2 schema | Med | Decide parallel vs unified |
| Poster auto-generation (serves mid-turn freeze AND full-bleed video slicing) | High | Spike canvas first-frame extraction (prototype has a hook); confirm it can produce sliced left/right halves for full-bleed video |
| Remove R3F (resolved) | Low | **Done decision:** remove R3F/three/drei entirely; verify no remaining imports after `BookReader` deletion |
| Text reflow across breakpoints | Med | Define text scaling rules per breakpoint |

## 14. Milestones

| Milestone | Definition of done |
|---|---|
| **M1 — Page-turn spike** | StPageFlip engine running inside Alexandria; full-bleed spread renders correctly (no duplication) at rest and mid-turn |
| **M2 — Paged editor (desktop spread)** | Rectangular panels + layer model + text/speech bubbles authored on a 2-page spread; autosave + publish |
| **M3 — Cascade + breakpoint editor** | Auto-generated mobile reading order; per-breakpoint overrides (position/size/order/gutters); mobile side-swipe reader |
| **M4 — Reader + gates + styling** | Page-turn reader wired to gate flow; book vs comic (hardback/paper) styling in publish settings; sound/music |
| **M5 — Integrate with webtoon + dashboard** | All three formats live in one library/dashboard; webtoon untouched and working |
| **M6 — Founding-creator test** | 3–5 creators build in each format; feedback loop running |

---

## Appendix

**References reviewed**
- `flipbookPrototypeV2` — the working page-turn (StPageFlip / `page-flip` v2.0.7, canvas 2.5D). Source of the engine to port and the scene-dressing recipe.
- Current `alexandria` repo — React 19 / R3F / Supabase production stack; contains the failed R3F `BookReader` and a reusable `SpeechBubble`.
- EndlessBook (Unity) — true-3D aspirational mood; **not** a browser build target.
- Heyzine, Visme — browser flipbook viewers confirming the 2.5D-canvas tier and pre-paginated-page approach.

**Key code findings**
- R3F turn does not animate (index remount); not salvageable as a page-turn.
- Prototype full-spread split uses `width:200%` + `object-fit:cover` per page — fragile for non-2:1 art; replace with pre-slice.
- Prototype already solves: visible-spread video playback, adjacent preload, React-vs-StPageFlip DOM ownership, two-page + portrait modes.

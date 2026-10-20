# Website redesign — design + handoff spec

Date: 2026-10-20 · Owner: Murat Güven · Stack: React 19 + TypeScript + Tailwind 3 (CRA), GitHub Pages

## 1. Brief

- **Who it's for:** academic hiring committees and collaborators *and* industry R&D, equally. Both need the same three answers fast: what does he work on, what has he produced, how do I reach him.
- **Goal:** a professional, specific, quiet site that reads as made by an engineer about his own work, not as a template.
- **Constraints:** light theme (no dark style). Hide CUTT-IA, WorldMap and Gauge from the public site. Static hosting on GitHub Pages.
- **Success:** a stranger can say in two sentences what Murat researches after 10 seconds on the page; zero placeholder content ships; Lighthouse accessibility ≥ 95; works at 375 px.

## 2. Subject matter (what the design is built from)

Real material from the MSc thesis and the CV (Oct 2026), not invented:

- **Profile:** computational and AI-based decision support for structural engineering and sustainable construction: optimization methods, BIM-integrated workflows, computational tools for steel fabrication.
- **PhD (Nov 2024 – present):** Politecnico di Milano, ABC. Thesis: BIM-integrated decision support for laser and plasma cutting process selection in steel construction. PNRR-funded. Advisor: Assoc. Prof. Alper Kanyilmaz.
- **Research Fellow (Mar – Nov 2024):** Politecnico di Milano, DABC. Structural design and fabrication for steel: laser cutting, metal 3D printing, environmental impact.
- **MSc (2020 – 2023):** İzmir Institute of Technology, Civil Engineering. Thesis *Topology optimization of nonlinear elastic microstructures*: Julia framework, 2D periodic neo-Hookean unit cells, symmetry-based domain halving, 3D-printed samples under uniaxial tests. TÜBİTAK 1002 project 122M134 (researcher). Advisor: Assoc. Prof. İzzet Özdemir.
- **BSc (2016 – 2020):** Kocaeli University, Civil Engineering. Thesis on bending of thin plates with variable thickness.
- **Publications:** see `publications.ts` seed in §6.
- **Teaching, talks, awards:** AI workshops and trainings for AEC (Politecnico di Milano, Braun Engineering Group executive board), TA for Life-Cycle Driven Structures, MSc co-supervision, talks at PropTech Day 2025 and Festival dell'Ingegneria 2025, Audience Prize at the EWSHM 2026 Young Professionals Challenge, Top 25 at Switch2Product 2024 (concApp).
- **Visual vocabulary of the field:** optimized unit cells and their tilings, cut paths, sheet steel, kerf, the bright molten edge where a laser cuts.

Unifying idea for the site: **shapes that are computed, then cut.** The hero shows a periodic unit cell tiled into a sheet, traced once by a cut path.

## 3. Direction review (why not mockup C)

Mockup C (cream paper, serif display, warm-red accent, hairline rules, mono labels, `A · B` meta strings) matches the most common generated-site look almost point for point. Revised:

| C had | Changed to | Why |
|---|---|---|
| Warm cream `#F6F4EE` | Cool zinc grey `paper #E9ECEA` | Cream is the default AI paper; zinc/galvanized steel is this subject's material |
| Serif display + mono labels | One family, Archivo, using its **width axis** | Expanded for headlines, condensed for data. The type does the engineering voice without a costume mono |
| Hairline-ruled broadsheet chrome everywhere | Rules only where they separate data rows (publication list, timeline) | Structure must encode information |
| Uppercase tracked labels, `01 / 02` numbering, `·` joins | Sentence case; numbers only on the timeline, which is a real sequence | Removes template chrome |
| Decorative profile drawing | The hero graphic is his own thesis output (unit cell tiling) | Specific to him, can't belong to anyone else |

Boldness is spent in **one** place: the hero cut-path trace. Everything else is quiet.

## 4. Design tokens

Add to `tailwind.config.js` under `theme.extend` (replace `custom-dark-blue`, `custom-deep-ocean`).

### Color

| Token | Value | Usage |
|---|---|---|
| `paper` | `#E9ECEA` | Page background |
| `sheet` | `#F5F6F4` | Raised areas: figure backgrounds, hover row tint |
| `ink` | `#14202B` | Body text, headings, cut lines in drawings, focus ring (blued steel) |
| `ink-2` | `#4F5D68` | Secondary text: venues, dates, captions (≈5.9:1 on `paper`) |
| `rule` | `#BFC7CB` | Row dividers, figure borders |
| `steel` | `#A9B4BA` | Material in the hero tiling only |
| `spark` | `#E8480A` | **Graphics only**: laser path head, kerf glow in the hero. Never text, never buttons (≈3.3:1 on `paper`, passes the 3:1 bar for non-text graphics only) |

No gradients, no shadows, no tinted overlays.

### Type

Family: **Archivo** variable (axes `wght` 100–900, `wdth` 62–125), self-hosted via `@fontsource-variable/archivo` (import the width-axis CSS; check the package's export name, e.g. `wdth.css`, at install). Subsets: `latin`, `latin-ext` (needed for ü, ğ, İ, ş). Drop `@fontsource/manrope` and `@fontsource/frank-ruhl-libre` if no tool page still imports them.

| Token | Size / line-height | Weight | Width | Usage |
|---|---|---|---|---|
| `display` | `clamp(2.5rem, 6vw, 4.5rem)` / 1.02 | 560 | 118 | Hero statement only |
| `h2` | 2.125rem / 1.15 | 540 | 112 | Section titles |
| `h3` | 1.3125rem / 1.3 | 520 | 100 | Project and paper titles |
| `body` | 1.0625rem (17px) / 1.6 | 400 | 100 | Paragraphs, max 68ch |
| `small` | 0.875rem / 1.45 | 400 | 100 | Captions, footer |
| `data` | 0.9375rem / 1.4 | 450 | 75 | Years, venues, DOIs, figure numbers. `font-variant-numeric: tabular-nums` |

Letter-spacing: `-0.02em` on `display` and `h2`, `0` elsewhere. No all-caps anywhere. No italic or color accent on single headline words.

### Space and layout

- Base unit 4 px. Tokens: `space-2` 8, `space-3` 12, `space-4` 16, `space-6` 24, `space-8` 32, `space-12` 48, `space-16` 64, `space-24` 96.
- Container: `max-width: 1200px`, side padding `space-6` (mobile `space-4`).
- Grid: 12 columns, gap `space-6`. All text **left-aligned, ragged right**. No justified text (the current About uses `text-justify`; remove it).
- Section spacing: `space-24` desktop, `space-16` mobile. Sections are as tall as their content: no `min-h-screen`, no scroll-snap.
- Radius: `0` on figures and rows, `2px` on the one button-like element (CV link). Not a card system.

## 5. Information architecture

Single page `/` with anchored sections. Hidden tools stay routable by direct URL so old links keep working, but nothing links to them.

```
Header      Murat Güven ................ Research  Publications  About  Contact  CV
Hero        statement + one-line role      |  unit-cell tiling, traced once
Research    PhD: cutting process selection (current)  ── figure | text
            Topology optimization of microstructures  ── figure | text   (MSc → FEAD 2026 paper)
Publications  year | title, authors, venue | DOI          (list, not cards)
Teaching and talks  date | title, venue                   (same list component)
Recognition  2026 EWSHM Audience Prize, 2024 Switch2Product Top 25
About       short bio  |  timeline: 2016 BSc Kocaeli → 2020 MSc IZTECH → 2024 Research Fellow Polimi → 2024 PhD Polimi
Contact     email as text; LinkedIn, GitHub, Google Scholar, ResearchGate, ORCID as text links
Footer      © year Murat Güven
```

Routes after change:

| Route | Status |
|---|---|
| `/` | Redesigned single page |
| `/publications` | Remove (content moves into `/`), add redirect to `/#publications` |
| `/tools`, `/tools/*` | Keep, unlinked. Remove from nav, sitemap, README feature list |
| `/GUVEN_THESIS.pdf` | Keep as "MSc thesis (PDF)". **Not** the CV link |

## 6. Components

| Component | File | Props | Notes |
|---|---|---|---|
| `SiteHeader` | `src/components/SiteHeader.tsx` | none | Static (not fixed). Name links to `#top`. Nav is plain anchor links; wraps to a second line under 640 px. No hamburger: five links fit |
| `Hero` | `src/components/Hero.tsx` | none | 7 cols text, 5 cols `CutTiling`. Mobile: graphic above text, 60% height |
| `CutTiling` | `src/components/CutTiling.tsx` | `outline: string[]`, `voids: string[]` (from `src/content/auxeticCell.ts`) | Pure inline SVG. Geometry is the real nonlinear auxetic cell from the MSc thesis (Fig. 8.1b), vectorized by `scripts/vectorize-cell.py`. Material is a `steel` (`#A9B4BA`) background rect; the 4 voids per 100×100 period are filled `paper` on top and tiled by translating multiples of 100 (seamless, no seams between cells). The centre cell's **solid boundary** (`auxeticCellOutline`: 8 open runs that stop at the arm joints, plus the closed central hole) is drawn on top as 9 paths, each `pathLength="1"`, traced together. Caption: "Auxetic unit cell, nonlinear optimum. MSc thesis, Fig. 8.1" |
| `ResearchItem` | `src/components/ResearchItem.tsx` | `title, period, summary, figure?, links[]` | Two-column row: figure 5 cols, text 7 cols. Stacks on mobile. No figure → text takes full width (no empty box) |
| `DatedList` | `src/components/DatedList.tsx` | `items: {date, title, href?, detail}[]` | One component for publications, teaching and talks, and recognition. Rows sorted by date desc. Row: date (`data`), title (`h3`, linked when `href`), detail line (`data`, `ink-2`). For publications, `detail` holds authors with own name at weight 560, then venue |
| `Timeline` | `src/components/Timeline.tsx` | `items: {year, place, role}[]` | Real sequence, so year markers are earned |
| `ContactBlock` | inside `App.tsx` | none | `murat.guven@polimi.it` as visible text link. LinkedIn, GitHub, ResearchGate, ORCID as text links (icons optional, 16 px, `aria-hidden`) |

Content lives in typed data files, not in JSX:

- `src/content/publications.ts` — `Publication { title; authors: string[]; venue; year; doi?; pdf?; kind: 'journal' | 'conference' | 'thesis' }`
- `src/content/research.ts` — research items
- `src/content/timeline.ts`
- `src/content/activity.ts` — teaching, talks, recognition

Publications seed (from CV, Oct 2026):

| Year | Kind | Entry |
|---|---|---|
| 2026 | journal | M. Güven, İ. Özdemir. "Topology Optimization of Nonlinear Elastic Micro-structures by a Domain Reduction Technique." *Finite Elements in Analysis and Design* 260, 104599. doi:10.1016/j.finel.2026.104599 |
| forthcoming | book | A. Kanyilmaz, M. Güven. *Metals Driving Sustainable Construction.* Wiley. ISBN 9781394351657 |
| 2025 | conference | A. Kanyilmaz, M. Güven, B. Previtali. "Laser Cutting of Key Metals in the Construction Industry." Extended abstract, ESTAD 2025, Verona |
| 2023 | thesis | M. Güven. *Topology Optimization of Nonlinear Elastic Microstructures.* MSc thesis, İzmir Institute of Technology (PDF) |

"Forthcoming" sorts above the latest year.

Delete: `ParticleNetwork.tsx`, `AnimatedTextSection.tsx`, `MainContent.tsx` (replaced), `NavLink.tsx`, `BackToTopButton.tsx` (page is short now), `ScrollToTop.tsx` (empty file), `pages/PublicationsPage.tsx`, scroll-spy `IntersectionObserver` logic in `App.tsx`, scroll-snap CSS in `index.css`.

Remove dependencies once nothing imports them (grep first; tool pages may use some): `three`, `@react-three/fiber`, `@react-three/drei`, `react-type-animation`, `react-scroll-parallax`, `react-intersection-observer`, `@fontsource/manrope`, `@fontsource/frank-ruhl-libre`.

## 7. States and interactions

| Element | State | Behavior |
|---|---|---|
| Text links | Default | `ink`, underline 1px, offset 3px |
| Text links | Hover | Underline 2px. 120 ms, `ease-out`. No color change, no scale |
| Text links | Focus-visible | 2px `ink` outline, 3px offset, radius 2px |
| Nav link | Current section | None. No scroll spy; the page is short |
| Publication row | Hover | Background `sheet`. Whole row is not clickable; the title link is |
| CV link | Default | 1px `ink` border, 2px radius, padding 6×12. Opens the PDF in a new tab, label says "(PDF)" |
| External links | Any | `target="_blank" rel="noopener noreferrer"`, with "opens in new tab" in an `sr-only` span |

## 8. Motion

| Element | Trigger | Animation | Duration | Easing |
|---|---|---|---|---|
| `CutTiling` trace paths | First paint | `stroke-dashoffset` 1 → 0 on all 9 outline paths of the centre cell at once (`pathLength="1"`, `stroke-dasharray: 1`), stroked `spark`, settling to `ink` | 2200 ms, 400 ms delay | `cubic-bezier(.65,0,.35,1)` |
| `CutTiling` kerf glow | Trace end | `spark` stroke fades to `ink` | 400 ms | `ease-out` |
| Links | Hover | Underline thickness | 120 ms | `ease-out` |

That's all. No section fade-ins, no card lifts, no typewriter, no particles. `prefers-reduced-motion: reduce` renders the finished state with no animation.

## 9. Responsive

| Breakpoint | Changes |
|---|---|
| ≥ 1024 px | Layout as specified, 12 columns |
| 640–1023 px | Hero 6/6 split; research rows keep figure left, 5/7 |
| < 640 px | One column. Graphic above hero text. Nav wraps under the name. Publication year sits above the title instead of in a left column |

Test at 375, 768, 1280, 1600.

## 10. Content rules and edge cases

- **Voice:** first person, plain verbs, specific nouns. Hero draft: *"I build computational tools that help engineers decide how steel structures are designed and cut."* Sub-line: *"PhD candidate at Politecnico di Milano, working on BIM-integrated decision support for laser and plasma cutting in steel construction."* Murat should edit it into his own words.
- **Banned copy:** "Welcome", "exploring the frontiers", "passionate", "cutting-edge", "feel free to reach out", and identical one-liners repeated across items.
- **Empty list:** `DatedList` with no items renders nothing, heading included. Never placeholder rows.
- **Long titles:** wrap, never truncate. Author lists over 6 names: first 3, "…", own name, last author.
- **Missing figure:** text spans full width.
- **Turkish characters:** must render in Archivo with `latin-ext` (check "Güven", "İzmir", "Özdemir").
- **Slow connection:** fonts use `font-display: swap`. Hero SVG is inline, so no layout shift. Thesis figures are WebP with explicit `width`/`height`, `loading="lazy"` below the fold.
- **Footer:** remove "Last updated: {today}" (it always shows today's date, which is wrong).

## 11. Accessibility

- Focus order: skip link → name → nav → CV → hero → sections in DOM order.
- First focusable element is a skip link: "Skip to content" → `#main`.
- Landmarks: `header`, `nav aria-label="Sections"`, `main#main`, `footer`. One `h1` (hero statement), `h2` per section.
- `CutTiling`: `role="img"` with `<title>` "Optimized unit cell tiled across a sheet, traced by a laser cut path".
- Figures: `<figure>` + `<figcaption>` with figure source, e.g. "Optimized unit cell, MSc thesis, Fig. 4.2".
- Contrast: body `ink` on `paper` ≥ 12:1; `ink-2` ≥ 5.9:1. `spark` is never used for text.
- `<html lang="en">`. Proper names keep their Turkish spelling.

## 12. Implementation notes

- Tailwind tokens in `tailwind.config.js`; font width via utility classes such as `.wdth-118 { font-variation-settings: "wdth" 118; }` in `index.css` (3–4 classes, no plugin).
- Keep CRA; no framework migration in this pass.
- Update `public/index.html`: title "Murat Güven — laser cutting and optimization for steel construction", meta description, OG image (a static render of the hero tiling). Update `sitemap.xml` to only `/`.
- Update README to drop the tool feature list.

## 13. Verification

- `npm run build` passes, and `npm test` keeps the existing `mapLabelUtils` test green.
- One new test: `DatedList` sorts "forthcoming" first, then by date descending, and renders nothing for an empty list.
- Keyboard walk-through of the whole page; reduced-motion check; screenshots at 375 and 1280 compared against this spec.
- Lighthouse: accessibility ≥ 95, performance ≥ 90 (should improve once three.js and the particles are gone).

## 14. Open items — needed from Murat before launch

1. ~~Publication list~~: done, from the CV. Add the FEAD paper to ORCID too; it currently shows no public works.
2. CV PDF received. Before it goes in `public/`: decide whether the phone number stays in the public copy.
3. ~~Google Scholar~~: https://scholar.google.com/citations?user=Jt-dDrcAAAAJ
4. One PhD figure you're allowed to show, and one from the FEAD paper (check Elsevier reuse terms, or use your own thesis figure).
5. ~~Unit cell~~: vectorized from thesis Fig. 8.1(b). If the original AutoCAD DXF still exists, rerun from it for exact geometry.
6. Photo in About: deferred. Layout must work without one; add later as a 4:5 image left of the bio, no rounded crop.

# Website redesign — design + handoff spec (v2)

Date: 2026-10-20. Owner: Murat Güven. Stack: React 19 + TypeScript + Tailwind 3 (CRA), GitHub Pages.

v2 replaces the cut-path / auxetic-tiling hero. Reasons: it leaned on the MSc while the PhD is the current work, it implied the MSc cell was laser-cut, and its figure caption read like a citation for something that isn't a publication.

## 1. Brief

- **Who it's for:** academic hiring committees and collaborators *and* industry R&D, equally. Both need: what does he work on, what has he produced, how do I reach him.
- **Focus of the site:** AI, optimization and construction. Laser/plasma cutting is one application inside that, not the identity.
- **Goal:** a small, curated research exhibition that also works as a professional profile. Specific to him, not a template.
- **Constraints:** light theme. CUTT-IA, WorldMap and Gauge hidden from the public site. Static hosting on GitHub Pages.
- **Success:** a stranger can say what Murat works on after 10 seconds; zero placeholder content ships; Lighthouse accessibility ≥ 95; works at 375 px.

## 2. Content sources

Real material only, from the CV (Oct 2026) and his repos:

- **Profile:** computational and AI-based decision support for structural engineering and sustainable construction.
- **PhD (Nov 2024 – present):** Politecnico di Milano, ABC. BIM-integrated decision support for laser and plasma cutting process selection in steel construction. PNRR-funded. Advisor: Assoc. Prof. Alper Kanyilmaz.
- **Research Fellow (Mar – Nov 2024):** Politecnico di Milano, DABC. Structural design and fabrication for steel: laser cutting, metal 3D printing, environmental impact.
- **MSc (2020 – 2023):** İzmir Institute of Technology. Topology optimization of nonlinear elastic microstructures; led to the 2026 *FEAD* paper.
- **BSc (2016 – 2020):** Kocaeli University, Civil Engineering.
- **AI work:** EWSHM 2026 challenge (unsupervised anomaly detection on bridge monitoring data, Audience Prize), concApp (cost and embodied-carbon optimization app, Switch2Product 2024 Top 25), AI trainings and talks for AEC.
- **Publications, teaching, talks:** §7 seed tables.

## 3. Direction

Kept from v1: light theme, Archivo with its width axis, one hot accent used only for "active" geometry, no template chrome (no all-caps eyebrows, no `01/02` numbering unless the content is a sequence, no `·` meta strings, no mono labels).

Adopted from the external review:
- Identity first. Name and current focus are the first thing read, on every screen size.
- Stronger hierarchy between sections through type scale and spacing, not color bands.
- No dedicated PhD section (Murat's call): the PhD lives in the hero sub-line and the timeline.
- One memorable interactive moment, tied to real computation, with a reduced-motion fallback.

Rejected:
- Name-as-giant-wordmark hero and Awwwards-style motion (trend defaults, not specific to him).
- Scroll-driven sequences over invented schematics.
- ui-ux-pro-max's generic output (motion-heavy, parallax, masonry, blue CTA). Its accessibility checklist is kept.

**The memorable thing:** a live, plain linear-elastic unit-cell topology optimization running in the visitor's browser (§6). It is real computation, shows optimization at a glance, and is the kind of tool he builds. Everything else on the page stays quiet.

## 4. Design tokens

Add to `tailwind.config.js` under `theme.extend` (replace `custom-dark-blue`, `custom-deep-ocean`).

| Token | Value | Usage |
|---|---|---|
| `canvas` | `#F6F7F5` | Page background |
| `ink` | `#172027` | Text, headings, solid material in the live cell, focus ring |
| `ink-2` | `#4F5D68` | Secondary text (≈ 6:1 on `canvas`) |
| `steel` | `#819199` | Intermediate densities in the live cell, chart marks. Never text |
| `rule` | `#CBD2D5` | Row dividers, figure borders |
| `laser` | `#F05A24` | Graphics only: the "selected" or "active" mark. Never text, never buttons |

No gradients, no shadows.

**Type:** Archivo variable (`wght` 100–900, `wdth` 62–125), self-hosted via `@fontsource-variable/archivo` (width-axis CSS; check the export name at install), subsets `latin` and `latin-ext`.

| Token | Size / line-height | Weight | Width | Usage |
|---|---|---|---|---|
| `display` | `clamp(2.25rem, 5.5vw, 4.25rem)` / 1.03 | 560 | 118 | Hero statement |
| `name` | 1.125rem / 1.2 | 600 | 112 | Name in header |
| `h2` | `clamp(1.75rem, 3vw, 2.5rem)` / 1.12 | 540 | 112 | Section titles |
| `h3` | 1.3125rem / 1.3 | 520 | 100 | Project and paper titles |
| `body` | 1.0625rem / 1.6 | 400 | 100 | Paragraphs, max 68ch |
| `small` | 0.875rem / 1.45 | 400 | 100 | Captions, footer |
| `data` | 0.9375rem / 1.4 | 450 | 75 | Dates, venues, solver readouts. `tabular-nums` |

Letter-spacing `-0.02em` on `display` and `h2`. No all caps. No single-word color or italic accents in headlines.

**Space:** 4 px base (`2`=8, `3`=12, `4`=16, `6`=24, `8`=32, `12`=48, `16`=64, `24`=96, `32`=128). Container 1200 px, gutters 24 (16 on mobile). 12-column grid, left-aligned ragged-right text. Sections are content-height (no `min-h-screen`, no scroll-snap). Section spacing 128 desktop, 64 mobile. Radius 0, except 2 px on the CV link and the objective buttons.

## 5. Page structure

Single page `/`. Old routes: `/publications` redirects to `/#publications`; `/tools/*` stays reachable by URL but is unlinked (remove from nav, sitemap, README).

```
Header      Murat Güven                       Work  Publications  About  Contact  CV (PDF)
Hero        statement + sub-line (7 cols)  |  live unit cell + 3×3 tiling (5 cols)
            objective buttons + live readout under the cell
Selected work  three rows, not cards: FEAD 2026 paper (microstructure optimization), EWSHM bridge anomaly detection, concApp
Publications  date | title, authors, venue | DOI
Teaching and talks  date | title, venue
About       short bio | timeline (2016 BSc → 2020 MSc → 2024 Fellow → 2024 PhD)
Contact     email as text; LinkedIn, GitHub, Google Scholar, ResearchGate, ORCID as text links
Footer      © year Murat Güven
```

Mobile (< 640 px): header, then hero text, **then** the live cell (smaller, 3×3 tiling only), then the sections. Identity is always read before the visualization.

## 6. Hero: live unit-cell optimization

### What it computes (plain, standard, nothing from unpublished work)

- 2D periodic unit cell, square, linear elastic, plane stress, E = 1, ν = 0.3, E_min = 1e-9.
- Q4 elements, fixed square mesh: 40×40 on desktop, 28×28 on mobile or when `navigator.hardwareConcurrency <= 4`.
- Periodic boundary conditions by node-index aliasing (opposite edges share DOFs), with one node pinned to remove rigid-body motion.
- Energy-based homogenization with 3 unit-strain cases (11, 22, 12), in the style of Xia & Breitkopf (2015). The stiffness matrix is factored once per iteration and reused for all 3 right-hand sides.
- SIMP (p = 3), density filter with radius 1.5 elements, OC update (move 0.2), volume fraction 0.35. Up to 120 iterations, or stop when the change is below 0.01.
- Objectives (buttons): **Stiff** (maximize E₁₁ + E₂₂), **Shear** (maximize E₃₃), **Bulk** (maximize Σ Eᵢⱼ for i, j ∈ {1, 2}). **Auxetic** (negative Poisson's ratio) needs MMA and is phase 2.
- Initial design: uniform density plus a small centered void, so the result is deterministic and doesn't depend on a random seed.

### Implementation

| Piece | File | Notes |
|---|---|---|
| Solver | `src/lab/unitcell.ts` | Pure functions, no DOM. Precomputed element stiffness, banded or skyline Cholesky, filter weights built once. ~400 lines |
| Worker | `src/lab/unitcell.worker.ts` | Runs the solver, posts `{iter, rho: Float32Array, C: [c11, c12, c22, c33], volume}` every iteration. Accepts `start(objective)` and `stop` |
| View | `src/components/LiveCell.tsx` | Canvas 2D. Draws the cell large and a 3×3 tiling. Density maps `canvas` → `steel` → `ink`. Readout in `data` type: iteration, E₁₁, E₂₂, ν₁₂, G₁₂ |

CRA 5 supports `new Worker(new URL('./unitcell.worker.ts', import.meta.url))`; check this on the first build.

### Behavior

| Trigger | Result |
|---|---|
| Page load, motion allowed, hero visible | Starts **Stiff** automatically after 600 ms |
| Objective button | Restarts from the initial design with that objective. Active button: `ink` fill, `canvas` text |
| Hero scrolled out of view, or tab hidden | Worker pauses (IntersectionObserver plus `visibilitychange`) |
| Converged | Shows the final layout; readout says "converged at iteration N" |
| `prefers-reduced-motion` | No autostart. Shows a precomputed final Stiff layout (shipped as a 40×40 `Uint8Array`) with a "Run optimization" button |
| Worker unsupported or failure | Static precomputed layout, no buttons, no error text |

Caption under the cell (`small`, `ink-2`): "Topology optimization of a periodic unit cell, running live in your browser." No figure numbers and no thesis references.

### Verification

- `unitcell.test.ts` checks two things. A solid cell (ρ = 1) gives the analytic plane-stress values: C₁₁ = E/(1−ν²), C₁₂ = νC₁₁, C₃₃ = E/(2(1+ν)), within 1e-6. A 50% checkerboard-free result after 120 iterations is symmetric under 90° rotation for the Bulk objective.
- Performance budget: under 40 ms per iteration at 40×40 on a mid-range laptop. Measure in the worker and log it in development builds.

## 7. Other sections and components

| Component | Notes |
|---|---|
| `SiteHeader` | Static, not fixed. Plain anchor links that wrap under 640 px. No hamburger |
| `WorkRow` | Used for Selected work. Text 7 cols, optional figure 5 cols, stacks on mobile. No figure means text spans full width |
| `DatedList` | One component for publications, teaching and talks, recognition. Rows sorted by date descending, with "forthcoming" first. Row: date (`data`), title (`h3`, linked when there's a URL), detail line (`data`, `ink-2`). Own name at weight 560 in author lists. An empty list renders nothing |
| `Timeline` | Real sequence, so year markers are allowed |

Content lives in typed data files under `src/content/`: `publications.ts`, `activity.ts`, `research.ts`, `timeline.ts`.

Publications seed:

| Year | Kind | Entry |
|---|---|---|
| 2026 | journal | M. Güven, İ. Özdemir. "Topology Optimization of Nonlinear Elastic Micro-structures by a Domain Reduction Technique." *Finite Elements in Analysis and Design* 260, 104599. doi:10.1016/j.finel.2026.104599 |
| forthcoming | book | A. Kanyilmaz, M. Güven. *Metals Driving Sustainable Construction.* Wiley. ISBN 9781394351657 |
| 2025 | conference | A. Kanyilmaz, M. Güven, B. Previtali. "Laser Cutting of Key Metals in the Construction Industry." Extended abstract, ESTAD 2025, Verona |
| 2023 | thesis | M. Güven. *Topology Optimization of Nonlinear Elastic Microstructures.* MSc thesis, İzmir Institute of Technology (PDF) |

Delete: `ParticleNetwork.tsx`, `AnimatedTextSection.tsx`, `MainContent.tsx`, `NavLink.tsx`, `BackToTopButton.tsx`, `ScrollToTop.tsx` (empty), `pages/PublicationsPage.tsx`, the scroll-spy logic in `App.tsx`, the scroll-snap CSS, and v1's `scripts/vectorize-cell.py` and `src/content/auxeticCell.ts`.

Remove these dependencies once nothing imports them (grep first, since tool pages may use some): `three`, `@react-three/fiber`, `@react-three/drei`, `react-type-animation`, `react-scroll-parallax`, `react-intersection-observer`, `@fontsource/manrope`, `@fontsource/frank-ruhl-libre`.

## 8. States, motion, responsive

| Element | State | Behavior |
|---|---|---|
| Text links | Hover | Underline from 1 px to 2 px, 120 ms ease-out |
| Focusable | Focus-visible | 2 px `ink` outline, 3 px offset |
| Objective buttons | Default / active | 1 px `ink` border / `ink` fill. Minimum 44×44 px touch target |
| Publication row | Hover | Background `#EEF0EE`; the title is the link, not the row |

Motion is limited to the live optimization and link underlines: no section fade-ins, card lifts, parallax or typewriter.

Breakpoints: ≥ 1024 px uses 12 columns as specified. 640–1023 px uses a 6/6 hero. < 640 px is one column, ordered as in §5. Test at 375, 768, 1280 and 1600 px.

## 9. Content rules and edge cases

- **Voice:** first person, plain verbs, specific nouns. Hero (chosen, methods-first): *"I develop AI and optimization methods for structural engineering and steel construction."* Sub-line draft: *"PhD candidate at Politecnico di Milano. My current work is decision support for choosing how steel parts are cut, built on BIM models."*
- **Banned:** "Welcome", "exploring the frontiers", "passionate", "cutting-edge", "feel free to reach out", and repeated one-liners.
- **References:** cite only real publications. Figures get plain descriptive captions, never "Fig. X" pointers into a thesis.
- **Long titles:** wrap, never truncate. For author lists over 6 names: first 3, "…", own name, last author.
- **Turkish characters:** check that Archivo with `latin-ext` renders Güven, İzmir and Özdemir.
- **Footer:** remove "Last updated: {today}".
- **CV:** `public/Murat_Guven_CV.pdf` has the phone number redacted, so the gap stays in the layout. Replace it with a recompiled PDF that has no phone line when available.

## 10. Accessibility

- A skip link to `#main`. Landmarks: `header`, `nav aria-label="Sections"`, `main`, `footer`. One `h1`.
- Live cell: the canvas is `role="img"` with an `aria-label` that updates on convergence ("Optimized unit cell for maximum stiffness, converged at iteration 74"). The readout is plain text, not `aria-live`, to avoid noise every iteration. Buttons are `aria-pressed`.
- Contrast: `ink` on `canvas` is about 15:1, `ink-2` about 6:1. `laser` and `steel` are never used for text.
- Keyboard: all controls reachable; focus order follows the DOM.

## 11. Verification

- `npm run build` passes; existing `mapLabelUtils` test stays green; `unitcell.test.ts` (§6) and a `DatedList` ordering test pass.
- Keyboard walk-through, reduced-motion check, screenshots at 375 and 1280.
- Lighthouse: accessibility ≥ 95, performance ≥ 90.

## 12. Open items

1. ~~Hero statement~~: methods-first line chosen. Sub-line still a draft for Murat to edit.
2. Public projects confirmed: **EWSHM anomaly detection** and **concApp** only (others stay off the site). Rows, from the CV:
   - *Bridge health indicators from monitoring data* (2026, team). Unsupervised anomaly detection: an attention-based multi-modal autoencoder with a statistical baseline, deriving health indicators from long-term bridge monitoring data. Audience Prize, EWSHM 2026 Students & Young Professionals Challenge, Toulouse.
   - *concApp* (2024, team). Early-stage structural design app for cost and embodied-carbon optimization. Top 25, Switch2Product 2024 ClimateTech & Circular Economy.
   Still needed: whether either has a public link (repo, demo, report), and Murat's role in one phrase each.
4. Recompiled CV without the phone line (optional).
5. Photo in About: deferred; the layout works without one.
6. Phase 2: Auxetic objective (MMA) and drag-to-change load cases.

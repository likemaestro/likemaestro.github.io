# Website redesign — design + handoff spec (v2)

Date: 2026-10-20. Owner: Murat Güven. Stack: React 19 + TypeScript + Tailwind 3 (CRA), GitHub Pages. CRA is deprecated upstream but works; no migration in this redesign.

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
- The PhD is stated, not explained: one short row at the top of Work, in Murat's words. No question/method/outputs breakdown, no diagram, no special band.
- One memorable interactive moment, tied to real computation, with a reduced-motion fallback.

Rejected:
- Name-as-giant-wordmark hero and Awwwards-style motion (trend defaults, not specific to him).
- Scroll-driven sequences over invented schematics.
- ui-ux-pro-max's generic output (motion-heavy, parallax, masonry, blue CTA). Its accessibility checklist is kept.

**The memorable thing:** an interactive, simplified unit-cell topology optimization (§6). It shows a precomputed result by default and runs live in the browser on request. It is real computation, labelled as a teaching example, not his PhD model or published method. Everything else on the page stays quiet.

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

Single page `/`. Old routes: `/publications` becomes `<Navigate to="/#publications" replace />`. `/tools/*` stays reachable by URL but is unlinked (remove from nav, sitemap, README).

**GitHub Pages deep links.** The app uses `BrowserRouter` and Pages has no SPA fallback, so a direct load or refresh of `/tools/WorldMap` returns 404 today. Fix: add `"postbuild": "node -e \"require('fs').copyFileSync('build/index.html','build/404.html')\""` to `package.json` scripts. Pages serves `404.html` for unknown paths, and React Router then renders the route. The HTTP status stays 404, which is acceptable for unlisted tools.

```
Header      Murat Güven                       Work  Publications  About  Contact  CV (PDF)
Hero        statement + sub-line (7 cols)  |  live unit cell + 3×3 tiling (5 cols)
            objective buttons + live readout under the cell
Work        rows, not cards: 1) Current: PhD (1–2 sentences)  2) FEAD 2026 paper (microstructure optimization)  3) EWSHM bridge anomaly detection  4) concApp
Publications  date | title, authors, venue | DOI
Teaching and talks  date | title, venue
About       short bio | timeline (2016 BSc → 2020 MSc → 2024 Fellow → 2024 PhD)
Contact     email as text; LinkedIn, GitHub, Google Scholar, ResearchGate, ORCID as text links
Footer      © year Murat Güven
```

Mobile (< 640 px): header, then hero text, **then** the live cell (smaller, 3×3 tiling only), then the sections. Identity is always read before the visualization.

## 6. Hero: interactive unit-cell example

### Framing

This is a **simplified teaching example** from the computational-mechanics side of Murat's work. It is not his PhD model, and it does not reproduce the FEAD paper, which uses nonlinear elasticity, plane strain, MMA and domain reduction. The demo is linear elastic, plane stress and OC-based. The caption says so. The hero sub-line and the "Current" Work row keep the PhD visible on their own.

Caption under the cell (`small`, `ink-2`): "A simplified example of unit-cell topology optimization (linear elastic, plane stress). It is not the model from my publications." No figure numbers and no thesis references.

### Formulation (plain, standard, nothing from unpublished work)

- **Domain.** Square periodic unit cell Y. Q4 bilinear elements, 2×2 Gauss. Plane stress, E = 1, ν = 0.3, E_min = 1e-9. SIMP: E(ρ̃) = E_min + ρ̃³(1 − E_min).
- **Voigt convention.** Order [11, 22, 12], engineering shear γ₁₂ = 2ε₁₂. The homogenized stiffness Cᴴ is 3×3 and symmetric: σ̄ = Cᴴ ε̄.
- **Periodicity.** u = ε̄·x + ũ, where only the **fluctuation** ũ is periodic. Opposite boundary nodes share their ũ DOFs (index aliasing), and one node has ũ = 0 to remove rigid-body translation. The macroscopic strain ε̄ is imposed through the element load vectors, not through boundary values.
- **Homogenization.** Energy-based (Andreassen & Andreasen 2014; Xia & Breitkopf 2015). Three test strains: ε̄⁽¹⁾ = [1,0,0], ε̄⁽²⁾ = [0,1,0], ε̄⁽³⁾ = [0,0,1] (γ = 1). Cᴴᵢⱼ = (1/|Y|) Σₑ (χ⁰ⁱ − χⁱ)ₑᵀ kₑ(ρ̃) (χ⁰ʲ − χʲ)ₑ. One factorization (or one preconditioner) per iteration serves all three right-hand sides.
- **Objectives** (all maximized):

  | Button | Objective | Meaning |
  |---|---|---|
  | Axial | C₁₁ᴴ + C₂₂ᴴ | Sum of the two axial stiffness entries |
  | Shear | C₃₃ᴴ | Shear stiffness entry under the convention above |
  | Bulk | C₁₁ᴴ + C₂₂ᴴ + 2C₁₂ᴴ | Equibiaxial stiffness, the energy under ε̄ = [1,1,0]. For square-symmetric cells it equals 4κ, where κ is the 2D bulk modulus. The readout labels it "equibiaxial stiffness", not κ |

  Each objective is a non-negative energy, so every sensitivity has the same sign and OC is valid. NPR/auxetic objectives have mixed-sign sensitivities, need MMA, and are phase 2.
- **Symmetry.** All three objectives are invariant under the square's symmetry group D4, so D4 symmetry is **enforced** rather than hoped for: after filtering, each element's sensitivity is averaged over its 8 group images. Initial design: uniform ρ equal to the volume fraction, plus a centered circular void of radius 0.15·L. That makes runs deterministic, D4-symmetric and seed-free.
- **Update.** Density filter r = 1.5 elements. OC with move 0.2. Volume fraction 0.4 as an equality, found by bisection on the multiplier. Stop at 120 iterations or when max |Δρ| < 0.01.
- **Effective properties in the readout.** The Cᴴ entries, plus E₁ = 1/S₁₁ and ν₁₂ = −S₁₂/S₁₁, where S = (Cᴴ)⁻¹. These hold for general in-plane anisotropy; with D4 symmetry, E₁ = E₂ and ν₁₂ = ν₂₁.

### Behavior: precomputed by default, live on request

| State | What shows | Controls |
|---|---|---|
| Initial (every visitor, any motion setting) | Precomputed final result for **Axial**. Status: "Precomputed result" | Objective buttons, **Run live** |
| Objective selected while idle | That objective's precomputed result, instantly | Same |
| Running | Density updates each iteration. Status: "Computing in your browser, iteration N" | **Pause**, **Reset**, objective buttons |
| Paused | Frozen at iteration N | **Resume**, **Reset** |
| Objective selected while running | The run is cancelled and that objective's precomputed result shows | Run live |
| Converged | Final layout. Status: "Converged at iteration N, computed live" | Run live, objective buttons |
| Hero out of view or tab hidden while running | The worker pauses itself and resumes when the hero is visible again | — |
| Worker unsupported or error | Precomputed result; **Run live** is hidden | Objective buttons |

Nothing moves until the visitor presses Run live, and Pause is available during every run (WCAG 2.2.2). The precomputed results come from the same TypeScript solver run once in Node (`scripts/precompute-cells.mjs`): 3 × n×n `Uint8Array`, about 5 KB, in `src/lab/precomputed.ts`.

### Implementation

| Piece | File | Notes |
|---|---|---|
| Solver | `src/lab/unitcell.ts` | Pure functions, no DOM. Precomputes kₑ, filter weights and D4 index maps. Linear solver chosen by benchmark (below) |
| Worker | `src/lab/unitcell.worker.ts` | Messages in: `run(objective, n)`, `pause`, `resume`, `cancel`. Out, each iteration: `{iter, rho: Float32Array, CH: [c11, c12, c22, c33], objective, volume, ms}` |
| View | `src/components/LiveCell.tsx` | Canvas 2D: the cell plus a 3×3 tiling. Density maps `canvas` → `steel` → `ink`. Readout in `data` type |

**Solver and mesh size are decided by measurement, not assumed.** Periodic aliasing couples opposite edges, so plain banded storage does not stay narrow. Two candidates:
- (a) sparse Cholesky with RCM ordering, refactored each iteration;
- (b) Jacobi-preconditioned CG, warm-started from the previous iteration's χ.

Benchmark both at n = 24, 32 and 40, on Murat's laptop and on one mid-range phone, and record the median ms per iteration here. Choose the largest n for which a full run takes ≤ 6 s on desktop, and a separate n for phones. 40 is a target, not a promise.

CRA 5 supports `new Worker(new URL('./unitcell.worker.ts', import.meta.url))`; confirm this on the first build.

### Validation (`src/lab/unitcell.test.ts` unless noted)

1. **Analytic.** For a solid cell, Cᴴ equals the plane-stress tensor: C₁₁ = C₂₂ = E/(1−ν²), C₁₂ = νC₁₁, C₃₃ = E/(2(1+ν)), within 1e-9.
2. **Reference implementation.** `scripts/reference_homogenize.py` is an independent NumPy implementation following Andreassen & Andreasen (2014). On two fixed density fields (a centered square void, and a cross), the TypeScript and Python Cᴴ agree within 1e-8. The fields and the Python output are committed as a JSON fixture.
3. **Sensitivities.** For each objective, the analytic gradient matches central finite differences (h = 1e-6) on 6 elements of a random field, with relative error < 1e-5.
4. **Periodicity and volume.** Paired boundary nodes carry equal ũ. After each OC update, the volume is within 1e-6 of the target.
5. **Symmetry and determinism.** For each objective, the result is D4-symmetric to 1e-12, and two runs give bit-identical densities.
6. **Performance** (manual, recorded in this spec): the benchmark above.

## 7. Other sections and components

| Component | Notes |
|---|---|
| `SiteHeader` | Static, not fixed. Plain anchor links that wrap under 640 px. No hamburger |
| `WorkRow` | Used for Work. The first row is marked "Current" in `data` type. Text 7 cols, optional figure 5 cols, stacks on mobile. No figure means text spans full width |
| `DatedList` | One component for Publications and Teaching and talks (awards sit in the Work rows). Rows sorted by date descending, with "forthcoming" first. Row: date (`data`), title (`h3`, linked when there's a URL), detail line (`data`, `ink-2`). Own name at weight 560 in author lists. An empty list renders nothing |
| `Timeline` | Real sequence, so year markers are allowed |

Content lives in typed data files under `src/content/`: `publications.ts`, `activity.ts`, `work.ts`, `timeline.ts`.

Publications seed:

| Year | Kind | Entry |
|---|---|---|
| 2026 | journal | M. Güven, İ. Özdemir. "Topology Optimization of Nonlinear Elastic Micro-structures by a Domain Reduction Technique." *Finite Elements in Analysis and Design* 260, 104599. doi:10.1016/j.finel.2026.104599 |
| forthcoming (2027) | book | A. Kanyilmaz, M. Güven. *Metals Driving Sustainable Construction.* Wiley, hardcover, listed for 2027-07-07. ISBN 9781394351657, linked to https://isbnsearch.org/isbn/9781394351657 |
| 2025 | conference | A. Kanyilmaz, M. Güven, B. Previtali. "Laser Cutting of Key Metals in the Construction Industry." Extended abstract, ESTAD 2025, Verona |
| 2023 | thesis | M. Güven. *Topology Optimization of Nonlinear Elastic Microstructures.* MSc thesis, İzmir Institute of Technology (PDF) |

Teaching and talks seed (`activity.ts`, from the CV; organizational-support entries left out):

| Date | Entry |
|---|---|
| 2025-11-26 | Speaker. "Digital Innovation of Construction: How can digital innovation make construction processes more efficient?" PropTech Day 2025, Politecnico di Milano |
| 2025-11-12 | Guest lecturer. "AI Workshop", Life Cycle Driven Design, Sustainable Architecture and Landscape Design, Politecnico di Milano (Piacenza) |
| 2025-10-13 | Co-instructor. "AI for Architecture", MaBa.DESIGN, Politecnico di Milano |
| 2025-09-21 | Speaker. "ChatGPT as an Engineering Assistant", Festival Internazionale dell'Ingegneria, Politecnico di Milano |
| 2024-11 – 2025-01 | Teaching assistant. "Life-Cycle Driven Structures: from Concept to Construction", Politecnico di Milano |
| 2024-08-08 | Co-instructor. Executive AI strategy training, Braun Engineering Group, Munich |
| A.Y. 2024–25 | MSc thesis co-supervision. "Sensitivity Analysis in Steel Cutting Method Selection for the Construction Industry", Politecnico di Milano (two more ongoing) |

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
- Live cell: the canvas is `role="img"` with an `aria-label` describing what is shown ("Precomputed unit cell optimized for axial stiffness", or "…converged at iteration 74"). The per-iteration readout is not `aria-live`. Only status changes (started, paused, converged) are announced, through a polite live region. Objective buttons use `aria-pressed`. Nothing animates without a user action, and Pause is available during runs (WCAG 2.2.2).
- Contrast: `ink` on `canvas` is about 15:1, `ink-2` about 6:1. `laser` and `steel` are never used for text.
- Keyboard: all controls reachable; focus order follows the DOM.

## 11. Verification

- `npm run build` passes; the existing `mapLabelUtils` test stays green; the §6 validation suite and a `DatedList` ordering test pass.
- On the deployed site, `/tools/WorldMap` and `/publications` load after a hard refresh.
- Keyboard walk-through, reduced-motion check, screenshots at 375 and 1280.
- Lighthouse: accessibility ≥ 95, performance ≥ 90.

## 12. Open items

1. ~~Hero statement~~: methods-first line chosen. Sub-line still a draft for Murat to edit.
2. Current-work row, in Murat's words. Draft until then: *"PhD, Politecnico di Milano (2024 – present). Decision support for choosing between laser, plasma and conventional cutting for steel parts, integrated with BIM models. PNRR-funded; advisor Assoc. Prof. Alper Kanyilmaz."*
3. Public projects confirmed: **EWSHM anomaly detection** and **concApp** only (others stay off the site). Rows, from the CV:
   - *Bridge health indicators from monitoring data* (2026, team). Unsupervised anomaly detection: an attention-based multi-modal autoencoder with a statistical baseline, deriving health indicators from long-term bridge monitoring data. Audience Prize, EWSHM 2026 Students & Young Professionals Challenge, Toulouse.
   - *concApp* (2024, team). Early-stage structural design app for cost and embodied-carbon optimization. Top 25, Switch2Product 2024 ClimateTech & Circular Economy.
   Still needed: whether either has a public link (repo, demo, report), and Murat's role in one phrase each.
4. Recompiled CV without the phone line (optional).
5. Benchmark numbers (§6), recorded here before the mesh size is fixed.
6. Photo in About: deferred; the layout works without one.
7. Phase 2: Auxetic objective (MMA) and drag-to-change load cases.

# Website redesign: design and handoff spec (v3, "live lab")

Dated 2026-10-21; v2 was 2026-10-20.
- **Owner:** Murat Güven.
- **Stack:** React 19, TypeScript 4.9 and Tailwind 3.4 on CRA 5, deployed to GitHub Pages.

**Why v3 replaces v2.** v2 had a hero that ran only on request, plus a quiet "Current" row. Murat then asked for a site that feels like R&D and academic work, and abstract: AI, optimization and microstructures. It should not explain his PhD step by step or teach laser cutting. v3 therefore makes three changes:
- the hero optimizer **starts by itself** on desktop;
- an **auxetic target** ships at launch;
- the PhD gets a **silent scroll render** beside one paragraph.

The `design/` boards (D0–D3) are archived.

## 1. Brief

- **Audience:** academic committees, collaborators and industry R&D, in equal measure. All three want to know what he works on, what he has produced, and how to reach him.
- **Focus:** AI, optimization and construction. Laser and plasma cutting are an application, not the identity.
- **Feel:** a working lab. Real computation runs on the page, and everything around it stays calm and editorial.
- **Constraints:**
  - light theme;
  - CUTT-IA, WorldMap and Gauge stay off the public site, reachable by URL only;
  - static hosting.
- **PhD disclosure:** method only. No case, partner or machine names, and no numbers.

## 2. Content sources

All content is real, taken from the CV (October 2026) and his repositories. It lives in `src/content/site.ts`:
- publications;
- teaching and talks;
- timeline;
- links;
- the PhD paragraph.

The remaining copy is in `src/components/Home.tsx`. Titles keep their published casing.

| Item | Source / status |
|---|---|
| FEAD 2026 paper, ESTAD 2025 abstract, Wiley book (forthcoming), MSc thesis | CV, DOI / ISBN verified |
| Talks and teaching, 2024–25 | CV; organizational-support entries left out |
| EWSHM 2026 and concApp | Shown as team projects. No images until the team consents. No awards until a public source exists |
| Profiles | Email, LinkedIn, GitHub, ResearchGate, ORCID and Google Scholar, as listed in the CV |
| CV PDF | `public/Murat_Guven_CV.pdf`, redacted. The text layer and links were checked: no phone number |

## 3. Direction

- One memorable thing: the live unit cell in the hero. It is real computation and labelled honestly.
- One cinematic thing: the dark PhD band. It is silent, driven by scroll, and captioned "Illustrative render".
- Everything else is quiet. Rows are not cards, and type and spacing carry the hierarchy.
- Avoid template chrome:
  - no all-caps eyebrows;
  - no `01/02` numbering;
  - no `·` meta strings;
  - no mono labels.

## 4. Design tokens (`tailwind.config.js`, `src/index.css`)

| Token | Value | Use |
|---|---|---|
| `canvas` | `#F6F7F5` | Page background |
| `ink` | `#172027` | Text, solid material, focus ring |
| `ink-2` | `#4F5D68` | Secondary text (about 6:1 on canvas) |
| `steel` | `#819199` | Intermediate density. Never text |
| `rule` | `#CBD2D5` | Dividers, figure borders |
| `laser` | `#F05A24` | The active mark only: the unit-cell outline, the live sparkline point, the end-cut trace. Never text |
| `bay` | `#121A1F` | PhD band background; equals the render's background |

- **Type:** Archivo Variable with its width axis, self-hosted via `@fontsource-variable/archivo` (`wdth.css`). Classes:

  | Class | Size | Weight | Width | Other |
  |---|---|---|---|---|
  | `t-display` | `clamp(2.25rem, 4.3vw, 3.75rem)` | 560 | 112 | |
  | `t-h2` | — | 540 | 112 | |
  | `t-h3` | — | 520 | — | |
  | `t-data` | — | 450 | 75 | tabular-nums |
  | `t-small` | — | — | — | |

  - Body text is 1.0625rem with line-height 1.6.
  - Headings use `text-wrap: balance`.
- **Layout:** 1200 px container, 24 px gutters (16 px on mobile), 12 columns.
  - Sections are as tall as their content, with 64–112 px of vertical padding.
  - Radius is 0, except 2 px on buttons.
  - No gradients and no shadows on the page.

## 5. Page structure (`/`)

```
Header     Murat Güven                        Research  Publications  About  CV (PDF)
Hero       statement + sub-line (5 cols) | live 3×3 lattice + targets, readouts, sparkline (7 cols)
PhD band   dark, 240vh with a sticky stage: PhD paragraph (4 cols) | scroll render (8 cols)
Research   FEAD paper (recorded thesis states) · EWSHM (team) · concApp (team)
Publications · Teaching and talks · About (bio | timeline) · Contact · Footer
```

- **Routes:**
  - `/publications` redirects to `/#publications`, which jumps to that section with no smooth scroll.
  - `/tools/*` routes are lazy chunks.
  - Unknown paths go to `/`.
- **Pages deep links:** a `postbuild` step copies `build/index.html` to `build/404.html`.
- **Mobile (< 1024 px):** header, statement, sub-line, then the cell (precomputed), then the rest.

## 6. Hero: live unit-cell optimization

### Framing

The caption reads: "Simplified linear-elastic topology optimization, running in your browser. Not the model from my publications." The FEAD paper uses nonlinear elasticity and domain reduction; this demo does not.

### Formulation (`src/lab/unitcell.ts`, `src/lab/mma.ts`)

- **Discretization:**
  - square periodic cell;
  - n × n Q4 elements with 2×2 Gauss integration;
  - plane stress, E = 1, ν = 0.3, E_min = 1e-9;
  - SIMP with p = 3;
  - Voigt order [11, 22, 12] with engineering shear.
- **Homogenization:** energy-based (Andreassen & Andreasen 2014).
  - The periodic fluctuation is imposed by DOF aliasing, and one node is fixed.
  - The solver is a profile Cholesky with folded ordering. One factorization serves all three load cases.
- **Filter and projection:**
  - periodic density filter, r_min = 2 elements;
  - Heaviside projection with η = 0.5;
  - β starts at 1 and doubles at convergence or every 20 iterations, up to 16.
- **Optimizer:** MMA (Svanberg) with one volume constraint, V ≤ 0.40. The dual is solved by scalar bisection.
- **Symmetry:** D4 is enforced by averaging over orbits, in a fixed order, so runs are bit-reproducible.
- **Initial design:** volume fraction 0.4, plus a 0.25 cosine perturbation (cos 4πx + cos 4πy) and a central void of radius 0.15.
- **Targets:**

  | Button | Objective | Result at n = 32 |
  |---|---|---|
  | Axial | maximize C₁₁ + C₂₂ | grid; 43 iterations; E₁ = 0.233, ν₁₂ = 0.11 |
  | Shear | maximize C₃₃ | diamond; 82 iterations; G₁₂ = 0.104 |
  | Auxetic | minimize C₁₂ − w (C₁₁ + C₂₂), with w = max(0.8^k, 0.02) | re-entrant cell; 127 iterations; ν₁₂ = −0.37 |

- **Why there is no bulk target:** at this volume fraction, both the grid and the diamond reach the 2D bulk bound. A bulk target therefore always reproduces the axial or the shear design. A weighted mix collapses to one of them in the same way.
- **Readouts:**
  - E₁ = 1/S₁₁, G₁₂ = C₃₃ and ν₁₂ = −S₁₂/S₁₁, relative to the solid material;
  - a sparkline of the target's quantity by iteration. Its live point is `laser`.

### Behaviour (`src/components/LiveCell.tsx`, `src/lab/unitcell.worker.ts`)

| Condition | What happens |
|---|---|
| ≥ 1024 px, fine pointer, no reduced motion | When the hero is visible, the initial design shows and **Auxetic** runs once, live |
| Otherwise | The precomputed Auxetic result shows; **Run live** is offered |
| Target button | Starts a live run for that target. Under reduced motion, or without a worker, the precomputed result shows instead |
| Running | Pause is always available (WCAG 2.2.2). Pausing is automatic when the hero leaves the viewport or the tab is hidden, and the run resumes on return |
| Worker error | Falls back to the precomputed result, and Run live is hidden |

- **Worker pacing:** at least 40 ms per iteration, so that a run stays readable (about 2, 3 and 5 s for the three targets).
- **Run ids:** each run carries an id, so frames from a cancelled run are dropped.
- **Precomputed results:** `npm run precompute` runs the same solver in Node and writes `src/lab/precomputed.ts` (11 KB: densities in base64 plus the history).
- **Mesh:** n = 32 on every device, so the live and precomputed results agree.

**Benchmarks (Node 24.14.1, this Windows laptop):**
- about 30 ms per iteration at n = 32;
- full runs take 1.2 s (axial), 2.4 s (shear) and 3.6 s (auxetic);
- n = 40 takes 3.7–7 s, which is too slow.

Still to do: a browser and phone benchmark on real hardware. The preview pane throttles timers, so it gives no usable numbers.

### Validation (`src/lab/unitcell.test.ts`, 17 tests)

1. A solid cell gives the plane-stress tensor to 1e-9.
2. Results agree with the independent NumPy reference (`scripts/reference_homogenize.py`) to 1e-8 on three fields, one of them anisotropic.
3. Periodicity: opposite boundary nodes share their DOFs.
4. Sensitivities of every target match central finite differences to a relative error of 1e-5, and the volume gradient matches too.
5. Full runs on all three targets:
   - converge before the iteration cap;
   - keep volume ≤ 0.40;
   - have a grey fraction under 8 %;
   - are D4-symmetric to 1e-12;
   - are bit-deterministic.

   The auxetic run reaches −1 < ν₁₂ < 0.

## 7. PhD band (`src/components/LaserBand.tsx`, `src/lab/laser/`)

- **The only visible text:** the PhD paragraph (`phdParagraph`, **draft for Murat to confirm**) and the caption "Illustrative render". The section has a visually hidden h2.
- **Timeline** (share of the band's scroll):

  | Share | Step |
  |---|---|
  | 0–12 % | approach |
  | 12–62 % | six bolt holes: pierce, lead-in, contour, at constant feed |
  | 62–66 % | head retracts |
  | 66–76 % | end-cut trace |
  | 76–86 % | exploded offcut |
  | 86–100 % | hold |

  There is no kerf close-up and no "decision" beat.
- **Loading and rendering:**
  - three.js (133 KB gz) loads through `import()` when the band is within 40 % of a viewport.
  - It renders only on scroll, inside rAF, while the band is near.
  - Below 1024 px: DPR is capped at 1.5 and shadows are off.
  - The canvas edges fade into the bay with a radial mask.
- **Fallbacks:**
  - Reduced motion: no sticky scroll. One still of the finished part at a share of 0.9.
  - No WebGL: the text only.
- **Layout stability:** the band's height is fixed from the first render, so hash links below it land correctly.

## 8. Other sections

| Part | Notes |
|---|---|
| Research rows | Text in 6 columns and a figure in 6, or text alone in 8. FEAD shows the recorded states initial, 10, 50 and final 250, with labels and the line "Source: MSc thesis, İzmir Institute of Technology, 2023". These are resampled for size only |
| `DatedList` | Used for Publications and for Teaching and talks. Forthcoming entries come first, then newest first. The title is the link. Own name at weight 560. Tested in `DatedList.test.ts` |
| About | Bio in 6 columns; timeline in 5 (a real sequence, so year markers are allowed) |
| Contact | Email as a mailto link, then text links to the profiles |

## 9. States and accessibility

- **Skip link and landmarks:** a skip link to `#main`, plus `header`, `nav[aria-label=Sections]`, `main`, `footer`, and one h1.
- **Focus:** a 2 px `ink` outline with a 3 px offset. Buttons are at least 44 px tall.
- **Live cell:**
  - the canvas has `role="img"` and a label that describes the target and its state;
  - status changes are announced in a polite `role="status"` region, but individual iterations are not;
  - target buttons use `aria-pressed`.
- **Motion:** limited to the hero run and the band. There are no section fade-ins, card lifts or parallax.

## 10. Verification (2026-10-21)

- **Tests:** `npm test` passes 18/18 (17 solver tests plus 1 list test).
  - The WorldMap test was removed: it imported functions that no longer exist.
- **Build:** `npm run build` passes and writes `404.html`.
  - The build needed the missing d3 `@types` packages, a null guard and the `d3-transition` import in WorldMap.
  - Main bundle: 96 KB gz. The tools and three.js are lazy.
- **Production preview (`npx serve build`):**
  - the worker runs;
  - `/publications` lands on `#publications`;
  - `/tools/WorldMap` loads after a hard refresh.
- **Lighthouse on the production build:**

  | | Performance | Accessibility | Best practices | SEO |
  |---|---|---|---|---|
  | Mobile | 96 | 100 | 100 | 100 |
  | Desktop | 99 | 100 | 100 | 100 |

- **Visual checks at 375 (812 and 667 tall), 768, 1024, 1280 and 1440 px:** no horizontal scroll. The band's stage is a flex column below 1024 px, so the paragraph and the render fit a 667 px phone.
- **Keyboard:** the skip link appears on the first Tab and targets `#main`, and every control shows the focus ring.
- **Reduced motion** (headless Chrome, `--force-prefers-reduced-motion`, 1440 × 900): no autoplay, and the band renders as a still. Without the flag, autoplay starts and the band is 240vh.
- **Not browser-tested:** the no-WebGL path, which shows the text only. If WebGL fails, the band collapses from 240vh after first render, so a hash jump made before that moment lands a little low.

## 11. Open items for Murat

1. PhD paragraph wording (draft in `site.ts`).
2. Hero sub-line wording.
3. EWSHM and concApp: his role in one phrase each, any public link, and a source for the awards (EWSHM Audience Prize, Switch2Product Top 25) before they are shown.
4. A recompiled CV without the phone line (optional; the current redacted copy is clean).
5. A browser and phone benchmark of the live cell on his own hardware.
6. Review the local preview, then decide whether to deploy. **No deploy without his OK.**

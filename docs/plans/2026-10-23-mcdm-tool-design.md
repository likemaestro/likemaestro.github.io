# Multi-criteria choice tool: design (2026-10-23)

A standalone tool at `/tools/decision` for the methods Murat uses in his PhD: TOPSIS, VIKOR, AHP and SMAA-2. It
reuses `src/tools/mcdm.ts`, which already ranks the truss front. Agreed with Murat in a brainstorm on 2026-10-23.

## What it is

- **Core job:** a decision lab. One table of options × criteria; TOPSIS and VIKOR rank it for given weights; SMAA-2
  shows how the ranking holds when the weights are uncertain. SMAA-2 is the distinctive part.
- **Opens with:** four made-up flats (rent, commute, floor area, energy use), labelled as made up. Neutral on purpose:
  never the laser/plasma case, partner data or unpublished results.
- **Table:** editable cells; every criterion has a direction (lower or higher is better); 2 to 8 options, 2 to 6
  criteria; paste a block from a spreadsheet. The whole state lives in the link.
- **Group on /tools:** "Decision support".

## Layout

No frame, thin rules, the truss tool's language. Decision table full width; then weights (left) beside the TOPSIS and
VIKOR rankings (right); then SMAA-2 full width. Explanations sit in tooltips, not paragraphs. Orange marks only the
top-ranked option. Phones: one column; the table scrolls sideways inside its own box.

## Methods

- **Directions:** higher-is-better criteria are negated inside, so every method minimizes.
- **Weights:** linked sliders that share 100 % (the truss tool's `relink`), or AHP.
- **AHP, weights only (Saaty 1990, DOI 10.1016/0377-2217(90)90057-I):** one slider per pair on Saaty's 1–9 scale;
  weights from the principal eigenvector (power iteration); CR = CI / RI with a warning above 0.10 naming the pair
  that disagrees most. The published RI tables differ between Saaty's sources and could not be checked in the
  original, so RI is estimated here as Saaty defines it, the mean CI of random reciprocal matrices on the 1–9 scale
  (100,000 per size): 0.525, 0.881, 1.108, 1.247 for 3 to 6 criteria.
- **TOPSIS (Hwang & Yoon 1981, DOI 10.1007/978-3-642-48318-9):** as in `mcdm.ts`.
- **VIKOR (Opricovic & Tzeng 2004, DOI 10.1016/S0377-2217(03)00020-1):** Q with v = 0.5, S and R in tooltips; the two
  conditions (acceptable advantage Q₂ − Q₁ ≥ 1/(m − 1); acceptable stability, the first is also best by S or R).
  When one fails, the compromise set is shown instead of one winner.
- **SMAA-2 (Lahdelma & Salminen 2001, DOI 10.1287/opre.49.3.444.11220):** additive value on criteria scaled 0–1
  between the worst and best option; 10,000 weight vectors from a fixed seed. Weight information: none (uniform on
  the simplex), an order of importance (the same draws sorted), or around the user's weights ± x % (drawn in the
  interval, then rescaled). Results: rank acceptability (options × ranks), central weights, holistic acceptability
  with linear meta-weights (rank 1 counts fully, the last rank not at all).
- **Left out:** confidence factors. With exact table values they are 0 or 1; they need uncertain criteria values,
  which can come later if wanted.

## Files and tests

- `src/tools/mcdm.ts`: directions for TOPSIS and VIKOR; `vikorDetail` and the compromise set; `ahp`; `smaa2`. Seeded
  random numbers reuse `mulberry32` from the truss tool.
- `src/tools/mcdm.test.ts`: a consistent AHP matrix returns its weights with CR = 0, an inconsistent one has CR > 0.1;
  a higher-is-better criterion ranks like its negated column; a small VIKOR Q gap gives a two-option compromise set;
  an option better on every criterion is first in all SMAA samples; two mirror-image options are each first about
  half the time; order mode keeps the order; "around ± 0 %" matches the weighted ranking.
- `src/tools/decision/Decision.tsx`, a `pages.json` entry, an App route, the /tools group and glyph.
- Browser checks: editing and pasting, AHP and the CR warning, the three SMAA modes, reload from the link, phone width
  without horizontal scroll, keyboard focus. Screenshots to Murat before any deploy.

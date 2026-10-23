# Handoff spec: Surrogate frame design

## Overview

- **Value proposition:** For structural engineers, students and researchers who hear "AI-assisted design" but have
  never seen it work on a real structure, it is a 3D six-storey steel moment frame designed with a Gaussian process
  surrogate:
  - a few FE analyses train it;
  - a genetic algorithm searches it in milliseconds;
  - FE verifies the result.
  Unlike black-box AI claims and GP demos on toy functions, it shows the whole workflow, counts the FE runs it saves,
  and shows when the surrogate should not be trusted.
- **Murat's choices (2026-10-23):**
  - surrogate-assisted design (GP on FE runs, a GA on the GP, FE verification); no Bayesian optimization;
  - a multi-storey frame, moment frame by default;
  - the 3D structure first;
  - the group "Machine learning".
  - It mirrors Murat's own method without naming any project.
- **In scope:**
  - one building preset (moment frame);
  - three design variables;
  - wind on the long face plus gravity;
  - linear 3D frame analysis with αcr amplification and simplified member checks;
  - a GP per output; Latin hypercube sampling; the GA; a verification loop;
  - an exhaustive FE baseline.
- **Later:** a braced-frame preset, a second wind direction, more variables.

## Route and registry

| Field | Value |
|---|---|
| Path | `/tools/surrogate-frame` |
| Slug | `surrogate-frame` → `src/tools/surrogate-frame/` |
| Title | Surrogate frame design |
| Line | Design a six-storey steel frame with a Gaussian process surrogate: a few FE runs train it, a genetic algorithm searches it, and FE checks the answer. |
| Group | Machine learning |
| `methodRef` | `{ label: "Jin 2011", href: "https://doi.org/10.1016/j.swevo.2011.05.001" }` |

## Files

- `SurrogateFrame.tsx`: the page.
- `frame.ts`: geometry, loads, FE, checks; pure.
- `frame.worker.ts`: FE runs, the exhaustive baseline.
- `surrogate.ts`: encoding, GP fits, prediction, the GA problem, the verification loop.
- `Frame3D.tsx`.
- `Charts.tsx`: LOO, GA convergence, rounds.
- Tests: `frame.test.ts`, `surrogate.test.ts`.

## The building and the "expensive model" (`frame.ts`)

**Geometry (moment frame preset):**
- 3 bays in x at 6.0 m (18 m); 2 bays in y at 7.5 m (15 m); 6 storeys at 3.6 m (H = 21.6 m).
- 12 column lines, 7 levels including the ground: 84 nodes.
- **Columns:** HEB, webs parallel to y, so sway in y bends them about their strong axis. Bases fixed.
- **Beams:** IPE in both directions; every beam-column joint rigid.
- **Floors:** rigid diaphragms (master node per floor with ux, uy, θz; slave transformation). Alternative: stiff
  in-plane diagonals. A test shows both give the same drifts within 1 %.

**Element:** 3D Euler–Bernoulli beam, 12 DOF (A, Iy, Iz, It from the sections module), local axes from the member
direction and a roll angle (columns: web along y).

**Loads (assumptions, editable under "Loads" in an expandable panel):**
- **Dead load** gk = 4.0 kN/m² (slab, finishes, services), plus steel self-weight.
- **Imposed load** qk = 3.0 kN/m², offices category B (EN 1991-1-1). The roof carries gk only.
- **Floor slab:** one-way, spanning 6 m in x onto the y-direction beams. Line loads on the y-beams: 6 m tributary
  width internally, 3 m at the edges. The x-beams carry only their self-weight.
- **Wind on the 18 m face (acting in y):**
  - peak velocity pressure qp at the roof height, a slider 0.5–1.5 kN/m², default 0.9;
  - a simplified net pressure coefficient of 1.3 (windward + leeward, after EN 1991-1-4, Table 7.1);
  - storey forces Fj = 1.3·qp·18 m·hj, applied at the floor masters.
  - Labeled "simplified".

**Combinations (EN 1990, 6.10, recommended values):**
- ULS1: 1.35G + 1.5Q + 1.5·0.6W.
- ULS2: 1.35G + 1.5W + 1.5·0.7Q.
- SLS (drift): 1.0W (characteristic).
- Both ULS combinations add the equivalent horizontal forces of EN 1993-1-1, 5.3.2: φ = φ0·αh·αm, φ0 = 1/200, with αh
  and αm from the clause.

**Analysis:** a linear static solve with a banded Cholesky (node numbering floor by floor).

**Second order (EN 1993-1-1, 5.2.1 and 5.2.2):**
- αcr per storey by Horne's method, αcr = (HEd/VEd)·(h/δH,Ed); the minimum over storeys.
- If αcr ≥ 10, use first order.
- If 3 ≤ αcr < 10, multiply the sway effects (the horizontal load case) by 1/(1 − 1/αcr).
- If αcr < 3, the design is infeasible ("too sway-sensitive for this tool").

**Member checks (simplified, conservative, labeled so):**
- **Columns:** N/(χy·Npl,Rd) + My/Mpl,y,Rd + Mz/Mpl,z,Rd ≤ 1.
  - χy from curve b for HEB (h/b ≤ 1.2); buckling length = storey height (non-sway length, since sway effects are
    amplified); γM1 = 1.0.
- **Beams:** My/Mpl,y,Rd (laterally restrained by the slab) and V/Vpl,Rd, the larger.
- **Utilization:** one value per member, the maximum over the ULS combinations.

**Outputs per design:**
- `drift`: the largest interstorey drift ratio δ/h under SLS;
- `uCL`, `uCU`, `uB`: the largest utilization of the columns in storeys 1–3, the columns in storeys 4–6, and the beams;
- `acr`;
- `mass`: steel mass in t (exact, Σ ρ·A·L);
- the nodal displacements (for the deformed shape).

**Cost:** about 500 DOF; target < 60 ms per run on a mid-range phone. Measure the time and show it.

## Design variables

| Key | Group | Catalog (index order) | Options |
|---|---|---|---|
| `cL` | Columns, storeys 1–3 | HEB 200, 220, 240, 260, 280, 300, 320, 340, 360, 400, 450, 500 | 12 |
| `cU` | Columns, storeys 4–6 | the same | 12 |
| `bm` | All beams | IPE 270, 300, 330, 360, 400, 450, 500, 550, 600 | 9 |

- The design space has 12 × 12 × 9 = 1,296 designs, so an exhaustive FE search is the honest baseline.
- **GP input encoding:** each variable is the section's log10(Iy), scaled to [0, 1] over its catalog. This is smoother
  than the index, and documented in Method.

## The surrogate (`surrogate.ts`)

**Sampling:**
- `lhs(N, 3, rng)`, each coordinate mapped to the nearest catalog index;
- duplicates replaced by seeded random unique designs;
- N from 10 to 50, default 24; seed in the URL.

**Outputs modeled:** log(drift), log(uCL), log(uCU), log(uB), log(acr): five independent GPs (`ml/gp.ts`), refit after
each new FE run.

**Predictions:**
- μ ± 2σ in log space, shown back-transformed (e.g. drift 1/412, with a band 1/380–1/450).
- **Unsure:** a group whose band contains 1.
- **Over:** μ > 1.

**Leave-one-out:** closed form; reported as R² (in log space) and the largest relative error on the original scale.

**GA (reusing `createNSGA2`, single objective):**
- Minimize mass.
- Constraint violation cv is the sum of:
  - max(0, μd + kσd − log(1/lim)) for drift, where `lim` is 300, 400 or 500;
  - Σ max(0, μu + kσu) for each utilization (log space, limit 0);
  - max(0, log 3 − (μa − kσa)) for αcr.
- k, the "caution", is in the URL.
- Settings: pop 24, 40 generations, pc 0.9, mutation 1 variable per child, ηc = ηm = 3, seed from the URL. These sit
  in a collapsed "Algorithm" group as in the truss tool.

**Verification loop (at most 10 rounds):**
1. Run FE on the GA's best feasible design.
2. It is **accepted** if FE says it is feasible and every GP error is within 10 %.
3. Otherwise, add the run to the training set, refit, rerun the GA, and go to the next round.
4. After 10 rounds, stop with "Not verified after 10 rounds: the surrogate can't model this region well. Add more
   samples."

**Exhaustive baseline (optional, in the worker):**
- all 1,296 designs by FE, with progress, a Cancel button and the measured time;
- the result is the true optimum (lightest feasible).
- The tally: "Surrogate: 31 FE runs, 48.2 t. Exhaustive FE: 1,296 runs, 47.6 t, 58 s on this device."

**Carbon (optional line):** mass × the A1–A3 factor of `steel-sections-eaf` from the carbon factors, labeled
"Steel only, A1–A3", with a link to the carbon calculator.

## Settings (URL)

| Key | Kind | Range | Default |
|---|---|---|---|
| `qp` | num | 0.5–1.5, step 0.05 (kN/m²) | 0.9 |
| `lim` | enum | `300`, `400`, `500` (drift limit h/x) | `300` |
| `n` | num | 10–50, step 1 | 24 |
| `seed` | num | 1–999999 | 7 |
| `k` | num | 0–3, step 0.5 | 2 |
| `cL`, `cU`, `bm` | num | 0–11, 0–11, 0–8 | 5, 2, 4 (HEB 300, HEB 240, IPE 400): the "Explore" design |
| `step` | enum | `explore`, `optimized` | `explore` |

## Layout

**Workflow bar** (top, full width, `flex flex-wrap gap-2 pb-4`): five numbered steps as `.btn`, with the current step
`btn-solid` and a check icon on the done steps:
1. Sample;
2. Train;
3. Explore;
4. Optimize;
5. Verify.
- Steps 1–2 run automatically on first load (the page opens with a trained surrogate).
- Beside the bar: `t-small` "FE runs: 24 · GP accuracy (leave-one-out): R² 0.98, worst 6 %".

**Above `lg`:** grid `lg:grid-cols-[minmax(0,1fr)_21rem]`.
- **Stage (left):** the 3D canvas, height `clamp(20rem, calc(100svh - 22rem), 36rem)`.
  - Top right: the orbit buttons.
  - Top left: a legend (`t-small`, `bg-canvas/90` panel): the grey ramp "Utilization 0 … 1", a hatch swatch "Unsure:
    the band crosses 1", a hatch-on-ink swatch "Over 1".
  - Bottom left: the wind arrow label "Wind, qp 0.9 kN/m²".
  - Below the canvas, a caption: "Predicted by the GP (24 FE runs). Drift 1/412 (1/380–1/450). Mass 52.3 t."
- **Panel (right, `lg:pl-6 lg:border-l border-rule`):**
  1. Design: three range inputs with section-name outputs (`Field`: "Columns, storeys 1–3", output "HEB 300").
  2. Results (`t-data` table): mass (exact); drift; uCL, uCU, uB; αcr. Each row shows "μ (band)" and a source badge,
     **GP** or **FE** (`t-small`, a bordered chip). FE rows replace GP rows after "Check with FE".
  3. Actions:
     - `btn` "Check with FE";
     - `btn btn-solid` "Optimize" (step 4);
     - `btn` "Verify" (step 5, enabled after Optimize);
     - `btn` "Exhaustive FE" (with the measured estimate "about 1 min").
  4. A caution slider k with a `Tip`: "How far to stay from the limits, in GP standard deviations. 0 trusts the GP's
     mean; 2 is about 98 % one-sided."
- **Below the grid (`border-t border-rule`, `grid gap-x-8 sm:grid-cols-3`):**
  - **LOO chart:** predicted against FE, log axes, ±2σ whiskers, the 45° line in `rule`;
  - **GA convergence:** the best feasible mass by generation;
  - **Rounds table:** round, design, GP prediction, FE result, verdict ("accepted", "added to training");
  - then the tally sentence.

| Breakpoint | Changes |
|---|---|
| ≥ 1024 | As above |
| 640–1023 | The stage at full width, height `clamp(18rem, 55svh, 30rem)`; the panel below in two columns (design | results); the charts in two columns |
| < 640 | One column: workflow bar (wrapping), stage, design, results, actions, charts stacked; the legend moves below the canvas |

## 3D view (`Frame3D.tsx`)

- **Members:** three `InstancedMesh`es (lower columns, upper columns, beams), with geometry from `iSectionShape` at
  true dimensions.
- **Color:** per group, from the grey ramp by utilization (steel at 0, ink at 1).
  - Unsure: the hatch texture on the group's material.
  - Over: ink with the hatch.
  - Never `laser`.
- **Floors:** thin boxes, `MeshBasicMaterial({ color: #EEF0EE, transparent: true, opacity: 0.35 })`, depthWrite off.
- **Wind:** five ink arrows on the windward face at storey levels, length ∝ qp.
- **Deformed shape:** only when the current design has an FE result. A toggle "Deformed (FE)", with exaggeration
  chosen so the roof moves H/40, and the label "Deformed × N, illustrative".
- **Camera:** azimuth 40°, elevation 20°, the whole building plus 15 % margin.
- **Picking:** clicking a member shows its group, section and utilization in a small `t-small` card at the panel top.
  The picked group gets an outline in `laser` (EdgesGeometry for that group).

## States and interactions

| Element | State | Behavior |
|---|---|---|
| Page | First load | The worker starts; Sample (24 runs) and Train run automatically; the run strip fills; then the Explore state. The status reads "Running FE 7 / 24…" in `aria-live`. Reduced motion: the same, without the strip animation |
| Sample | Click (re-sample with a new N or seed) | Clears training and rounds; runs N FE in the worker; then auto-trains |
| Train | After sampling | Fits five GPs (< 300 ms); LOO computed; the badge shows R² |
| Design sliders | Input | GP prediction at once (< 2 ms); 3D colors and results update; the source badge "GP"; no FE |
| Check with FE | Click | One FE run (< 60 ms); results switch to FE with the GP's error shown ("GP was 6 % low"); the run is **not** added to training (explained in a `Tip`) |
| Optimize | Click | The GA on the GP (< 200 ms); the design moves to the GA's best; the step chip "Optimize" done; the URL `step=optimized` |
| Verify | Click | The verification loop, round by round (each round about 100–300 ms); rounds table rows animate in (150 ms fade; none under reduced motion); ends "accepted" or "not verified" |
| Exhaustive FE | Click | Progress bar (`role="progressbar"`, aria-valuenow); Cancel; at the end, the true optimum is marked in the rounds table and the tally appears |
| k slider | Change | Re-runs Optimize if it was done (Verify must be re-run; its rows grey out with "outdated") |
| Worker error | | `t-small` message in `ink`: "The analysis stopped: [message]. Reload the page to start again." Actions disabled |
| No WebGL2 | | `<No3D>`; a 2D elevation (SVG) of the y-direction frame, colored the same way, replaces the stage |
| Infeasible everywhere | Very high qp and strict limit | GA result "no feasible design in the catalog for these loads", with a suggestion to lower qp or relax the limit |

## Edge cases

- **Duplicate samples:** handled by the sampler; N is honored.
- **GP fit fails** (ill-conditioning): add jitter ×10 up to 3 times, then report "GP could not be fitted; add samples".
- **αcr < 3 in training data:** those designs keep their outputs (the GP still learns them); the GA's αcr constraint
  avoids them.
- **Exhaustive run on a slow phone:** keep the estimate visible before starting; Cancel always works.
- **Numbers:**
  - mass to 0.1 t;
  - drift as "1/412", with a band;
  - utilization with 2 decimals;
  - αcr with 1 decimal.

## Motion

| Element | Trigger | Animation | Duration | Easing |
|---|---|---|---|---|
| Run strip | Each FE run in Sample | Dot fades in | 120 ms | ease-out |
| Member colors | Design change | No tween (instant) | 0 | n/a |
| Camera | Reset | Lerp | 300 ms | ease-out; instant under reduced motion |
| Rounds rows | Verify | Fade in | 150 ms | ease-out; none under reduced motion |
| Deformed shape | Toggle | Scale 0 → 1 | 250 ms | ease-out; instant under reduced motion |

## Accessibility

- **Focus order:**
  1. workflow steps;
  2. design sliders;
  3. caution;
  4. actions;
  5. orbit buttons;
  6. charts' data tables;
  7. ToolShell.
- **Canvas label:** e.g. "Six-storey steel frame. Lower columns HEB 300, upper columns HEB 240, beams IPE 400.
  Predicted drift 1 in 412; beams unsure; mass 52.3 tonnes."
- **Charts:** each has a "Show as table" toggle with the same data, as in the property map.
- **Live announcements:** step completions ("Training done: 24 runs, accuracy R² 0.98"), FE checks and the verify
  outcome.

## Copy (drafts for Murat)

- **Method:**
  - "A Latin hypercube picks N frame designs; each is analysed with a linear 3D frame model (Eurocode load
    combinations, sway amplification by αcr, simplified member checks)."
  - "A Gaussian process per output (drift, utilization of three member groups, αcr) is fitted to these runs by
    maximizing the marginal likelihood."
  - "A genetic algorithm then minimizes steel mass on the surrogate, keeping k standard deviations away from every
    limit, and the finite element model verifies the result; a failed check joins the training set and the search runs
    again (surrogate-assisted evolutionary design, Jin 2011; Forrester et al. 2008)."
- **Assumptions and limits:**
  - "A teaching model, not a design tool: one wind direction, simplified wind pressures and member checks, no
    connection design, rigid floors, fixed bases."
  - "Drift limits are guidance and National Annex values (h/300 by default)."
  - "Loads are stated assumptions you can change."
- **Credit line (Method, last sentence):** "This is the workflow I use in my research: surrogates trained on expensive
  analyses, searched by an optimizer and checked by the full model."

## Tests

| Test | Expected |
|---|---|
| Portal frame (one bay, one storey, fixed bases, rigid beam) under a horizontal load | Sway = H·h³/(24·E·Ic) for infinitely stiff beams (use beam I × 1e6), within 0.5 % |
| Horne's αcr | Equals HEd/VEd · h/δ for a one-storey case computed by hand |
| Diaphragm | Master–slave and stiff-diagonal versions within 1 % |
| Symmetry | Gravity alone gives zero sway (< 1e-9 relative) |
| Utilization | One hand-checked column and beam in the default design |
| LHS mapping | N unique designs, indices in range |
| GP | LOO R² > 0.9 on the default settings (seed 7, N = 24) for drift |
| GA | Respects per-variable bounds; deterministic for a seed |
| Verification | Terminates in ≤ 10 rounds; the accepted design is FE-feasible |
| End to end | Default settings: the accepted design's mass is within 5 % of the exhaustive optimum |

**Hand check by Murat:** the default design's drift and one column's utilization against a commercial frame program
(e.g. SAP2000 or ETABS, both on the CV), within 5 %.

## Acceptance

- [ ] All tests pass. The end-to-end mass within 5 % of the true optimum.
- [ ] The page opens trained in under 3 s on a mid-range phone.
- [ ] The exhaustive baseline runs, reports its time, and can be cancelled.
- [ ] The README definition of done.

## References

- Jin (2011). Surrogate-assisted evolutionary computation: recent advances and future challenges. Swarm Evol. Comput.
  1(2), 61–70. DOI 10.1016/j.swevo.2011.05.001.
- Forrester, Sóbester and Keane (2008). Engineering design via surrogate modelling. Wiley.
- Rasmussen and Williams (2006). Gaussian processes for machine learning. MIT Press.
- McKay, Beckman and Conover (1979). Technometrics 21(2), 239–245.
- Deb et al. (2002). NSGA-II. IEEE Trans. Evol. Comput. DOI 10.1109/4235.996017.
- Related: Do, Ohsaki and Yamakawa (2021), GP surrogates for steel frame design under drift limits, Eng. Struct.;
  Tseranidis, Brown and Mueller (2016), Autom. Constr. 72.
- EN 1990 (6.10, Table A1.1); EN 1991-1-1 (category B); EN 1991-1-4 (Table 7.1); EN 1993-1-1 (5.2.1, 5.2.2, 5.3.2,
  6.2, 6.3).

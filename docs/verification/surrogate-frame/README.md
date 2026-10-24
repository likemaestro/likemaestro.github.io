# Surrogate frame design: verification record

Date: 24 October 2026. Code: `src/tools/surrogate-frame/`, `src/tools/ml/`, `src/tools/rng.ts`, the per-variable bounds
in `src/tools/truss-sizing/ga.ts`, `src/tools/three/hatch.ts`. Spec: the reviewed `tool-surrogate-frame.md` and
`shared-foundations.md`, with the deviations listed at the end.

## Status

| Item | Status |
|---|---|
| Implemented | Yes (no carbon line: the carbon factors are still blocked) |
| Numerically verified | Yes: analytical cases, hand calculations, constraint and invariance tests (unit tests) |
| Independently benchmarked | Yes: a separate NumPy/SciPy frame model (this folder) for five designs and the full exhaustive search. Murat's check against a commercial frame program is open |
| Browser-tested | Yes: headless Chromium 1243 (SwiftShader WebGL), production build, at 375 × 812, 1280 × 800 and 1700 × 950 |
| Accessibility-tested | Partly: axe-core 4.10.3 (WCAG 2 A/AA), keyboard-operable controls; no screen-reader session |
| Ready for owner review | Yes |
| Ready to publish | No: needs Murat's review, the commercial-program hand check, approval of the copy (the credit line) and of the group order |

## Commands and observed results

- `npm test`: 14 files, 105 tests passed (16 frame and surrogate, 6 GP/LHS/GA, 5 sections, and the earlier ones).
- `npm run build`: passed; postbuild wrote 11 pages and a sitemap with 10 URLs (the three.js chunk-size warning predates this work).
- `python3 -I docs/verification/surrogate-frame/frame_check.py` (NumPy 2.5.3, SciPy 1.18.1): `frame_check.out.txt`.
- `python3 -I docs/verification/surrogate-frame/exhaustive_check.py`: `exhaustive_check.out.txt` (453 s).

### The frame model

| Test | Result |
|---|---|
| Simply supported IPE 400, 6 m, uniform load, four elements | Midspan deflection 5wL⁴/(384EI), moment wL²/8, end shear wL/2: all within 10⁻⁹ |
| Single column under axial force | Shortening PL/EA, axial force P: within 10⁻¹² |
| One-storey, four HEB 300, rigid beams, wind | Sway H h³/(48 E I) within 0.5 % (spec target) |
| Horne's αcr, same frame, HAND CALCULATION | 48 E I/(V h²) in y (strong axis) and x (weak axis), within 10⁻⁵ (the beams are 10⁶ times stiffer, not rigid) |
| Rigid floors: master mapping against explicit constraints with Lagrange multipliers, same stiffness and loads | Largest difference 10⁻⁹ of the largest displacement; a pure floor rotation strains no beam |
| Gravity alone | No sway (below 10⁻⁹ of the vertical displacements) |
| Wind base shear | 1.3 · qp · 18 m · 19.8 m (the lowest half storey loads the foundation), exact; drift linear in qp |
| Member reversed end to end | Same drift, αcr and member utilization (10⁻⁹) |
| Sway imperfection, buckling curves | φ = 0.002722 (αh = 2/3, αm = 0.8165, m = 3); χ(1.0) = 0.5970 (b) and 0.5399 (c), as EN 1993-1-1 Table 6.4 |
| Mass, HAND CALCULATION | Σ ρ A L for the default design, exact |
| Five designs against the NumPy model | drift, uCL, uCU, uB, αcr,y, αcr,x and mass agree within the printed rounding (6 × 10⁻⁴) |
| Exhaustive search, TypeScript and NumPy | Both: 557 of 1,296 designs feasible at h/300; optimum HEB 300 / HEB 220 / IPE 360, 63.48 t |

Default design (HEB 300, HEB 240, IPE 400; qp 0.9 kN/m², gk 4, qk 3): drift 1/428, uCL 0.80, uCU 0.63, uB 0.78,
αcr 11.3 in y and 8.3 in x, 71.3 t; feasible at h/300. 306 reduced DOFs, half-bandwidth 101.

### The surrogate (default loads, h/300)

Leave-one-out R² in log space at the default settings (N = 24, seed 7): drift 0.977, uCL 0.998, uCU 0.997, uB 0.999,
αcr 0.917 (largest relative error 56 %, for αcr). The page shows these measured values; no accuracy is assumed.

End to end (sample, fit, GA on the GP, verify by FE; `surrogate.test.ts` runs the first row):

| Seeds, N, k | Rounds | FE runs | Verified design | Gap to the exhaustive optimum |
|---|---|---|---|---|
| 10 seeds (1–10), N = 24, k = 2 | 1 each | 25 each | 63.48–65.70 t | 0 % (4 seeds), 2.0 % (4), 3.5 % (2) |
| seed 7, N = 24, k = 0 | 2 (the first answer failed FE) | 26 | 63.48 t | 0 % |
| seed 7, N = 24, k = 1 / k = 3 | 1 | 25 | 63.48 / 64.73 t | 0 / 2.0 % |
| seed 7, N = 12 / N = 40, k = 2 | 1 | 13 / 41 | 64.73 t | 2.0 % |

These are measurements on this model and catalog, not guarantees. The 5 % gap is an empirical target that every run
above met.

### Timing

| What | Where | Measured |
|---|---|---|
| One frame analysis | Node 22, this container | 6.4 ms median |
| One frame analysis | Chromium worker | 12–13 ms (as the page reports) |
| Five GP fits, N = 24 / 40 / 60 | Node | about 0.2 / 0.8 / 1.3 s |
| GA on the GP, 984 evaluations | Chromium main thread | 28–35 ms |
| Page load to "Training done" (24 FE runs and five fits) | Chromium, 1280 × 800 | 2.1 s |
| Exhaustive search, 1,296 designs | Chromium worker | 10 s |

CPU throttling (× 4, via the DevTools protocol) did not slow the worker measurably (1.8 s to trained), so it is no
stand-in for a phone here. Not measured on a real phone.

### Browser checks (`vite preview` of the production build)

- Opens trained: the workflow bar shows Sample, Train and Explore done; "FE runs: 24 · R² 0.92 or better, worst 56 %".
- 0 frames rendered over 2 s while idle.
- Moving a design slider updates the GP prediction in 58 ms (badge GP, μ and μ ± 2σ).
- Check with FE: results switch to FE with the GP's error per output (here 1–5 %); the deformed shape (× 13, roof at H/40)
  appears on request, with the members ghosted.
- Optimize proposes HEB 320 / HEB 220 / IPE 360 (64.7 t); Verify accepts it after one round; the results and caption then
  show the FE values as "FE-verified optimum".
- Exhaustive FE: progress bar, Cancel (checked under throttling), and at the end the tally "Surrogate: 25 FE runs, 64.7 t
  (FE-verified). Exhaustive FE: 1,296 runs, 63.5 t, 10 s on this device. The surrogate's design is 2.0 % heavier."
- Clicking a member shows its group, section and utilization.
- No WebGL2: the message and an SVG elevation of one frame, greyed the same way.
- 375 × 812 with touch: no horizontal scroll; every control at least 44 px tall; the legend moves below the 3D view.
- No console errors or warnings. axe: only the shared ToolShell `<pre>` finding (`scrollable-region-focusable`).

## Deviations from the spec, and why

1. **Column buckling** uses χmin of both axes (y-y curve b, z-z curve c, EN 1993-1-1 Table 6.2) instead of χy alone,
   which would ignore the weaker axis.
2. **αcr in both directions**: Horne's method in y (wind and imperfections) and in x (imperfections only); `acr` is the
   smaller. Only y sway is amplified, since no x horizontal load enters the ULS combinations (a stated limit).
3. **Stated assumptions where the spec was silent**: S355; m = 3 columns in a row for αm; the vertical load at each storey
   from the column forces; floor nodes keep rz independent, as the spec's diaphragm rule implies.
4. **Wind arrows** at all six floor levels (the roof one shorter), as the forces are applied.
5. **The GP fit** runs 8 starts of 60 Adam steps and polishes the best for 200 more; on the measured cases it reaches the
   same likelihood as 8 × 200 in a quarter of the time. Fits and FE runs are in the worker; predictions and the GA on
   the main thread.
6. **The GA skips designs that FE has already found infeasible**, so verification cannot propose the same failure twice.
7. **Settings added to the link**: gk and qk (the "Loads" panel) and the GA settings (the "Algorithm" panel).
8. **The 3D view**: four instanced meshes (lower and upper columns, beams in x and in y) with UVs for the hatch; the picked
   group is outlined by its centerlines; the deformed shape is drawn as cubic centerlines over ghosted members. The
   deformed shape appears instantly (no 250 ms scale-in).
9. **Not done**: the carbon line (the carbon factors are blocked); the "Machine learning" group sits after Structures on
   `/tools` until Murat decides the order.
10. The spec's placeholder numbers (R² 0.98, 48.2 t, 1 min, < 60 ms) are not used; the page shows measured values.

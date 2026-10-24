# Why steel beams twist: verification record

Date: 23 October 2026. Code: `src/tools/beam-twist/`, `src/tools/la/`, `src/tools/steel/`, `src/tools/three/`.
Spec: the reviewed `tool-beam-twist.md` and `shared-foundations.md`, with the deviations listed at the end.

## Status

| Item | Status |
|---|---|
| Implemented | Yes |
| Numerically verified | Yes: closed forms, SN003 κ → 0 limits, hand calculation, mesh convergence (unit tests) |
| Independently benchmarked | Yes: a Ritz sine series (TypeScript, other basis and constraint route), a NumPy/SciPy FE with SVD nullspace and `scipy.linalg.eigh` (this folder), and three published LTBeamN results (below). A case with an intermediate restraint has no published LTBeam value yet: one LTBeam run by Murat would close it |
| Browser-tested | Yes: headless Chromium 1243 (SwiftShader WebGL), production build, at 375 × 812, 1280 × 800 and 1700 × 950 |
| Accessibility-tested | Partly: axe-core 4.10.3 (WCAG 2 A/AA) and keyboard path checked; no screen-reader session |
| Ready for owner review | Yes |
| Ready to publish | Published on 24 October 2026 at Murat's go-ahead. Open: optionally one LTBeam run with an intermediate restraint |

## Commands and observed results

- `npm test`: 11 files, 82 tests passed (includes 14 LTB tests, 5 linear algebra, 4 sections, 3 geometry).
- `npm run build`: passed; postbuild wrote 10 pages and a sitemap with 9 URLs. The warning about the three.js chunk being over 500 kB is also there on the base commit (the chunk is shared and loads lazily).
- `python3 -I docs/verification/beam-twist/ltb_check.py` (NumPy 2.5.3, SciPy 1.18.1): output in `ltb_check.out.txt`.

### IPE 300, L = 6 m, E = 210 000 N/mm², G = 80 769 N/mm² (properties from the nominal dimensions)

| Case | Browser FE (n = 40) | Ritz, 30 terms | NumPy FE |
|---|---|---|---|
| Uniform moment | 90.426 kNm (closed form 90.426) | 90.426 | 90.426 |
| Uniform load, top / center / bottom flange | 78.779 / 102.259 / 132.636 | same to 0.001 % | 78.779 / 102.259 / 132.636 |
| Point load, top / center / bottom | 89.140 / 123.064 / 168.894 | ≤ 0.001 % apart | 89.140 / 123.064 / 168.894 |
| Uniform load, top-flange restraint at midspan | 335.955 | 335.954 | 335.955 |
| Uniform moment, full restraint at midspan | 251.091 | | closed form at L/2: 251.091 |

- κ → 0 (Iw × 10⁻⁶): equivalent ratios 1.1266 and 1.3477 against SN003 Table 3.2's 1.127 and 1.348. At the real κ = 0.045
  they are 1.131 and 1.361, so the tool labels the ratio "Equivalent Mcr ratio (not a general C1 factor)".
- SN003's C1–C2 formula against the FE: uniform load within 0.5 % at all three heights; point load −4.2 % (top), −1.0 %
  (center), +3.0 % (bottom), within the approximation of the tabulated factors.
- Mesh: n = 40 and n = 80 differ by 1 × 10⁻⁷ (relative).
- Eurocode hand calculation (in `ltb.test.ts`): λ̄LT = 1.477, ΦLT = 1.501, χLT = 0.437, Mb,Rd = 97.5 kNm, Mpl,Rd = 223.1 kNm.
- The Lanczos solve against a dense Householder–QL decomposition: 100 random cases (all sections, spans, loads, heights,
  0–4 restraints of each type) agree to 10⁻⁹.
- Section properties from the nominal dimensions against the ArcelorMittal catalog, all 56 sections: A, Iy, Iz, Wel, Wpl
  within 0.6 % (the catalog's rounding), It within 0.33 %, Iw within 1.1 % (IPE 100, printed as 0.35). Class in bending
  matches the catalog for every section and grade it lists.

### Published LTBeamN results (fork supports, E = 210 GPa, G = 81 GPa, the papers' section properties)

LTBeam is a Windows program (CTICM) and cannot run in this container, so the check uses results its authors published.
Our G is 80 769 N/mm², so It is scaled to the papers' G·It. Kept as a test in `ltb.test.ts`.

| Case | Source | LTBeamN | This tool's solver | Difference |
|---|---|---|---|---|
| IPE 300 (Iz 604 cm⁴, It 20.7 cm⁴, Iω 125 900 cm⁶), L = 5 m, central point load on the top flange | [Piotrowski and Szychowski 2022](https://doi.org/10.3390/ma15041275), Table 6, κω = κν = 0 | 111.19 kNm | 111.19 kNm | 0.00 % |
| IPE 500 (Iz 2141.7 cm⁴, It 89.006 cm⁴, Iω 1 254 300 cm⁶), L = 8 m, central point load at the shear center | [Materials 19, 120 (2026)](https://doi.org/10.3390/ma19010120), Table 8, κ = 0 | 380.89 kNm | 380.67 kNm | −0.06 % |
| Same beam, uniform load at the shear center | same, Table 8 | 316.26 kNm | 316.24 kNm | −0.01 % |

With the tool's own IPE 300 (It = 20.12 cm⁴ from the nominal dimensions, matching the ArcelorMittal catalog's 20.1)
and G = 80 769 N/mm², the first case gives 109.87 kNm (−1.2 %): the difference is the input data, not the solver.

### Sign of the moment term in Kg (a correction to the reviewed spec)

With the spec's own convention (positive φ turns the top flange towards −y, so a fibre at height z moves v − zφ) and
sagging moments positive, the bending stress σ = −Mz/Iy gives Π₂ ⊃ −λ∫M v″φ dx, so Kg = **+**∫M(BvᵀNφ + NφᵀBv). The spec
writes −∫M(…). The sign does not change any unrestrained Mcr, but it decides which flange the "top flange" restraint
holds: with the spec's sign, a midspan top-flange restraint gives 119.4 kNm (the value for a tension-flange restraint)
instead of 336.0 kNm. Tests now check that the compression flange sways more (1.00 against 0.28) and that holding it
beats holding the tension flange.

### Timing (solveLtb: assembly, eigen solve, mode)

| Where | Median | p95 |
|---|---|---|
| Node 22, this container (Xeon 2.1 GHz) | 1.8 ms | |
| Headless Chromium, no throttling | 1.7–1.9 ms | 3–7 ms |
| Chromium, CPU throttled × 4 | 7.6–8.6 ms | 11–14 ms (one outlier at 44 ms) |
| Chromium, CPU throttled × 6 | 11.6–13.4 ms | 18–24 ms |

The solve stays on the main thread (the spec asks for a worker above 16 ms). Not measured on a real phone.

### Browser checks (`vite preview` of the production build)

- First load at 1280 × 800: the results above; 0 frames rendered over 2 s while idle.
- "Load it": frames only during the 2.4 s ramp; 0 frames in the 1.5 s after it; the button becomes "Reset load".
- Guide steps: Mcr 102 → 78.8 kNm (top flange) → 301 kNm (midspan restraint, two half-waves) → 3 866 kNm (HEB 300).
- Reduced motion: "Load it" jumps to the end, one frame.
- No WebGL2 (`getContext("webgl2")` forced to null): the fallback message and the cross-section; numbers unchanged.
- Dragging a restraint in 3D: Mcr updates during the drag (336 → 250 kNm); the link updates on release (`r1=0.73`).
  The keyboard sliders change the same setting.
- 375 × 812 with touch: no horizontal scroll; every button, select and slider at least 44 px tall.
- No console errors or warnings in any run.
- axe-core: one finding, `scrollable-region-focusable` on the citation `<pre>` of the shared ToolShell. It is on every
  tool page and was left alone.

## Deviations from the spec, and why

1. **Kg sign** of the moment term, above.
2. **Section properties are computed from the nominal dimensions** (fillets exact; It in the Roark-type form that reproduces
   the catalog; Iw = Iz(h − tf)²/4, SCI P385) rather than copied from the catalog. This removes the open question of
   permission to reproduce catalog values; the tests keep five catalog rows as fixtures.
3. **Eigen solver**: banded Cholesky and Lanczos with full reorthogonalization, then inverse iteration and a Rayleigh
   quotient, instead of the specified dense Jacobi solve. A dense Householder–QL solve measured a 12 ms median here;
   it is kept for dense problems and as the test reference.
4. **Mode normalization**: the larger of the two flange displacements is 1 (the spec mixed v + (h/2)φ and v − ztop φ).
5. **Drawn size**: peak flange sway L/20 × amp/2 as specified, but the twist is capped at 30° × amp/2 (75° at most), since
   at L/20 an IPE would turn by more than 90°. Reduced motion shows the full drawn size (the spec said 0.9).
6. **3D kit**: only what this tool needs (`stage.ts` with lights and ground, `controls.tsx`, `isection.ts`, `support.tsx`).
   Context antialiasing instead of an MSAA render target. Restraint struts have an invisible, thicker twin for picking.
7. **Not done from the shared spec**: moving the truss tool's Cholesky into `la/dense.ts` (it would touch an existing tool),
   `banded.ts`, `generalizedEig`, instancing, picking, hatch and PNG helpers. These come with the tools that need them.
8. **Build**: `@types/three@0.176.0` added as a dev dependency (types only); a `fade-in` keyframe added to Tailwind for the
   step caption.
9. The "Drawn ×" slider for `amp` sits under the 3D view; the spec did not place it.

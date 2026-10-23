# Handoff: shared foundations

Build these first. Each module has its own unit tests. Nothing here changes how existing tools look; the two
refactors (`ga.ts` and the chart helpers) must leave the truss tool pixel-identical.

## 1. Steel sections: `src/tools/steel/sections.ts`

**Purpose:** one table of European hot-rolled I-sections with computed properties, used by the twisting-beam tool,
the surrogate frame and the chord.

- **Series:** IPE 80–600, HEA 100–600, HEB 100–600.
- **Input data, per section:** `name`, `h`, `b`, `tw`, `tf`, `r` in mm. Transcribe them from a free manufacturer
  catalog (e.g. ArcelorMittal's sections sales programme) and cite it in a comment. EN 10365 is the standard, but it is
  sold and must not be copied.
- **Computed, per section (mm-based units):**
  - `A` (with root fillets: A = 2·b·tf + (h − 2tf)·tw + (4 − π)·r²);
  - `Iy`, `Iz`, `Wel_y`, `Wpl_y`, `Wel_z`, `Wpl_z`;
  - `It` (with the fillet contribution);
  - `Iw` = Iz·(h − tf)²/4;
  - `mass` in kg/m (ρ = 7850 kg/m³).
  - Use the catalog's published formulas for the fillet terms.
- **API:**
  ```ts
  export interface ISection { name: string; series: "IPE" | "HEA" | "HEB"; h: number; b: number; tw: number; tf: number; r: number;
    A: number; Iy: number; Iz: number; Wel_y: number; Wpl_y: number; Wel_z: number; Wpl_z: number; It: number; Iw: number; mass: number }
  export const SECTIONS: ISection[];               // ordered by series, then h
  export const bySeries: (s: ISection["series"]) => ISection[];
  export const find: (name: string) => ISection | undefined;   // "IPE 300", case-insensitive, space optional
  export function classInBending(s: ISection, fy: number): 1 | 2 | 3 | 4;   // EN 1993-1-1 Table 5.2, rolled flange outstand + web in bending
  ```
- **Steel constants:** E = 210 000 N/mm², G = 81 000 N/mm², ν = 0.3 (EN 1993-1-1, 3.2.6). fy is 235, 355 or 460 N/mm²
  for t ≤ 40 mm (Table 3.1). Every section here has tf ≤ 40 mm; assert it.
- **Tests:**
  - A, Iy, Iz and Wpl_y within 1 % of the catalog for all sections;
  - It within 3 %;
  - Iw within 1 % where the catalog lists it;
  - the classification of a few known cases (e.g. a class 1 IPE in S355; check one HEA in S460 by hand);
  - `find` tolerates "ipe300".

## 2. 3D kit: `src/tools/three/`

**Purpose:** one way to set up three.js for tools, so every 3D tool is fast, accessible and cleans up after itself.
It follows the laser band's lessons (`src/lab/laser/mount.js`).

| File | Exports | Notes |
|---|---|---|
| `stage.ts` | `createStage(canvas, opts) → Stage` | `WebGLRenderer({ antialias: false, powerPreference: "high-performance" })`; MSAA through a render target (samples 2 on phones, 4 on desktop); DPR `min(devicePixelRatio, coarse ? 1.5 : 1.75)`; `ColorManagement` left at the three default; background `canvas` (#F6F7F5) |
| `stage.ts` | `Stage.requestRender()` | One rAF flag: many calls in one frame make one render. No loop |
| `stage.ts` | `Stage.animate(fn, ms)` | A loop that runs only for the given duration (transitions), then stops |
| `stage.ts` | visibility | `IntersectionObserver` and `visibilitychange` cancel pending frames and pause `animate` |
| `stage.ts` | `Stage.dispose()` | Traverses the scene; disposes geometries, materials, textures, render targets and the renderer; removes listeners |
| `lights.ts` | `addStandardLights(scene)` | `HemisphereLight` (sky #FFFFFF, ground #819199, 1.0) plus one `DirectionalLight` (#FFFFFF, 1.6, from upper left front). A fixed count, so shaders never recompile. No shadows |
| `ground.ts` | `groundDisc(radius)` | A soft radial-gradient disc texture under the model, instead of shadows |
| `controls.ts` | `orbit(stage, camera, opts)` | `OrbitControls` from `three/addons/controls/OrbitControls.js`; damping off (simpler on-demand rendering); limits on zoom and polar angle; `change` → `requestRender` |
| `controls.ts` | `<OrbitButtons>` (React) | Rotate left and right (±15°), zoom in and out, reset, each a 36 px (44 px on coarse pointers) `.btn`, `aria-label`s "Rotate left" and so on. The keyboard path for the 3D view |
| `isection.ts` | `iSectionShape(h, b, tw, tf)` | A 12-vertex outline (no fillets), centered on the shear center; `extrudeMember(shape, length)` → `BufferGeometry` along +x |
| `isection.ts` | `deformedMember(shape, n, at: (s) => { dx, dy, dz, rx })` | n slices, each moved and rotated, for the twisting beam (CPU update of the position attribute) |
| `instancing.ts` | `memberMesh(geometry, material, count)` | `InstancedMesh`, with `setMatrixAt` from end points (start, end, roll) and `setColorAt` for state |
| `pick.ts` | `picker(stage, camera, meshes)` | Raycaster; returns `{ mesh, instanceId }`; on coarse pointers a tap counts only if the finger moved < 8 px |
| `hatch.ts` | `hatchTexture()` | A small canvas texture with 45° stripes (ink on canvas), for "unsure" and "over" states |
| `png.ts` | `exportPng(stage, name)` | One render at 2× DPR to a canvas, then a download |
| `support.ts` | `hasWebGL2()` and `<No3D>` | The fallback: a short message plus the tool's 2D view or a static SVG |

- **Performance budgets:**
  - at most 100k triangles on phones;
  - one draw call per member type (instancing);
  - no post-processing;
  - 0 frames while idle.
- **Tests (vitest, node):** `iSectionShape` gives 12 points, closed, symmetric. `deformedMember` with a zero
  deformation equals the straight extrusion. The rest is checked in the browser.

## 3. Linear algebra: `src/tools/la/`

| File | Exports | Notes |
|---|---|---|
| `dense.ts` | `cholesky(A, n)`, `cholSolve(L, b)` | Float64Array, row-major, lower triangle; throws `NotPositiveDefinite(pivotIndex)` below a relative pivot tolerance |
| `banded.ts` | `bandCholesky(A, n, bw)`, `bandSolve` | For frames with node numbering floor by floor (bandwidth about 6 × nodes per floor) |
| `eig.ts` | `jacobiEig(S, n) → { values, vectors }` | Symmetric; sorted ascending; for n ≤ 200 |
| `eig.ts` | `generalizedEig(K, M, n)` | Cholesky of M, reduction to a standard symmetric problem, Jacobi, back-transformation; vectors normalized so that φᵀMφ = 1 |
| `eig.ts` | `bucklingEig(Ke, Kg, n)` | The smallest positive λ of (Ke − λ·Kg)·x = 0: Cholesky of Ke, eigenvalues μ of L⁻¹·Kg·L⁻ᵀ, λ = 1/μ for the largest positive μ; returns λ and x |

- **Move, don't copy:** the Cholesky in `truss-sizing/truss.ts` moves into `dense.ts`, and the truss imports it. The
  truss tests must still pass unchanged.
- **Tests:**
  - solve a 3 × 3 SPD system against a known answer;
  - the banded solve equals the dense solve on a random SPD band matrix;
  - Jacobi's eigenvalues of a 2 × 2 match the closed form, and the vectors are orthonormal;
  - the generalized problem on a two-DOF spring-mass chain matches the closed form;
  - `bucklingEig` on a pinned Euler column with 20 beam elements gives π²EI/L² within 0.5 %.

## 4. Gaussian process: `src/tools/ml/gp.ts`

- **Model:** zero-mean GP on centered outputs (the mean of y added back); Matérn 5/2 kernel with one length scale per
  input (ARD), a signal variance σf² and a noise variance σn². σn² is at least 1e-8·σf² (deterministic FE output plus a
  jitter).
- **Inputs:** scaled to [0, 1] by the caller. Outputs: transformed by the caller (log for positive quantities).
- **Fit:** maximize the log marginal likelihood (Rasmussen and Williams 2006, eq. 2.30) over log-parameters with
  multi-start (8 starts, seeded) and Adam on the analytic gradient. Bounds: length scale 0.05–5, log σf² ± 6 around
  log var(y), σn² 1e-8–1e-1 relative.
- **API:**
  ```ts
  export interface GP { predict(x: number[]): { mu: number; sd: number }; loo(): { mu: number[]; sd: number[] }; params: { ell: number[]; sf2: number; sn2: number }; lml: number }
  export function fitGP(X: number[][], y: number[], opts: { seed: number; restarts?: number }): GP;
  ```
- **Leave-one-out:** in closed form (R&W eq. 5.12): μ₋ᵢ = yᵢ − [K⁻¹y]ᵢ / [K⁻¹]ᵢᵢ, σ²₋ᵢ = 1 / [K⁻¹]ᵢᵢ.
- **Tests:**
  - a GP on noiseless samples of sin(2πx) at 8 points predicts the samples within 1e-4, with sd < 1e-3 there;
  - the closed-form LOO equals brute-force refits with fixed hyperparameters;
  - the marginal-likelihood gradient matches finite differences (relative error < 1e-4);
  - fitting is deterministic for a given seed.

## 5. Small neural network: `src/tools/ml/mlp.ts`

- **Model:** dense layers; activations `tanh` or `linear`; Xavier initialization from the seeded RNG; mean-squared-error
  loss; Adam (β1 0.9, β2 0.999, ε 1e-8); mini-batches with seeded shuffling.
- **API:**
  ```ts
  export function createMLP(sizes: number[], acts: ("tanh" | "linear")[], seed: number): MLP;
  interface MLP { forward(x: Float64Array): Float64Array; encode(x: Float64Array, layer: number): Float64Array; trainEpoch(X: Float64Array[], lr: number, batch: number): number; params(): Float64Array }
  ```
- **Tests:**
  - the backpropagation gradient matches finite differences on a 3–4–2–4–3 network (relative error < 1e-5);
  - a 2–8–1–8–2 autoencoder learns points on a line to a loss under 1e-4;
  - training is deterministic for a given seed.

## 6. Sampling and random numbers

- **RNG:** move `mulberry32` from `truss-sizing/ga.ts` to `src/tools/rng.ts`, re-exported from `ga.ts` so imports don't
  break. Add `normal(rng)` (Box–Muller) and `shuffle(rng, arr)`.
- **`src/tools/ml/lhs.ts`:** `lhs(n, d, rng) → number[][]` in [0, 1)ᵈ, one sample per stratum per dimension (McKay et
  al. 1979).
  - Test: each dimension has exactly one point in each of the n strata.

## 7. GA: change to `src/tools/truss-sizing/ga.ts`

- `Problem.ub` accepts `number | number[]` (one upper bound per variable). Index-wise bounds are used in crossover,
  mutation and rounding.
- The truss tool passes a number, as now.
- **Tests:** the existing GA tests pass. A new test with `ub = [3, 9]` never produces values out of bounds.

## 8. Carbon factors: `src/tools/carbon/` and `scripts/carbon-factors.js`

Used by the carbon calculator, and optionally by the surrogate frame (steel mass to kgCO2e).

- **Source:** ÖKOBAUDAT, the EN 15804+A2 release, as a CSV download from oekobaudat.de. BMWSB provides it free of charge
  and without restrictions; keep the attribution anyway.
  - **Verify** the current terms on the site at build time.
  - Do not use the ICE database: embedding it in a tool needs Circular Ecology's Tools and Integration licence.
- **Pipeline:** `scripts/carbon-factors.config.json` lists the chosen datasets by UUID, with our id, label and density;
  Murat chooses the UUIDs. `npm run carbon-factors` reads the downloaded CSV (path as an argument, the file kept outside
  the repository) and writes `public/data/carbon-factors.json`.
- **Entry schema:**
  ```ts
  interface Factor {
    id: string;                 // "steel-sections-eaf"
    label: string;              // "Steel sections, hot-rolled (EAF route)"
    group: "steel" | "concrete" | "rebar" | "timber" | "other";
    unit: "kg";                 // every factor per kg; density converts m³
    density?: number;           // kg/m³, for volume input
    a1a3: number;               // kgCO2e/kg, GWP-fossil + GWP-luluc, A1–A3
    biogenic?: number;          // kgCO2e/kg, GWP-biogenic A1–A3 (negative for timber); reported apart
    c3c4?: number;              // kgCO2e/kg if declared; else the calculator's default applies
    d?: number;                 // kgCO2e/kg if declared; reported apart
    wasteRate: number;          // default WR for A5w (IStructE Table 2.6)
    source: { name: string; uuid?: string; version: string; validUntil?: string; url: string; license: string };
  }
  ```
- **Initial set, for Murat to fill with UUIDs:**
  - steel sections (EAF), steel sections (BOF or average), steel hollow sections;
  - reinforcing steel;
  - ready-mixed concrete C25/30, C30/37, C35/45 and C40/50 (with a CEM III option if available);
  - precast hollow-core slab;
  - composite steel decking;
  - glued-laminated timber, CLT.
  - Reused steel sections: a separate entry from a reuse EPD (candidate: International EPD System, "Reusable steel",
    environdec 6356; **verify**), or user-defined until then.
- **Tests:** the script on a small fixture CSV gives the expected JSON; the schema is validated at load; a missing
  required field fails the build.

## 9. Audio: `src/tools/audio/partials.ts` (the chord)

- `synthesize(partials: { f: number; a: number; tau: number }[], seconds, sampleRate) → Float32Array`:
  - a sum of a·sin(2πft)·e^(−t/τ);
  - a 5 ms linear attack;
  - normalized to a −12 dBFS peak.
- `play(ctx, buffer, gain)` → `AudioBufferSourceNode`. One shared `AudioContext`, created on the first user gesture and
  resumed on later gestures.
- **Test:** the FFT of a synthesized buffer (reuse `vibrometer/signal.ts`: `spectrum`, `peaks`) finds the partials
  within one bin.

## 10. Chart helpers: `src/tools/chart.ts`

- Move `ticks`, `useBox`, `mix`, `grey` and `shade` out of `TrussSizing.tsx` (no visual change).
- Add `axis()` for SVG axes: hairline `rule` axes, `t-small` `ink-2` labels, tabular figures.
- Charts stay hand-written SVG, as in the existing tools. No chart library.

## References

- EN 1993-1-1:2005: 3.2.6 (E, G), Table 3.1 (fy), Table 5.2 (classification).
- McKay, Beckman and Conover (1979). Technometrics 21(2), 239–245.
- Rasmussen and Williams (2006). Gaussian processes for machine learning. MIT Press (eqs. 2.30, 5.12).
- ÖKOBAUDAT data-user terms, oekobaudat.de (retrieved 2026-10-23).
- three.js manual, "Rendering on demand"; three.js WebGL2-only since r163.

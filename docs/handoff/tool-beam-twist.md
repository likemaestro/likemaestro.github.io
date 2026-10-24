# Handoff spec: Why steel beams twist

## Overview

- **Value proposition:** For steel design students, their teachers and young engineers who struggle to picture
  lateral-torsional buckling (LTB), it is a 3D steel beam that shows the buckled shape and the Eurocode numbers as you
  change the section, the span, the load, the load height and the restraints. Unlike textbook figures and desktop Mcr
  programs, it shows *why* in one minute, on any device.
- **The visitor's job:** understand LTB, and read Mcr and Mb,Rd for a simple case. Pain: Mcr and the C1 factors feel
  abstract. Gain: watching a midspan restraint change the mode, with numbers that match a hand calculation.
- **In scope:**
  - doubly symmetric rolled IPE, HEA and HEB; simple span with fork supports;
  - uniform moment, uniform load or central point load, at the top flange, the shear center or the bottom flange;
  - 0–4 discrete restraints;
  - elastic Mcr by FE;
  - χLT and Mb,Rd by EN 1993-1-1, 6.3.2.3.
- **Out of scope:** monosymmetric sections, cantilevers, continuous beams, warping restraint at supports, distortional
  and local buckling, post-buckling, National Annex values.

## Route and registry

| Field | Value |
|---|---|
| Path | `/tools/beam-twist` |
| Slug (ToolShell, code folder) | `beam-twist` → `src/tools/beam-twist/` |
| Title | Why steel beams twist |
| Line (`pages.json`, ≤ 150 characters) | Load a steel beam and watch it swing sideways and twist: lateral-torsional buckling in 3D, with Mcr and the Eurocode resistance. |
| Group | Structures |
| `methodRef` | `{ label: "NCCI SN003", href: "https://www.steelconstruction.info/images/0/0f/SN003b.pdf" }` |

## Files

- `BeamTwist.tsx`: the page.
- `ltb.ts`: FE, eigenproblem, Eurocode; pure, testable.
- `ltb.test.ts`.
- `Beam3D.tsx`: the three.js view, from the 3D kit.
- `Insets.tsx`: the cross-section and the χLT curve in SVG.

## Model (`ltb.ts`)

**Units inside:** N, mm. Displayed: kNm, m.

**Section and material:** from `steel/sections.ts`; E = 210 000, G = 81 000 N/mm²; fy from the grade (all tf ≤ 40 mm).

**Discretization:**
- n = 40 equal elements, nodes 0…n.
- DOF per node: v (lateral displacement of the shear center), v′, φ (twist), φ′.
- Hermite cubic shape functions for v and φ, so 8 DOF per element and 164 DOF in total.

**Second variation of the total potential (doubly symmetric beam, prebuckling deflections ignored):**

δ²Π = ∫ (EIz·v″² + GIt·φ′² + EIw·φ″²) dx + 2∫ My(x)·φ·v″ dx − ∫ q(x)·zg·φ² dx − Σ P·zg·φ(xP)²

- My(x) is the in-plane moment from the reference load (λ = 1).
- zg is the load height above the shear center: +h/2 for the top flange, 0 for the shear center, −h/2 for the bottom
  flange. A positive zg (gravity load above the shear center) is destabilizing.
- The first integral gives Ke. The other terms, linear in the load factor λ, give Kg, so (Ke − λ·Kg)·d = 0.
- Integrate with 4-point Gauss per element.
- **Sign check by test:** a top-flange load must give a lower Mcr than a shear-center load.

**Reference loads (λ = 1):**
- uniform moment: My = 1 kNm along the span;
- uniform load: q = 1 kN/m, so My = qx(L − x)/2;
- point load: P = 1 kN at midspan.
- The reported Mcr is λ·max|My|.

**Supports and restraints:**
- **Fork supports:** v = φ = 0 at x = 0 and x = L. v′ and φ′ are free (warping free).
- **Restraint type "top":** the top flange is held laterally: v + (h/2)·φ = 0 at the restraint, a penalty spring
  k = 1e6·max(diag Ke) along that combination.
- **Restraint type "full":** v = 0 and φ = 0 at the restraint (penalty).
- **Placement:** each restraint snaps to the nearest node.

**Eigenproblem:** `la/eig.bucklingEig(Ke, Kg)`, giving λcr and the mode d. Normalize the mode so that the maximum
top-flange lateral displacement, |v + (h/2)·φ|, equals 1.

**Eurocode (EN 1993-1-1):**
- **Class:** from `classInBending`. Wy = Wpl,y for class 1–2, Wel,y for class 3. Class 4 shows "Class 4: outside this
  tool" and hides Mb,Rd.
- λ̄LT = √(Wy·fy / Mcr).
- **6.3.2.3 (rolled sections), recommended values:**
  - λ̄LT,0 = 0.4, β = 0.75;
  - curve b (αLT = 0.34) if h/b ≤ 2, curve c (αLT = 0.49) if h/b > 2 (Table 6.5);
  - ΦLT = 0.5·[1 + αLT·(λ̄LT − λ̄LT,0) + β·λ̄LT²];
  - χLT = min(1, 1/λ̄LT², 1 / (ΦLT + √(ΦLT² − β·λ̄LT²)));
  - the modification factor f is not used (conservative; said under Limits).
- Mb,Rd = χLT·Wy·fy / γM1, with γM1 = 1.0. Mpl,Rd (or Mel,Rd) = Wy·fy / γM0, with γM0 = 1.0.
- **6.3.2.2(4):** if λ̄LT ≤ 0.4, show "Short enough: lateral-torsional buckling can be ignored (EN 1993-1-1, 6.3.2.2(4))".
- **Equivalent C1 (teaching readout):** Mcr divided by the uniform-moment closed form at the same span and section,
  shown as "C1 ≈ 1.13".

## Settings (URL, `useToolParams`)

| Key | Kind | Values or range | Default | Note |
|---|---|---|---|---|
| `sec` | enum | all IPE, HEA, HEB names, without spaces (`IPE300`) | `IPE300` | Shown as "IPE 300" |
| `L` | num | 2–12, step 0.1 (m) | 6 | |
| `grade` | enum | `S235`, `S355`, `S460` | `S355` | |
| `load` | enum | `moment`, `udl`, `point` | `udl` | |
| `zg` | enum | `top`, `centre`, `bottom` | `centre` | Disabled (and ignored) for `moment` |
| `nr` | num | 0–4, step 1 | 0 | Number of restraints |
| `r1`…`r4` | num | 0.05–0.95, step 0.01 (share of L) | k/(nr + 1) | Only the first `nr` are read |
| `rt` | enum | `top`, `full` | `top` | Restraint type |
| `amp` | num | 1–5, step 0.5 | 2 | Display exaggeration; never changes numbers |

## Layout

- **Above `lg` (≥ 1024 px):** the truss tool's grid, `lg:grid-cols-[minmax(0,1fr)_19rem]`.
  - **Left (stage):** a 3D canvas, height `clamp(18rem, calc(100svh - 24rem), 34rem)`. Over it, top right, the
    `OrbitButtons` in a row. Below it, a `t-small` caption line with the state text: "Mcr = 182 kNm. The beam sways
    and twists in one half-wave."
  - **Right (panel, `lg:pl-6`, `border-l border-rule` from lg):**
    1. Results (`t-data`, two columns `grid-cols-[auto_1fr]`):

       | Label | Value |
       |---|---|
       | Mcr | e.g. 182 kNm |
       | C1 (equivalent) | e.g. ≈ 1.13 |
       | λ̄LT | |
       | Curve | b |
       | χLT | |
       | Mb,Rd | |
       | Mpl,Rd | |
       | Section class | |

    2. The sentence "What twisting costs you: Mb,Rd is 64 % of Mpl,Rd."
    3. The insets: the midspan cross-section (`aspect-square`, 9rem), then the χLT curve (`h-40`).
- **Toolbar above the grid** (`flex flex-wrap items-end gap-x-6 gap-y-3 pb-4`):
  - Section: a `<select>`, grouped by series, styled `t-data h-9 rounded-[2px] border border-rule bg-transparent px-2
    [@media(pointer:coarse)]:h-11`;
  - Span: a range with an output;
  - Grade: `Segmented`, 3 options;
  - Load: `Segmented` (Moment / Uniform / Point);
  - Load height: `Segmented` (Top / Centre / Bottom);
  - Restraints: `Segmented` (0–4), with Type: `Segmented` (Top flange / Full);
  - the primary button `btn btn-solid` "Load it" (it becomes "Reset load" after the ramp).
- **Guide row** (above the toolbar, `t-small`): four step chips as `.btn` — "1 Load it", "2 Top or bottom flange",
  "3 Add a restraint", "4 IPE or HEB". Each sets the settings below and shows a one-sentence caption under the row:

  | Step | Sets | Caption |
  |---|---|---|
  | 1 | `IPE300`, 6 m, `udl`, `centre`, 0 restraints, then plays "Load it" | "A beam bends, and then it leaves its plane." |
  | 2 | `zg = top` | "A load on the top flange pulls it over sooner: Mcr drops." |
  | 3 | `nr = 1`, `r1 = 0.5`, `rt = full` | "A midspan restraint forces two half-waves: Mcr jumps." |
  | 4 | `HEB300`, others as in step 3 | "Wide flanges resist twisting: compare Mcr with the IPE." |

| Breakpoint | Changes |
|---|---|
| ≥ 1280 (`xl`) | As above; the panel can be `xl:grid-cols-[minmax(0,1fr)_21rem]` |
| 1024–1279 (`lg`) | As above |
| 640–1023 (`sm`–`md`) | One column: the stage (height `clamp(16rem, 55svh, 28rem)`), then the results as two columns, then the insets side by side; the toolbar wraps |
| < 640 | One column; the toolbar becomes stacked `Field`s at full width; the step chips scroll horizontally (`overflow-x-auto`, snap); the orbit buttons go below the canvas |

## 3D view (`Beam3D.tsx`)

- **Scene:** a beam along +x, centered; the camera at azimuth 35°, elevation 25°, framing the whole beam with a 10 %
  margin; standard lights; a ground disc.
- **Beam:**
  - `deformedMember` with 60 slices;
  - material `MeshStandardMaterial({ color: steel #819199, metalness 0.2, roughness 0.6 })`;
  - the undeformed beam as a 1 px `rule` line outline (`EdgesGeometry` at 30°, `LineBasicMaterial` #CBD2D5).
- **Deformation shown:** each slice is translated laterally by s·v(x) and rotated by s·φ(x) about the shear center.
  s is chosen so the top-flange peak equals (L/20)·(amp/2). The label "Deformation × amp, illustrative" sits in the
  stage caption.
- **Supports:** at each end, a fork drawn as two short vertical plates beside the web (ink, 2 mm).
- **Loads:** ink arrows (ArrowHelper or an instanced cone + cylinder):
  - `udl`: 9 arrows along the span;
  - `point`: one at midspan;
  - each at the chosen height (above the top flange for top, at mid-depth beside the web for centre, under the bottom
    flange for bottom);
  - `moment`: two curved arrows at the ends (a tube along an arc).
- **Restraints:** small struts from the top flange (for `full`, from both flanges) to a ground-fixed point, in ink;
  draggable along x when picked; the picked restraint in `laser`.
- **Reduced motion:** the deformed shape is shown at 0.9·Mcr amplitude, with no ramp.

## States and interactions

| Element | State | Behavior |
|---|---|---|
| Page | First load | The example (IPE 300, 6 m, uniform load at the shear center); the solve runs synchronously (< 20 ms); the 3D view loads lazily; until it does, the stage shows the cross-section inset at full size and "Loading the 3D view…" in `t-small` |
| Any setting | Change | Re-solve (< 20 ms on a phone; on the main thread); update results, insets and the 3D view; `requestRender` once |
| "Load it" | Click | Animate the load factor from 0 to 0.98 over 2400 ms, `easeInOutCubic`. Amplitude = e0 / (1 − M/Mcr), with e0 = L/1000 times the display scale. At the end, a label beside the beam: "Mcr reached: the beam buckles. What happens after is not modeled." The button becomes "Reset load" |
| "Load it" | Reduced motion | No ramp: jump to the end state |
| Restraint (3D) | Hover (fine pointer) | Cursor `grab`; strut outline in `ink-2` |
| Restraint (3D) | Drag | The strut follows x along the beam, snapped to nodes (0.05–0.95 L); re-solve during the drag at most every 50 ms; the URL updates on release |
| Restraint (keyboard) | Focus | A range input per restraint in the panel under "Restraints" (visible when nr > 0), the same values |
| Load height | `load = moment` | `Segmented` disabled, with a `Tip`: "Load height has no effect under uniform moment." |
| Class 4 | Section in S460 or a slender web | Results show "Class 4: outside this tool"; Mb,Rd hidden; the 3D view still shows the Mcr mode |
| λ̄LT ≤ 0.4 | Short beam | The "Short enough" sentence replaces "What twisting costs you" |
| No WebGL2 | | `<No3D>`: "Your browser can't show the 3D view; the numbers and the cross-section still work." The cross-section inset fills the stage |
| Clamped link | | The ToolShell-style note listing the adjusted keys |

## Edge cases

- **The longest section name,** "HEB 600" in a select: fits in 8rem.
- **λ̄LT very large** (12 m IPE 80): χLT is tiny. Show Mb,Rd with 3 significant figures; never 0.
- **Two restraints on the same node:** merge them silently (the second is ignored), and list "Restraints 2 and 3 share
  a position" in `t-small`.
- **`nr` reduced:** the extra `r` keys stay in the URL but are ignored.
- **Numbers:** kNm with 3 significant figures; λ̄ and χ with 2 decimals; percentages as integers.

## Motion

| Element | Trigger | Animation | Duration | Easing |
|---|---|---|---|---|
| Beam deformation | "Load it" | Amplitude grows by 1/(1 − M/Mcr) | 2400 ms | easeInOutCubic on the load factor |
| Beam deformation | A setting changes | The new mode replaces the old with no tween | 0 | n/a |
| Step caption | A chip is clicked | Opacity 0 → 1 | 150 ms | ease-out |
| Camera | Reset button | Lerp to the default view | 300 ms | ease-out; instant under reduced motion |

## Accessibility

- **Focus order:**
  1. step chips;
  2. toolbar (section, span, grade, load, height, restraints, type, Load it);
  3. orbit buttons;
  4. restraint sliders;
  5. results;
  6. ToolShell links.
- **Canvas:** `role="img"`, `aria-label` e.g. "IPE 300, 6 m span, uniform load at the shear center. Buckled shape:
  one half-wave, sway and twist. Mcr 182 kilonewton meters."
- **Live region:** results in `aria-live="polite"`, announcing "Mcr 182 kilonewton meters, χLT 0.64" after a change
  (debounced 400 ms).
- **Insets:** `role="img"` with text equivalents. The χLT curve label reads "Current point: slenderness 0.92, reduction
  0.64".
- **Contrast:** steel on canvas is decorative; every number is `ink` or `ink-2` on `canvas`.

## Performance

- The solve runs on the main thread: 164 DOF, < 20 ms on a mid-range phone (measure; if it is over, move it to a
  worker).
- **3D:** about 60 × 12 × 2 triangles for the beam plus the arrows, well under budget. Rendering on demand; the "Load it"
  ramp is the only loop.

## Copy (drafts for Murat)

- **Method:** "The beam is divided into 40 finite elements with lateral displacement and twist at each node. The
  critical moment Mcr is the lowest eigenvalue of the elastic stability problem, including the height of the load
  above or below the shear center (after Trahair). The design resistance follows EN 1993-1-1, 6.3.2.3, for rolled
  sections with the recommended values."
- **Assumptions and limits:**
  - "Doubly symmetric rolled sections, simply supported with fork supports, elastic; no local or distortional
    buckling, no web openings, no post-buckling."
  - "Restraints are discrete. 'Top flange' holds the top flange sideways; 'Full' holds sideways movement and twist."
  - "Recommended values, not a National Annex; the factor f of 6.3.2.3(2) is not used."
  - "For design, check with software such as LTBeam (CTICM)."
- **Cite:** generated by ToolShell.

## Tests (`ltb.test.ts`)

| Test | Expected |
|---|---|
| Uniform moment, IPE 300, L = 6 m, no restraint | Mcr = (π/L)·√(EIz·GIt)·√(1 + π²·EIw/(L²·GIt)), within 0.5 % |
| Uniform load at the shear center | Mcr / Mcr,uniform-moment = 1.127 ± 0.01 (NCCI SN003, C1 for k = 1) |
| Central point load at the shear center | ratio 1.348 ± 0.01 (NCCI SN003) |
| Load height | Mcr(top) < Mcr(centre) < Mcr(bottom) for the uniform and point loads |
| Full restraint at midspan, uniform moment | Mcr equals the closed form at L/2, within 1 % |
| Mesh | n = 40 and n = 80 differ by < 0.2 % |
| Eurocode | One hand calculation: IPE 300, S355, L = 6 m, uniform load at the shear center gives the expected λ̄LT, χLT and Mb,Rd (worked in the test comment) |
| Short beam | λ̄LT ≤ 0.4 gives χLT = 1 and the "Short enough" flag |
| Class 4 | Flagged, Mb,Rd null |

**Hand check by Murat before deploy:** two cases against LTBeam, a top-flange uniform load and a case with one
restraint.

## Acceptance

- [ ] All tests pass. The two LTBeam checks agree within 3 %.
- [ ] The four guide steps give the captions' outcomes (Mcr drops in step 2, jumps in step 3, rises for the HEB in
      step 4).
- [ ] The README definition of done.

## References

- EN 1993-1-1:2005, 6.3.2.2–6.3.2.3, Table 6.5.
- NCCI SN003: Elastic critical moment for lateral torsional buckling (Access Steel; steelconstruction.info).
- Trahair (1993). Flexural-torsional buckling of structures. CRC Press. Pi and Trahair (1992), J. Struct. Eng. 118(11).
- Timoshenko and Gere (1961). Theory of elastic stability. McGraw-Hill.
- LTBeam, CTICM (free software, for checks).

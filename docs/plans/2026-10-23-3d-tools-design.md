# 3D tools: design

2026-10-23. Detailed designs for the three tools Murat chose in the design session (round 9,
`2026-10-23-ai-tools-design-session.md`):
- **Unbuild it:** the 3D flagship.
- **The building's chord:** the AI piece.
- **Why steel beams twist:** the steel teaching piece.

Nothing is built yet. The tools spec's rules all apply (`2026-10-23-tools-wave1-design.md`):
- ToolShell;
- settings in the URL;
- the tool opens with an example;
- a lazy chunk per tool;
- Method, Assumptions and limits, and Cite under the tool;
- 44 px targets, keyboard use, reduced motion;
- deploy only with Murat's OK.

## 0. The council on the details

- **Steel deconstruction contractor:** "Real dismantling runs in reverse of erection, top down. A storey keeps its
  bracing until the storey above it is gone, and temporary bracing is normal. Bolted members come out whole; welded ones
  get cut."
- **Structural dynamicist:** "A building's modes sit around a hertz, well below hearing. Transpose them, keep their
  ratios, and the chord is honest."
- **Psychoacoustician:** "Small pitch changes are audible at mid frequencies (Wier et al. 1977). Play the healthy and
  the damaged chord together and the beats give even tiny shifts away."
- **Steel stability specialist:** "Solve lateral-torsional buckling as an eigenproblem, not from one formula. Check it
  against the closed form and the NCCI SN003 C1 values."
- **Game designer:** "One rule, visible consequences, a score worth sharing. Undo makes failure cheap, so people
  experiment."
- **Graphics engineer:** "Instanced members, rendering on demand, analysis in a worker. All three fit a phone."
- **Accessibility reviewer:** "Every 3D action needs a list or keyboard path. Every sound needs a visual twin."
- **Hiring PI:** "Steel, reuse, carbon, dynamics, stability and AI: three tools, one recognizable profile."

## 1. Shared foundations (build first)

### 1.1 Steel sections (`src/tools/steel/sections.ts`)

- **Ranges:** IPE 80–600, HEA 100–600, HEB 100–600.
- **Inputs:** h, b, tw, tf, r, from a free manufacturer catalog. EN 10365 is sold, so it is cited but not copied.
- **Computed properties:** A, Iy, Iz, Wel, Wpl, It and Iw. Iw is Iz·(h − tf)²/4 for doubly symmetric I-sections; It
  includes the root fillets.
- **Test:** every property against the catalog values, within a stated tolerance.
- **Users:** the twisting-beam tool (all properties), Unbuild it (masses, stiffness), the chord (column stiffness).

### 1.2 3D kit (`src/tools/three/`)

- **Loading:** three.js through `import()`, only on these tools. Already a dependency (r176).
- **Requirement and fallback:** WebGL2 is required (three.js r163 and later). Without it, a 2D view or a still with the
  same numbers.
- **Renderer:**
  - DPR capped at 1.5 on phones and 1.75 on desktop;
  - MSAA 2 on phones, 4 on desktop;
  - no post-processing.
- **Rendering on demand:** one rAF flag. Draw on a control, camera or data change, and animate only during
  transitions. Pause off screen (IntersectionObserver) and in hidden tabs. Idle means 0 frames.
- **Lighting:** a hemisphere light plus one directional, a constant count, so shaders never recompile mid-interaction.
  No real-time shadows; a soft ground disc instead.
- **Members:**
  - an I-section extrusion with a 12-vertex profile;
  - one `InstancedMesh` per member type;
  - per-instance color for state;
  - picking by raycast `instanceId`.
- **Cleanup:** geometries, materials and the renderer are disposed on unmount.
- **Export:** PNG.
- **Accessibility:**
  - the canvas has `role="img"` and a live state label;
  - orbit buttons for the keyboard;
  - no auto-rotate under reduced motion.

### 1.3 Carbon factors (`src/tools/carbon/factors.ts`)

- Shared with the planned carbon calculator.
- European sources only: ÖKOBAUDAT generic datasets and manufacturer EPDs. Never ICE, whose licence forbids embedding.
- Every value carries its source, dataset ID and version, and is editable on the page.
- For reuse, a candidate source is the EPD "Reusable steel" in the International EPD System (environdec 6356). To be
  checked.

### 1.4 Workers

- An analysis goes to a worker when it takes more than about 5 ms on a phone:
  - Unbuild it's frame checks;
  - the GA;
  - autoencoder training.
- Small eigenproblems stay on the main thread.

## 2. Unbuild it

> **On hold, proposed for dropping** (`2026-10-23-tool-value-propositions.md`). Its value is thin for a large effort. The
> GA and its fast stability rules are dropped in any case. The section stays as a record.

**Pitch:** "Take a steel building apart so its steel can be used again, without it falling down."
**Group:** Life cycle, with the carbon calculator: "Tools / Life cycle / Unbuild it".

### 2.1 Buildings (presets)

| Preset | Size | Teaches |
|---|---|---|
| Shed | 2 × 1 bays, 1 storey, X-braced end bays, ~20 members | The rule: bracing keeps it standing |
| Office | 3 × 2 bays, 3 storeys, 6 × 7.5 m grid, 3.6 m storeys, pinned beam ends, braced bays in both directions, demountable floor panels, ~150 members | Order: top down, panels, secondary beams, primaries, then bracing and columns |
| Old warehouse | As Office, with an audit report: some members corroded, fire-damaged or welded | Not everything can be reused (SCI P427 excludes damaged steel); welded means cut, then recycle |

### 2.2 Rules

- **Lift out:** tap a member, or pick it in the member list, then "Lift out". The crane hook lifts it to the stockpile.
  Each lift adds time; heavier members take longer.
- **The check, after every lift:**
  1. **Mechanism.**
     - A linear 3D frame model: 6 DOF per node, beam end releases for pinned connections, continuous columns, pinned
       bases.
     - A pivot below the tolerance in the Cholesky solve means a mechanism. The unstable part collapses.
  2. **Strength.**
     - Loads: self-weight, a small construction load, and equivalent horizontal forces from the global sway
       imperfection of EN 1993-1-1, 5.3.2 (φ0 = 1/200).
     - Columns and braces are checked in axial force with buckling; beams in bending.
     - A member over utilization 1 fails, and the check repeats (a cascade).
- **Collapse:**
  - the members that lost support fall (simple kinematics, about 0.8 s) and become scrap;
  - the score records it;
  - Undo is always available.
- **Temporary prop or brace:** keeps a part stable at a time cost, and comes out at the end.
- **Stockpile:**
  - reclaimed members stack by section beside the building;
  - bolted members in good condition are tagged for reuse;
  - welded or damaged ones for recycling.
- **Score:** e.g. "Reused 82 % by mass · 41 t CO2e avoided · 37 lifts · no collapse". The URL carries the preset and
  the sequence, so a plan can be shared.

### 2.3 Carbon

- **Per reused member:** the avoided A1–A3 of new sections (EAF route by default, editable), minus the reuse
  processes (testing, refurbishment, transport).
- **Recycled scrap:** no avoided figure in the headline. Module D is shown apart, as EN 15804 and EN 15978 require.
- **Range:** optional, by Monte Carlo over the factors, as in D'Amico and Pomponi (2018).

### 2.4 "Ask the GA"

- **Encoding:** a permutation of the members, with precedences: a panel before the beam under it; the storey above
  before the columns below.
- **Crossover:** precedence-preserving crossover (PPX, Bierwirth et al. 1996). The 2023 survey of permutation operators
  shows that order crossover (OX) scrambles precedences.
- **Mutation:** insertion that respects precedence.
- **Objectives:** reuse share (maximize) against lifts and props (minimize). NSGA-II, reusing `truss-sizing/ga.ts`.
- **Cost control:** a full frame check per decode is too slow for a GA (thousands of decodes). The GA uses fast rules:
  - a beam needs both supports;
  - a column needs the column or base below;
  - a storey stays stable while it has a brace in each direction.
  The chosen plan is then verified by the full check. A property test compares the rules with the full check on 1,000
  random partial states of each preset.
- **Play:** the GA's plan replays as an animation, and "You vs. the GA" compares the scores.
- **Literature:**
  - selective disassembly sequence planning: Sanchez and Haas 2018; multi-objective: Sanchez et al. 2020;
  - NSGA-II: Deb et al. 2002.

### 2.5 Layout

- **Desktop:** the 3D view takes two thirds. The side panel holds:
  - the score card;
  - the selected member: section, length, mass, condition, connection, utilization;
  - the actions: Lift out, Add prop, Undo, Ask the GA;
  - the stockpile summary.
- **Phone:** the 3D view on top (60 % of the height), the panel below.
- **Member list:** a member table with Lift out buttons. It is the keyboard and screen-reader path, and it also suits
  very small screens.
- **Colors:**
  - in place: steel grey;
  - selected: laser orange (the site accent);
  - reuse and recycle: two tags with icons, never color alone;
  - "Show forces": a utilization heat map.
- **Reduced motion:** no falling. The failed members turn red and a message names them.

### 2.6 Method, limits, cite (draft)

- **Method:**
  - linear 3D frame analysis after each removal, checking mechanisms and strength;
  - equivalent horizontal forces to EN 1993-1-1;
  - carbon by EN 15804 and EN 15978 modules, with reuse assumptions after SCI P427;
  - the GA: NSGA-II with PPX.
- **Limits:**
  - static only: no dynamic effects of removal, no connection design;
  - idealized connections; generic factors;
  - not a demolition method statement. Real work needs a temporary works engineer.
- **Inspired by:** pre-demolition audits (the DISRUPT 2 steel reuse toolkit), and Jenga.

### 2.7 Performance and tests

- **Rendering:** about 150 members in three instanced meshes plus panels, under 30k triangles.
- **Analysis:** a frame check in a worker, targeting under 100 ms on a mid-range phone. Office: about 100 nodes, 600 DOF,
  banded Cholesky.
- **Tests:**
  - removing all bracing from a pinned frame gives a mechanism; a braced frame is stable;
  - a portal frame against a hand calculation;
  - carbon totals;
  - PPX gives valid permutations that keep precedences;
  - the rules-versus-full-check property test.

## 3. The building's chord

**Pitch:** "Every building has a chord. Damage changes it. Can you hear it? An autoencoder can."
**Group:** Monitoring, with the vibrometer: "Tools / Monitoring / The building's chord".

### 3.1 The building

- **The frame:** a steel frame of 4–8 storeys (slider) on a 2 × 2 bay plan, as a braced core or a moment frame.
- **Floors:** rigid diaphragms with lumped mass (dead load plus a share of imposed load), 3 DOF per floor (ux, uy,
  θz). Storey stiffness comes from the columns and braces at their plan positions, which gives torsional coupling when
  the plan is unbalanced. This is the classic torsionally coupled shear building (Chopra).
- **Modes:** K φ = ω² M φ, at most 24 DOF, solved by Jacobi in microseconds. Modal damping is 2 %.
- **Validation:** frequency ranges checked against published measurements when it is built.

### 3.2 The sound

- **Mapping (parameter mapping, not audification):**
  - each mode is a sine partial at K·fᵢ;
  - K puts the first mode at 110 Hz, so the ratios between modes, the chord, are the building's own;
  - the amplitude of each partial follows the mode shapes at the tap point and the listening point, so tapping a node
    of a mode leaves that mode silent;
  - decays are stretched to a few seconds, keeping their ratios (higher modes die faster).
- **Why not audification:** sped up 100 times, a building's ringing would last a fraction of a second (Dombois and
  Eckel, in Hermann et al. 2011).
- **Playback:** Web Audio. A buffer is synthesized offline for exact control. Sound plays only after a user gesture.
  There is a volume control and Mute.
- **Tap:** pick a floor and a direction in 3D (or from the list). "Listen at" defaults to a roof corner.
- **Compare:** play the healthy chord, then the current one, then both together. Together they beat at the difference
  frequencies, so even small shifts are audible.
- **The visual twin:** a spectrum (bars at fᵢ with their amplitudes) and a mode list (f in real Hz; type X, Y or
  torsion; share). Nothing is sound-only.

### 3.3 Damage and environment

- **Damage:** click a column or a brace and set its stiffness loss (0–90 %), or "loosen a brace". Frequencies drop,
  and an unbalanced loss couples torsion, which is visible in the mode shapes.
- **Normal variation:**
  - Temperature from −10 to 35 °C changes stiffness slightly, with a stated, illustrative coefficient; real buildings
    vary more, through non-structural parts (the Z24 lesson, Peeters and De Roeck 2001).
  - Occupancy changes mass by up to ±10 %.
- **Lesson:** the chord also moves on a warm day in a full office. The AI must learn which changes are normal.

### 3.4 The autoencoder

- **Data:** the first six frequencies of 1,000 simulated days (random temperature and occupancy, plus identification
  noise of a few tenths of a percent), normalized.
- **Network:** 6 → 8 → 2 → 8 → 6, tanh, Adam, in a worker, 1–2 s. The training loss is drawn live.
- **Latent plane (a 2D chart):** points colored by temperature or by occupancy. The two latent numbers line up with
  them: the network found the two causes of normal change.
- **Health index:**
  - reconstruction error against a threshold (the 99th percentile of training error, said plainly);
  - the current state is plotted;
  - residual bars per mode show which modes disagree, a hint to where and which direction.
- **Baseline:** Mahalanobis squared distance on the same six frequencies (Worden et al. 2000). With mostly linear
  normal variation it may do nearly as well; the page says so.
- **Credit line:** "The autoencoder idea comes from my team project for the EWSHM 2026 challenge."

### 3.5 The story (three steps, then free play)

1. **Tap the building:** hear its chord; watch the modes, exaggerated and labeled.
2. **A warm day, a full office:** the chord shifts a little. That is normal, and the autoencoder stays quiet.
3. **Cut a brace:** the chord shifts differently. The autoencoder flags it, and Compare lets you hear the beats.

**Option:** measure your own floor with the vibrometer and hear its first frequency as a note.

### 3.6 3D view

- **The building:** instanced columns, beams and braces, with translucent floor slabs.
- **Modes:**
  - played at a viewable rate, about 0.5–2 Hz on screen;
  - only while sounding or with "Play mode" on;
  - otherwise the view is still and renders on demand.
- **Exaggeration:** labeled, e.g. "Displacements × 2000, illustrative".

### 3.7 Method, limits, tests

- **Method:**
  - a torsionally coupled shear building; modal analysis;
  - parameter-mapping sonification;
  - an autoencoder on frequencies, with the Mahalanobis baseline;
  - grounding: frequency-based damage detection (Salawu 1997); autoassociative networks in monitoring (Sohn, Worden and
    Farrar 2002; Kramer 1991).
- **Limits:**
  - a simplified model;
  - an illustrative environment model;
  - frequencies are given, not identified from measured data;
  - the sound is a mapping, not a recording.
- **Tests:**
  - the eigen solver against a two-DOF closed form;
  - a symmetric plan decouples X, Y and torsion;
  - damage only lowers frequencies;
  - autoencoder gradients against finite differences;
  - the threshold logic;
  - the audio graph builds against a mocked AudioContext.

## 4. Why steel beams twist

**Pitch:** "Load a steel beam too far and it does not just bend: it swings sideways and twists. See why, and how
restraints stop it."
**Group:** Structures: "Tools / Structures / Why steel beams twist".

### 4.1 Model

- **Beam:** a doubly symmetric I-section (IPE, HEA, HEB) from the sections module; span 2–12 m; S235, S355 or S460.
- **Supports:** fork supports at both ends (twist prevented, warping free).
- **Loads:** uniform moment, a uniform load, or a central point load; at the top flange, the shear centre or the bottom
  flange.
- **Lateral restraints:** 0–4, dragged along the span. Each holds the top flange laterally.
- **Analysis:**
  - a 1D finite element for flexural-torsional buckling (Trahair 1993; Pi and Trahair 1992);
  - 4 DOF per node (v, v′, φ, φ′) with Hermite cubics;
  - elastic stiffness from EIz, GIt and EIw; geometric stiffness from the in-plane moment and the load height;
  - restraints as penalty springs on v + (h/2)·φ;
  - about 40 elements (164 DOF); the lowest eigenvalue by inverse iteration, in milliseconds.
- **Outputs:** Mcr and the mode shape v(x), φ(x).
- **Checks:**
  - uniform moment against the closed form (Timoshenko and Gere);
  - a uniform load and a central point load at the shear centre against the NCCI SN003 C1 values (about 1.13 and 1.35);
  - a top-flange load lowers Mcr;
  - a midspan restraint under uniform moment gives Mcr at half the length.
- **Eurocode:**
  - λ̄LT = √(Wy fy / Mcr);
  - χLT by EN 1993-1-1, 6.3.2.3, for rolled sections, with the recommended values (λ̄LT,0 = 0.4, β = 0.75) and curves
    by h/b;
  - Mb,Rd.
  - National Annexes may differ; the page says so.
- **Readouts:**
  - Mcr, λ̄LT, χLT, Mb,Rd and Mpl,Rd;
  - "What twisting costs you": Mb,Rd as a share of Mpl,Rd.

### 4.2 Views

- **3D beam:** the extruded section in about 60 slices. Each slice is shifted by v(x) and turned by φ(x) about the shear
  centre.
- **Exaggeration:** a slider, labeled "illustrative".
- **"Load it":**
  - the load ramps up to Mcr;
  - the sideways sway grows as 1 / (1 − M/Mcr) from an initial bow of L/1000, the amplification of an imperfect beam;
  - after Mcr, only a label ("buckled"), since post-buckling is not modeled.
- **Restraints:** small struts to the top flange. Dragged in 3D, or set with sliders for the keyboard.
- **2D insets:**
  - the midspan cross-section, turned and shifted;
  - the χLT curve with the current point;
  - Mcr against restraint spacing.

### 4.3 The story

1. "A beam bends, and then it leaves its plane." Load it and watch it twist.
2. "Top flange or bottom flange?" A load on top makes it worse.
3. "Add a restraint at midspan." Mcr jumps; the mode becomes two half-waves.
4. "IPE or HEB?" Wide flanges resist twisting.

### 4.4 Method, limits, tests

- **Method:** elastic flexural-torsional buckling by FE, with EN 1993-1-1, 6.3.2.3.
- **Limits:**
  - doubly symmetric rolled sections, fork supports;
  - no distortional or local buckling, no web openings;
  - recommended values, not a National Annex;
  - check real designs with LTBeam (CTICM) or equivalent software.
- **Tests:**
  - the closed forms and C1 values above;
  - mesh convergence;
  - one χLT hand calculation;
  - section properties against the catalog.

## 5. Build order

| Step | What | Size | Why this order |
|---|---|---|---|
| 1 | Sections module and 3D kit | S | Everything uses them |
| 2 | Why steel beams twist | S–M | The smallest tool; it proves the kit and the sections |
| 3 | The building's chord | M | Adds audio and the autoencoder, which can be reused |
| 4 | Unbuild it | L | The largest; uses the kit, the sections, the carbon factors and the GA |

Each tool ships on its own, after the browser checks at 375, 1280 and 1700 px, a real phone, and Murat's OK.

## 6. Open items for Murat

1. **Groups:** Life cycle (Unbuild it), Monitoring (chord), Structures (twist)?
2. **Unbuild it:**
   - Are the three presets right?
   - Floor panels in or out?
   - Which EPDs for new sections and for reuse?
3. **Chord:**
   - Is the EWSHM credit line fine?
   - A default height of 6 storeys?
   - Sound on after the first tap?
4. **Twist:** S355 default, with the recommended Eurocode values?
5. **Still open from earlier:**
   - the `/tools` line;
   - the GP tool (the footbridge?);
   - when to build the carbon calculator;
   - the branch-history rewrite.

## References

Checked by web search on 2026-10-23 unless marked "(from memory)".

- Bierwirth, Mattfeld and Kopfer (1996). On permutation representations for scheduling problems. PPSN IV (as cited in
  "A survey and analysis of evolutionary operators for permutations", arXiv 2311.14595).
- Chopra. Dynamics of structures. Pearson (any recent edition; from memory).
- D'Amico and Pomponi (2018). Energy Build. 168, 236–250.
- Deb, Pratap, Agarwal and Meyarivan (2002). A fast and elitist multiobjective genetic algorithm: NSGA-II. IEEE Trans.
  Evol. Comput. DOI 10.1109/4235.996017.
- DISRUPT 2 steel reuse project toolkit. ASBP, 2024.
- EN 1993-1-1, 5.3.2 and 6.3.2.3; EN 15804; EN 15978 (standards; clause numbers from memory, to check against the
  current editions).
- Hermann, Hunt and Neuhoff, eds. (2011). The sonification handbook. Logos. Chapters on audification (Dombois and
  Eckel) and parameter mapping (Grond and Berger).
- Kramer (1991). AIChE J. 37(2), 233–243.
- NCCI SN003: Elastic critical moment for lateral torsional buckling. Access Steel; steelconstruction.info.
- Peeters and De Roeck (2001). One-year monitoring of the Z24-Bridge. Earthq. Eng. Struct. Dyn. 30(2) (from memory).
- Pi and Trahair (1992). Prebuckling deflections and lateral buckling. J. Struct. Eng. 118(11).
- Salawu (1997). Detection of structural damage through changes in frequency: a review. Eng. Struct. 19(9), 718–723.
  DOI 10.1016/S0141-0296(96)00149-6.
- Sanchez and Haas (2018). J. Clean. Prod. 183, 998–1010. Sanchez, Rausch, Haas and Saari (2020). Resour. Conserv.
  Recycl.
- SCI P427 (2019). Structural steel reuse: assessment, testing and design principles. Brown, Pimentel and Sansom.
- Sohn, Worden and Farrar (2002). J. Intell. Mater. Syst. Struct. 13(9), 561–574.
- Timoshenko and Gere (1961). Theory of elastic stability. McGraw-Hill (from memory).
- Trahair (1993). Flexural-torsional buckling of structures. CRC Press.
- Wier, Jesteadt and Green (1977). Frequency discrimination as a function of frequency and sensation level. J. Acoust.
  Soc. Am. 61, 178–184.
- Worden, Manson and Fieller (2000). Damage detection using outlier analysis. J. Sound Vib. 229(3), 647–667 (from
  memory).

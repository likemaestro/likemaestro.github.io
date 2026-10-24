# Handoff spec: The building's chord

## Overview

- **Value proposition:** For students and curious visitors who have never thought of a building as an instrument, it
  is a 3D steel building that plays its vibration modes as sound, and an autoencoder that tells damage from a warm,
  crowded day. Unlike autoencoder demos on heartbeats or digits, it shows monitoring AI on a structure, and you can hear
  it.
- **The visitor's job:**
  - understand vibration modes;
  - understand that damage shifts frequencies;
  - understand why AI has to learn what "normal" means.
  Pain: monitoring and AI feel like black boxes, and frequencies are invisible numbers. Gain: hear the chord change; see
  the autoencoder's two latent numbers line up with temperature and occupancy; see damage stand out.
- **Murat's link:** an autoencoder for bridge monitoring in the EWSHM 2026 team project (Audience Prize, on the home
  page). This tool shows the idea, with synthetic data only, never the team's data or model.
- **In scope:**
  - a torsionally coupled shear-building model, 4–8 storeys;
  - modal analysis;
  - parameter-mapping sonification;
  - damage to a column or a brace;
  - temperature and occupancy as normal variation;
  - a 6–8–2–8–6 autoencoder trained in the browser;
  - a Mahalanobis baseline;
  - detection rates.
- **Out of scope:** identifying frequencies from accelerations, real data, the vibrometer link (later).

## Route and registry

| Field | Value |
|---|---|
| Path | `/tools/building-chord` |
| Slug | `building-chord` → `src/tools/building-chord/` |
| Title | The building's chord |
| Line | Tap a steel building and hear its vibration modes as a chord. Damage changes it, and an autoencoder learns to tell damage from a warm, busy day. |
| Group | Machine learning (**confirm with Murat**; the alternative is Monitoring, next to the vibrometer) |
| `methodRef` | `{ label: "Sohn, Worden and Farrar 2002", href: "https://doi.org/10.1106/104538902030904" }` (**verify** the DOI, seen only through a mirror; the paper is J. Intell. Mater. Syst. Struct. 13(9), 561–574) |

## Files

- `BuildingChord.tsx`: the page.
- `building.ts`: model, modes, damage, environment; pure.
- `sound.ts`: partial mapping, using `audio/partials.ts`.
- `monitor.ts`: data generation, autoencoder, MSD, threshold, rates.
- `monitor.worker.ts`: autoencoder training.
- `Building3D.tsx`.
- `Charts.tsx`: spectrum, latent plane, health bar, residuals.
- Tests: `building.test.ts`, `monitor.test.ts`, `sound.test.ts`.

## Model (`building.ts`)

**Plan:** 2 × 2 bays of 6 m (12 × 12 m), 9 column lines at x, y ∈ {−6, 0, 6} m from the center; storey height
3.6 m; n storeys from 4 to 8, default 6.

**Lateral systems (presets):**
- **"Moment frame"** (default):
  - every column contributes 12·E·I/h³ (fixed-fixed between rigid floors; beams assumed rigid; stated);
  - webs parallel to y, so the y stiffness uses Iy and the x stiffness uses Iz;
  - columns HEB 260 in storeys 1–3, HEB 220 in 4–8 (sections module).
- **"Braced core":**
  - X-braces in the two central bays of each direction;
  - each brace adds E·A·cos²θ/Ld (CHS 139.7 × 8, A from D and t);
  - columns as above.

**Floors:** rigid; 3 DOF per floor (ux, uy, θz) at the center of mass (which is also the plan center).
- Mass m = (gk + occ·qk)·A / 9.81, with gk = 4.0 kN/m² (assumption), qk = 3.0 kN/m², A = 144 m² and occ the occupancy
  share (default 0.3, i.e. ψ2 for offices, EN 1990 Table A1.1).
- Rotational inertia J = m·(Lx² + Ly²)/12.

**Storey stiffness** (column i at (xi, yi), relative to the center):
- Kx = Σ kx,i; Ky = Σ ky,i; Kθ = Σ (kx,i·yi² + ky,i·xi²).
- Kxθ = −Σ kx,i·yi; Kyθ = Σ ky,i·xi.
- Assembled as a shear building: storey j connects floor j − 1 to floor j; the ground is fixed.

**Modes:** `generalizedEig(K, M)`, 3n DOF (≤ 24).
- fi = ωi/2π. Mass-normalized φi.
- Type: X, Y or θ by the largest share of modal kinetic energy in each direction.

**Damping:** ζ = 0.02 for every mode (assumption; labeled "typical of steel buildings, illustrative").

**Damage:** pick one column (storey j, line i) or one brace. Its stiffness contribution is multiplied by (1 − d), with
d from 0 to 0.9.

**Temperature** (−10 to 35 °C, default 15):
- every stiffness is multiplied by 1 − α·(T − 15), with α = 0.0015 /°C;
- an **illustrative** assumption, giving about ±2 % in frequency across the range;
- the page says real buildings vary through non-structural parts (Peeters and De Roeck 2001, the Z24 bridge).

**Reference state:** T = 15 °C, occ = 0.3, no damage. Its first frequency f1,ref sets the transposition (below).

## Sound (`sound.ts`)

- **Transposition:** K = 110 / f1,ref, fixed for the building (number of storeys and preset).
  - It is **not** recomputed when the damage, temperature or occupancy change; otherwise the shift would be inaudible.
  - It is recomputed only when the building itself changes.
- **Partials:** the first min(6, 3n) modes. Frequency K·fi.
- **Amplitude:** ai = |φi(tap) · φi(listen)| along the tap and listening directions.
  - Tap: a floor plus a direction X or Y (default roof, Y).
  - Listen: the roof corner (6, 6) in the same direction; θ contributes through the corner offset.
  - Normalized so the largest ai is 1; partials under 0.02 are dropped.
- **Decay:** τi = 2.5 s × (f1/fi). This keeps the ratio of decays at constant ζ.
- **Buffer:** 4.0 s at the context's sample rate, from `audio/partials.ts`.
- **Compare:**
  - healthy reference (2.0 s), a 0.3 s gap, current (2.0 s), a 0.3 s gap, both summed (3.0 s, each at −6 dB);
  - beats appear at K·|Δfi|;
  - the spectrum highlights the phase being played.

## Monitoring (`monitor.ts`)

**Training data:** 1,000 synthetic "days" of the healthy building.
- T = 15 + 12·sin(2π·day/365) + N(0, 3) °C, clamped to [−10, 35].
- occ ~ U(0.1, 0.6).
- The first six frequencies with identification noise N(0, 0.002·f) (0.2 %).
- Features: z-scores with the training mean and standard deviation.

**Autoencoder:**
- `createMLP([6, 8, 2, 8, 6], ["tanh", "tanh", "tanh", "linear"], seed)`;
- Adam, lr 0.01, batch 64, 300 epochs, in the worker (target < 2 s on a mid-range phone);
- the loss curve is streamed every 10 epochs.

**Latent plane:** the 2-D codes of the training days. A toggle colors them by temperature (grey ramp, steel → ink, cold
to warm) or by occupancy (the same ramp).
- The current state is a `laser` dot.
- The healthy reference is a ring.

**Threshold:** the 99th percentile of the training reconstruction errors (MSE in feature space). The page says it
plainly: "about 1 % of normal days raise a false alarm by design".

**Baseline:** Mahalanobis squared distance on the six z-scored features, with the training covariance. Its threshold
is the 99th percentile of the training distances (Worden, Manson and Fieller 2000).

**Test panel ("How good is it?"):**
- 200 new healthy days and 200 days with the current damage (same environment model);
- reports the detection rate and false-alarm rate for the autoencoder and for MSD;
- seeded; re-run on demand.

**Residuals:** bars per mode, (x − x̂) in standard deviations.

## Settings (URL)

| Key | Kind | Range | Default |
|---|---|---|---|
| `n` | num | 4–8 | 6 |
| `sys` | enum | `moment`, `braced` | `moment` |
| `T` | num | −10–35, step 1 (°C) | 15 |
| `occ` | num | 0–1, step 0.05 | 0.3 |
| `dmg` | text | `c{storey}-{line}` or `b{storey}-{bay}` or empty | empty |
| `d` | num | 0–0.9, step 0.05 | 0.5 (applies when `dmg` is set) |
| `tap` | text | `{floor}{x\|y}` | `{n}y` |
| `seed` | num | 1–999999 | 7 |
| `color` | enum | `temp`, `occ` | `temp` |
| `step` | enum | `1`, `2`, `3`, `free` | `1` |

## Layout

**Guide row:** three step chips (`.btn`), "1 Tap the building", "2 A warm, full day", "3 Damage a column", plus
"Free play". Each sets the state and shows its caption:

| Step | Sets | Caption |
|---|---|---|
| 1 | Reference state | "Tap the building to hear its chord: each note is one vibration mode." |
| 2 | T = 30 °C, occ = 0.6 | "Warmer and busier, the chord shifts a little. The autoencoder learned that this is normal, so it stays quiet." |
| 3 | `dmg = c1-4` (a ground-storey inner column), d = 0.7 | "A weakened column shifts the chord differently. The autoencoder flags it. Press Compare to hear the beats." |

**Above `lg`:** grid `lg:grid-cols-[minmax(0,1fr)_22rem]`.
- **Stage (left):** the 3D canvas, height `clamp(20rem, calc(100svh - 24rem), 34rem)`.
  - Overlay top right: the orbit buttons.
  - Bottom of the stage: the sound bar (`flex gap-3`):
    - `btn btn-solid` "Tap" (or a tap on a floor in 3D);
    - `btn` "Compare";
    - a volume range;
    - `btn` "Mute" (`aria-pressed`).
  - Under the stage, the spectrum chart (`h-28`): bars at K·fi, labeled with real hertz (e.g. "0.84 Hz"); the healthy
    reference as outline bars; the current as filled ink bars; the bar being played in `laser`.
- **Panel (right):**
  1. Building: `Segmented` storeys (4–8); `Segmented` system (Moment frame / Braced core).
  2. Environment: temperature range input (°C) and occupancy range input (%).
  3. Damage: a select of members (list path) plus a "Pick in 3D" toggle; a damage range input (0–90 %); `btn` "Repair".
  4. Mode list (`t-data` table): mode, f (Hz), type (X, Y, Twist), change against healthy (%).
- **Below the grid (`border-t border-rule`, `grid gap-x-8 sm:grid-cols-3`):**
  - **Latent plane:** square, about 16rem, with the color toggle;
  - **Health:** two horizontal bars (autoencoder, MSD), each against its threshold tick, with the verdict "Normal" or
    "Flagged" as text;
  - **Residuals by mode.**
  - Then the test panel: `btn` "Test on 400 new days", with the results table.

| Breakpoint | Changes |
|---|---|
| ≥ 1024 | As above |
| 640–1023 | The stage at full width; the panel in two columns; the charts in two columns, then one |
| < 640 | One column. The sound bar sticks to the bottom of the stage; the charts stack; the guide chips scroll horizontally |

## 3D view (`Building3D.tsx`)

- **Members:** columns (HEB), beams (IPE 360 nominal, visual only) and braces (CHS) as instanced meshes, steel grey.
  Floors are translucent wash plates.
- **The damaged member:** hatch texture plus a `t-small` label "Weakened 70 %" placed beside it (CSS2D or HTML
  overlay). The picked member (while choosing) is outlined in `laser`.
- **Mode animation:** floor (ux, uy, θz) applied to each floor's nodes; columns drawn as straight segments between
  floors (adequate at this scale). The exaggeration is set so the roof moves H/30, labeled "Displacements × N,
  illustrative".
- **Visual time:**
  - after a tap, the superposition of the modes, decaying, at a visual frequency of f/f1 × 0.8 Hz;
  - the animation runs for the audio's duration, then stops;
  - with "Play mode i" from the mode list, that single mode loops until stopped (or until 10 s).
- **Tap in 3D:** clicking a floor plate selects the tap floor; X/Y comes from a `Segmented` beside the Tap button.
- **Reduced motion:** no animation. Selecting a mode shows its deformed shape still.

## States and interactions

| Element | State | Behavior |
|---|---|---|
| Page | First load | Model and modes computed (< 5 ms); the autoencoder trains in the worker (loss streams; the health bars show "Training…"); 3D loads lazily. No sound until a gesture |
| Tap | First click | Create or resume the AudioContext; synthesize; play; animate (unless reduced motion). The Mute button becomes available |
| Tap | Muted | Animate and update the spectrum highlight; no sound; `t-small` "Sound is muted" |
| Compare | Click | Plays the three-part sequence; the spectrum highlights healthy, current, then both |
| Environment or damage | Change | Re-solve modes (< 5 ms); update the spectrum, mode list, latent dot, health bars and residuals at once; no retraining |
| Building | Change (storeys or system) | Re-solve; recompute K; **retrain** the autoencoder (the health bars show "Training…" until done) |
| Test on 400 days | Click | Runs in the worker (< 500 ms); fills the table |
| Audio unavailable | No Web Audio | Hide the sound bar; `t-small` "Your browser can't play sound here; the spectrum shows the chord." |
| No WebGL2 | | `<No3D>`; the spectrum and mode list move up to replace the stage |
| Worker error | | As in the other tools |

## Edge cases

- **Very high damage** (90 % on a braced core's brace): frequencies may drop sharply. The transposition stays fixed, so
  notes fall; that is intended.
- **Close modes** (symmetric plan, X and Y nearly equal): two partials within 1 Hz of each other beat even when
  healthy. Mention this in Limits: "a symmetric building already beats a little".
- **Occupancy 0:** mass from gk only; valid.
- **Long monitoring test on a slow phone:** keep it under 1 s, or show progress.
- **Numbers:** frequencies with 2 decimals (Hz); changes with 1 decimal (%); rates as integers (%).

## Motion

| Element | Trigger | Animation | Duration | Easing |
|---|---|---|---|---|
| Building | Tap | Decaying modal superposition | the audio length (4 s) | physical decay (exponential) |
| Building | Play mode i | Sinusoidal loop | until stopped, at most 10 s | sine |
| Spectrum highlight | Compare | Bar color switches per phase | follows the audio | step |
| Latent dot | State change | Moves to the new position | 200 ms | ease-out; instant under reduced motion |
| Loss curve | Training | Grows every 10 epochs | about 2 s | n/a |

## Accessibility

- **Focus order:**
  1. guide chips;
  2. Tap, Compare, volume, Mute;
  3. building controls;
  4. environment;
  5. damage;
  6. mode list (each row's "Play mode" button);
  7. orbit buttons;
  8. charts (with "Show as table");
  9. test panel;
  10. ToolShell.
- **Every sound has a visual twin:** the spectrum, the mode list and the highlighted bar. Captions say what changed
  ("The second mode dropped 3.1 %").
- **Canvas label:** e.g. "Six-storey steel building, moment frame. Ground-storey inner column weakened 70 %. First
  mode 0.82 hertz, 2.4 % lower than healthy."
- **Announcements:** `aria-live="polite"`, on the health verdicts ("Autoencoder: flagged. Mahalanobis: normal.") and
  when training ends.
- **No autoplay:** sound only after a click or keypress on Tap or Compare.

## Copy (drafts for Murat)

- **Method:**
  - "The building is a torsionally coupled shear model: rigid floors with three degrees of freedom each, columns and
    braces as storey springs."
  - "Its modes come from the generalized eigenproblem. Each mode becomes a tone: its frequency is multiplied by a fixed
    factor so the first mode sounds at 110 Hz, and the ratios between the modes, the chord, are the building's own
    (parameter-mapping sonification)."
  - "An autoencoder (6–8–2–8–6) learns the first six frequencies over a year of simulated healthy days; a day it cannot
    rebuild is flagged. Autoassociative networks have been used this way since Sohn, Worden and Farrar (2002); the
    Mahalanobis distance is the classic baseline (Worden, Manson and Fieller 2000)."
  - "The autoencoder idea comes from my team project for the EWSHM 2026 challenge."
- **Assumptions and limits:**
  - "A simplified model with assumed loads and damping; the temperature effect is illustrative."
  - "Frequencies are computed, not identified from measured vibration."
  - "The sound is a mapping, not a recording."
  - "A symmetric building already beats a little, because its X and Y modes are close."

## Tests

| Test | Expected |
|---|---|
| Two storeys, symmetric, X only | The two frequencies match the closed form of a two-DOF shear building, within 1e-6 |
| Symmetric plan | The modes are pure X, pure Y or pure θ (other components < 1e-9) |
| Damage monotonic | Increasing d never raises any frequency |
| Asymmetric damage | A one-column loss couples X and θ (the mode has both components > 1 %) |
| Temperature | +10 °C lowers every frequency by about α·10/2 = 0.75 % (within 0.05 %) |
| Sound | FFT peaks of the synthesized buffer at K·fi within one bin (`vibrometer/signal.ts`) |
| Transposition | K is unchanged when T, occ or damage change |
| MLP | Gradient check; training deterministic for a seed |
| Autoencoder | Training error at the 99th percentile < 0.05 (feature space) on the default settings |
| Detection, default step 3 | The autoencoder's detection rate > 90 %, false alarms ≈ 1 % (± 2 %) |
| MSD | Matches a direct computation on a small fixture |

**Hand check by Murat:** the first three frequencies of the default building against a quick model in SAP2000 or ETABS
with rigid diaphragms, within 5 %.

## Acceptance

- [ ] All tests pass. The SAP2000 or ETABS check agrees within 5 %.
- [ ] Step 2 stays "Normal" for the autoencoder; step 3 is "Flagged".
- [ ] No sound before a gesture; Mute silences everything.
- [ ] The README definition of done.

## References

- Chopra. Dynamics of structures (torsionally coupled buildings; any recent edition).
- Hermann, Hunt and Neuhoff, eds. (2011). The sonification handbook. Logos (parameter mapping; audification).
- Kramer (1991). AIChE J. 37(2), 233–243. Hinton and Salakhutdinov (2006). Science 313, 504–507.
- Peeters and De Roeck (2001). One-year monitoring of the Z24-Bridge. Earthq. Eng. Struct. Dyn. 30(2).
- Salawu (1997). Eng. Struct. 19(9), 718–723.
- Sohn, Worden and Farrar (2002). J. Intell. Mater. Syst. Struct. 13(9), 561–574.
- Worden, Manson and Fieller (2000). Damage detection using outlier analysis. J. Sound Vib. 229(3), 647–667 (from
  memory; **verify**).
- EN 1990, Table A1.1 (ψ2 for offices).

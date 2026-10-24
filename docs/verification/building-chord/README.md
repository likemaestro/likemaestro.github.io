# The building’s chord: verification record

Date: 24 October 2026. Code: `src/tools/building-chord/`, `src/tools/ml/mlp.ts`, `src/tools/audio/partials.ts`,
`generalizedEig` in `src/tools/la/eig.ts`, `onRender` in `src/tools/three/stage.ts`. Spec: the reviewed
`tool-building-chord.md` and `shared-foundations.md`, with the deviations listed at the end.

## Status

| Item | Status |
|---|---|
| Implemented | Yes |
| Numerically verified | Yes: closed-form and invariance tests (unit tests), the synthesized sound checked by FFT |
| Independently benchmarked | Partly: the modal model against a separate NumPy/SciPy model (this folder). The monitoring has no outside benchmark; its rates are measured on this simulation only |
| Browser-tested | Yes: headless Chromium 153 (SwiftShader WebGL), production build, at 375 × 812, 1280 × 800 and 1700 × 950 |
| Accessibility-tested | Partly: axe-core 4.10.3 (WCAG 2 A/AA), keyboard-operable controls, live verdicts; no screen-reader session |
| Ready for owner review | Yes |
| Ready to publish | No: needs Murat's review, approval of the copy (the EWSHM credit line) and of the group ("Machine learning" or "Monitoring") |

## Commands and observed results

- `npm test`: 18 files, 123 tests passed (17 for this tool: 9 building, 4 monitoring, 3 network and eigenproblem, 1 sound).
- `npm run build`: passed; postbuild wrote 12 pages and a sitemap with 11 URLs (the three.js chunk-size warning predates this work).
- `python3 -I docs/verification/building-chord/building_check.py` (NumPy 2.5.3, SciPy 1.18.1): `building_check.out.txt`.
- `monitor_report.test.ts` and `false_alarm_check.test.ts` (how to run them is at the top of each): the `.out.txt` files.

### The building model

| Test | Result |
|---|---|
| Two storeys, sway in x, HAND CALCULATION | The two frequencies of a two-DOF shear building, closed form, within 10⁻⁶ |
| Symmetric plan, moment and braced | Pure X, Y and twist modes (the other two energy shares below 10⁻⁹) |
| Damage to four members (c1-4, c3-5, c6-1, b2-1) at 20, 50 and 90 % | Never raises a frequency |
| One edge column (c1-4) at 90 % | Couples Y sway with twist (1.19 % and 1.21 % energy shares); the healthy building has none |
| 10 °C warmer | Every frequency √(1 − 0.015) − 1 = −0.753 % lower, within 10⁻⁹ (α · 10 / 2 = 0.75 % to first order) |
| Mode tracking | MAC above 0.99 for all six modes on the warm, full day; with c1-4 at 70 % the six are matched to six distinct modes |
| Stiffness | K symmetric; the brace stiffness equals 2 E A cos²θ / Ld |
| NumPy model (explicit storey sums, `scipy.linalg.eigh`) | All nine frequencies of six cases within 2 × 10⁻⁶ relative |

Default building (6 storeys, moment frame, 15 °C, occupancy 0.3): 0.678, 1.152, 1.337, 1.788, 2.884 and 3.028 Hz
(X, Y, twist, X, X, Y). With the braces on the two center lines, the braced building twists first (1.337 Hz).

### The sound

- The FFT of a synthesized tap finds every partial at K · f within one bin; the buffer peaks at −12 dBFS (0.251).
- K stays with the healthy building: damage moves the notes, it does not retune the chord.
- In the browser (spied on `AudioBufferSourceNode.start`): no AudioContext before the first gesture. Tap schedules one 4 s
  buffer 0.02 s ahead, peak 0.251. Compare schedules 2 s, 2 s and 3 s buffers 2.3 s and 4.6 s apart (peak 0.252 for the
  mix at −6 dB each). Mute stops what is playing; a tap while muted plays nothing and says so.
- The spectrum lights the bars that are playing (3 while the healthy chord plays, 6 while both play). Mute ends the
  highlight too: a screenshot showed it still following a muted Compare; fixed, and checked (0 lit bars 5 s after Mute).

### Monitoring (seed 7, default building; `monitor_report.out.txt`)

Training: 1.0 s in Node 22 and 0.9–1.0 s in the Chromium worker; best epoch 219 of 244 (early stopping, patience 25);
validation loss 3.6 × 10⁻³. Thresholds (99th percentile on 1,000 separate healthy days): autoencoder 9.82 × 10⁻³,
Mahalanobis 15.68. No day had to be redrawn for an unmatched mode.

| Damage (held out: 200 damaged and 200 healthy new days) | Autoencoder | Mahalanobis | Noise-free state at 15 °C, 0.3 (× threshold, AE / MSD) |
|---|---|---|---|
| Ground-storey center column (c1-5), 70 % (guide step 3) | 183/200 (91.5 %) | 188/200 (94.0 %) | 1.63 / 1.69 |
| c1-5, 50 % | 104/200 (52.0 %) | 119/200 (59.5 %) | 0.79 / 0.83 |
| c1-5, 90 % | 199/200 | 200/200 | 2.83 / 2.90 |
| Ground-storey edge column (c1-4), 70 % | 91/200 (45.5 %) | 92/200 (46.0 %) | 0.57 / 0.52 |
| Ground-storey corner column (c1-1), 70 % | 163/200 (81.5 %) | 150/200 (75.0 %) | 1.14 / 0.94 |
| Third-storey center column (c3-5), 70 % | 151/200 (75.5 %) | 156/200 (78.0 %) | 1.17 / 1.15 |
| Sixth-storey center column (c6-5), 70 % | 200/200 | 200/200 | 3.15 / 3.10 |
| Healthy days flagged (same test) | 6/200 | 4/200 | |

A warm, full day (30 °C, occupancy 0.6, healthy, guide step 2) lowers the frequencies by 6.9–7.3 % and scores 0.28 × both
thresholds: not flagged. The guide's damage lowers them by at most 1.1 % and is flagged. The edge column is detected
less than half the time because it lowers all frequencies nearly alike, as a warm day does; the page says so.

Seed to seed (step 3 case, held out): autoencoder 68.0–97.5 % and Mahalanobis 86.5–95.0 % over seeds 1–5, with 0–1
false alarms in 200. Neither method is better on every seed.

**Is the threshold calibrated?** (`false_alarm_check.out.txt`) Ten training seeds, each scored on the same 20,000 new
healthy days: the false-alarm rate averages 1.03 % (autoencoder) and 0.99 % (Mahalanobis) against the 1 % design value,
and ranges from 0.6 to 1.7 % per seed. That spread is the sampling error of a 99th percentile taken from 1,000 days; seed
7, the default, sits at the high end (1.55 % and 1.73 %; 1.7 % and 1.9 % on 5,000 other days). The page states the range.

### Browser checks (`vite preview` of the production build; `check-bc.mjs` in the session scratchpad)

- Load to trained: 1.5–1.6 s at 1280 × 800. The verdicts start "normal"; 0 frames rendered over 2 s while idle.
- Tap: the building moves for 4 s (62 frames in the first second), then 0 frames.
- Guide steps: step 2 sets 30 °C and 0.6 ("The sixth mode (sway in y) is 7.3 % lower than the healthy reference";
  both normal); step 3 sets c1-5 at 70 % (−1.0 % on the first mode, twist unchanged; both flagged, 1.63 and 1.69 ×).
- "Test on 400 new days" in the worker: 150 ms wall; 183/200 and 6/200, 188/200 and 4/200, the same as in Node.
- Pick in 3D chose a column (c4-5) on a click; the 3D label and the canvas description name it. A click on a floor moves
  the tap there. Show loops one mode; Stop ends it (0 frames after).
- A new building retrains: 8 storeys, braced, trained 1.2 s after the change; the old worker is ended.
- 375 × 812 with touch: no horizontal scroll; every control at least 44 px tall; spectrum labels that would overlap drop
  to a second row.
- Reduced motion: a tap plays the sound and renders no motion frames (Show, which draws the mode still, was not checked).
- No WebGL2: a message instead of the 3D view; sound, spectrum and monitoring work. No Web Audio: the sound bar is
  replaced by "Your browser can’t play sound here; the spectrum shows the chord."
- No console errors or warnings. axe: no violations.

### Review changes after the first screenshots

- **"A warm day or damage?"**, now the first monitoring chart: the 1,000 calibration days by first-frequency change and
  autoencoder score (× threshold, log scale), the threshold line, the reference and the current state. Measured in the
  browser: healthy days from −6.8 % to +5.9 %, 10 of them above the threshold (the 99th percentile, by construction);
  step 1 at 0 % and 0.01 ×, step 2 at −6.9 % and 0.28 ×, step 3 at −1.0 % and 1.63 ×. The latent plot, which showed the
  damaged state next to the reference and the warm day far from it, moved below it, and its caption now says why a dot
  near the ring can still be flagged (the code maps every day onto the healthy pattern; Kramer 1991, AIChE J. 37(2)).
- The weakened member is drawn in orange (the hatch tinted), as the label alone carried it before.
- While training, the new chart computed its axis from no data (NaN in the console); fixed before commit.

### Shared code changed (no visual change to the other tools)

- `three/stage.ts`: a render that ran an animation step could schedule a second frame when the step itself asked for a
  render, doubling the frames every frame (4,097 renders in 0.7 s, then a hung page, found on this tool). It now schedules
  at most one. Rechecked: the beam tool's load animation runs at 57 frames a second and stops; the frame tool renders
  only on change; neither has idle frames or console messages. Also new: `onRender`, for HTML labels over the canvas.
- `ToolShell.tsx`: the BibTeX `<pre>` scrolls sideways and now takes keyboard focus (`tabIndex={0}`); axe had flagged
  it on every tool (`scrollable-region-focusable`).
- `la/eig.ts`: `generalizedEig` (Cholesky of M, then the symmetric solver).

## Deviations from the spec, and why

1. **Guide step 3 weakens c1-5, the ground-storey center column**, not c1-4. The spec asks for an inner column; in this
   grid line 4 is the middle of an edge, and at 70 % it is detected less than half the time (above). The edge case stays
   available and is described in the limits.
2. **Calibration on 1,000 healthy days, not 300**: from 300 days the 99th percentile rests on three points, and the
   measured false-alarm rates ranged from 0.4 to 6 %.
3. **Learning rate 0.01, not 0.001**: at 0.001 the validation loss was still falling after 300 epochs.
4. **The roof carries gk only** (no imposed load), so occupancy changes the ratios between modes a little and the
   autoencoder can tell occupancy from temperature. Stated in the limits.
5. **Show loops a mode for 30 s**, then stops, rather than without end; Stop ends it sooner.
6. **The mode table shows "?"** instead of a change when the MAC against the healthy mode is below 0.8.
7. **Group**: "Machine learning" for now; "Monitoring" (with the phone vibrometer) is the alternative. Murat to decide.
8. The spec's placeholder numbers are not used; the page shows measured values.

## References checked (Crossref, 24 October 2026)

- Sohn, Worden and Farrar (2002), Statistical damage classification under changing environmental and operational
  conditions, J. Intelligent Material Systems and Structures 13(9), 561–574, doi:10.1106/104538902030904.
- Worden, Manson and Fieller (2000), Damage detection using outlier analysis, J. Sound and Vibration 229(3), 647–667,
  doi:10.1006/jsvi.1999.2514.
- Peeters and De Roeck (2001), One-year monitoring of the Z24-Bridge: environmental effects versus damage events,
  Earthquake Engineering and Structural Dynamics 30(2), 149–171.

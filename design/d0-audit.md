# D0 audit: evidence inventory

Date: 2026-10-20. Scope: thesis PDF, CV, the public records already verified, and the repos Murat approved for read-only inspection (EWSHM_Competition, EWSHM, concApp, concApp_Python). The CUTT-IA, artube, PartViewer and Tekla repos were not opened, and the Wiley book PDFs were excluded.

Status values: **verified**, **needs approval**, **conceptual placeholder**, **missing**. The "Reuse" column is separate from availability: whether something is publicly reachable doesn't settle whether it may be reused.

## Assets

| Asset | Source | Status | Reuse | Notes |
|---|---|---|---|---|
| Recorded NPR states: initial, iteration 10, iteration 50, final (250), 3×3 | Thesis Figs 7.16–7.17 (`design/assets/thesis/fig7.16_*`, `npr_iter010/050.png`) | verified | own work, thesis already public on the site | Iteration labels per thesis caption. Insets are about 90 px; the original exports would be better (brief §12.3) |
| Other recorded states (A1111, A2222, shear, bulk, linear NPR) | Thesis Figs 7.1–7.19 | verified | own work | Initial and final at 499 px, intermediates only as small insets |
| CAD idealizations of optimized cells | Thesis Fig 8.1 | verified | own work | Clean outlines |
| 3D-printed specimen test photos | Thesis Figs 8.2–8.3 | verified | own work; check the lab or photographer credit | Tension and compression sequences |
| Laser scene geometry (I-beam, openings, head) | modelled in `design/lib/beam-scene.js` | conceptual placeholder | ours | Generic; follows `d0-laser-reference.html`; captioned "Illustrative render" |
| EWSHM 3D bridge viewer screenshot | `EWSHM_Competition/docs/figures/viewer.png` (1705×960) | needs approval | **team work, six members**; needs team consent | The best AI-chapter image. It shows a health score of 67/100 for SET5 |
| EWSHM viewer animation | `docs/figures/viewer.gif` (7.4 MB) | needs approval | team consent | Too heavy as is; it would need re-encoding |
| EWSHM SET-level results table | `EWSHM_Competition/README.md:147-156` | needs approval | team consent; derived from OSMOS data | Enough for one truthful aggregate chart (flagged % and health score per SET) |
| EWSHM raw waveforms | OSMOS dataset (29 GB, git-ignored) | missing / not cleared | **no dataset licence found** | Don't publish raw data. Aggregates only, after consent |
| concApp Pareto plot | `concApp_Python/concApp-Report_20251221_142051/pareto_Graph.png` | needs approval | authorship of the core algorithm is unclear | The cleanest image. Results come from synthetic parametric designs, not real buildings |
| concApp design-space data | not saved; `results.json` keeps only the best solution | missing | — | A truthful cost-vs-carbon chart would need a re-run that dumps the population |
| Electron UI screenshots | none found | missing | — | |
| Hero portrait | none | missing | — | Optional; the layout works without it |

## Claims that can't be shown until confirmed

1. **EWSHM 2026 Audience Prize** and **Switch2Product 2024 Top 25.** No evidence exists in any repo; the only prize text is the rules' "2 k prize offered by OSMOS Group" for the jury winner. Both stay in the CV-derived list only once Murat gives an external source (announcement page, certificate, email).
2. **EWSHM role.** The repo shows Murat as the main committer (toolkit, CLI, preprocessing, 3D viewer) among six authors. Suggested phrasing for Murat to confirm: "team of six; I built the toolkit, CLI and 3D viewer".
3. **concApp role and authorship.** Three commits by Murat in a private repo, with no authorship record for the original Tkinter version.
4. **concApp numbers.** The two versions disagree by about 9× on embodied carbon for similar buildings (161 tCO₂e vs about 1,418 t). Show no numbers from either until this is resolved.
5. **PhD scope sentence.** Still Murat's to write. Decision factors are settled: cost, time, environmental impact.

## Issues found in passing: Murat should decide

- **`likemaestro/EWSHM_Competition` is a public GitHub repo**, although its README badge says "license-private" and it has no licence file. It contains:
  - the organizers' emails and meeting Q&A (`docs/README.md`);
  - a Google Drive file ID for the dataset (`aquinas_toolkit/dataset_fetch.py:30`);
  - the committed OSMOS rules PDF and dataset handbook;
  - a teammate's notes marked "do NOT put in the PDF" (`presentation/notes.md`, untracked locally; check it was never pushed).

  This is unrelated to the website, but worth a look: either make the repo private, or add a licence and remove what shouldn't be public.
- **concApp** says "MIT" in its README but has no LICENSE file, and the clone URL is a placeholder.

## Repo check (this site)

- `BrowserRouter` with no `404.html`, so `/tools/*` and `/publications` 404 on a direct load. The fix is specified in the v2.1 spec.
- CRA 5. three 0.176, @react-three/fiber 9.1, drei 10.0 and framer-motion 12 are already installed. GSAP is not.
- Content and routes are otherwise as recorded in the v2.1 spec.

## Laser reference

See `design/d0-laser-reference.html`. Every laser keyframe in D1 was rendered from one model that follows it.

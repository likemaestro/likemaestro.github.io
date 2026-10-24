# Handoff: new tools (2026-10-23)

Engineering handoff for the four tools Murat chose in the design session, the shared code they need, and the
site-level changes. Each file can be built from on its own. Where a number comes from a source, the source is named;
anything marked **assumption** is a stated, editable choice, and anything marked **verify** must be checked before
shipping.

## Files

| File | What |
|---|---|
| [`shared-foundations.md`](shared-foundations.md) | Steel sections, the 3D kit, linear algebra, the GP, the MLP, sampling, carbon factors, audio, chart helpers |
| [`tool-beam-twist.md`](tool-beam-twist.md) | **Why steel beams twist**: lateral-torsional buckling in 3D (Structures) |
| [`tool-surrogate-frame.md`](tool-surrogate-frame.md) | **Surrogate frame design**: GP surrogate, GA, FE verification, on a 3D six-storey moment frame (Machine learning) |
| [`tool-building-chord.md`](tool-building-chord.md) | **The building's chord**: modes as sound, an autoencoder that tells damage from normal change (Machine learning) |
| [`tool-embodied-carbon.md`](tool-embodied-carbon.md) | **Embodied carbon of a structure**: A1–A5 per m², SCORS rating, ranges, European data (Life cycle) |
| [`site-changes.md`](site-changes.md) | Registry, routes, groups, thumbnails, carousel, and items waiting on Murat |

## Decisions so far (Murat, 2026-10-23)

- Structural engineering comes first in every tool. Tools are "interactive tools", with no research or explainer
  labels.
- No LLM tools. No Bayesian optimization. No topology optimization or microstructure tools beyond those already on the
  site.
- Current, unannounced projects are never named or hinted at, in the site or in the repository.
- **Surrogate frame design:** the "Machine learning" group, with a moment frame by default.
- **Carbon calculator:** the structure only, European data. The page names the course "Life-Cycle Driven Structures",
  the Wiley book *Metals Driving Sustainable Construction* and concApp.
- **The autoencoder:** shown as an idea from Murat's EWSHM 2026 team project, with synthetic data only.
- **3D:** three.js, fast enough to run everywhere.
- **Dropped:** Unbuild it (with its GA and fast stability rules), the footbridge GP, and the reliability, borehole,
  concrete-strength and thermal GP options.

## Build order

| Step | What | Size | Why |
|---|---|---|---|
| 1 | Shared foundations | M | Everything below uses them |
| 2 | Why steel beams twist | S–M | The smallest; it proves the 3D kit and the sections module |
| 3 | Surrogate frame design | M–L | Murat's own workflow; uses the kit, sections, linear algebra, GP and GA |
| 4 | The building's chord | M | Adds audio and the MLP |
| 5 | Embodied carbon of a structure | M | Independent of 3D; can run in parallel with 2–4 |

Each tool ships on its own, after its checklist (below) and Murat's OK.

## Conventions every tool follows

- **Frame:** `ToolShell` (`src/tools/ToolShell.tsx`), with the breadcrumb "Tools / Group / Title", the Method,
  Assumptions and limits, and Cite sections, and the `methodRef` button. `paper` is used only where Murat's own paper
  applies; it does not apply to any of these four.
- **Settings in the URL:** `useToolParams` (`src/tools/useToolParams.ts`). Out-of-range values are clamped and listed in
  the line "Some link settings were out of range and have been adjusted: …", as in `TrussSizing.tsx`.
- **Controls:**
  - `Field`, `Segmented` and `Tip` from `src/tools/controls.tsx`;
  - range inputs with `accent-ink` and an `<output className="t-data">` beside them;
  - number inputs styled as in the truss tool's seed field.
- **Type:** `t-h2` (title, from ToolShell), `t-h3` (section heads), `t-data` (numbers and controls, tabular figures),
  `t-small` (captions, notes).
- **Color tokens** (`tailwind.config.js`):

  | Token | Hex | Use |
  |---|---|---|
  | `canvas` | #F6F7F5 | Page and canvas backgrounds |
  | `ink` | #172027 | Text, lines, primary marks, solid buttons |
  | `ink-2` | #4F5D68 | Secondary text, labels |
  | `steel` | #819199 | Steel members at low utilization; quiet marks |
  | `rule` | #CBD2D5 | Hairlines, dividers, axes |
  | `wash` | #EEF0EE | Hover and quiet fills |
  | `laser` | #F05A24 | **Only** the picked or current mark (one per view), as in the truss and property-map tools |
  | `bay` | #121A1F | Not used by these tools |

- **Utilization and magnitude:** the grey ramp from `steel` to `ink` (`mix()` in `TrussSizing.tsx`). Over-limit and
  "unsure" states use hatching and a text label, never color alone, and never `laser`.
- **Buttons:** `.btn` (outlined) and `.btn btn-solid` (the one primary action per toolbar). Both are 44 px tall on
  coarse pointers; every custom target honors `[@media(pointer:coarse)]:min-h-[44px]`.
- **Layout:**
  - `ToolShell` wraps in `Wrap` (`max-w-page`, `px-4 sm:px-6`);
  - workspaces follow the truss tool: a toolbar row (`flex flex-wrap gap-x-6 gap-y-3 pb-4`), then a grid with `border-t
    border-rule` dividers (`lg:grid-cols-[minmax(0,1fr)_19rem]` for a stage plus a side panel);
  - breakpoints are Tailwind's (`sm` 640, `md` 768, `lg` 1024, `xl` 1280 px).
- **Each tool opens with an example, never blank.** Heavy work runs in a module worker
  (`new Worker(new URL("./x.worker.ts", import.meta.url), { type: "module" })`). Each tool is its own lazy chunk; the
  home bundle must not grow.
- **Motion:** read `prefers-reduced-motion` once, as `REDUCED` in `TrussSizing.tsx`. Under it there is no autoplay, no
  camera animation and no mode animation; a still state with a text label replaces each.
- **Canvases:** `role="img"` and an `aria-label` that states the current result in words, updated when it changes.
- **Privacy:** nothing leaves the device; no network calls except fetching the tool's own static data from
  `public/data/`.

## Definition of done (every tool)

- [ ] Route, `pages.json` entry and group work; the direct link answers 200 after `npm run build` (postbuild).
- [ ] `npm run build` (tsc and vite) and `npm test` pass. New numerics have unit tests with the expected values given
      in the tool's file.
- [ ] Browser checks at 375 × 812, 1280 × 800 and 1700 × 950: no horizontal scroll, the first screen shows the stage
      and the primary action, and nothing overlaps.
- [ ] Keyboard only: every action is reachable and the focus is visible; the screen-reader labels read sensibly.
- [ ] Reduced motion: no animation starts on its own.
- [ ] 3D tools:
  - 0 frames rendered while idle (measured, as for the laser band);
  - at least 30 fps while interacting on a mid-range phone;
  - the no-WebGL2 fallback is shown when WebGL2 is forced off.
- [ ] The audio tool plays only after a gesture and is silent when muted.
- [ ] The home page's JS chunk is the same size as before (±1 kB).
- [ ] Murat has checked the numbers against a hand calculation or reference software (named per tool), and approved
      the copy.
- [ ] Deployed only with Murat's OK.

## Review panel (before each deploy)

- **Murat (structural engineer):** the numbers against the hand checks named in each file.
- **Front-end reviewer:** bundle, workers, disposal, the idle frame count.
- **Accessibility reviewer:** the keyboard path, labels, contrast, reduced motion.
- **One student tester:** "What did you learn in two minutes?", answered in one sentence.

## Sources

Each tool file lists its references. The design history is in `docs/plans/2026-10-23-*.md`.

# Tools, wave 1: design

2026-10-23. Murat asked for useful and creative tools on the site. Wave 1 launches `/tools` with four tools; waves 2 and 3
are listed at the end. Same visual system as the home page (spec: `2026-10-20-website-redesign-design.md`).

## 1. The `/tools` page and the shared frame

- **`/tools`** replaces the old dark card page (layout C):
  - featured: the unit-cell designer, with a still lattice preview (no autoplay; the home page already has one);
  - grouped rows (thumbnail, name, one line): Microstructures (property map, cell sketchpad), Monitoring (phone
    vibrometer), Other tools (world map generator, gauge).
- **Header:** "Tools" joins the section links: Research, Publications, Tools, About, CV.
- **Tool frame (`ToolShell`):** site header, breadcrumb "Tools / Name", title and one line, then an action row:
  - Copy link (the URL reproduces the result);
  - Cite (BibTeX `@software` entry; a Zenodo DOI later);
  - Method reference (the paper the method comes from; not "Paper", since Murat's papers don't describe these tools);
  - Code (the tool's source on GitHub).
- Below each tool: Method (a few lines), Assumptions and limits, Cite.
- **Shared rules:**
  - settings live in the query string, updated with `replaceState`; out-of-range values are clamped, with a note;
  - every tool opens with an example, never blank;
  - each tool is its own lazy chunk; the home bundle does not grow;
  - new routes go into the `postbuild` list in `package.json`, so direct links answer 200;
  - 44 px targets on touch, labelled inputs, keyboard use, no autoplay under reduced motion, canvases with
    `role="img"` and a state label.

## 2. Unit-cell designer (`/tools/unit-cell`)

The hero lab with its settings exposed.

- **Controls:**
  - target: axial, shear, bulk or auxetic;
  - volume fraction 0.30–0.60 (step 0.05, default 0.40);
  - mesh 48, 64 or 80 (default 80 on fine pointers, 48 on touch);
  - filter radius 1.5–3 elements (step 0.25, default 2);
  - seed (number field and "New seed");
  - tiles 1, 3 or 5;
  - Run / Pause / Run again.
- **Defaults:** auxetic with its vetted default seed. Seeds are vetted at V = 0.40 and r = 2 only. With other settings, a
  short note says a run can stall grey or split into islands; the readout then reports the grey fraction and whether
  the solid is connected, instead of hiding a poor result.
- **Readout:**
  - objective and stiffness matrix (MathML, as in the hero);
  - E₁, G₁₂, ν₁₂, κ (and κ / κ_HS), volume;
  - iterations and the convergence trace.
- **Exports:**
  - cell as SVG (contours at ρ = 0.5);
  - panel as SVG or DXF: nx × ny tiles, cell size and frame margin in mm, closed polylines ready for cutting;
  - Cᴴ as CSV;
  - settings as JSON;
  - phone wallpaper as PNG.

## 3. Property map (`/tools/property-map`) and cell sketchpad (`/tools/sketchpad`)

**Property map.** Every computed design as a point on the ν₁₂ (x) and E₁/E (y) plane.

- **Data:**
  - `npm run precompute` gains a map pass: each target at V = 0.30, 0.40 and 0.50 from many seeds at n = 48, vetted as
    the pools are (converged, crisp, connected, distinct);
  - per design: target, V, seed, C₁₁, C₁₂, C₃₃, iterations and a 1-bit 48 × 48 thumbnail;
  - written to `public/data/property-map.json` and fetched only by this page.
- **Encoding:**
  - marker shape by target (circle, square, diamond, triangle), so colour is never the only cue;
  - the selected point in laser orange.
- **References:**
  - ν₁₂ = 0 (dashed);
  - the Voigt bound E₁ ≤ V·E for each volume fraction (dashed). C* ≤ V·C_s in energy, so S₁₁* ≥ S₁₁/V, so E₁* ≤ V·E.
- **Filters:** volume fraction and target.
- **Selection:** clicking or tapping a point shows its 3 × 3 tiled cell, the numbers, and "Open in designer", a link with
  target, V, n = 48 and the seed, so the run reproduces exactly.
- **Accessibility:** "Show as table" gives the same data as a sortable table.

**Cell sketchpad.** Draw a cell; get its homogenized stiffness.

- **Grid and tools:** n = 48, solid and void brushes 1–6 elements wide.
- **Symmetry:**
  - kaleidoscope (D4, default);
  - mirror (two axes);
  - free.
- **Preview:** a 3 × 3 tiled view beside the grid shows how the cell connects to its neighbours.
- **Computation:**
  - runs on stroke end, in the worker, with E = 1 for solid and 10⁻⁹ for void;
  - mirror-symmetric modes use the quarter-cell solve (`homogenizeSym`, milliseconds);
  - free mode uses the full periodic solve (`homogenize`).
- **Readout:**
  - Cᴴ, E₁, G₁₂, ν₁₂, κ / κ_HS and volume;
  - "Auxetic" when ν₁₂ < 0;
  - a warning when the solid does not connect across the cell, because the stiffness is then near zero.
- **Start and sharing:**
  - opens with the default auxetic design, thresholded;
  - "Clear" and "Load example";
  - the drawing travels in the URL (48 × 48 bits, base64url, 384 characters).

## 4. Phone vibrometer (`/tools/vibrometer`)

Measure the natural frequency of a desk, floor or footbridge with a phone.

- **Flow:**
  - Start (on iOS this tap also asks for motion permission);
  - a 3 s countdown, then 20 s of recording;
  - then the time trace, the spectrum from 0 to fs/2, the main peak and the next two;
  - the measured sampling rate and the frequency resolution are always shown.
- **Signal processing:**
  - `devicemotion` with `accelerationIncludingGravity` (x, y, z) and timestamps;
  - resampled to a uniform rate (the median event rate) by linear interpolation;
  - the mean removed, the axis with the largest variance used;
  - Hann window, zero padding to a power of two, radix-2 FFT, amplitude spectrum;
  - the peak taken above 0.5 Hz (ignoring drift), refined by parabolic interpolation, reported with its resolution.
- **Without a sensor** (desktop, or permission denied):
  - a clearly labelled simulated example (two damped modes and noise);
  - "Upload CSV" (time in s, acceleration);
  - a note to open the page on a phone.
- **Exports:** the recording and the spectrum as CSV.
- **Privacy:** nothing leaves the device.
- **Wake lock:** requested during recording, if granted.
- **Limits, stated on the page:**
  - browsers deliver about 60–100 Hz, so readings stop at about 30–50 Hz;
  - the sensors are uncalibrated;
  - readings are indicative only.
- **Method reference:** to verify before citing. Candidate: Feng, Fukuda, Mizuta and Ozer (2015), *Citizen sensors for
  SHM: use of accelerometer data from smartphones*, Sensors 15(2).

## 5. Code, data and tests

- **New code layout:**
  - `src/tools/`: `ToolShell`, `ToolsIndex`, `unit-cell/`, `property-map/`, `sketchpad/`, `vibrometer/`.
- **Extracted from `LiveCell`** (no visual change to the hero):
  - `src/lab/lattice.ts`: draw a tiled density field;
  - `src/lab/readout.tsx`: MathML helpers and the convergence trace.
- **Geometry and signal code:**
  - `src/lab/contour.ts`: marching squares on the periodic grid, giving closed loops;
  - `src/lab/export.ts`: SVG, DXF R12 polylines, CSV;
  - `src/tools/vibrometer/signal.ts`: resampling, window, FFT, peaks.
- **Worker:** `run` takes `vf` and `rmin`; a new `homogenize` message serves the sketchpad.
- **Old pages:** the old `ToolsPage` is deleted. The world map and gauge pages stay as they are.
- **Tests:**
  - contours of a cell with a hole close into the right number of loops;
  - the DXF has one polyline per loop;
  - the FFT finds a 2.5 Hz sine within one bin from jittered timestamps;
  - resampling preserves a ramp;
  - URL parameters clamp;
  - a fully solid sketch gives the analytic stiffness (the existing solver test covers this).
- **Browser checks:** every page at 375, 1280 and 1700 px wide. Murat checks the vibrometer's permission path on a real
  phone.
- **Deploy:** only with Murat's OK.

## Open items for Murat

- Should the hero link to the designer? Recommendation: no; the header's "Tools" link is enough.
- Cite: `@software` with the site URL for now; a Zenodo DOI once the solver has its own repository and release.
- The vibrometer's simulated example: replace it with a real recording of his.

## Later waves

- **Wave 2:**
  - auxetic sheet (rotating squares, kirigami export);
  - funicular form finder (with the force polygon);
  - gyroid/TPMS generator (STL);
  - convergence replay (GIF).
- **Wave 3:**
  - steel reuse matcher;
  - IFC steel takeoff;
  - AI surrogate for homogenization;
  - damage detection playground (synthetic data only).
- **Left out on purpose:**
  - bar cutting and nesting (too close to the PhD topic);
  - LLM tools (they need a server and an API key).

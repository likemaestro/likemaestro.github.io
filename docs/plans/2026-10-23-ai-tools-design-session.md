# AI tools: design session

2026-10-23. A brainstorming session with an imagined expert panel, run to decide which AI tools go on the site and how
to design them. It follows `2026-10-23-ai-tool-brainstorm.md`. Rounds 1 and 2 used Murat's framing rule: every tool is a
**research method** (a method Murat uses, on an example people can follow), an **explainer** (not research; for teaching
and attention) or a **utility**, and says which. Round 3 (section 4) dropped that rule and simplified the picks.

Murat's input for this session:
- **Gaussian-process (GP) surrogates:** used for design optimization in current work, which the site does not name.
- **EWSHM 2026:** Murat was a team member. The team built an autoencoder for bridge health monitoring (Audience Prize;
  already on the home page). Murat may show the autoencoder idea.

## 1. The panel, and what they would say

| Seat | Why they're in the room | What they'd say |
|---|---|---|
| **Explorable-explanation designer** (Victor, Ciechanowski, Distill editors) | Makes ideas playable | "A widget is not an explanation. Guide the visitor to one phenomenon, then let them play" (Victor 2011). "One figure, one idea. Polish one tool before building three." |
| **Interactive-ML visualization researcher** (Hohman, Chau) | Studies what interactive articles do for readers | Interactive articles connect people and data, make systems playful, prompt self-reflection, personalize reading and reduce cognitive load (Hohman et al. 2020). "Ask the visitor to predict before you reveal." |
| **Uncertainty-visualization researcher** (Hullman) | Knows how people read uncertainty | "Show the GP as animated draws, not only a shaded band. People judge outcomes from draws better than from error bars" (Hullman et al. 2015). |
| **GP and Bayesian-optimization methodologist** | Keeps the method honest | "Show the acquisition function, fit hyperparameters by marginal likelihood (Rasmussen and Williams 2006), and treat the constraint with its own GP (Gardner et al. 2014). Never peek at the truth before the budget is spent." |
| **Structural dynamicist** | Owns the physics of the structural examples | "Keep the ranges realistic and label a synthetic record as synthetic." |
| **SHM researcher** (Worden and Farrar school) | Owns the physics of tool 2 | "Temperature, not damage, moves the frequencies most. The Z24 bridge got stiffer when it froze (Peeters and De Roeck 2001). Auto-associative networks were used against exactly this in 2002 (Sohn, Worden and Farrar). Always show a statistical baseline, false alarms and missed detections." |
| **Deep-learning skeptic** | Stops overclaiming | "Autoencoders can reconstruct some anomalies well too, so a low error is not proof of health (arXiv 2501.13864). Show where yours fails. A 2-D bottleneck lets people see what it learned." |
| **Murat's EWSHM teammates** | Their project, their data | "Show the idea, not our model or our data. Credit the team." |
| **Hiring PI** | The reader Murat most wants to reach | "Link every tool to the project behind it. One paragraph of method, a clear limits section. That reads as rigor." |
| **Front-end and accessibility engineer** | Keeps the site's standards | "No TensorFlow.js needed: a 3-8-2-8-3 network trains in plain TypeScript in a worker in seconds. 44 px targets, keyboard use, reduced motion, phones first." |
| **Workshop participant (architect)** | The non-expert visitor | "Give me a goal in ten seconds. Let me play for two minutes. Then tell me what I learned." |
| **Devil's advocate** | Tests every pick | "There are already half a dozen GP demos. Why would anyone use yours?" (answered in section 3) |

## 2. What exists today

Checked 2026-10-23 by web search. Hacker News for community projects (Reddit blocks the search tool).

| Area | What exists | What it does well | Gap |
|---|---|---|---|
| GP regression | Distill "A Visual Exploration of GPs" (Görtler et al. 2019); Chi Feng's GP demo; erees.dev/gp; smlbook.org/GP; st--/interactive-gp-visualization | Click to add points; kernels; hyperparameters | Toy 1-D functions. No design problem, no constraint, no budget, no reveal |
| Bayesian optimization | Distill "Exploring Bayesian Optimization" (Agnihotri and Batra 2020); DataScribe (arXiv 2601.07966, materials); the Emukit playground (named in Emukit's README) | Acquisition functions explained step by step | Benchmark functions. No engineering constraint, no "you vs. the optimizer", no reveal of the true surface |
| Autoencoders | Anomagram (Dibia, Cloudera Fast Forward; TensorFlow.js, ECG data); VAE Explainer (Bertucci and Endert 2024) | Training in the browser; thresholds; error histograms | ECG and digits. No environmental variability, no structure, no baseline comparison |
| SHM | A Streamlit Z24 damage classifier (GitHub); open datasets (KW51 on Zenodo; Z24 by request) | Real data | Nothing hosted and interactive on "environment vs. damage"; Streamlit needs a server |

## 3. How to do better: the differentiators

1. **A real engineering problem**, not a toy function: a structure, a bridge through the seasons.
2. **Predict, then reveal:** a budget, a hidden truth, a score. This is the self-reflection affordance (Hohman et al.
   2020) and the answer to the devil's advocate.
3. **An honest baseline next to the AI:** the autoencoder against Mahalanobis distance and PCA; expected improvement
   against the visitor and against random sampling.
4. **Uncertainty as draws**, animated, with the band (Hullman et al. 2015).
5. **A guided path, then free play** (Victor 2011): three short steps, each showing one phenomenon, then all controls.
6. **The phone as an instrument:** the vibrometer's motion code becomes a shake table (tool 3) and a data source
   (tool 2).
7. **Reproducible and citable:** every setting is in the URL; Method, Assumptions and limits, and Cite as on every tool.
8. **Tiny, fast and private:** no ML framework, no server, all in a worker; works offline once loaded.
9. **Labeled:** "Research method" or "Explainer", so nobody mistakes a demo for research.
10. **Linked:** the shake table leads to the surrogate tool; the vibrometer leads to the anomaly tool; the home page's
    EWSHM row leads to the anomaly tool.

## 4. Round 3: Murat's feedback (2026-10-23)

Round 3 replaces the picks and designs of rounds 1 and 2. Sections 1–3 stay as the session record.

- **Too strict:** there are no "Research method / Explainer / Utility" labels. They are all interactive tools; the
  `/tools` line says that some of them are methods from Murat's research.
- **Grounded, not narrow:** a tool can sit in a topic Murat knows without being the exact research. The sketchpad belongs
  to the microstructure work.
- **Gaussian process surrogates:** yes. **Bayesian optimization:** no; it is not Murat's work.
- **Autoencoder:** yes, as a concept. No monitoring scenario is needed.
- **Current projects:** never named, never hinted at.
- **Conceptual and simple:** the bridge anomaly lab and the shake table were too much.
- **Purpose:** show existing knowledge, for demonstration and teaching. A hiring reader should see that Murat
  understands the method; a researcher should see good outreach. The site does not do new research.

## 5. The plan

### The `/tools` line, options

1. "Some of the methods I use in my research, as interactive tools, and a few others. They run in your browser;
   nothing you draw, measure or upload leaves your device."
2. "Methods from my research and teaching, as interactive tools. They run in your browser; …"
3. "Interactive tools on the methods I work with. They run in your browser; …"

### A new group: Machine learning

- It holds the Gaussian process surrogate and the autoencoder.
- The breadcrumb reads, e.g., "Tools / Machine learning / Autoencoder".

### Gaussian process surrogate

**The idea in one line:** a cheap model learns an expensive one from a few runs, and says how sure it is.

**Interaction:**
1. Draw a curve: the "expensive model". Or pick a preset. The curve then fades out.
2. Tap to "run" the model at a point, or place n points by a plan: grid, random or Latin hypercube.
3. The GP shows its mean, a 95 % band and a few animated sample curves. The band narrows near the runs.
4. "Show the truth" brings back the drawn curve and the error.

**Controls:**
- kernel: squared exponential or Matérn 5/2;
- length scale and noise, set by hand or by "Fit" (marginal likelihood);
- number of points;
- Clear.

**Readouts:** runs used, RMSE against the drawn curve, log marginal likelihood.

**Later, if wanted:** two inputs, shown as a map of the mean and a map of the uncertainty.

**Method:** GP regression (Rasmussen and Williams 2006, ch. 2); Latin hypercube sampling (McKay et al. 1979).
Inspired by Distill's "A Visual Exploration of Gaussian Processes" (Görtler et al. 2019).

**What is new against existing GP demos:**
- you draw the truth, so the surrogate's error is visible;
- sampling plans;
- built for phones.

**Effort:** small. A GP with Cholesky on up to about 50 points in TypeScript, and a canvas.

### Autoencoder

**The idea in one line:** squeeze data through a narrow middle and rebuild it; what cannot be rebuilt is unusual.

**Interaction:**
1. Draw points in a plane. Or pick a preset: arc, S-curve, ring, two clusters.
2. Train. A 2 → 8 → 1 → 8 → 2 network trains live, and each point's reconstruction slides onto a curve: the shape the
   network learned. PCA's line sits beside it, since a linear autoencoder learns the same subspace (Baldi and Hornik
   1989).
3. Tap anywhere. The point and its reconstruction appear, linked. The background shades by reconstruction error, and a
   point past the threshold is flagged as unusual.

**Controls:**
- bottleneck 1 or 2 (with 2 the network just copies, which shows why the bottleneck matters);
- hidden width;
- activation: tanh or linear;
- train, pause, reset;
- noise.

**Readouts:** the loss curve, the threshold (e.g. the 99th percentile of training error), the share of points flagged.

**Monitoring, in one line of Method:** "In structural health monitoring, an autoencoder trained on healthy data flags
measurements it cannot rebuild (Sohn et al. 2002)." There is no monitoring scenario.

**Method:** Kramer 1991; Hinton and Salakhutdinov 2006; Baldi and Hornik 1989. Inspired by Anomagram and TensorFlow
Playground.

**What is new against existing demos:**
- data you draw;
- the learned curve, visible;
- PCA beside it;
- an anomaly map;
- trains in seconds without an ML framework.

**Effort:** small to medium. An MLP with Adam in TypeScript, in a worker, about 250 lines; a canvas.

### Existing tools

- **Cell sketchpad:** stays as it is; part of the microstructure work.
- **Phone vibrometer:** stays; FFT and monitoring. It is the site's structural health monitoring demonstration.

### Parked

- Bayesian optimization;
- anything that names or hints at current projects;
- the bridge anomaly lab;
- the shake table;
- "Where AI fails";
- steering the GA.

## 6. Decisions for Murat

1. The `/tools` line: option 1, 2 or 3?
2. Group name: "Machine learning" or "AI"?
3. Build order: the GP surrogate first, or the autoencoder?
4. A contact line at the end of each tool?

## 7. Round 4: life cycle tools (2026-10-23)

Murat has life cycle assessment (LCA) experience:
- teaching assistant on "Life-Cycle Driven Structures";
- guest lecturer in "Life Cycle Driven Design";
- concApp (cost and embodied carbon);
- environmental impact work as a research fellow.

Murat asked for something useful, such as a calculator.

**Panel:**
- **Practicing structural engineer:** "A1–A5 as in the IStructE guide, kgCO2e per m², and a rating I can quote to a
  client."
- **LCA methodologist:**
  - "State the system boundary and the modules, and report module D separately (EN 15978)."
  - "Cite every factor. One number without a range misleads" (Robati et al. 2019).
- **Data and licensing advisor:** "Embedding the ICE database in a tool needs Circular Ecology's Tools and Integration
  Licence. ÖKOBAUDAT is free of charge and unrestricted, EN 15804+A2, CSV."
- **Architecture student:** "Let me compare concrete, steel and timber in one minute."

**What exists:**

| Tool | What it is | Gap |
|---|---|---|
| IStructE / Elliott Wood Structural Carbon Tool v3 (2025) | Free Excel; EN 15978, EN 15804, RICS; SCORS, LETI and RIBA benchmarks; six options | Excel on a desktop only; one number, no range; no link to share |
| EC3 (Building Transparency) | Free web tool; a large EPD database; procurement | Needs an account; specification, not early structural design |
| BEAM Estimator (Builders for Climate Action) | Free; compares materials | Residential and North American |
| Embodied Carbon PathFinder | Free, educational | Fixed British Columbia archetypes |

**Ideas:**
1. **Structural embodied carbon calculator** (recommended).
   - Inputs: quantities per material (steel sections, rebar, concrete class, timber) and floor area.
   - Results:
     - A1–A3, plus A4 transport, A5 waste, and C, with D reported separately;
     - kgCO2e and kgCO2e per m², with a SCORS band;
     - up to three options side by side.
   - Data and method:
     - default factors from ÖKOBAUDAT; every factor editable and cited;
     - the method of "How to calculate embodied carbon", 3rd edition (Gibbons, Orr and Arnold 2025).
   - **Better than what exists:** in the browser and on a phone; a link that reproduces the result; CSV export; and a
     range on every result, by Monte Carlo over the factors.
2. **Steel option inside 1:** new steel by route (EAF or BOF) vs. reused sections (SCI P427). Ties to the steel work and
   the Wiley book.
3. **Whole-life timeline** (later, for teaching): modules A to C over 60 years, refurbish vs. rebuild, D apart.
4. **Quick win:** truss sizing reports kgCO2e beside steel mass, with the steel route as a setting.

**Avoid:** carbon of cutting or fabrication processes, which is too close to the PhD.

**Group:** "Life cycle" (or "Sustainability"), e.g. "Tools / Life cycle / Embodied carbon".

**Decided (Murat, 2026-10-23):**
- **Scope:** the structure only, as SCORS.
- **Data:** European; ÖKOBAUDAT and manufacturer EPDs.
- **The page names:**
  - the course "Life-Cycle Driven Structures" (and the "Life Cycle Driven Design" lecture);
  - the Wiley book *Metals Driving Sustainable Construction*;
  - concApp.

## 8. Round 5: conceptual, but on structures (2026-10-23)

Murat: conceptual does not mean abstract. The GA tool uses a truss because a truss is simple and familiar; the GP and the
autoencoder should do the same. Their variables come from structures, construction or architecture (the department is
Architecture, Built Environment and Construction Engineering). This replaces the drawn curve and drawn points of
section 5.

**Panel:**
- **Structural engineering educator:** "Keep one structure people know across tools. The method changes, the structure
  stays: one truss, three methods."
- **ML researcher:** "Make the latent space mean something. If its two numbers turn out to be where the load is and how
  heavy it is, people understand autoencoders at a glance."
- **Architect:** "Tie one tool to a design decision people make: truss depth, column grid, carbon."
- **Hiring PI:** "A surrogate of your own FE solver shows the point of surrogates: they stand in for expensive
  simulations" (Forrester et al. 2008; in structural reliability, Echard et al. 2011).

### GP surrogate: "How deep should the truss be?"

- **The "expensive model":** the site's bridge truss FE (6 × 3 m panels, `truss.ts`, which already takes the depth).
  - Input: depth, 1–6 m.
  - Output: the steel mass needed so that every member passes EN 1993-1-1 and the deflection stays within span/300,
    with one section for all members, scaled continuously.
  - The curve has a minimum, near the span-to-depth ratios of 10–25 that the SCI gives for trusses. It also has kinks
    where the governing check changes, which is where a GP is least sure: a useful lesson.
- **Interaction:**
  - tap a depth to "run the FE model": the truss at that depth appears, colored by utilization;
  - the GP fits the runs, with mean, band and animated draws;
  - "Show the truth" adds the dense FE sweep;
  - controls: kernel, length scale, noise or "Fit"; grid, random or Latin hypercube runs.
- **Later:** two inputs, depth × number of panels, as maps of the mean and of the uncertainty.
- **Alternatives:**
  - the unit cell, with hole size → stiffness through the quarter-cell solver;
  - once the carbon calculator exists, column grid → kgCO2e per m², which spans architecture, structure and carbon.

### Autoencoder: "What the sensors expect"

- **Data:** the same bridge truss, fixed depth.
  - One vehicle, a point load P (50–300 kN) at position x along the deck.
  - Five displacement sensors on the bottom chord, plus noise.
  - Five hundred healthy crossings are generated by the FE model.
- **Network:** 5 → 8 → **2** → 8 → 5, trained live (Adam, in a worker, about a second).
- **Latent plane:** points colored by load position or by load size. The two latent numbers line up with x and P: the
  network found the causes of the variation by itself.
- **Damage:**
  - click a member and set a stiffness loss;
  - new crossings no longer fit, so the reconstruction error crosses the threshold;
  - residual bars show which sensors disagree.
- **PCA beside it:** sensor readings are P times a curve in x, so they lie on a curved 2-D surface. Two principal
  components cannot hold it, and the autoencoder's two latent numbers can.
- **Literature:** Sohn, Worden and Farrar 2002; Kramer 1991. Autoencoders on trusses with reconstruction error as the
  damage index: a drive-by Warren-truss study (Civil-Comp 2024) and a sparse-autoencoder thesis on a scaled bridge
  (Politecnico di Milano).

### Code to add to `truss.ts`

- Depth and panel count as parameters (`bridge(panels, a, h)` exists, not exported).
- Arbitrary nodal loads.
- A stiffness factor per member.

## 9. Round 6: something other than the truss (2026-10-23)

Murat: think of something other than the truss. The GA keeps the truss, and the GP and the autoencoder each get their
own structure, so the tools show range.

**Panel:**
- **Footbridge vibration specialist:** "Everyone has felt a bouncy footbridge. Resonance makes the GP's job hard in an
  honest way" (Živanović et al. 2005; the Millennium Bridge, Dallard et al. 2001).
- **Steel construction engineer:** "Every engineer knows the IPE and HEB tables. A map of all of them reads at once."
- **Building energy researcher:** "Daily load curves are the classic autoencoder case in buildings" (Fan et al. 2018).
- **Site engineer:** "Concrete strength from a few cube tests is GP regression with noise, and the lower band says when
  to strip the formwork."
- **Hiring PI:** "Different structures across tools show range; the same methods underneath show depth."

### GP surrogate, options

| Option | Input → output | Model ("expensive") | Why it teaches |
|---|---|---|---|
| **A. Bouncy footbridge** (recommended) | span → peak deck acceleration from one walker; later span × damping | First vertical mode of a simply supported deck; a moving walker with harmonic force; modal time integration | Resonance peaks where the frequency meets walking pace: with too few runs the GP misses them. "A surrogate is only as good as its runs." Links to the vibrometer and to FFT |
| B. Fire protection for a steel beam | section factor × board thickness → minutes to critical temperature | EN 1993-1-2 protected-member heating under ISO 834 | Steel; a smooth 2-D surface; a practical question |
| C. When to strip the formwork | age × curing temperature → concrete strength, from noisy cube tests | EN 1992-1-1 strength development with temperature-adjusted age | Noise is real, and the lower band drives a decision (GPR for early-age strength: Ly et al. 2022) |

### Autoencoder, options

| Option | Data → latent | Unusual = | Why it teaches |
|---|---|---|---|
| **A. Map of European steel sections** (recommended) | IPE, HEA, HEB, HEM: h, b, tw, tf, A, Iy, Iz, Wpl → 2 numbers | a catalog or BIM row with an inconsistent value; the residual bars name the property | The latent plane shows the families as curves, by size and shape. The original and reconstructed sections are drawn on top of each other. Steel, and data quality in BIM |
| B. A building's daily energy curve | 24 hourly values → 2 numbers | a weekend with the cooling left on, a fault | The reconstructed curve sits on the original; the latent plane separates weekdays, weekends and seasons. Built environment (Fan et al. 2018) |
| C. Your desk's spectrum (stretch) | vibrometer spectra → 2 numbers | a book on the desk | Live and physical; may be unreliable with phone sensors |

**Data note for A:**
- Section dimensions come from a free manufacturer catalog (EN 10365 itself is sold).
- The section properties are computed by our own code from h, b, tw, tf and r.

**Honest note for A:** sections of one family scale by power laws, so PCA on log properties already does well. Say so;
it shows the simpler method first.

## 10. Round 7: something 3D (2026-10-23)

Murat: include something 3D, with three.js, fast enough to run everywhere.

**Panel:**
- **Visualization researcher:** "3D for physical things, 2D for charts. No unjustified 3D" (Munzner). Use 3D for the
  frame, the lattice and the bridge; keep GP curves and latent planes flat.
- **Sustainability engineer:** "The grid moves carbon more than tuning members does" (the Price & Myers, Cambridge and
  SCI study in The Structural Engineer, 2020). "A frame where you drag the grid shows it."
- **Architected-materials researcher:** "TPMS lattices are the signature of 3D-printed architected materials (Al-Ketan
  and Abu Al-Rub 2019). Give people an STL."
- **Graphics engineer:**
  - "Instancing, rendering on demand, a pixel-ratio cap, workers."
  - "three.js has been WebGL2-only since r163, so keep a fallback."
- **Architect:** "Let me see the building, not only the number."

### Options

| # | 3D tool | What you do | Ties to | Effort |
|---|---|---|---|---|
| **1** | **Steel frame carbon, in 3D** (recommended) | Set bays, grid spacing, storeys, floor system and steel route (EAF, BOF, reused). Members are sized by simple rules, and quantities go to A1–A5 (C and D apart). The frame is colored by kgCO2e. Read kgCO2e per m², the SCORS band and a range | The carbon calculator (its 3D mode; the quantity mode stays); the course, the book and concApp | medium |
| 2 | **TPMS lattice generator** | Gyroid, Schwarz P or diamond; relative density; cells per side; marching cubes in a worker; STL export; an estimated relative stiffness with its source | Microstructures; metal 3D printing from the fellowship | medium |
| 3 | 3D footbridge for the GP tool | The deck bounces (mode shape, exaggerated and labeled) as a walker crosses; the GP chart beside it | GP option A, the vibrometer | small |
| 4 | Extruded section for the autoencoder | The picked section as a short beam, with its reconstruction as a ghost | Autoencoder option A | small |
| 5 | 3D auxetic panel | The designed cell extruded into a panel, squeezed, contracting sideways | The unit-cell designer | medium |

**Grounding for 1:**
- D'Amico and Pomponi (2018): early-stage steel-frame mass and carbon, with Monte Carlo on the carbon factors.
- Eleftheriadis et al. (UCL): a parametric model of cost and carbon for steel frames.
- The 2020 Structural Engineer study: grid choices outweigh member optimization.

**Grounding for 2:** Al-Ketan and Abu Al-Rub 2019; marching cubes (Lorensen and Cline 1987).

**Recommendation:** 1 as the flagship 3D tool, merged with the carbon calculator; then 2. Options 3 and 4 are small
additions to the GP and autoencoder tools.

### Performance rules (the laser band's playbook, plus tool-specific rules)

- **Loading:** three.js loads by `import()` only on the 3D tool (already a dependency, r176).
- **Fallback:** WebGL2 is required (three.js r163+); without it, a 2D view or a still image with the same numbers.
- **Render on demand** (three.js manual):
  - no loop;
  - draw when a control, the camera or the data changes;
  - animate only during transitions;
  - stop when off screen or the tab is hidden;
  - idle means 0 frames.
- **Pixel ratio:** capped at 1.5 on phones and 1.75 on desktop. MSAA 2 on phones, 4 on desktop. No post-processing in
  tools.
- **Instancing:**
  - one `InstancedMesh` per member type (one draw call each);
  - low-poly sections (an I-shape is 12 vertices);
  - merged static geometry.
- **Lighting:** hemisphere light plus one directional, a constant count so shaders never recompile mid-interaction (a
  laser band lesson). No real-time shadows.
- **Workers:** sizing, Monte Carlo and marching cubes run in a worker, with typed arrays transferred.
- **Budgets:**
  - about 100k triangles on phones;
  - TPMS grid 48³ on phones, 80³ on desktop.
- **Cleanup:** geometries, materials and the renderer are disposed on unmount.
- **Accessibility:**
  - orbit buttons for the keyboard;
  - the numbers also as a table;
  - no auto-rotate under reduced motion;
  - the canvas has `role="img"` and a state label.
- **Measured before shipping:**
  - desktop and a throttled profile;
  - one real phone;
  - targets: 60 fps desktop, at least 30 fps on a mid-range phone, 0 frames when idle.

## References

Checked by web search, 2026-10-23, unless marked.

- Al-Ketan and Abu Al-Rub (2019). Multifunctional mechanical metamaterials based on triply periodic minimal surface
  lattices. Adv. Eng. Mater. 21(10), 1900524. DOI 10.1002/adem.201900524.
- Agnihotri and Batra (2020). Exploring Bayesian optimization. Distill. DOI 10.23915/distill.00026.
- Avci, Abdeljaber, Kiranyaz, Hussein, Gabbouj and Inman (2021). A review of vibration-based damage detection in civil
  structures. Mech. Syst. Signal Process., 107077. DOI 10.1016/j.ymssp.2020.107077.
- Baldi and Hornik (1989). Neural networks and principal component analysis: learning from examples without local
  minima. Neural Netw. 2(1), 53–58.
- Bertucci and Endert (2024). VAE Explainer: supplement learning variational autoencoders with interactive
  visualization. arXiv 2409.09011.
- Dibia. Anomagram: anomaly detection with autoencoders in the browser. anomagram.fastforwardlabs.com;
  github.com/victordibia/anomagram.
- Gibbons, Orr and Arnold (2025). How to calculate embodied carbon, 3rd ed. IStructE. Free PDF.
- D'Amico and Pomponi (2018). Early-stage steel frame mass and carbon, with Monte Carlo on the carbon coefficients.
  Energy Build. 168, 236–250.
- Dallard, Fitzpatrick, Flint, Le Bourva, Low, Ridsdill Smith and Willford (2001). The London Millennium Footbridge.
  Struct. Eng. 79(22), 17–33.
- Eleftheriadis, Dunant, Drewniok et al. A parametric model for cost and embodied carbon of steel structures (UCL
  Discovery, accepted manuscript).
- Echard, Gayton and Lemaire (2011). AK-MCS: an active learning reliability method combining Kriging and Monte Carlo
  simulation. Struct. Saf. 33(2), 145–154. DOI 10.1016/j.strusafe.2011.01.002.
- Fan, Xiao, Zhao and Wang (2018). Analytical investigation of autoencoder-based methods for unsupervised anomaly
  detection in building energy data. Appl. Energy 211, 1123–1135. DOI 10.1016/j.apenergy.2017.12.005.
- Forrester, Sóbester and Keane (2008). Engineering design via surrogate modelling: a practical guide. Wiley.
- Gardner, Kusner, Xu, Weinberger and Cunningham (2014). Bayesian optimization with inequality constraints. ICML,
  PMLR 32, 937–945.
- Görtler, Kehlbeck and Deussen (2019). A visual exploration of Gaussian processes. Distill.
  DOI 10.23915/distill.00017.
- Henderson. Steel construction with trusses. New Steel Construction (SCI): span-to-depth ratios of 10 to 25.
- Hinton and Salakhutdinov (2006). Reducing the dimensionality of data with neural networks. Science 313(5786),
  504–507. DOI 10.1126/science.1127647.
- Hohman, Conlen, Heer and Chau (2020). Communicating with interactive articles. Distill. DOI 10.23915/distill.00028.
- Hullman, Resnick and Adar (2015). Hypothetical outcome plots outperform error bars and violin plots for inferences
  about reliability of variable ordering. PLOS ONE 10(11). DOI 10.1371/journal.pone.0142444.
- Jones, Schonlau and Welch (1998). Efficient global optimization of expensive black-box functions. J. Global Optim. 13,
  455–492.
- Kramer (1991). Nonlinear principal component analysis using autoassociative neural networks. AIChE J. 37(2),
  233–243. DOI 10.1002/aic.690370209.
- Ly et al. (2022). Investigation on factors affecting early strength of high-performance concrete by Gaussian process
  regression. PLOS ONE.
- Lorensen and Cline (1987). Marching cubes: a high resolution 3D surface construction algorithm. SIGGRAPH (from
  memory).
- Maes and Lombaert (2020). Monitoring data for railway bridge KW51 in Leuven, Belgium, before, during, and after
  retrofitting. Zenodo, DOI 10.5281/zenodo.3745914, CC BY-NC-SA 4.0. Paper: J. Bridge Eng. 26(3), 2021.
- McKay, Beckman and Conover (1979). A comparison of three methods for selecting values of input variables in the
  analysis of output from a computer code. Technometrics 21(2), 239–245. DOI 10.2307/1268522.
- Munzner (2014). Visualization analysis and design. CRC Press. Rule of thumb: no unjustified 3D.
- Peeters and De Roeck (2001). One-year monitoring of the Z24-Bridge: environmental effects versus damage events.
  Earthq. Eng. Struct. Dyn. 30(2). (Journal details from memory; the Z24 campaign and its temperature findings are
  confirmed by the SIMCES project record.)
- three.js manual: Rendering on demand. threejs.org/manual/en/rendering-on-demand.
- Rasmussen and Williams (2006). Gaussian processes for machine learning. MIT Press. gaussianprocess.org/gpml.
- Smilkov, Carter, Sculley, Viégas and Wattenberg (2017). Direct-manipulation visualization of deep networks.
  arXiv 1708.03788.
- Robati, Daly and Kokogiannakis (2019). Uncertainty analysis of whole-life embodied carbon of building materials,
  Monte Carlo. J. Clean. Prod. (details from search snippets).
- Sohn, Worden and Farrar (2002). Statistical damage classification under changing environmental and operational
  conditions. J. Intell. Mater. Syst. Struct. 13(9), 561–574.
- What do we mean by efficiency? A holistic approach to reducing embodied carbon (2020). The Structural Engineer (Price
  & Myers, University of Cambridge, SCI, William Hare).
- Tseranidis, Brown and Mueller (2016). Data-driven approximation algorithms for rapid performance evaluation and
  optimization of civil structures. Autom. Constr. 72, 279–293.
- Victor (2011). Explorable explanations. worrydream.com/ExplorableExplanations.
- Worden, Manson and Fieller (2000). Damage detection using outlier analysis. J. Sound Vib. 229(3), 647–667. (From
  memory; the method is confirmed as standard by secondary sources.)
- Autoencoders for anomaly detection are unreliable (2025). arXiv 2501.13864.
- Živanović, Pavić and Reynolds (2005). Vibration serviceability of footbridges under human-induced excitation: a
  literature review. J. Sound Vib. 279(1–2), 1–74. DOI 10.1016/j.jsv.2004.01.019.

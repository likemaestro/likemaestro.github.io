# AI tools: design session

2026-10-23. A brainstorming session with an imagined expert panel, run to decide which AI tools go on the site and how
to design them. It follows `2026-10-23-ai-tool-brainstorm.md` and Murat's framing rule: every tool is a **research
method** (a method Murat uses, on an example people can follow), an **explainer** (not research; for teaching and
attention) or a **utility**, and says which.

Murat's input for this session:
- **EWSHM 2026:** Murat was a team member. The team built an autoencoder for bridge health monitoring (Audience Prize;
  already on the home page). Murat may show the autoencoder idea.

## 1. The panel, and what they would say

| Seat | Why they're in the room | What they'd say |
|---|---|---|
| **Explorable-explanation designer** (Victor, Ciechanowski, Distill editors) | Makes ideas playable | "A widget is not an explanation. Guide the visitor to one phenomenon, then let them play" (Victor 2011). "One figure, one idea. Polish one tool before building three." |
| **Interactive-ML visualization researcher** (Hohman, Chau) | Studies what interactive articles do for readers | Interactive articles connect people and data, make systems playful, prompt self-reflection, personalize reading and reduce cognitive load (Hohman et al. 2020). "Ask the visitor to predict before you reveal." |
| **Uncertainty-visualization researcher** (Hullman) | Knows how people read uncertainty | "Show the GP as animated draws, not only a shaded band. People judge outcomes from draws better than from error bars" (Hullman et al. 2015). |
| **GP and Bayesian-optimization methodologist** | Keeps the method honest | "Show the acquisition function, fit hyperparameters by marginal likelihood (Rasmussen and Williams 2006), and treat the constraint with its own GP (Gardner et al. 2014). Never peek at the truth before the budget is spent." |
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

2. **Predict, then reveal:** a budget, a hidden truth, a score. This is the self-reflection affordance (Hohman et al.
   2020) and the answer to the devil's advocate.
3. **An honest baseline next to the AI:** the autoencoder against Mahalanobis distance and PCA; expected improvement
   against the visitor and against random sampling.
4. **Uncertainty as draws**, animated, with the band (Hullman et al. 2015).
5. **A guided path, then free play** (Victor 2011): three short steps, each showing one phenomenon, then all controls.
7. **Reproducible and citable:** every setting is in the URL; Method, Assumptions and limits, and Cite as on every tool.
8. **Tiny, fast and private:** no ML framework, no server, all in a worker; works offline once loaded.
9. **Labeled:** "Research method" or "Explainer", so nobody mistakes a demo for research.

## 4. Candidates and choice

| # | Tool | Kind | Research link | Shareable | Teaches | New vs. section 2 | Effort | Reuse |
|---|---|---|---|---|---|---|---|---|
| 2 | Bridge anomaly lab: an autoencoder that learns the seasons | Research method | EWSHM 2026 | ●●● | ●●● | ●●● | medium | vibrometer signal code, worker |
| 4 | Where AI fails: a small network vs. the Eurocode buckling curve | Explainer | Workshops | ●● | ●●● | ● | low | — |
| 5 | Steer the GA: the visitor picks parents in the truss tool (after StructureFIT) | Research method | GA in the PhD | ●● | ●● | ●● | medium | truss tool |

**Recommendation:**
- **Build 2 first.** It is the most novel and the most visual. It is ready to start, since the EWSHM project is
  already public on the home page.
- **Later or never:** 4 and 5.

## 5. How to include them

- **Groups:**
  - Monitoring: vibrometer, Bridge anomaly lab.
  - The breadcrumb follows, e.g. "Tools / Monitoring / Bridge anomaly lab".
- **Labels:** a tag on each `/tools` row and a sentence under each tool's line, as proposed in the brainstorm.
- **Featured carousel:** add tool 2, then tool 3, when they ship.
- **Home page:**
  - the EWSHM row gets a link ("Try the autoencoder idea");
- **A short write-up per AI tool:** a "How it works" section, a few hundred words. Writing, more than tools, is what
  brings contacts (Ask HN, "What has your personal website done for you?").
- **Contact:** one line at the end of each tool: "Questions, or want to use this in teaching? Email me." It serves
  Murat's goal of people getting in touch.
- **Sharing:**
  - per-tool Open Graph images (`postbuild` already writes per-page tags);
  - the URL carries the result ("the autoencoder caught it in three days", as a link).

## 6. Designs

### Tool 2: Bridge anomaly lab (build first)

**Story, three guided steps, then free play:**
1. "A bridge's frequencies follow the weather." A year of three natural frequencies, colored by air temperature, and
   a frost spell where they jump.
2. "Train on summer only." The autoencoder learns from June to August, and the first frost raises an alarm: a false
   alarm. This is the Z24 lesson.
3. "Train on a full year." The autoencoder learns the seasons. Then a 2 % stiffness loss in March is caught, while
   the frost no longer is.

**Views, one screen on desktop, stacked on phones:**
- **Timeline:** frequencies over time; the training window as a shaded band you drag; the damage date as a handle
  you drag.
- **Network:** 3 inputs → 8 → **2** → 8 → 3 outputs. Hovering a time point lights its activations.
- **Latent plane:** the 2-D bottleneck.
  - Training points form a curve colored by temperature, so the network has learned the seasons.
  - Damaged points leave the curve.
  - Optional: shade the plane by reconstruction error, which shows the skeptic's point that some off-curve regions
    still reconstruct well.
- **Health indicator:**
  - reconstruction error over time, with the threshold at the 99th percentile of training errors (said plainly: about
    1 % false alarms by construction);
  - Mahalanobis squared distance and linear PCA beside it, the baselines;
  - readouts: detection delay, false alarms per month.

**Controls:**
- damage date and size;
- frost on or off;
- a sensor fault: drift, spikes or stuck;
- the training window;
- noise;
- seed;
- retrain.

**Data:**
- Default: synthetic, seeded, in the URL. Three modes with a temperature-dependent stiffness, stiffening below 0 °C,
  plus traffic and noise.
- Optional "real data" tab: the KW51 railway bridge, with tracked frequencies before, during and after a retrofit
  (Maes and Lombaert; Zenodo 10.5281/zenodo.3745914).
  - Its license is CC BY-NC-SA 4.0, so a derived subset must keep that license and the attribution. A personal,
    non-commercial site fits.

**Method text:** a small dense autoencoder, trained by Adam in a worker. "The EWSHM team's model was an
attention-based multi-modal autoencoder on real monitoring data; this page neither uses nor reproduces it."

**Limits:**
- frequencies are given, not identified from accelerations;
- one synthetic bridge;
- the threshold choice drives the false-alarm rate.

**Credits:**
- method references: Sohn, Worden and Farrar 2002; Worden, Manson and Fieller 2000; Avci et al. 2021;
- "Inspired by Anomagram (Cloudera Fast Forward)."

**Tech:** about 300 lines of TypeScript (MLP, backpropagation, Adam, seeded generator) in a worker; canvas plots.

**Tests:**
- gradients against finite differences, as the solver tests do;
- the generator is reproducible by seed;
- a trained network reconstructs its training data within a tolerance;
- the threshold logic.

## 7. Devil's advocate, and answers

- **"One more GP demo."** Only the engineering problem, the constraint and the reveal justify tool 1. Without them,
  don't build it.
- **"Synthetic data proves nothing."** It is a teaching tool, and synthetic data is the only way to know the truth.
  The KW51 tab shows real behavior.
- **"Shaking a phone is a gimmick."** It is the hook. The explainer leads to the research-method tool.
- **"Too many tools dilute the site."** Ship tool 2 polished before starting tool 3.
- **"A 99th-percentile threshold has false alarms by design."** Say so on the page and show the rate.

## 8. Decisions for Murat

1. **First build:** tool 2 (recommended), or tools 3 and 1?
3. **Tool 2 data:** synthetic only, or also the KW51 tab (CC BY-NC-SA 4.0)?
4. **Tool 2 credit:** name the EWSHM teammates, or "team project, EWSHM 2026"?
5. **Labels:** the kinds and wording from the brainstorm, still open.
6. **Contact:** a contact line at the end of each tool?

## References

Checked by web search, 2026-10-23, unless marked.

- Agnihotri and Batra (2020). Exploring Bayesian optimization. Distill. DOI 10.23915/distill.00026.
- Avci, Abdeljaber, Kiranyaz, Hussein, Gabbouj and Inman (2021). A review of vibration-based damage detection in civil
  structures. Mech. Syst. Signal Process., 107077. DOI 10.1016/j.ymssp.2020.107077.
- Bertucci and Endert (2024). VAE Explainer: supplement learning variational autoencoders with interactive
  visualization. arXiv 2409.09011.
- Dibia. Anomagram: anomaly detection with autoencoders in the browser. anomagram.fastforwardlabs.com;
  github.com/victordibia/anomagram.
- Gardner, Kusner, Xu, Weinberger and Cunningham (2014). Bayesian optimization with inequality constraints. ICML,
  PMLR 32, 937–945.
- Görtler, Kehlbeck and Deussen (2019). A visual exploration of Gaussian processes. Distill.
  DOI 10.23915/distill.00017.
- Hohman, Conlen, Heer and Chau (2020). Communicating with interactive articles. Distill. DOI 10.23915/distill.00028.
- Hullman, Resnick and Adar (2015). Hypothetical outcome plots outperform error bars and violin plots for inferences
  about reliability of variable ordering. PLOS ONE 10(11). DOI 10.1371/journal.pone.0142444.
- Jones, Schonlau and Welch (1998). Efficient global optimization of expensive black-box functions. J. Global Optim. 13,
  455–492.
- Maes and Lombaert (2020). Monitoring data for railway bridge KW51 in Leuven, Belgium, before, during, and after
  retrofitting. Zenodo, DOI 10.5281/zenodo.3745914, CC BY-NC-SA 4.0. Paper: J. Bridge Eng. 26(3), 2021.
- Peeters and De Roeck (2001). One-year monitoring of the Z24-Bridge: environmental effects versus damage events.
  Earthq. Eng. Struct. Dyn. 30(2). (Journal details from memory; the Z24 campaign and its temperature findings are
  confirmed by the SIMCES project record.)
- Rasmussen and Williams (2006). Gaussian processes for machine learning. MIT Press. gaussianprocess.org/gpml.
- Sohn, Worden and Farrar (2002). Statistical damage classification under changing environmental and operational
  conditions. J. Intell. Mater. Syst. Struct. 13(9), 561–574.
- Tseranidis, Brown and Mueller (2016). Data-driven approximation algorithms for rapid performance evaluation and
  optimization of civil structures. Autom. Constr. 72, 279–293.
- Victor (2011). Explorable explanations. worrydream.com/ExplorableExplanations.
- Worden, Manson and Fieller (2000). Damage detection using outlier analysis. J. Sound Vib. 229(3), 647–667. (From
  memory; the method is confirmed as standard by secondary sources.)
- Autoencoders for anomaly detection are unreliable (2025). arXiv 2501.13864.

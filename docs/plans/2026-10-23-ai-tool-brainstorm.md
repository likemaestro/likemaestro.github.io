# AI tool: brainstorm

2026-10-23. Murat wants an interactive tool that shows the AI side of the work. Brainstorm only; nothing is built yet.
Revised the same day under Murat's framing rule (below); the first round's ideas are in this file's git history.

## The gap

- The home page says "I develop AI and computational methods…", but every tool on `/tools` is classical: SIMP and MMA,
  NSGA-II, TOPSIS, VIKOR, AHP, SMAA-2, FFT. A visitor finds no AI.
- Constraints carried over from the tools spec (`2026-10-23-tools-wave1-design.md`):
  - static GitHub Pages, no server, no API keys;
  - "nothing leaves your device";
  - each tool is a lazy chunk, opens with an example, keeps its settings in the URL;
  - Method, Assumptions and limits, Cite under each tool.

## Framing rule (Murat, 2026-10-23)

A tool must never suggest research Murat does not do. So there is no LLM tool: Murat does not work on LLMs. Every tool is
one of three kinds, and says which:

- **Research method:** a method Murat uses, shown on an example people can follow. The example is not the research:
  the truss sizing tool runs NSGA-II, which the PhD uses, but the PhD is not about trusses.
- **Explainer:** a tool that makes an idea easy to see, for teaching and to draw people in. It is not research. The
  sketchpad is one: you draw a cell and its stiffness is computed.
- **Utility:** the world map and the gauge.

Proposed classification, to confirm:

| Tool | Kind | Sentence on the page (draft) |
|---|---|---|
| Unit-cell designer | Research method | "Topology optimization of microstructures, the subject of my MSc and of my 2026 paper. This tool solves the linear elastic case; the research treats nonlinear elastic materials." |
| Property map | Research method | "Designs found with the unit-cell designer's method." |
| Cell sketchpad | Explainer | "An explainer, not my research: draw a cell and see its stiffness." |
| Truss sizing | Research method | "NSGA-II, which I use in my PhD. The truss is an illustrative example." |
| Multi-criteria choice | Research method | "TOPSIS, VIKOR, AHP and SMAA-2, which I use in my PhD. The examples are neutral." |
| Phone vibrometer | Explainer (to confirm) | "An explainer, not my research: measure a natural frequency with a phone." |
| World map, gauge | Utility | none |

Where the kind shows:
- on `/tools`, a small tag on each row;
- on each tool page, the sentence under the one-line description.

## The AI tool

Under the rule, the AI tool uses an AI method that Murat actually uses. Two qualify.

### A. Surrogate-assisted design optimization with a Gaussian process (recommended)

- **The page:**
  - A design problem with a "true" model treated as expensive, with a budget of, say, 15 evaluations.
  - Samples go into a GP. The page shows its mean and 95 % band, as a curve for one variable and a map for two.
  - Expected improvement picks the next sample. The visitor can also click to sample by hand: "you vs. expected
    improvement".
  - When the budget is spent, the true surface appears beside the GP. The page reports the optimum found, the true
    optimum, and the evaluations used.
  - Controls show GP know-how: kernel (squared exponential, Matérn 5/2), length scales, noise, and the leave-one-out
    error.
- **Example, to choose:**
  - **(b) Neutral, microstructures.** A re-entrant honeycomb (rib angle, thickness) evaluated by the quarter-cell
    solver.
  - **(c) Neutral, structures.** Two section sizes of the truss: mass against deflection.
- **Literature:**
  - GPs: Rasmussen and Williams 2006.
  - Expected improvement (EGO): Jones et al. 1998; review: Shahriari et al. 2016.
  - Surrogates in structural design: Tseranidis et al. 2016.
- **Effort:** low to medium. A GP with Cholesky on at most about 50 points, and expected improvement maximized on a
  grid, both run in the worker.
- **Group:** Structures for (a) and (c); Microstructures for (b). A new "Design optimization" group is also possible.

### B. Anomaly detection with an autoencoder (second, to confirm)

- **Why:** the EWSHM 2026 team project (on the home page) used an autoencoder with a statistical baseline for bridge
  health indicators.
- **The page:**
  - A synthetic year of bridge monitoring: a natural frequency that follows temperature, plus noise.
  - Inject a stiffness loss or a sensor fault on a chosen date.
  - A small autoencoder trains in the browser in seconds. Its reconstruction error crosses a threshold when something
    changes.
  - A statistical baseline (PCA or a control chart) runs beside it, so the AI is compared, not just shown.
  - Optional: add frequencies measured with the vibrometer.
- **Group:** Monitoring, next to the vibrometer.
- **Limits:** synthetic data only, never the team's data. Citing the project needs the team's agreement.
- **Literature:** Avci et al. 2021.

### Explainers (not research, labeled)

These are allowed for teaching and attention, as long as they are labeled.
- **"Where AI fails"**, for the workshops. A small network trains on the EN 1993-1-1 buckling curves. Drag the inputs
  past the training range: the network drifts while the formula holds.

### Dropped under the rule

- **LLM tools** (chatbot quiz, plain-language front door, thesis search): not Murat's research.
- **CNN surrogate in the sketchpad, generative inverse design, latent design map:** deep learning on microstructures
  is not Murat's research, and these tools would suggest it is.

## Inspiration

Found 2026-10-23. Reddit blocks the search tool's crawler, so these come from Hacker News ("Show HN", "Ask HN") and
research groups. The rule: take the idea, credit it on the page, write our own code.

| Source | What it does | What we take | For |
|---|---|---|---|
| Distill: A Visual Exploration of Gaussian Processes (Görtler et al. 2019) | An interactive GP explainer | Showing the GP as a band of possible functions that narrows where there is data | A |
| Distill: Exploring Bayesian Optimization (Agnihotri and Batra 2020) | Interactive acquisition functions | The step-by-step sampling view. Our twist: an engineering problem with a constraint and a reveal of the true surface | A |
| MIT Digital Structures: Tseranidis, Brown and Mueller 2016 | Surrogates for fast evaluation of civil structures | The case for surrogates in structural design; their error metrics | A |
| DTU TopOpt app (Aage et al. 2013) | Real-time topology optimization on phones | Precedent for the unit-cell designer; cite under Method | Unit-cell designer |
| MIT Digital Structures: StructureFIT (Mueller and Ochsendorf 2015) | Interactive evolutionary design: the designer steers the GA | Later: let the visitor steer the truss GA | Truss sizing |
| TensorFlow Playground (Smilkov et al. 2017) | Train a small network in the browser, no code | Controls and layout | B, "Where AI fails" |
| Karpathy's ConvNetJS demos | Networks trained in the browser, on a personal Stanford page | A small network needs no framework | B |
| Bartosz Ciechanowski (ciechanow.ski) | Hand-written canvas and WebGL explainers | One deep, polished piece beats several shallow ones | all |

Cautionary findings:

- **In-browser chatbot (Show HN, item 40252569):** the Llama 3 model was over 4 GB; it ran on desktop Chrome and Edge
  only and failed on Safari, iPhone and Linux; commenters reported cache errors and made-up answers.
- **"Chat with my site" bots (SiteGPT, ChatClient):** generic products anyone can add, so they say nothing about
  research skill.
- **"Ask HN: What has your personal website done for you?":** jobs and collaborations mostly came from long-form
  writing; tools came up less often. A short method write-up next to the tool would help.

Credit on the page: one "Inspired by" line under Method, as a citation, e.g. "The sampling view follows Agnihotri and
Batra's Exploring Bayesian Optimization (Distill, 2020)." No code from these projects is used.

## Breadcrumb (done 2026-10-23)

- Tool pages read "Tools / Group / Tool", e.g. "Tools / Microstructures / Unit-cell designer".
- The group links to its section on `/tools` (`/tools#microstructures`, `#decision-support`, …), and `/tools` jumps to
  that anchor.
- The back button still goes to the top of `/tools`.

## Side finding

- `/tools/cutt-ia` (`src/App.tsx`) frames https://cutt-ia.vercel.app/, which returned 404 on 2026-10-23. The page is
  not listed on `/tools`. Revive or remove it.

## Open items for Murat

1. The classification table: kinds, wording, and whether the vibrometer is an explainer.
2. Tag names: "Research method", "Explainer", "Utility"?
4. B: may the site cite the EWSHM project with synthetic data? This needs the team's agreement.
5. Back button: up one level to the group, or to the top of `/tools` as now?

## References

Checked by web search, 2026-10-23. Figures quoted from abstracts.

- Aage, Jørgensen, Andreasen and Sigmund (2013). Interactive topology optimization on hand-held devices. Struct.
  Multidiscip. Optim. 47(1), 1–6.
- Agnihotri and Batra (2020). Exploring Bayesian optimization. Distill. DOI 10.23915/distill.00026.
- Avci, Abdeljaber, Kiranyaz, Hussein, Gabbouj and Inman (2021). A review of vibration-based damage detection in civil
  structures: from traditional methods to machine learning and deep learning applications. Mech. Syst. Signal Process.,
  107077. DOI 10.1016/j.ymssp.2020.107077.
- Görtler, Kehlbeck and Deussen (2019). A visual exploration of Gaussian processes. Distill.
  DOI 10.23915/distill.00017.
- Jones, Schonlau and Welch (1998). Efficient global optimization of expensive black-box functions. J. Global Optim. 13,
  455–492.
- Mueller and Ochsendorf (2015). Combining structural performance and designer preferences in evolutionary design
  space exploration. Autom. Constr. 52, 70–82. DOI 10.1016/j.autcon.2015.02.011.
- Rasmussen and Williams (2006). Gaussian processes for machine learning. MIT Press. Free at gaussianprocess.org/gpml.
- Shahriari, Swersky, Wang, Adams and de Freitas (2016). Taking the human out of the loop: a review of Bayesian
  optimization. Proc. IEEE 104(1), 148–175.
- Smilkov, Carter, Sculley, Viégas and Wattenberg (2017). Direct-manipulation visualization of deep networks.
  arXiv 1708.03788.
- Tseranidis, Brown and Mueller (2016). Data-driven approximation algorithms for rapid performance evaluation and
  optimization of civil structures. Autom. Constr. 72, 279–293.

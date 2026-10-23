# AI tool: brainstorm

2026-10-23. Murat wants an interactive tool that shows the AI side of the work. Brainstorm only; nothing is built yet.

## The gap

- The home page says "I develop AI and computational methods…", but every tool on `/tools` is classical: SIMP and MMA,
  NSGA-II, TOPSIS, VIKOR, AHP, SMAA-2, FFT. A visitor finds no AI.
- Constraints carried over from the tools spec (`2026-10-23-tools-wave1-design.md`):
  - static GitHub Pages, no server, no API keys;
  - "nothing leaves your device";
  - each tool is a lazy chunk, opens with an example, keeps its settings in the URL;
  - Method, Assumptions and limits, Cite under each tool.
- The site already has what most AI demos lack: a trusted solver in the browser (homogenization in the worker, the truss
  FE). An AI tool here can be checked against physics live, in front of the visitor.

## Who should weigh in, and what they would say

- **A hiring PI in ML for mechanics:** "A chatbot wrapper tells me nothing. Show a model you trained on your own data,
  its error on held-out designs, and where it breaks."
- **A practicing steel engineer:** "I won't trust a black box. Show me when it's wrong, and keep the code check in the
  loop."
- **An architecture student from the workshops:** "Let me draw and see something happen at once. Explain the AI in one
  line."
- **An interactive-ML researcher:** direct manipulation and instant feedback teach ML better than text (TensorFlow
  Playground, Smilkov et al. 2017; Teachable Machine, Carney et al. 2020).
- **The site's engineer:** an in-browser LLM is a download of hundreds of MB to several GB and needs WebGPU; a small CNN
  is well under a few MB and runs anywhere. The privacy promise holds either way, since both run locally.
- **A skeptical reviewer:** LLMs are still weak at engineering design. The best model passed 34 % of ENGDESIGN tasks
  (Guo et al. 2025), and ChatGPT's FE-exam results were weakest on calculation-heavy questions (Pursnani et al. 2023). A
  confident wrong answer on a personal site costs more than having no chatbot.

## Ideas

### 1. AI vs. solver in the sketchpad (recommended)

- A small CNN reads the 48 × 48 drawing and predicts E₁, E₂ and ν₁₂ on every brush move. The FE solve still runs on
  stroke end. Both readings sit side by side, with the gap between them.
- Five networks instead of one (a deep ensemble, Lakshminarayanan et al. 2017); their spread is the uncertainty. Draw
  something unlike the training data and the spread widens: "The AI is unsure here; the solver is the reference."
- A running score: "AI within 5 % of the solver on N of your last M drawings."
- Optional: a saliency overlay showing which pixels drive the stiffness.
- **Data and training:**
  - the homogenization code labels tens of thousands of cells offline: the optimized pools, plus random and perturbed
    drawings, plus their D4 copies;
  - circular padding in the convolutions, so the network sees the cell as periodic;
  - trained in PyTorch; weights exported as JSON or ONNX;
  - inference in plain TypeScript in the worker (a few million multiply-adds per network, so milliseconds), or ONNX
    Runtime Web. Five small networks are roughly 0.5–2 MB, fetched only by this page (estimate).
- **Literature:** CNN surrogates for homogenization (Nakka et al. 2023; Pitz and Pochiraju 2023); CNNs for 2D
  metamaterial topology optimization (Kollmann et al. 2020).
- **Why first:**
  - it reuses the sketchpad, the worker and the precompute pipeline;
  - it ties the AI to the MSc and the FEAD paper;
  - it is honest by construction, because the solver checks the AI live;
  - it is already on the wave-3 list as "AI surrogate for homogenization".
- **Effort:** medium; most of it is offline data and training.
- **Risk:** poor accuracy on hand drawings far from the training data. Mixing random drawings into training and showing
  the ensemble spread both address it.

### 2. Inverse design: click a target, get a cell

- On the property map, click any (ν₁₂, E₁) point, including empty regions. A conditional generator proposes three or
  four cells, and the solver places each one where it actually lands, with an arrow from the target.
- **Variant, "AI warm start":** the generated cell seeds the existing SIMP run, and the page shows the iterations with
  and without it. The optimizer has the last word, so a poor guess costs time, not correctness.
- **Literature:** Bastek et al. 2022 (PNAS); Zheng et al. 2023 (Nat. Commun.); Kollmann et al. 2020; Deep-DRAM
  (arXiv 2212.12047).
- The most research-like and visually striking of the set.
- **Risk:** the 464 precomputed designs are far too few; it needs thousands of optimized cells (hours of precompute), and
  generated cells can come out grey or disconnected.
- **Effort:** high.

### 3. Design-space map (latent explorer)

- A 2-D map of a learned latent space of cells. Drag a cursor and the cell morphs continuously, its properties computed
  live. It pairs with the property map: property space beside design space.
- **Effort:** medium; it comes almost free once idea 2's model exists.

### 4. Beat the optimizer (human vs. Bayesian optimization)

- A parametric cell, e.g. a re-entrant honeycomb with rib angle and thickness, evaluated live by the quarter-cell solver
  in milliseconds. The task: "Find the most auxetic cell in ten tries."
- The visitor and a Gaussian-process optimizer (expected improvement; Jones et al. 1998; Shahriari et al. 2016) each get
  ten evaluations. At the end, the GP's mean and uncertainty appear beside the true surface.
- Good for the workshops; it shows sample-efficient optimization, close to the optimization side of the research.
- **Effort:** low to medium; a GP is a few hundred lines of TypeScript.

### 5. Train it yourself: where AI fails

- TensorFlow-Playground-style, for structures. Train a tiny network in the browser on column buckling resistance (the EN
  1993-1-1 curves) from slenderness and section data. Watch it fit, then drag the inputs outside the training range: the
  network drifts while the Eurocode formula holds. One line: "AI interpolates; physics extrapolates."
- Built for the AI workshops for architects and engineers.
- **Literature:** Smilkov et al. 2017; Carney et al. 2020.
- **Effort:** low to medium.

### 6. LLM ideas (lower priority)

- **6a. Check the chatbot.** Curated, dated LLM answers to engineering questions, in the spirit of the talk "ChatGPT as
  an Engineering Assistant". The visitor judges right or wrong, then the site's own tools check. Fully static. It dates
  as models change, so each answer needs its model and date.
- **6b. Ask the tools in plain words.** An opt-in in-browser LLM (WebLLM, Ruan et al. 2024) turns "an auxetic cell at
  35 % volume, 5 × 5 tiles" into a tool URL. Every tool already keeps its settings in the URL, so the model's output is
  short and checkable, and the tool, not the model, does the computing. Cost: hundreds of MB to several GB to download,
  WebGPU only, slow on phones.
- **6c. Ask my thesis.** In-browser embeddings (Transformers.js) search the thesis and papers and return passages with
  page numbers. No generated text, so no made-up answers.

### 7. Damage detection playground (wave 3)

- A synthetic footbridge. Stiffness loss at a chosen place shifts its frequencies, and a classifier trained on synthetic
  cases points to the damaged zone. Visitors can enter frequencies measured with the vibrometer.
- **Literature:** Avci et al. 2021.
- **Risk:** overclaiming SHM from a phone. Synthetic data only, said plainly.

## Recommendation

- **Flagship:** idea 1. It is the only idea that is both real ML on Murat's own research data and checked live by
  physics.
- **Second, lighter:** idea 4 or 5, as a teaching tool for the workshops.
- **Leave out:** a general chatbot.

## Side finding

- `/tools/cutt-ia` (`src/App.tsx`) frames https://cutt-ia.vercel.app/, which returned 404 on 2026-10-23. The page is
  not listed on `/tools`. Revive or remove it.

## Open items for Murat

1. Which direction, or which pair.
2. Is offline training in Python (PyTorch) fine, with the weights committed to this repository?
3. For any LLM idea: is an opt-in download of hundreds of MB acceptable?
4. Placement: a new "AI" group on `/tools`, or AI inside the existing tools (e.g. an AI readout in the sketchpad)?

## References

Checked by web search, 2026-10-23. Figures quoted from abstracts.

- Avci, Abdeljaber, Kiranyaz, Hussein, Gabbouj and Inman (2021). A review of vibration-based damage detection in civil
  structures: from traditional methods to machine learning and deep learning applications. Mech. Syst. Signal Process.,
  107077. DOI 10.1016/j.ymssp.2020.107077.
- Bastek, Kumar, Telgen, Glaesener and Kochmann (2022). Inverting the structure–property map of truss metamaterials by
  deep learning. PNAS 119(1). DOI 10.1073/pnas.2111505119.
- Carney et al. (2020). Teachable Machine: approachable web-based tool for exploring machine learning classification.
  CHI EA '20. DOI 10.1145/3334480.3382839.
- Guo et al. (2025). Toward engineering AGI: benchmarking the engineering design capabilities of LLMs. NeurIPS Datasets
  and Benchmarks. arXiv 2509.16204.
- Jones, Schonlau and Welch (1998). Efficient global optimization of expensive black-box functions. J. Global Optim. 13,
  455–492.
- Kollmann, Abueidda, Koric, Guleryuz and Sobh (2020). Deep learning for topology optimization of 2D metamaterials.
  Mater. Des. 196, 109098. DOI 10.1016/j.matdes.2020.109098.
- Lakshminarayanan, Pritzel and Blundell (2017). Simple and scalable predictive uncertainty estimation using deep
  ensembles. NeurIPS. arXiv 1612.01474.
- Nakka, Harursampath and Ponnusami (2023). CNN surrogate encoding material properties in the microstructure image.
  Sci. Rep. 13, 9079.
- Pitz and Pochiraju (2023). A neural network transformer model for composite microstructure homogenization.
  arXiv 2304.07877.
- Pursnani, Sermet and Demir (2023). Performance of ChatGPT on the US Fundamentals of Engineering exam. Comput. Educ.
  Artif. Intell. 5, 100183. DOI 10.1016/j.caeai.2023.100183.
- Ruan et al. (2024). WebLLM: a high-performance in-browser LLM inference engine. arXiv 2412.15803.
- Shahriari, Swersky, Wang, Adams and de Freitas (2016). Taking the human out of the loop: a review of Bayesian
  optimization. Proc. IEEE 104(1), 148–175.
- Smilkov, Carter, Sculley, Viégas and Wattenberg (2017). Direct-manipulation visualization of deep networks.
  arXiv 1708.03788.
- Zheng et al. (2023). Unifying the design space and optimizing linear and nonlinear truss metamaterials by generative
  modeling. Nat. Commun. PMC10663604.

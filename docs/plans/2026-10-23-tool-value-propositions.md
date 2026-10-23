# Planned tools: value propositions

2026-10-23. Murat asked what each planned tool serves. Each tool gets the same test:
- **Positioning statement** (Moore's template from *Crossing the Chasm*): For [who] who [need], [tool] is a [kind] that
  [benefit]. Unlike [alternative], it [difference].
- **The visitor's job, pain and gain** (Osterwalder et al., *Value Proposition Design*).
- **Who gets value:**
  - practitioners, who use it for real work;
  - learners, who come to understand something;
  - the public, out of curiosity;
  - hiring and research readers, as a signal.
- **What it says about Murat.**
- **Cost and risk.**
- **Verdict.**

## The council on value

- **Product strategist:** "If you can't name who comes back to it, it's a demo, not a tool. Demos are fine, but count
  them as outreach."
- **Practicing engineer:** "I'll use a calculator that saves me Excel and gives a number I can defend. I won't use a
  game to plan demolition."
- **Teacher:** "I'll put a tool on the projector if it shows in a minute what takes ten on the board."
- **Hiring PI:** "Each tool should prove one competence I can name."

## 1. Embodied carbon calculator (structures)

- **Positioning:** For structural engineers, architects and students in Europe who need a quick, defensible embodied
  carbon figure in early design, the calculator is a free browser tool that gives A1–A5 kgCO2e per m² with a SCORS
  band, from European data. Unlike the IStructE Structural Carbon Tool (Excel on a desktop), it runs on any device,
  shares results by link and shows a range, not one number.
- **Job:** estimate and compare the carbon of structural options before the design is fixed.
- **Pains:**
  - Excel-only tools;
  - account walls (EC3);
  - single numbers with no uncertainty;
  - the ICE database cannot be embedded without a licence.
- **Gains:**
  - a number with its range and sources;
  - a link to send a colleague;
  - CSV export.
- **Value:** practitioners ●●●, learners ●●, public ●, hiring ●●●.
- **Says about Murat:** life cycle assessment done to the standards (EN 15978, the IStructE method); the course, the
  book, concApp.
- **Cost and risk:** medium. The carbon factors need updates. It must be labeled an early-design estimate.
- **Verdict:** **Keep.** The most useful tool on the list.

## 2. Why steel beams twist (3D)

- **Positioning:** For steel design students, their teachers and young engineers who struggle to picture
  lateral-torsional buckling, it is a 3D interactive beam that shows the buckled shape and the Eurocode numbers as you
  change the load, the load height and the restraints. Unlike textbooks (static figures) and LTBeam (desktop numbers),
  it shows why in one minute, on any device.
- **Job:** understand LTB, and check Mcr and Mb,Rd for a simple case.
- **Pains:**
  - Mcr is abstract;
  - the C1 tables feel like magic;
  - the effect of load height and restraints is hard to imagine.
- **Gains:**
  - see the beam swing and twist;
  - see a midspan restraint turn the mode into two half-waves;
  - numbers that match the hand calculation.
- **Value:** practitioners ●, learners ●●●, public ●, hiring ●●.
- **Says about Murat:** steel stability and Eurocode fluency; teaching.
- **Cost and risk:** small to medium. It must match the closed forms and SN003; tests cover that.
- **Verdict:** **Keep, and build first.** Clear value, small scope, and it builds the 3D kit.

## 3. The building's chord (3D, sound, autoencoder)

- **Positioning:** For students and curious visitors who have never thought of a building as an instrument, the chord
  is an interactive 3D building that plays its vibration modes as sound and uses an autoencoder to tell damage from a
  warm, crowded day. Unlike AI demos on heartbeats or digits (Anomagram), it shows monitoring AI on a structure, and you
  can hear it.
- **Job:**
  - understand vibration modes;
  - understand that damage shifts frequencies;
  - understand why AI has to learn what "normal" means.
- **Pains:**
  - monitoring and AI feel like black boxes;
  - frequencies are invisible numbers.
- **Gains:**
  - hear the chord change;
  - see the autoencoder's two latent numbers line up with temperature and occupancy;
  - see a damaged state stand out.
- **Value:** practitioners ●, learners ●●●, public ●●●, hiring ●●●.
- **Says about Murat:** structural dynamics, FFT and monitoring, autoencoders (EWSHM 2026 prize), and the ability to
  explain them.
- **Cost and risk:** medium. Sound can read as a gimmick, so the visual twin and the validated model carry the
  substance.
- **Verdict:** **Keep.** The AI and outreach piece.

## 4. Gaussian process tool: structural engineering first

Murat (2026-10-23): "I'm a structural engineer. The focus firstly be that." The footbridge and the construction and
architecture options (boreholes, the old building's concrete, the thermal model) are dropped. The rule applies to every
tool: structural engineering first.

**Council:**
- **Reliability engineer:** "In structural engineering, a GP's main job is to stand in for the expensive solver in
  reliability analysis (the 2025 review of Bayesian learning in structural dynamics; AK-MCS, EGRA)."
- **Code committee member:** "β = 3.8 over 50 years for RC2 is what the Eurocode partial factors are built to deliver
  (EN 1990). Few engineers have seen what that number means."
- **Steel stability researcher:** "The European buckling curves came from more than 1,000 ECCS tests plus theory
  (imperfection L/1000 plus residual stresses), later put in Ayrton–Perry form by Maquoi and Rondal."
- **Hiring PI:** "A GP surrogate in a reliability problem is a structural engineer's GP, not a data scientist's."

### Option A: How safe is safe? (recommended)

- **Positioning:** For structural engineering students and engineers who use partial factors every day but have never
  seen what they buy, it shows a Gaussian process surrogate estimating the probability of failure of a steel column
  from a handful of model runs, and compares the reliability index β with the Eurocode target. Unlike textbook figures,
  you place the runs, watch the surrogate learn the limit state, and check it against the truth.
- **The problem:**
  - a pinned steel column (HEB, S355);
  - random yield strength, initial bow imperfection, permanent load and imposed load (distributions as in the JCSS
    Probabilistic Model Code, to be checked);
  - the "expensive model": the column's resistance with its imperfection (second-order, Ayrton–Perry first yield, the
    basis of the European curves).
  - In practice each run would be a nonlinear FE analysis; here the model is fast, so the GP can be checked against
    the truth.
- **Views:**
  - The standard normal plane of the two dominant variables (resistance and load), with:
    - the true limit state g = 0;
    - the GP's limit state and its uncertainty band;
    - Monte Carlo points, colored safe or failed;
    - the design point and β (Hasofer–Lind).
  - Readouts: Pf and β from Monte Carlo on the GP, against the truth, against the target 3.8.
- **Interaction:**
  - place runs by tapping, or use a plan (grid, random, Latin hypercube);
  - change γM1, γG, γQ, or the load ratio, and see β move: what the partial factors buy;
  - adaptive methods (AK-MCS) are named under Method, not implemented, since there is no optimizer.
- **Value:** practitioners ●●, learners ●●●, public ●, hiring ●●●.
- **Says about Murat:** a GP surrogate used the way structural engineers use it; reliability and the Eurocode basis of
  design; steel stability.
- **Effort:** small to medium. A 2D GP, Monte Carlo, Ayrton–Perry.

### Option B: From tests to the buckling curve

- **Positioning:** For steel design students who use curves a–d without knowing where they came from, a GP fits
  (virtual) column tests against slenderness, with a mean and a 5 % fractile, and lays them over the Eurocode curves.
  It retells the ECCS story and design assisted by testing (EN 1990, Annex D).
- **Value:** practitioners ●, learners ●●●, public ○, hiring ●●.
- **Effort:** small.
- **Caution:** it overlaps with "Why steel beams twist" (also stability and Eurocode curves).

### Option C: Calibrate the model (static load test)

- **Positioning:** For engineers meeting digital twins, a GP emulates an FE model of a steel beam with semi-rigid end
  connections. From a measured midspan deflection under a known load, Bayesian calibration (Kennedy and O'Hagan 2001)
  gives the connection stiffness with its uncertainty, and classifies it per EN 1993-1-8 (rigid, semi-rigid, pinned).
- **Value:** practitioners ●●, learners ●●, public ○, hiring ●●●.
- **Effort:** medium.

**Recommendation:** A. It is the GP's main role in structural engineering, centered on the Eurocode safety level.

## 5. Unbuild it

- **Positioning, as designed:** For students and the public, it is a game about taking a steel building apart for
  reuse without it collapsing. Unlike reading about reuse, it lets you try.
- **The honest test:**
  - **Practitioners:** they would not use it. Real dismantling plans depend on site conditions, connection surveys and
    a temporary works engineer.
  - **Learners:** they get one lesson, "order and bracing matter", which a paragraph and a figure can teach.
  - **The public:** it is fun, but niche.
  - **Hiring readers:** a moderate signal.
  - **Effort:** large.
  - **Risk:** a "safe" sequence in a simplified game could be mistaken for advice.
- **The fast stability rules:**
  - What they were: shortcuts ("a beam needs both supports", "a storey with a brace each way stands") that let the GA
    try thousands of removal orders without running the full frame analysis each time.
  - They can misjudge real cases: a moment-frame bay stands without braces, and a brace in the wrong plane does not
    help.
  - Since the GA itself serves no clear visitor need, both are **dropped**.
- **Value:** practitioners ○, learners ●, public ●●, hiring ●●.
- **Verdict:** **Drop.**
- **If a reuse tool is still wanted, the alternative is "Design from reclaimed stock":**
  - **Positioning:** For engineers designing with reclaimed steel, it matches the members a design needs to a stock of
    reclaimed sections by length and capacity, and reports the carbon saved. Unlike spreadsheets, it finds the best
    match. Matching is the hard part of real reuse projects (the DISRUPT 2 case studies). Stock-constrained design is
    an optimization problem (Brütting, Senatore, Schevenels and Fivet 2020).
  - **Caution:** keep one stock element per member, with no nesting of several members from one bar; bar cutting and
    nesting were left out of the site as too close to the PhD. Murat should confirm before any design work.
  - **Value:** practitioners ●●, learners ●, public ○, hiring ●●.

## Summary

| Tool | Main value | Effort | Verdict |
|---|---|---|---|
| Embodied carbon calculator | Practical: a defensible early estimate | M | Keep |
| Why steel beams twist | Teaching: see LTB in one minute | S–M | Keep, build first |
| The building's chord | Outreach and AI signal: hear monitoring | M | Keep |
| GP: How safe is safe? | Teaching and signal: reliability with a GP surrogate | S–M | Proposed |
| Unbuild it | Fun, but thin for its cost | L | Drop |
| Design from reclaimed stock | Practical reuse | M | Only if Murat confirms it is clear of the PhD |

## References

- Christianson, Pollyea and Gramacy. Traditional kriging versus modern Gaussian processes for large-scale mining
  data. arXiv 2207.10138.
- Brütting, Senatore, Schevenels and Fivet (2020). Optimum design of frame structures from a stock of reclaimed
  elements. Front. Built Environ. 6, 57. DOI 10.3389/fbuil.2020.00057.
- EN 13791:2019. Assessment of in-situ compressive strength in structures and precast concrete components.
- Krige (1951); Matheron (1960s): the origins of kriging (as summarized in secondary sources).
- DISRUPT 2 steel reuse project toolkit (ASBP, 2024).
- NMBU master's thesis (2023). Spatial estimation of depth to bedrock using borehole data: a Gaussian process
  framework.
- Moore (1991). Crossing the chasm. HarperBusiness. The positioning statement template.
- Site Investigation Steering Group (1993). Site investigation in construction, part 1: Without site investigation
  ground is a hazard. Thomas Telford.
- Osterwalder, Pigneur, Bernarda, Smith and Papadakos (2014). Value proposition design. Wiley.
- Other sources as in `2026-10-23-3d-tools-design.md` and `2026-10-23-ai-tools-design-session.md`.
- Westermann and Evins (2019). Surrogate modelling for sustainable building design: a review. Energy Build. 198,
  170–186. DOI 10.1016/j.enbuild.2019.05.057.
- EN 1990: target reliability index β = 3.8 for RC2 over 50 years (4.7 for one year).
- Hasofer and Lind (1974). An exact and invariant first-order reliability format. J. Eng. Mech. Div. ASCE 100(1)
  (from memory).
- Kennedy and O'Hagan (2001). Bayesian calibration of computer models. J. R. Stat. Soc. B 63, 425–464.
- Maquoi and Rondal (1978): the Ayrton–Perry form of the European buckling curves; ECCS test campaigns of the 1960s
  (secondary sources).
- Sudret (2012). Meta-models for structural reliability and uncertainty quantification. arXiv 1203.2062.
- Bayesian learning in structural dynamics: a comprehensive review and emerging trends (2025). arXiv 2505.22223.

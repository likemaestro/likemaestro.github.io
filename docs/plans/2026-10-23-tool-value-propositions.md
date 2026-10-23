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

## 4. Gaussian process tool (the footbridge was rejected by Murat)

**Council:**
- **Geotechnical engineer:** "Kriging, the GP's original form, was born in mining (Krige 1951, Matheron). Its everyday
  construction use is the ground between boreholes."
- **Construction manager:** "Unforeseen ground is a classic cause of cost escalation and late completion ('Without
  site investigation ground is a hazard', Site Investigation Steering Group 1993)."
- **Assessment engineer:** "The lowest-carbon building is the one you keep. Deciding that starts with how strong the
  old concrete really is, from a few cores."
- **ML methodologist:** "Spatial data is where a GP's uncertainty is most honest and most useful."
- **Hiring PI:** "Any of these shows GP fluency. Pick the one with the clearest story."

### Option A: Between the boreholes (recommended; 3D)

- **Positioning:** For architecture, engineering and construction students, and clients who wonder why site
  investigation costs money, it is a 3D building site where you drill boreholes and a Gaussian process (kriging)
  builds the ground model between them, showing how much is still unknown. Unlike borehole logs and static sections, it
  shows the uncertainty live and lets you find out what you missed.
- **Interaction:**
  - Tap the site to drill. Each borehole reveals the depth to the bearing stratum on a hidden synthetic ground, which
    has a buried channel.
  - The GP draws the stratum surface with an uncertainty band, and pile lengths under the building footprint with
    their range.
  - The uncertainty map shows where the model is least sure. The visitor chooses where to drill, so there is no
    optimizer.
  - "Reveal" shows the true ground, and whether the channel was found.
- **Job:** understand how few boreholes become a ground model, and what risk remains between them.
- **Pain:** ground looks certain on a drawing.
- **Gain:** seeing a hidden channel appear only once a borehole lands near it.
- **Value:** practitioners ●, learners ●●●, public ●●, hiring ●●.
- **Says about Murat:** GP fundamentals and uncertainty, applied to construction risk.
- **Grounding:**
  - GPs for depth to bedrock: an NMBU thesis (2023) found an anisotropic Matérn 3/2 kernel best;
  - GP against classical kriging: Christianson, Pollyea and Gramacy (arXiv 2207.10138).
- **3D:** the ground surface and its band, boreholes as cylinders, the building and its piles. True spatial data, so
  3D is justified.
- **Effort:** small to medium.

### Option B: How strong is this old building? (reuse)

- **Positioning:** For engineers and students assessing an existing building for reuse, it maps the in-situ concrete
  strength across the building from a few cores and many cheap rebound readings, with honest uncertainty, and gives a
  characteristic strength per floor. Unlike one average for the whole building, it shows where a weak zone could hide.
- **Grounding:** EN 13791:2019 (cores, plus indirect methods correlated to cores). I found no spatial-GP version of
  this assessment, so the angle is new.
- **Says about Murat:** GP, plus the life cycle and reuse story.
- **Caution:** concrete, not steel.
- **Effort:** medium.

### Option C: Fewer simulations (architecture)

- **Positioning:** A GP learns a building's summer overheating hours from window-to-wall ratio and shading depth after
  a few runs of a simple thermal model, so designers can explore instantly. This is surrogate modeling as practiced in
  sustainable building design (Westermann and Evins 2019).
- **Says about Murat:** surrogates replacing simulations, closest to the current work.
- **Caution:** furthest from structures; it needs a thermal model.
- **Effort:** medium.

**Recommendation:** A. It is GP at home, construction-relevant, 3D, and its story is clear in ten seconds.

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
| GP: Between the boreholes | Teaching: the ground model and its uncertainty | S–M | Proposed (footbridge rejected) |
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

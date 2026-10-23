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

## 4. GP surrogate: the bouncy footbridge

- **Positioning:** For students and engineers meeting surrogate models, the tool shows a Gaussian process learning how
  hard a footbridge shakes under a walker from a few simulation runs, with its uncertainty. Unlike GP demos on toy
  functions, the curve has real resonance peaks that a careless sample plan misses.
- **Job:** understand how many runs a surrogate needs, and how to read its uncertainty.
- **Pains:**
  - surrogates look like curve fitting;
  - toy examples hide the failure cases.
- **Gains:** watch the GP miss a resonance peak, then catch it with one more run.
- **Value:** practitioners ●, learners ●●, public ●, hiring ●●.
- **Says about Murat:** surrogate modeling, used in current work (not named on the site).
- **Cost and risk:** small to medium. It overlaps the chord as an AI piece, and the footbridge model needs care.
- **Verdict:** **Later.** Worth building after the chord, if a second AI tool is wanted.

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
| GP surrogate (footbridge) | Teaching and a surrogate signal | S–M | Later |
| Unbuild it | Fun, but thin for its cost | L | Drop |
| Design from reclaimed stock | Practical reuse | M | Only if Murat confirms it is clear of the PhD |

## References

- Brütting, Senatore, Schevenels and Fivet (2020). Optimum design of frame structures from a stock of reclaimed
  elements. Front. Built Environ. 6, 57. DOI 10.3389/fbuil.2020.00057.
- DISRUPT 2 steel reuse project toolkit (ASBP, 2024).
- Moore (1991). Crossing the chasm. HarperBusiness. The positioning statement template.
- Osterwalder, Pigneur, Bernarda, Smith and Papadakos (2014). Value proposition design. Wiley.
- Other sources as in `2026-10-23-3d-tools-design.md` and `2026-10-23-ai-tools-design-session.md`.

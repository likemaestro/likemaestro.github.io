# Articles: design, and the planning notes for the first one

2026-10-24. Murat asked for an articles section: methods such as Gaussian processes, genetic algorithms and structural
engineering topics, explained from first principles so that anyone can follow them. Same visual system as the home
page (spec: `2026-10-20-website-redesign-design.md`). Articles are written in American spelling, at Murat's request.

## 1. The section

- **`/articles`**: every article, newest first, as rows (date, title, standfirst, topic, reading time).
- **`/articles/<slug>`**: breadcrumb, title with the back button, standfirst, then topic, date and reading time; the
  body in a 44rem column. From 1280 px a contents list (the article's `##` headings) sits beside the body and stays in
  view.
- **Header:** "Articles" joins the section links after Tools.
- **Format:** MDX (`@mdx-js/rollup`): Markdown with JSX, so a figure is a React component placed between paragraphs.
  - Math is `$…$` and `$$…$$`, turned into MathML at build time by `remark-math` and `rehype-katex` (`output: "mathml"`).
    The page ships no math library and no math fonts, like the MathML in the hero.
  - Chrome's MathML ignores `mathvariant` other than normal, so a small rehype step in `vite.config.ts` swaps bold,
    bold-italic and script letters (`\mathbf{y}`, `\boldsymbol\alpha`, `\mathcal{G}`) for their Unicode math letters.
  - Chrome also ignores `columnalign`: in `\begin{aligned}` the relation signs line up, but the left column is left
    aligned rather than right aligned. Acceptable; avoid relying on right alignment.
  - `katex` is overridden to 0.19.1 in `package.json`; the version `rehype-katex` asks for has an advisory, and
    `npm audit` stays at 0.
- **Each article is its own chunk**, loaded only when opened. The main bundle grew by about 1 kB (routes, header link).
- **Link previews and 200s:** `scripts/postbuild.js` reads `src/articles/articles.json` as well as the tools list, writes
  `/articles.html` and `/articles/<slug>.html` with each title and description (`og:type` article), and adds them to the
  sitemap.

### Adding an article

1. Add an entry to `src/articles/articles.json`: `slug`, `title`, `line` (the standfirst and link-preview description,
   200 characters at most), `topic`, `date` (ISO), `minutes`.
2. Write `src/articles/<slug>/index.mdx`. Interactive figures go in a `figures.tsx` beside it, their maths in a plain
   module with its own tests (see `gaussian-processes/gp.ts`). A figure's caption is its children in the MDX.
3. `npm test` checks that every listed article has a body and the other way round, that each renders, that the reading
   time matches the length, and that no KaTeX markup is left for the browser. `npm run build` writes the pages.

## 2. How the articles are planned

Each article goes through Murat's Veritaskill method (built for science videos), adapted to text: evidence boundary,
audience model, conceptual obstacle, a structure chosen for that obstacle, then an adversarial check of every claim.
The storyboard becomes the figures: each one has a job (show, compare, reveal, quantify), sits next to the paragraph
that uses it, and has its labels on the plot. Two differences from video: a reader sets the pace, so segmenting matters
less than clear headings; and the refutation-text evidence the method cites (Danielson et al., 2025) was measured on
written texts, so it applies to articles more directly than to video.

## 3. Planning notes: "Gaussian processes from first principles"

**Snapshot**
- **Audience:** engineering students, engineers and curious readers who know a bell curve, a mean and a standard
  deviation; little or no linear algebra. Graduate readers get the formulas in collapsed boxes.
- **Learning goal:** a Gaussian process treats a function's values as jointly Gaussian, with correlations set by
  distance through a kernel; predicting is conditioning on the measured values, so the band is narrow near data and
  returns to the prior far from it.
- **Obstacle:** a missing prerequisite (what conditioning on a correlated value does) and the leap to "a distribution
  over functions". No documented misconception for this audience.
- **Structure:** prediction, then reveal, with a direct explanation of the two prerequisites first. The two prediction
  prompts target the central idea: where the band is widest, and whether it depends on the measured values.

**Key claims** (all `source_fact` unless marked)

| ID | Claim | Source | Scope |
|---|---|---|---|
| C01 | GP: random variables, any finite number jointly Gaussian; specified by mean and covariance function | R&W 2006, p. 13 | Definition |
| C02 | Conditioning: mean μ + CB⁻¹(y − μ), covariance A − CB⁻¹Cᵀ | R&W eq. A.6 | Two-variable case derived from it (`synthesis`) |
| C03 | SE kernel; ρ(ℓ) = 0.61, ρ(3ℓ) = 0.01 | R&W eqs. 2.16, 2.31; arithmetic | |
| C04 | Posterior mean and covariance; mean is a sum of kernel bumps | R&W eqs. 2.19, 2.27 | |
| C05 | Variance depends on the inputs, not the outputs | R&W p. 18 | Fixed hyperparameters (caveat in text) |
| C06 | Noisy observations add σn² to the diagonal | R&W eqs. 2.22–2.24 | |
| C07 | Hyperparameters by maximizing the marginal likelihood; can overfit; one length scale per input | R&W secs. 5.1, 5.2 | |
| C08 | SE is infinitely differentiable; Stein recommends Matérn | R&W sec. 4.2.1 | Stein cited through R&W |
| C09 | Cholesky n³/6; large data need approximations | R&W Algorithm 2.1, ch. 8 | |
| C10 | Kriging named after Krige by Matheron; theory back to Wiener and Kolmogorov; Sacks et al. for computer experiments, noise-free | R&W sec. 2.8; Krige 1951 | |
| C11 | EGO weighs mean against uncertainty; AK-MCS adds runs where failure or survival is least certain | Jones et al. 1998; Echard et al. 2011 | Summaries of the methods |
| D01 | "Suppose a model takes an hour", beam deflections at A and B move together | — | `creative_device`, framed as supposition |

The worked numbers (±0.09, ±1.29, ±1.95, correlations 0.43 and 0.08) are computed from the figure's own data by
`gp.ts`, at ℓ = 1.2.

**Don't claim:** that the band guarantees where the true function is; that a GP makes no assumptions; that GPs scale to
any data size; that Krige invented GP regression; that GPs are the best surrogate model.

**Prior conceptions**

| Conception | Status | Use |
|---|---|---|
| Uncertainty is largest where the data are, or uniform | `intuitive_prediction` | First prediction prompt |
| The band changes when the measured values change | `intuitive_prediction` | Second prediction prompt |
| The band is a guarantee | `plausible` | Answered in "The assumptions live in the kernel" and "Where it stops working"; no claim that readers hold it |

**Integrity review:** the 12 ledger rows, the worked numbers and the 3 figures checked.

| Element | Issue | Verdict | Fix |
|---|---|---|---|
| "The code is about a hundred lines" | Not true of figures.tsx (about 300 lines) | REVISE → fixed | "follows the same steps" |
| Krige's work | First draft said he estimated gold content of ore in the mines; sources say valuation of gold deposits from few samples | REVISE → fixed | "how to value gold ore on the Witwatersrand from a limited number of samples" |
| "The band is calibrated" | Only true when the kernel matches the hidden function | REVISE → fixed | Scoped to ℓ = 1.2, "averaged over many hidden functions, at about 95% of inputs" |
| "Variance does not depend on the outputs" | Not true once ℓ is fitted to the data | REVISE → fixed | Caveat paragraph after the claim |
| Figure 1, densities | First draft's scale ran the "after" curve off its strip at most correlations | REVISE → fixed | One scale for both, so the narrower belief is also taller, clipped above ρ ≈ 0.95; caption says "drawn to the same scale" |
| Figure 1, scatter | Points outside the axes were drawn over the labels | REVISE → fixed | Clipped to the plotted range |
| Figure 3, band | Could be read as a band for new noisy measurements | REVISE → fixed | Text says it is the band for the underlying function |

All other claims: PASS. Veritaskill's `lint_narration.py` on the text: no audience claims; three certainty words, each
correct in context ("always equal" for a correlation of 1, "never formed" for K⁻¹ in code, "not a guarantee").

**Verify before publishing:** Krige (1951) volume and pages (from secondary listings); that Unicode bold letters show in
the reader's math font (Cambria Math on Windows, STIX Two Math on macOS have them).

**Design provenance:** predicting before the reveal and targeting the prompts at the central idea (experimental learning
evidence: prequestions, predict-before-demonstration); labels on the plot and figures next to their text (broader
learning-science evidence: spatial contiguity, signaling); optional formula boxes for graduate readers (expertise
reversal); one central thread, with history as a short closing section (coherence).

## 4. Next articles

Proposed, in order: genetic algorithms (with the truss-sizing tool as the live figure), then a structural topic such as
buckling or why a truss carries load. Murat to pick.

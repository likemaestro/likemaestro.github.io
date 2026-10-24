# Handoff spec: Embodied carbon of a structure

## Overview

- **Value proposition:** For structural engineers, architects and students in Europe who need a quick, defensible
  embodied carbon figure in early design, it is a free browser tool that gives A1–A5 kgCO2e per m² with a SCORS rating
  and a range, from European data. Unlike the IStructE Structural Carbon Tool (Excel on a desktop), it runs on any
  device, compares up to three options side by side, shares results by link, and shows a range instead of one number.
- **The visitor's job:** estimate and compare the carbon of structural options before the design is fixed.
  - Pains: Excel-only tools, account walls, single numbers, unclear data licences.
  - Gains: a number with its range and sources, a link for a colleague, CSV export.
- **Murat's choices (2026-10-23):**
  - the structure only (substructure and superstructure, as SCORS);
  - European data;
  - the page names the course "Life-Cycle Driven Structures", the Wiley book *Metals Driving Sustainable Construction*
    and concApp.
- **In scope:**
  - A1–A5, the minimum scope of the IStructE guide;
  - A–C, with C1–C4;
  - biogenic carbon reported apart from A1–A5;
  - module D reported apart from everything;
  - per m² GIA; SCORS band;
  - Monte Carlo range;
  - three options; CSV and JSON export; a share link.
- **Out of scope:**
  - facades, MEP, fit-out;
  - operational carbon;
  - B modules other than B4, which is 0 for the structure (its lifespan equals the 60-year reference study period);
  - project-specific EPD entry beyond a custom factor.

## Route and registry

| Field | Value |
|---|---|
| Path | `/tools/embodied-carbon` |
| Slug | `embodied-carbon` → `src/tools/embodied-carbon/` |
| Title | Embodied carbon of a structure |
| Line | A1–A5 embodied carbon of a building structure per m², with a SCORS rating and a range, from European data. Compare three options and share them. |
| Group | Life cycle (new) |
| `methodRef` | `{ label: "IStructE guide", href: "https://www.istructe.org/resources/guidance/how-to-calculate-embodied-carbon/" }` |

## Files

- `EmbodiedCarbon.tsx`: the page.
- `calc.ts`: the IStructE equations; pure.
- `mc.ts`: the Monte Carlo range.
- `state.ts`: the option schema and URL encoding.
- `Scors.tsx`: the band ladder in SVG.
- `Charts.tsx`.
- Tests: `calc.test.ts`, `mc.test.ts`, `state.test.ts`.
- Data comes from `src/tools/carbon/factors.ts` (see `shared-foundations.md` §8).

## Method (`calc.ts`), after IStructE *How to calculate embodied carbon*

Equation numbers are the 2nd edition's (2022). The 3rd edition (2025, aligned with the RICS whole life carbon
assessment, 2nd edition) is current. **Verify** every default and equation against it before shipping, and update the
citation.

For each material row i, with design quantity Qi in kg:

**A1–A3:** EC_A13 = Σ Qi·ECF_A13,i (2.10). ECF_A13,i is the factor's `a1a3` (fossil plus land use), or the row's custom
value.

**A4:** ECF_A4,i = Σ_mode TD_mode·TEF_mode (2.2). Scenario defaults (Table 2.5):

| Scenario | Road km | Sea km | ECF_A4 (kgCO2e/kg) |
|---|---|---|---|
| Local | 50 | 0 | 0.005 |
| National | 300 | 0 | 0.032 |
| European | 1,500 | 0 | 0.161 |
| Global | 200 | 10,000 | 0.183 |
| Custom | user | user | computed |

- TEFs (Table 2.4, UK DEFRA 2021): road, average laden 0.10749 gCO2e/kg/km; sea 0.01614; rail 0.02782.
- These are UK factors; label them "UK transport factors (IStructE Table 2.4)". **Verify** whether the 3rd edition
  gives European ones.

**A5w (waste):** ECF_A5w,i = WFi·(ECF_A13,i + ECF_A4,i + ECF_C2,i + ECF_C34,i) (2.3), with WFi = 1/(1 − WRi) − 1
(2.4). Default waste rates (Table 2.6):

| Material | WR | WF |
|---|---|---|
| Concrete in situ | 5 % | 0.053 |
| Concrete precast | 1 % | 0.010 |
| Steel reinforcement | 5 % | 0.053 |
| Steel frame (beams, columns, braces) | 1 % | 0.010 |
| Timber frames | 1 % | 0.010 |
| Timber floors (joists, board) | 10 % | 0.111 |

**A5a (site activities):** EC_A5a = CAEF·PC/100,000 (2.5), with CAEF = 700 kgCO2e per £100,000 for substructure plus
superstructure. PC is the project cost in £.
- The input is optional. If it is empty, A5a is **not included** and the results say so.
- The field reads "Construction cost of the structure (£, for site emissions; optional)", with a `Tip`: "IStructE's
  rate is per £100,000 and comes from UK data. Leave it empty to exclude site activities."

**A1–A5:** EC_A15 = EC_A13 + Σ Qi·(ECF_A4,i + ECF_A5w,i) + EC_A5a (2.11). This is the headline and the basis of
SCORS.

**Biogenic:** Σ Qi·`biogenic`i, with −1.64 kgCO2e/kg as the default for timber when the dataset lacks it (2.1). It is
**reported alongside A1–A5, never inside it.** It counts only if the timber is FSC or PEFC certified: a checkbox per
timber row, on by default, with a `Tip`.

**C (end of life):**
- EC_C1 = 3.4 kgCO2e/m² × GIA (2.7).
- ECF_C2 = 0.005 kgCO2e/kg (50 km by road, Table 2.7).
- ECF_C34 = the factor's `c3c4`, else 0.013 kgCO2e/kg (2.8). For timber without a dataset value, 1.66 kgCO2e/kg (the
  UK scenario of Table 2.8); **verify** a European alternative.

**A–C:** EC_AC = EC_A15 + Σ Qi·(ECF_B4 + ECF_C2,i + ECF_C34,i) + EC_C1 (2.12), with ECF_B4 = 0. Biogenic carbon is
included in A–C (as in the guide's Appendix B).

**D:** EC_D = Σ Qi·ECF_D,i (2.13), from the dataset's `d` where declared. It is **always reported separately**; rows
without D are listed as "not declared".

**Normalization:** divide by GIA (m²), which is required and greater than 0.

**SCORS band** of A1–A5 per m²:
- A++ [0, 50), A+ [50, 100), A [100, 150), B [150, 200), C [200, 250), D [250, 300), E [300, 350), F [350, 400),
  G ≥ 400.
- These are 50 kgCO2e/m² bands on A1–A5 of substructure plus superstructure per m² GIA (Arnold et al. 2020). Lower
  edges are inclusive.

**Sense check line:** "Typical new-build structures fall between 150 and 400 kgCO2e/m² (SCORS B to G) (IStructE, 2.3.3)."

**Rounding:** totals to the nearest tCO2e and per-m² values to the nearest kgCO2e/m² (guide 2.3.4). Full precision is
kept internally and in the CSV.

## Range (`mc.ts`)

- 2,000 seeded samples. Each sample:
  - multiplies every A1–A3 factor by U(1 − sf, 1 + sf);
  - multiplies every quantity by U(1 − sq, 1 + sq);
  - recomputes A1–A5 per m².
- Defaults: sf = 0.20 and sq = 0.10. These are **assumptions**, editable under "Range settings". The guide asks for
  ranges to be reported (e.g. "± 20 %", 2.3.4); Monte Carlo practice follows Robati et al. (2019).
- Outputs: P5, P50 and P95 per m², and the share of samples in each SCORS band.
- Zero spread collapses to the deterministic result.
- Runs on the main thread (2,000 × rows is cheap); debounced 300 ms after edits.

## Inputs and state (`state.ts`)

```ts
interface Row { f: string; q: number; u: "kg" | "t" | "m3"; el: "sub" | "frame" | "floors" | "roof" | "cores";
  tr: "local" | "national" | "european" | "global" | "custom"; road?: number; sea?: number;
  wr?: number;           // overrides the factor's default waste rate
  cf?: number;           // custom A1–A3 factor (kgCO2e/kg); replaces the dataset value
  cert?: boolean }       // timber certified (biogenic counted)
interface Option { n: "A" | "B" | "C"; label: string; gia: number; cost?: number; rows: Row[] }
interface State { v: 1; o: Option[]; sf: number; sq: number; seed: number }
```

- **URL:** one `text` param `s`, base64url(JSON), validated by a schema (`ok`). If the encoded state exceeds 1,800
  characters, the share button says "Too long for a link. Download it as JSON instead" and offers JSON.
- **Volume input** needs the factor's `density`. If it is missing, the row is flagged "Enter mass for this material".
- **The example (default):** the single-storey pavilion of IStructE Appendix B: GIA 792 m², £800,000. Rows:
  - in-situ concrete 116.6 m³ (slab and pads);
  - rebar 10.5 t;
  - steel frame 31.7 t (sections, national);
  - CLT 134.4 m³ (European).
  It uses European factors, so its result differs from the guide's 163 kgCO2e/m². The caption says: "The guide's UK
  factors give 163 kgCO2e/m²; the European factors here give …".
- **Options B and C:** "Add option" duplicates the current option for editing. The page opens with option A only, so
  no comparison is invented.

## Layout

**Top (`flex flex-wrap items-end gap-x-6 gap-y-3 pb-4`):**
- the option tabs A, B, C (`Segmented`) on phones; on `xl` all three options show side by side;
- `btn` "Add option" (up to 3);
- `btn` "Share link";
- `btn` "CSV";
- `btn` "JSON";
- `btn` "Data and sources" (opens the factors panel).

**Above `xl` (≥ 1280 px):** three columns (`xl:grid-cols-3`, `gap-x-8`), one per option, each:
1. **Header:**
   - an editable label (`t-h3` input, max 40 characters, truncates with an ellipsis in charts);
   - GIA (m², number input);
   - cost (optional).
2. **Material table:** rows with material (select grouped by `group`), quantity, unit, element, transport, and a "⋯"
   button for waste, custom factor and certification. Then `btn` "Add material", and remove buttons per row ("Remove
   row 3").
3. **Result card:**
   - the large `t-display`-sized number "163 kgCO2e/m²" with "A1–A5" above it in `t-small`;
   - the SCORS ladder (below);
   - the range "P5–P95: 131–198 kgCO2e/m²" and the band shares as a single stacked bar with letter labels;
   - a totals table: A1–A3, A4, A5w, A5a (or "not included"), **A1–A5**; then, separated by a rule, Biogenic (apart),
     C1, C2, C3–C4, **A–C**, D (apart). t-data, right-aligned numbers;
   - "By element" and "By material" bars.
   - Warnings list (`t-small`, prefixed "Note:").

**Below the options (`border-t border-rule`):**
- a comparison chart: one horizontal bar per option at its A1–A5 per m², P5–P95 whiskers, SCORS band backgrounds as
  alternating `wash` and `canvas` stripes labeled with letters;
- the sense-check line.

**SCORS ladder (`Scors.tsx`):**
- nine stepped bars (A++ shortest, G longest), each 14 px tall, labels inside in `t-small`;
- fills in a grey ramp (`wash` for A++ to `ink-2` for G), with letters as the primary cue;
- the option's band marked with an ink arrow and its value;
- caption: "After the IStructE SCORS rating (Arnold et al. 2020), redrawn."
- The original green-to-red colors are **not** used: the site palette is restrained, and color must not be the only
  cue.

| Breakpoint | Changes |
|---|---|
| ≥ 1280 | Three options side by side |
| 1024–1279 | Two side by side; the third reached by tabs; the comparison chart shows all three |
| 640–1023 | One option at a time (tabs); material rows as two-line cards (material and quantity; element, transport and "⋯") |
| < 640 | As 640–1023, full width; the result card above the material table so the number shows first; the ladder at 100 % width |

## States and interactions

| Element | State | Behavior |
|---|---|---|
| Page | First load | Fetch `/data/carbon-factors.json`; show skeleton rows (`wash` blocks) for at most 400 ms, then the example |
| Factors | Fetch error | `t-small` "The carbon data didn't load. Retry" (`btn`); inputs disabled |
| Any input | Change | Recompute at once (deterministic); the Monte Carlo range 300 ms after the last edit; the URL updates (`replace`) |
| Quantity | Invalid (empty, negative, not a number) | Row border `ink`, a message under the row "Enter a quantity of 0 or more"; the row is excluded and listed in Notes |
| GIA | 0 or empty | The per-m² results show "—"; message "Enter the gross internal area" |
| Material | Factor missing in the data (old link) | Row flagged "This material is no longer in the data; choose another"; excluded |
| Custom factor | Set | The row shows "Custom factor 1.20 kgCO2e/kg"; the source column reads "User" |
| Share link | Click | Copy to the clipboard; status "Link copied, with these options" (the ToolShell pattern); fallback: select the text |
| CSV | Click | Rows plus results, full precision, with the factor sources and the data version in the header |
| Add option | At 3 | Disabled, with `Tip` "Three options at most" |
| Remove option | At 1 | Disabled |

## Edge cases

- **50+ rows in one option:** allowed; the table scrolls inside the card on phones.
- **Long labels:** 40 characters at most; charts truncate at 18 with a title attribute holding the full text.
- **Timber without certification:** biogenic 0, and the note "Biogenic carbon not counted: timber not certified".
- **Very large numbers** (stadia): thin-space thousands ("12 400 tCO2e").
- **The link from an older data version:** state v1 keeps factor ids; if a factor's values changed, the results use
  the current data and a note says "Carbon data updated since this link was made".

## Copy (drafts for Murat)

- **Method:**
  - "The calculation follows the IStructE guide *How to calculate embodied carbon*: quantities times carbon factors for
    modules A1–A3, transport to site (A4), waste and site activities (A5); end of life (C1–C4) and module D are added
    as the guide sets out, with biogenic carbon and module D always reported separately (EN 15978, EN 15804)."
  - "Carbon factors for products come from ÖKOBAUDAT (EN 15804+A2). Transport, waste and end-of-life defaults are the
    guide's."
  - "The rating uses the IStructE SCORS bands on A1–A5 per m² of gross internal area. The range comes from sampling
    the carbon factors and quantities within the stated spreads."
- **About this tool (last paragraph of Method):** "I work on life cycle assessment of structures: as a teaching
  assistant on Life-Cycle Driven Structures at Politecnico di Milano, as co-author of *Metals Driving Sustainable
  Construction* (Wiley, forthcoming), and in concApp, an early-stage structural design app that optimizes for cost and
  embodied carbon." (Murat to approve the wording.)
- **Assumptions and limits:**
  - "An early-design estimate, not a certified assessment."
  - "Generic European factors; specific EPDs will differ."
  - "Transport and waste defaults are UK-based guide values; A5 site activities use a UK cost-based rate and are
    optional."
  - "The spreads behind the range are assumptions you can change."
  - "Structure only: substructure and superstructure."

## Tests

**IStructE Appendix B fixture** (guide factors, not ÖKOBAUDAT):
- Quantities: concrete 279.8 t, rebar 10.5 t, steel 31.7 t, CLT 62.5 t; GIA 792 m²; PC £800,000.
- Factors:

  | Material | A1–A3 | A4 | Other |
  |---|---|---|---|
  | Concrete | 0.100 | 0.005 | WR 5 % |
  | Rebar | 0.760 | 0.032 | WR 5 % |
  | Steel | 1.740 | 0.032 | WR 1 % |
  | CLT | 0.250 | 0.161 | biogenic −1.640; C3–C4 1.66 (the guide uses 1.662 inside A5w); WR 1 % |

| Check | Expected (guide) |
|---|---|
| ECF_A5w | concrete 0.007, rebar 0.043, steel 0.018, CLT 0.004 (3 d.p.) |
| A1–A5, concrete + rebar | 40 tCO2e |
| A1–A5, steel | 57 tCO2e |
| A1–A5, CLT | 26 tCO2e |
| A5a | 6 tCO2e |
| **A1–A5 total** | **129 tCO2e, 163 kgCO2e/m², SCORS B** (± 1 in the last digit) |
| Biogenic | −102 tCO2e (the guide shows −103 in the working and −102 in the results; accept either) |
| C1 | 3 tCO2e |
| C2–C4 | concrete + rebar 5, steel 1, CLT 104 tCO2e |
| **A–C** | **139 tCO2e, 176 kgCO2e/m²** |

**Unit tests:**
- WF: WR 5 % gives 0.0526; WR 1 % gives 0.0101.
- A4 scenarios: 0.005, 0.032, 0.161 and 0.183 kgCO2e/kg (from the TEFs).
- SCORS edges: 49.9 → A++, 50 → A+, 149.9 → A, 150 → B, 400 → G.
- Monte Carlo: deterministic for a seed; zero spread gives P5 = P50 = P95 = the deterministic value; band shares sum
  to 1.
- State: URL round-trip; invalid base64 or schema is clamped to the default with the ToolShell note.
- Factors: schema validation of `carbon-factors.json`.

**Hand check by Murat:** the default example against the IStructE Structural Carbon Tool v3 with the same factors
(entered as custom values), within 2 %.

## Acceptance

- [ ] The Appendix B fixture reproduces the guide's numbers within the stated tolerances.
- [ ] The 3rd-edition check is done and the citation updated.
- [ ] ÖKOBAUDAT dataset UUIDs chosen by Murat; the data version shown in "Data and sources".
- [ ] The README definition of done.

## Follow-up (after this ships)

- Truss sizing shows kgCO2e beside steel mass, with the steel route as a setting (from the shared factors).
- The surrogate frame's carbon line links here with the frame's steel mass prefilled.

## References

- Gibbons, Orr, Archer-Jones, Arnold and Green (2022). How to calculate embodied carbon, 2nd ed. IStructE (equations
  2.1–2.13, Tables 2.4–2.8, Appendix B). Gibbons, Orr and Arnold (2025), 3rd ed.
- Arnold, Cook, Cox, Gibbons and Orr (2020). Setting carbon targets: an introduction to the proposed SCORS rating
  scheme. The Structural Engineer 98(10), 8–11.
- EN 15978; EN 15804+A2; RICS whole life carbon assessment for the built environment, 2nd ed.
- ÖKOBAUDAT (BMWSB/BBSR), EN 15804+A2 datasets.
- Robati, Daly and Kokogiannakis (2019). J. Clean. Prod. (Monte Carlo uncertainty of embodied carbon).
- IStructE / Elliott Wood, The Structural Carbon Tool v3 (2025), for the hand check.

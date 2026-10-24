# Embodied carbon of a structure: verification record

Date: 24 October 2026. Code: `src/tools/embodied-carbon/`, `src/tools/carbon/` (factors and their data),
`scripts/carbon-factors.py` and `scripts/carbon-factors.config.json` (the data pipeline). Spec: the reviewed
`tool-embodied-carbon.md` and `shared-foundations.md` §8, with the deviations listed at the end.

## Status

| Item | Status |
|---|---|
| Implemented | Yes, to the IStructE guide's **2nd edition** (2022); the 3rd edition's changes are not included (below) |
| Numerically verified | Yes: the guide's Appendix B worked example reproduced within the stated tolerances; unit tests for every default |
| Independently benchmarked | Partly: against the guide's worked example. Murat's check against the IStructE Structural Carbon Tool v3 is open |
| Browser-tested | Yes: headless Chromium 153, production build, at 375 × 812 (touch) and 1280 × 900 |
| Accessibility-tested | Partly: axe-core 4.10.3 (WCAG 2 A/AA), labelled controls; no screen-reader session |
| Ready for owner review | Yes |
| Ready to publish | No: Murat to approve the datasets (table below), the 3rd-edition question, the copy (the "About this tool" paragraph) and the new group "Life cycle" |

## Commands and observed results

- `python3 -I scripts/carbon-factors.py CACHE_DIR`: fetched the 12 datasets from the ÖKOBAUDAT API and wrote
  `src/tools/carbon/carbon-factors.json` (values below).
- `npm test`: the six tests in `calc.test.ts` pass (fixture, defaults, rows, Monte Carlo, state, data).
- `npm run build`: passed; postbuild wrote 13 pages.

### The guide's worked example (Appendix B, the guide's own UK factors)

| Check | Guide | This tool (unrounded) |
|---|---|---|
| ECF_A5w, kgCO2e/kg | concrete 0.007, rebar 0.043, steel 0.018, CLT 0.004 | 0.0065 (the guide rounds WF to 0.053), 0.043, 0.018, 0.004 |
| A1–A5 | 129 t, 163 kgCO2e/m², SCORS B | 128.40 t, 162.1 kgCO2e/m², B |
| Biogenic | −102 / −103 t | −102.50 t |
| A–C | 139 t, 176 kgCO2e/m² | 138.58 t, 175.0 kgCO2e/m² |

The guide's 129 t is the sum of its rounded parts (40 + 57 + 26 + 6); the tests compare rounded figures, as the guide
reports them, within ±1. Timber's waste term (2.3) includes its biogenic carbon, which leaves again with the waste at
end of life: without it, CLT's ECF_A5w would be 0.021 instead of the guide's 0.004.

Unit tests also cover: waste factors (5 % → 0.0526, 1 % → 0.0101); the four transport scenarios (0.005, 0.032,
0.161, 0.183 kgCO2e/kg from the guide's TEFs); SCORS edges (49.9 → A++, 50 → A+, 149.9 → A, 150 → B, 400 → G);
custom factors, uncertified timber, undeclared D, excluded rows; the Monte Carlo (seeded, zero spread equals the
deterministic value, band shares sum to 1); the URL state (round trip including non-ASCII labels; invalid input
rejected); unit conversion (m³ needs a density); the factor data (schema, license, a malformed file fails).

### The data: ÖKOBAUDAT, release OBD_2024_II (22 July 2026), EN 15804+A2

Per kg. A1–A3 = GWP-fossil + GWP-luluc; biogenic = GWP-biogenic (A1–A3); C3–C4 and D = GWP-total in each dataset's
default end-of-life scenario. Every dataset declares the license "Free of charge for all users and uses".

| Material (the tool's label) | A1–A3 | Biogenic | C3–C4 | D | Dataset (owner, region, reference year) | UUID | Valid until |
|---|---|---|---|---|---|---|---|
| Steel sections, hot-rolled, electric arc furnace (European average) | 0.560 | – | 0.000145 | 0.21 | Structural Steel: Sections and merchant bars (bauforumstahl e.V., WEU, 2023) | `20c29cbd-f9a2-4518-a1ce-c681246c29c8` | 2028 |
| Steel sections, electric arc furnace with renewable electricity (SALCOS®) | 0.290 | – | 0.000213 | 0.246 | SALCOS® Structural Steel - Beams and Sections (Peiner Träger GmbH, RER, 2025) | `801a951f-dfc1-4970-a5aa-56170b898bb5` | 2030 |
| Steel heavy plates, blast furnace route (European average) | 2.529 | – | 0.000145 | −1.467 | Structural Steel: Heavy Plates (bauforumstahl e.V., WEU, 2023) | `04d1311a-ae38-4bfb-8e11-8992f1ddb14f` | 2028 |
| Profiled steel sheet, galvanized (decking, European average) | 2.321 | – | 0 | −1.581 | Profiled sheets made of steel for roof, wall, deck and ceiling constructions (PPA-Europe, RER, 2024) | `a3460377-cb55-459a-bd70-6e4485faa0bb` | 2029 |
| Reinforcing steel bars, electric arc furnace | 0.592 | – | 0.00044 | 0.06 | Reinforcing steel in bars (ESF Elbe-Stahlwerke Feralpi GmbH, DE, 2022) | `a8ebf8f2-2fcc-4431-b730-93bf5efd8111` | 2028 |
| Ready-mixed concrete C25/30 (German average) | 0.075 | – | 0.002104 | −0.005 | Concrete C25/30 (InformationsZentrum Beton GmbH, DE, 2023) | `8347f9a7-f4ec-4a36-a266-a0281f5fd16d` | 2028 |
| Ready-mixed concrete C30/37 (German average) | 0.082 | – | 0.002104 | −0.005 | Concrete C30/37 (InformationsZentrum Beton GmbH, DE, 2023) | `b3fb0ba9-2376-49bf-b21a-7f7a5cd97233` | 2028 |
| Ready-mixed concrete C35/45 (German average) | 0.092 | – | 0.002104 | −0.005 | Concrete C35/45 (InformationsZentrum Beton GmbH, DE, 2023) | `90999905-ace2-49ee-90f0-f2a649c8989e` | 2028 |
| Ready-mixed concrete C45/55 (German average) | 0.113 | – | 0.002104 | −0.005 | Concrete C45/55 (InformationsZentrum Beton GmbH, DE, 2023) | `fbe36042-d050-4840-abc9-baff055dc0f3` | 2028 |
| Concrete C30/37 with blast-furnace cement (one producer) | 0.051 | – | 0.003378 | −0.002 | Concrete C30/37, blast furnace cement (Firmengruppe Max Bögl, DE, 2023) | `69cb90b8-560a-4bce-b4f8-7fa5220eccdc` | 2028 |
| Glued-laminated timber (German average) | 0.298 | −1.615 | 1.628 | not declared | Glued laminated timber - straight shapes (Thünen-Institut für Holzforschung, DE, 2023) | `78bfe151-3cf3-46cb-a1a5-61a79bbd5476` | 2028 |
| Cross-laminated timber (German average) | 0.243 | −1.612 | 1.632 | not declared | Cross laminated timber (Thünen-Institut für Holzforschung, DE, 2023) | `8c4eb262-9ae6-4ace-8f3d-0b06f2007f3e` | 2028 |

How the values were read, and two traps in the data:
- **Mass per declared unit:** taken from the EPD's own text ("1 t"), else the density (m³) or the mass per area (m²).
  The data's "conversion factor to 1 kg" is used both ways (0.001 in the bauforumstahl dataset, 1,000 in Peiner's and
  11.3 kg/m² in the decking), and Peiner's dataset states a 1 kg reference flow for values per tonne; both are ignored.
- **Indicators** are matched by their method UUIDs, since names vary (English, German, with and without a hyphen); some
  datasets give A1, A2 and A3 separately, which are summed.
- **Considered and not used:** ReUse-Steel and Refit-Steel (ECO-Refit) are reprocessed galvanized steel, mainly road
  guardrails, not reused sections; Sphera's generic datasets expire in 2026 and refer to separate license conditions;
  other rebar candidates were Lech-Stahlwerke (0.625, valid to 2027) and Baustahlgewebe (0.470, 2027).
- **Gaps (custom factor until data exists):** no blast-furnace section dataset (only the plates show that route), no
  hollow sections, no precast hollow-core slabs, no reused structural steel; C40/50 is not in the German averages
  (C45/55 is offered).

### The guide's 3rd edition (2025)

The guide page is behind a Cloudflare check from this environment; IStructE's overview of the edition (The Structural
Engineer, September 2024, pp. 12–13) lists the changes: A5 split into A5.1 pre-construction demolition, A5.2
construction activities, A5.3 waste and A5.4 worker transport, each with a new calculation; a new module A0; C3–C4 for
timber split into emissions and transfers; an overall uncertainty factor (from the RICS standard, 2nd ed.); allowances
for commonly unmodelled items; updated recommended A1–A3 factors. Its values could not be read, so the tool follows the
2nd edition and says so in its limits. Open: Murat to supply the 3rd edition, then update A5, C3–C4 and the citation.

### Browser checks (production build)

- Default (the guide's pavilion with these European factors): 106 kgCO2e/m², SCORS A, 84 tCO2e; range P5–P95
  96–116. The page notes that the guide's UK factors give 163 for the same pavilion.
- Typing 63.4 t into the steel row keeps the focus in the field and updates the result (130 kgCO2e/m²).
- Add option, then SALCOS® steel in option B: 130 vs 108 kgCO2e/m², side by side, with the comparison chart.
- A per-m² material entered in m³: "Enter mass for this material (no density in its data)". GIA cleared: "—" and
  "Enter the gross internal area."
- The link (974 characters) reloads to the same numbers; the CSV has the data release in its header, the rows and the
  totals; Data and sources lists the 12 datasets with links.
- 375 × 812 with touch: no horizontal scroll, every control at least 44 px tall; the result shows above the materials.
- No console messages. axe: no violations.

## Deviations from the spec, and why

1. **The 2nd edition, not the 3rd** (above): the 3rd edition's values could not be read here.
2. **Concrete C45/55 instead of C40/50**: the German averages have no C40/50.
3. **The data are bundled** (`src/tools/carbon/carbon-factors.json`, about 6 kB), not fetched at load: no loading or
   error state is needed, and the tool works offline. The data release is shown in Data and sources and the CSV.
4. **The pipeline reads the ÖKOBAUDAT API** by UUID instead of a downloaded CSV, and is a Python script (Node's fetch
   does not use this environment's proxy); it caches the datasets outside the repository.
5. **Below 1,280 px, one option at a time** (tabs), rather than two side by side between 1,024 and 1,279 px. A single
   option uses two columns (inputs and materials, result) from 1,024 px.
6. **Timber's waste term includes its biogenic carbon** (above), as the guide's worked example requires.

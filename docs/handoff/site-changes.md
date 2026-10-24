# Handoff: site-level changes

## 1. Done already (on this branch)

- A three-level breadcrumb on every tool page: "Tools / Group / Title". The group links to `/tools#<group-id>`, and
  `/tools` jumps to that anchor (`ToolShell.tsx`, `ToolsIndex.tsx`, `groupId()`).

## 2. Registry (`src/tools/pages.json`)

Add these four entries; the existing ones are unchanged:

```json
{ "path": "/tools/beam-twist", "title": "Why steel beams twist",
  "line": "Load a steel beam and watch it swing sideways and twist: lateral-torsional buckling in 3D, with Mcr and the Eurocode resistance.",
  "group": "Structures" },
{ "path": "/tools/surrogate-frame", "title": "Surrogate frame design",
  "line": "Design a six-storey steel frame with a Gaussian process surrogate: a few FE runs train it, a genetic algorithm searches it, and FE checks the answer.",
  "group": "Machine learning" },
{ "path": "/tools/building-chord", "title": "The building's chord",
  "line": "Tap a steel building and hear its vibration modes as a chord. Damage changes it, and an autoencoder learns to tell damage from a warm, busy day.",
  "group": "Machine learning" },
{ "path": "/tools/embodied-carbon", "title": "Embodied carbon of a structure",
  "line": "A1–A5 embodied carbon of a building structure per m², with a SCORS rating and a range, from European data. Compare three options and share them.",
  "group": "Life cycle" }
```

- `postbuild.js` writes each page's HTML, title, description, canonical and Open Graph tags, and the sitemap, from this
  file. Nothing else is needed for direct links.
- The apostrophe in "The building's chord" may be typographic (’), as elsewhere on the site ("Poisson’s ratio" in
  `pages.json`).

## 3. Routes (`src/App.tsx`)

Lazy imports and routes, as for the existing tools:
- `BeamTwist` → `/tools/beam-twist`
- `SurrogateFrame` → `/tools/surrogate-frame`
- `BuildingChord` → `/tools/building-chord`
- `EmbodiedCarbon` → `/tools/embodied-carbon`

## 4. Groups on `/tools` (`src/tools/ToolsIndex.tsx`)

- Add "Machine learning" and "Life cycle" to `GROUPS`.
- **Proposed order** (Murat to confirm): Machine learning, Structures, Life cycle, Microstructures, Decision support,
  Monitoring, Other tools. Machine learning goes first because the AI side is what the page must show.
  - Fallback if Murat prefers the current order: Microstructures, Structures, Machine learning, Life cycle, Decision
    support, Monitoring, Other tools.
- The group anchors follow `groupId()`: `#machine-learning`, `#life-cycle`.

## 5. Thumbnails (`GLYPH` in `ToolsIndex.tsx`)

48 × 48 line drawings, stroke `currentColor` 1.25, no fill, in the style of the existing glyphs:

| Tool | Drawing |
|---|---|
| Why steel beams twist | An I-section seen end-on, twice: upright (`rule` dashes), and shifted right and rotated about 20° (ink) |
| Surrogate frame design | A three-storey frame elevation (six columns, three beams) with a smooth curve and a dashed band above it |
| The building's chord | A four-storey building outline, with three concentric arcs (sound waves) from its roof corner |
| Embodied carbon of a structure | A stepped ladder of five bars of increasing length, an arrow pointing at the third |

## 6. Featured carousel (`FEATURED` in `ToolsIndex.tsx`)

After each tool ships, add it with its own art (an SVG in the style of `BridgeArt` and `DecayArt`):
- Surrogate frame design: the frame elevation with the GP band (CTA "Open the surrogate frame");
- The building's chord: a spectrum of six bars beside a building outline (CTA "Hear the building");
- Why steel beams twist (optional): the twisted section (CTA "Open the beam").

Keep at most six slides, and drop the property map first if needed (Murat to decide).

## 7. Home page (optional, Murat to decide)

- The EWSHM row ("Bridge health indicators from monitoring data") could end with a link: "Hear the autoencoder idea:
  The building's chord", pointing to `/tools/building-chord`.
- The research statement stays as it is.

## 8. Waiting on Murat

| Item | Options | Recommendation |
|---|---|---|
| `/tools` intro line (`pages.json`, "/tools") | 1. "Some of the methods I use in my research, as interactive tools, and a few others." 2. "Methods from my research and teaching, as interactive tools." 3. "Interactive tools on the methods I work with." Each followed by "They run in your browser; nothing you draw, measure or upload leaves your device." | 1 |
| Group order | See §4 | Machine learning first |
| The chord's group | Machine learning or Monitoring | Machine learning |
| A contact line at the end of each tool | e.g. "Questions, or want to use this in teaching? Email me." with `email` from `site.ts` | Yes, in ToolShell under Cite |
| `/tools/cutt-ia` | The route frames cutt-ia.vercel.app, which returned 404 on 2026-10-23, and the page is not listed. Remove the route (and `src/components/tools/CUTT-IA/`) or revive the app | Remove |
| Branch history | Two earlier commits on this branch name an unannounced project (in docs and in one commit message). Rewriting needs a force-push to this unmerged branch; GitHub may still serve the old commits by direct ID for a while | Murat decides |
| ÖKOBAUDAT datasets | Choose the dataset UUIDs for `scripts/carbon-factors.config.json` | — |
| Reuse factor | A reuse EPD for steel sections (candidate: environdec 6356) or user-defined only | User-defined until verified |
| Copy | The Method and About paragraphs drafted in each tool file | — |

## 9. Not changing

- The microstructure tools, truss sizing, multi-criteria choice, vibrometer, world map and gauge stay as they are,
  apart from the shared-code moves in `shared-foundations.md` (no visual change).
- No labels such as "research method" or "explainer" on tools (decided).

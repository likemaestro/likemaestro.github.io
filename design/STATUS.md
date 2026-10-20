# Design phase status (2026-10-20)

Plan: `C:\Users\murat\.claude\plans\ui-ux-pro-max-create-best-plan-gentle-bubble.md` (v3 stages D0–D3, revised per review).

## Done
- D0: `d0-audit.md` and `d0-laser-reference.html` (https://claude.ai/artifact/BmMc9P1PRdgrdjwNwJx4kk).
- D1: `d1-directions.html` (https://claude.ai/artifact/VAA3Z8Ry8FwPsnyAk9nXiW). Murat picked the hybrid: A's Steel / Light identity, C's atlas plates for science and AI, B's macro camera only inside the dark laser bay.
- Renderer: `lib/beam-scene.js` exposes `createRenderer`, `createScene(...).update/setCamera`, `renderFrame`, `renderAll` and `frontAt`. It uses one persistent point light, so no shader recompiles happen mid-scroll. The exploded slug fades in at its exploded height; it never rises out of the hole.
- Timeline: `lib/laser-sequence.js` (`progressAt`, `explodeAt`, `cameraAt`, `KEYFRAMES`, `frameAt`). The motion test and the D3 boards both use it, so they cannot drift.
- D2: `d2-artboard.html` (https://claude.ai/artifact/VAUU9HgwJNc4MHCidyG3Jv). It covers:
  - colour, with contrast ratios;
  - the Archivo-only type scale, plus the second-face test;
  - grid and spacing;
  - material and linework;
  - recorded vs transition density styling;
  - the caption types;
  - publications beside the bay;
  - the four motion families, with demos;
  - the three signature families.
- D3: `d3-storyboard.html` (https://claude.ai/artifact/54Dz7eHwiybFQCT56EQZgg). It covers:
  - navigation rules;
  - scenes 0–8, using the brief's numbering and names;
  - the six laser keyframes, with the kerf lens;
  - continuity match cuts;
  - reduced-motion and no-WebGL fallbacks;
  - the mobile poster and three states, plus checks at 390×844 and 390×600.
- D3 motion test: `d3-laser-motion-test.html` (https://claude.ai/artifact/Tm1iZqCZxwoDeutiJKxFYC). Sticky stage, native scroll, rendering on demand.
  - The static frames, beat text, kerf section and decision diagram are canonical DOM. The film shows aria-hidden copies of them.
  - Measured in the browser pane on the laptop:
    - CPU time per render call is 6–12 ms median;
    - the first render takes about 110–180 ms (shader compile);
    - there is no spike at the pierce start or at completion.
  - These are CPU numbers. GPU frame time and real phones are still unmeasured.

Serve locally with the `design-boards` entry in `.claude/launch.json` (port 8765, rooted at `design/`).

## Open items for Murat (block D4 content, not D2/D3 review)
1. PhD sentence for the decision chapter. Also: is "Member data (BIM)" the right input label? It is drawn dashed as a draft.
2. Hero sub-line wording.
3. EWSHM: team consent for images, role sentence, and a source for the Audience Prize.
4. concApp: which version's numbers are right (they differ by about 9×), authorship, and a source for the Top 25 claim.
5. Which email and profiles to show on the contact block.
6. EWSHM public-repo cleanup (see `d0-audit.md`).
7. Original exports of the MSc recorded states, if available (the current insets are about 90 px).

## Gate
Murat approves D2 and D3, then a separate plan for D4 (interaction/UI spec), D5 (validation) and D6 (engineering handoff). Nothing goes into `src/` before that.

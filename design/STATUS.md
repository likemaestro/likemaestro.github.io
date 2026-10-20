# Design phase status (2026-10-20)

Plan: `C:\Users\murat\.claude\plans\ui-ux-pro-max-create-best-plan-gentle-bubble.md` (v3 stages D0–D3, revised per review).

## Done
- D0: `d0-audit.md` (asset provenance, claims on hold, EWSHM public-repo issue) and `d0-laser-reference.html` (published: https://claude.ai/artifact/BmMc9P1PRdgrdjwNwJx4kk).
- D1: `d1-directions.html` (published: https://claude.ai/artifact/VAA3Z8Ry8FwPsnyAk9nXiW). Murat picked the **hybrid**: A's Steel / Light identity and hero, C's Atlas plates for the science and AI chapters, and B's macro camera only inside the dark laser bay.
- Keyframe renderer: `lib/beam-scene.js` (three 0.176 via import map, `renderFrame` / `renderAll`). Serve it with the `design-boards` entry in `.claude/launch.json` (python http.server on port 8765, rooted at `design/`).

## Next
1. Refactor `lib/beam-scene.js` into `createScene(style)` with an `update(progress)` method, so the motion test can render on scroll. Keep `renderFrame` for the boards. Add an `explodeSlug` option: the removed part goes in a labelled exploded view only.
2. D2, `d2-artboard.html`:
   - tokens: porcelain #F6F7F5, ink #172027, ink-2 #4F5D68, mist #D5DCDF, deep steel #26353D, bay #121A1F, cut #F05A24, a narrow molten core;
   - the Archivo scale, plus a test showing a second face is not needed;
   - materials and linework;
   - the light publications section beside the dark laser bay;
   - four motion families, with **scientific sequence** vs **visual transition** kept separate;
   - three signature families. The laser → decision flow is: features → candidate processes (laser, plasma) → cost / time / environmental impact, with no scores.
3. D3, `d3-storyboard.html`:
   - scenes 0–8, each with start, middle and exit frames, trigger and range, camera, caption, reduced-motion and mobile versions, and assets;
   - **navigation per scene**: reverse and fast scroll, anchor lands on the settled end state, skip link, keyboard path, pause;
   - six laser keyframes: approach, pierce, contour, kerf close-up (macro render plus the drawn section as a lens), completed profile (exploded slug), decision transition;
   - checks at 390×844 and 390×600.
4. `d3-laser-motion-test.html`: a sticky stage in a tall section with native scroll. Renders on demand only, mapped to scroll shares 0–15–25–60–75–90–100%. Static frames under reduced motion. A frame-time readout for measurement.
5. Gate: Murat approves D2 and D3, then a separate plan for D4–D6.

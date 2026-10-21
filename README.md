# likemaestro.github.io

Personal research site of Murat Güven: AI and optimization methods for structural engineering and steel construction.

**Live:** https://likemaestro.github.io/

React 19, TypeScript and Tailwind 3 (Create React App), deployed to GitHub Pages.

The hero runs a small unit-cell topology optimization in the browser (`src/lab/`): periodic homogenization, SIMP with
Heaviside projection, MMA and square symmetry, in a Web Worker. The solver is validated against an independent NumPy
reference and finite-difference sensitivities (`src/lab/unitcell.test.ts`).

## Develop

```bash
npm install
npm start          # dev server on :3000
npm test           # solver and content tests
npm run precompute # regenerate src/lab/precomputed.ts after changing the solver
npm run build      # production build; also writes build/404.html for client-side routes
npm run deploy     # publish build/ to GitHub Pages
```

`python scripts/reference_homogenize.py` regenerates the NumPy reference fixture.

Content (publications, talks, timeline, links) lives in `src/content/site.ts`. The design spec is in `docs/plans/`.

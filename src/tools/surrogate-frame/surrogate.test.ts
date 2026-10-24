import { analyse, BEAMS, COLUMNS, feasible, massOf, type Design } from "./frame";
import { encode, fitSurrogate, GA_DEFAULT, incumbent, key, looStats, optimize, OUTS, sampleDesigns, UB, verify, type Outputs, type Sample } from "./surrogate";

const fe = (d: Design): Outputs => { const r = analyse(d); return { drift: r.drift, uCL: r.uCL, uCU: r.uCU, uB: r.uB, acr: r.acr, mass: r.mass }; };

test("the encoding runs from 0 to 1 and grows with the section", () => {
  expect(encode({ cL: 0, cU: 0, bm: 0 })).toEqual([0, 0, 0]);
  expect(encode({ cL: 11, cU: 11, bm: 8 }).map((v) => +v.toFixed(12))).toEqual([1, 1, 1]);
  for (let i = 1; i < COLUMNS.length; i++) expect(encode({ cL: i, cU: 0, bm: 0 })[0]).toBeGreaterThan(encode({ cL: i - 1, cU: 0, bm: 0 })[0]);
  expect(BEAMS).toHaveLength(9);
});

test("sampling gives N distinct designs in range, the same for a seed", () => {
  for (const n of [10, 24, 50]) {
    const S = sampleDesigns(n, 7);
    expect(new Set(S.map(key)).size).toBe(n);
    for (const d of S) [d.cL, d.cU, d.bm].forEach((v, k) => { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(UB[k]); expect(Number.isInteger(v)).toBe(true); });
  }
  expect(sampleDesigns(24, 7)).toEqual(sampleDesigns(24, 7));
});

test("the GA on the surrogate stays in the catalog and is deterministic", () => {
  const samples = sampleDesigns(16, 3).map((d) => ({ d, r: fe(d) })), g = fitSurrogate(samples, 3);
  const a = optimize(g, 300, 2), b = optimize(g, 300, 2);
  expect(b).toEqual(a);
  if (a.best) { [a.best.cL, a.best.cU, a.best.bm].forEach((v, k) => expect(v).toBeLessThanOrEqual(UB[k])); expect(a.mass).toBeCloseTo(massOf(a.best), 9); }
});

test("end to end, default settings: verification ends within 10 rounds with an FE-feasible design; gap to the exhaustive optimum", async () => {
  const samples: Sample[] = sampleDesigns(24, 7).map((d) => ({ d, r: fe(d) })), g = fitSurrogate(samples, 7), stats = looStats(g);
  const v = await verify({ samples, surrogate: g, lim: 300, k: 2, ga: GA_DEFAULT, fe: async (d) => fe(d), refit: async (s) => fitSurrogate(s, 7) });
  expect(v.rounds.length).toBeLessThanOrEqual(10);
  expect(v.status).toBe("accepted");
  expect(feasible(fe(v.accepted!), 300)).toBe(true);
  // the exhaustive optimum for the default loads and h/300, from the frame model: HEB 300, HEB 220, IPE 360, 63.48 t
  // (frame.test.ts and the NumPy check confirm this design's outputs; the exhaustive search is in the verification record)
  const opt = { cL: 5, cU: 1, bm: 3 }, gap = massOf(v.accepted!) / massOf(opt) - 1;
  expect(gap).toBeGreaterThanOrEqual(-1e-12);   // nothing feasible is lighter than the true optimum
  console.info(`end to end: ${24 + v.newRuns} FE runs, ${v.rounds.length} rounds, ${COLUMNS[v.accepted!.cL]} ${COLUMNS[v.accepted!.cU]} ${BEAMS[v.accepted!.bm]} ${massOf(v.accepted!).toFixed(2)} t, gap ${(100 * gap).toFixed(1)} %; LOO R² ${OUTS.map((o) => `${o} ${stats[o].r2.toFixed(3)}`).join(", ")}; incumbent ${incumbent(v.samples, 300)?.r.mass.toFixed(2)} t`);
}, 60000);

import { createNSGA2, hv3, paretoSet, sortFronts, type Ind } from "./ga";
import { analyse, bounds, chi, EPS2, genes, LAYOUTS, SECTIONS, STEEL, type Layout } from "./truss";

test("a two-bar truss matches the hand calculation", () => {
  // apex at (1000, 1000) on supports at (0, 0) and (2000, 0): both bars at 45°, length √2 m
  const L: Layout = { id: "t", label: "t", nodes: [[0, 0], [2000, 0], [1000, 1000]], members: [[0, 2], [1, 2]], group: [0, 0], fixed: [0, 1, 2, 3], loaded: [2] };
  const P = 100e3, s = SECTIONS[3], r = analyse(L, [3], P), len = Math.SQRT2 * 1000;
  r.N.forEach((n) => expect(n).toBeCloseTo(-P / Math.SQRT2, 6));                     // compression P / (2 sin 45°)
  expect(r.deflection).toBeCloseTo((P * len) / (2 * STEEL.E * s.A * 0.5), 9);         // P L / (2 E A sin² 45°)
  expect(r.mass).toBeCloseTo(2 * STEEL.rho * s.A * len, 9);
});

test("buckling reduction matches EN 1993-1-1 curve a", () => {
  expect(chi(0.2)).toBe(1);
  expect(chi(1.0)).toBeCloseTo(0.6656, 4);
  expect(chi(2.0)).toBeCloseTo(0.2229, 4);
});

test("every catalogue section is class 1 in compression, so gross area applies", () => {
  SECTIONS.forEach((s) => expect(s.D / s.t).toBeLessThanOrEqual(50 * EPS2));
  SECTIONS.slice(1).forEach((s, k) => expect(s.A).toBeGreaterThan(SECTIONS[k].A));
});

test("the layouts are statically indeterminate and stable", () => {
  for (const L of Object.values(LAYOUTS)) {
    expect(L.members.length + L.fixed.length - 2 * L.nodes.length).toBeGreaterThan(0);
    const r = analyse(L, new Array(genes(L)).fill(8), 100e3);
    expect(Number.isFinite(r.deflection) && r.deflection > 0).toBe(true);
  }
  expect(genes(LAYOUTS.bridge)).toBe(16);   // 31 members, mirrored pairs share a size
});

const ind = (f: number[], cv = 0): Ind => ({ x: [], f, cv, rank: 0, crowd: 0 });

test("constrained non-dominated sorting", () => {
  const P = [ind([1, 3, 1]), ind([2, 2, 1]), ind([2, 3, 1]), ind([0, 0, 0], 0.5), ind([5, 5, 5], 0.1)];
  const F = sortFronts(P);
  expect(F[0]).toEqual([P[0], P[1]]);
  expect(F[1]).toEqual([P[2]]);
  expect(F[2]).toEqual([P[4]]);   // less violation ranks before more, whatever the objectives
  expect(F[3]).toEqual([P[3]]);
});

test("three-objective hypervolume", () => {
  expect(hv3([[0.5, 0.5, 0.5]], [1, 1, 1])).toBeCloseTo(0.125, 12);
  // two boxes 0.5 × 1 × 1 and 1 × 0.5 × 1 overlap in 0.5 × 0.5 × 1
  expect(hv3([[0.5, 0, 0], [0, 0.5, 0]], [1, 1, 1])).toBeCloseTo(0.75, 12);
  // a point on a higher slice adds only where it isn't already covered
  expect(hv3([[0.5, 0.5, 0], [0, 0, 0.5]], [1, 1, 1])).toBeCloseTo(0.25 + 0.5 * 0.75, 12);
});

test("NSGA-II sizes the 10-bar cantilever: a feasible front that improves on the first generation", () => {
  const L = LAYOUTS.cantilever, P = 100e3, b = bounds(L, P);
  const norm = (f: number[]) => f.map((v, k) => (v - b.lo[k]) / (b.hi[k] - b.lo[k]));
  const prob = { n: genes(L), ub: SECTIONS.length - 1, evaluate: (x: number[]) => { const r = analyse(L, x, P); return { f: [r.mass, r.deflection, r.distinct], cv: r.cv }; } };
  const ga = createNSGA2(prob, { pop: 40, pc: 0.9, mut: 1, etaC: 3, etaM: 3, seed: 7, initial: SECTIONS.map((_, k) => new Array(genes(L)).fill(k)) });
  const hv = () => hv3(paretoSet(ga.state.pop).map((p) => norm(p.f)), [1, 1, 1]);
  for (let g = 0; g < 5; g++) ga.step();
  const early = hv();
  for (let g = 0; g < 60; g++) ga.step();
  const front = paretoSet(ga.state.pop);
  expect(front.length).toBeGreaterThan(5);
  expect(hv()).toBeGreaterThan(early);
  expect(front.some((p) => p.f[2] === 1)).toBe(true);   // a one-section design is on the front
  front.forEach((p) => analyse(L, p.x, P).util.forEach((u) => expect(u).toBeLessThanOrEqual(1 + 1e-9)));
});

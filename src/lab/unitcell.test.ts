import fixture from "./__fixtures__/homogenize.json";
import {
  OBJECTIVES, createProblem, createRun, evaluate, homogenize, initialDesign, properties, symmetrize,
} from "./unitcell";

const nu = 0.3, c = 1 / (1 - nu * nu);

test("solid cell gives the plane-stress tensor", () => {
  const P = createProblem({ n: 8 });
  const { C } = homogenize(P, new Float64Array(P.nel).fill(1));
  const expected = [c, nu * c, 0, nu * c, c, 0, 0, 0, 1 / (2 * (1 + nu))];
  expected.forEach((v, k) => expect(Math.abs(C[k] - v)).toBeLessThan(1e-9));
  expect(properties(C).nu12).toBeCloseTo(nu, 9);
});

test.each(fixture.cases.map((k) => [k.name, k] as const))("matches the NumPy reference: %s", (_, k) => {
  const P = createProblem({ n: fixture.n, nu: fixture.nu });
  const { C } = homogenize(P, Float64Array.from(k.E));
  k.C.forEach((v, i) => expect(Math.abs(C[i] - v)).toBeLessThan(1e-8));
});

test("opposite boundary nodes share their fluctuation DOFs (periodicity)", () => {
  const n = 6, P = createProblem({ n });
  for (let ey = 0; ey < n; ey++) {
    const left = ey * n, right = ey * n + n - 1;            // node 0 of the left element == node 1 of the right one
    expect([P.edof[left * 8], P.edof[left * 8 + 1]]).toEqual([P.edof[right * 8 + 2], P.edof[right * 8 + 3]]);
  }
  for (let ex = 0; ex < n; ex++) {
    const bottom = ex, top = (n - 1) * n + ex;              // node 0 of the bottom element == node 3 of the top one
    expect([P.edof[bottom * 8], P.edof[bottom * 8 + 1]]).toEqual([P.edof[top * 8 + 6], P.edof[top * 8 + 7]]);
  }
});

describe.each(OBJECTIVES.map((o) => [o]))("sensitivities: %s", (obj) => {
  test("analytic gradient matches central differences", () => {
    const P = createProblem({ n: 8 });
    const x = symmetrize(P, Float64Array.from({ length: P.nel }, (_, e) => 0.2 + 0.6 * Math.abs(Math.sin(e * 12.9898) * 43758.5453 % 1)));
    const beta = 4, w = 0.3;
    const { df, dv } = evaluate(P, x, obj, w, beta);
    const h = 1e-6;
    for (const e of [0, 9, 18, 27, 36, 45]) {
      // Perturb the whole D4 orbit equally: the symmetrized gradient is the orbit-mean derivative.
      const a = P.orbitStart[P.orbit[e]], b = P.orbitStart[P.orbit[e] + 1], m = b - a;
      const shift = (s: number) => { const y = Float64Array.from(x); for (let k = a; k < b; k++) y[P.orbitMembers[k]] += s; return y; };
      const p = evaluate(P, shift(h), obj, w, beta), q = evaluate(P, shift(-h), obj, w, beta);
      const fd = (p.f - q.f) / (2 * h) / m, fdv = (p.vol - q.vol) / (2 * h) / m;
      expect(Math.abs(fd - df[e])).toBeLessThan(1e-5 * Math.max(Math.abs(df[e]), 1e-6));
      expect(Math.abs(fdv - dv[e])).toBeLessThan(1e-6 * Math.max(Math.abs(dv[e]), 1e-6));
    }
  });
});

const runToEnd = (obj: (typeof OBJECTIVES)[number], n = 24, seed?: number) => {
  const run = createRun(obj, { n, seed });
  let it = run.next();
  while (!it.done) it = run.next();
  return { run, it };
};

// Bulk from the default start sits on a symmetric grey saddle at n = 24; at the site's n = 32 it converges cleanly.
const meshFor = (obj: (typeof OBJECTIVES)[number]) => (obj === "bulk" ? 32 : 24);

describe.each(OBJECTIVES.map((o) => [o]))("full run: %s", (obj) => {
  const n = meshFor(obj);
  const { run, it } = runToEnd(obj, n);
  test("converges before the iteration cap to a crisp, D4-symmetric design at the target volume", () => {
    expect(it.iter).toBeLessThan(run.P.o.maxIter);
    expect(it.vol).toBeLessThan(run.P.o.vf + 1e-3);
    // Stiffness targets use all the material; the auxetic optimum may leave some unused (inequality constraint).
    if (obj !== "auxetic") expect(it.vol).toBeGreaterThan(run.P.o.vf - 0.02);
    expect(it.phys.filter((v) => v > 0.1 && v < 0.9).length / it.phys.length).toBeLessThan(0.08);
    const x = run.design, P = run.P;
    for (let o = 0; o + 1 < P.orbitStart.length; o++)
      for (let k = P.orbitStart[o] + 1; k < P.orbitStart[o + 1]; k++)
        expect(Math.abs(x[P.orbitMembers[k]] - x[P.orbitMembers[P.orbitStart[o]]])).toBeLessThan(1e-12);
  });
  test("is deterministic", () => {
    const again = runToEnd(obj, n).run.design;
    expect(Array.from(again)).toEqual(Array.from(run.design));
  }, 20000);
  if (obj === "auxetic") test("reaches a negative Poisson's ratio", () => {
    expect(it.nu12).toBeLessThan(0);
    expect(it.nu12).toBeGreaterThan(-1);
  });
  else test("improves on the initial design", () => {
    const P = createProblem({ n });
    expect(it.f).toBeLessThan(evaluate(P, initialDesign(P), obj, 1, 1).f);
  });
});

test("a seed reproduces its design, and different seeds give different designs", () => {
  const go = (seed: number) => runToEnd("shear", 24, seed).run.design;
  const a = Array.from(go(7919));
  expect(Array.from(go(7919))).toEqual(a);
  expect(Array.from(go(2 * 7919))).not.toEqual(a);
});

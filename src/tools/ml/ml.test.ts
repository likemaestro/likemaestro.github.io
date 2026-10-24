import { createNSGA2 } from "../truss-sizing/ga";
import { mulberry32 } from "../rng";
import { fitGP, gpState, logMarginal, loo, predict } from "./gp";
import { lhs } from "./lhs";

test("Latin hypercube: one point per stratum in every dimension", () => {
  const n = 24, P = lhs(n, 3, mulberry32(7));
  expect(P).toHaveLength(n);
  for (let j = 0; j < 3; j++) {
    const strata = P.map((p) => Math.floor(p[j] * n)).sort((a, b) => a - b);
    expect(strata).toEqual(Array.from({ length: n }, (_, i) => i));
  }
});

test("GA with one upper bound per variable stays in bounds and is deterministic", () => {
  const run = () => {
    const ga = createNSGA2({ n: 2, ub: [3, 9], evaluate: (x) => ({ f: [(x[0] - 2) ** 2 + (x[1] - 7) ** 2], cv: 0 }) }, { pop: 12, pc: 0.9, mut: 1, etaC: 3, etaM: 3, seed: 5 });
    for (let g = 0; g < 30; g++) {
      ga.step();
      for (const p of ga.state.pop) { expect(p.x[0]).toBeGreaterThanOrEqual(0); expect(p.x[0]).toBeLessThanOrEqual(3); expect(p.x[1]).toBeLessThanOrEqual(9); }
    }
    return ga.state.pop.map((p) => p.x.join(",")).join(";");
  };
  const a = run();
  expect(run()).toBe(a);
  expect(a.split(";")).toContain("2,7");   // the optimum of a one-objective problem
});

const X1 = Array.from({ length: 8 }, (_, i) => [i / 7]), Y1 = X1.map(([x]) => Math.sin(2 * Math.PI * x));

test("GP interpolates noiseless samples of sin(2πx)", () => {
  const g = fitGP(X1, Y1, { seed: 1 });
  X1.forEach((x, i) => {
    const p = predict(g, x);
    expect(Math.abs(p.mu - Y1[i])).toBeLessThan(1e-4);
    expect(p.sd).toBeLessThan(1e-3);
  });
  // between the samples the uncertainty grows
  expect(predict(g, [0.5 / 7]).sd).toBeGreaterThan(predict(g, [0]).sd);
});

test("closed-form leave-one-out equals refits without each point, same hyperparameters", () => {
  const rng = mulberry32(3), X = Array.from({ length: 12 }, () => [rng(), rng(), rng()]);
  const y = X.map(([a, b, c]) => Math.log(1 + a) + b * b - 0.5 * c);
  const params = { ell: [0.7, 0.4, 1.1], sf2: 0.3, sn2: 1e-4 }, g = gpState(X, y, params), L1 = loo(g);
  for (let i = 0; i < X.length; i++) {
    const h = gpState(X.filter((_, k) => k !== i), y.filter((_, k) => k !== i), params, NaN, g.ymean);   // same prior mean
    const p = predict(h, X[i]);
    // the closed form includes the noise variance in σ²₋ᵢ; the refit's latent sd does not
    expect(L1.mu[i]).toBeCloseTo(p.mu, 8);
    expect(L1.sd[i] ** 2).toBeCloseTo(p.sd ** 2 + params.sn2, 8);
  }
});

test("marginal-likelihood gradient matches central finite differences", () => {
  const rng = mulberry32(11), X = Array.from({ length: 10 }, () => [rng(), rng(), rng()]);
  const y = X.map(([a, b, c]) => Math.sin(3 * a) + b * c), m = y.reduce((s, v) => s + v, 0) / y.length, yc = y.map((v) => v - m);
  const t = [Math.log(0.6), Math.log(0.3), Math.log(1.4), Math.log(0.8), Math.log(1e-3)];
  const { grad } = logMarginal(X, yc, t)!, h = 1e-5;
  t.forEach((_, k) => {
    const up = t.slice(), dn = t.slice();
    up[k] += h; dn[k] -= h;
    const fd = (logMarginal(X, yc, up)!.value - logMarginal(X, yc, dn)!.value) / (2 * h);
    expect(Math.abs(grad[k] - fd) / Math.max(1e-8, Math.abs(fd))).toBeLessThan(1e-4);
  });
});

test("GP fitting is deterministic for a seed", () => {
  const rng = mulberry32(2), X = Array.from({ length: 15 }, () => [rng(), rng(), rng()]), y = X.map(([a, b]) => a * a + Math.cos(4 * b));
  const a = fitGP(X, y, { seed: 9 }), b = fitGP(X, y, { seed: 9 });
  expect(b.params).toEqual(a.params);
  expect(b.lml).toBe(a.lml);
});

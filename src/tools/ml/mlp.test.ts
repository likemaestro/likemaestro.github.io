import { generalizedEig } from "../la/eig";
import { createMLP } from "./mlp";

test("backpropagation matches central finite differences on a 3–4–2–4–3 network", () => {
  const net = createMLP([3, 4, 2, 4, 3], ["tanh", "tanh", "tanh", "linear"], 5);
  const X = [[0.2, -0.4, 0.9], [-0.7, 0.1, 0.3], [0.5, 0.5, -0.2]], Y = [[0.1, 0, -0.3], [0.4, -0.2, 0.2], [-0.5, 0.3, 0.1]];
  const { g } = net.grad(X, Y), p = net.params(), flat = g.flatMap((a) => Array.from(a)), h = 1e-6;
  // params() lists every W, then every b, the same order as the gradient
  for (let k = 0; k < p.length; k += 3) {
    const up = Float64Array.from(p), dn = Float64Array.from(p);
    up[k] += h; dn[k] -= h;
    net.setParams(up); const lu = net.loss(X, Y);
    net.setParams(dn); const ld = net.loss(X, Y);
    net.setParams(p);
    const fd = (lu - ld) / (2 * h);
    expect(Math.abs(flat[k] - fd)).toBeLessThan(1e-5 * Math.max(1e-3, Math.abs(fd)) + 1e-9);
  }
});

test("a 2–8–1–8–2 autoencoder learns points on a line, deterministically", () => {
  const X = Array.from({ length: 64 }, (_, i) => { const s = -1 + (2 * i) / 63; return [s, 0.5 * s]; });
  const run = () => {
    const net = createMLP([2, 8, 1, 8, 2], ["tanh", "tanh", "tanh", "linear"], 3);
    for (let e = 0; e < 600; e++) net.trainEpoch(X, 0.01, 16);
    return { loss: net.loss(X), p: net.params() };
  };
  const a = run(), b = run();
  expect(a.loss).toBeLessThan(1e-4);
  expect(Array.from(b.p)).toEqual(Array.from(a.p));
});

test("generalized eigenproblem: a two-mass chain against the closed form, mass-normalized", () => {
  // masses m1 = 2, m2 = 1, springs k1 = 3 (to ground) and k2 = 1: det(K − ω² M) = 0 → 2ω⁴ − 6ω² + 3 = 0
  const K = Float64Array.from([4, -1, -1, 1]), M = Float64Array.from([2, 0, 0, 1]), { values, vectors } = generalizedEig(K, M, 2);
  expect(values[0]).toBeCloseTo((6 - Math.sqrt(12)) / 4, 12);
  expect(values[1]).toBeCloseTo((6 + Math.sqrt(12)) / 4, 12);
  for (let c = 0; c < 2; c++) expect(2 * vectors[c] ** 2 + vectors[2 + c] ** 2).toBeCloseTo(1, 12);
  expect(2 * vectors[0] * vectors[1] + vectors[2] * vectors[3]).toBeCloseTo(0, 12);   // M-orthogonal
});

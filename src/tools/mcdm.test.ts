import { ahp, rank, relink, smaa2, topsis, vikor, vikorChoice, vikorDetail } from "./mcdm";

// three alternatives on two cost criteria: two extremes and a balanced one
const X = [[1, 4], [2, 2], [4, 1]];

test("TOPSIS by hand: equal weights favour the balanced alternative", () => {
  const c = topsis(X, [1, 1]);
  expect(c[0]).toBeCloseTo(0.5, 12);
  expect(c[1]).toBeCloseTo(2 / 3, 12);
  expect(c[2]).toBeCloseTo(0.5, 12);
});

test("VIKOR by hand: S, R and Q with v = 0.5", () => {
  const q = vikor(X, [1, 1]);
  [1, 0, 1].forEach((v, i) => expect(q[i]).toBeCloseTo(v, 12));
});

test("all weight on one criterion picks its minimum, for both methods", () => {
  for (const m of ["topsis", "vikor"] as const) {
    expect(rank(X, [1, 0], m).i).toBe(0);
    expect(rank(X, [0, 1], m).i).toBe(2);
  }
});

test("linked weights keep a total of 1 and the others' proportion", () => {
  const w = relink([0.5, 0.3, 0.2], 0, 0.8);
  expect(w[0]).toBeCloseTo(0.8, 12);
  expect(w[1]).toBeCloseTo(0.12, 12);           // 0.2 shared 3 : 2
  expect(w[2]).toBeCloseTo(0.08, 12);
  expect(relink([1, 0, 0], 0, 0.4).map((v) => Math.round(v * 100))).toEqual([40, 30, 30]);   // others at zero share evenly
  for (const v of [0, 0.37, 1]) expect(relink([0.2, 0.5, 0.3], 1, v).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
});

test("a higher-is-better criterion ranks like its negated column", () => {
  const B = [[1, 3], [2, 1], [4, 2]], neg = B.map(([a, b]) => [a, -b]);
  expect(topsis(B, [1, 2], [false, true])).toEqual(topsis(neg, [1, 2]));
  expect(vikor(B, [1, 2], [false, true])).toEqual(vikor(neg, [1, 2]));
});

test("VIKOR: a clear, stable winner stands alone; a small Q gap gives a compromise set", () => {
  const clear = vikorDetail([[1, 1], [3, 3], [4, 4]], [1, 1]);
  expect(vikorChoice(clear.S, clear.R, clear.Q).set).toEqual([0]);
  const close = vikorDetail(X, [1, 1]);                   // the two extremes tie at Q = 1, the balanced one leads by 1
  expect(vikorChoice(close.S, close.R, close.Q).set).toEqual([1]);
  const tight = vikorDetail([[1, 4], [2, 2], [2.2, 1.9], [4, 1]], [1, 1]);   // Q = 1, 0, 0.1, 1; the advantage needs 1/3
  const c = vikorChoice(tight.S, tight.R, tight.Q);
  expect(c.advantage).toBe(false);
  expect(c.set).toEqual([1, 2]);
});

test("AHP: a consistent matrix returns its weights with CR = 0; an inconsistent one is flagged", () => {
  const w = [0.5, 0.3, 0.2], A = w.map((a) => w.map((b) => a / b));
  const r = ahp(A);
  r.w.forEach((v, i) => expect(v).toBeCloseTo(w[i], 10));
  expect(r.lambda).toBeCloseTo(3, 10);
  expect(r.CR).toBeCloseTo(0, 10);
  const bad = ahp([[1, 9, 1 / 9], [1 / 9, 1, 9], [9, 1 / 9, 1]]);   // A ≫ B ≫ C ≫ A
  expect(bad.CR).toBeGreaterThan(0.1);
});

test("SMAA-2: an option better on every criterion is always first", () => {
  const r = smaa2([[1, 1, 1], [2, 3, 2], [3, 2, 3]], undefined, { kind: "none" }, 2000);
  expect(r.acc[0][0]).toBe(1);
  expect(r.holistic[0]).toBe(1);
  expect(r.central[1]).toBeNull();
});

test("SMAA-2: two mirror-image options share first place without weight information", () => {
  const r = smaa2([[1, 3], [3, 1]], undefined, { kind: "none" }, 20000, 3);
  expect(Math.abs(r.acc[0][0] - 0.5)).toBeLessThan(0.02);
  expect(r.acc[0][0] + r.acc[1][0]).toBeCloseTo(1, 12);
  // option 0 wins on criterion 0, so its central weights lean on criterion 0 (expected 3/4 for a uniform split)
  expect(r.central[0]![0]).toBeGreaterThan(0.7);
});

test("SMAA-2: an order of importance keeps the order, and ± 0 % matches the weighted ranking", () => {
  const r = smaa2([[1, 3], [3, 1]], undefined, { kind: "order", order: [1, 0] }, 2000);
  expect(r.acc[1][0]).toBe(1);                            // criterion 1 always weighs more, and option 1 is best on it
  const P = [[950, 35, 55], [1200, 15, 48], [800, 50, 62]], b = [false, false, true], w = [0.5, 0.3, 0.2];
  const s = smaa2(P, b, { kind: "around", w, spread: 0 }, 500);
  const U = P.map((r) => r.map((x, j) => { const c = P.map((q) => (b[j] ? -q[j] : q[j])), y = b[j] ? -x : x; return (Math.max(...c) - y) / (Math.max(...c) - Math.min(...c)); }));
  const best = U.map((r) => r.reduce((t, u, j) => t + u * w[j], 0)).reduce((k, v, i, a) => (v > a[k] ? i : k), 0);
  expect(s.acc[best][0]).toBe(1);
});

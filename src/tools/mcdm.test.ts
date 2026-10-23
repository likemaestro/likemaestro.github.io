import { rank, relink, topsis, vikor } from "./mcdm";

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

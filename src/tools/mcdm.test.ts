import { rank, topsis, vikor } from "./mcdm";

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

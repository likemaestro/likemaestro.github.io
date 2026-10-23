import { cholesky, cholSolve, lu, luSolve, NotPositiveDefinite } from "./dense";
import { bucklingEig, symEig } from "./eig";

const F = (rows: number[][]) => Float64Array.from(rows.flat());

test("Cholesky solves a 3 × 3 SPD system", () => {
  // A x = b with x = [1, −2, 3]: b = A x worked by hand
  const A = F([[4, 12, -16], [12, 37, -43], [-16, -43, 98]]), L = cholesky(A, 3);
  expect(Array.from(L)).toEqual([2, 0, 0, 6, 1, 0, -8, 5, 3]);   // the textbook factor of this matrix
  const x = cholSolve(L, F([[4 - 24 - 48], [12 - 74 - 129], [-16 + 86 + 294]]), 3);
  [1, -2, 3].forEach((v, i) => expect(x[i]).toBeCloseTo(v, 12));
  expect(() => cholesky(F([[1, 2], [2, 1]]), 2)).toThrow(NotPositiveDefinite);
});

test("LU with pivoting solves a system with a zero leading pivot", () => {
  // x = [0, 1, 3]: b = [0 + 2 + 3, 0 + 1 + 3, 0 + 1 + 0]
  const A = F([[0, 2, 1], [1, 1, 1], [2, 1, 0]]), x = luSolve(lu(A, 3), F([[5], [4], [1]]));
  [0, 1, 3].forEach((v, i) => expect(x[i]).toBeCloseTo(v, 12));
});

test("symmetric eigenvalues of a 2 × 2 match the closed form, with orthonormal vectors", () => {
  // [[a, b], [b, c]]: (a + c)/2 ± √(((a − c)/2)² + b²)
  const a = 2, b = 1, c = -3, m = (a + c) / 2, r = Math.hypot((a - c) / 2, b);
  const { values, vectors } = symEig(F([[a, b], [b, c]]), 2);
  expect(values[0]).toBeCloseTo(m - r, 12);
  expect(values[1]).toBeCloseTo(m + r, 12);
  const V = vectors!;
  expect(V[0] * V[1] + V[2] * V[3]).toBeCloseTo(0, 12);
  expect(V[0] ** 2 + V[2] ** 2).toBeCloseTo(1, 12);
});

test("symmetric eigen decomposition reconstructs a random matrix", () => {
  const n = 40, S = new Float64Array(n * n);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) - 0.5;
  for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) S[i * n + j] = S[j * n + i] = rnd();
  const { values, vectors: V } = symEig(S, n);
  let err = 0;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    let s = 0;
    for (let k = 0; k < n; k++) s += V![i * n + k] * values[k] * V![j * n + k];
    err = Math.max(err, Math.abs(s - S[i * n + j]));
  }
  expect(err).toBeLessThan(1e-12);
  for (let k = 1; k < n; k++) expect(values[k]).toBeGreaterThanOrEqual(values[k - 1]);
  const only = symEig(S, n, false).values;   // the eigenvalues-only path gives the same values
  for (let k = 0; k < n; k++) expect(only[k]).toBeCloseTo(values[k], 12);
});

test("a pinned Euler column with 20 beam elements buckles at π²EI/L²", () => {
  // Hermite beam element: Ke = EI/l³ [12 6l −12 6l; …], Kg = 1/(30 l) [36 3l −36 3l; …] for a unit axial compression
  const E = 210000, I = 8.356e7, Lc = 6000, ne = 20, l = Lc / ne, nd = 2 * (ne + 1);
  const ke = [[12, 6 * l, -12, 6 * l], [6 * l, 4 * l * l, -6 * l, 2 * l * l], [-12, -6 * l, 12, -6 * l], [6 * l, 2 * l * l, -6 * l, 4 * l * l]];
  const kg = [[36, 3 * l, -36, 3 * l], [3 * l, 4 * l * l, -3 * l, -l * l], [-36, -3 * l, 36, -3 * l], [3 * l, -l * l, -3 * l, 4 * l * l]];
  const K = new Float64Array(nd * nd), G = new Float64Array(nd * nd);
  for (let e = 0; e < ne; e++) for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) {
    K[(2 * e + a) * nd + 2 * e + b] += (E * I / l ** 3) * ke[a][b];
    G[(2 * e + a) * nd + 2 * e + b] += kg[a][b] / (30 * l);
  }
  const free = Array.from({ length: nd }, (_, i) => i).filter((i) => i !== 0 && i !== nd - 2), n = free.length;
  const pick = (M: Float64Array) => Float64Array.from({ length: n * n }, (_, k) => M[free[Math.floor(k / n)] * nd + free[k % n]]);
  const r = bucklingEig(pick(K), pick(G), n)!;
  expect(r.lambda / ((Math.PI ** 2 * E * I) / Lc ** 2) - 1).toBeLessThan(0.005);
  expect(r.lambda / ((Math.PI ** 2 * E * I) / Lc ** 2) - 1).toBeGreaterThan(-1e-9);   // FE is stiffer: an upper bound
  expect(r.residual).toBeLessThan(1e-9);
  // the mode is one half-wave: all lateral displacements share a sign
  const w = Array.from({ length: n }, (_, k) => r.x[k]).filter((_, k) => free[k] % 2 === 0);
  expect(w.every((v) => Math.sign(v) === Math.sign(w[0]))).toBe(true);
});

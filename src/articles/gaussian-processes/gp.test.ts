import { backward, cholesky, draws, forward, linspace, mulberry32, normals, posterior, sampleAt, se } from "./gp";

const grid = linspace(0, 10, 101);
const data = { x: [1, 2.4, 3.1, 6, 7.2], y: [0.4, -0.8, -0.3, 1.1, 0.6] };

test("Cholesky reproduces the matrix and solves both triangles", () => {
  const A = [[4, 2, 0.4], [2, 5, 1], [0.4, 1, 3]], L = cholesky(A);
  A.forEach((row, i) => row.forEach((a, j) => expect(L[i].reduce((s, l, k) => s + l * L[j][k], 0)).toBeCloseTo(a, 12)));
  const b = [1, -2, 0.5], x = backward(L, forward(L, b));
  A.forEach((row, i) => expect(row.reduce((s, a, j) => s + a * x[j], 0)).toBeCloseTo(b[i], 12));
});

test("two correlated values: conditioning gives mean ρa and spread √(1 − ρ²)", () => {
  // two inputs whose kernel correlation is ρ, the first one observed
  const ell = 1, d = 0.6, rho = se(0, d, ell), a = 1.3;
  const p = posterior({ x: [0], y: [a] }, [d], ell);
  expect(p.mean[0]).toBeCloseTo(rho * a, 6);
  expect(p.sd[0]).toBeCloseTo(Math.sqrt(1 - rho * rho), 6);
});

test("without noise the posterior passes through the data with no spread there", () => {
  const p = posterior(data, data.x, 1);
  data.y.forEach((y, i) => { expect(p.mean[i]).toBeCloseTo(y, 5); expect(p.sd[i]).toBeLessThan(1e-3); });
});

test("far from the data the posterior returns to the prior", () => {
  const p = posterior(data, [40], 1);
  expect(Math.abs(p.mean[0])).toBeLessThan(1e-9);
  expect(p.sd[0]).toBeCloseTo(1, 9);
});

test("the spread depends only on where the observations are, not on their values", () => {
  const a = posterior(data, grid, 1.2), b = posterior({ x: data.x, y: data.y.map((v) => 3 - 2 * v) }, grid, 1.2);
  a.sd.forEach((s, i) => expect(b.sd[i]).toBeCloseTo(s, 12));
  expect(Math.max(...a.mean.map((m, i) => Math.abs(m - b.mean[i])))).toBeGreaterThan(0.5);
});

test("noise keeps the band open at the data", () => {
  const p = posterior(data, data.x, 1, 0.3);
  p.sd.forEach((s) => expect(s).toBeGreaterThan(0.05));
});

test("posterior draws pass through noise-free data and prior draws have unit spread", () => {
  const rnd = mulberry32(3), z = Array.from({ length: 3 }, () => normals(grid.length, rnd));
  for (const f of draws(posterior(data, grid, 1), z)) data.x.forEach((x, i) => expect(sampleAt(grid, f, x)).toBeCloseTo(data.y[i], 2));
  // many prior draws: the pointwise variance is close to 1
  const zz = Array.from({ length: 400 }, () => normals(grid.length, rnd)), F = draws(posterior({ x: [], y: [] }, grid, 1), zz);
  const v = F.reduce((s, f) => s + f[50] * f[50], 0) / F.length;
  expect(v).toBeGreaterThan(0.8);
  expect(v).toBeLessThan(1.2);
});

// Gaussian process regression in one dimension, for the article's figures: the squared exponential kernel, a dense
// Cholesky factorization, the posterior mean and spread (Rasmussen & Williams 2006, Algorithm 2.1 and eq. 2.19), and
// function draws from the prior or the posterior on a grid.

export type Rng = () => number;

/** Small seeded generator (mulberry32), so a figure draws the same curves every time. */
export const mulberry32 = (seed: number): Rng => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** Standard normal numbers by Box–Muller. */
export function normals(n: number, rnd: Rng) {
  const z = new Array<number>(n);
  for (let i = 0; i < n; i += 2) {
    const r = Math.sqrt(-2 * Math.log(1 - rnd())), t = 2 * Math.PI * rnd();
    z[i] = r * Math.cos(t);
    if (i + 1 < n) z[i + 1] = r * Math.sin(t);
  }
  return z;
}

/** Squared exponential covariance with unit prior variance: correlation exp(−d² / 2ℓ²) at distance d. */
export const se = (a: number, b: number, ell: number) => Math.exp(-((a - b) ** 2) / (2 * ell * ell));

export const linspace = (lo: number, hi: number, n: number) => Array.from({ length: n }, (_, i) => lo + ((hi - lo) * i) / (n - 1));

/** Lower Cholesky factor of a symmetric positive definite matrix. A matrix that is only semi-definite (draws on a fine
 *  grid with a long length scale) gets a growing diagonal jitter until it factors. */
export function cholesky(A: number[][], jitter = 0): number[][] {
  const n = A.length;
  for (let eps = jitter; ; eps = eps ? eps * 10 : 1e-10) {
    const L = A.map(() => new Array<number>(n).fill(0));
    let ok = true;
    for (let j = 0; j < n && ok; j++) {
      let d = A[j][j] + eps;
      for (let k = 0; k < j; k++) d -= L[j][k] * L[j][k];
      if (!(d > 0)) { ok = false; break; }
      L[j][j] = Math.sqrt(d);
      for (let i = j + 1; i < n; i++) {
        let s = A[i][j];
        for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k];
        L[i][j] = s / L[j][j];
      }
    }
    if (ok) return L;
    if (eps > 1e-2) throw new Error("cholesky: matrix is not positive definite");
  }
}

/** Solve L x = b (forward substitution). */
export function forward(L: number[][], b: number[]) {
  const x = b.slice();
  for (let i = 0; i < x.length; i++) {
    for (let k = 0; k < i; k++) x[i] -= L[i][k] * x[k];
    x[i] /= L[i][i];
  }
  return x;
}

/** Solve Lᵀ x = b (back substitution). */
export function backward(L: number[][], b: number[]) {
  const x = b.slice();
  for (let i = x.length - 1; i >= 0; i--) {
    for (let k = i + 1; k < x.length; k++) x[i] -= L[k][i] * x[k];
    x[i] /= L[i][i];
  }
  return x;
}

export interface Data { x: number[]; y: number[] }
export interface Posterior { mean: number[]; sd: number[]; cov: number[][] }

/** Posterior over `grid` given observations y = f(x) + noise, noise ~ N(0, σn²). Without data it is the prior: mean 0,
 *  spread 1. The spread never looks at y, only at where the observations are. */
export function posterior(data: Data, grid: number[], ell: number, noise = 0): Posterior {
  const n = data.x.length, m = grid.length;
  const prior = grid.map((a) => grid.map((b) => se(a, b, ell)));
  if (!n) return { mean: new Array<number>(m).fill(0), sd: new Array<number>(m).fill(1), cov: prior };
  // a tiny nugget keeps two observations at nearly the same place from making K singular
  const K = data.x.map((a, i) => data.x.map((b, j) => se(a, b, ell) + (i === j ? noise * noise + 1e-9 : 0)));
  const L = cholesky(K);
  const alpha = backward(L, forward(L, data.y));
  const V = grid.map((g) => forward(L, data.x.map((xi) => se(xi, g, ell))));   // L⁻¹ k*, one column per grid point
  const mean = grid.map((g) => data.x.reduce((s, xi, i) => s + se(xi, g, ell) * alpha[i], 0));   // eq. 2.27
  const cov = prior.map((row, a) => row.map((kab, b) => kab - V[a].reduce((s, v, i) => s + v * V[b][i], 0)));
  return { mean, sd: cov.map((row, j) => Math.sqrt(Math.max(0, row[j]))), cov };
}

/** Function draws on the grid: mean + L z for fixed standard normal vectors z, so the same z give curves that change
 *  smoothly when the length scale or the data change. */
export function draws(p: Posterior, z: number[][]) {
  const L = cholesky(p.cov, 1e-8);
  return z.map((zk) => p.mean.map((mu, i) => {
    let s = mu;
    for (let k = 0; k <= i; k++) s += L[i][k] * zk[k];
    return s;
  }));
}

/** Linear interpolation of a curve sampled on an evenly spaced grid. */
export function sampleAt(grid: number[], f: number[], x: number) {
  const h = grid[1] - grid[0], u = Math.min(grid.length - 1.000001, Math.max(0, (x - grid[0]) / h)), i = Math.floor(u);
  return f[i] + (f[i + 1] - f[i]) * (u - i);
}

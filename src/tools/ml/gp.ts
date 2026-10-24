// Gaussian process regression (Rasmussen and Williams 2006): zero mean on centered outputs, Matérn 5/2 kernel with one
// length scale per input (ARD), signal variance sf2 and a small noise variance sn2 (a numerical nugget for noise-free
// FE outputs). Hyperparameters maximize the log marginal likelihood (eq. 2.30) with its analytic gradient; leave-one-out
// in closed form (eq. 5.12). Inputs are scaled to [0, 1] by the caller.
import { cholesky, NotPositiveDefinite } from "../la/dense";
import { mulberry32 } from "../rng";

export interface GPParams { ell: number[]; sf2: number; sn2: number }
/** Everything a prediction needs, as plain data (it crosses the worker boundary). */
export interface GPState { X: number[][]; y: number[]; ymean: number; params: GPParams; L: Float64Array; alpha: Float64Array; lml: number; jitter: number }

const SQRT5 = Math.sqrt(5);
const matern = (x: number[], z: number[], ell: number[], sf2: number) => {
  let r2 = 0;
  for (let j = 0; j < x.length; j++) { const t = (x[j] - z[j]) / ell[j]; r2 += t * t; }
  const a = SQRT5 * Math.sqrt(r2);
  return sf2 * (1 + a + (a * a) / 3) * Math.exp(-a);
};

/** Ky = K + sn2 I and its Cholesky factor; null if not positive definite. */
function factor(X: number[][], p: GPParams, extra = 0) {
  const n = X.length, K = new Float64Array(n * n);
  for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) K[i * n + j] = K[j * n + i] = matern(X[i], X[j], p.ell, p.sf2);
  for (let i = 0; i < n; i++) K[i * n + i] += p.sn2 + extra;
  try { return { K, L: cholesky(K, n) }; } catch (e) { if (e instanceof NotPositiveDefinite) return null; throw e; }
}

/** Ky⁻¹ from its Cholesky factor (full, symmetric). */
function inverse(L: Float64Array, n: number) {
  const Li = new Float64Array(n * n);   // L⁻¹, lower triangular
  for (let j = 0; j < n; j++) {
    Li[j * n + j] = 1 / L[j * n + j];
    for (let i = j + 1; i < n; i++) {
      let s = 0;
      for (let k = j; k < i; k++) s -= L[i * n + k] * Li[k * n + j];
      Li[i * n + j] = s / L[i * n + i];
    }
  }
  const A = new Float64Array(n * n);   // Ky⁻¹ = L⁻ᵀ L⁻¹
  for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) {
    let s = 0;
    for (let k = i; k < n; k++) s += Li[k * n + i] * Li[k * n + j];
    A[i * n + j] = A[j * n + i] = s;
  }
  return A;
}

const solveL = (L: Float64Array, b: Float64Array, n: number) => {
  for (let r = 0; r < n; r++) { let s = b[r]; for (let k = 0; k < r; k++) s -= L[r * n + k] * b[k]; b[r] = s / L[r * n + r]; }
  return b;
};
const solveLt = (L: Float64Array, b: Float64Array, n: number) => {
  for (let r = n - 1; r >= 0; r--) { let s = b[r]; for (let k = r + 1; k < n; k++) s -= L[k * n + r] * b[k]; b[r] = s / L[r * n + r]; }
  return b;
};

const unpack = (t: number[], d: number): GPParams => ({ ell: t.slice(0, d).map(Math.exp), sf2: Math.exp(t[d]), sn2: Math.exp(t[d + 1]) });

/** Squared input differences per dimension, (x_ik − x_jk)², computed once per fit. */
export function sqDiffs(X: number[][]) {
  const n = X.length, d = X[0].length;
  return Array.from({ length: d }, (_, k) => {
    const D = new Float64Array(n * n);
    for (let i = 0; i < n; i++) for (let j = 0; j < i; j++) D[i * n + j] = D[j * n + i] = (X[i][k] - X[j][k]) ** 2;
    return D;
  });
}

/**
 * Log marginal likelihood of centered y and its gradient with respect to the log parameters
 * t = [log ell_1 … log ell_d, log sf2, log sn2]. Returns null where Ky is not positive definite.
 */
export function logMarginal(X: number[][], yc: number[], t: number[], D: Float64Array[] = sqDiffs(X)) {
  const n = X.length, d = D.length, p = unpack(t, d);
  // Ky from the precomputed differences; S holds the scaled squared distances per dimension for the gradient
  const K = new Float64Array(n * n), r = new Float64Array(n * n), il2 = p.ell.map((l) => 1 / (l * l));
  for (let k = 0; k < d; k++) { const Dk = D[k], w = il2[k]; for (let i = 0; i < n * n; i++) r[i] += Dk[i] * w; }
  for (let i = 0; i < n * n; i++) { const a = SQRT5 * Math.sqrt(r[i]); K[i] = p.sf2 * (1 + a + (a * a) / 3) * Math.exp(-a); }
  const Ky = Float64Array.from(K);
  for (let i = 0; i < n; i++) Ky[i * n + i] += p.sn2;
  let L: Float64Array;
  try { L = cholesky(Ky, n); } catch (e) { if (e instanceof NotPositiveDefinite) return null; throw e; }
  const alpha = solveLt(L, solveL(L, Float64Array.from(yc), n), n);
  let logdet = 0, fit = 0;
  for (let i = 0; i < n; i++) { logdet += 2 * Math.log(L[i * n + i]); fit += yc[i] * alpha[i]; }
  const value = -0.5 * fit - 0.5 * logdet - 0.5 * n * Math.log(2 * Math.PI);
  // dL/dt = ½ Σ_ij B_ij ∂Ky_ij/∂t with B = α αᵀ − Ky⁻¹; ∂k/∂log ell_k = sf2 e^(−a) (5/3)(1 + a) (Δ_k / ell_k)²
  const Ki = inverse(L, n), grad = new Array<number>(d + 2).fill(0), C = new Float64Array(n * n);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const ij = i * n + j, B = alpha[i] * alpha[j] - Ki[ij];
    grad[d] += 0.5 * B * K[ij];                           // ∂Ky/∂log sf2 = K
    if (i === j) { grad[d + 1] += 0.5 * B * p.sn2; continue; }   // ∂Ky/∂log sn2 = sn2 I
    const a = SQRT5 * Math.sqrt(r[ij]);
    C[ij] = 0.5 * B * p.sf2 * Math.exp(-a) * (5 / 3) * (1 + a);
  }
  for (let k = 0; k < d; k++) { const Dk = D[k], w = il2[k]; let g = 0; for (let i = 0; i < n * n; i++) g += C[i] * Dk[i]; grad[k] = g * w; }
  return { value, grad };
}

/** A GP with the given hyperparameters (no fitting), escalating jitter if Ky is not positive definite. The prior mean
 *  is the mean of y unless given. */
export function gpState(X: number[][], y: number[], params: GPParams, lml = NaN, mean?: number): GPState {
  const n = X.length, ymean = mean ?? y.reduce((a, b) => a + b, 0) / n, yc = y.map((v) => v - ymean);
  let jitter = 0, f = factor(X, params);
  for (let k = 0; !f && k < 3; k++) { jitter = (jitter || 1e-8 * params.sf2) * 10; f = factor(X, params, jitter); }
  if (!f) throw new Error("GP could not be fitted; add samples");
  const alpha = solveLt(f.L, solveL(f.L, Float64Array.from(yc), n), n);
  return { X, y, ymean, params, L: f.L, alpha, lml, jitter };
}

/** Fit the hyperparameters by multi-start Adam on the log marginal likelihood, within bounds: every start runs a short
 *  ascent, the best one continues. Deterministic for a seed. */
export function fitGP(X: number[][], y: number[], opts: { seed: number; restarts?: number; iters?: number; polish?: number }): GPState {
  const n = X.length, d = X[0].length, rng = mulberry32(opts.seed), D = sqDiffs(X);
  const ymean = y.reduce((a, b) => a + b, 0) / n, yc = y.map((v) => v - ymean);
  const vy = Math.max(1e-12, yc.reduce((a, b) => a + b * b, 0) / n), lv = Math.log(vy);
  const lo = [...new Array(d).fill(Math.log(0.05)), lv - 6, lv + Math.log(1e-8)];
  const hi = [...new Array(d).fill(Math.log(5)), lv + 6, lv + Math.log(1e-1)];
  const clampT = (t: number[]) => t.map((v, k) => Math.min(hi[k], Math.max(lo[k], v)));
  const ascend = (t0: number[], iters: number) => {   // Adam on the log parameters, ascending the likelihood
    let t = t0, cur = logMarginal(X, yc, t, D);
    if (!cur) return null;
    const m = new Array(d + 2).fill(0), v = new Array(d + 2).fill(0);
    let lr = 0.05;
    for (let it = 1; it <= iters; it++) {
      const g = cur.grad;
      const next = clampT(t.map((x, k) => {
        m[k] = 0.9 * m[k] + 0.1 * g[k];
        v[k] = 0.999 * v[k] + 0.001 * g[k] * g[k];
        return x + (lr * (m[k] / (1 - 0.9 ** it))) / (Math.sqrt(v[k] / (1 - 0.999 ** it)) + 1e-8);
      }));
      const nv = logMarginal(X, yc, next, D);
      if (!nv) { lr *= 0.5; continue; }   // left the positive definite region: shorter steps
      t = next; cur = nv;
    }
    return { t, v: cur.value };
  };
  let best: { t: number[]; v: number } | null = null;
  for (let s = 0; s < (opts.restarts ?? 8); s++) {
    const t0 = s === 0 ? [...new Array(d).fill(Math.log(0.5)), lv, lv + Math.log(1e-6)] : lo.map((l, k) => l + rng() * (hi[k] - l));
    const r = ascend(t0, opts.iters ?? 60);
    if (r && (!best || r.v > best.v)) best = r;
  }
  if (best) best = ascend(best.t, opts.polish ?? 200) ?? best;
  if (!best) throw new Error("GP could not be fitted; add samples");
  return gpState(X, y, unpack(best.t, d), best.v);
}

/** Predictive mean and standard deviation of the latent function at x (no observation noise). */
export function predict(g: GPState, x: number[]) {
  const n = g.X.length, k = new Float64Array(n);
  let mu = g.ymean;
  for (let i = 0; i < n; i++) { k[i] = matern(x, g.X[i], g.params.ell, g.params.sf2); mu += k[i] * g.alpha[i]; }
  solveL(g.L, k, n);
  let v = g.params.sf2;
  for (let i = 0; i < n; i++) v -= k[i] * k[i];
  return { mu, sd: Math.sqrt(Math.max(0, v)) };
}

/** Leave-one-out predictions with the same hyperparameters, in closed form: μ₋ᵢ = yᵢ − α_i / [Ky⁻¹]ᵢᵢ, σ²₋ᵢ = 1 / [Ky⁻¹]ᵢᵢ. */
export function loo(g: GPState) {
  const n = g.X.length, Ki = inverse(g.L, n);
  return {
    mu: g.y.map((y, i) => y - g.alpha[i] / Ki[i * n + i]),
    sd: g.y.map((_, i) => Math.sqrt(1 / Ki[i * n + i])),
  };
}

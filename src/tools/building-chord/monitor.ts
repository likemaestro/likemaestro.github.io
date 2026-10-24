// Monitoring with synthetic data: "days" of the building under changing temperature and occupancy give the first six
// frequencies (tracked by MAC against the healthy reference, with 0.2 % identification noise). An autoencoder learns
// them on healthy days; a day it cannot rebuild is flagged. The Mahalanobis squared distance is the classic baseline
// (Worden, Manson and Fieller 2000). Thresholds: the 99th percentile on a separate healthy calibration set.
// Everything is simulated; the rates describe this simulation, not a real building.
import { cholesky, cholSolve } from "../la/dense";
import { createMLP, type MLP } from "../ml/mlp";
import { mulberry32, normal, type Rng } from "../rng";
import { modes, REF, track, type Building, type Damage, type Env } from "./building";

export const FEATURES = 6;
// calibration: 1000 days, since a 99th percentile from 300 rests on three points (measured false-alarm rates 0.4–6 %)
export const SPLITS = { train: 1000, validate: 200, calibrate: 1000, testHealthy: 200, testDamaged: 200 };
// lr 0.01: at 0.001 the validation loss still falls after 300 epochs; at 0.01 it stops improving near epoch 220
export const AE = { sizes: [6, 8, 2, 8, 6], acts: ["tanh", "tanh", "tanh", "linear"] as const, lr: 0.01, batch: 64, maxEpochs: 300, patience: 25 };

/** One environment: T = 15 + 12 sin(2π day / 365) + N(0, 3) °C in [−10, 35]; occupancy U(0.1, 0.6). */
export function environment(rng: Rng): Env {
  const day = rng() * 365, T = Math.min(35, Math.max(-10, 15 + 12 * Math.sin((2 * Math.PI * day) / 365) + 3 * normal(rng)));
  return { T, occ: 0.1 + 0.5 * rng() };
}

/** The six tracked frequencies of a state, optionally with identification noise N(0, 0.002 f). Null if a mode can't be matched. */
export function features(b: Building, env: Env, dmg: Damage, ref: ReturnType<typeof modes>, rng?: Rng) {
  const cur = modes(b, env, dmg).modes, t = track(ref, cur, FEATURES);
  if (t.uncertain) return null;
  return t.to.map((j) => cur[j].f * (rng ? 1 + 0.002 * normal(rng) : 1));
}

/** count days, seeded; days whose modes can't be matched are drawn again (and counted). */
export function days(b: Building, dmg: Damage, count: number, seed: number) {
  const rng = mulberry32(seed), ref = modes(b, REF), X: number[][] = [], env: Env[] = [];
  let redrawn = 0;
  while (X.length < count) {
    const e = environment(rng), x = features(b, e, dmg, ref, rng);
    if (!x) { redrawn++; continue; }
    X.push(x); env.push(e);
  }
  return { X, env, redrawn };
}

export interface Normalizer { mean: number[]; sd: number[] }
export function normalizer(X: number[][]): Normalizer {
  const n = X.length, mean = Array.from({ length: FEATURES }, (_, j) => X.reduce((a, x) => a + x[j], 0) / n);
  const sd = mean.map((m, j) => Math.max(1e-6, Math.sqrt(X.reduce((a, x) => a + (x[j] - m) ** 2, 0) / (n - 1))));
  return { mean, sd };
}
export const zscore = (x: number[], s: Normalizer) => x.map((v, j) => (v - s.mean[j]) / s.sd[j]);

/** Mean squared reconstruction error of one z-scored day. */
export function reconError(net: MLP, z: number[]) {
  const y = net.forward(z);
  let e = 0;
  for (let j = 0; j < FEATURES; j++) e += (y[j] - z[j]) ** 2;
  return e / FEATURES;
}

/** Linear-interpolation percentile, p in [0, 100]. */
export function percentile(v: number[], p: number) {
  const s = [...v].sort((a, b) => a - b), r = (p / 100) * (s.length - 1), i = Math.floor(r);
  return i + 1 < s.length ? s[i] + (r - i) * (s[i + 1] - s[i]) : s[i];
}

/** Mahalanobis squared distance with the training mean and a covariance regularized by λ = 1e-6 · trace / d. */
export function mahalanobis(Z: number[][]) {
  const n = Z.length, d = FEATURES, mu = Array.from({ length: d }, (_, j) => Z.reduce((a, z) => a + z[j], 0) / n);
  const C = new Float64Array(d * d);
  for (const z of Z) for (let i = 0; i < d; i++) for (let j = 0; j < d; j++) C[i * d + j] += ((z[i] - mu[i]) * (z[j] - mu[j])) / (n - 1);
  let tr = 0;
  for (let i = 0; i < d; i++) tr += C[i * d + i];
  for (let i = 0; i < d; i++) C[i * d + i] += (1e-6 * tr) / d;
  return mahalanobisFrom(mu, C);
}
export function mahalanobisFrom(mu: number[], cov: Float64Array) {
  const d = mu.length, L = cholesky(cov, d);
  return { mu, cov, score: (z: number[]) => { const r = Float64Array.from(z, (v, j) => v - mu[j]), s = cholSolve(L, r, d); return r.reduce((a, v, j) => a + v * s[j], 0); } };
}

export interface Trained {
  params: Float64Array; norm: Normalizer; aeThreshold: number; msdThreshold: number;
  history: { epoch: number; train: number; val: number }[]; best: number;
  latent: [number, number][]; env: Env[];                 // the training days' codes and environments
  calib: { ae: number[]; msd: number[]; f1: number[] }; trainP99: number; redrawn: number;   // f1: each day's first tracked frequency
  msd: { mu: number[]; cov: Float64Array };                 // the baseline's parameters
}

/** Train on healthy days with early stopping on the validation loss (best weights restored), then calibrate thresholds. */
export function train(b: Building, seed: number, onProgress?: (h: Trained["history"]) => void): Trained {
  const tr = days(b, null, SPLITS.train, seed), va = days(b, null, SPLITS.validate, seed + 1), ca = days(b, null, SPLITS.calibrate, seed + 2);
  const norm = normalizer(tr.X), Zt = tr.X.map((x) => zscore(x, norm)), Zv = va.X.map((x) => zscore(x, norm)), Zc = ca.X.map((x) => zscore(x, norm));
  const net = createMLP(AE.sizes, [...AE.acts], seed), history: Trained["history"] = [];
  let best = { val: Infinity, epoch: 0, p: net.params() };
  for (let e = 1; e <= AE.maxEpochs; e++) {
    const t = net.trainEpoch(Zt, AE.lr, AE.batch), v = net.loss(Zv);
    history.push({ epoch: e, train: t, val: v });
    if (v < best.val) best = { val: v, epoch: e, p: net.params() };
    if (e % 10 === 0) onProgress?.(history.slice());
    if (e - best.epoch >= AE.patience) break;
  }
  net.setParams(best.p);
  const msd = mahalanobis(Zt), ae = Zc.map((z) => reconError(net, z)), md = Zc.map((z) => msd.score(z));
  return {
    params: net.params(), norm, aeThreshold: percentile(ae, 99), msdThreshold: percentile(md, 99), history, best: best.epoch,
    latent: Zt.map((z) => { const c = net.encode(z, 2); return [c[0], c[1]] as [number, number]; }), env: tr.env,
    calib: { ae, msd: md, f1: ca.X.map((x) => x[0]) }, trainP99: percentile(Zt.map((z) => reconError(net, z)), 99), redrawn: tr.redrawn + va.redrawn + ca.redrawn,
    msd: { mu: msd.mu, cov: msd.cov },
  };
}

/** The trained model, rebuilt from its parameters (on the main thread). */
export function restore(t: Pick<Trained, "params" | "norm">, seed: number) {
  const net = createMLP(AE.sizes, [...AE.acts], seed);
  net.setParams(t.params);
  return net;
}

/** Scores of one state: autoencoder error, Mahalanobis distance, residuals per mode (z units), latent code. */
export function score(net: MLP, msd: ReturnType<typeof mahalanobis>, norm: Normalizer, x: number[]) {
  const z = zscore(x, norm), y = net.forward(z), c = net.encode(z, 2);
  return { ae: reconError(net, z), msd: msd.score(z), residuals: z.map((v, j) => v - y[j]), latent: [c[0], c[1]] as [number, number] };
}

/** Held-out test: 200 new healthy days and 200 days with the damage, same environment model, neither seen before. */
export function test(b: Building, dmg: Damage, t: Trained, seed: number) {
  const net = restore(t, seed), msd = mahalanobisFrom(t.msd.mu, t.msd.cov);
  const h = days(b, null, SPLITS.testHealthy, seed + 3), d = days(b, dmg, SPLITS.testDamaged, seed + 4);
  const count = (X: number[][]) => {
    let ae = 0, md = 0;
    for (const x of X) { const s = score(net, msd, t.norm, x); if (s.ae > t.aeThreshold) ae++; if (s.msd > t.msdThreshold) md++; }
    return { ae, md, n: X.length };
  };
  return { healthy: count(h.X), damaged: count(d.X) };
}

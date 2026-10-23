// Multi-criteria ranking of alternatives (rows) on criteria (columns), for the tools. Criteria are costs (smaller is
// better) unless `benefit[j]` marks them higher-is-better; those are negated, so every method minimizes.
// TOPSIS (Hwang & Yoon 1981), VIKOR (Opricovic & Tzeng 2004, DOI 10.1016/S0377-2217(03)00020-1),
// AHP weights (Saaty 1990, DOI 10.1016/0377-2217(90)90057-I), SMAA-2 (Lahdelma & Salminen 2001, DOI 10.1287/opre.49.3.444.11220).
import { mulberry32 } from "./truss-sizing/ga";

export type Method = "topsis" | "vikor";

const col = (X: number[][], j: number) => X.map((r) => r[j]);
const asCosts = (X: number[][], benefit?: boolean[]) => (benefit ? X.map((r) => r.map((v, j) => (benefit[j] ? -v : v))) : X);
/** Weights scaled to sum to 1; all zero becomes equal weights. */
export const normalize = (w: number[]) => { const s = w.reduce((a, b) => a + b, 0); return w.map((v) => (s > 0 ? v / s : 1 / w.length)); };

/** TOPSIS closeness to the ideal (1 best): vector normalization, weighted distances to the ideal and anti-ideal. */
export function topsis(X0: number[][], w: number[], benefit?: boolean[]) {
  const X = asCosts(X0, benefit), W = normalize(w), norm = W.map((_, j) => Math.hypot(...col(X, j)) || 1);
  const V = X.map((r) => r.map((v, j) => (W[j] * v) / norm[j]));
  const best = W.map((_, j) => Math.min(...col(V, j))), worst = W.map((_, j) => Math.max(...col(V, j)));
  return V.map((r) => {
    const dp = Math.hypot(...r.map((v, j) => v - best[j])), dm = Math.hypot(...r.map((v, j) => v - worst[j]));
    return dp + dm > 0 ? dm / (dp + dm) : 1;
  });
}

/** VIKOR group utility S, individual regret R and compromise index Q (all 0 best), with strategy weight v. */
export function vikorDetail(X0: number[][], w: number[], benefit?: boolean[], v = 0.5) {
  const X = asCosts(X0, benefit), W = normalize(w), lo = W.map((_, j) => Math.min(...col(X, j))), hi = W.map((_, j) => Math.max(...col(X, j)));
  const S: number[] = [], R: number[] = [];
  for (const r of X) {
    let s = 0, q = 0;
    r.forEach((x, j) => { const d = hi[j] > lo[j] ? (W[j] * (x - lo[j])) / (hi[j] - lo[j]) : 0; s += d; q = Math.max(q, d); });
    S.push(s); R.push(q);
  }
  const s0 = Math.min(...S), s1 = Math.max(...S), r0 = Math.min(...R), r1 = Math.max(...R);
  const Q = X.map((_, i) => v * (s1 > s0 ? (S[i] - s0) / (s1 - s0) : 0) + (1 - v) * (r1 > r0 ? (R[i] - r0) / (r1 - r0) : 0));
  return { S, R, Q };
}
export const vikor = (X: number[][], w: number[], benefit?: boolean[], v = 0.5) => vikorDetail(X, w, benefit, v).Q;

/** VIKOR's proposal: the best by Q if it has an acceptable advantage (Q₂ − Q₁ ≥ 1/(m − 1)) and is stable (also best
 *  by S or R); otherwise the compromise set: the first two without stability, all within the advantage without it. */
export function vikorChoice(S: number[], R: number[], Q: number[]) {
  const m = Q.length, order = Q.map((_, i) => i).sort((a, b) => Q[a] - Q[b]), DQ = 1 / Math.max(1, m - 1), a1 = order[0];
  const advantage = m < 2 || Q[order[1]] - Q[a1] >= DQ - 1e-12;
  const stable = S[a1] <= Math.min(...S) + 1e-12 || R[a1] <= Math.min(...R) + 1e-12;
  const set = advantage ? (stable ? [a1] : order.slice(0, 2)) : order.filter((i) => Q[i] - Q[a1] < DQ - 1e-12);
  return { order, set, advantage, stable };
}

/** The best alternative by a method, with every alternative's score. */
export function rank(X: number[][], w: number[], method: Method, benefit?: boolean[]) {
  const scores = method === "topsis" ? topsis(X, w, benefit) : vikor(X, w, benefit);
  const i = scores.reduce((b, s, k) => ((method === "topsis" ? s > scores[b] : s < scores[b]) ? k : b), 0);
  return { i, score: scores[i], scores };
}

/** Linked weights: weight j moves to v and the others share the rest in their current proportion, in hundredths. */
export function relink(w: number[], j: number, v: number) {
  const W = normalize(w), x = Math.round(Math.min(1, Math.max(0, v)) * 100), rest = 100 - x;
  const others = W.map((_, k) => k).filter((k) => k !== j), sum = others.reduce((s, k) => s + W[k], 0), out = W.map(() => 0);
  out[j] = x;
  let left = rest;
  others.forEach((k, i) => {
    const h = i === others.length - 1 ? left : Math.round(sum > 1e-9 ? (rest * W[k]) / sum : rest / others.length);
    out[k] = h; left -= h;
  });
  return out.map((h) => h / 100);
}

/** Random index by size: the mean consistency index of random reciprocal matrices on Saaty's 1–9 scale, estimated
 *  here from 100,000 matrices per size (Saaty's published tables differ slightly between sources). */
export const RI = [0, 0, 0, 0.525, 0.881, 1.108, 1.247];

/** AHP weights from a positive reciprocal comparison matrix: the principal eigenvector by power iteration, λmax, the
 *  consistency index and ratio, and the pair whose judgement departs most from the weights. */
export function ahp(A: number[][]) {
  const n = A.length, mul = (w: number[]) => A.map((r) => r.reduce((s, a, j) => s + a * w[j], 0));
  let w = new Array(n).fill(1 / n);
  for (let it = 0; it < 500; it++) {
    const v = mul(w), t = v.reduce((a, b) => a + b, 0), next = v.map((x) => x / t);
    const done = next.every((x, i) => Math.abs(x - w[i]) < 1e-14);
    w = next;
    if (done) break;
  }
  const Aw = mul(w), lambda = Aw.reduce((s, x, i) => s + x / w[i], 0) / n;
  const CI = n > 2 ? Math.max(0, (lambda - n) / (n - 1)) : 0, CR = n > 2 ? CI / RI[Math.min(n, RI.length - 1)] : 0;
  let worst: [number, number] = [0, 1], dev = -1;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const d = Math.abs(Math.log((A[i][j] * w[j]) / w[i])); if (d > dev) { dev = d; worst = [i, j]; } }
  return { w, lambda, CI, CR, worst };
}

export type SmaaWeights = { kind: "none" } | { kind: "order"; order: number[] } | { kind: "around"; w: number[]; spread: number };

/** SMAA-2 with an additive value function on criteria scaled 0 (worst option) to 1 (best). Weight vectors are drawn
 *  uniformly on the simplex (none), the same draws sorted to follow an order of importance (order[0] the most
 *  important), or each weight within ±spread of the given one and then rescaled (around). Returns the rank
 *  acceptability acc[i][r] (share of draws putting i at rank r, 0 best), the central weights (mean weights where i is
 *  first; null if never first) and the holistic acceptability with linear meta-weights. */
export function smaa2(X0: number[][], benefit: boolean[] | undefined, info: SmaaWeights, N = 10000, seed = 1) {
  const X = asCosts(X0, benefit), m = X.length, n = X[0].length, rnd = mulberry32(seed);
  const lo = X[0].map((_, j) => Math.min(...col(X, j))), hi = X[0].map((_, j) => Math.max(...col(X, j)));
  const U = X.map((r) => r.map((x, j) => (hi[j] > lo[j] ? (hi[j] - x) / (hi[j] - lo[j]) : 1)));
  const acc = X.map(() => new Array(m).fill(0)), central = X.map(() => new Array(n).fill(0)), wins = new Array(m).fill(0);
  const w = new Array(n).fill(0), idx = X.map((_, i) => i), val = new Array(m).fill(0);
  const base = info.kind === "around" ? normalize(info.w) : [];
  for (let s = 0; s < N; s++) {
    if (info.kind === "around") {
      let t = 0;
      for (let j = 0; j < n; j++) { w[j] = Math.max(0, base[j] * (1 + info.spread * (2 * rnd() - 1))); t += w[j]; }
      for (let j = 0; j < n; j++) w[j] = t > 0 ? w[j] / t : 1 / n;
    } else {
      // uniform on the simplex: the gaps between n − 1 sorted uniform cuts of [0, 1]
      const c = Array.from({ length: n - 1 }, rnd).sort((a, b) => a - b);
      for (let j = 0; j < n; j++) w[j] = (j === n - 1 ? 1 : c[j]) - (j === 0 ? 0 : c[j - 1]);
      if (info.kind === "order") { const g = w.slice().sort((a, b) => b - a); info.order.forEach((k, r) => { w[k] = g[r]; }); }
    }
    for (let i = 0; i < m; i++) { let v = 0; for (let j = 0; j < n; j++) v += w[j] * U[i][j]; val[i] = v; }
    idx.sort((a, b) => val[b] - val[a] || a - b);
    idx.forEach((i, r) => { acc[i][r]++; });
    const first = idx[0];
    wins[first]++;
    for (let j = 0; j < n; j++) central[first][j] += w[j];
  }
  const rankAcc = acc.map((r) => r.map((c) => c / N));
  return {
    acc: rankAcc,
    central: central.map((c, i) => (wins[i] ? c.map((x) => x / wins[i]) : null)),
    holistic: rankAcc.map((r) => r.reduce((s, b, k) => s + b * (m > 1 ? (m - 1 - k) / (m - 1) : 1), 0)),
  };
}

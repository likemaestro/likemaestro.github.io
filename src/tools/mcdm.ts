// Multi-criteria ranking of alternatives (rows) on cost criteria (columns; smaller is better), for the tools.
// TOPSIS (Hwang & Yoon 1981) and VIKOR (Opricovic & Tzeng 2004, DOI 10.1016/S0377-2217(03)00020-1).

export type Method = "topsis" | "vikor";

const col = (X: number[][], j: number) => X.map((r) => r[j]);
/** Weights scaled to sum to 1; all zero becomes equal weights. */
export const normalize = (w: number[]) => { const s = w.reduce((a, b) => a + b, 0); return w.map((v) => (s > 0 ? v / s : 1 / w.length)); };

/** TOPSIS closeness to the ideal (1 best): vector normalization, weighted distances to the ideal and anti-ideal. */
export function topsis(X: number[][], w: number[]) {
  const W = normalize(w), norm = W.map((_, j) => Math.hypot(...col(X, j)) || 1);
  const V = X.map((r) => r.map((v, j) => (W[j] * v) / norm[j]));
  const best = W.map((_, j) => Math.min(...col(V, j))), worst = W.map((_, j) => Math.max(...col(V, j)));
  return V.map((r) => {
    const dp = Math.hypot(...r.map((v, j) => v - best[j])), dm = Math.hypot(...r.map((v, j) => v - worst[j]));
    return dp + dm > 0 ? dm / (dp + dm) : 1;
  });
}

/** VIKOR compromise index Q (0 best) from group utility S and individual regret R, with strategy weight v. */
export function vikor(X: number[][], w: number[], v = 0.5) {
  const W = normalize(w), lo = W.map((_, j) => Math.min(...col(X, j))), hi = W.map((_, j) => Math.max(...col(X, j)));
  const S: number[] = [], R: number[] = [];
  for (const r of X) {
    let s = 0, q = 0;
    r.forEach((x, j) => { const d = hi[j] > lo[j] ? (W[j] * (x - lo[j])) / (hi[j] - lo[j]) : 0; s += d; q = Math.max(q, d); });
    S.push(s); R.push(q);
  }
  const s0 = Math.min(...S), s1 = Math.max(...S), r0 = Math.min(...R), r1 = Math.max(...R);
  return X.map((_, i) => v * (s1 > s0 ? (S[i] - s0) / (s1 - s0) : 0) + (1 - v) * (r1 > r0 ? (R[i] - r0) / (r1 - r0) : 0));
}

/** The best alternative by a method, with every alternative's score. */
export function rank(X: number[][], w: number[], method: Method) {
  const scores = method === "topsis" ? topsis(X, w) : vikor(X, w);
  const i = scores.reduce((b, s, k) => ((method === "topsis" ? s > scores[b] : s < scores[b]) ? k : b), 0);
  return { i, score: scores[i], scores };
}

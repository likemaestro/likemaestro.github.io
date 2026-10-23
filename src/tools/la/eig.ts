// Symmetric eigenproblems: Householder tridiagonalization and implicit QL (the EISPACK tred2 and tql2 algorithms),
// and the linear buckling problem (Ke − λ Kg) x = 0.
import { backward, bandwidth, cholesky, dot, forward, lu, luSolve, matVec, norm } from "./dense";

/** Eigenvalues (ascending) of the symmetric S, and the eigenvectors as columns of a row-major matrix if asked. */
export function symEig(S: Float64Array, n: number, vectors = true) {
  const V = Float64Array.from(S), d = new Float64Array(n), e = new Float64Array(n);
  const at = (i: number, j: number) => i * n + j;

  // Householder reduction to tridiagonal form, accumulating the transformations in V
  for (let j = 0; j < n; j++) d[j] = V[at(n - 1, j)];
  for (let i = n - 1; i > 0; i--) {
    let scale = 0, h = 0;
    for (let k = 0; k < i; k++) scale += Math.abs(d[k]);
    if (scale === 0) {
      e[i] = d[i - 1];
      for (let j = 0; j < i; j++) { d[j] = V[at(i - 1, j)]; V[at(i, j)] = 0; V[at(j, i)] = 0; }
    } else {
      for (let k = 0; k < i; k++) { d[k] /= scale; h += d[k] * d[k]; }
      let f = d[i - 1], g = Math.sqrt(h);
      if (f > 0) g = -g;
      e[i] = scale * g; h -= f * g; d[i - 1] = f - g;
      for (let j = 0; j < i; j++) e[j] = 0;
      for (let j = 0; j < i; j++) {
        f = d[j]; V[at(j, i)] = f; g = e[j] + V[at(j, j)] * f;
        for (let k = j + 1; k <= i - 1; k++) { g += V[at(k, j)] * d[k]; e[k] += V[at(k, j)] * f; }
        e[j] = g;
      }
      f = 0;
      for (let j = 0; j < i; j++) { e[j] /= h; f += e[j] * d[j]; }
      const hh = f / (h + h);
      for (let j = 0; j < i; j++) e[j] -= hh * d[j];
      for (let j = 0; j < i; j++) {
        f = d[j]; g = e[j];
        for (let k = j; k <= i - 1; k++) V[at(k, j)] -= f * e[k] + g * d[k];
        d[j] = V[at(i - 1, j)]; V[at(i, j)] = 0;
      }
    }
    d[i] = h;
  }
  if (!vectors) for (let j = 0; j < n; j++) d[j] = V[at(j, j)];   // the diagonal, without accumulating Q
  else {
    for (let i = 0; i < n - 1; i++) {
      V[at(n - 1, i)] = V[at(i, i)]; V[at(i, i)] = 1;
      const h = d[i + 1];
      if (h !== 0) {
        for (let k = 0; k <= i; k++) d[k] = V[at(k, i + 1)] / h;
        for (let j = 0; j <= i; j++) {
          let g = 0;
          for (let k = 0; k <= i; k++) g += V[at(k, i + 1)] * V[at(k, j)];
          for (let k = 0; k <= i; k++) V[at(k, j)] -= g * d[k];
        }
      }
      for (let k = 0; k <= i; k++) V[at(k, i + 1)] = 0;
    }
    for (let j = 0; j < n; j++) { d[j] = V[at(n - 1, j)]; V[at(n - 1, j)] = 0; }
    if (n > 0) V[at(n - 1, n - 1)] = 1;
  }
  e[0] = 0;
  for (let i = 1; i < n; i++) e[i - 1] = e[i];
  if (n > 0) e[n - 1] = 0;
  return tridiagEig(d, e, vectors ? V : null, n);
}

/**
 * Implicit QL on the symmetric tridiagonal matrix with diagonal d and off-diagonal e (e[i] couples i and i + 1); d and e
 * are overwritten. Rotations are applied to the columns of V (n × n, row-major) when given. Values ascending.
 */
export function tridiagEig(d: Float64Array, e: Float64Array, V: Float64Array | null, n: number) {
  const at = (i: number, j: number) => i * n + j;
  let f = 0, tst = 0;
  const eps = 2 ** -52;
  for (let l = 0; l < n; l++) {
    tst = Math.max(tst, Math.abs(d[l]) + Math.abs(e[l]));
    let m = l;
    while (m < n - 1 && Math.abs(e[m]) > eps * tst) m++;
    if (m > l) {
      let iter = 0;
      do {
        if (++iter > 60) throw new Error("tridiagEig: no convergence");
        let g = d[l], p = (d[l + 1] - g) / (2 * e[l]), r = Math.hypot(p, 1);
        if (p < 0) r = -r;
        d[l] = e[l] / (p + r); d[l + 1] = e[l] * (p + r);
        const dl1 = d[l + 1];
        let h = g - d[l];
        for (let i = l + 2; i < n; i++) d[i] -= h;
        f += h;
        p = d[m];
        let c = 1, c2 = 1, c3 = 1, s = 0, s2 = 0;
        const el1 = e[l + 1];
        for (let i = m - 1; i >= l; i--) {
          c3 = c2; c2 = c; s2 = s;
          g = c * e[i]; h = c * p; r = Math.hypot(p, e[i]);
          e[i + 1] = s * r; s = e[i] / r; c = p / r;
          p = c * d[i] - s * g; d[i + 1] = h + s * (c * g + s * d[i]);
          if (V) for (let k = 0; k < n; k++) {
            const t = V[at(k, i + 1)];
            V[at(k, i + 1)] = s * V[at(k, i)] + c * t; V[at(k, i)] = c * V[at(k, i)] - s * t;
          }
        }
        p = (-s * s2 * c3 * el1 * e[l]) / dl1; e[l] = s * p; d[l] = c * p;
      } while (Math.abs(e[l]) > eps * tst);
    }
    d[l] += f; e[l] = 0;
  }

  const order = Array.from(d.keys()).sort((a, b) => d[a] - d[b]);
  const values = Float64Array.from(order, (k) => d[k]);
  if (!V) return { values, vectors: null };
  const W = new Float64Array(n * n);
  order.forEach((k, c) => { for (let r = 0; r < n; r++) W[at(r, c)] = V[at(r, k)]; });
  return { values, vectors: W };
}

/**
 * The smallest positive λ of (Ke − λ Kg) x = 0, with Ke symmetric positive definite and Kg symmetric (indefinite allowed).
 * After a diagonal scaling, Ke = L Lᵀ (banded when the matrices are) and λ = 1/μ for the largest eigenvalue μ of
 * C = L⁻¹ Kg L⁻ᵀ, found by Lanczos with full reorthogonalization (C is applied, never formed). The mode is refined by
 * inverse iteration and λ by its Rayleigh quotient. Returns null when no positive λ exists.
 * `residual` = ‖Ke x − λ Kg x‖ / (‖Ke x‖ + λ ‖Kg x‖).
 */
export function bucklingEig(Ke: Float64Array, Kg: Float64Array, n: number) {
  const sc = new Float64Array(n);
  for (let i = 0; i < n; i++) sc[i] = 1 / Math.sqrt(Ke[i * n + i]);
  const A = new Float64Array(n * n), B = new Float64Array(n * n);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    A[i * n + j] = Ke[i * n + j] * sc[i] * sc[j];
    B[i * n + j] = Kg[i * n + j] * sc[i] * sc[j];
  }
  const bw = bandwidth(n, A, B), L = cholesky(A, n, bw);
  const op = (y: Float64Array) => forward(L, matVec(B, backward(L, Float64Array.from(y), n, bw), n, bw), n, bw);

  // Lanczos: C Q_k = Q_k T_k + β_k q_{k+1} e_kᵀ, with T_k tridiagonal (alpha, beta)
  let seed = 12345;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5;
  const fresh = (Q: Float64Array[]) => {   // a random unit vector orthogonal to Q
    const q = Float64Array.from({ length: n }, rnd);
    for (let pass = 0; pass < 2; pass++) for (const p of Q) { const c = dot(q, p); for (let i = 0; i < n; i++) q[i] -= c * p[i]; }
    const s = 1 / norm(q);
    for (let i = 0; i < n; i++) q[i] *= s;
    return q;
  };
  const Q: Float64Array[] = [], alpha: number[] = [], beta: number[] = [];
  let q = fresh(Q), prev = NaN, spread = 0;
  const ritz = (k: number, vectors: boolean) => {
    const d = Float64Array.from(alpha.slice(0, k)), e = new Float64Array(k), V = vectors ? new Float64Array(k * k) : null;
    for (let i = 0; i < k - 1; i++) e[i] = beta[i];
    if (V) for (let i = 0; i < k; i++) V[i * k + i] = 1;
    return tridiagEig(d, e, V, k);
  };
  for (let j = 0; j < n; j++) {
    Q.push(q);
    const w = op(q), a = dot(w, q);
    for (let i = 0; i < n; i++) w[i] -= a * q[i] + (j > 0 ? beta[j - 1] * Q[j - 1][i] : 0);
    for (let pass = 0; pass < 2; pass++) for (const p of Q) { const c = dot(w, p); for (let i = 0; i < n; i++) w[i] -= c * p[i]; }
    alpha.push(a);
    if (j === n - 1) break;
    if (j >= 9 && j % 5 === 4) {   // stop when the largest Ritz value no longer moves
      const v = ritz(j + 1, false).values;
      spread = Math.max(Math.abs(v[0]), Math.abs(v[j]));
      if (Math.abs(v[j] - prev) <= 1e-13 * spread) break;
      prev = v[j];
    }
    const b = norm(w);
    if (b <= 1e-12 * Math.max(spread, Math.abs(a))) { beta.push(0); q = fresh(Q); }   // invariant subspace: restart
    else { beta.push(b); q = w.map((x) => x / b); }
  }
  const k = alpha.length, { values, vectors } = ritz(k, true), mu = values[k - 1];
  spread = Math.max(Math.abs(values[0]), Math.abs(mu));
  if (!(mu > 1e-12 * spread)) return null;

  // mode x = S L⁻ᵀ Q s, then inverse iteration a hair below λ, and λ from the Rayleigh quotient
  let y = new Float64Array(n);
  for (let c = 0; c < k; c++) { const s = vectors![c * k + k - 1]; for (let i = 0; i < n; i++) y[i] += s * Q[c][i]; }
  backward(L, y, n, bw);
  let x = y.map((t, i) => t * sc[i]);
  let lambda = 1 / mu;
  const P = A, shift = lambda * (1 - 1e-9);   // A is no longer needed: reuse its memory
  for (let i = 0; i < n * n; i++) P[i] = Ke[i] - shift * Kg[i];
  const F = lu(P, n, true);
  for (let it = 0; it < 2; it++) {
    x = luSolve(F, matVec(Kg, x, n, bw));
    const s = 1 / norm(x);
    for (let i = 0; i < n; i++) x[i] *= s;
  }
  const kx = matVec(Ke, x, n, bw), gx = matVec(Kg, x, n, bw);
  lambda = dot(x, kx) / dot(x, gx);
  const r = kx.map((t, i) => t - lambda * gx[i]);
  return { lambda, x, residual: norm(r) / (norm(kx) + lambda * norm(gx)), steps: k };
}

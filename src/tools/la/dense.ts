// Dense linear algebra on row-major Float64Arrays: A[i * n + j].

export class NotPositiveDefinite extends Error {
  constructor(public pivot: number) { super(`Matrix is not positive definite at pivot ${pivot}`); }
}

/**
 * Cholesky factor L (lower triangle, A = L Lᵀ). Throws when a pivot falls below 1e-13 of the largest diagonal.
 * With a half-bandwidth bw (A[i][j] = 0 for |i − j| > bw) the work drops to n·bw², and L keeps the band.
 */
export function cholesky(A: Float64Array, n: number, bw = n - 1) {
  const L = new Float64Array(n * n);
  let dmax = 0;
  for (let i = 0; i < n; i++) dmax = Math.max(dmax, Math.abs(A[i * n + i]));
  for (let r = 0; r < n; r++) for (let c = Math.max(0, r - bw); c <= r; c++) {
    let s = A[r * n + c];
    for (let k = Math.max(0, r - bw); k < c; k++) s -= L[r * n + k] * L[c * n + k];
    if (r === c) {
      if (!(s > 1e-13 * dmax)) throw new NotPositiveDefinite(r);
      L[r * n + r] = Math.sqrt(s);
    } else L[r * n + c] = s / L[c * n + c];
  }
  return L;
}

/** Solves L y = b in place (bw: half-bandwidth of L). */
export function forward(L: Float64Array, b: Float64Array, n: number, bw = n - 1) {
  for (let r = 0; r < n; r++) { let s = b[r]; for (let k = Math.max(0, r - bw); k < r; k++) s -= L[r * n + k] * b[k]; b[r] = s / L[r * n + r]; }
  return b;
}

/** Solves Lᵀ x = y in place (bw: half-bandwidth of L). */
export function backward(L: Float64Array, y: Float64Array, n: number, bw = n - 1) {
  for (let r = n - 1; r >= 0; r--) { let s = y[r]; for (let k = r + 1; k <= Math.min(n - 1, r + bw); k++) s -= L[k * n + r] * y[k]; y[r] = s / L[r * n + r]; }
  return y;
}

export const cholSolve = (L: Float64Array, b: Float64Array, n: number) => backward(L, forward(L, Float64Array.from(b), n), n);

/** LU with partial pivoting, P A = L U, both packed in one array (A itself when inPlace). */
export function lu(A: Float64Array, n: number, inPlace = false) {
  const M = inPlace ? A : Float64Array.from(A), piv = new Int32Array(n);
  for (let k = 0; k < n; k++) {
    let p = k;
    for (let i = k + 1; i < n; i++) if (Math.abs(M[i * n + k]) > Math.abs(M[p * n + k])) p = i;
    piv[k] = p;
    if (p !== k) for (let j = 0; j < n; j++) { const t = M[k * n + j]; M[k * n + j] = M[p * n + j]; M[p * n + j] = t; }
    const d = M[k * n + k] || 1e-300;   // an exactly singular pivot only arises when shifting onto an eigenvalue
    for (let i = k + 1; i < n; i++) {
      const f = (M[i * n + k] /= d);
      if (f !== 0) for (let j = k + 1; j < n; j++) M[i * n + j] -= f * M[k * n + j];
    }
  }
  return { M, piv, n };
}

export function luSolve({ M, piv, n }: ReturnType<typeof lu>, b: Float64Array) {
  const x = Float64Array.from(b);
  for (let k = 0; k < n; k++) { const p = piv[k]; if (p !== k) { const t = x[k]; x[k] = x[p]; x[p] = t; } }
  for (let r = 0; r < n; r++) { let s = x[r]; for (let k = 0; k < r; k++) s -= M[r * n + k] * x[k]; x[r] = s; }
  for (let r = n - 1; r >= 0; r--) { let s = x[r]; for (let k = r + 1; k < n; k++) s -= M[r * n + k] * x[k]; x[r] = s / (M[r * n + r] || 1e-300); }
  return x;
}

export function matVec(A: Float64Array, x: Float64Array, n: number, bw = n - 1) {
  const y = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let j = Math.max(0, i - bw); j <= Math.min(n - 1, i + bw); j++) s += A[i * n + j] * x[j];
    y[i] = s;
  }
  return y;
}

/** Largest |i − j| over the nonzero entries of the given n × n matrices. */
export function bandwidth(n: number, ...M: Float64Array[]) {
  let bw = 0;
  for (const A of M) for (let i = 0; i < n; i++) for (let j = n - 1; j > i + bw; j--) if (A[i * n + j] !== 0 || A[j * n + i] !== 0) { bw = j - i; break; }
  return bw;
}

export const dot = (a: ArrayLike<number>, b: ArrayLike<number>) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };

export const norm = (x: ArrayLike<number>) => { let s = 0; for (let i = 0; i < x.length; i++) s += x[i] * x[i]; return Math.sqrt(s); };

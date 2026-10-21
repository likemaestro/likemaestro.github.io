// Simplified unit-cell topology optimization: linear elastic, plane stress, periodic Q4 mesh.
// Energy-based homogenization (Andreassen & Andreasen 2014), SIMP, density filter, D4 symmetry.
// Pure functions and typed arrays only: runs in a Web Worker, in Jest and in Node.
import { Mma } from "./mma";

// Three targets with distinct optima. Bulk (C11+C22+2C12) is left out: at this volume fraction the square grid and the
// diamond grid both reach the 2D bulk bound, so it always reproduces the axial or the shear result.
export type Objective = "axial" | "shear" | "auxetic";
export const OBJECTIVES: Objective[] = ["axial", "shear", "auxetic"];

export interface Options {
  n: number;            // elements per side
  vf?: number;          // volume fraction
  nu?: number;          // base material Poisson's ratio
  penal?: number;       // SIMP exponent
  rmin?: number;        // filter radius, in elements
  Emin?: number;        // void stiffness (E0 = 1)
  move?: number;        // move limit
  maxIter?: number;
  tol?: number;         // stop when max |Δρ| < tol
  voidRadius?: number;  // initial central void, fraction of the cell side
  betaMax?: number;     // final Heaviside projection sharpness
  betaEvery?: number;   // iterations between doublings of beta
  perturb?: number;     // amplitude of the initial cosine perturbation
}

const DEFAULTS = { vf: 0.4, nu: 0.3, penal: 3, rmin: 2, Emin: 1e-9, move: 0.2, maxIter: 160, tol: 0.01, voidRadius: 0.15, betaMax: 16, betaEvery: 20, perturb: 0.25 };

// Voigt order [11, 22, 12] with engineering shear. Pairs of load cases stored per element:
// q[0]=11, q[1]=22, q[2]=33, q[3]=12, q[4]=13, q[5]=23.
const PAIRS: [number, number][] = [[0, 0], [1, 1], [2, 2], [0, 1], [0, 2], [1, 2]];

export interface Problem {
  n: number; nel: number; neq: number;
  o: Required<Options>;
  ke: Float64Array;              // 8x8 element stiffness for E = 1
  chi0: Float64Array[];          // 3 x 8 nodal values of the unit test strains
  fe: Float64Array[];            // 3 x 8 element loads ke * chi0
  edof: Int32Array;              // nel x 8 equation numbers, -1 for the fixed node
  first: Int32Array; rowStart: Int32Array; nnzProfile: number;  // profile (skyline) storage
  kmap: Int32Array;              // nel x 36 positions of the element's lower triangle in the profile
  orbit: Int32Array; orbitStart: Int32Array; orbitMembers: Int32Array; // D4 orbits of elements
  filt: { idx: Int32Array; w: Float64Array; sum: number };            // periodic density filter (same stencil everywhere)
}

// ---------- element ----------
export function elementMatrices(nu: number, h: number) {
  const c = 1 / (1 - nu * nu);
  const D = [c, c * nu, 0, c * nu, c, 0, 0, 0, (c * (1 - nu)) / 2];
  const g = 1 / Math.sqrt(3);
  const ke = new Float64Array(64);
  for (const xi of [-g, g]) for (const eta of [-g, g]) {
    const dNdxi = [-(1 - eta) / 4, (1 - eta) / 4, (1 + eta) / 4, -(1 + eta) / 4];
    const dNdeta = [-(1 - xi) / 4, -(1 + xi) / 4, (1 + xi) / 4, (1 - xi) / 4];
    const J = h / 2, detJ = J * J;
    const B = new Float64Array(24);
    for (let a = 0; a < 4; a++) {
      const dx = dNdxi[a] / J, dy = dNdeta[a] / J;
      B[2 * a] = dx; B[8 + 2 * a + 1] = dy; B[16 + 2 * a] = dy; B[16 + 2 * a + 1] = dx;
    }
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
      let s = 0;
      for (let p = 0; p < 3; p++) { let db = 0; for (let q = 0; q < 3; q++) db += D[p * 3 + q] * B[q * 8 + j]; s += B[p * 8 + i] * db; }
      ke[i * 8 + j] += s * detJ;
    }
  }
  const xy = [[0, 0], [h, 0], [h, h], [0, h]];
  const chi0 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]].map(([e11, e22, g12]) => {
    const v = new Float64Array(8);
    xy.forEach(([x, y], a) => { v[2 * a] = e11 * x + 0.5 * g12 * y; v[2 * a + 1] = 0.5 * g12 * x + e22 * y; });
    return v;
  });
  const fe = chi0.map((v) => { const f = new Float64Array(8); for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) f[i] += ke[i * 8 + j] * v[j]; return f; });
  return { ke, chi0, fe, D };
}

// ---------- setup ----------
export function createProblem(opts: Options): Problem {
  const o = { ...DEFAULTS, ...opts } as Problem["o"];
  const n = o.n, nel = n * n, h = 1 / n;
  const { ke, chi0, fe } = elementMatrices(o.nu, h);

  // Folded row order (0, n-1, 1, n-2, ...) keeps periodically coupled rows close: profile ~ 4n equations.
  const rank = (y: number) => (y < n / 2 ? 2 * y : 2 * (n - 1 - y) + 1);
  const pos = (x: number, y: number) => rank(y) * n + x;          // node 0 = (0, 0) -> pos 0, fixed
  const edof = new Int32Array(nel * 8);
  for (let ey = 0; ey < n; ey++) for (let ex = 0; ex < n; ex++) {
    const e = ey * n + ex;
    const nodes = [[ex, ey], [ex + 1, ey], [ex + 1, ey + 1], [ex, ey + 1]].map(([x, y]) => pos(x % n, y % n));
    nodes.forEach((p, a) => { edof[e * 8 + 2 * a] = p === 0 ? -1 : 2 * p - 2; edof[e * 8 + 2 * a + 1] = p === 0 ? -1 : 2 * p - 1; });
  }
  const neq = 2 * nel - 2;
  const first = new Int32Array(neq).map((_, i) => i);
  for (let e = 0; e < nel; e++) {
    let lo = Infinity;
    for (let a = 0; a < 8; a++) { const d = edof[e * 8 + a]; if (d >= 0 && d < lo) lo = d; }
    for (let a = 0; a < 8; a++) { const d = edof[e * 8 + a]; if (d >= 0 && lo < first[d]) first[d] = lo; }
  }
  const rowStart = new Int32Array(neq + 1);
  for (let i = 0; i < neq; i++) rowStart[i + 1] = rowStart[i] + (i - first[i] + 1);
  const kmap = new Int32Array(nel * 36).fill(-1);
  for (let e = 0; e < nel; e++) {
    let t = 0;
    for (let a = 0; a < 8; a++) for (let b = 0; b <= a; b++, t++) {
      let I = edof[e * 8 + a], J = edof[e * 8 + b];
      if (I < 0 || J < 0) continue;
      if (J > I) [I, J] = [J, I];
      kmap[e * 36 + t] = rowStart[I] + (J - first[I]);
    }
  }

  // D4 orbits of element (ex, ey) about the cell centre.
  const imgs = (x: number, y: number) => { const X = n - 1 - x, Y = n - 1 - y; return [[x, y], [X, y], [x, Y], [X, Y], [y, x], [Y, x], [y, X], [Y, X]]; };
  const orbit = new Int32Array(nel).fill(-1), starts: number[] = [0], members: number[] = [];
  for (let e = 0; e < nel; e++) {
    if (orbit[e] >= 0) continue;
    const id = starts.length - 1;
    const set = Array.from(new Set(imgs(e % n, Math.floor(e / n)).map(([x, y]) => y * n + x))).sort((a, b) => a - b);
    for (const m of set) { orbit[m] = id; members.push(m); }
    starts.push(members.length);
  }

  // Periodic cone filter; the stencil is identical for every element.
  const r = o.rmin, R = Math.ceil(r) - 1, offs: [number, number, number][] = [];
  for (let dy = -R - 1; dy <= R + 1; dy++) for (let dx = -R - 1; dx <= R + 1; dx++) {
    const w = r - Math.hypot(dx, dy); if (w > 0) offs.push([dx, dy, w]);
  }
  const idx = new Int32Array(nel * offs.length), w = new Float64Array(offs.length);
  offs.forEach(([, , wt], k) => (w[k] = wt));
  for (let ey = 0; ey < n; ey++) for (let ex = 0; ex < n; ex++)
    offs.forEach(([dx, dy], k) => { idx[(ey * n + ex) * offs.length + k] = ((ey + dy + n) % n) * n + ((ex + dx + n) % n); });
  const sum = offs.reduce((s, [, , wt]) => s + wt, 0);

  return { n, nel, neq, o, ke, chi0, fe, edof, first, rowStart, nnzProfile: rowStart[neq], kmap,
    orbit, orbitStart: Int32Array.from(starts), orbitMembers: Int32Array.from(members), filt: { idx, w, sum } };
}

// ---------- linear algebra: profile Cholesky ----------
function cholesky(P: Problem, A: Float64Array) {
  const { first, rowStart, neq } = P;
  for (let i = 0; i < neq; i++) {
    const fi = first[i], ri = rowStart[i];
    for (let j = fi; j <= i; j++) {
      const fj = first[j], rj = rowStart[j], k0 = fi > fj ? fi : fj;
      let s = A[ri + j - fi];
      for (let k = k0; k < j; k++) s -= A[ri + k - fi] * A[rj + k - fj];
      if (j < i) A[ri + j - fi] = s / A[rj + j - fj];
      else { if (!(s > 0)) throw new Error("Stiffness matrix not positive definite"); A[ri + i - fi] = Math.sqrt(s); }
    }
  }
}
function solve(P: Problem, L: Float64Array, b: Float64Array) {
  const { first, rowStart, neq } = P;
  for (let i = 0; i < neq; i++) {
    const fi = first[i], ri = rowStart[i]; let s = b[i];
    for (let k = fi; k < i; k++) s -= L[ri + k - fi] * b[k];
    b[i] = s / L[ri + i - fi];
  }
  for (let i = neq - 1; i >= 0; i--) {
    const fi = first[i], ri = rowStart[i]; const x = (b[i] /= L[ri + i - fi]);
    for (let k = fi; k < i; k++) b[k] -= L[ri + k - fi] * x;
  }
}

// ---------- homogenization ----------
export interface Homog { C: Float64Array; q: Float64Array[]; chi: Float64Array[] }
/** Effective stiffness C (3x3, row-major) for element moduli E; q[pair][e] are the element energies for E = 1. */
export function homogenize(P: Problem, E: Float64Array): Homog {
  const { nel, neq, ke, kmap, edof, fe, chi0 } = P;
  const K = new Float64Array(P.nnzProfile);
  const keL = new Float64Array(36);
  { let t = 0; for (let a = 0; a < 8; a++) for (let b = 0; b <= a; b++) keL[t++] = ke[a * 8 + b]; }
  for (let e = 0; e < nel; e++) { const Ee = E[e], base = e * 36; for (let t = 0; t < 36; t++) { const m = kmap[base + t]; if (m >= 0) K[m] += Ee * keL[t]; } }
  cholesky(P, K);
  const chi = [0, 1, 2].map((c) => {
    const F = new Float64Array(neq);
    for (let e = 0; e < nel; e++) for (let a = 0; a < 8; a++) { const d = edof[e * 8 + a]; if (d >= 0) F[d] += E[e] * fe[c][a]; }
    solve(P, K, F); return F;
  });
  const q = PAIRS.map(() => new Float64Array(nel));
  const C = new Float64Array(9);
  const d = [new Float64Array(8), new Float64Array(8), new Float64Array(8)], kd = [new Float64Array(8), new Float64Array(8), new Float64Array(8)];
  for (let e = 0; e < nel; e++) {
    for (let c = 0; c < 3; c++) {
      for (let a = 0; a < 8; a++) { const g = edof[e * 8 + a]; d[c][a] = chi0[c][a] - (g >= 0 ? chi[c][g] : 0); }
      for (let a = 0; a < 8; a++) { let s = 0; for (let b = 0; b < 8; b++) s += ke[a * 8 + b] * d[c][b]; kd[c][a] = s; }
    }
    PAIRS.forEach(([i, j], p) => { let s = 0; for (let a = 0; a < 8; a++) s += d[i][a] * kd[j][a]; q[p][e] = s; });
  }
  PAIRS.forEach(([i, j], p) => { let s = 0; for (let e = 0; e < nel; e++) s += E[e] * q[p][e]; C[i * 3 + j] = s; C[j * 3 + i] = s; });
  return { C, q, chi };
}

/** Engineering constants from C: E1 = 1/S11, nu12 = -S12/S11 with S = C^-1. */
export function properties(C: Float64Array) {
  const [a, b, c, d, e, f, g, h, i] = C;
  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  const S11 = (e * i - f * h) / det, S12 = (c * h - b * i) / det;
  return { E1: 1 / S11, nu12: -S12 / S11 };
}

// ---------- objective ----------
const pick = (C: Float64Array, i: number, j: number) => C[i * 3 + j];
/** Value (to minimize) and per-element weights dF/dE for the objective. */
export function objective(obj: Objective, C: Float64Array, q: Float64Array[], wStiff = 1) {
  const nel = q[0].length, dE = new Float64Array(nel);
  let f = 0;
  switch (obj) {
    case "axial": f = -(pick(C, 0, 0) + pick(C, 1, 1)); for (let e = 0; e < nel; e++) dE[e] = -(q[0][e] + q[1][e]); break;
    case "shear": f = -pick(C, 2, 2); for (let e = 0; e < nel; e++) dE[e] = -q[2][e]; break;
    case "auxetic": f = pick(C, 0, 1) - wStiff * (pick(C, 0, 0) + pick(C, 1, 1)); for (let e = 0; e < nel; e++) dE[e] = q[3][e] - wStiff * (q[0][e] + q[1][e]); break;
  }
  return { f, dE };
}

// ---------- filter, symmetry ----------
export function applyFilter(P: Problem, x: Float64Array, out = new Float64Array(P.nel)) {
  const { idx, w, sum } = P.filt, m = w.length;
  for (let e = 0; e < P.nel; e++) { let s = 0; for (let k = 0; k < m; k++) s += w[k] * x[idx[e * m + k]]; out[e] = s / sum; }
  return out;
}
/** Average over each D4 orbit; summed in a fixed order so every member gets bit-identical values. */
export function symmetrize(P: Problem, v: Float64Array) {
  const { orbitStart, orbitMembers } = P;
  for (let o = 0; o + 1 < orbitStart.length; o++) {
    let s = 0; const a = orbitStart[o], b = orbitStart[o + 1];
    for (let k = a; k < b; k++) s += v[orbitMembers[k]];
    s /= b - a;
    for (let k = a; k < b; k++) v[orbitMembers[k]] = s;
  }
  return v;
}

/** Uniform volume fraction with a small D4-symmetric cosine perturbation and a central void (deterministic, seed-free). */
export function initialDesign(P: Problem) {
  const { n, nel, o } = P, x = new Float64Array(nel);
  for (let e = 0; e < nel; e++) {
    const X = ((e % n) + 0.5) / n - 0.5, Y = (Math.floor(e / n) + 0.5) / n - 0.5;
    x[e] = Math.hypot(X, Y) < o.voidRadius ? 0 : 1 + o.perturb * (Math.cos(4 * Math.PI * X) + Math.cos(4 * Math.PI * Y));
  }
  const mean = x.reduce((s, v) => s + v, 0) / nel;
  for (let e = 0; e < nel; e++) x[e] = Math.min(1, (x[e] * o.vf) / mean);
  return symmetrize(P, x);
}

/** Heaviside projection (Wang, Lazarov & Sigmund 2011), threshold 0.5. */
function project(t: Float64Array, beta: number) {
  const eta = 0.5, d = Math.tanh(beta * eta) + Math.tanh(beta * (1 - eta));
  const out = new Float64Array(t.length), deriv = new Float64Array(t.length);
  for (let e = 0; e < t.length; e++) {
    const th = Math.tanh(beta * (t[e] - eta));
    out[e] = (Math.tanh(beta * eta) + th) / d;
    deriv[e] = (beta * (1 - th * th)) / d;
  }
  return { out, deriv };
}

/** Objective, volume and their sensitivities to the design variables (filter, projection, SIMP), D4-symmetrized. */
export function evaluate(P: Problem, x: Float64Array, obj: Objective, wStiff = 1, beta = 1) {
  const { o, nel } = P;
  const { out: phys, deriv } = project(applyFilter(P, x), beta);
  const E = new Float64Array(nel), dEdr = new Float64Array(nel);
  for (let e = 0; e < nel; e++) { const r = phys[e]; E[e] = o.Emin + Math.pow(r, o.penal) * (1 - o.Emin); dEdr[e] = o.penal * Math.pow(r, o.penal - 1) * (1 - o.Emin); }
  const H = homogenize(P, E);
  const { f, dE } = objective(obj, H.C, H.q, wStiff);
  const t1 = new Float64Array(nel), t2 = new Float64Array(nel);
  for (let e = 0; e < nel; e++) { t1[e] = dE[e] * dEdr[e] * deriv[e]; t2[e] = deriv[e] / nel; }
  const df = symmetrize(P, applyFilter(P, t1));   // the filter is symmetric with a constant row sum
  const dv = symmetrize(P, applyFilter(P, t2));
  const vol = phys.reduce((s, v) => s + v, 0) / nel;
  return { f, df, vol, dv, C: H.C, phys, H };
}

// Auxetic: the stiffness weight decays as beta^l (Andreassen & Andreasen 2014), held at a floor so the cell stays connected.
const AUX_BETA = 0.8, AUX_FLOOR = 0.02;
export const auxeticWeight = (iter: number) => Math.max(Math.pow(AUX_BETA, iter), AUX_FLOOR);

export interface IterInfo {
  iter: number; phys: Float64Array; C: Float64Array; f: number; vol: number; change: number;
  E1: number; nu12: number; beta: number; done: boolean;
}

/** Stateful run with MMA and beta continuation: call next() once per iteration. */
export function createRun(obj: Objective, opts: Options) {
  const P = createProblem(opts);
  let x = initialDesign(P), iter = 0, done = false, beta = 1, scale = 0;
  const mma = new Mma(P.nel, { move: P.o.move });
  return {
    P,
    next(): IterInfo {
      const w = obj === "auxetic" ? auxeticWeight(iter) : 1;
      const ev = evaluate(P, x, obj, w, beta);
      if (!scale) scale = 1 / Math.max(Math.abs(ev.f), 1e-12);
      const xn = mma.update(x, ev.df.map((v) => v * scale), ev.vol - P.o.vf, ev.dv);
      symmetrize(P, xn);   // keeps round-off from breaking D4 exactly
      let change = 0;
      for (let e = 0; e < P.nel; e++) change = Math.max(change, Math.abs(xn[e] - x[e]));
      x = xn; iter++;
      const settled = change < P.o.tol || iter % P.o.betaEvery === 0;
      if (settled && beta < P.o.betaMax) beta *= 2;
      else if (settled && beta >= P.o.betaMax && change < P.o.tol) done = true;
      if (iter >= P.o.maxIter) done = true;
      const { E1, nu12 } = properties(ev.C);
      return { iter, phys: ev.phys, C: ev.C, f: ev.f, vol: ev.vol, change, E1, nu12, beta, done };
    },
    get design() { return x; },
    get done() { return done; },
  };
}

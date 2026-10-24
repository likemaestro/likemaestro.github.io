// Independent check for ltb.ts (tests only): Rayleigh–Ritz with sine series v = Σ a_k sin(kπx/L), φ = Σ b_k sin(kπx/L),
// which meet the fork supports exactly; the same total potential, integrals by composite Gauss quadrature, restraints as a
// nullspace of the constraint rows. A different basis and a different constraint route from the finite elements.
import { bucklingEig, symEig } from "../la/eig";
import { E, G } from "../steel/sections";
import { zLoad, type LtbCase } from "./ltb";

export function ritzMcr(c: LtbCase, N = 30, panels = 400) {
  const { sec, L, load } = c, nd = 2 * N, zg = load === "moment" ? 0 : zLoad(sec.h, c.height), ztop = (sec.h - sec.tf) / 2;
  const P = 1000, q = load === "udl" ? 1 : 0;
  const M = (x: number) => (load === "moment" ? 1e6 : load === "udl" ? (q * x * (L - x)) / 2 : (P * Math.min(x, L - x)) / 2);
  const Mmax = load === "moment" ? 1e6 : load === "udl" ? (q * L * L) / 8 : (P * L) / 4;
  const kp = (k: number) => ((k + 1) * Math.PI) / L, sn = (k: number, x: number) => Math.sin(kp(k) * x);

  const K = new Float64Array(nd * nd), Kg = new Float64Array(nd * nd);
  for (let k = 0; k < N; k++) {
    K[k * nd + k] = (E * sec.Iz * kp(k) ** 4 * L) / 2;
    K[(N + k) * nd + N + k] = ((G * sec.It * kp(k) ** 2 + E * sec.Iw * kp(k) ** 4) * L) / 2;
  }
  const gx = [-0.8611363115940526, -0.3399810435848563, 0.3399810435848563, 0.8611363115940526];
  const gw = [0.3478548451374538, 0.6521451548625461, 0.6521451548625461, 0.3478548451374538];
  const h = L / panels, s = new Float64Array(N);
  for (let p = 0; p < panels; p++) for (let g = 0; g < 4; g++) {
    const x = (p + 0.5 + 0.5 * gx[g]) * h, w = 0.5 * h * gw[g], m = M(x);
    for (let k = 0; k < N; k++) s[k] = sn(k, x);
    for (let k = 0; k < N; k++) for (let j = 0; j < N; j++) {
      const c1 = -w * m * kp(k) ** 2 * s[k] * s[j];   // ∫ M v″ φ: a_k with b_j
      Kg[k * nd + N + j] += c1;
      Kg[(N + j) * nd + k] += c1;
      Kg[(N + k) * nd + N + j] += w * q * zg * s[k] * s[j];
    }
  }
  if (load === "point") for (let k = 0; k < N; k++) for (let j = 0; j < N; j++) Kg[(N + k) * nd + N + j] += P * zg * sn(k, L / 2) * sn(j, L / 2);

  // constraint rows at each restraint, then T = nullspace (eigenvectors of CᵀC with zero eigenvalue)
  const rows: Float64Array[] = [];
  for (const a of c.at) {
    const x = a * L, rv = new Float64Array(nd), rf = new Float64Array(nd);
    for (let k = 0; k < N; k++) { rv[k] = sn(k, x); rf[N + k] = sn(k, x); }
    if (c.kind === "full") rows.push(rv, rf);
    else {
      const z = c.kind === "top" ? ztop : -ztop, r = new Float64Array(nd);   // v ∓ z φ = 0
      for (let k = 0; k < N; k++) { r[k] = sn(k, x); r[N + k] = -z * sn(k, x); }
      rows.push(r);
    }
  }
  let T: Float64Array, m = nd;
  if (rows.length) {
    const CtC = new Float64Array(nd * nd);
    for (const r of rows) for (let i = 0; i < nd; i++) for (let j = 0; j < nd; j++) CtC[i * nd + j] += r[i] * r[j];
    const { values, vectors } = symEig(CtC, nd), tol = 1e-10 * values[nd - 1];
    const cols = Array.from(values.keys()).filter((k) => values[k] < tol);
    m = cols.length;
    T = new Float64Array(nd * m);
    cols.forEach((c2, j) => { for (let i = 0; i < nd; i++) T[i * m + j] = vectors![i * nd + c2]; });
  } else {
    T = new Float64Array(nd * nd);
    for (let i = 0; i < nd; i++) T[i * nd + i] = 1;
  }
  const proj = (A: Float64Array) => {
    const AT = new Float64Array(nd * m), R = new Float64Array(m * m);
    for (let i = 0; i < nd; i++) for (let k = 0; k < nd; k++) {
      const a = A[i * nd + k];
      if (a !== 0) for (let j = 0; j < m; j++) AT[i * m + j] += a * T[k * m + j];
    }
    for (let i = 0; i < m; i++) for (let k = 0; k < nd; k++) {
      const t = T[k * m + i];
      if (t !== 0) for (let j = 0; j < m; j++) R[i * m + j] += t * AT[k * m + j];
    }
    return R;
  };
  const sol = bucklingEig(proj(K), proj(Kg), m);
  return sol ? sol.lambda * Mmax : null;
}

// Lateral-torsional buckling of a doubly symmetric steel beam on fork supports: Hermite finite elements, restraints as
// exact constraints, the elastic critical moment Mcr, and the rolled-section check of EN 1993-1-1:2005, 6.3.2.3.
// Units: N, mm. Axes: x along the span, y sideways, z up. A positive twist φ turns the top flange towards −y, so a fibre at
// height z moves sideways by v − z φ. Sagging moments are positive (top flange in compression); loads act downwards.
//
// Second variation of the total potential, prebuckling deflections ignored, from the bending stress σ = −M z / Iy:
//   Π₂ = ½∫(EIz v″² + GIt φ′² + EIw φ″²) dx − λ [∫ M v″ φ dx + ½∫ q zg φ² dx + ½ P zg φ(xP)²]
// so Ke = ∫(EIz BvᵀBv + GIt TφᵀTφ + EIw WφᵀWφ) and Kg = ∫ M (BvᵀNφ + NφᵀBv) + ∫ q zg NφᵀNφ + P zg Nφ(xP)ᵀNφ(xP).
// zg is the load height above the shear center; zg > 0 is destabilizing. With this sign of the M term the compression
// flange sways more than the tension flange (ltb.test.ts checks it).
import { bucklingEig } from "../la/eig";
import { E, G, type Section } from "../steel/sections";

export type Load = "moment" | "udl" | "point";
export type Height = "top" | "centre" | "bottom";
export type Restraint = "top" | "full" | "bottom";   // the page offers top and full; bottom is for the tests

export interface LtbCase {
  sec: Pick<Section, "h" | "tf" | "Iz" | "It" | "Iw">;
  L: number;          // span, mm
  load: Load;
  height: Height;     // ignored under uniform moment
  at: number[];       // restraint positions as shares of the span
  kind: Restraint;
  n?: number;         // elements, even
}

export interface Mode { v: Float64Array; dv: Float64Array; phi: Float64Array; dphi: Float64Array }
export interface LtbResult {
  Mcr: number;                  // N mm
  M0: number;                   // uniform-moment closed form for the same section and span
  ratio: number;                // Mcr / M0
  nodes: number[];              // restraint nodes after snapping and merging
  shared: [number, number][];   // restraints (1-based) that snapped to the node of an earlier one
  mode: Mode;                   // at the nodes; the largest flange displacement is +1
  residual: number;
  n: number; L: number; ztop: number;
}

const GAUSS = [   // 4-point Gauss–Legendre on [0, 1]
  [0.5 - 0.4305681557970263, 0.1739274225687269], [0.5 - 0.1699905217924281, 0.3260725774312731],
  [0.5 + 0.1699905217924281, 0.3260725774312731], [0.5 + 0.4305681557970263, 0.1739274225687269],
];

/** Hermite cubic rows for one field on an element of length l at ξ: value, first and second derivative in x. */
function hermite(xi: number, l: number) {
  const x2 = xi * xi, x3 = x2 * xi;
  return {
    H: [1 - 3 * x2 + 2 * x3, l * (xi - 2 * x2 + x3), 3 * x2 - 2 * x3, l * (x3 - x2)],
    H1: [(6 * x2 - 6 * xi) / l, 1 - 4 * xi + 3 * x2, (6 * xi - 6 * x2) / l, 3 * x2 - 2 * xi],
    H2: [(12 * xi - 6) / (l * l), (6 * xi - 4) / l, (6 - 12 * xi) / (l * l), (6 * xi - 2) / l],
  };
}

/** Mcr under uniform moment, fork supports: (π/L) √(EIz GIt) √(1 + π² EIw / (L² GIt)). */
export const mcrUniform = (s: LtbCase["sec"], L: number) =>
  (Math.PI / L) * Math.sqrt(E * s.Iz * G * s.It) * Math.sqrt(1 + (Math.PI ** 2 * E * s.Iw) / (L * L * G * s.It));

export function zLoad(h: number, height: Height) { return height === "top" ? h / 2 : height === "bottom" ? -h / 2 : 0; }

/** Element assembly and exact constraints: the reduced Ke (A) and Kg (B) for the reference load. */
export function assembleLtb(c: LtbCase) {
  const { sec, L, load } = c, n = c.n ?? 40, l = L / n, nd = 4 * (n + 1);
  if (n % 2) throw new Error("assembleLtb: n must be even");
  const zg = load === "moment" ? 0 : zLoad(sec.h, c.height), ztop = (sec.h - sec.tf) / 2;
  const P = 1000, q = load === "udl" ? 1 : 0;   // reference loads: 1 kN, 1 kN/m, or 1 kNm
  const M = (x: number) => (load === "moment" ? 1e6 : load === "udl" ? (q * x * (L - x)) / 2 : (P * Math.min(x, L - x)) / 2);
  const Mmax = load === "moment" ? 1e6 : load === "udl" ? (q * L * L) / 8 : (P * L) / 4;

  // constraints: fork supports v = φ = 0; restraints at the nearest interior node
  const nodes: number[] = [], shared: [number, number][] = [];
  c.at.forEach((s, i) => {
    const k = Math.min(n - 1, Math.max(1, Math.round(s * n))), j = nodes.indexOf(k);
    if (j >= 0) shared.push([j + 1, i + 1]); else nodes.push(k);
  });
  // each global DOF maps to one reduced DOF with a factor, or is fixed: v = ±ztop φ for flange restraints
  const map: { j: number; f: number }[] = new Array(nd), fixed = new Set<number>([0, 2, 4 * n, 4 * n + 2]), dep = new Map<number, number>();
  for (const k of nodes) {
    if (c.kind === "full") fixed.add(4 * k).add(4 * k + 2);
    else dep.set(4 * k, c.kind === "top" ? ztop : -ztop);   // top: v − ztop φ = 0; bottom: v + ztop φ = 0
  }
  let nr = 0;
  for (let g = 0; g < nd; g++) if (!fixed.has(g) && !dep.has(g)) map[g] = { j: nr++, f: 1 };
  for (const [g, z] of dep) map[g] = { j: map[g + 2].j, f: z };

  // element matrices, added straight into the reduced Ke (A) and Kg (B): A = Tᵀ Ke T, B = Tᵀ Kg T
  const A = new Float64Array(nr * nr), B = new Float64Array(nr * nr), ke = new Float64Array(64), kg = new Float64Array(64);
  const V = [0, 1, 4, 5], F = [2, 3, 6, 7];   // positions of v and φ in the element vector [v1 v1′ φ1 φ1′ v2 v2′ φ2 φ2′]
  const add = (g1: number, g2: number, a: number, b: number) => {
    const m1 = map[g1], m2 = map[g2];
    if (!m1 || !m2) return;
    const k = m1.j * nr + m2.j, f = m1.f * m2.f;
    A[k] += f * a;
    B[k] += f * b;
  };
  for (let e = 0; e < n; e++) {
    ke.fill(0); kg.fill(0);
    for (const [xi, w] of GAUSS) {
      const { H, H1, H2 } = hermite(xi, l), m = M((e + xi) * l), wl = w * l;
      for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) {
        ke[V[a] * 8 + V[b]] += wl * E * sec.Iz * H2[a] * H2[b];
        ke[F[a] * 8 + F[b]] += wl * (G * sec.It * H1[a] * H1[b] + E * sec.Iw * H2[a] * H2[b]);
        const cpl = wl * m * H2[a] * H[b];   // M v″ φ
        kg[V[a] * 8 + F[b]] += cpl;
        kg[F[b] * 8 + V[a]] += cpl;
        kg[F[a] * 8 + F[b]] += wl * q * zg * H[a] * H[b];
      }
    }
    for (let a = 0; a < 8; a++) for (let b = 0; b < 8; b++) add(4 * e + a, 4 * e + b, ke[a * 8 + b], kg[a * 8 + b]);
  }
  if (load === "point") { const k = 4 * (n / 2) + 2; add(k, k, 0, P * zg); }   // once, at the midspan node
  return { A, B, nr, map, nodes, shared, Mmax, n, L, ztop };
}

export function solveLtb(c: LtbCase): LtbResult | null {
  const { A, B, nr, map, nodes, shared, Mmax, n, L, ztop } = assembleLtb(c);
  const sol = bucklingEig(A, B, nr);
  if (!sol) return null;

  const v = new Float64Array(n + 1), dv = new Float64Array(n + 1), phi = new Float64Array(n + 1), dphi = new Float64Array(n + 1);
  const val = (g: number) => (map[g] ? map[g].f * sol.x[map[g].j] : 0);
  for (let k = 0; k <= n; k++) { v[k] = val(4 * k); dv[k] = val(4 * k + 1); phi[k] = val(4 * k + 2); dphi[k] = val(4 * k + 3); }
  let peak = 0, top = 0;
  for (let k = 0; k <= n; k++) {
    const ut = v[k] - ztop * phi[k], ub = v[k] + ztop * phi[k];
    peak = Math.max(peak, Math.abs(ut), Math.abs(ub));
    if (Math.abs(ut) > Math.abs(top)) top = ut;
  }
  const s = (top < 0 ? -1 : 1) / peak;   // the top flange swings towards +y
  for (const a of [v, dv, phi, dphi]) for (let k = 0; k <= n; k++) a[k] *= s;

  const Mcr = sol.lambda * Mmax, M0 = mcrUniform(c.sec, L);
  return { Mcr, M0, ratio: Mcr / M0, nodes, shared, mode: { v, dv, phi, dphi }, residual: sol.residual, n, L, ztop };
}

/** Lateral displacement and twist of the shear center at x, interpolated with the element's Hermite functions. */
export function modeAt(r: Pick<LtbResult, "mode" | "n" | "L">, x: number) {
  const l = r.L / r.n, e = Math.min(r.n - 1, Math.max(0, Math.floor(x / l))), { H } = hermite(x / l - e, l), m = r.mode;
  return {
    v: H[0] * m.v[e] + H[1] * m.dv[e] + H[2] * m.v[e + 1] + H[3] * m.dv[e + 1],
    phi: H[0] * m.phi[e] + H[1] * m.dphi[e] + H[2] * m.phi[e + 1] + H[3] * m.dphi[e + 1],
  };
}

export interface Check {
  cls: 1 | 2 | 3 | 4;
  W: number;                 // Wpl for class 1–2, Wel for class 3 (mm³)
  curve: "b" | "c"; alpha: number;
  lam: number; Phi: number; chi: number;
  MRd: number | null;        // Wy fy / γM0
  MbRd: number | null;       // χLT Wy fy / γM1
  short: boolean;            // λ̄LT ≤ 0.4: 6.3.2.2(4)
}

/** EN 1993-1-1:2005, 6.3.2.3 for rolled sections, recommended values: λ̄LT,0 = 0.4, β = 0.75; γM0 = γM1 = 1.0; f not used. */
export function ec3(sec: Pick<Section, "h" | "b" | "Wpl" | "Wel">, cls: 1 | 2 | 3 | 4, fy: number, Mcr: number): Check {
  const W = cls <= 2 ? sec.Wpl : sec.Wel, curve = sec.h / sec.b <= 2 ? "b" : "c", alpha = curve === "b" ? 0.34 : 0.49;
  const lam = Math.sqrt((W * fy) / Mcr), beta = 0.75, Phi = 0.5 * (1 + alpha * (lam - 0.4) + beta * lam * lam);
  const short = lam <= 0.4;
  const chi = short ? 1 : Math.min(1, 1 / (lam * lam), 1 / (Phi + Math.sqrt(Phi * Phi - beta * lam * lam)));
  const ok = cls < 4;
  return { cls, W, curve, alpha, lam, Phi, chi, MRd: ok ? W * fy : null, MbRd: ok ? chi * W * fy : null, short };
}

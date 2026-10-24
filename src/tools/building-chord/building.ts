// The building of the chord tool: a torsionally coupled shear building. Rigid floors with three DOFs each (ux, uy, θz at
// the plan center, which is also the center of mass); columns and braces as storey springs; the ground is fixed.
// Units: N, m, kg, s. Plan 12 × 12 m (2 × 2 bays of 6 m), column lines at x, y ∈ {−6, 0, 6}, storeys 3.6 m.
import { generalizedEig } from "../la/eig";
import { E, section } from "../steel/sections";

export type System = "moment" | "braced";
export interface Building { n: number; sys: System }
export interface Env { T: number; occ: number }
/** A column (storey, line 1–9) or the X-brace of a braced bay (storey, bay 1–4); d is the stiffness loss, 0–0.9. */
export type Damage = { kind: "c" | "b"; storey: number; at: number; d: number } | null;

export const H = 3.6, SPAN = 6, LX = 12, LY = 12, AREA = LX * LY;
export const GK = 4.0, QK = 3.0;                 // kN/m²: dead load (assumption), imposed load, offices
export const ALPHA = 0.0015, T0 = 15;            // stiffness change per °C, illustrative; reference temperature
export const ZETA = 0.02;                        // damping ratio of every mode, illustrative
export const REF: Env = { T: 15, occ: 0.3 };     // reference state: ψ2 = 0.3 for offices (EN 1990, Table A1.1)

/** Column line k (1–9) at x = −6 + 6·((k − 1) mod 3), y = −6 + 6·floor((k − 1) / 3): line 5 is the center. */
export const lineXY = (k: number): [number, number] => [-SPAN + SPAN * ((k - 1) % 3), -SPAN + SPAN * Math.floor((k - 1) / 3)];
/** Braced bays: 1 and 2 on the line y = 0 (x from −6 to 0, 0 to 6) acting in x; 3 and 4 on x = 0 (y from −6 to 0, 0 to 6) acting in y. */
export const BAYS = [{ dir: "x", at: [-3, 0] }, { dir: "x", at: [3, 0] }, { dir: "y", at: [0, -3] }, { dir: "y", at: [0, 3] }] as const;

export const columnSection = (storey: number) => section(storey <= 3 ? "HEB260" : "HEB220")!;
const LD = Math.hypot(SPAN, H), COS = SPAN / LD;
export const BRACE_A = (Math.PI / 4) * (139.7 ** 2 - (139.7 - 16) ** 2) * 1e-6;   // CHS 139.7 × 8, m²
/** One X-brace (two diagonals, both acting, linearized): 2 E A cos²θ / Ld. */
export const BRACE_K = (2 * E * 1e6 * BRACE_A * COS * COS) / LD;

/** Lateral springs of one storey: [x, y, kx, ky] per member, after damage and temperature. */
export function storeySprings(b: Building, storey: number, env: Env, dmg: Damage) {
  const s = columnSection(storey), t = 1 - ALPHA * (env.T - T0), out: [number, number, number, number][] = [];
  const k = (I: number) => (12 * E * 1e6 * I * 1e-12) / H ** 3;   // fixed-fixed column between rigid floors (beams assumed rigid)
  for (let line = 1; line <= 9; line++) {
    const f = dmg && dmg.kind === "c" && dmg.storey === storey && dmg.at === line ? 1 - dmg.d : 1, [x, y] = lineXY(line);
    out.push([x, y, f * t * k(s.Iz), f * t * k(s.Iy)]);   // webs parallel to y: y stiffness uses Iy, x uses Iz
  }
  if (b.sys === "braced") BAYS.forEach((bay, i) => {
    const f = dmg && dmg.kind === "b" && dmg.storey === storey && dmg.at === i + 1 ? 1 - dmg.d : 1, kb = f * t * BRACE_K;
    out.push([bay.at[0], bay.at[1], bay.dir === "x" ? kb : 0, bay.dir === "y" ? kb : 0]);
  });
  return out;
}

/** Storey stiffness Σ Tᵢᵀ diag(kx, ky) Tᵢ with Tᵢ = [[1, 0, −yᵢ], [0, 1, xᵢ]], row-major 3 × 3. */
export function storeyMatrix(springs: [number, number, number, number][]) {
  const K = new Float64Array(9);
  for (const [x, y, kx, ky] of springs) {
    const tx = [1, 0, -y], ty = [0, 1, x];
    for (let a = 0; a < 3; a++) for (let c = 0; c < 3; c++) K[3 * a + c] += kx * tx[a] * tx[c] + ky * ty[a] * ty[c];
  }
  return K;
}

/** Floor mass (kg) and rotational inertia: m = 1000 (gk + occ·qk) A / 9.81; the roof carries gk only. J = m (Lx² + Ly²) / 12. */
export function floorMass(floor: number, n: number, occ: number) {
  const m = (1000 * (GK + (floor < n ? occ * QK : 0)) * AREA) / 9.81;
  return { m, J: (m * (LX * LX + LY * LY)) / 12 };
}

export function matrices(b: Building, env: Env, dmg: Damage = null) {
  const N = 3 * b.n, K = new Float64Array(N * N), M = new Float64Array(N * N);
  for (let j = 1; j <= b.n; j++) {
    const Ks = storeyMatrix(storeySprings(b, j, env, dmg)), r = 3 * (j - 1), q = 3 * (j - 2);
    for (let a = 0; a < 3; a++) for (let c = 0; c < 3; c++) {
      K[(r + a) * N + r + c] += Ks[3 * a + c];
      if (j > 1) {
        K[(q + a) * N + q + c] += Ks[3 * a + c];
        K[(q + a) * N + r + c] -= Ks[3 * a + c];
        K[(r + a) * N + q + c] -= Ks[3 * a + c];
      }
    }
    const { m, J } = floorMass(j, b.n, env.occ);
    M[r * N + r] = m; M[(r + 1) * N + r + 1] = m; M[(r + 2) * N + r + 2] = J;
  }
  return { K, M, N };
}

export type ModeType = "X" | "Y" | "Twist";
export interface Mode { f: number; phi: Float64Array; type: ModeType; shares: [number, number, number] }

/** Natural frequencies (Hz) and mass-normalized shapes [ux, uy, θz] floor by floor, ascending. */
export function modes(b: Building, env: Env, dmg: Damage = null): { modes: Mode[]; M: Float64Array; N: number } {
  const { K, M, N } = matrices(b, env, dmg), { values, vectors } = generalizedEig(K, M, N);
  const out: Mode[] = [];
  for (let c = 0; c < N; c++) {
    const phi = Float64Array.from({ length: N }, (_, i) => vectors[i * N + c]);
    const sh: [number, number, number] = [0, 0, 0];   // modal kinetic energy by direction (sums to 1)
    for (let i = 0; i < N; i++) sh[i % 3] += M[i * N + i] * phi[i] ** 2;
    const k = sh.indexOf(Math.max(...sh));
    out.push({ f: Math.sqrt(Math.max(0, values[c])) / (2 * Math.PI), phi, type: (["X", "Y", "Twist"] as const)[k], shares: sh });
  }
  return { modes: out, M, N };
}

/** Mass-weighted MAC with a common mass matrix. */
export function mac(a: Float64Array, b: Float64Array, M: Float64Array, N: number) {
  let ab = 0, aa = 0, bb = 0;
  for (let i = 0; i < N; i++) { const m = M[i * N + i]; ab += a[i] * m * b[i]; aa += a[i] * m * a[i]; bb += b[i] * m * b[i]; }
  return (ab * ab) / (aa * bb);
}

/**
 * Match the current modes to the first `count` reference modes one to one, largest MAC first (with the reference mass
 * matrix). Returns, per reference mode, the current mode's index and the MAC; `uncertain` when a MAC is below 0.8.
 */
export function track(ref: { modes: Mode[]; M: Float64Array; N: number }, cur: Mode[], count: number) {
  const pairs: [number, number, number][] = [];
  for (let i = 0; i < count; i++) for (let j = 0; j < cur.length; j++) pairs.push([mac(ref.modes[i].phi, cur[j].phi, ref.M, ref.N), i, j]);
  pairs.sort((p, q) => q[0] - p[0]);
  const to = new Array<number>(count).fill(-1), m = new Array<number>(count).fill(0), used = new Set<number>();
  for (const [v, i, j] of pairs) if (to[i] < 0 && !used.has(j)) { to[i] = j; m[i] = v; used.add(j); }
  return { to, mac: m, uncertain: m.some((v) => v < 0.8) };
}

/** The member list for the damage picker. */
export function members(b: Building) {
  const out: { id: string; label: string; dmg: Omit<NonNullable<Damage>, "d"> }[] = [];
  const num = (v: number) => (v < 0 ? `−${-v}` : `${v}`);   // a true minus, as elsewhere on the site
  const where = (k: number) => { const [x, y] = lineXY(k); return k === 5 ? "center" : `x ${num(x)} m, y ${num(y)} m`; };
  for (let s = 1; s <= b.n; s++) {
    for (let k = 1; k <= 9; k++) out.push({ id: `c${s}-${k}`, label: `Column, storey ${s}, ${where(k)}`, dmg: { kind: "c", storey: s, at: k } });
    if (b.sys === "braced") BAYS.forEach((bay, i) => out.push({ id: `b${s}-${i + 1}`, label: `Brace, storey ${s}, ${bay.dir === "x" ? `line y = 0, x ${bay.at[0] < 0 ? "−6 to 0" : "0 to 6"} m` : `line x = 0, y ${bay.at[1] < 0 ? "−6 to 0" : "0 to 6"} m`}`, dmg: { kind: "b", storey: s, at: i + 1 } }));
  }
  return out;
}

/** Parse "c1-4" or "b2-3" against the building; null when empty or invalid. */
export function parseDamage(s: string, b: Building, d: number): Damage {
  const m = /^([cb])(\d+)-(\d+)$/.exec(s);
  if (!m) return null;
  const storey = Number(m[2]), at = Number(m[3]);
  if (storey < 1 || storey > b.n || at < 1 || (m[1] === "c" ? at > 9 : at > 4 || b.sys !== "braced")) return null;
  return { kind: m[1] as "c" | "b", storey, at, d };
}

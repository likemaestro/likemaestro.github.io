// Linear-elastic pin-jointed plane truss, steel circular hollow sections, member checks to EN 1993-1-1.
// Units inside: N, mm, MPa. Mass in kg, deflection in mm.

export const STEEL = { E: 210000, fy: 355, rho: 7.85e-6, gM0: 1, gM1: 1, alpha: 0.21 };   // S355; buckling curve a
export const EPS2 = 235 / STEEL.fy;   // ε² of EN 1993-1-1 Table 5.2

export interface Section { name: string; D: number; t: number; A: number; I: number }
// Hot-finished CHS, nominal outside diameter × wall (mm). Area and second moment from the nominal dimensions.
const SIZES: [number, number][] = [
  [48.3, 3.2], [60.3, 3.2], [76.1, 3.2], [88.9, 3.2], [114.3, 3.6], [88.9, 5], [139.7, 5], [114.3, 6.3],
  [168.3, 6.3], [139.7, 8], [193.7, 8], [168.3, 10], [219.1, 8], [219.1, 12.5], [273, 10], [323.9, 10],
];
export const SECTIONS: Section[] = SIZES.map(([D, t]) => {
  const d = D - 2 * t;
  return { name: `${D} × ${t}`, D, t, A: (Math.PI / 4) * (D * D - d * d), I: (Math.PI / 64) * (D ** 4 - d ** 4) };
}).sort((a, b) => a.A - b.A);

/** Flexural buckling reduction χ for relative slenderness λ̄ (EN 1993-1-1, 6.3.1.2). */
export function chi(lam: number, alpha = STEEL.alpha) {
  if (lam <= 0.2) return 1;
  const phi = 0.5 * (1 + alpha * (lam - 0.2) + lam * lam);
  return Math.min(1, 1 / (phi + Math.sqrt(phi * phi - lam * lam)));
}

export interface Layout {
  id: string;
  label: string;
  nodes: [number, number][];   // mm
  members: [number, number][];
  group: number[];             // design variable of each member
  fixed: number[];             // restrained degrees of freedom (2 per node: x, y)
  loaded: number[];            // nodes carrying the downward load
}

/** Members that mirror each other about x = xm share one design variable. */
function mirrorGroups(nodes: [number, number][], members: [number, number][], xm: number) {
  const at = (x: number, y: number) => nodes.findIndex(([a, b]) => Math.abs(a - x) < 1e-6 && Math.abs(b - y) < 1e-6);
  const mir = (i: number) => at(2 * xm - nodes[i][0], nodes[i][1]);
  const k = (i: number, j: number) => `${Math.min(i, j)}-${Math.max(i, j)}`;
  const ids = new Map<string, number>();
  return members.map(([i, j]) => {
    const a = k(i, j), b = k(mir(i), mir(j)), c = a < b ? a : b;
    if (!ids.has(c)) ids.set(c, ids.size);
    return ids.get(c)!;
  });
}

function bridge(panels = 6, a = 3000, h = 3000): Layout {
  const nodes: [number, number][] = [];
  for (let i = 0; i <= panels; i++) nodes.push([i * a, 0]);
  for (let i = 0; i <= panels; i++) nodes.push([i * a, h]);
  const T = (i: number) => panels + 1 + i, members: [number, number][] = [];
  for (let i = 0; i < panels; i++) members.push([i, i + 1]);
  for (let i = 0; i < panels; i++) members.push([T(i), T(i + 1)]);
  for (let i = 0; i <= panels; i++) members.push([i, T(i)]);
  for (let i = 0; i < panels; i++) members.push([i, T(i + 1)], [i + 1, T(i)]);
  return {
    id: "bridge", label: "Bridge truss", nodes, members, group: mirrorGroups(nodes, members, (panels * a) / 2),
    fixed: [0, 1, 2 * panels + 1], loaded: Array.from({ length: panels - 1 }, (_, i) => i + 1),
  };
}

function cantilever(b = 5000): Layout {
  // the classic 10-bar layout: two bays, supported on the left, loaded at the two lower free nodes
  const nodes: [number, number][] = [[2 * b, b], [2 * b, 0], [b, b], [b, 0], [0, b], [0, 0]];
  const members: [number, number][] = [[4, 2], [2, 0], [5, 3], [3, 1], [2, 3], [0, 1], [4, 3], [5, 2], [2, 1], [3, 0]];
  return { id: "cantilever", label: "10-bar cantilever", nodes, members, group: members.map((_, i) => i), fixed: [8, 9, 10, 11], loaded: [1, 3] };
}

export const LAYOUTS: Record<string, Layout> = { bridge: bridge(), cantilever: cantilever() };
export const genes = (L: Layout) => Math.max(...L.group) + 1;

export interface Analysis {
  mass: number; deflection: number; distinct: number;   // deflection: largest vertical displacement, mm
  N: number[];        // member forces, N, tension positive
  util: number[];     // N_Ed / N_Rd, buckling resistance for compression
  u: Float64Array;    // nodal displacements, mm
  cv: number;         // total overstress, sum of max(0, util - 1)
}

/** Analyse a design: x[g] is the section index of design variable g; P the load per loaded node in N. */
export function analyse(L: Layout, x: number[], P: number): Analysis {
  const nn = L.nodes.length, nd = 2 * nn, K = new Float64Array(nd * nd), F = new Float64Array(nd);
  const geo = L.members.map(([i, j]) => {
    const dx = L.nodes[j][0] - L.nodes[i][0], dy = L.nodes[j][1] - L.nodes[i][1], len = Math.hypot(dx, dy);
    return { i, j, len, c: dx / len, s: dy / len };
  });
  geo.forEach((m, e) => {
    const k = (STEEL.E * SECTIONS[x[L.group[e]]].A) / m.len, d = [2 * m.i, 2 * m.i + 1, 2 * m.j, 2 * m.j + 1];
    const v = [-m.c, -m.s, m.c, m.s];
    for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) K[d[a] * nd + d[b]] += k * v[a] * v[b];
  });
  for (const n of L.loaded) F[2 * n + 1] -= P;

  // solve on the free degrees of freedom by Cholesky
  const free = Array.from({ length: nd }, (_, i) => i).filter((i) => !L.fixed.includes(i)), n = free.length;
  const C = new Float64Array(n * n), y = new Float64Array(n);
  for (let r = 0; r < n; r++) for (let c = 0; c <= r; c++) {
    let s = K[free[r] * nd + free[c]];
    for (let k = 0; k < c; k++) s -= C[r * n + k] * C[c * n + k];
    C[r * n + c] = r === c ? Math.sqrt(s) : s / C[c * n + c];
  }
  for (let r = 0; r < n; r++) { let s = F[free[r]]; for (let k = 0; k < r; k++) s -= C[r * n + k] * y[k]; y[r] = s / C[r * n + r]; }
  for (let r = n - 1; r >= 0; r--) { let s = y[r]; for (let k = r + 1; k < n; k++) s -= C[k * n + r] * y[k]; y[r] = s / C[r * n + r]; }
  const u = new Float64Array(nd);
  free.forEach((d, r) => { u[d] = y[r]; });

  let mass = 0, cv = 0, deflection = 0;
  const N: number[] = [], util: number[] = [];
  geo.forEach((m, e) => {
    const sec = SECTIONS[x[L.group[e]]], { A, I } = sec;
    const f = ((STEEL.E * A) / m.len) * (m.c * (u[2 * m.j] - u[2 * m.i]) + m.s * (u[2 * m.j + 1] - u[2 * m.i + 1]));
    const Ncr = (Math.PI ** 2 * STEEL.E * I) / m.len ** 2, lam = Math.sqrt((A * STEEL.fy) / Ncr);
    const r = f >= 0 ? f / ((A * STEEL.fy) / STEEL.gM0) : -f / ((chi(lam) * A * STEEL.fy) / STEEL.gM1);
    N.push(f); util.push(r);
    cv += Math.max(0, r - 1);
    mass += STEEL.rho * A * m.len;
  });
  for (let k = 0; k < nn; k++) deflection = Math.max(deflection, Math.abs(u[2 * k + 1]));   // vertical
  return { mass, deflection, distinct: new Set(x).size, N, util, u, cv };
}

/** Bounds for normalizing the objectives, fixed per layout and load so hypervolumes compare across runs:
 *  the lightest and heaviest designs bound the mass, the stiffest and most flexible bound the deflection. */
export function bounds(L: Layout, P: number) {
  const g = genes(L), lo = analyse(L, new Array(g).fill(0), P), hi = analyse(L, new Array(g).fill(SECTIONS.length - 1), P);
  return { lo: [lo.mass, hi.deflection, 1], hi: [hi.mass, lo.deflection, Math.min(g, SECTIONS.length) + 1] };
}

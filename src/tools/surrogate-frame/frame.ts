// A six-storey steel moment frame, the "expensive model" of the surrogate tool: geometry, loads, a linear 3D frame
// analysis with rigid floor diaphragms, EN 1990 combinations, sway amplification from Horne's αcr, and simplified member
// screens. A teaching model: one wind direction, simplified wind and member checks, no connections. Units: N, mm.
//
// Global axes X, Y horizontal, Z up. Member local axes (ex, ey, ez), right-handed, Iy about local y and Iz about local z:
// columns (+Z, +X, +Y), so sway in Y bends them about their strong axis; X-beams (+X, +Y, +Z); Y-beams (+Y, −X, +Z).
// Floors are rigid in their plane: ux = UX − (y − yc) ΘZ and uy = UY + (x − xc) ΘZ for every floor node, with the
// master (UX, UY, ΘZ) at the floor's center; uz, rx, ry and rz stay independent.
import { backward, cholesky, forward } from "../la/dense";
import { E, G, RHO, section, type Section } from "../steel/sections";

export const COLUMNS = ["HEB200", "HEB220", "HEB240", "HEB260", "HEB280", "HEB300", "HEB320", "HEB340", "HEB360", "HEB400", "HEB450", "HEB500"];
export const BEAMS = ["IPE270", "IPE300", "IPE330", "IPE360", "IPE400", "IPE450", "IPE500", "IPE550", "IPE600"];
export const FY = 355, GM0 = 1, GM1 = 1;   // S355, recommended partial factors (an assumption of the tool)
const GRAV = RHO * 9.81;                  // steel weight, N/mm³

export interface Building { nx: number; ny: number; sx: number; sy: number; h: number; storeys: number; lower: number }
/** 3 bays of 6.0 m in x, 2 bays of 7.5 m in y, 6 storeys of 3.6 m; columns change size above storey 3. */
export const BUILDING: Building = { nx: 3, ny: 2, sx: 6000, sy: 7500, h: 3600, storeys: 6, lower: 3 };

export interface Loads { gk: number; qk: number; qp: number }   // kN/m²: dead, imposed (category B), peak velocity pressure
export const LOADS: Loads = { gk: 4.0, qk: 3.0, qp: 0.9 };
export const CP_NET = 1.3;   // simplified net pressure coefficient, windward + leeward (after EN 1991-1-4, Table 7.1)

export interface Design { cL: number; cU: number; bm: number }   // catalog indices: lower columns, upper columns, beams
export type Kind = "col" | "bx" | "by";
export interface Member { i: number; j: number; kind: Kind; group: 0 | 1 | 2; level: number }   // group: cL, cU, beams

/** Element properties; tests may scale them. */
export interface Props { A: number; Iy: number; Iz: number; It: number }

/** Node coordinates and members: nodes level by level, grid index ix + (nx + 1)·iy. */
export function geometry(b: Building = BUILDING) {
  const per = (b.nx + 1) * (b.ny + 1), nodes: [number, number, number][] = [], members: Member[] = [];
  for (let k = 0; k <= b.storeys; k++) for (let iy = 0; iy <= b.ny; iy++) for (let ix = 0; ix <= b.nx; ix++) nodes.push([ix * b.sx, iy * b.sy, k * b.h]);
  const id = (k: number, ix: number, iy: number) => k * per + ix + (b.nx + 1) * iy;
  for (let k = 0; k < b.storeys; k++) for (let iy = 0; iy <= b.ny; iy++) for (let ix = 0; ix <= b.nx; ix++)
    members.push({ i: id(k, ix, iy), j: id(k + 1, ix, iy), kind: "col", group: k < b.lower ? 0 : 1, level: k + 1 });
  for (let k = 1; k <= b.storeys; k++) {
    for (let iy = 0; iy <= b.ny; iy++) for (let ix = 0; ix < b.nx; ix++) members.push({ i: id(k, ix, iy), j: id(k, ix + 1, iy), kind: "bx", group: 2, level: k });
    for (let ix = 0; ix <= b.nx; ix++) for (let iy = 0; iy < b.ny; iy++) members.push({ i: id(k, ix, iy), j: id(k, ix, iy + 1), kind: "by", group: 2, level: k });
  }
  return { nodes, members, per, center: [(b.nx * b.sx) / 2, (b.ny * b.sy) / 2] as const };
}

type V3 = [number, number, number];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/** Rows ex, ey, ez of the rotation from global to local, by member kind; ex always runs from node i to node j. */
export function triad(kind: Kind, from: V3, to: V3): [V3, V3, V3] {
  const d = sub(to, from), L = Math.hypot(...d), ex: V3 = [d[0] / L, d[1] / L, d[2] / L];
  // the second axis by kind (for columns +X, for X-beams +Y, for Y-beams −X), flipped with ex so the web stays put
  const ey: V3 = kind === "col" ? [1, 0, 0] : kind === "bx" ? [0, ex[0], 0] : [-ex[1], 0, 0];
  return [ex, ey, cross(ex, ey)];
}

/** Local 12 × 12 stiffness, DOFs [ux uy uz rx ry rz] at each end (3D Euler–Bernoulli). */
export function localStiffness(p: Props, L: number) {
  const k = new Float64Array(144), set = (i: number, j: number, v: number) => { k[i * 12 + j] += v; if (i !== j) k[j * 12 + i] += v; };
  const ea = (E * p.A) / L, gt = (G * p.It) / L;
  set(0, 0, ea); set(6, 6, ea); set(0, 6, -ea);
  set(3, 3, gt); set(9, 9, gt); set(3, 9, -gt);
  const bend = (I: number, [a, b, c, d]: number[], s: number) => {   // s = +1 for (uy, rz), −1 for (uz, ry)
    const f = (E * I) / L ** 3;
    set(a, a, 12 * f); set(c, c, 12 * f); set(a, c, -12 * f);
    set(a, b, s * 6 * L * f); set(a, d, s * 6 * L * f); set(c, b, -s * 6 * L * f); set(c, d, -s * 6 * L * f);
    set(b, b, 4 * L * L * f); set(d, d, 4 * L * L * f); set(b, d, 2 * L * L * f);
  };
  bend(p.Iz, [1, 5, 7, 11], 1);
  bend(p.Iy, [2, 4, 8, 10], -1);
  return k;
}

/** Global element stiffness Tᵀ k T with T = diag(R, R, R, R). */
export function globalStiffness(k: Float64Array, R: [V3, V3, V3]) {
  const out = new Float64Array(144);
  for (let I = 0; I < 4; I++) for (let J = 0; J < 4; J++)
    for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) {
      let s = 0;
      for (let p = 0; p < 3; p++) for (let q = 0; q < 3; q++) s += R[p][a] * k[(3 * I + p) * 12 + 3 * J + q] * R[q][b];
      out[(3 * I + a) * 12 + 3 * J + b] = s;
    }
  return out;
}

/** Consistent nodal loads (global) of a uniform global load q (N/mm) on a member of length L. */
export function consistentLoads(q: V3, ex: V3, L: number) {
  const m = cross(ex, q).map((v) => (v * L * L) / 12), f = new Float64Array(12);
  for (let a = 0; a < 3; a++) { f[a] = f[6 + a] = (q[a] * L) / 2; f[3 + a] = m[a]; f[9 + a] = -m[a]; }
  return f;
}

/**
 * Largest internal forces along a member from its end displacements (global, 12) and its uniform load (global): the exact
 * field for a uniform load is the Hermite interpolation plus the fixed-end particular solution.
 */
export function memberForces(p: Props, L: number, R: [V3, V3, V3], ue: ArrayLike<number>, q: V3) {
  const u = new Float64Array(12);
  for (let I = 0; I < 4; I++) for (let a = 0; a < 3; a++) u[3 * I + a] = R[a][0] * ue[3 * I] + R[a][1] * ue[3 * I + 1] + R[a][2] * ue[3 * I + 2];
  const ql = R.map((r) => r[0] * q[0] + r[1] * q[1] + r[2] * q[2]);
  const N0 = (E * p.A * (u[6] - u[0])) / L + (ql[0] * L) / 2, N1 = N0 - ql[0] * L;   // tension positive
  // bending in one plane: d = [w1, w′1, w2, w′2], curvature w″ = Hermite″·d + q (L² − 6Lx + 6x²) / (12 EI)
  const plane = (I: number, d: number[], qn: number) => {
    const c0 = (-6 * d[0]) / L ** 2 - (4 * d[1]) / L + (6 * d[2]) / L ** 2 - (2 * d[3]) / L;   // Hermite″ at x = 0
    const c1 = (12 * d[0]) / L ** 3 + (6 * d[1]) / L ** 2 - (12 * d[2]) / L ** 3 + (6 * d[3]) / L ** 2;   // Hermite‴
    const M = (x: number) => E * I * (c0 + c1 * x) + (qn * (L * L - 6 * L * x + 6 * x * x)) / 12;
    let m = Math.max(Math.abs(M(0)), Math.abs(M(L)));
    if (qn !== 0) { const xs = L / 2 - (E * I * c1) / qn; if (xs > 0 && xs < L) m = Math.max(m, Math.abs(M(xs))); }
    const V = (x: number) => Math.abs(E * I * c1 + qn * (x - L / 2));
    return { M: m, V: Math.max(V(0), V(L)) };
  };
  const z = plane(p.Iy, [u[2], -u[4], u[8], -u[10]], ql[2]);   // x–z plane: slope = −ry, about local y
  const y = plane(p.Iz, [u[1], u[5], u[7], u[11]], ql[1]);     // x–y plane: slope = +rz, about local z
  return { N0, N1, My: z.M, Vz: z.V, Mz: y.M, Vy: y.V, T: (G * p.It * Math.abs(u[9] - u[3])) / L };
}

/** Flexural buckling reduction (EN 1993-1-1, 6.3.1.2). */
export function chi(lam: number, alpha: number) {
  if (lam <= 0.2) return 1;
  const phi = 0.5 * (1 + alpha * (lam - 0.2) + lam * lam);
  return Math.min(1, 1 / (phi + Math.sqrt(phi * phi - lam * lam)));
}

/** Equivalent sway imperfection φ = φ0 αh αm (EN 1993-1-1, 5.3.2(3)): h the height in m, m the columns in a row. */
export function swayImperfection(hm: number, m: number) {
  const ah = Math.min(1, Math.max(2 / 3, 2 / Math.sqrt(hm))), am = Math.sqrt(0.5 * (1 + 1 / m));
  return (1 / 200) * ah * am;
}

export interface Model {
  b: Building; nodes: [number, number, number][]; members: Member[]; per: number;
  map: { j: number; f: number }[][];   // global DOF → reduced DOFs with factors; [] when fixed
  n: number; bw: number; master: (level: number) => number;
  geo: { L: number; R: [V3, V3, V3] }[];
}

/** Supports (fixed bases), diaphragms and the reduced DOF numbering, level by level: masters, then 4 DOFs per node. */
export function buildModel(b: Building = BUILDING): Model {
  const { nodes, members, per, center } = geometry(b), map: { j: number; f: number }[][] = [];
  let n = 0;
  const masterAt: number[] = [];
  for (let k = 0; k <= b.storeys; k++) {
    if (k > 0) { masterAt[k] = n; n += 3; }
    for (let g = 0; g < per; g++) {
      const node = k * per + g, [x, y] = nodes[node];
      for (let a = 0; a < 6; a++) map[6 * node + a] = [];
      if (k === 0) continue;   // fixed base
      const m = masterAt[k];
      map[6 * node] = [{ j: m, f: 1 }, { j: m + 2, f: -(y - center[1]) }];
      map[6 * node + 1] = [{ j: m + 1, f: 1 }, { j: m + 2, f: x - center[0] }];
      for (const a of [2, 3, 4, 5]) map[6 * node + a] = [{ j: n++, f: 1 }];
    }
  }
  const geo = members.map((m) => {
    const R = triad(m.kind, nodes[m.i], nodes[m.j]);
    return { L: Math.hypot(...sub(nodes[m.j], nodes[m.i])), R };
  });
  let bw = 0;
  for (const m of members) {
    const js = [m.i, m.j].flatMap((nd) => Array.from({ length: 6 }, (_, a) => map[6 * nd + a]).flat().map((e) => e.j));
    if (js.length) bw = Math.max(bw, Math.max(...js) - Math.min(...js));
  }
  return { b, nodes, members, per, map, n, bw, master: (k) => masterAt[k], geo };
}

export const MODEL = buildModel();

export const props = (s: Section): Props => ({ A: s.A, Iy: s.Iy, Iz: s.Iz, It: s.It });
export const sectionsOf = (d: Design) => [section(COLUMNS[d.cL])!, section(COLUMNS[d.cU])!, section(BEAMS[d.bm])!] as const;

export interface Result {
  drift: number; uCL: number; uCU: number; uB: number; acr: number; mass: number;   // mass in t
  acrY: number; acrX: number; amp: [number, number];   // αcr in y (ULS min) and x; sway amplification per ULS combination
  storeyDrift: number[];                               // SLS interstorey drift ratios, storey 1 up
  util: Float64Array;                                  // per member, the larger ULS value
  disp: Float64Array;                                  // SLS (characteristic wind) node displacements, 6 per node
}

/** Loads, assembly and the linear solve. Cases: 0 G, 1 Q, 2 W (y), 3–4 sway imperfection forces in y from G and Q,
 *  5–6 the same in x. Returns the reduced (Uq) and global (U) displacements of every case. */
export function solveCases(d: Design, loads: Loads = LOADS, model: Model = MODEL, override?: (m: Member) => Props | undefined) {
  const { b, nodes, members, per, map, n, bw, geo } = model, secs = sectionsOf(d);
  const P = members.map((m) => override?.(m) ?? props(secs[m.group]));
  const A = new Float64Array(n * n), NC = 7, F = Array.from({ length: NC }, () => new Float64Array(n));
  const add = (gdof: number, rhs: Float64Array, v: number) => { for (const e of map[gdof]) rhs[e.j] += e.f * v; };

  // distributed loads per member and case (global, N/mm): self-weight on every member; slab line loads on Y-beams
  const qG: V3[] = [], qQ: V3[] = [];
  const width = (ix: number) => (ix === 0 || ix === b.nx ? b.sx / 2 : b.sx);   // one-way slab spanning in x
  members.forEach((m, e) => {
    let g = GRAV * secs[m.group].A, q = 0;
    if (m.kind === "by") {
      const ix = Math.round(nodes[m.i][0] / b.sx), w = width(ix);
      g += loads.gk * 1e-3 * w;
      if (m.level < b.storeys) q = loads.qk * 1e-3 * w;   // the roof carries gk only
    }
    qG.push([0, 0, -g]); qQ.push([0, 0, -q]);
  });

  // assembly straight into the reduced system
  members.forEach((m, e) => {
    const { L, R } = geo[e], kg = globalStiffness(localStiffness(P[e], L), R);
    const dofs = [...Array.from({ length: 6 }, (_, a) => 6 * m.i + a), ...Array.from({ length: 6 }, (_, a) => 6 * m.j + a)];
    for (let a = 0; a < 12; a++) for (const ea of map[dofs[a]]) for (let c = 0; c < 12; c++) {
      const v = kg[a * 12 + c];
      if (v !== 0) for (const ec of map[dofs[c]]) A[ea.j * n + ec.j] += ea.f * ec.f * v;
    }
    const fg = consistentLoads(qG[e], geo[e].R[0], L), fq = consistentLoads(qQ[e], geo[e].R[0], L);
    for (let a = 0; a < 12; a++) { add(dofs[a], F[0], fg[a]); add(dofs[a], F[1], fq[a]); }
  });

  // vertical load arriving at each level (for the imperfection forces), wind, and the imperfection forces
  const VG = new Array<number>(b.storeys + 1).fill(0), VQ = VG.slice();
  members.forEach((m, e) => {
    const fg = consistentLoads(qG[e], geo[e].R[0], geo[e].L), fq = consistentLoads(qQ[e], geo[e].R[0], geo[e].L);
    for (const [nd, o] of [[m.i, 0], [m.j, 6]] as const) {
      const k = Math.floor(nd / per);
      VG[k] -= fg[o + 2]; VQ[k] -= fq[o + 2];
    }
  });
  const phi = swayImperfection((b.storeys * b.h) / 1000, b.ny + 1), face = b.nx * b.sx;
  for (let k = 1; k <= b.storeys; k++) {
    const mk = model.master(k), hk = k < b.storeys ? b.h : b.h / 2;
    F[2][mk + 1] += CP_NET * loads.qp * 1e-3 * face * hk;   // Fj = cp,net qp b hj on the long face, b = 18 m
    F[3][mk + 1] += phi * VG[k]; F[4][mk + 1] += phi * VQ[k];
    F[5][mk] += phi * VG[k]; F[6][mk] += phi * VQ[k];
  }

  // solve all cases with one banded Cholesky factorization
  const L = cholesky(A, n, bw);
  const Uq = F.map((f) => backward(L, forward(L, Float64Array.from(f), n, bw), n, bw));   // F is kept: Horne reads it
  const expand = (q: Float64Array) => {   // reduced → global node DOFs
    const u = new Float64Array(6 * nodes.length);
    for (let g = 0; g < u.length; g++) for (const e of map[g]) u[g] += e.f * q[e.j];
    return u;
  };
  const U = Uq.map(expand);
  const lin = (c: number[]) => { const u = new Float64Array(U[0].length); c.forEach((w, k) => { if (w) for (let i = 0; i < u.length; i++) u[i] += w * U[k][i]; }); return u; };

  return { P, qG, qQ, F, Uq, U, lin, secs };
}

/** Analyse one design. ULS1 = 1.35 G + 1.5 Q + 1.5·0.6 W; ULS2 = 1.35 G + 1.5·0.7 Q + 1.5 W (EN 1990, 6.10, recommended
 *  values), each with the sway imperfection forces of its vertical load; SLS = W. */
export function analyse(d: Design, loads: Loads = LOADS, model: Model = MODEL, override?: (m: Member) => Props | undefined): Result {
  const { b, members, geo } = model, { P, qG, qQ, F, Uq, U, lin, secs } = solveCases(d, loads, model, override);

  // storey drifts and Horne's αcr: (HEd / VEd)(h / δH,Ed), VEd from the column axial forces at the storey bottom
  const masterU = (q: Float64Array, a: 0 | 1) => Array.from({ length: b.storeys + 1 }, (_, k) => (k ? q[model.master(k) + a] : 0));
  const combos = [{ g: [1.35, 1.5], w: 0.9 }, { g: [1.35, 1.05], w: 1.5 }];
  const colForces = (u: Float64Array, gq: number[]) => members.map((m, e) => {
    if (m.kind !== "col") return null;
    const ue = [...u.subarray(6 * m.i, 6 * m.i + 6), ...u.subarray(6 * m.j, 6 * m.j + 6)];
    const q: V3 = [0, 0, gq[0] * qG[e][2] + gq[1] * qQ[e][2]];
    return memberForces(P[e], geo[e].L, geo[e].R, ue, q);
  });
  const horne = (h: Float64Array, V: number[], dir: 0 | 1, H: number[]) => {
    const uh = masterU(h, dir);
    let a = Infinity;
    for (let s = 1; s <= b.storeys; s++) {
      const delta = Math.abs(uh[s] - uh[s - 1]);
      if (delta > 0) a = Math.min(a, ((H[s] / V[s]) * b.h) / delta);
    }
    return a;
  };
  let acrY = Infinity, acrX = Infinity;
  const amp: [number, number] = [1, 1];
  const ulsU: Float64Array[] = [];
  combos.forEach((c, ci) => {
    const [gG, gQ] = c.g;
    const grav = lin([gG, gQ]), hy = lin([0, 0, c.w, gG, gQ]);
    const hyq = Uq[2].map((v, i) => c.w * v + gG * Uq[3][i] + gQ * Uq[4][i]), hxq = Uq[5].map((v, i) => gG * v + gQ * Uq[6][i]);
    // storey shear from the applied horizontal forces; storey vertical load from the column forces under gravity
    const Hy = new Array<number>(b.storeys + 1).fill(0), Hx = Hy.slice(), V = Hy.slice();
    for (let k = b.storeys; k >= 1; k--) {
      const mk = model.master(k);
      Hy[k] = (k < b.storeys ? Hy[k + 1] : 0) + c.w * F[2][mk + 1] + gG * F[3][mk + 1] + gQ * F[4][mk + 1];
      Hx[k] = (k < b.storeys ? Hx[k + 1] : 0) + gG * F[5][mk] + gQ * F[6][mk];
    }
    colForces(grav, c.g).forEach((f, e) => { if (f) V[members[e].level] += -f.N0; });
    const ay = horne(hyq, V, 1, Hy), ax = horne(hxq, V, 0, Hx);
    acrY = Math.min(acrY, ay); acrX = Math.min(acrX, ax);
    amp[ci] = ay >= 10 ? 1 : ay >= 3 ? 1 / (1 - 1 / ay) : 1;   // below 3 the design is out of scope; no amplification
    ulsU.push(grav.map((v, i) => v + amp[ci] * hy[i]));
  });

  // member utilizations, the larger of the two ULS combinations
  const util = new Float64Array(members.length), Lcr = b.h;
  members.forEach((m, e) => {
    const s = secs[m.group], p = P[e], { L, R } = geo[e];
    for (const [ci, u] of ulsU.entries()) {
      const [gG, gQ] = combos[ci].g, q: V3 = [0, 0, gG * qG[e][2] + gQ * qQ[e][2]];
      const ue = [...u.subarray(6 * m.i, 6 * m.i + 6), ...u.subarray(6 * m.j, 6 * m.j + 6)];
      const f = memberForces(p, L, R, ue, q);
      let r: number;
      if (m.kind === "col") {
        // simplified screen: N / (χmin Npl) + My / Mpl,y + Mz / Mpl,z; buckling length = storey height, y-y curve b, z-z curve c
        const Npl = p.A * FY, Nc = Math.max(0, -Math.min(f.N0, f.N1)), Nt = Math.max(0, f.N0, f.N1);
        const lam = (I: number) => Math.sqrt(Npl / ((Math.PI ** 2 * E * I) / (Lcr * Lcr)));
        const chiMin = Math.min(chi(lam(p.Iy), 0.34), chi(lam(p.Iz), 0.49));
        r = Math.max(Nc / ((chiMin * Npl) / GM1), Nt / (Npl / GM0)) + f.My / ((s.Wpl * FY) / GM0) + f.Mz / ((s.Wplz * FY) / GM0);
      } else {
        r = Math.max(f.My / ((s.Wpl * FY) / GM0), f.Vz / ((s.Avz * FY) / Math.sqrt(3) / GM0));   // bending and shear, separately
      }
      util[e] = Math.max(util[e], r);
    }
  });
  const groupMax = (g: number) => members.reduce((a, m, e) => (m.group === g ? Math.max(a, util[e]) : a), 0);

  // SLS drift under characteristic wind
  const uy = masterU(Uq[2], 1), storeyDrift = Array.from({ length: b.storeys }, (_, s) => Math.abs(uy[s + 1] - uy[s]) / b.h);
  const mass = members.reduce((a, m, e) => a + secs[m.group].A * geo[e].L * RHO, 0) / 1000;
  return {
    drift: Math.max(...storeyDrift), uCL: groupMax(0), uCU: groupMax(1), uB: groupMax(2),
    acr: Math.min(acrY, acrX), acrY, acrX, amp, mass, storeyDrift, util, disp: U[2],
  };
}

/** Steel mass in t, without an analysis: Σ ρ A L. */
export function massOf(d: Design, model: Model = MODEL) {
  const secs = sectionsOf(d);
  return model.members.reduce((a, m, e) => a + secs[m.group].A * model.geo[e].L * RHO, 0) / 1000;
}

export const feasible = (r: Pick<Result, "drift" | "uCL" | "uCU" | "uB" | "acr">, lim: number) =>
  r.drift <= 1 / lim && r.uCL <= 1 && r.uCU <= 1 && r.uB <= 1 && r.acr >= 3;

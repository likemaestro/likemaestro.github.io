import { lu, luSolve } from "../la/dense";
import { E, section } from "../steel/sections";
import {
  analyse, BUILDING, buildModel, chi, consistentLoads, CP_NET, feasible, geometry, globalStiffness, LOADS, localStiffness,
  memberForces, MODEL, solveCases, swayImperfection, triad, type Building, type Member, type Model, type Props,
} from "./frame";

const rel = (a: number, b: number) => Math.abs(a / b - 1);
const DEFAULT = { cL: 5, cU: 2, bm: 4 };   // HEB 300, HEB 240, IPE 400

test("a simply supported beam under a uniform load: 5wL⁴/(384EI) and wL²/8", () => {
  // four elements along X, pinned at x = 0 (and held in torsion), on a roller at x = L; load w downwards
  const s = section("IPE400")!, p: Props = { A: s.A, Iy: s.Iy, Iz: s.Iz, It: s.It }, Lb = 6000, ne = 4, l = Lb / ne, w = 20, nd = 6 * (ne + 1);
  const K = new Float64Array(nd * nd), f = new Float64Array(nd), R = triad("bx", [0, 0, 0], [l, 0, 0]);
  for (let e = 0; e < ne; e++) {
    const kg = globalStiffness(localStiffness(p, l), R), fe = consistentLoads([0, 0, -w], R[0], l);
    for (let a = 0; a < 12; a++) { f[6 * e + a] += fe[a]; for (let b = 0; b < 12; b++) K[(6 * e + a) * nd + 6 * e + b] += kg[a * 12 + b]; }
  }
  const fixed = [0, 1, 2, 3, 6 * ne + 1, 6 * ne + 2], free = Array.from({ length: nd }, (_, i) => i).filter((i) => !fixed.includes(i)), m = free.length;
  const Kr = Float64Array.from({ length: m * m }, (_, k) => K[free[Math.floor(k / m)] * nd + free[k % m]]);
  const ur = luSolve(lu(Kr, m), Float64Array.from(free, (i) => f[i])), u = new Float64Array(nd);
  free.forEach((g, k) => { u[g] = ur[k]; });
  expect(rel(-u[6 * 2 + 2], (5 * w * Lb ** 4) / (384 * E * s.Iy))).toBeLessThan(1e-9);   // exact at the nodes
  // the moment at midspan, recovered inside the element next to it, and the end shear wL/2
  const f2 = memberForces(p, l, R, u.subarray(6, 18), [0, 0, -w]), f3 = memberForces(p, l, R, u.subarray(12, 24), [0, 0, -w]);
  expect(rel(Math.max(f2.My, f3.My), (w * Lb * Lb) / 8)).toBeLessThan(1e-9);
  expect(rel(memberForces(p, l, R, u.subarray(0, 12), [0, 0, -w]).Vz, (w * Lb) / 2)).toBeLessThan(1e-9);
});

const ONE: Building = { nx: 1, ny: 1, sx: 6000, sy: 7500, h: 3600, storeys: 1, lower: 1 };
// rigid beams and axially rigid columns: each column is fixed at the base and held against rotation at the top
const rigid = (m: Member): Props | undefined => {
  const s = section(m.kind === "col" ? "HEB300" : "IPE400")!;
  return m.kind === "col" ? { A: s.A * 1e6, Iy: s.Iy, Iz: s.Iz, It: s.It } : { A: s.A, Iy: s.Iy * 1e6, Iz: s.Iz * 1e6, It: s.It };
};

test("portal: four columns with rigid beams sway H h³ / (4 · 12 E I)", () => {
  // one storey: the roof force is cp,net qp b h/2; four HEB 300 bending about their strong axis
  const model = buildModel(ONE), loads = { gk: 0, qk: 0, qp: 0.9 }, r = analyse({ cL: 5, cU: 5, bm: 4 }, loads, model, rigid);
  const H = CP_NET * 0.9e-3 * 6000 * 1800, I = section("HEB300")!.Iy;
  expect(rel(r.storeyDrift[0] * 3600, (H * 3600 ** 3) / (48 * E * I))).toBeLessThan(0.005);   // spec: 0.5 %
});

test("Horne's αcr for one storey equals (H/V)(h/δ) = 48 E I / (V h²) by hand, in both directions", () => {
  // HAND CALCULATION. V = 1.35 × (gk · 6 × 7.5 m + steel self-weight); the roof carries no imposed load.
  const model = buildModel(ONE), r = analyse({ cL: 5, cU: 5, bm: 4 }, LOADS, model, rigid);
  const g = 7850e-9 * 9.81, col = section("HEB300")!, beam = section("IPE400")!;
  const V = 1.35 * (4e-3 * 6000 * 7500 + g * (4 * col.A * 3600 + 2 * beam.A * 6000 + 2 * beam.A * 7500));
  // 1e-5: the "rigid" members are 10⁶ times stiffer, not infinitely stiff
  expect(rel(r.acrY, (48 * E * col.Iy) / (V * 3600 ** 2))).toBeLessThan(1e-5);
  expect(rel(r.acrX, (48 * E * col.Iz) / (V * 3600 ** 2))).toBeLessThan(1e-5);
  expect(r.acr).toBe(Math.min(r.acrX, r.acrY));
});

test("rigid floors: the master mapping equals explicit multi-point constraints on the same stiffness", () => {
  // two storeys, one bay each way. Unknowns: all node DOFs plus three masters per floor; constraints:
  // ux − UX + (y − yc) ΘZ = 0 and uy − UY − (x − xc) ΘZ = 0 at every floor node; bases fixed. Solve with multipliers.
  const b: Building = { nx: 1, ny: 1, sx: 6000, sy: 7500, h: 3600, storeys: 2, lower: 1 }, model = buildModel(b);
  const { nodes, members, center } = geometry(b), nn = nodes.length, per = model.per, nm = 3 * b.storeys, N = 6 * nn + nm;
  const s = section("HEB300")!, beam = section("IPE400")!;
  const K = new Float64Array(N * N);
  members.forEach((m, e) => {
    const p = m.kind === "col" ? s : beam, kg = globalStiffness(localStiffness(p, model.geo[e].L), model.geo[e].R);
    const dofs = [...Array.from({ length: 6 }, (_, a) => 6 * m.i + a), ...Array.from({ length: 6 }, (_, a) => 6 * m.j + a)];
    for (let a = 0; a < 12; a++) for (let c = 0; c < 12; c++) K[dofs[a] * N + dofs[c]] += kg[a * 12 + c];
  });
  const f = new Float64Array(N);
  f[6 * nn + 1] = 50e3; f[6 * nn + 3] = 30e3; f[6 * nn + 5] = 4e8;   // master forces: UY floor 1, UX floor 2, torque floor 2
  f[6 * (per + 1) + 2] = -80e3; f[6 * (2 * per + 2) + 4] = 2e7;      // a vertical force and a moment at two nodes
  const rows: [number, number][][] = [];
  for (let k = 1; k <= b.storeys; k++) for (let g = 0; g < per; g++) {
    const nd = k * per + g, [x, y] = nodes[nd], m0 = 6 * nn + 3 * (k - 1);
    rows.push([[6 * nd, 1], [m0, -1], [m0 + 2, y - center[1]]], [[6 * nd + 1, 1], [m0 + 1, -1], [m0 + 2, -(x - center[0])]]);
  }
  const free = Array.from({ length: N }, (_, i) => i).filter((i) => i >= 6 * per), nf = free.length, nc = rows.length, S = nf + nc;
  const Aug = new Float64Array(S * S), rhs = new Float64Array(S), pos = new Map(free.map((g, k) => [g, k]));
  for (let a = 0; a < nf; a++) { rhs[a] = f[free[a]]; for (let c = 0; c < nf; c++) Aug[a * S + c] = K[free[a] * N + free[c]]; }
  rows.forEach((r, k) => r.forEach(([g, v]) => { const c = pos.get(g)!; Aug[(nf + k) * S + c] = v; Aug[c * S + nf + k] = v; }));
  const x = luSolve(lu(Aug, S), rhs), uMPC = new Float64Array(N);
  free.forEach((g, k) => { uMPC[g] = x[k]; });

  // the same with the model's mapping u = T q, solving Tᵀ K T q = Tᵀ f
  const n = model.n, A = new Float64Array(n * n), r = new Float64Array(n);
  const T = (g: number) => (g < 6 * nn ? model.map[g] : [{ j: model.master(Math.floor((g - 6 * nn) / 3) + 1) + ((g - 6 * nn) % 3), f: 1 }]);
  for (let a = 0; a < N; a++) for (const ea of T(a)) {
    r[ea.j] += ea.f * f[a];
    for (let c = 0; c < N; c++) { const v = K[a * N + c]; if (v) for (const ec of T(c)) A[ea.j * n + ec.j] += ea.f * ec.f * v; }
  }
  const q = luSolve(lu(A, n), r);
  let err = 0, big = 0;
  for (let g = 0; g < N; g++) { const u = T(g).reduce((s2, e) => s2 + e.f * q[e.j], 0); err = Math.max(err, Math.abs(u - uMPC[g])); big = Math.max(big, Math.abs(uMPC[g])); }
  expect(err / big).toBeLessThan(1e-9);

  // a pure rotation of a floor moves the nodes rigidly: no axial strain in its beams
  const q2 = new Float64Array(n);
  q2[model.master(1) + 2] = 1e-3;
  const u2 = (g: number) => model.map[g].reduce((s2, e) => s2 + e.f * q2[e.j], 0);
  for (const m of members.filter((m) => m.kind !== "col" && m.level === 1)) {
    const [ex] = model.geo[members.indexOf(m)].R, du = [0, 1, 2].map((a) => u2(6 * m.j + a) - u2(6 * m.i + a));
    expect(Math.abs(du[0] * ex[0] + du[1] * ex[1] + du[2] * ex[2])).toBeLessThan(1e-12);
  }
});

test("gravity alone does not sway the symmetric building", () => {
  const { Uq, U } = solveCases(DEFAULT);
  let sway = 0, vert = 0;
  for (let k = 1; k <= 6; k++) for (const a of [0, 1, 2]) sway = Math.max(sway, Math.abs(Uq[0][MODEL.master(k) + a] * (a === 2 ? 9000 : 1)));
  for (let i = 2; i < U[0].length; i += 6) vert = Math.max(vert, Math.abs(U[0][i]));
  expect(sway / vert).toBeLessThan(1e-9);
});

test("wind: the base shear is cp,net qp b Σh, and all of it reaches the columns", () => {
  // Σ hj = 5 × 3.6 + 1.8 = 19.8 m (the lowest half-storey loads the foundation directly); b = 18 m
  const { F } = solveCases(DEFAULT), total = Array.from({ length: 6 }, (_, k) => F[2][MODEL.master(k + 1) + 1]).reduce((a, v) => a + v, 0);
  expect(rel(total, CP_NET * 0.9e-3 * 18000 * 19800)).toBeLessThan(1e-12);
  const r = analyse(DEFAULT, { ...LOADS, qp: 1.2 }), r0 = analyse(DEFAULT);
  expect(rel(r.drift / r0.drift, 1.2 / 0.9)).toBeLessThan(1e-9);   // drift is linear in qp
});

test("results do not depend on which end a member starts from", () => {
  const flip = (k: number): Model => {
    const members = MODEL.members.map((m, e) => (e === k ? { ...m, i: m.j, j: m.i } : m));
    const geo = members.map((m) => ({ L: Math.hypot(...[0, 1, 2].map((a) => MODEL.nodes[m.j][a] - MODEL.nodes[m.i][a])), R: triad(m.kind, MODEL.nodes[m.i], MODEL.nodes[m.j]) }));
    return { ...MODEL, members, geo };
  };
  const base = analyse(DEFAULT);
  for (const k of [3, MODEL.members.findIndex((m) => m.kind === "bx"), MODEL.members.findIndex((m) => m.kind === "by")]) {
    const r = analyse(DEFAULT, LOADS, flip(k));
    expect(rel(r.drift, base.drift)).toBeLessThan(1e-9);
    expect(rel(r.util[k], base.util[k])).toBeLessThan(1e-9);
    expect(rel(r.acr, base.acr)).toBeLessThan(1e-9);
  }
});

test("sway imperfection and buckling curves by hand", () => {
  // φ = 1/200 · αh · αm; αh = 2/√21.6 = 0.430 → 2/3; αm = √(0.5 (1 + 1/3)) = 0.8165; φ = 0.002722
  expect(swayImperfection(21.6, 3)).toBeCloseTo(0.002722, 6);
  expect(chi(1.0, 0.34)).toBeCloseTo(0.5970, 4);   // EN 1993-1-1, Table 6.4 lists 0.5970 for curve b at λ̄ = 1.0
  expect(chi(1.0, 0.49)).toBeCloseTo(0.5399, 4);   // curve c: 0.5399
});

test("the building: 84 nodes, 72 columns, 102 beams; mass by hand", () => {
  expect(MODEL.nodes).toHaveLength(84);
  expect(MODEL.members.filter((m) => m.kind === "col")).toHaveLength(72);
  expect(MODEL.members.filter((m) => m.kind !== "col")).toHaveLength(102);
  // HAND CALCULATION, default design: 36 HEB 300 and 36 HEB 240 of 3.6 m; per floor 9 × 6 m and 8 × 7.5 m of IPE 400
  const [c1, c2, bm] = ["HEB300", "HEB240", "IPE400"].map((id) => section(id)!.A * 7850e-9);
  const mass = (36 * 3600 * (c1 + c2) + 6 * (9 * 6000 + 8 * 7500) * bm) / 1000;
  expect(rel(analyse(DEFAULT).mass, mass)).toBeLessThan(1e-12);
  expect(BUILDING.storeys * BUILDING.h).toBe(21600);
});

test("feasibility needs every limit", () => {
  const ok = { drift: 1 / 400, uCL: 0.9, uCU: 0.8, uB: 1, acr: 3 };
  expect(feasible(ok, 300)).toBe(true);
  expect(feasible(ok, 500)).toBe(false);
  expect(feasible({ ...ok, acr: 2.9 }, 300)).toBe(false);
  expect(feasible({ ...ok, uB: 1.01 }, 300)).toBe(false);
});

test("five designs agree with the independent NumPy check (docs/verification/surrogate-frame/frame_check.py)", () => {
  // That script assembles the full global stiffness, imposes the rigid floors through an SVD nullspace, integrates the
  // consistent loads numerically and takes member moments by statics from the end forces (201 points per member).
  const ref: [number[], number[]][] = [   // [cL, cU, bm], [1/drift, uCL, uCU, uB, αcr,y, αcr,x, mass t]
    [[5, 2, 4], [428.2, 0.8027, 0.6258, 0.7766, 11.3, 8.274, 71.301]],
    [[0, 0, 0], [103.7, 2.3773, 1.155, 2.3754, 2.809, 2.048, 40.557]],
    [[11, 11, 8], [1738.3, 0.4643, 0.2282, 0.2832, 43.572, 15.336, 132.31]],
    [[5, 1, 3], [341.9, 0.822, 0.7765, 0.9939, 9.086, 6.386, 63.48]],
    [[3, 6, 2], [232.8, 1.1584, 0.397, 1.2941, 6.182, 4.659, 62.08]],
  ];
  for (const [[cL, cU, bm], v] of ref) {
    const r = analyse({ cL, cU, bm }), got = [1 / r.drift, r.uCL, r.uCU, r.uB, r.acrY, r.acrX, r.mass];
    got.forEach((g, k) => expect([cL, cU, bm, k, rel(g, v[k]) < 6e-4]).toEqual([cL, cU, bm, k, true]));   // rounding of the printed values
  }
});

test("a single member under an axial force shortens by PL/EA and carries P", () => {
  // column along Z, base fixed, top loaded by P downwards (−Z): shortening P L / (E A), axial force −P
  const s = section("HEB300")!, p: Props = { A: s.A, Iy: s.Iy, Iz: s.Iz, It: s.It }, L = 3600, P = 500e3, R = triad("col", [0, 0, 0], [0, 0, L]);
  const kg = globalStiffness(localStiffness(p, L), R), k = kg[8 * 12 + 8];   // the top's uz–uz term
  const uz = -P / k, ue = [0, 0, 0, 0, 0, 0, 0, 0, uz, 0, 0, 0];
  expect(rel(-uz, (P * L) / (E * s.A))).toBeLessThan(1e-12);
  const f = memberForces(p, L, R, ue, [0, 0, 0]);
  expect(rel(-f.N0, P)).toBeLessThan(1e-12);
  expect(f.My).toBeLessThan(1e-9);
});

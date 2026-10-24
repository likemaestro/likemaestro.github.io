import { cholesky, forward } from "../la/dense";
import { bucklingEig, symEig } from "../la/eig";
import { classInBending, E, G, section, SECTIONS } from "../steel/sections";
import { assembleLtb, ec3, mcrUniform, modeAt, solveLtb, type LtbCase } from "./ltb";
import { ritzMcr } from "./ritz";

const IPE300 = section("IPE300")!;
const base: LtbCase = { sec: IPE300, L: 6000, load: "udl", height: "centre", at: [], kind: "top" };
const mcr = (c: Partial<LtbCase>) => solveLtb({ ...base, ...c })!.Mcr;
const rel = (a: number, b: number) => Math.abs(a / b - 1);

test("uniform moment matches the closed form (π/L)√(EIz GIt)√(1 + π²EIw/(L²GIt))", () => {
  const r = solveLtb({ ...base, load: "moment" })!;
  expect(rel(r.Mcr, mcrUniform(IPE300, 6000))).toBeLessThan(1e-4);   // spec: 0.5 %
  expect(r.Mcr / 1e6).toBeCloseTo(90.43, 1);                          // NumPy/SciPy check: 90.426 kNm
  expect(r.residual).toBeLessThan(1e-8);
});

test("with negligible warping the moment-gradient ratios reach SN003 Table 3.2 (κ = 0): 1.127 and 1.348", () => {
  // SN003 tabulates C1 for κ = EIw/(GIt L²) = 0; IPE 300 at 6 m has κ = 0.045, so only the limit is compared
  const sec = { ...IPE300, Iw: IPE300.Iw * 1e-6 };
  expect(rel(solveLtb({ ...base, sec, load: "udl" })!.ratio, 1.127)).toBeLessThan(0.002);
  expect(rel(solveLtb({ ...base, sec, load: "point" })!.ratio, 1.348)).toBeLessThan(0.002);
  // at the real κ the ratios are larger (FE 1.131 and 1.361): an equivalent Mcr ratio, not SN003's C1
  expect(solveLtb(base)!.ratio).toBeGreaterThan(1.127);
  expect(solveLtb({ ...base, load: "point" })!.ratio).toBeGreaterThan(1.348);
});

test("the finite elements agree with an independent Ritz sine series", () => {
  const cases: Partial<LtbCase>[] = [
    { load: "moment" }, { load: "udl", height: "top" }, { load: "udl" }, { load: "udl", height: "bottom" },
    { load: "point", height: "top" }, { load: "point" }, { load: "point", height: "bottom" },
    { at: [0.5], kind: "top" }, { at: [0.25], kind: "full" }, { load: "point", height: "top", at: [0.3, 0.7], kind: "top" },
    { sec: section("HEB300")!, L: 9000, at: [0.4], kind: "bottom" },
  ];
  for (const c of cases) {
    const fe = mcr(c), rz = ritzMcr({ ...base, ...c })!;
    expect([c, rel(fe, rz) < 0.003]).toEqual([c, true]);
  }
});

test("load height: a load on the top flange buckles first, one on the bottom flange last", () => {
  for (const load of ["udl", "point"] as const) {
    const top = mcr({ load, height: "top" }), mid = mcr({ load }), bot = mcr({ load, height: "bottom" });
    expect(top).toBeLessThan(mid);
    expect(mid).toBeLessThan(bot);
  }
});

test("load height agrees with the SN003 C1–C2 formula, within its approximation", () => {
  // Mcr = C1 π²EIz/L² [√(Iw/Iz + L²GIt/(π²EIz) + (C2 zg)²) − C2 zg], zg = ±h/2 (SN003, eq. and Table 3.2)
  const { Iz, It, Iw, h } = IPE300, L = 6000;
  const f = (C1: number, C2: number, zg: number) =>
    C1 * (Math.PI ** 2 * E * Iz) / L ** 2 * (Math.sqrt(Iw / Iz + (L * L * G * It) / (Math.PI ** 2 * E * Iz) + (C2 * zg) ** 2) - C2 * zg);
  for (const [height, zg] of [["top", h / 2], ["centre", 0], ["bottom", -h / 2]] as const) {
    expect(rel(mcr({ height }), f(1.127, 0.454, zg))).toBeLessThan(0.006);              // uniform load: 0.1–0.5 %
    expect(rel(mcr({ load: "point", height }), f(1.348, 0.63, zg))).toBeLessThan(0.05);  // central point: up to 4.2 %
  }
});

test("a full midspan restraint under uniform moment gives the closed form over half the span", () => {
  // Two segments of L/2: v = φ = 0 at midspan, free warping there by antisymmetry (two half-waves)
  expect(rel(mcr({ load: "moment", at: [0.5], kind: "full" }), mcrUniform(IPE300, 3000))).toBeLessThan(1e-4);   // spec: 1 %
});

test("the compression flange leads: it sways more, and holding it beats holding the tension flange", () => {
  const r = solveLtb(base)!;
  let top = 0, bot = 0;
  for (let k = 0; k <= r.n; k++) {
    top = Math.max(top, Math.abs(r.mode.v[k] - r.ztop * r.mode.phi[k]));
    bot = Math.max(bot, Math.abs(r.mode.v[k] + r.ztop * r.mode.phi[k]));
  }
  expect(top).toBeCloseTo(1, 12);
  expect(bot).toBeLessThan(0.5 * top);   // NumPy check: 0.28
  const held = { top: mcr({ at: [0.5], kind: "top" }), bottom: mcr({ at: [0.5], kind: "bottom" }), full: mcr({ at: [0.5], kind: "full" }) };
  expect(held.top).toBeGreaterThan(3 * r.Mcr);       // 336 vs 102 kNm
  expect(held.bottom).toBeLessThan(1.25 * r.Mcr);    // 119 kNm: the tension flange barely matters
  expect(held.full).toBeGreaterThanOrEqual(held.top * (1 - 1e-9));
});

test("mesh: 40 and 80 elements differ by less than 0.2 %", () => {
  for (const c of [{ height: "top" as const }, { load: "point" as const, at: [0.3], kind: "full" as const }])
    expect(rel(mcr({ ...c, n: 40 }), mcr({ ...c, n: 80 }))).toBeLessThan(0.002);
});

test("restraints snap to nodes, and two on one node merge", () => {
  const r = solveLtb({ ...base, at: [0.5, 0.25, 0.501], kind: "full" })!;
  expect(r.nodes).toEqual([20, 10]);
  expect(r.shared).toEqual([[1, 3]]);
  const m = modeAt(r, 3000);
  expect(m.v).toBeCloseTo(0, 12);
  expect(m.phi).toBeCloseTo(0, 12);
  const k = 7, at = modeAt(r, (k * 6000) / 40);
  expect(at.v).toBeCloseTo(r.mode.v[k], 12);
});

test("EN 1993-1-1 6.3.2.3 hand calculation: IPE 300, S355, 6 m, uniform load at the shear center", () => {
  // Mcr = 102.26 kNm (FE; NumPy check 102.259). Class 1, so Wy = Wpl,y = 628.4 cm³ (catalog 628).
  // h/b = 300/150 = 2.0 ≤ 2: curve b, αLT = 0.34.
  // λ̄LT = √(628.4e3 · 355 / 102.26e6) = √2.1814 = 1.4770
  // ΦLT = 0.5 [1 + 0.34 (1.4770 − 0.4) + 0.75 · 1.4770²] = 0.5 [1 + 0.3662 + 1.6361] = 1.5011
  // χLT = 1 / (1.5011 + √(1.5011² − 0.75 · 1.4770²)) = 1 / (1.5011 + √(2.2533 − 1.6361)) = 1 / 2.2867 = 0.4373
  // also ≤ 1/λ̄² = 0.4584: χLT = 0.4373. Mb,Rd = 0.4373 · 628.4e3 · 355 = 97.55 kNm; Mpl,Rd = 223.07 kNm.
  const Mcr = mcr({});
  expect(Mcr / 1e6).toBeCloseTo(102.26, 1);
  const c = ec3(IPE300, classInBending(IPE300, 355), 355, Mcr);
  expect(c.cls).toBe(1);
  expect(c.curve).toBe("b");
  expect(c.lam).toBeCloseTo(1.477, 3);
  expect(c.Phi).toBeCloseTo(1.501, 3);
  expect(c.chi).toBeCloseTo(0.4373, 3);
  expect(c.MbRd! / 1e6).toBeCloseTo(97.55, 1);
  expect(c.MRd! / 1e6).toBeCloseTo(223.07, 1);
  // a deep section takes curve c
  expect(ec3(section("IPE600")!, 1, 355, 1e9).curve).toBe("c");
});

test("a short beam: λ̄LT ≤ 0.4 gives χLT = 1 and the short flag", () => {
  // HEB 300, S235, 2 m: Mcr ≈ 7630 kNm against Mpl,Rd = 1869 cm³ · 235 = 439 kNm, so λ̄LT ≈ 0.24
  const s = section("HEB300")!, c = ec3(s, classInBending(s, 235), 235, mcr({ sec: s, L: 2000 }));
  expect(c.lam).toBeLessThan(0.4);
  expect(c.short).toBe(true);
  expect(c.chi).toBe(1);
  expect(c.MbRd).toBeCloseTo(c.MRd!, 6);
});

test("class 4 is flagged and has no resistance; class 3 uses the elastic modulus", () => {
  const c4 = ec3(IPE300, 4, 355, 1e8);
  expect(c4.MbRd).toBeNull();
  expect(c4.MRd).toBeNull();
  const s = section("HEA300")!;
  expect(ec3(s, classInBending(s, 355), 355, 1e9).W).toBe(s.Wel);
});

test("a very slender beam keeps a small, nonzero resistance", () => {
  // IPE 80, 12 m, uniform load on the top flange: Mcr ≈ 0.9 kNm
  const s = section("IPE80")!, r = solveLtb({ ...base, sec: s, L: 12000, height: "top" })!;
  const c = ec3(s, classInBending(s, 355), 355, r.Mcr);
  expect(c.chi).toBeGreaterThan(0);
  expect(c.chi).toBeLessThanOrEqual(1 / c.lam ** 2);
  expect(c.MbRd!).toBeGreaterThan(0);
});

test("the Lanczos solve finds the lowest mode: 100 random cases against a dense eigen decomposition", () => {
  // reference: every eigenvalue of L⁻¹ Kg L⁻ᵀ by Householder + QL, λ = 1 / μmax
  let seed = 42;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647, pick = <T,>(a: readonly T[]) => a[Math.floor(rnd() * a.length)];
  for (let t = 0; t < 100; t++) {
    const c: LtbCase = {
      sec: pick(SECTIONS), L: 2000 + Math.round(rnd() * 100) * 100, load: pick(["moment", "udl", "point"] as const),
      height: pick(["top", "centre", "bottom"] as const), kind: pick(["top", "full", "bottom"] as const),
      at: Array.from({ length: Math.floor(rnd() * 5) }, () => 0.05 + 0.9 * rnd()),
    };
    const { A, B, nr } = assembleLtb(c), L = cholesky(A, nr), C = new Float64Array(nr * nr), col = new Float64Array(nr);
    for (let j = 0; j < nr; j++) { col.fill(0); col[j] = 1; forward(L, col, nr); for (let i = 0; i < nr; i++) C[i * nr + j] = col[i]; }   // L⁻¹
    const Li = Float64Array.from(C), T = new Float64Array(nr * nr);
    for (let i = 0; i < nr; i++) for (let j = 0; j < nr; j++) { let s = 0; for (let k = 0; k <= i; k++) s += Li[i * nr + k] * B[k * nr + j]; T[i * nr + j] = s; }
    for (let i = 0; i < nr; i++) for (let j = 0; j <= i; j++) { let s = 0; for (let k = 0; k <= j; k++) s += T[i * nr + k] * Li[j * nr + k]; C[i * nr + j] = C[j * nr + i] = s; }
    const mu = symEig(C, nr, false).values[nr - 1], got = bucklingEig(A, B, nr)!;
    expect([t, rel(got.lambda, 1 / mu) < 1e-9, got.residual < 1e-7]).toEqual([t, true, true]);
  }
});

test("published LTBeamN results for fork-supported beams (E = 210 GPa, G = 81 GPa, the papers' section properties)", () => {
  // Our G is 80 769 N/mm², so It is scaled to give the papers' G·It; zg = +h/2 for the top flange, 0 at the shear center.
  // 1) Piotrowski & Szychowski (2022), Materials 15, 1275, Table 6, κω = κν = 0: IPE 300, L = 5 m, central point load on
  //    the top flange; Iz = 604 cm⁴, It = 20.7 cm⁴, Iω = 125 900 cm⁶: LTBeamN 111.19 kNm.
  // 2), 3) Materials 19, 120 (2026), Table 8, κω = κu = κv = 0: IPE 500, L = 8 m, load at the shear center;
  //    Iz = 2141.7 cm⁴, It = 89.006 cm⁴, Iω = 1 254 300 cm⁶: LTBeamN 380.89 kNm (central point load), 316.26 kNm (uniform).
  const k = 81000 / G;
  const ipe300 = { h: 300, tf: 10.7, Iz: 604e4, It: 20.7e4 * k, Iw: 125.9e9 };
  const ipe500 = { h: 500, tf: 16, Iz: 2141.7e4, It: 89.006e4 * k, Iw: 1254.3e9 };
  const cases: [LtbCase, number][] = [
    [{ sec: ipe300, L: 5000, load: "point", height: "top", at: [], kind: "top" }, 111.19],
    [{ sec: ipe500, L: 8000, load: "point", height: "centre", at: [], kind: "top" }, 380.89],
    [{ sec: ipe500, L: 8000, load: "udl", height: "centre", at: [], kind: "top" }, 316.26],
  ];
  for (const [c, ref] of cases) expect([ref, rel(solveLtb(c)!.Mcr / 1e6, ref) < 0.002]).toEqual([ref, true]);
});

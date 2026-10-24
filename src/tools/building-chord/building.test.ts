import { peaks, spectrum } from "../vibrometer/signal";
import { synthesize } from "../audio/partials";
import { E } from "../steel/sections";
import { ALPHA, BRACE_K, columnSection, floorMass, H, matrices, modes, parseDamage, REF, track, type Building } from "./building";
import { partials, transposition } from "./sound";

const rel = (a: number, b: number) => Math.abs(a / b - 1);
const B6: Building = { n: 6, sys: "moment" };

test("two storeys, sway in x: the frequencies of a two-DOF shear building", () => {
  // HAND CALCULATION. k = 9 columns × 12 E Iz / h³ (HEB 260); m1 with occupancy, m2 the roof (gk only):
  // m1 m2 ω⁴ − k (2 m2 + m1) ω² + k² = 0
  const b: Building = { n: 2, sys: "moment" }, k = (9 * 12 * E * 1e6 * columnSection(1).Iz * 1e-12) / H ** 3;
  const m1 = floorMass(1, 2, REF.occ).m, m2 = floorMass(2, 2, REF.occ).m;
  const p = k * (2 * m2 + m1), disc = Math.sqrt(p * p - 4 * m1 * m2 * k * k);
  const w2 = [(p - disc) / (2 * m1 * m2), (p + disc) / (2 * m1 * m2)];
  const fx = modes(b, REF).modes.filter((m) => m.type === "X").map((m) => m.f);
  w2.forEach((w, i) => expect(rel(fx[i], Math.sqrt(w) / (2 * Math.PI))).toBeLessThan(1e-6));
});

test("a symmetric plan has pure X, Y and twist modes", () => {
  for (const sys of ["moment", "braced"] as const) for (const m of modes({ n: 6, sys }, REF).modes) {
    const sorted = [...m.shares].sort((a, b) => b - a);
    expect(sorted[0]).toBeCloseTo(1, 9);
    expect(sorted[1]).toBeLessThan(1e-9);
  }
});

test("damage never raises a frequency", () => {
  for (const id of ["c1-4", "c3-5", "c6-1", "b2-1"]) {
    const b: Building = id.startsWith("b") ? { n: 6, sys: "braced" } : B6;
    let prev = modes(b, REF).modes.map((m) => m.f);
    for (const d of [0.2, 0.5, 0.9]) {
      const cur = modes(b, REF, parseDamage(id, b, d)).modes.map((m) => m.f);
      cur.forEach((f, i) => expect(f).toBeLessThanOrEqual(prev[i] * (1 + 1e-12)));
      prev = cur;
    }
  }
});

test("losing one edge column couples sway with twist; the healthy building has none", () => {
  // column line 4 at (−6, 0): its ky acts with lever x = −6, so Kyθ ≠ 0. At d = 0.9 the first Y mode carries more than
  // 1 % twist energy and the first twist mode more than 1 % sway in y (1.19 % and 1.21 %).
  const m = modes(B6, REF, parseDamage("c1-4", B6, 0.9)).modes, y1 = m.find((q) => q.type === "Y")!, t1 = m.find((q) => q.type === "Twist")!;
  expect(y1.shares[2]).toBeGreaterThan(0.01);
  expect(t1.shares[1]).toBeGreaterThan(0.01);
  expect(modes(B6, REF).modes.every((q) => Math.max(...q.shares) > 1 - 1e-9)).toBe(true);
});

test("10 °C warmer lowers every frequency by about α·10/2 = 0.75 %", () => {
  // f ∝ √(1 − α ΔT): √(1 − 0.015) − 1 = −0.753 %
  const a = modes(B6, REF).modes, b = modes(B6, { ...REF, T: 25 }).modes;
  a.forEach((m, i) => expect(Math.abs(b[i].f / m.f - 1 - (Math.sqrt(1 - ALPHA * 10) - 1))).toBeLessThan(1e-9));
  expect(Math.abs(Math.sqrt(1 - ALPHA * 10) - 1 + 0.0075)).toBeLessThan(0.0005);
});

test("modes are tracked by MAC across environment and damage", () => {
  const ref = modes(B6, REF), warm = modes(B6, { T: 30, occ: 0.6 }), t = track(ref, warm.modes, 6);
  t.mac.forEach((v) => expect(v).toBeGreaterThan(0.99));
  expect(t.uncertain).toBe(false);
  const dmg = track(ref, modes(B6, REF, parseDamage("c1-4", B6, 0.7)).modes, 6);
  expect(new Set(dmg.to).size).toBe(6);
});

test("the stiffness matrix is symmetric and the brace stiffness is 2 E A cos²θ / Ld", () => {
  const { K, N } = matrices({ n: 4, sys: "braced" }, REF);
  for (let i = 0; i < N; i++) for (let j = 0; j < i; j++) expect(K[i * N + j]).toBeCloseTo(K[j * N + i], 3);
  const A = (Math.PI / 4) * (139.7 ** 2 - 123.7 ** 2) * 1e-6, Ld = Math.hypot(6, 3.6);
  expect(rel(BRACE_K, (2 * 210e9 * A * (6 / Ld) ** 2) / Ld)).toBeLessThan(1e-12);
});

test("the chord: FFT peaks of the synthesized tap at K·f within one bin; K stays with the healthy building", () => {
  const ref = modes(B6, REF).modes, K = transposition(ref[0].f), fs = 8000;
  const dmg = modes(B6, REF, parseDamage("c1-4", B6, 0.7)).modes;
  for (const ms of [ref, dmg]) {
    const P = partials(ms, 6, { floor: 6, dir: "y" }, K).filter((p) => p.a > 0.15);
    const x = synthesize(P, 4, fs), s = spectrum(Float64Array.from(x), fs), found = peaks(s.amp, s.df, 50, P.length, 8, 0.05).map((p) => p.f);
    for (const p of P) expect(Math.min(...found.map((f) => Math.abs(f - p.f)))).toBeLessThan(s.df);
  }
  expect(K * ref[0].f).toBeCloseTo(110, 9);
});

test("frequencies agree with the independent NumPy model (docs/verification/building-chord/building_check.py)", () => {
  // that script builds the storey stiffness from the explicit sums Kx, Ky, Kθ, Kxθ, Kyθ and solves with scipy.linalg.eigh
  const cases: [Building, Parameters<typeof modes>[1], string, number[]][] = [
    [B6, REF, "", [0.678394, 1.152148, 1.33705, 1.787604, 2.88365, 3.027772, 3.516103, 3.826747, 4.266461]],
    [{ n: 6, sys: "braced" }, REF, "", [1.33705, 2.611257, 2.782084, 3.516103, 5.666088, 7.526919, 7.60483, 8.000019, 8.391073]],
    [B6, REF, "c1-4@0.7", [0.671351, 1.13809, 1.321464, 1.767465, 2.867808, 2.988092, 3.472201, 3.805935, 4.247016]],
    [{ n: 6, sys: "braced" }, REF, "b2-3@0.5", [1.33705, 2.611257, 2.692823, 3.516103, 5.666088, 7.526919, 7.60483, 7.935259, 8.391073]],
    [B6, { T: 30, occ: 0.6 }, "", [0.631417, 1.072529, 1.244604, 1.656793, 2.681175, 2.806112, 3.258723, 3.526573, 3.891859]],
    [{ n: 4, sys: "moment" }, REF, "", [1.054691, 1.79636, 2.083101, 2.702413, 4.116071, 4.579046, 5.317093, 5.42424, 6.994451]],
  ];
  for (const [b, env, dm, ref] of cases) {
    const [id, d] = dm ? dm.split("@") : ["", "0"], f = modes(b, env, parseDamage(id, b, Number(d))).modes.map((m) => m.f);
    ref.forEach((v, i) => expect([dm, i, rel(f[i], v) < 2e-6]).toEqual([dm, i, true]));   // printed to 6 decimals
  }
});

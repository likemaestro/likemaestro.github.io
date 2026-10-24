import type { Factor } from "../carbon/factors";
import { FACTORS, validate } from "../carbon/factors";
import { a4Factor, compute, computeRow, scors, wasteFactor, type RowIn } from "./calc";
import { range } from "./mc";
import { decode, DEFAULT, encode, toKg, valid } from "./state";

// The IStructE guide's Appendix B pavilion with the guide's own factors (not ÖKOBAUDAT), as the spec's fixture.
const F = (id: string, group: Factor["group"], a1a3: number, wasteRate: number, extra: Partial<Factor> = {}): Factor => ({
  id, label: id, group, unit: "kg", density: null, a1a3, wasteRate, source: { name: "", owner: "", uuid: "x", version: "", referenceYear: "", validUntil: "", geography: "", declaredUnit: "", kgPerDeclaredUnit: 1, scenario: null, url: "x", license: "x" }, ...extra,
});
const concrete = F("concrete", "concrete", 0.1, 0.05), rebar = F("rebar", "rebar", 0.76, 0.05), steel = F("steel", "steel", 1.74, 0.01);
const clt = F("clt", "timber", 0.25, 0.01, { biogenic: -1.64, c3c4: 1.662 });
const rows: RowIn[] = [
  { factor: concrete, kg: 279800, el: "sub", tr: "local" },
  { factor: rebar, kg: 10500, el: "sub", tr: "national" },
  { factor: steel, kg: 31700, el: "frame", tr: "national" },
  { factor: clt, kg: 62500, el: "roof", tr: "european" },
];
const t = (kg: number) => kg / 1000;

test("IStructE Appendix B: the guide's numbers within the stated tolerances", () => {
  const r = rows.map((x) => computeRow(x)!);
  // ECF_A5w to 3 d.p.: concrete 0.007 (the guide rounds WF to 0.053; exact WF gives 0.0065), rebar 0.043, steel 0.018, CLT 0.004
  expect(Math.abs(r[0].ecf.a5w - 0.007)).toBeLessThanOrEqual(0.001);
  expect(r[1].ecf.a5w).toBeCloseTo(0.043, 3);
  expect(r[2].ecf.a5w).toBeCloseTo(0.018, 3);
  expect(r[3].ecf.a5w).toBeCloseTo(0.004, 3);
  const a15 = (x: (typeof r)[number]) => t(x.a13 + x.a4 + x.a5w);
  expect(Math.abs(a15(r[0]) + a15(r[1]) - 40)).toBeLessThanOrEqual(1);
  expect(Math.abs(a15(r[2]) - 57)).toBeLessThanOrEqual(1);
  expect(Math.abs(a15(r[3]) - 26)).toBeLessThanOrEqual(1);
  const o = compute({ gia: 792, cost: 800000, rows });
  expect(Math.round(t(o.a5a!))).toBe(6);
  // the guide reports rounded figures (its 129 t is the sum of its rounded parts, 40 + 57 + 26 + 6); compare as reported
  expect(Math.abs(Math.round(t(o.a15)) - 129)).toBeLessThanOrEqual(1);
  expect(Math.abs(Math.round(o.perM2!.a15) - 163)).toBeLessThanOrEqual(1);
  expect(o.band).toBe("B");
  expect([-102, -103]).toContain(Math.round(t(o.bio)));
  expect(Math.round(t(o.c1))).toBe(3);
  const c24 = (x: (typeof r)[number]) => t(x.c2 + x.c34);
  expect(Math.round(c24(r[0]) + c24(r[1]))).toBe(5);
  expect(Math.round(c24(r[2]))).toBe(1);
  expect(Math.round(c24(r[3]))).toBe(104);
  expect(Math.abs(Math.round(t(o.ac)) - 139)).toBeLessThanOrEqual(1);
  expect(Math.abs(Math.round(o.perM2!.ac) - 176)).toBeLessThanOrEqual(1);
  console.info(`Appendix B: A1–A5 ${t(o.a15).toFixed(2)} t, ${o.perM2!.a15.toFixed(1)} kgCO2e/m² (${o.band}); A–C ${t(o.ac).toFixed(2)} t, ${o.perM2!.ac.toFixed(1)} kgCO2e/m²; biogenic ${t(o.bio).toFixed(2)} t`);
});

test("waste factors, transport scenarios and SCORS edges", () => {
  expect(wasteFactor(0.05)).toBeCloseTo(0.0526, 4);
  expect(wasteFactor(0.01)).toBeCloseTo(0.0101, 4);
  expect(a4Factor("local")).toBeCloseTo(0.005, 3);
  expect(a4Factor("national")).toBeCloseTo(0.032, 3);
  expect(a4Factor("european")).toBeCloseTo(0.161, 3);
  expect(a4Factor("global")).toBeCloseTo(0.183, 3);
  expect(a4Factor("custom", 100, 1000)).toBeCloseTo(100 * 0.10749e-3 + 1000 * 0.01614e-3, 12);
  expect([49.9, 50, 149.9, 150, 400, 0, 1000].map(scors)).toEqual(["A++", "A+", "A", "B", "G", "A++", "G"]);
});

test("rows: custom factor, uncertified timber, missing D, excluded rows", () => {
  const a = computeRow({ factor: steel, kg: 1000, el: "frame", tr: "local", cf: 1.2 })!;
  expect(a.a13).toBeCloseTo(1200, 9);
  const b = computeRow({ factor: clt, kg: 1000, el: "roof", tr: "local", cert: false })!;
  expect(b.bio).toBe(0);
  expect(b.d).toBeNull();
  expect(computeRow({ factor: null, kg: 1000, el: "roof", tr: "local" })).toBeNull();
  expect(computeRow({ factor: steel, kg: null, el: "roof", tr: "local" })).toBeNull();
  const o = compute({ gia: 0, rows });
  expect(o.perM2).toBeNull(); expect(o.band).toBeNull(); expect(o.a5a).toBeNull();
});

test("Monte Carlo: seeded, zero spread is the deterministic value, shares sum to 1", () => {
  const o = { gia: 792, cost: 800000, rows };
  expect(range(o, 0.2, 0.1, 7)).toEqual(range(o, 0.2, 0.1, 7));
  const z = range(o, 0, 0, 7)!, det = compute(o).perM2!.a15;
  expect(z.p5).toBeCloseTo(det, 9); expect(z.p50).toBeCloseTo(det, 9); expect(z.p95).toBeCloseTo(det, 9);
  const r = range(o, 0.2, 0.1, 7)!;
  expect(Object.values(r.shares).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
  expect(r.p5).toBeLessThan(det); expect(r.p95).toBeGreaterThan(det);
  expect(range({ ...o, gia: 0 }, 0.2, 0.1, 7)).toBeNull();
});

test("state: URL round trip, schema checks, unit conversion", () => {
  expect(valid(DEFAULT)).toBe(true);
  expect(decode(encode(DEFAULT))).toEqual(DEFAULT);
  const s = { ...DEFAULT, o: [{ ...DEFAULT.o[0], label: "Ünïcödé ✓" }] };
  expect(decode(encode(s))).toEqual(s);
  expect(decode("not base64!")).toBeNull();
  expect(decode(encode({ ...DEFAULT, sf: 5 } as never))).toBeNull();
  expect(decode(encode({ ...DEFAULT, o: [] } as never))).toBeNull();
  const f = FACTORS.factors.find((x) => x.id === "concrete-c30-37")!;
  expect(toKg({ f: f.id, q: 2, u: "m3", el: "sub", tr: "local" }, f).kg).toBeCloseTo(2 * f.density!, 9);
  expect(toKg({ f: f.id, q: 2, u: "t", el: "sub", tr: "local" }, f).kg).toBe(2000);
  const deck = FACTORS.factors.find((x) => x.id === "steel-decking")!;
  expect(toKg({ f: deck.id, q: 2, u: "m3", el: "floors", tr: "local" }, deck).kg).toBeNull();
  expect(toKg({ f: "gone", q: 2, u: "t", el: "floors", tr: "local" }, undefined).kg).toBeNull();
});

test("the factor data: valid, from ÖKOBAUDAT, EN 15804+A2 datasets with a license; a malformed file fails", () => {
  expect(FACTORS.factors.length).toBeGreaterThanOrEqual(10);
  for (const f of FACTORS.factors) {
    expect(f.source.url).toContain(f.source.uuid);
    expect(f.source.license).toBe("Free of charge for all users and uses");
    if (f.group === "timber") expect(f.biogenic!).toBeLessThan(0);
  }
  expect(() => validate({ release: {}, factors: [] })).toThrow();
  expect(() => validate({ release: {}, factors: [{ ...FACTORS.factors[0], a1a3: -1 }] })).toThrow();
  expect(() => validate({ release: {}, factors: [FACTORS.factors[0], FACTORS.factors[0]] })).toThrow();
});

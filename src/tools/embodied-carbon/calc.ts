// Embodied carbon of a building structure after IStructE, How to calculate embodied carbon, 2nd ed. (2022):
// A1–A3, A4 (transport), A5w (waste) and A5a (site activities) give the A1–A5 headline and the SCORS band; biogenic
// carbon is reported apart, C1–C4 complete A–C, and module D is always reported separately. Equation and table numbers
// are the guide's. All pure; quantities in kg, results in kgCO2e.
import type { Factor } from "../carbon/factors";

/** Transport emission factors, kgCO2e per kg per km (IStructE Table 2.4, UK DEFRA 2021). */
export const TEF = { road: 0.10749e-3, sea: 0.01614e-3, rail: 0.02782e-3 };
export const SCENARIOS = {
  local: { road: 50, sea: 0, text: "Local, 50 km by road" },
  national: { road: 300, sea: 0, text: "National, 300 km by road" },
  european: { road: 1500, sea: 0, text: "European, 1,500 km by road" },
  global: { road: 200, sea: 10000, text: "Global, 200 km by road and 10,000 km by sea" },
} as const;
export type Transport = keyof typeof SCENARIOS | "custom";
export const A5A_RATE = 700;        // kgCO2e per £100,000 of structure cost (2.5)
export const C1_RATE = 3.4;         // kgCO2e per m² GIA, demolition (2.7)
export const ECF_C2 = 0.005;        // kgCO2e/kg, 50 km by road to the waste site (Table 2.7)
export const C34_DEFAULT = 0.013;   // kgCO2e/kg, when the dataset declares none (2.8)
export const C34_TIMBER = 1.66;     // kgCO2e/kg, timber without a dataset value (Table 2.8, UK scenario)
export const BIO_TIMBER = -1.64;    // kgCO2e/kg, timber without a dataset value (2.1)

/** SCORS bands on A1–A5 per m² GIA, lower edges inclusive (Arnold et al. 2020). */
export const BANDS = [["A++", 0], ["A+", 50], ["A", 100], ["B", 150], ["C", 200], ["D", 250], ["E", 300], ["F", 350], ["G", 400]] as const;
export type Band = (typeof BANDS)[number][0];
export const scors = (perM2: number): Band => { let b: Band = "A++"; for (const [n, lo] of BANDS) if (perM2 >= lo) b = n; return b; };

/** Waste factor from the waste rate (2.4). */
export const wasteFactor = (wr: number) => 1 / (1 - wr) - 1;
/** Transport factor A4, kgCO2e/kg (2.2). */
export function a4Factor(tr: Transport, road = 0, sea = 0) {
  const s = tr === "custom" ? { road, sea } : SCENARIOS[tr];
  return s.road * TEF.road + s.sea * TEF.sea;
}

export type Element = "sub" | "frame" | "floors" | "roof" | "cores";
export const ELEMENTS: Record<Element, string> = { sub: "Substructure", frame: "Frame", floors: "Floors", roof: "Roof", cores: "Cores and walls" };

export interface RowIn {
  factor: Factor | null;   // null: the material is missing from the data
  kg: number | null;       // null: invalid quantity (or volume without density)
  el: Element; tr: Transport; road?: number; sea?: number;
  wr?: number;             // overrides the factor's waste rate
  cf?: number;             // custom A1–A3 factor, replaces the dataset's
  cert?: boolean;          // timber certified (biogenic counted); default true
}
export interface RowOut { kg: number; a13: number; a4: number; a5w: number; bio: number; c2: number; c34: number; d: number | null; ecf: { a13: number; a4: number; a5w: number; c34: number } }

export function computeRow(r: RowIn): RowOut | null {
  if (!r.factor || r.kg === null || !(r.kg >= 0)) return null;
  const f = r.factor, timber = f.group === "timber", q = r.kg;
  const a13 = r.cf ?? f.a1a3, a4 = a4Factor(r.tr, r.road, r.sea);
  const bio = timber && r.cert !== false ? (f.biogenic ?? BIO_TIMBER) : 0;
  const c34 = f.c3c4 ?? (timber ? C34_TIMBER : C34_DEFAULT);
  // waste (2.3): the wasted share carries its production, transport and end of life; for timber also its biogenic
  // carbon, which leaves again at the waste's end of life (this reproduces the guide's Appendix B, 0.004 for CLT)
  const a5w = wasteFactor(r.wr ?? f.wasteRate) * (a13 + bio + a4 + ECF_C2 + c34);
  return { kg: q, a13: q * a13, a4: q * a4, a5w: q * a5w, bio: q * bio, c2: q * ECF_C2, c34: q * c34, d: f.d === undefined ? null : q * f.d, ecf: { a13, a4, a5w, c34 } };
}

export interface OptionIn { gia: number; cost?: number; rows: RowIn[] }
export interface Totals {
  a13: number; a4: number; a5w: number; a5a: number | null; a15: number;
  bio: number; c1: number; c2: number; c34: number; ac: number; d: number; dMissing: number;
  perM2: { a15: number; ac: number; bio: number; d: number } | null; band: Band | null;
  byElement: Record<Element, number>; byRow: (number | null)[];   // A1–A5 per row (null: excluded)
}

/** A1–A5 (2.11), A–C (2.12) and D (2.13) for one option; per m² when GIA > 0. */
export function compute(o: OptionIn): Totals {
  const t = { a13: 0, a4: 0, a5w: 0, bio: 0, c2: 0, c34: 0, d: 0, dMissing: 0 };
  const byElement = Object.fromEntries(Object.keys(ELEMENTS).map((k) => [k, 0])) as Record<Element, number>;
  const byRow = o.rows.map((r) => {
    const x = computeRow(r);
    if (!x) return null;
    t.a13 += x.a13; t.a4 += x.a4; t.a5w += x.a5w; t.bio += x.bio; t.c2 += x.c2; t.c34 += x.c34;
    if (x.d === null) t.dMissing++; else t.d += x.d;
    const a15 = x.a13 + x.a4 + x.a5w;
    byElement[r.el] += a15;
    return a15;
  });
  const a5a = o.cost && o.cost > 0 ? (A5A_RATE * o.cost) / 100000 : null;
  const a15 = t.a13 + t.a4 + t.a5w + (a5a ?? 0);
  const c1 = o.gia > 0 ? C1_RATE * o.gia : 0;
  const ac = a15 + t.bio + c1 + t.c2 + t.c34;   // B4 = 0: the structure lasts the 60-year study period
  const perM2 = o.gia > 0 ? { a15: a15 / o.gia, ac: ac / o.gia, bio: t.bio / o.gia, d: t.d / o.gia } : null;
  return { ...t, a5a, a15, c1, ac, perM2, band: perM2 ? scors(perM2.a15) : null, byElement, byRow };
}

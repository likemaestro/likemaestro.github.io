// The calculator's state: up to three options, each with GIA, an optional cost and its material rows, plus the range
// settings. It travels in one URL parameter, s = base64url(JSON), checked against the schema before use.
import { factorById, type Factor } from "../carbon/factors";
import { ELEMENTS, SCENARIOS, type Element, type Transport } from "./calc";

export type Unit = "kg" | "t" | "m3";
export interface RowState { f: string; q: number | null; u: Unit; el: Element; tr: Transport; road?: number; sea?: number; wr?: number; cf?: number; cert?: boolean }
export interface OptionState { n: "A" | "B" | "C"; label: string; gia: number | null; cost?: number | null; rows: RowState[] }
export interface State { v: 1; o: OptionState[]; sf: number; sq: number; seed: number }

/** The single-storey pavilion of the IStructE guide's Appendix B (GIA 792 m², £800,000), with European factors. */
export const DEFAULT: State = {
  v: 1, sf: 0.2, sq: 0.1, seed: 7,
  o: [{
    n: "A", label: "Pavilion (IStructE example)", gia: 792, cost: 800000,
    rows: [
      { f: "concrete-c30-37", q: 116.6, u: "m3", el: "sub", tr: "local" },
      { f: "rebar", q: 10.5, u: "t", el: "sub", tr: "national" },
      { f: "steel-sections-eaf", q: 31.7, u: "t", el: "frame", tr: "national" },
      { f: "clt", q: 134.4, u: "m3", el: "roof", tr: "european" },
    ],
  }],
};

const UNITS: Unit[] = ["kg", "t", "m3"];
const TRANSPORTS = [...Object.keys(SCENARIOS), "custom"];
const isNum = (v: unknown, lo: number, hi: number) => typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi;
const optNum = (v: unknown, lo: number, hi: number) => v === undefined || v === null || isNum(v, lo, hi);

export function valid(s: unknown): s is State {
  const x = s as State;
  if (!x || x.v !== 1 || !Array.isArray(x.o) || x.o.length < 1 || x.o.length > 3) return false;
  if (!isNum(x.sf, 0, 0.9) || !isNum(x.sq, 0, 0.9) || !Number.isInteger(x.seed) || x.seed < 1 || x.seed > 999999) return false;
  const names = new Set<string>();
  for (const o of x.o) {
    if (!["A", "B", "C"].includes(o.n) || names.has(o.n)) return false;
    names.add(o.n);
    if (typeof o.label !== "string" || o.label.length > 40 || !optNum(o.gia, 0, 1e7) || !optNum(o.cost, 0, 1e11)) return false;
    if (!Array.isArray(o.rows) || o.rows.length > 200) return false;
    for (const r of o.rows) {
      if (typeof r.f !== "string" || r.f.length > 60 || !(r.q === null || isNum(r.q, 0, 1e9))) return false;
      if (!UNITS.includes(r.u) || !(r.el in ELEMENTS) || !TRANSPORTS.includes(r.tr)) return false;
      if (!optNum(r.road, 0, 40000) || !optNum(r.sea, 0, 40000) || !optNum(r.wr, 0, 0.9) || !optNum(r.cf, 0, 50)) return false;
      if (r.cert !== undefined && typeof r.cert !== "boolean") return false;
    }
  }
  return true;
}

const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
export const encode = (s: State) => b64url(new TextEncoder().encode(JSON.stringify(s)));
export function decode(v: string): State | null {
  try {
    const bin = atob(v.replace(/-/g, "+").replace(/_/g, "/")), bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const s = JSON.parse(new TextDecoder().decode(bytes));
    return valid(s) ? s : null;
  } catch { return null; }
}

/** Quantity in kg, or null with the reason. */
export function toKg(r: RowState, f: Factor | undefined): { kg: number | null; why?: string } {
  if (!f) return { kg: null, why: "This material is no longer in the data; choose another." };
  if (r.q === null || !(r.q >= 0)) return { kg: null, why: "Enter a quantity of 0 or more." };
  if (r.u === "kg") return { kg: r.q };
  if (r.u === "t") return { kg: 1000 * r.q };
  return f.density ? { kg: r.q * f.density } : { kg: null, why: "Enter mass for this material (no density in its data)." };
}
export const factorOf = (r: RowState) => factorById.get(r.f);

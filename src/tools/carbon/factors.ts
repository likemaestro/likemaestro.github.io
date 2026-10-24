// Carbon factors per kg of product, from ÖKOBAUDAT (EN 15804+A2), written by scripts/carbon-factors.py from the
// datasets listed in scripts/carbon-factors.config.json. Validated here, so a malformed file fails loudly.
import data from "./carbon-factors.json";

export type Group = "steel" | "concrete" | "rebar" | "timber" | "other";
export interface Factor {
  id: string; label: string; group: Group; unit: "kg";
  density: number | null;     // kg/m³, for volume input
  a1a3: number;               // kgCO2e/kg: GWP-fossil + GWP-luluc, A1–A3
  biogenic?: number;          // kgCO2e/kg: GWP-biogenic, A1–A3 (timber); reported apart
  c3c4?: number;              // kgCO2e/kg: GWP-total, C3 + C4, the dataset's default end-of-life scenario
  d?: number;                 // kgCO2e/kg: GWP-total, D; reported apart
  wasteRate: number;          // default waste rate for A5w (IStructE, 2nd ed., Table 2.6)
  source: { name: string; owner: string; uuid: string; version: string; referenceYear: string | number; validUntil: string | number;
    geography: string; declaredUnit: string; kgPerDeclaredUnit: number; scenario: string | null; url: string; license: string };
}
export interface FactorData { release: { name: string; stock: string; stockUuid: string; published: string }; factors: Factor[] }

const GROUPS: Group[] = ["steel", "concrete", "rebar", "timber", "other"];
const num = (v: unknown) => typeof v === "number" && Number.isFinite(v);

/** Throws on the first malformed entry; returns the data typed. */
export function validate(d: unknown): FactorData {
  const o = d as FactorData;
  if (!o || !o.release || !Array.isArray(o.factors) || !o.factors.length) throw new Error("carbon factors: no release or no factors");
  const ids = new Set<string>();
  for (const f of o.factors) {
    const where = `carbon factor ${f?.id ?? "?"}`;
    if (!f.id || ids.has(f.id)) throw new Error(`${where}: missing or duplicate id`);
    ids.add(f.id);
    if (!f.label || !GROUPS.includes(f.group) || f.unit !== "kg") throw new Error(`${where}: label, group or unit`);
    if (!num(f.a1a3) || f.a1a3 < 0 || f.a1a3 > 20) throw new Error(`${where}: A1–A3 out of range`);
    if (!num(f.wasteRate) || f.wasteRate < 0 || f.wasteRate >= 1) throw new Error(`${where}: waste rate`);
    if (f.density !== null && (!num(f.density) || f.density <= 0)) throw new Error(`${where}: density`);
    for (const k of ["biogenic", "c3c4", "d"] as const) if (f[k] !== undefined && !num(f[k])) throw new Error(`${where}: ${k}`);
    if (!f.source?.uuid || !f.source.url || !f.source.license) throw new Error(`${where}: source`);
  }
  return o;
}

export const FACTORS = validate(data);
export const factorById = new Map(FACTORS.factors.map((f) => [f.id, f]));

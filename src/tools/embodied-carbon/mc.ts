// The range: seeded Monte Carlo over the A1–A3 factors and the quantities (each within ± its spread, uniform),
// recomputing A1–A5 per m². The spreads are assumptions the visitor can change; the guide asks for a range to be
// reported (2.3.4), and the sampling follows Robati, Daly and Kokogiannakis (2019).
import { mulberry32 } from "../rng";
import { BANDS, compute, scors, type Band, type OptionIn } from "./calc";

export interface Range { p5: number; p50: number; p95: number; shares: Record<Band, number> }

const quantile = (s: number[], p: number) => { const r = p * (s.length - 1), i = Math.floor(r); return i + 1 < s.length ? s[i] + (r - i) * (s[i + 1] - s[i]) : s[i]; };

export function range(o: OptionIn, sf: number, sq: number, seed: number, n = 2000): Range | null {
  if (!(o.gia > 0)) return null;
  const rng = mulberry32(seed), out: number[] = [];
  for (let k = 0; k < n; k++) {
    const rows = o.rows.map((r) => {
      if (!r.factor || r.kg === null) return r;
      const u = 1 + sf * (2 * rng() - 1), v = 1 + sq * (2 * rng() - 1);
      return { ...r, kg: r.kg * v, cf: (r.cf ?? r.factor.a1a3) * u };
    });
    out.push(compute({ ...o, rows }).perM2!.a15);
  }
  out.sort((a, b) => a - b);
  const shares = Object.fromEntries(BANDS.map(([b]) => [b, 0])) as Record<Band, number>;
  for (const v of out) shares[scors(v)] += 1 / n;
  return { p5: quantile(out, 0.05), p50: quantile(out, 0.5), p95: quantile(out, 0.95), shares };
}

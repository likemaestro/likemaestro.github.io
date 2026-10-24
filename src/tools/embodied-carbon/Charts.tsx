// The calculator's charts, hand-written SVG and HTML: the SCORS ladder, the range's band shares, bars by element and
// by material, and the comparison of options. Greys only, with letters as the primary cue (the original SCORS colors
// are not used).
import React from "react";
import { BANDS, type Band } from "./calc";
import type { Range } from "./mc";

const GREYS = ["#EEF0EE", "#E2E6E5", "#D5DBDC", "#C3CBCE", "#ADB8BD", "#97A4AB", "#818F98", "#68767F", "#4F5D68"];
const fmt = (v: number) => Math.round(v).toLocaleString("en-US").replace(/,/g, " ");

/** Nine stepped bars, A++ shortest; the option's band marked with an arrow and its value. */
export const ScorsLadder: React.FC<{ value: number | null; band: Band | null }> = ({ value, band }) => {
  const H = 15, G = 3, W = 300, L = 40;
  return (
    <figure className="min-w-0">
      <svg viewBox={`0 0 ${W + 70} ${BANDS.length * (H + G)}`} className="block w-full max-w-[24rem]" role="img"
        aria-label={value === null ? "SCORS rating: enter the gross internal area." : `SCORS rating ${band}: ${fmt(value)} kgCO2e per m², A1 to A5.`}>
        {BANDS.map(([b, lo], i) => {
          const y = i * (H + G), w = L + ((W - L) * (i + 1)) / BANDS.length, on = b === band;
          return <g key={b}>
            <rect x={0} y={y} width={w} height={H} fill={GREYS[i]} stroke={on ? "#172027" : "none"} strokeWidth={on ? 1.5 : 0} />
            <text x={6} y={y + H - 4} fontSize="10.5" fontWeight={on ? 700 : 500} fill={i >= 6 ? "#F6F7F5" : "#172027"}>{b}</text>
            <text x={w - 5} y={y + H - 4} fontSize="9.5" textAnchor="end" fill={i >= 6 ? "#F6F7F5" : "#4F5D68"}>{i === BANDS.length - 1 ? `≥ ${lo}` : `${lo}–${BANDS[i + 1][1]}`}</text>
            {on && value !== null && <g>
              <path d={`M${w + 6} ${y + H / 2}l7 -5v10z`} fill="#172027" />
              <text x={w + 16} y={y + H - 3.5} fontSize="11" fontWeight={600} fill="#172027">{fmt(value)}</text>
            </g>}
          </g>;
        })}
      </svg>
      <figcaption className="t-small mt-1 text-ink-2">After the IStructE SCORS rating (Arnold et al. 2020), redrawn; kgCO2e/m², A1–A5.</figcaption>
    </figure>
  );
};

/** The range's shares of each band, as one stacked bar with letter labels. */
export const BandShares: React.FC<{ r: Range }> = ({ r }) => {
  const parts = BANDS.map(([b], i) => ({ b, s: r.shares[b], g: GREYS[i], dark: i >= 6 })).filter((p) => p.s >= 0.005);   // under 0.5 % would print as 0 %
  return (
    <div>
      <div className="flex h-5 w-full overflow-hidden border border-rule" role="img" aria-label={`Share of the range in each band: ${parts.map((p) => `${p.b} ${Math.round(100 * p.s)} %`).join(", ")}.`}>
        {parts.map((p) => <div key={p.b} className="t-small flex items-center justify-center overflow-hidden" style={{ width: `${100 * p.s}%`, background: p.g, color: p.dark ? "#F6F7F5" : "#172027" }}>{p.s > 0.08 ? p.b : ""}</div>)}
      </div>
      <p className="t-small mt-1 text-ink-2">{parts.map((p) => `${p.b} ${Math.round(100 * p.s)} %`).join(" · ")}</p>
    </div>
  );
};

/** Horizontal bars with labels and values in tCO2e. */
export const Bars: React.FC<{ title: string; items: { label: string; v: number }[] }> = ({ title, items }) => {
  const shown = items.filter((x) => x.v !== 0), max = Math.max(1, ...shown.map((x) => Math.abs(x.v)));
  if (!shown.length) return null;
  return (
    <section className="min-w-0">
      <h4 className="t-small font-[520] text-ink">{title}</h4>
      <ul className="mt-1.5 flex flex-col gap-1">
        {shown.map((x) => (
          <li key={x.label} className="t-small grid grid-cols-[minmax(0,7.5rem)_1fr_auto] items-center gap-2">
            <span className="truncate text-ink-2" title={x.label}>{x.label}</span>
            <span className="h-2.5 bg-ink-2" style={{ width: `${(100 * Math.abs(x.v)) / max}%` }} aria-hidden="true" />
            <span className="t-data text-right">{fmt(x.v / 1000)} t</span>
          </li>
        ))}
      </ul>
    </section>
  );
};

/** One bar per option at its A1–A5 per m², with P5–P95 whiskers, over the SCORS bands. */
export const Compare: React.FC<{ items: { name: string; label: string; v: number | null; r: Range | null }[] }> = ({ items }) => {
  const W = 640, ML = 92, MR = 16, rowH = 30, top = 22, vals = items.flatMap((x) => [x.v ?? 0, x.r?.p95 ?? 0]);
  const hi = Math.max(250, Math.ceil(Math.max(...vals) / 50) * 50 + 50), H = top + items.length * rowH + 22;
  const sx = (v: number) => ML + (v / hi) * (W - ML - MR);
  return (
    <figure className="min-w-0">
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label={`Comparison, A1 to A5 per m²: ${items.map((x) => `option ${x.name} ${x.v === null ? "no area" : `${fmt(x.v)}${x.r ? `, range ${fmt(x.r.p5)} to ${fmt(x.r.p95)}` : ""}`}`).join("; ")}.`}>
        {BANDS.map(([b, lo], i) => {
          const x0 = sx(lo), x1 = sx(i + 1 < BANDS.length ? BANDS[i + 1][1] : hi);
          return x0 < W - MR && <g key={b}>
            <rect x={x0} y={top - 4} width={Math.max(0, Math.min(x1, W - MR) - x0)} height={H - top - 18} fill={i % 2 ? "#F6F7F5" : "#EEF0EE"} />
            <text x={(x0 + Math.min(x1, W - MR)) / 2} y={top - 8} fontSize="10" textAnchor="middle" fill="#4F5D68">{b}</text>
          </g>;
        })}
        {items.map((x, i) => {
          const y = top + i * rowH + 6;
          return <g key={x.name}>
            <text x={ML - 8} y={y + 11} fontSize="11" textAnchor="end" fill="#172027">{`${x.name} · ${x.label.length > 12 ? x.label.slice(0, 11) + "…" : x.label}`}<title>{x.label}</title></text>
            {x.v !== null && <rect x={ML} y={y} width={Math.max(1, sx(x.v) - ML)} height={14} fill="#172027" />}
            {x.r && <path d={`M${sx(x.r.p5)} ${y + 7}H${sx(x.r.p95)}M${sx(x.r.p5)} ${y + 2}v10M${sx(x.r.p95)} ${y + 2}v10`} stroke="#F05A24" strokeWidth="1.6" />}
            {x.v !== null && <text x={sx(Math.max(x.v, x.r?.p95 ?? 0)) + 6} y={y + 11} fontSize="11" fill="#172027">{fmt(x.v)}</text>}
          </g>;
        })}
        {[0, 100, 200, 300, 400, 500, 600, 700, 800].filter((v) => v <= hi).map((v) => <text key={v} x={sx(v)} y={H - 6} fontSize="10" textAnchor="middle" fill="#4F5D68">{v}</text>)}
      </svg>
      <figcaption className="t-small mt-1 text-ink-2">A1–A5 in kgCO2e/m² GIA; orange whiskers: P5–P95 of the range; letters: SCORS bands.</figcaption>
    </figure>
  );
};

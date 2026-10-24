// The surrogate's evidence, as hand-written SVG with a table behind each chart: leave-one-out predictions against FE,
// the GA's best predicted-feasible mass by generation, the rounds of verification, and a 2D elevation for browsers
// without WebGL2.
import React, { useState } from "react";
import { Segmented } from "../controls";
import { BEAMS, COLUMNS, MODEL, type Design } from "./frame";
import { OUTS, type Out, type Round } from "./surrogate";

export const OUT_LABEL: Record<Out, string> = { drift: "Drift", uCL: "Columns 1–3", uCU: "Columns 4–6", uB: "Beams", acr: "αcr" };
export const designName = (d: Design) => `${COLUMNS[d.cL].replace("HEB", "HEB ")}, ${COLUMNS[d.cU].replace("HEB", "HEB ")}, ${BEAMS[d.bm].replace("IPE", "IPE ")}`;
export const fmtOut = (o: Out, v: number) => (o === "drift" ? `1/${Math.round(1 / v)}` : o === "acr" ? v.toFixed(1) : v.toFixed(2));

function logTicks(lo: number, hi: number) {
  const out: number[] = [];
  for (let e = Math.floor(Math.log10(lo)); e <= Math.ceil(Math.log10(hi)); e++) for (const m of [1, 2, 5]) { const v = m * 10 ** e; if (v >= lo && v <= hi) out.push(v); }
  return out.length >= 2 ? out : [lo, hi];
}

const Frame: React.FC<{ title: string; table: React.ReactNode; children: React.ReactNode; note?: React.ReactNode }> = ({ title, table, children, note }) => {
  const [show, setShow] = useState(false);
  return (
    <section className="min-w-0">
      <h3 className="font-[520]">{title}</h3>
      <div className="mt-2">{children}</div>
      {note && <p className="t-small mt-2 text-ink-2">{note}</p>}
      <button type="button" className="btn mt-3" aria-expanded={show} onClick={() => setShow((v) => !v)}>{show ? "Hide the table" : "Show as table"}</button>
      {show && <div className="mt-3 max-h-72 overflow-auto">{table}</div>}
    </section>
  );
};

/** Leave-one-out: each FE run predicted by the GP trained on the others (log axes, ±2σ whiskers, the 45° line). */
export const LooChart: React.FC<{ loo: Record<Out, { mu: number[]; sd: number[]; y: number[]; r2: number; worst: number }> | null }> = ({ loo }) => {
  const [o, setO] = useState<Out>("drift");
  const W = 300, H = 220, M = { l: 44, r: 10, t: 10, b: 34 };
  const s = loo?.[o];
  const ys = s ? s.y.map(Math.exp) : [], lo = s ? s.mu.map((m, i) => Math.exp(m - 2 * s.sd[i])) : [], hi = s ? s.mu.map((m, i) => Math.exp(m + 2 * s.sd[i])) : [];
  const all = [...ys, ...(s ? s.mu.map(Math.exp) : [])];
  const a = all.length ? Math.min(...all) / 1.15 : 0.1, b = all.length ? Math.max(...all) * 1.15 : 1;
  const sx = (v: number) => M.l + ((Math.log(v) - Math.log(a)) / (Math.log(b) - Math.log(a))) * (W - M.l - M.r);
  const sy = (v: number) => H - M.b - ((Math.log(Math.min(b, Math.max(a, v))) - Math.log(a)) / (Math.log(b) - Math.log(a))) * (H - M.t - M.b);
  const tick = (v: number) => (o === "drift" ? `1/${Math.round(1 / v)}` : v >= 10 ? v.toFixed(0) : v.toPrecision(2));
  return (
    <Frame title="Leave-one-out accuracy"
      note={s ? `${OUT_LABEL[o]}: R² ${s.r2.toFixed(3)} in log space; largest error ${Math.round(100 * s.worst)} %. Each point is one FE run, predicted by a GP fitted without it (same hyperparameters).` : "Not trained yet."}
      table={s && <table className="t-data w-full border-collapse text-left"><caption className="sr-only">Leave-one-out predictions of {OUT_LABEL[o]}</caption>
        <thead><tr className="border-b border-ink"><th className="py-1 pr-3 font-[520]" scope="col">Run</th><th className="py-1 pr-3 font-[520]" scope="col">FE</th><th className="py-1 pr-3 font-[520]" scope="col">GP without it</th><th className="py-1 font-[520]" scope="col">±2σ band</th></tr></thead>
        <tbody>{ys.map((y, i) => <tr key={i} className="border-b border-rule"><td className="py-1 pr-3">{i + 1}</td><td className="py-1 pr-3">{fmtOut(o, y)}</td><td className="py-1 pr-3">{fmtOut(o, Math.exp(s.mu[i]))}</td><td className="py-1">{fmtOut(o, lo[i])} to {fmtOut(o, hi[i])}</td></tr>)}</tbody></table>}>
      <Segmented label="Output" value={o} onChange={(v) => setO(v as Out)} options={OUTS.map((k) => ({ v: k, text: k === "drift" ? "Drift" : k === "acr" ? "αcr" : k === "uB" ? "uB" : k }))} />
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 block w-full" role="img" aria-label={s ? `Leave-one-out predictions of ${OUT_LABEL[o]} against FE, ${ys.length} runs, R squared ${s.r2.toFixed(2)}.` : "No data yet."}>
        <g stroke="#CBD2D5"><line x1={M.l} x2={W - M.r} y1={H - M.b} y2={H - M.b} /><line x1={M.l} x2={M.l} y1={M.t} y2={H - M.b} /></g>
        {s && <>
          <line x1={sx(a)} y1={sy(a)} x2={sx(b)} y2={sy(b)} stroke="#CBD2D5" strokeDasharray="4 3" />
          <g className="fill-ink-2" fontSize="10">
            {logTicks(a, b).map((v) => <text key={`x${v}`} x={sx(v)} y={H - M.b + 13} textAnchor="middle">{tick(v)}</text>)}
            {logTicks(a, b).map((v) => <text key={`y${v}`} x={M.l - 5} y={sy(v) + 3} textAnchor="end">{tick(v)}</text>)}
            <text x={(M.l + W - M.r) / 2} y={H - 3} textAnchor="middle">FE</text>
            <text x={10} y={(M.t + H - M.b) / 2} textAnchor="middle" transform={`rotate(-90 10 ${(M.t + H - M.b) / 2})`}>GP, leave-one-out</text>
          </g>
          <g stroke="#4F5D68" strokeWidth="1">{ys.map((y, i) => <line key={i} x1={sx(y)} x2={sx(y)} y1={sy(lo[i])} y2={sy(hi[i])} />)}</g>
          <g fill="#172027">{ys.map((y, i) => <circle key={i} cx={sx(y)} cy={sy(Math.exp(s.mu[i]))} r={2.6} />)}</g>
        </>}
      </svg>
    </Frame>
  );
};

/** The GA's best predicted-feasible mass, generation by generation. */
export const GaChart: React.FC<{ history: (number | null)[] | null }> = ({ history }) => {
  const W = 300, H = 160, M = { l: 40, r: 10, t: 10, b: 30 };
  const v = (history ?? []).map((x, g) => [g, x] as const).filter((p): p is readonly [number, number] => p[1] !== null);
  const lo = v.length ? Math.min(...v.map((p) => p[1])) : 0, hi = v.length ? Math.max(...v.map((p) => p[1])) : 1, pad = Math.max(0.5, (hi - lo) * 0.1);
  const n = Math.max(1, (history?.length ?? 1) - 1);
  const sx = (g: number) => M.l + (g / n) * (W - M.l - M.r), sy = (m: number) => H - M.b - ((m - (lo - pad)) / (hi - lo + 2 * pad)) * (H - M.t - M.b);
  return (
    <Frame title="Genetic algorithm on the GP"
      note={history ? (v.length ? `Best predicted-feasible mass ${v[v.length - 1][1].toFixed(1)} t after ${n} generations, every evaluation on the surrogate.` : "No design the surrogate calls feasible.") : "Press Optimize."}
      table={history && <table className="t-data w-full border-collapse text-left"><caption className="sr-only">Best predicted-feasible mass per generation</caption>
        <thead><tr className="border-b border-ink"><th className="py-1 pr-3 font-[520]" scope="col">Generation</th><th className="py-1 font-[520]" scope="col">Mass, t</th></tr></thead>
        <tbody>{history.map((m, g) => <tr key={g} className="border-b border-rule"><td className="py-1 pr-3">{g}</td><td className="py-1">{m === null ? "none feasible" : m.toFixed(2)}</td></tr>)}</tbody></table>}>
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label={v.length ? `Best predicted-feasible mass falls to ${v[v.length - 1][1].toFixed(1)} tonnes over ${n} generations.` : "No data yet."}>
        <g stroke="#CBD2D5"><line x1={M.l} x2={W - M.r} y1={H - M.b} y2={H - M.b} /><line x1={M.l} x2={M.l} y1={M.t} y2={H - M.b} /></g>
        {v.length > 0 && <>
          <g className="fill-ink-2" fontSize="10">
            {[0, Math.round(n / 2), n].map((g) => <text key={g} x={sx(g)} y={H - M.b + 13} textAnchor="middle">{g}</text>)}
            {[lo, hi].map((m) => <text key={m} x={M.l - 5} y={sy(m) + 3} textAnchor="end">{m.toFixed(0)}</text>)}
            <text x={(M.l + W - M.r) / 2} y={H - 3} textAnchor="middle">Generation</text>
            <text x={10} y={(M.t + H - M.b) / 2} textAnchor="middle" transform={`rotate(-90 10 ${(M.t + H - M.b) / 2})`}>Mass, t</text>
          </g>
          <path d={v.map(([g, m], i) => `${i ? "L" : "M"}${sx(g).toFixed(1)} ${sy(m).toFixed(1)}`).join("")} fill="none" stroke="#172027" strokeWidth="1.5" />
        </>}
      </svg>
    </Frame>
  );
};

/** One row per verification round, then the exhaustive optimum if it was run. */
export const RoundsTable: React.FC<{ rounds: Round[]; outdated: boolean; exhaustive: { d: Design; mass: number } | null; lim: number }> = ({ rounds, outdated, exhaustive, lim }) => (
  <section className="min-w-0">
    <h3 className="font-[520]">Verification rounds</h3>
    {rounds.length === 0 && !exhaustive ? <p className="t-small mt-2 text-ink-2">Press Verify after Optimize: the frame model checks the GA’s answer.</p> : (
      <div className="mt-2 overflow-x-auto">
        <table className={`t-data w-full min-w-[22rem] border-collapse text-left ${outdated ? "opacity-50" : ""}`}>
          <caption className="sr-only">Verification rounds{outdated ? ", outdated" : ""}</caption>
          <thead><tr className="border-b border-ink">{["Round", "Design", "GP said", "FE says", "Verdict"].map((h) => <th key={h} scope="col" className="py-1 pr-3 font-[520]">{h}</th>)}</tr></thead>
          <tbody>
            {rounds.map((r) => {
              const worst = (x: Record<string, number>) => Math.max(x.uCL, x.uCU, x.uB);
              const gp = { uCL: r.predicted.uCL.mu, uCU: r.predicted.uCU.mu, uB: r.predicted.uB.mu };
              return (
                <tr key={r.round} className="border-b border-rule align-top motion-safe:animate-fade-in">
                  <td className="py-1 pr-3">{r.round}</td>
                  <td className="py-1 pr-3">{designName(r.d)}</td>
                  <td className="py-1 pr-3">drift 1/{Math.round(1 / r.predicted.drift.mu)}, u {worst(gp).toFixed(2)}</td>
                  <td className="py-1 pr-3">drift 1/{Math.round(1 / r.fe.drift)}, u {worst(r.fe).toFixed(2)}, αcr {r.fe.acr.toFixed(1)}</td>
                  <td className="py-1 pr-3">{r.verdict}</td>
                </tr>
              );
            })}
            {exhaustive && <tr className="border-b border-rule"><td className="py-1 pr-3">All</td><td className="py-1 pr-3">{designName(exhaustive.d)}</td><td className="py-1 pr-3">–</td><td className="py-1 pr-3">{exhaustive.mass.toFixed(1)} t</td><td className="py-1 pr-3">the lightest FE-feasible design in the catalog (h/{lim})</td></tr>}
          </tbody>
        </table>
        {outdated && <p className="t-small mt-1 text-ink-2">Outdated: the caution or the limit changed. Verify again.</p>}
      </div>
    )}
  </section>
);

/** Fallback without WebGL2: the y-direction frame at x = 6 m in elevation, members greyed by utilization. */
export const Elevation: React.FC<{ grey: (g: number) => string; hatch: (g: number) => boolean }> = ({ grey, hatch }) => {
  const { b } = MODEL, w = b.ny * b.sy, h = b.storeys * b.h, pad = 900;
  return (
    <svg viewBox={`${-pad} ${-h - pad} ${w + 2 * pad} ${h + 2 * pad}`} className="mx-auto block h-full max-w-full" role="img" aria-label="Elevation of one frame across the building, members greyed by utilization.">
      <defs><pattern id="sf-hatch" width="400" height="400" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="400" height="400" fill="#FFFFFF" fillOpacity="0" /><line x1="0" y1="0" x2="0" y2="400" stroke="#172027" strokeWidth="140" /></pattern></defs>
      <line x1={-pad} x2={w + pad} y1={0} y2={0} stroke="#CBD2D5" strokeWidth="40" />
      {Array.from({ length: b.storeys }, (_, k) => [0, 1, 2].map((iy) => {
        const g = k < b.lower ? 0 : 1;
        return <g key={`c${k}${iy}`}><line x1={iy * b.sy} x2={iy * b.sy} y1={-k * b.h} y2={-(k + 1) * b.h} stroke={grey(g)} strokeWidth="300" />{hatch(g) && <line x1={iy * b.sy} x2={iy * b.sy} y1={-k * b.h} y2={-(k + 1) * b.h} stroke="url(#sf-hatch)" strokeWidth="300" />}</g>;
      }))}
      {Array.from({ length: b.storeys }, (_, k) => [0, 1].map((iy) => (
        <g key={`b${k}${iy}`}><line x1={iy * b.sy} x2={(iy + 1) * b.sy} y1={-(k + 1) * b.h} y2={-(k + 1) * b.h} stroke={grey(2)} strokeWidth="400" />{hatch(2) && <line x1={iy * b.sy} x2={(iy + 1) * b.sy} y1={-(k + 1) * b.h} y2={-(k + 1) * b.h} stroke="url(#sf-hatch)" strokeWidth="400" />}</g>
      )))}
    </svg>
  );
};

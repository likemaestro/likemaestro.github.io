// The chord tool's charts, hand-written SVG with a table behind each: the spectrum of the chord, healthy days by
// frequency change and anomaly score, the autoencoder's latent plane, the two health bars, the residuals per mode and
// the training loss.
import React, { useEffect, useRef, useState } from "react";
import type { Env } from "./building";

const Toggle: React.FC<{ table: React.ReactNode }> = ({ table }) => {
  const [show, setShow] = useState(false);
  return <>
    <button type="button" className="btn mt-3" aria-expanded={show} onClick={() => setShow((v) => !v)}>{show ? "Hide the table" : "Show as table"}</button>
    {show && <div className="mt-3 max-h-64 overflow-auto">{table}</div>}
  </>;
};
const Th: React.FC<{ children: React.ReactNode }> = ({ children }) => <th scope="col" className="py-1 pr-3 font-[520]">{children}</th>;

export interface Bar { mode: number; fPhys: number; f: number; a: number }

/** The chord: one bar per sounding mode at its audible frequency K·f, labeled with the physical frequency. */
export const Spectrum: React.FC<{ ref_: Bar[]; cur: Bar[]; playing: "none" | "current" | "healthy" | "both"; K: number }> = ({ ref_, cur, playing, K }) => {
  const W = 600, H = 112, M = { l: 8, r: 8, t: 8, b: 26 };
  const all = [...ref_, ...cur], lo = Math.min(100, ...all.map((p) => p.f)) * 0.95, hi = Math.max(200, ...all.map((p) => p.f)) * 1.04;
  const sx = (f: number) => M.l + ((f - lo) / (hi - lo)) * (W - M.l - M.r), sy = (a: number) => H - M.b - a * (H - M.t - M.b);
  const lit = (healthy: boolean) => playing === "both" || (healthy ? playing === "healthy" : playing === "current");
  const label = `Chord: ${cur.map((p) => `${p.fPhys.toFixed(2)} hertz`).join(", ")}.`;
  // a label that would overlap the previous one in its row drops to a second row; widths measured in px
  const box = useRef<HTMLDivElement>(null), [cw, setCw] = useState(600), LW = 56;   // a label's width with a gap
  useEffect(() => { const el = box.current; if (!el) return; const ro = new ResizeObserver(() => setCw(el.clientWidth)); ro.observe(el); return () => ro.disconnect(); }, []);
  const end = [-Infinity, -Infinity], tags = [...cur].sort((a, b) => a.f - b.f).map((p) => {
    const left = (sx(p.f) / W) * 100, shift = left < 8 ? 0.1 : left > 92 ? 0.9 : 0.5, start = (left / 100) * cw - shift * LW;
    const row = start >= end[0] || start < end[1] ? 0 : 1;
    end[row] = start + LW;
    return { p, left, shift, row };
  });
  return (
    <figure className="min-w-0">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-28 w-full" preserveAspectRatio="none" role="img" aria-label={label}>
        <line x1={M.l} x2={W - M.r} y1={H - M.b} y2={H - M.b} stroke="#CBD2D5" vectorEffect="non-scaling-stroke" />
        {ref_.map((p) => <rect key={`r${p.mode}`} x={sx(p.f) - 5} y={sy(p.a)} width={10} height={H - M.b - sy(p.a)} fill="none" stroke={lit(true) ? "#F05A24" : "#4F5D68"} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />)}
        {cur.map((p) => <rect key={`c${p.mode}`} x={sx(p.f) - 3} y={sy(p.a)} width={6} height={H - M.b - sy(p.a)} fill={lit(false) ? "#F05A24" : "#172027"} />)}
      </svg>
      <div ref={box} className={`t-small relative text-ink-2 ${tags.some((t) => t.row) ? "h-10" : "h-5"}`} aria-hidden="true">
        {tags.map(({ p, left, shift, row }) => <span key={p.mode} className="absolute whitespace-nowrap" style={{ left: `${left}%`, top: `${1.25 * row}rem`, transform: `translateX(${-100 * shift}%)` }}>{p.fPhys.toFixed(2)} Hz</span>)}
      </div>
      <figcaption className="t-small mt-1 text-ink-2">Filled: now; outlined: healthy. Each bar sounds at K·f with K = {K.toFixed(1)} (the first healthy mode at 110 Hz); labels give the building’s own frequency.</figcaption>
      <Toggle table={<table className="t-data w-full border-collapse text-left"><caption className="sr-only">The chord</caption>
        <thead><tr className="border-b border-ink"><Th>Mode</Th><Th>Building, Hz</Th><Th>Heard, Hz</Th><Th>Loudness</Th></tr></thead>
        <tbody>{cur.map((p) => <tr key={p.mode} className="border-b border-rule"><td className="py-1 pr-3">{p.mode + 1}</td><td className="py-1 pr-3">{p.fPhys.toFixed(2)}</td><td className="py-1 pr-3">{p.f.toFixed(1)}</td><td className="py-1">{p.a.toFixed(2)}</td></tr>)}</tbody></table>} />
    </figure>
  );
};

/** Healthy days by first-frequency change and autoencoder score: weather and occupancy move a day sideways; damage can lift
 *  it above the threshold while moving it less. x as a fraction of the healthy reference, y as a multiple of the threshold. */
export const Shift: React.FC<{ x: number[]; y: number[]; current: [number, number] | null; reference: [number, number] | null }> = ({ x, y, current, reference }) => {
  const W = 320, H = 240, M = { l: 38, r: 10, t: 10, b: 30 };
  const xs = [...x, ...(current ? [current[0]] : []), 0], ys = [...y, ...(current ? [current[1]] : []), ...(reference ? [reference[1]] : [])].filter((v) => v > 0);
  const x0 = Math.min(...xs) - 0.005, x1 = Math.max(...xs) + 0.005;
  const l0 = Math.floor(Math.log10(Math.min(0.01, ...ys))), l1 = Math.log10(Math.max(3, ...ys)) + 0.1;   // at least up to 3 × the threshold; also while there are no days yet
  const sx = (v: number) => M.l + ((v - x0) / (x1 - x0)) * (W - M.l - M.r), sy = (v: number) => H - M.b - ((Math.log10(Math.max(v, 10 ** l0)) - l0) / (l1 - l0)) * (H - M.t - M.b);
  const span = 100 * (x1 - x0), step = span > 12 ? 4 : span > 6 ? 2 : 1;
  const xt: number[] = [];
  for (let t = Math.ceil((100 * x0) / step) * step; t <= 100 * x1; t += step) xt.push(t);
  const yt = Array.from({ length: Math.floor(l1) - l0 + 1 }, (_, i) => 10 ** (l0 + i));
  const pct = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(100 * v).toFixed(1)} %`, above = y.filter((v) => v > 1).length;
  const label = x.length
    ? `${x.length} healthy days: the first frequency moves from ${pct(Math.min(...x))} to ${pct(Math.max(...x))}; ${above} of them score above the threshold.${current ? ` Now: ${pct(current[0])}, ${current[1].toFixed(2)} times the threshold, ${current[1] > 1 ? "flagged" : "normal"}.` : ""}`
    : "Training: no days yet.";
  return (
    <section className="min-w-0">
      <h3 className="font-[520]">A warm day or damage?</h3>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 block w-full max-w-[22rem]" role="img" aria-label={label}>
        {xt.map((t) => <g key={`x${t}`}><line x1={sx(t / 100)} x2={sx(t / 100)} y1={M.t} y2={H - M.b} stroke="#EEF0EE" /><text x={sx(t / 100)} y={H - M.b + 13} textAnchor="middle" fontSize="10" className="fill-ink-2">{t > 0 ? `+${t}` : t < 0 ? `−${-t}` : "0"}</text></g>)}
        {yt.map((t) => <text key={`y${t}`} x={M.l - 5} y={sy(t) + 3} textAnchor="end" fontSize="10" className="fill-ink-2">{t}</text>)}
        <line x1={M.l} x2={W - M.r} y1={H - M.b} y2={H - M.b} stroke="#CBD2D5" />
        <line x1={M.l} x2={M.l} y1={M.t} y2={H - M.b} stroke="#CBD2D5" />
        {x.map((v, i) => <circle key={i} cx={sx(v)} cy={sy(y[i])} r={1.6} fill="#819199" fillOpacity={0.55} />)}
        <line x1={M.l} x2={W - M.r} y1={sy(1)} y2={sy(1)} stroke="#F05A24" strokeWidth="1.4" />
        <text x={W - M.r - 2} y={sy(1) - 4} textAnchor="end" fontSize="10" className="fill-ink-2">threshold</text>
        {reference && <circle cx={sx(reference[0])} cy={sy(reference[1])} r={6} fill="none" stroke="#172027" strokeWidth="1.4" />}
        {current && <circle cx={sx(current[0])} cy={sy(current[1])} r={4.5} fill="#F05A24" stroke="#172027" strokeWidth="1" />}
        <text x={(M.l + W - M.r) / 2} y={H - 3} textAnchor="middle" fontSize="10" className="fill-ink-2">first frequency against the healthy reference, %</text>
        <text transform={`translate(10 ${(M.t + H - M.b) / 2}) rotate(-90)`} textAnchor="middle" fontSize="10" className="fill-ink-2">autoencoder score, × threshold</text>
      </svg>
      <p className="t-small mt-2 text-ink-2">Each grey dot is one of the 1,000 healthy days the threshold was set on (log scale up the side). Weather and occupancy move a day sideways. Damage changes how the modes relate to each other, which can lift a day above the line even when its frequencies move less. Ring: the healthy reference; orange: now. Both are computed without the 0.2 % measurement noise the grey days carry, which is why the ring sits below them.</p>
      <Toggle table={<table className="t-data w-full border-collapse text-left"><caption className="sr-only">Healthy days and the current state</caption>
        <thead><tr className="border-b border-ink"><Th>State</Th><Th>First frequency</Th><Th>Score, × threshold</Th></tr></thead>
        <tbody>
          <tr className="border-b border-rule"><td className="py-1 pr-3">{x.length} healthy days</td><td className="py-1 pr-3">{x.length ? `${pct(Math.min(...x))} to ${pct(Math.max(...x))}` : "–"}</td><td className="py-1">{x.length ? `${above} above 1` : "–"}</td></tr>
          {reference && <tr className="border-b border-rule"><td className="py-1 pr-3">Healthy reference</td><td className="py-1 pr-3">{pct(reference[0])}</td><td className="py-1">{reference[1].toFixed(2)}</td></tr>}
          {current && <tr className="border-b border-rule"><td className="py-1 pr-3">Now</td><td className="py-1 pr-3">{pct(current[0])}</td><td className="py-1">{current[1].toFixed(2)}</td></tr>}
        </tbody></table>} />
    </section>
  );
};

const ramp = (u: number) => { const t = Math.min(1, Math.max(0, u)), c = [0x81, 0x91, 0x99].map((v, i) => Math.round(v + ([0x17, 0x20, 0x27][i] - v) * t)); return `rgb(${c.join(",")})`; };

/** The training days in the autoencoder's two-number bottleneck, greyed by temperature or occupancy. */
export const Latent: React.FC<{ codes: [number, number][]; env: Env[]; by: "temp" | "occ"; current: [number, number] | null; reference: [number, number] | null; onBy: (v: "temp" | "occ") => void }> = ({ codes, env, by, current, reference, onBy }) => {
  const S = 240, pad = 14, xs = codes.map((c) => c[0]), ys = codes.map((c) => c[1]);
  const all = [...xs, ...(current ? [current[0]] : []), ...(reference ? [reference[0]] : [])], allY = [...ys, ...(current ? [current[1]] : []), ...(reference ? [reference[1]] : [])];
  const x0 = Math.min(...all, -1), x1 = Math.max(...all, 1), y0 = Math.min(...allY, -1), y1 = Math.max(...allY, 1);
  const sx = (v: number) => pad + ((v - x0) / (x1 - x0)) * (S - 2 * pad), sy = (v: number) => S - pad - ((v - y0) / (y1 - y0)) * (S - 2 * pad);
  const shade = (e: Env) => (by === "temp" ? ramp((e.T + 10) / 45) : ramp((e.occ - 0.1) / 0.5));
  return (
    <section className="min-w-0">
      <h3 className="font-[520]">What the autoencoder learned</h3>
      <div className="mt-2 flex items-center gap-2">
        {(["temp", "occ"] as const).map((v) => <button key={v} type="button" className={`btn ${by === v ? "btn-solid" : ""}`} aria-pressed={by === v} onClick={() => onBy(v)}>{v === "temp" ? "Temperature" : "Occupancy"}</button>)}
      </div>
      <svg viewBox={`0 0 ${S} ${S}`} className="mt-2 block aspect-square w-full max-w-[16rem] border border-rule" role="img" aria-label={`${codes.length} healthy training days in the two-number code, greyed by ${by === "temp" ? "temperature" : "occupancy"}${current ? "; the orange dot is the current state" : ""}.`}>
        {codes.length > 0 && codes.map((c, i) => <circle key={i} cx={sx(c[0])} cy={sy(c[1])} r={1.6} fill={shade(env[i])} />)}
        {reference && <circle cx={sx(reference[0])} cy={sy(reference[1])} r={6} fill="none" stroke="#172027" strokeWidth="1.4" />}
        {current && <circle cx={sx(current[0])} cy={sy(current[1])} r={4.5} fill="#F05A24" stroke="#172027" strokeWidth="1" className="motion-safe:transition-all motion-safe:duration-200" />}
      </svg>
      <p className="t-small mt-2 text-ink-2">Each dot is a healthy training day; grey runs from {by === "temp" ? "cold to warm" : "empty to full"}. Ring: the healthy reference; orange: now. The code places every day on the healthy pattern, damaged days too, so a dot near the ring is not necessarily healthy: the error in rebuilding the day is what flags it. The two axes have no fixed physical meaning.</p>
    </section>
  );
};

/** Autoencoder error and Mahalanobis distance, each against its threshold. */
export const Health: React.FC<{ ae: number | null; msd: number | null; aeThr: number; msdThr: number; training: boolean }> = ({ ae, msd, aeThr, msdThr, training }) => {
  const row = (name: string, v: number | null, thr: number) => {
    const share = v === null ? 0 : Math.min(1, v / (2.5 * thr)), flagged = v !== null && v > thr;
    return (
      <div key={name}>
        <div className="flex items-baseline justify-between gap-2"><span className="t-small text-ink-2">{name}</span><span className="t-data">{training || v === null ? "Training…" : flagged ? "Flagged" : "Normal"}</span></div>
        <div className="relative mt-1 h-3 border border-ink" role="img" aria-label={v === null ? `${name}: training` : `${name}: ${(v / thr).toFixed(2)} times its threshold, ${flagged ? "flagged" : "normal"}`}>
          <div className="h-full bg-ink" style={{ width: `${100 * share}%` }} />
          <div className="absolute inset-y-[-3px] w-0.5 bg-laser" style={{ left: `${100 / 2.5}%` }} aria-hidden="true" />
        </div>
      </div>
    );
  };
  return (
    <section className="min-w-0">
      <h3 className="font-[520]">Health</h3>
      <div className="mt-3 flex flex-col gap-3">{row("Autoencoder (reconstruction error)", ae, aeThr)}{row("Mahalanobis distance (baseline)", msd, msdThr)}</div>
      <p className="t-small mt-2 text-ink-2">The orange tick is each method’s threshold: the 99th percentile on 1,000 separate healthy days. Flagged means flagged under this simulation, not a diagnosis.</p>
    </section>
  );
};

/** Residuals per tracked mode, in standard deviations of the training days. */
export const Residuals: React.FC<{ r: number[] | null }> = ({ r }) => {
  const W = 240, H = 120, M = 14, top = Math.max(0.5, ...(r ?? []).map(Math.abs));
  const bw = (W - 2 * M) / 6, sy = (v: number) => H / 2 - (v / top) * (H / 2 - M);
  return (
    <section className="min-w-0">
      <h3 className="font-[520]">Residuals by mode</h3>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 block w-full max-w-[16rem]" role="img" aria-label={r ? `Residuals: ${r.map((v, i) => `mode ${i + 1} ${v.toFixed(2)}`).join(", ")} standard deviations.` : "No residuals yet."}>
        <line x1={M} x2={W - M} y1={H / 2} y2={H / 2} stroke="#CBD2D5" />
        {r?.map((v, i) => <rect key={i} x={M + i * bw + 4} width={bw - 8} y={Math.min(sy(v), H / 2)} height={Math.abs(sy(v) - H / 2)} fill="#172027" />)}
        {r?.map((_, i) => <text key={`t${i}`} x={M + i * bw + bw / 2} y={H - 2} textAnchor="middle" fontSize="10" className="fill-ink-2">{i + 1}</text>)}
      </svg>
      <p className="t-small mt-2 text-ink-2">Measured minus rebuilt frequency, per mode, in standard deviations. Damage leaves a pattern the healthy days don’t have.</p>
    </section>
  );
};

/** Training and validation loss by epoch. */
export const Loss: React.FC<{ history: { epoch: number; train: number; val: number }[] }> = ({ history }) => {
  const W = 240, H = 70, M = 6;
  if (!history.length) return null;
  const v = history.flatMap((h) => [h.train, h.val]).map((x) => Math.log10(x)), lo = Math.min(...v), hi = Math.max(...v), n = history[history.length - 1].epoch;
  const pt = (e: number, y: number) => `${(M + (e / n) * (W - 2 * M)).toFixed(1)} ${(H - M - ((Math.log10(y) - lo) / (hi - lo || 1)) * (H - 2 * M)).toFixed(1)}`;
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full max-w-[16rem]" role="img" aria-label={`Training loss after ${n} epochs: ${history[history.length - 1].val.toExponential(1)} on validation days.`}>
        <path d={"M" + history.map((h) => pt(h.epoch, h.train)).join("L")} fill="none" stroke="#819199" strokeWidth="1.2" />
        <path d={"M" + history.map((h) => pt(h.epoch, h.val)).join("L")} fill="none" stroke="#172027" strokeWidth="1.4" />
      </svg>
      <figcaption className="t-small mt-1 text-ink-2">Loss by epoch, log scale: grey on training days, black on 200 validation days.</figcaption>
    </figure>
  );
};

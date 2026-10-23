import React, { useEffect, useRef, useState } from "react";
import ToolShell from "../ToolShell";
import { Field, Segmented } from "../controls";
import { useToolParams } from "../useToolParams";
import { download, downloadPNG, svgText } from "../../lab/export";
import { SCALES, Scale, Sweep, angleAt, bandPath, colorAt, fmt, fraction, polar } from "./dial";

const LIMIT = 1e9;
const SPEC = {
  v: { kind: "num", min: -LIMIT, max: LIMIT, step: 0.01, def: 20 },
  lo: { kind: "num", min: -LIMIT, max: LIMIT, step: 0.01, def: 0 },
  hi: { kind: "num", min: -LIMIT, max: LIMIT, step: 0.01, def: 100 },
  title: { kind: "text", ok: (s: string) => s.length <= 80, def: "Carbon footprint" },
  unit: { kind: "text", ok: (s: string) => s.length <= 30, def: "t CO₂e" },
  sc: { kind: "enum", values: Object.keys(SCALES), def: "rdylgn" },
  rev: { kind: "enum", values: ["0", "1"], def: "0" },
  band: { kind: "enum", values: ["smooth", "steps"], def: "smooth" },
  sw: { kind: "enum", values: ["270", "180"], def: "270" },
  ptr: { kind: "enum", values: ["needle", "mark"], def: "needle" },
} as const;

// Colours and type are written into the SVG itself, so the file looks the same outside this page.
const INK = "#172027", INK2 = "#4F5D68", FONT = "'Archivo Variable', Archivo, Arial, sans-serif";
const W = 400, CX = 200, R1 = 168, R0 = 138, SEGS = 120, STEPS = 5;

/** A number field that keeps what is being typed ("-", "2.") and reports only numbers. */
const NumInput: React.FC<{ id: string; value: number; onChange: (v: number) => void; label?: string }> = ({ id, value, onChange, label }) => {
  const [s, setS] = useState(String(value));
  useEffect(() => { if (Number(s) !== value) setS(String(value)); }, [value]);   // eslint-disable-line react-hooks/exhaustive-deps
  return <input id={id} aria-label={label} type="number" inputMode="decimal" step="any" value={s}
    onChange={(e) => { setS(e.target.value); const x = Number(e.target.value); if (e.target.value.trim() !== "" && Number.isFinite(x)) onChange(x); }}
    className="t-data h-9 w-full min-w-0 rounded-[2px] border border-rule bg-transparent px-2 [@media(pointer:coarse)]:h-11" />;
};

const text = "t-data h-9 w-full min-w-0 rounded-[2px] border border-rule bg-transparent px-2 [@media(pointer:coarse)]:h-11";

const Gauge: React.FC = () => {
  const { values: p, clamped, set } = useToolParams(SPEC);
  const svgRef = useRef<SVGSVGElement>(null);
  const sweep = p.sw as Sweep, scale = p.sc as Scale, rev = p.rev === "1", needle = p.ptr === "needle";
  const badRange = !(p.hi > p.lo), lo = p.lo, hi = badRange ? p.lo + 1 : p.hi;
  const t = fraction(p.v, lo, hi), outside = p.v < lo || p.v > hi;
  const lines = p.title.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(0, 3);

  // Layout: the dial's centre, then where the value, unit and title sit for this sweep and pointer.
  const half = sweep === "180", cy = half ? 196 : 188;
  const end = half ? cy : cy + R1 * Math.SQRT1_2;   // lowest point of the band
  const valueY = needle ? (half ? cy + 62 : cy + 92) : half ? cy - 26 : cy + 22;
  const valueSize = Math.min(needle ? 44 : 64, 330 / Math.max(1, fmt(p.v).length * 0.6));
  const unitY = valueY + (needle || half ? 26 : 34);
  const titleY = Math.max(end + 52, unitY + 44);
  const H = Math.round(titleY + Math.max(0, lines.length - 1) * 26 + 18);

  const [a0, a1] = [angleAt(sweep, 0), angleAt(sweep, 1)], at = angleAt(sweep, t);
  const segments = p.band === "steps"
    ? Array.from({ length: STEPS }, (_, k) => ({ a: a0 + ((a1 - a0) * k) / STEPS - (k ? 0.6 : 0), b: a0 + ((a1 - a0) * (k + 1)) / STEPS + (k < STEPS - 1 ? 0.6 : 0), c: colorAt(scale, (k + 0.5) / STEPS, rev) }))
    // butt-ended slices, each overlapping the next by a quarter of a degree so no seam shows
    : Array.from({ length: SEGS }, (_, k) => ({ a: a0 + ((a1 - a0) * k) / SEGS, b: a0 + ((a1 - a0) * (k + 1)) / SEGS - (k < SEGS - 1 ? 0.25 : 0), c: colorAt(scale, (k + 0.5) / SEGS, rev) }));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((u) => angleAt(sweep, u));
  const endLabel = (u: 0 | 1) => {
    const [x, y] = polar(CX, cy, (R0 + R1) / 2, angleAt(sweep, u));
    return { x, y: y + (half ? 26 : 30) };
  };

  const [tx, ty] = polar(CX, cy, R0 - 8, at), perp = ((at + 90) * Math.PI) / 180;
  const nx = 4.5 * Math.cos(perp), ny = -4.5 * Math.sin(perp);
  const label = `${lines.join(" ") || "Gauge"}: ${fmt(p.v)}${p.unit ? ` ${p.unit}` : ""}, on a scale from ${fmt(lo)} to ${fmt(hi)}.`;

  const name = (lines.join("-").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "gauge");
  const saveSVG = () => svgRef.current && download(`${name}.svg`, svgText(svgRef.current), "image/svg+xml");
  const savePNG = () => svgRef.current && downloadPNG(`${name}.png`, svgText(svgRef.current), W, H);

  return (
    <ToolShell
      path="/tools/gauge-tool"
      slug="gauge"
    >
      {clamped.length > 0 && <p className="t-small mb-4 text-ink-2">Some link settings were out of range and have been adjusted: {clamped.join(", ")}.</p>}
      <div className="grid gap-x-12 gap-y-10 md:grid-cols-[17rem_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          <Field label="Value" htmlFor="g-v">
            <NumInput id="g-v" value={p.v} onChange={(v) => set({ v })} />
            <input type="range" aria-label="Value on the scale" min={lo} max={hi} step={(hi - lo) / 200} value={Math.min(hi, Math.max(lo, p.v))}
              onChange={(e) => set({ v: Number(Number(e.target.value).toPrecision(6)) })} className="mt-2 w-full accent-ink" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Minimum" htmlFor="g-lo"><NumInput id="g-lo" value={p.lo} onChange={(lo) => set({ lo })} /></Field>
            <Field label="Maximum" htmlFor="g-hi"><NumInput id="g-hi" value={p.hi} onChange={(hi) => set({ hi })} /></Field>
          </div>
          {badRange && <p className="t-small -mt-2 text-ink" role="alert">The maximum must be above the minimum; the dial runs to {fmt(hi)} until it is.</p>}
          {!badRange && outside && <p className="t-small -mt-2 text-ink-2">The value is outside the scale, so the pointer rests at its {p.v < lo ? "start" : "end"}.</p>}
          <Field label="Title, up to three lines" htmlFor="g-title">
            <textarea id="g-title" rows={2} maxLength={80} value={p.title} onChange={(e) => set({ title: e.target.value })} className={`${text} h-auto resize-none py-1.5`} />
          </Field>
          <Field label="Unit" htmlFor="g-unit">
            <input id="g-unit" maxLength={30} value={p.unit} onChange={(e) => set({ unit: e.target.value })} className={text} />
          </Field>
          <Field label="Colour scale">
            <Segmented label="Colour scale" cols={2} value={p.sc} onChange={(sc) => set({ sc })} options={Object.entries(SCALES).map(([v, s]) => ({ v, text: s.text }))} />
          </Field>
          <label className="t-small flex items-center gap-2 text-ink-2">
            <input type="checkbox" checked={rev} onChange={(e) => set({ rev: e.target.checked ? "1" : "0" })} className="h-4 w-4 accent-ink" />
            Reverse the scale
          </label>
          <Field label="Band"><Segmented label="Band" value={p.band} onChange={(band) => set({ band })} options={[{ v: "smooth", text: "Smooth" }, { v: "steps", text: "Five steps" }]} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Sweep"><Segmented label="Sweep" value={p.sw} onChange={(sw) => set({ sw })} options={[{ v: "270", text: "270°" }, { v: "180", text: "180°" }]} /></Field>
            <Field label="Pointer"><Segmented label="Pointer" value={p.ptr} onChange={(ptr) => set({ ptr })} options={[{ v: "needle", text: "Needle" }, { v: "mark", text: "Mark" }]} /></Field>
          </div>
        </div>

        <div className="min-w-0 max-md:order-first">
          <div className="flex items-center justify-center border border-rule px-4 py-8 md:min-h-[min(36rem,calc(100svh-16rem))]">
            <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={label}
              className="block h-auto w-full max-w-[26rem]" fontFamily={FONT}>
              <title>{label}</title>
              {segments.map((s, k) => <path key={k} d={bandPath(CX, cy, R0, R1, s.a, s.b)} fill={s.c} />)}
              {ticks.map((a, k) => { const [x0, y0] = polar(CX, cy, R0 - 5, a), [x1, y1] = polar(CX, cy, R0 - 12, a); return <line key={k} x1={x0} y1={y0} x2={x1} y2={y1} stroke={INK2} strokeWidth={1.25} />; })}
              {([0, 1] as const).map((u) => { const e = endLabel(u); return <text key={u} x={e.x} y={e.y} textAnchor="middle" fontSize={15} fill={INK2}>{fmt(u ? hi : lo)}</text>; })}
              {needle ? <>
                <path d={`M${CX + nx} ${cy + ny}L${tx} ${ty}L${CX - nx} ${cy - ny}Z`} fill={INK} />
                <circle cx={CX} cy={cy} r={9} fill={INK} />
                <circle cx={CX} cy={cy} r={3} fill="#FFFFFF" />
              </> : (() => {
                const [x0, y0] = polar(CX, cy, R0 - 6, at), [x1, y1] = polar(CX, cy, R1 + 6, at), [px, py] = polar(CX, cy, R1 + 9, at);
                const [qx, qy] = polar(CX, cy, R1 + 19, at + 4.2), [rx, ry] = polar(CX, cy, R1 + 19, at - 4.2);
                return <>
                  <line x1={x0} y1={y0} x2={x1} y2={y1} stroke="#FFFFFF" strokeWidth={6} />
                  <line x1={x0} y1={y0} x2={x1} y2={y1} stroke={INK} strokeWidth={3} />
                  <path d={`M${px} ${py}L${qx} ${qy}L${rx} ${ry}Z`} fill={INK} />
                </>;
              })()}
              <text x={CX} y={valueY} textAnchor="middle" fontSize={valueSize} fontWeight={600} fill={INK} style={{ fontVariantNumeric: "tabular-nums" }}>{fmt(p.v)}</text>
              {p.unit && <text x={CX} y={unitY} textAnchor="middle" fontSize={17} fill={INK2}>{p.unit}</text>}
              <text x={CX} y={titleY} textAnchor="middle" fontSize={21} fontWeight={540} fill={INK}>
                {lines.map((l, k) => <tspan key={k} x={CX} dy={k ? 26 : 0}>{l}</tspan>)}
              </text>
            </svg>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="btn btn-solid" onClick={saveSVG}>Download SVG</button>
            <button type="button" className="btn" onClick={savePNG}>Download PNG</button>
          </div>
          <p className="t-small mt-2 text-ink-2">The PNG is three times this size; browsers set its text in Arial. The SVG keeps Archivo.</p>
        </div>
      </div>
    </ToolShell>
  );
};

export default Gauge;

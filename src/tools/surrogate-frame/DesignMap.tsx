// The design space as a map: every lower-column × beam design at one upper-column size, shaded by what the surrogate
// predicts, with its predicted limit, the FE runs it learned from, the GA's population while it searches, the
// verification rounds and, after Reveal, the true limit from FE. Hand-written SVG, sized to its box; a table behind it.
import React, { useEffect, useId, useRef, useState } from "react";
import { BEAMS, COLUMNS, type Design } from "./frame";
import { edges } from "./map";
import type { CellState } from "./surrogate";

export interface MapRun { d: Design; ok: boolean; round?: number }   // an FE run; round: a verification round
export interface MapCell { d: Design; state: CellState; feasible: boolean; mass: number }

interface Props {
  cU: number;
  cells: MapCell[] | null;          // null while the surrogate trains
  truth: boolean[] | null;          // FE feasibility of the same cells, after Reveal
  runs: MapRun[];
  current: Design;
  population: Design[] | null;      // the GA's generation on screen, while it animates
  answer: Design | null;            // the GA's proposal
  trueBest: Design | null;          // the lightest FE-feasible design, after Reveal
  lim: number;
  onPick: (cL: number, bm: number) => void;
}

const NX = COLUMNS.length, NY = BEAMS.length;
const INK = "#172027", INK2 = "#4F5D68", STEEL = "#819199", RULE = "#CBD2D5", CANVAS = "#F6F7F5", LASER = "#F05A24";
const sec = (id: string) => id.replace(/^(HEB|IPE)/, "$1 ");
const STATE_TEXT: Record<CellState, string> = {
  ok: "the surrogate says feasible, even at the edge of its band",
  unsure: "the surrogate is unsure: its ±2σ band crosses a limit",
  over: "the surrogate says not feasible, even at the edge of its band",
};
const JITTER = [[0, 0], [-0.24, -0.24], [0.24, 0.24], [0.24, -0.24], [-0.24, 0.24], [0, -0.3], [0, 0.3], [-0.3, 0], [0.3, 0]];

export const DesignMap: React.FC<Props> = ({ cU, cells, truth, runs, current, population, answer, trueBest, lim, onPick }) => {
  const box = useRef<HTMLDivElement>(null), [w, setW] = useState(520), [hover, setHover] = useState<number | null>(null), [table, setTable] = useState(false);
  const hatch = useId().replace(/:/g, "");
  useEffect(() => { const el = box.current; if (!el) return; const ro = new ResizeObserver(() => setW(el.clientWidth)); ro.observe(el); return () => ro.disconnect(); }, []);

  const ML = 58, MR = 6, MT = 6, cell = Math.max(18, Math.min(46, (w - ML - MR) / NX)), rotate = cell < 34, MB = rotate ? 66 : 38;
  const gw = NX * cell, gh = NY * cell, W = ML + gw + MR, H = MT + gh + MB;
  const x = (i: number) => ML + i * cell, y = (j: number) => MT + (NY - 1 - j) * cell;   // row 0 (lightest beam) at the bottom
  const center = (d: Design) => [x(d.cL) + cell / 2, y(d.bm) + cell / 2] as const;
  const inSlice = (d: Design) => d.cU === cU;
  const line = (segs: [number, number, number, number][]) => segs.map(([a, b, c, d]) => `M${ML + a * cell} ${MT + (NY - b) * cell}L${ML + c * cell} ${MT + (NY - d) * cell}`).join("");

  const counts = cells ? { ok: cells.filter((c) => c.state === "ok").length, unsure: cells.filter((c) => c.state === "unsure").length, over: cells.filter((c) => c.state === "over").length } : null;
  const here = runs.filter((r) => inSlice(r.d) && r.round === undefined), cur = current.cL + NX * current.bm, shown = hover ?? cur;
  const label = cells
    ? `Design map at upper columns ${sec(COLUMNS[cU])}: lower columns across, beams up. The surrogate predicts ${counts!.ok} designs feasible, ${counts!.unsure} unsure and ${counts!.over} not feasible. ${here.length} FE runs lie at this upper-column size (${here.filter((r) => r.ok).length} feasible).${truth ? ` FE finds ${truth.filter(Boolean).length} feasible.` : ""} Current design: ${sec(COLUMNS[current.cL])}, ${sec(BEAMS[current.bm])}.`
    : "Design map: the surrogate is training.";
  const info = (i: number) => {
    const c = cells?.[i], d: Design = { cL: i % NX, cU, bm: Math.floor(i / NX) };
    const run = runs.find((r) => r.d.cL === d.cL && r.d.cU === cU && r.d.bm === d.bm);
    return `${sec(COLUMNS[d.cL])} · ${sec(BEAMS[d.bm])}${c ? `: ${STATE_TEXT[c.state]}; ${c.mass.toFixed(1)} t` : ""}${run ? `; FE ${run.round !== undefined ? `(verification round ${run.round}) ` : ""}says ${run.ok ? "feasible" : "not feasible"}` : ""}${truth ? `; truth: ${truth[i] ? "feasible" : "not feasible"}` : ""}.`;
  };
  const crowd = new Map<number, number>();   // GA individuals already drawn per cell, for the jitter

  return (
    <section className="min-w-0">
      <h3 className="font-[520]">The design space</h3>
      <p className="t-small mt-1 text-ink-2">Every square is one design: lower columns across, beams up, with the upper columns at {sec(COLUMNS[cU])} (the slider). Click a square to choose it.</p>
      <div ref={box} className="mt-2 w-full">
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block max-w-full touch-manipulation" role="img" aria-label={label} onPointerLeave={() => setHover(null)}>
          <defs>
            <pattern id={hatch} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="6" height="6" fill={CANVAS} /><rect width="2.4" height="6" fill={STEEL} />
            </pattern>
          </defs>
          {/* cells */}
          {Array.from({ length: NX * NY }, (_, i) => {
            const st = cells?.[i]?.state, fill = !st ? CANVAS : st === "ok" ? CANVAS : st === "unsure" ? `url(#${hatch})` : RULE;
            return <rect key={i} x={x(i % NX)} y={y(Math.floor(i / NX))} width={cell} height={cell} fill={fill} stroke={RULE} strokeWidth="0.75"
              className="cursor-pointer" onPointerEnter={() => setHover(i)} onClick={() => onPick(i % NX, Math.floor(i / NX))} />;
          })}
          <rect x={ML} y={MT} width={gw} height={gh} fill="none" stroke={INK2} strokeWidth="1" pointerEvents="none" />
          {/* the predicted limit (μ) and, after Reveal, the true one */}
          {cells && <path d={line(edges(cells.map((c) => c.feasible), NX, NY))} stroke={INK} strokeWidth="2.4" strokeLinecap="round" fill="none" pointerEvents="none" />}
          {truth && <path d={line(edges(truth, NX, NY))} stroke={LASER} strokeWidth="2.4" strokeDasharray="5 4" strokeLinecap="round" fill="none" pointerEvents="none" />}
          <g pointerEvents="none">
            {/* FE runs at other upper-column sizes, faint; then the ones in this slice */}
            {runs.filter((r) => !inSlice(r.d) && r.round === undefined).map((r, k) => { const [cx, cy] = center(r.d); return <circle key={`o${k}`} cx={cx} cy={cy} r={2.4} fill="none" stroke={STEEL} strokeWidth="1" />; })}
            {here.map((r, k) => {
              const [cx, cy] = center(r.d), s = Math.max(3.5, cell * 0.15);
              return r.ok ? <circle key={`r${k}`} cx={cx} cy={cy} r={s} fill={INK} />
                : <path key={`r${k}`} d={`M${cx - s} ${cy - s}L${cx + s} ${cy + s}M${cx - s} ${cy + s}L${cx + s} ${cy - s}`} stroke={INK} strokeWidth="2" strokeLinecap="round" />;
            })}
            {/* the GA's population while it searches */}
            {population?.map((d, k) => {
              const i = d.cL + NX * d.bm, n = crowd.get(i) ?? 0, [jx, jy] = JITTER[n % JITTER.length];
              crowd.set(i, n + 1);
              const [cx, cy] = center(d);
              return <circle key={`g${k}`} cx={cx + jx * cell} cy={cy + jy * cell} r={2.6} fill={INK2} fillOpacity={inSlice(d) ? 0.9 : 0.3} />;
            })}
            {/* verification rounds and the GA's proposal */}
            {runs.filter((r) => r.round !== undefined && inSlice(r.d)).map((r) => {
              const [cx, cy] = center(r.d);
              return <g key={`v${r.round}`}>
                <circle cx={cx} cy={cy} r={cell * 0.34} fill="none" stroke={LASER} strokeWidth="2" />
                {r.ok ? <circle cx={cx} cy={cy} r={Math.max(3, cell * 0.12)} fill={LASER} /> : <path d={`M${cx - 4} ${cy - 4}L${cx + 4} ${cy + 4}M${cx - 4} ${cy + 4}L${cx + 4} ${cy - 4}`} stroke={LASER} strokeWidth="2" />}
                <text x={x(r.d.cL) + cell - 2} y={y(r.d.bm) + 10} textAnchor="end" fontSize="9" fill={LASER}>{r.round}</text>
              </g>;
            })}
            {answer && inSlice(answer) && !population && (() => { const [cx, cy] = center(answer); return <circle cx={cx} cy={cy} r={cell * 0.34} fill="none" stroke={LASER} strokeWidth="2" strokeDasharray="3 2" />; })()}
            {trueBest && inSlice(trueBest) && <rect x={x(trueBest.cL) + 2} y={y(trueBest.bm) + 2} width={cell - 4} height={cell - 4} fill="none" stroke={LASER} strokeWidth="1.6" strokeDasharray="3 2" />}
            {/* the current design */}
            <rect x={x(current.cL) + 1} y={y(current.bm) + 1} width={cell - 2} height={cell - 2} fill="none" stroke={INK} strokeWidth="2.2" />
          </g>
          {/* axes */}
          {BEAMS.map((b, j) => <text key={b} x={ML - 6} y={y(j) + cell / 2 + 3.5} textAnchor="end" fontSize="10.5" fill={INK2}>{sec(b)}</text>)}
          {COLUMNS.map((c, i) => rotate
            ? <text key={c} transform={`translate(${x(i) + cell / 2 + 3} ${MT + gh + 8}) rotate(-50)`} textAnchor="end" fontSize="10.5" fill={INK2}>{sec(c)}</text>
            : <text key={c} x={x(i) + cell / 2} y={MT + gh + 14} textAnchor="middle" fontSize="10" fill={INK2}>{c.replace("HEB", "")}</text>)}
          <text x={ML + gw / 2} y={H - 4} textAnchor="middle" fontSize="10.5" fill={INK2}>{rotate ? "Columns, storeys 1–3 →" : "Columns, storeys 1–3 (HEB) →"}</text>
        </svg>
      </div>
      <p className="t-small mt-1 min-h-[2.9em] text-ink" aria-live="off">{info(shown)}</p>
      <ul className="t-small mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-ink-2" aria-label="Legend">
        <li className="flex items-center gap-1.5"><svg width="14" height="14" aria-hidden="true"><rect x=".5" y=".5" width="13" height="13" fill={CANVAS} stroke={STEEL} /></svg>Feasible</li>
        <li className="flex items-center gap-1.5"><svg width="14" height="14" aria-hidden="true"><rect x=".5" y=".5" width="13" height="13" fill={`url(#${hatch})`} stroke={STEEL} /></svg>Unsure (±2σ)</li>
        <li className="flex items-center gap-1.5"><svg width="14" height="14" aria-hidden="true"><rect x=".5" y=".5" width="13" height="13" fill={RULE} stroke={STEEL} /></svg>Not feasible</li>
        <li className="flex items-center gap-1.5"><svg width="18" height="8" aria-hidden="true"><path d="M1 4h16" stroke={INK} strokeWidth="2.4" /></svg>Predicted limit (h/{lim})</li>
        <li className="flex items-center gap-1.5"><svg width="18" height="8" aria-hidden="true"><path d="M1 4h16" stroke={LASER} strokeWidth="2.4" strokeDasharray="5 4" /></svg>True limit (after Reveal)</li>
        <li className="flex items-center gap-1.5"><svg width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="4" fill={INK} /></svg>FE run, feasible</li>
        <li className="flex items-center gap-1.5"><svg width="12" height="12" aria-hidden="true"><path d="M2 2l8 8M2 10l8-8" stroke={INK} strokeWidth="2" /></svg>FE run, not feasible</li>
        <li className="flex items-center gap-1.5"><svg width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="2.4" fill="none" stroke={STEEL} /></svg>Run at another upper-column size</li>
        <li className="flex items-center gap-1.5"><svg width="14" height="14" aria-hidden="true"><circle cx="7" cy="7" r="5.5" fill="none" stroke={LASER} strokeWidth="2" /></svg>GA proposal, verification round</li>
        <li className="flex items-center gap-1.5"><svg width="14" height="14" aria-hidden="true"><rect x="1" y="1" width="12" height="12" fill="none" stroke={INK} strokeWidth="2" /></svg>Current design</li>
      </ul>
      <button type="button" className="btn mt-3" aria-expanded={table} onClick={() => setTable((v) => !v)}>{table ? "Hide the table" : "Show as table"}</button>
      {table && cells && (
        <div className="mt-3 max-h-80 overflow-auto">
          <table className="t-data w-full min-w-[34rem] border-collapse text-left">
            <caption className="t-small pb-2 text-left text-ink-2">The surrogate's verdict per design at upper columns {sec(COLUMNS[cU])}: ✓ feasible, ? unsure, – not feasible; FE runs in brackets{truth ? "; after the slash, FE's truth" : ""}.</caption>
            <thead><tr className="border-b border-ink"><th scope="col" className="py-1 pr-2 font-[520]">Beams \ columns 1–3</th>{COLUMNS.map((c) => <th key={c} scope="col" className="py-1 pr-2 font-[520]">{c.replace("HEB", "")}</th>)}</tr></thead>
            <tbody>
              {BEAMS.map((b, j) => ({ b, j })).reverse().map(({ b, j }) => (
                <tr key={b} className="border-b border-rule">
                  <th scope="row" className="py-1 pr-2 font-normal">{sec(b)}</th>
                  {COLUMNS.map((_, i) => {
                    const c = cells[i + NX * j], run = here.find((r) => r.d.cL === i && r.d.bm === j);
                    return <td key={i} className="py-1 pr-2">{c.state === "ok" ? "✓" : c.state === "unsure" ? "?" : "–"}{run ? (run.ok ? " (●)" : " (×)") : ""}{truth ? ` / ${truth[i + NX * j] ? "✓" : "–"}` : ""}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

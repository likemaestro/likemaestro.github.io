import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import ToolShell, { MICRO_PAPER } from "../ToolShell";
import { drawLattice } from "../../lab/lattice";
import { kappaHS, MathML, num, quantities, TARGETS } from "../../lab/readout";
import type { Objective } from "../../lab/unitcell";

interface Raw { t: Objective; v: number; s: number; i: number; c: [number, number, number]; b: string }
interface Design extends Raw { key: string; E1: number; G12: number; nu12: number; K: number; x: number; y: number }

const VFS = ["0.30", "0.40", "0.50"];
// Marker shape per target, so colour is never the only cue.
const SHAPE: Record<Objective, (x: number, y: number) => React.ReactNode> = {
  axial: (x, y) => <rect x={x - 3.6} y={y - 3.6} width={7.2} height={7.2} />,
  shear: (x, y) => <path d={`M${x} ${y - 5}L${x + 5} ${y}L${x} ${y + 5}L${x - 5} ${y}Z`} />,
  bulk: (x, y) => <circle cx={x} cy={y} r={4} />,
  auxetic: (x, y) => <path d={`M${x} ${y - 5}L${x + 4.6} ${y + 3.4}L${x - 4.6} ${y + 3.4}Z`} />,
};
const Glyph: React.FC<{ t: Objective }> = ({ t }) => (
  <svg viewBox="0 0 12 12" aria-hidden="true" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.2">{SHAPE[t](6, 6)}</svg>
);

const W = 640, H = 420, M = { l: 52, r: 16, t: 14, b: 46 };
const sx = (v: number) => M.l + ((v + 1) / 2) * (W - M.l - M.r);          // nu12 from -1 to 1
const sy = (v: number) => H - M.b - v * (H - M.t - M.b);                    // E1 / (V E) from 0 to 1

const bitsToField = (b: string, n: number) => {
  const bin = atob(b), out = new Uint8Array(n * n);
  for (let k = 0; k < out.length; k++) out[k] = (bin.charCodeAt(k >> 3) >> (k & 7)) & 1 ? 255 : 0;
  return out;
};

const PropertyMap: React.FC = () => {
  const [data, setData] = useState<{ n: number; designs: Design[] } | null>(null);
  const [error, setError] = useState(false);
  const [sp, setSp] = useSearchParams();
  const vfParam = sp.get("v"), vf = VFS.includes(vfParam ?? "") ? vfParam! : "all";
  const shown = new Set((sp.get("t") ?? "axial,shear,bulk,auxetic").split(",").filter((t) => TARGETS.some((x) => x.id === t)));
  const [table, setTable] = useState(false);
  const [sort, setSort] = useState<{ k: keyof Design; up: boolean }>({ k: "nu12", up: true });
  const cellRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    fetch(`${process.env.PUBLIC_URL}/data/property-map.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((j: { n: number; designs: Raw[] }) => setData({
        n: j.n,
        designs: j.designs.map((d) => {
          const C = [d.c[0], d.c[1], 0, d.c[1], d.c[0], 0, 0, 0, d.c[2]], q = quantities(C, d.v);
          return { ...d, key: `${d.t}-${d.v.toFixed(2)}-${d.s}`, ...q, x: q.nu12, y: q.E1 / d.v };
        }),
      }))
      .catch(() => setError(true));
  }, []);

  const visible = useMemo(() => (data?.designs ?? []).filter((d) => shown.has(d.t) && (vf === "all" || d.v.toFixed(2) === vf)), [data, vf, sp]);   // eslint-disable-line react-hooks/exhaustive-deps
  const byX = useMemo(() => [...visible].sort((a, b) => a.x - b.x), [visible]);
  const fallback = useMemo(() => byX.find((d) => d.t === "auxetic") ?? byX[0], [byX]);
  const sel = visible.find((d) => d.key === sp.get("sel")) ?? fallback;

  const update = (patch: Record<string, string>) => setSp((prev) => { const q = new URLSearchParams(prev); for (const [k, v] of Object.entries(patch)) q.set(k, v); return q; }, { replace: true });
  const toggleTarget = (t: string) => {
    const next = new Set(shown);
    if (next.has(t)) { if (next.size > 1) next.delete(t); } else next.add(t);
    update({ t: Array.from(next).join(",") });
  };
  const step = (d: number) => {
    if (!sel || !byX.length) return;
    const k = byX.indexOf(sel), next = byX[Math.min(byX.length - 1, Math.max(0, k + d))];
    update({ sel: next.key });
  };

  useEffect(() => {
    const cv = cellRef.current;
    if (!cv || !sel || !data) return;
    const field = bitsToField(sel.b, data.n), draw = () => drawLattice(cv, field, 3, 3, [1, 1]);
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(cv);
    return () => ro.disconnect();
  }, [sel, data]);

  const target = (t: Objective) => TARGETS.find((x) => x.id === t)!;
  const designer = sel && `/tools/unit-cell?target=${sel.t}&vf=${sel.v.toFixed(2)}&n=${data?.n ?? 48}&r=2&seed=${sel.s}`;
  const rows = useMemo(() => [...visible].sort((a, b) => ((a[sort.k] as number) - (b[sort.k] as number)) * (sort.up ? 1 : -1) || a.key.localeCompare(b.key)), [visible, sort]);
  const cols: [keyof Design, string, (d: Design) => string][] = [
    ["t", "Target", (d) => target(d.t).label], ["v", "V", (d) => d.v.toFixed(2)], ["E1", "E₁ / E", (d) => num(d.E1, 3)], ["G12", "G₁₂ / E", (d) => num(d.G12, 3)],
    ["nu12", "ν₁₂", (d) => num(d.nu12, 2)], ["K", "κ / κ_HS", (d) => num(d.K / kappaHS(d.v), 2)], ["s", "Seed", (d) => String(d.s)],
  ];

  return (
    <ToolShell
      path="/tools/property-map"
      slug="property-map"
      paper={MICRO_PAPER}
      methodRef={{ label: "Andreassen & Andreasen 2014", href: "https://doi.org/10.1016/j.commatsci.2013.09.006" }}
      method={<>
        <p>Each point is one optimized unit cell from the designer’s solver: 48 × 48 elements, run from a random start (seed) for each target at volume fractions 0.30, 0.40 and 0.50. Only runs that converged to a crisp design in one piece are kept.</p>
        <p>The vertical axis divides the stiffness E₁ by its Voigt bound V·E, so cells of different volume fractions compare on one scale; no cell can pass 1.</p>
      </>}
      limits={<>
        <p>Linear elastic, plane stress, base material ν = 0.3. All cells have the square’s symmetries, so E₂ = E₁.</p>
        <p>The points show what this optimizer found from these seeds, not the limits of what is possible.</p>
      </>}
    >
      <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        <div role="group" aria-label="Volume fraction" className="flex rounded-[2px] border border-ink">
          {["all", ...VFS].map((v, i) => (
            <button key={v} type="button" aria-pressed={vf === v} onClick={() => update({ v })}
              className={`t-data min-h-[2.25rem] px-2.5 transition-colors duration-150 [@media(pointer:coarse)]:min-h-[44px] ${i ? "border-l border-rule" : ""} ${vf === v ? "bg-ink font-[600] text-canvas" : "text-ink-2 hover:bg-wash hover:text-ink"}`}>
              {v === "all" ? "All V" : `V = ${v}`}
            </button>
          ))}
        </div>
        <div role="group" aria-label="Targets shown" className="flex flex-wrap gap-2">
          {TARGETS.map((x) => (
            <button key={x.id} type="button" aria-pressed={shown.has(x.id)} onClick={() => toggleTarget(x.id)}
              className={`btn ${shown.has(x.id) ? "" : "border-rule text-ink-2 opacity-70"}`}>
              <Glyph t={x.id} /> {x.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-x-12 gap-y-8 lg:grid-cols-[minmax(0,calc((100svh-20.5rem)*640/420))_18rem] lg:justify-start">
        <div className="min-w-0">
          {error && <p className="text-ink-2">The designs couldn’t be loaded. Reload the page to try again.</p>}
          {!data && !error && <p className="t-small text-ink-2">Loading the designs…</p>}
          {data && (
            <svg viewBox={`0 0 ${W} ${H}`} className="block w-full text-ink outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
              role="group" aria-label={`Property map: ${visible.length} designs, Poisson’s ratio across, stiffness up. Arrow keys move through the designs from left to right.`}
              tabIndex={0} onKeyDown={(e) => { if (e.key === "ArrowRight") { e.preventDefault(); step(1); } if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); } }}>
              {/* axes and references */}
              <g className="text-rule" stroke="currentColor" strokeWidth="1">
                <line x1={M.l} x2={W - M.r} y1={sy(0)} y2={sy(0)} />
                <line x1={M.l} x2={M.l} y1={sy(0)} y2={sy(1)} />
              </g>
              <g stroke="#819199" strokeDasharray="4 4" strokeWidth="1">
                <line x1={sx(0)} x2={sx(0)} y1={sy(0)} y2={sy(1)} />
                <line x1={M.l} x2={W - M.r} y1={sy(1)} y2={sy(1)} />
              </g>
              <g className="fill-ink-2" fontSize="12" fontFamily="inherit">
                {[-1, -0.5, 0, 0.5, 1].map((v) => <text key={v} x={sx(v)} y={H - M.b + 18} textAnchor="middle">{v < 0 ? `−${-v}` : v}</text>)}
                {[0, 0.25, 0.5, 0.75, 1].map((v) => <text key={v} x={M.l - 8} y={sy(v) + 4} textAnchor="end">{v}</text>)}
                <text x={(M.l + W - M.r) / 2} y={H - 6} textAnchor="middle">Poisson’s ratio ν₁₂ (auxetic to the left of 0)</text>
                <text x={14} y={(M.t + H - M.b) / 2} textAnchor="middle" transform={`rotate(-90 14 ${(M.t + H - M.b) / 2})`}>Stiffness E₁ / V·E</text>
                <text x={W - M.r - 4} y={sy(1) - 6} textAnchor="end">Voigt bound</text>
              </g>
              {/* points */}
              <g fill="#F6F7F5" stroke="currentColor" strokeWidth="1.1">
                {visible.map((d) => (
                  <g key={d.key} onClick={() => update({ sel: d.key })} className="cursor-pointer">
                    {SHAPE[d.t](sx(d.x), sy(d.y))}
                  </g>
                ))}
              </g>
              {sel && <g fill="#F05A24" stroke="#172027" strokeWidth="1.2" pointerEvents="none">{SHAPE[sel.t](sx(sel.x), sy(sel.y))}</g>}
            </svg>
          )}
          <button type="button" className="btn mt-4" aria-expanded={table} onClick={() => setTable((v) => !v)}>{table ? "Hide the table" : "Show as table"}</button>
        </div>

        <div className="flex min-w-0 flex-col gap-4" aria-live="polite">
          {sel && data && <>
            <canvas ref={cellRef} role="img" aria-label={`Selected design tiled 3 by 3: ${target(sel.t).label.toLowerCase()} target, V ${sel.v.toFixed(2)}, seed ${sel.s}`} className="block aspect-square w-full max-w-[18rem]" />
            <p className="t-data text-ink-2">{target(sel.t).label} target · V = {sel.v.toFixed(2)} · seed {sel.s} · {sel.i} iterations</p>
            <div className="math sm flex flex-col gap-1">
              <MathML html={`<math><msub><mi>E</mi><mn>1</mn></msub><mo>=</mo><mn>${num(sel.E1, 3)}</mn><mspace width="0.2em"></mspace><mi>E</mi><mo>=</mo><mn>${num(sel.y, 2)}</mn><mspace width="0.2em"></mspace><mi>V</mi><mi>E</mi></math>`} />
              <MathML html={`<math><msub><mi>G</mi><mn>12</mn></msub><mo>=</mo><mn>${num(sel.G12, 3)}</mn><mspace width="0.2em"></mspace><mi>E</mi></math>`} />
              <MathML html={`<math><msub><mi>ν</mi><mn>12</mn></msub><mo>=</mo><mn>${num(sel.nu12, 2)}</mn></math>`} />
              <MathML html={`<math><mi>κ</mi><mo>=</mo><mn>${num(sel.K / kappaHS(sel.v), 2)}</mn><mspace width="0.2em"></mspace><msub><mi>κ</mi><mtext>HS</mtext></msub></math>`} />
            </div>
            <Link to={designer!} className="btn btn-solid self-start">Open in designer</Link>
          </>}
        </div>
      </div>

      {table && data && (
        <div className="mt-8 overflow-x-auto">
          <table className="t-data w-full min-w-[40rem] border-collapse text-left">
            <caption className="sr-only">Designs on the property map</caption>
            <thead>
              <tr className="border-b border-ink">
                {cols.map(([k, label]) => (
                  <th key={k} scope="col" aria-sort={sort.k === k ? (sort.up ? "ascending" : "descending") : "none"} className="py-2 pr-4 font-[520]">
                    <button type="button" className="hover:underline" onClick={() => setSort((s) => ({ k, up: s.k === k ? !s.up : true }))}>{label}{sort.k === k ? (sort.up ? " ↑" : " ↓") : ""}</button>
                  </th>
                ))}
                <th scope="col" className="py-2"><span className="sr-only">Open</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.key} className={`border-b border-rule ${d === sel ? "bg-wash" : ""}`}>
                  {cols.map(([k, , f]) => <td key={k} className="py-1.5 pr-4">{f(d)}</td>)}
                  <td className="py-1.5"><button type="button" className="link" onClick={() => update({ sel: d.key })}>Show</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ToolShell>
  );
};

export default PropertyMap;

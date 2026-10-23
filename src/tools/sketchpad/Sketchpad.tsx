import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ToolShell from "../ToolShell";
import { cells } from "../../lab/precomputed";
import { createSketchWorker } from "../../lab/createWorker";
import type { SketchOut } from "../../lab/sketch.worker";
import { decode, drawLattice } from "../../lab/lattice";
import { kappaHS, MathML, num, quantities, tensorMath } from "../../lab/readout";
import { properties } from "../../lab/unitcell";
import { connected } from "../../lab/geometry";
import { contour, panelField } from "../../lab/contour";
import { download, loopsToSVG } from "../../lab/export";

const N = 48;
type Sym = "d4" | "mirror" | "free";
const SYMS: { v: Sym; text: string }[] = [{ v: "d4", text: "Kaleidoscope" }, { v: "mirror", text: "Mirror" }, { v: "free", text: "Free" }];

// ---------- the drawing in the URL: 48 × 48 bits, base64url ----------
function encode(cell: Uint8Array) {
  const bytes = new Uint8Array(cell.length / 8);
  cell.forEach((v, k) => { if (v) bytes[k >> 3] |= 1 << (k & 7); });
  return btoa(String.fromCharCode.apply(null, Array.from(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function decodeCell(s: string | null) {
  if (!s) return null;
  try {
    const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
    if (bin.length !== (N * N) / 8) return null;
    const cell = new Uint8Array(N * N);
    for (let k = 0; k < cell.length; k++) cell[k] = (bin.charCodeAt(k >> 3) >> (k & 7)) & 1;
    return cell;
  } catch { return null; }
}

// ---------- symmetry: every point maps to its images; the lower-left quadrant (and its lower octant) is the master ----------
function images(x: number, y: number, sym: Sym): [number, number][] {
  if (sym === "free") return [[x, y]];
  const xs = [x, N - 1 - x], ys = [y, N - 1 - y], out: [number, number][] = [];
  for (const a of xs) for (const b of ys) { out.push([a, b]); if (sym === "d4") out.push([b, a]); }
  return out;
}
function symmetrized(cell: Uint8Array, sym: Sym) {
  if (sym === "free") return cell;
  const out = new Uint8Array(N * N);
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      let qx = Math.min(x, N - 1 - x), qy = Math.min(y, N - 1 - y);
      if (sym === "d4" && qy > qx) [qx, qy] = [qy, qx];
      out[y * N + x] = cell[qy * N + qx];
    }
  return out;
}
/** The auxetic default, resampled from the precomputed design to 48 × 48 and thresholded. */
function example() {
  const src = decode(cells.auxetic.rho), m = Math.round(Math.sqrt(src.length)), cell = new Uint8Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) cell[y * N + x] = src[Math.floor(((y + 0.5) * m) / N) * m + Math.floor(((x + 0.5) * m) / N)] > 127 ? 1 : 0;
  return symmetrized(cell, "d4");
}
const show = (cell: Uint8Array) => Uint8Array.from(cell, (v) => (v ? 255 : 0));

const Segmented: React.FC<{ label: string; options: { v: string; text: string }[]; value: string; onChange: (v: string) => void }> = ({ label, options, value, onChange }) => (
  <div role="group" aria-label={label} className="grid auto-cols-fr grid-flow-col rounded-[2px] border border-ink">
    {options.map((o, i) => (
      <button key={o.v} type="button" aria-pressed={value === o.v} onClick={() => onChange(o.v)}
        className={`t-data min-h-[2.25rem] px-2.5 transition-colors duration-150 [@media(pointer:coarse)]:min-h-[44px] ${i ? "border-l border-rule" : ""} ${
          value === o.v ? "bg-ink font-[600] text-canvas" : "text-ink-2 hover:bg-wash hover:text-ink"}`}>
        {o.text}
      </button>
    ))}
  </div>
);

const Sketchpad: React.FC = () => {
  const [sp, setSp] = useSearchParams();
  const symParam = sp.get("sym");
  const sym: Sym = symParam === "mirror" || symParam === "free" ? symParam : "d4";
  const [cell, setCell] = useState<Uint8Array>(() => decodeCell(sp.get("cell")) ?? example());
  const [paint, setPaint] = useState<1 | 0>(1);
  const [brush, setBrush] = useState(2);
  const [res, setRes] = useState<{ C: number[]; vol: number } | null>(null);
  const historyRef = useRef<{ cell: Uint8Array; sym: Sym }[]>([]);
  const drawRef = useRef<HTMLCanvasElement>(null), tileRef = useRef<HTMLCanvasElement>(null);
  const cellRef = useRef(cell);
  cellRef.current = cell;

  // ---------- compute on every committed change ----------
  const workerRef = useRef<Worker | null>(null), idRef = useRef(0);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let w: Worker;
    try { w = createSketchWorker(); } catch { setFailed(true); return; }
    w.onmessage = (e: MessageEvent<SketchOut>) => { if (e.data.id === idRef.current) setRes({ C: e.data.C, vol: e.data.vol }); };
    w.onerror = () => setFailed(true);
    workerRef.current = w;
    return () => w.terminate();
  }, []);
  const commit = useCallback((next: Uint8Array, s: Sym = sym) => {
    setCell(next);
    workerRef.current?.postMessage({ id: ++idRef.current, n: N, cell: next, sym: s !== "free" });
    setSp((prev) => { const q = new URLSearchParams(prev); q.set("cell", encode(next)); q.set("sym", s); return q; }, { replace: true });
  }, [setSp, sym]);
  useEffect(() => { workerRef.current?.postMessage({ id: ++idRef.current, n: N, cell: cellRef.current, sym: sym !== "free" }); }, [sym, failed]);

  // ---------- drawing ----------
  const redraw = useCallback(() => {
    const c = show(cellRef.current);
    if (drawRef.current) drawLattice(drawRef.current, c, 1, 1);
    if (tileRef.current) drawLattice(tileRef.current, c, 3, 3, [1, 1]);
  }, []);
  useEffect(redraw, [cell, redraw]);
  useEffect(() => {
    const ro = new ResizeObserver(redraw);
    if (drawRef.current) ro.observe(drawRef.current);
    if (tileRef.current) ro.observe(tileRef.current);
    return () => ro.disconnect();
  }, [redraw]);

  const strokeRef = useRef<Uint8Array | null>(null);
  const stamp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const cv = drawRef.current, work = strokeRef.current;
    if (!cv || !work) return;
    const b = cv.getBoundingClientRect();
    const cx = Math.floor(((e.clientX - b.left) / b.width) * N), cy = N - 1 - Math.floor(((e.clientY - b.top) / b.height) * N);
    const r = brush - 1;
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r * r + r) continue;   // round brush
        const x = cx + dx, y = cy + dy;
        if (x < 0 || y < 0 || x >= N || y >= N) continue;
        for (const [a, c] of images(x, y, sym)) work[c * N + a] = paint;
      }
    cellRef.current = work;
    redraw();
  };
  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    historyRef.current = [...historyRef.current.slice(-19), { cell, sym }];
    strokeRef.current = cell.slice();
    stamp(e);
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => { if (strokeRef.current) stamp(e); };
  const up = () => { if (strokeRef.current) { const next = strokeRef.current; strokeRef.current = null; commit(next); } };

  const edit = (next: Uint8Array, s: Sym = sym) => { historyRef.current = [...historyRef.current.slice(-19), { cell, sym }]; commit(next, s); };
  const undo = useCallback(() => { const prev = historyRef.current.pop(); if (prev) commit(prev.cell, prev.sym); }, [commit]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); undo(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo]);

  // ---------- readout ----------
  const C = res?.C ?? Array(9).fill(NaN), vol = res?.vol ?? NaN;
  const q = quantities(C, vol);
  const E2 = properties(Float64Array.from([C[4], C[3], C[5], C[1], C[0], C[2], C[7], C[6], C[8]])).E1;
  const whole = connected(show(cell), N);
  const auxetic = whole && q.nu12 < 0;
  const lines = [
    `<math><msub><mi>E</mi><mn>1</mn></msub><mo>=</mo><mn>${num(q.E1, 3)}</mn><mspace width="0.2em"></mspace><mi>E</mi></math>`,
    `<math><msub><mi>E</mi><mn>2</mn></msub><mo>=</mo><mn>${num(E2, 3)}</mn><mspace width="0.2em"></mspace><mi>E</mi></math>`,
    `<math><msub><mi>G</mi><mn>12</mn></msub><mo>=</mo><mn>${num(q.G12, 3)}</mn><mspace width="0.2em"></mspace><mi>E</mi></math>`,
    `<math><msub><mi>ν</mi><mn>12</mn></msub><mo>=</mo><mn>${num(q.nu12, 2)}</mn></math>`,
    `<math><mi>κ</mi><mo>=</mo><mn>${num(q.K, 3)}</mn><mspace width="0.2em"></mspace><mi>E</mi><mo>=</mo><mn>${num(q.K / kappaHS(vol), 2)}</mn><mspace width="0.2em"></mspace><msub><mi>κ</mi><mtext>HS</mtext></msub></math>`,
  ];
  const label = `Drawing grid, 48 by 48, ${Math.round(vol * 100) || 0} percent solid. ${auxetic ? "Auxetic: negative Poisson's ratio." : ""}`;

  const exportSVG = () => {
    const { f, W, H } = panelField(show(cell), N, 1, 1, 0), s = 40 / N;
    download(`sketch-cell-40mm.svg`, loopsToSVG(contour(f, W, H), W, H, s), "image/svg+xml");
  };
  const exportCSV = () => {
    const row = (i: number) => [0, 1, 2].map((j) => C[i * 3 + j].toFixed(6)).join(",");
    download("sketch-stiffness.csv", `# Cell sketchpad, ${window.location.href}\n# Homogenized stiffness C/E, Voigt order 11, 22, 12 (engineering shear); solid E = 1, nu = 0.3, plane stress; 48 x 48 elements, volume ${vol.toFixed(4)}\n${row(0)}\n${row(1)}\n${row(2)}\n`, "text/csv");
  };

  return (
    <ToolShell
      path="/tools/sketchpad"
      slug="sketchpad"
      methodRef={{ label: "Andreassen & Andreasen 2014", href: "https://doi.org/10.1016/j.commatsci.2013.09.006" }}
      method={<>
        <p>The drawing is one periodic unit cell of 48 × 48 bilinear elements, each solid (E = 1, ν = 0.3) or void (E = 10⁻⁹), in plane stress. Energy-based homogenization after Andreassen and Andreasen (2014) gives its effective stiffness.</p>
        <p>Kaleidoscope and mirror drawings are solved on a quarter of the cell, which gives the same result faster.</p>
      </>}
      limits={<>
        <p>Linear elastic, small strains, plane stress; stiffness in units of the solid's E.</p>
        <p>Elements that touch only at a corner still pass load in this mesh, but would be weak hinges in a real part. Give joints some width.</p>
      </>}
    >
      <div className="grid gap-x-12 gap-y-8 md:grid-cols-[minmax(0,max(18rem,calc(100svh-19.5rem)))_minmax(0,22rem)] md:justify-start">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Segmented label="Brush" value={String(paint)} onChange={(v) => setPaint(v === "1" ? 1 : 0)} options={[{ v: "1", text: "Solid" }, { v: "0", text: "Void" }]} />
            <label className="t-small flex items-center gap-2 text-ink-2">Size
              <input type="range" min={1} max={6} step={1} value={brush} onChange={(e) => setBrush(Number(e.target.value))} className="w-24 accent-ink" aria-valuetext={`${brush} elements`} />
            </label>
          </div>
          <canvas ref={drawRef} role="img" aria-label={label}
            onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
            className="block aspect-square w-full cursor-crosshair touch-none border border-rule" />
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn" onClick={undo}>Undo</button>
            <button type="button" className="btn" onClick={() => edit(new Uint8Array(N * N))}>Clear</button>
            <button type="button" className="btn" onClick={() => edit(Uint8Array.from(cell, (v) => 1 - v))}>Invert</button>
            <button type="button" className="btn" onClick={() => edit(symmetrized(example(), sym))}>Load example</button>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <div>
            <p className="t-small mb-1.5 text-ink-2">Symmetry</p>
            <Segmented label="Symmetry" value={sym} onChange={(v) => { const s = v as Sym; edit(symmetrized(cell, s), s); }} options={SYMS} />
          </div>
          <div>
            <p className="t-small mb-1.5 text-ink-2">Tiled 3 × 3</p>
            <canvas ref={tileRef} aria-hidden="true" className="block aspect-square w-full max-w-[14rem]" />
          </div>
          <div className="min-w-0">
            <p className="t-small mb-0.5 text-ink-2">Homogenized stiffness</p>
            <MathML className="math sm overflow-x-auto overflow-y-hidden" html={tensorMath(C, [0, 1, 2, 3, 4, 5, 6, 7, 8])} />
          </div>
          <div className="min-w-0">
            <p className="t-small mb-1.5 text-ink-2">Properties</p>
            <div className="math sm flex flex-col gap-1">{lines.map((h, i) => <MathML key={i} html={h} />)}</div>
            <p className="t-small mt-2 text-ink-2" role="status" aria-live="polite">
              {failed ? "This browser can't run the solver." : !res ? "Computing…" : !whole ? "The solid doesn't connect across the cell, so it has almost no stiffness." : auxetic ? `Auxetic: it gets wider when stretched. ${Math.round(vol * 100)} % solid.` : `${Math.round(vol * 100)} % solid.`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn" onClick={exportSVG}>Cell SVG</button>
            <button type="button" className="btn" onClick={exportCSV}>Stiffness CSV</button>
          </div>
        </div>
      </div>
    </ToolShell>
  );
};

export default Sketchpad;

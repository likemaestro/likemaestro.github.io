import React, { useCallback, useEffect, useRef, useState } from "react";
import ToolShell from "../ToolShell";
import { useToolParams } from "../useToolParams";
import { cells, phoneSeeds, seeds } from "../../lab/precomputed";
import type { Objective } from "../../lab/unitcell";
import type { WorkerOut } from "../../lab/unitcell.worker";
import { createWorker } from "../../lab/createWorker";
import { decode, drawLattice } from "../../lab/lattice";
import { goalMath, kappa, kappaHS, MathML, quantities, quantity, subjectMath, target as targetOf, TARGETS, tensorMath, Trace } from "../../lab/readout";
import { connected, greyFraction } from "../../lab/geometry";
import { contour, panelField } from "../../lab/contour";
import { download, loopsToDXF, loopsToSVG } from "../../lab/export";

const media = (q: string) => typeof window !== "undefined" && !!window.matchMedia && window.matchMedia(q).matches;
const COARSE = media("(pointer: coarse)");
const SPEC = {
  target: { kind: "enum", values: ["axial", "shear", "bulk", "auxetic"], def: "auxetic" },
  vf: { kind: "num", min: 0.3, max: 0.6, step: 0.05, def: 0.4 },
  n: { kind: "enum", values: ["48", "64", "80"], def: COARSE ? "48" : "80" },
  r: { kind: "num", min: 1.5, max: 3, step: 0.25, def: 2 },
  seed: { kind: "num", min: 1, max: 2147483646, step: 1, def: 0 },
  tiles: { kind: "enum", values: ["1", "3", "5"], def: "3" },
} as const;
const FINAL = Object.fromEntries(Object.entries(cells).map(([k, v]) => [k, decode(v.rho)])) as Record<Objective, Uint8Array>;
const MAX_RETRIES = 6;
const defaultSeed = (t: Objective, n: number) => (n === 48 ? phoneSeeds : seeds)[t]?.[0] ?? cells[t].seed;

type Mode = "precomputed" | "ready" | "running" | "paused" | "converged";
interface Result { iter: number; vol: number; C: number[]; hist: number[]; grey?: number; whole?: boolean }

const Field: React.FC<{ label: string; value?: string; children: React.ReactNode; htmlFor?: string }> = ({ label, value, children, htmlFor }) => (
  <div className="min-w-0">
    <div className="flex items-baseline justify-between gap-2">
      <label htmlFor={htmlFor} className="t-small text-ink-2">{label}</label>
      {value && <output htmlFor={htmlFor} className="t-data">{value}</output>}
    </div>
    <div className="mt-1.5">{children}</div>
  </div>
);

const Segmented: React.FC<{ label: string; options: { v: string; text: string }[]; value: string; onChange: (v: string) => void; cols?: number }> = ({ label, options, value, onChange, cols }) => (
  <div role="group" aria-label={label} className={`grid rounded-[2px] border border-ink ${cols === 2 ? "grid-cols-2" : "grid-flow-col auto-cols-fr"}`}>
    {options.map((o, i) => (
      <button key={o.v} type="button" aria-pressed={value === o.v} onClick={() => onChange(o.v)}
        className={`t-data min-h-[2.25rem] px-2 transition-colors duration-150 [@media(pointer:coarse)]:min-h-[44px] ${i && (cols !== 2 || i % 2) ? "border-l border-rule" : ""} ${cols === 2 && i >= 2 ? "border-t border-rule" : ""} ${
          value === o.v ? "bg-ink font-[600] text-canvas" : "text-ink-2 hover:bg-wash hover:text-ink"}`}>
        {o.text}
      </button>
    ))}
  </div>
);

const UnitCellDesigner: React.FC = () => {
  const { values: p, clamped, set } = useToolParams(SPEC);
  const t = p.target as Objective, n = Number(p.n), vf = p.vf, r = p.r, tiles = Number(p.tiles);
  const seed = p.seed || defaultSeed(t, n);
  const T = targetOf(t);
  const pre = n === 80 && vf === 0.4 && r === 2 && seed === cells[t].seed;
  const vetted = vf === 0.4 && r === 2;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const rhoRef = useRef<Uint8Array | Float32Array>(FINAL[t]);
  const runIdRef = useRef(0);
  const [mode, setMode] = useState<Mode>("precomputed");
  const [res, setRes] = useState<Result>(() => ({ iter: cells[t].iter, vol: cells[t].vol, C: [...cells[t].C], hist: [...cells[t].hist[T.track]] }));
  const [supported, setSupported] = useState(true);
  const autoRef = useRef(false);      // the next settings change continues a run (a retry), rather than resetting
  const retriesRef = useRef(0);
  const [retryNote, setRetryNote] = useState("");

  const draw = useCallback(() => { if (canvasRef.current) drawLattice(canvasRef.current, rhoRef.current, tiles, tiles, tiles > 1 ? [(tiles - 1) / 2, (tiles - 1) / 2] : undefined); }, [tiles]);
  useEffect(() => {
    draw();
    const ro = new ResizeObserver(draw);
    if (canvasRef.current) ro.observe(canvasRef.current);
    return () => ro.disconnect();
  }, [draw]);

  const worker = useCallback(() => {
    if (workerRef.current) return workerRef.current;
    try {
      const w = createWorker();
      w.onerror = () => { w.terminate(); workerRef.current = null; setSupported(false); };
      return (workerRef.current = w);
    } catch { setSupported(false); return null; }
  }, []);
  useEffect(() => () => workerRef.current?.terminate(), []);

  /** Start a run with the current settings; `go` false stops after the first frame so the start design shows. */
  const start = useCallback((go: boolean) => {
    const w = worker();
    if (!w) return;
    const id = ++runIdRef.current;
    let first = true;
    w.onmessage = (e: MessageEvent<WorkerOut>) => {
      const m = e.data;
      if (m.id !== runIdRef.current) return;
      rhoRef.current = m.rho;
      const q = quantities(m.C, m.vol);
      const v = { E1: q.E1, G12: q.G12, nu12: q.nu12, K: kappa(m.C) }[T.track];
      setRes((prev) => ({ iter: m.iter, vol: m.vol, C: m.C, hist: [...(m.iter === 1 ? [] : prev.hist), v],
        ...(m.done ? { grey: greyFraction(m.rho), whole: connected(m.rho, n) } : {}) }));
      if (m.done) {
        // Axial and bulk runs away from the checked settings often stall at uniform grey. Move on to the next seed
        // (a fixed step, so the final link still reproduces) a few times before reporting it.
        const grey = greyFraction(m.rho);
        if (grey > 0.5 && retriesRef.current < MAX_RETRIES) {
          retriesRef.current++;
          const next = (seed % 2147483646) + 7919;
          setRetryNote(`Seed ${seed} stayed grey, so the run moved on to seed ${next}.`);
          autoRef.current = true;
          set({ seed: next });
          return;
        }
        setMode("converged");
      }
      else if (first && !go) { w.postMessage({ type: "pause" }); setMode("ready"); }
      first = false;
      draw();
    };
    setRes({ iter: 0, vol: vf, C: Array(9).fill(NaN), hist: [] });
    setMode(go ? "running" : "ready");
    w.postMessage({ type: "run", obj: t, n, id, seed, vf, rmin: r });
  }, [worker, T.track, n, t, seed, vf, r, draw, set]);

  // Settings changed (or first load): the precomputed design when it matches, otherwise the start design, run at
  // once on a first visit through a shared link unless the visitor prefers reduced motion.
  const firstRef = useRef(true);
  useEffect(() => {
    const first = firstRef.current;
    firstRef.current = false;
    if (pre) {
      runIdRef.current++;
      workerRef.current?.postMessage({ type: "cancel" });
      rhoRef.current = FINAL[t];
      setRes({ iter: cells[t].iter, vol: cells[t].vol, C: [...cells[t].C], hist: [...cells[t].hist[T.track]], grey: greyFraction(FINAL[t]), whole: connected(FINAL[t], 80) });
      setMode("precomputed");
      draw();
      return;
    }
    const auto = autoRef.current;
    autoRef.current = false;
    if (!auto) { retriesRef.current = 0; setRetryNote(""); }
    const timer = window.setTimeout(() => start(auto || (first && !media("(prefers-reduced-motion: reduce)"))), first || auto ? 0 : 200);
    return () => window.clearTimeout(timer);
  }, [pre, t, n, vf, r, seed]);   // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = () => {
    const w = workerRef.current;
    if (mode === "running") { w?.postMessage({ type: "pause" }); setMode("paused"); }
    else if (mode === "paused" || mode === "ready") { w?.postMessage({ type: "resume" }); setMode("running"); }
    else start(true);
  };

  const q = quantities(res.C, res.vol);
  const live = mode === "running" || mode === "paused";
  const done = mode === "converged" || mode === "precomputed";
  const status =
    mode === "running" ? `Iteration ${res.iter}`
      : mode === "paused" ? `Paused at iteration ${res.iter}`
        : mode === "ready" ? "Start design. Press Run."
          : mode === "converged" ? ((res.grey ?? 0) > 0.5 ? `Stayed grey (iteration ${res.iter}). Try another seed or the checked settings.`
            : res.iter >= 160 ? `Stopped at the iteration limit (${res.iter})` : `Converged at iteration ${res.iter}`)
            : `Precomputed, converged at iteration ${res.iter}`;
  const runText = mode === "running" ? "Pause" : mode === "paused" ? "Resume" : mode === "ready" ? "Run" : "Run again";
  const label = `${tiles} by ${tiles} tiling of a unit cell optimized for ${T.aria}. ${status}.`;

  // ---------- exports ----------
  const [panel, setPanel] = useState({ nx: 4, ny: 4, cell: 40, frame: 5 });
  const base = `unit-cell-${t}-V${vf.toFixed(2)}-n${n}-r${r}-seed${seed}`;
  const outline = (nx: number, ny: number, frameMm: number, cellMm: number) => {
    const rho = rhoRef.current, m = Math.round(Math.sqrt(rho.length)), s = cellMm / m;
    const { f, W, H } = panelField(rho, m, nx, ny, Math.round(frameMm / s));
    return { loops: contour(f, W, H), W, H, s };
  };
  const exportCellSVG = () => { const o = outline(1, 1, 0, panel.cell); download(`${base}-${panel.cell}mm.svg`, loopsToSVG(o.loops, o.W, o.H, o.s), "image/svg+xml"); };
  const exportPanel = (kind: "svg" | "dxf") => {
    const o = outline(panel.nx, panel.ny, panel.frame, panel.cell), name = `${base}-panel-${panel.nx}x${panel.ny}-${panel.cell}mm`;
    if (kind === "svg") download(`${name}.svg`, loopsToSVG(o.loops, o.W, o.H, o.s), "image/svg+xml");
    else download(`${name}-units-mm.dxf`, loopsToDXF(o.loops, o.s), "application/dxf");
  };
  const meta = `target ${t}, V ${vf.toFixed(2)}, mesh ${n}, filter radius ${r}, seed ${seed}`;
  const exportCSV = () => {
    const row = (i: number) => [0, 1, 2].map((j) => res.C[i * 3 + j].toFixed(6)).join(",");
    download(`${base}-stiffness.csv`, `# Unit-cell designer, ${window.location.href}\n# ${meta}\n# Homogenized stiffness C/E, Voigt order 11, 22, 12 (engineering shear); base material E = 1, nu = 0.3, plane stress\n${row(0)}\n${row(1)}\n${row(2)}\n`, "text/csv");
  };
  const exportJSON = () => download(`${base}.json`, JSON.stringify({
    tool: "Unit-cell designer", url: window.location.href,
    settings: { target: t, volumeFraction: vf, mesh: n, filterRadius: r, seed },
    material: { E: 1, nu: 0.3, planeStress: true },
    result: { iterations: res.iter, volume: res.vol, C: res.C, E1: q.E1, G12: q.G12, nu12: q.nu12, kappa: q.K, greyFraction: res.grey, connected: res.whole },
  }, null, 2), "application/json");
  const exportWallpaper = () => {
    const dpr = window.devicePixelRatio || 1, k = Math.min(1, 3000 / (Math.max(window.screen.width, window.screen.height) * dpr));
    const W = Math.round(window.screen.width * dpr * k), H = Math.round(window.screen.height * dpr * k), cols = 3, rows = Math.ceil((cols * H) / W);
    const tmp = document.createElement("canvas"), out = document.createElement("canvas");
    drawLattice(tmp, rhoRef.current, cols, rows, undefined, W);
    out.width = W; out.height = H;
    out.getContext("2d")!.drawImage(tmp, 0, Math.round((H - tmp.height) / 2));
    out.toBlob((b) => b && download(`${base}-wallpaper.png`, b, "image/png"), "image/png");
  };
  // The frame is cut to whole elements, so the size shown is the size of the file.
  const mesh = Math.round(Math.sqrt(rhoRef.current.length)), frameMm = (Math.round(panel.frame / (panel.cell / mesh)) * panel.cell) / mesh;
  const panelSize = `${+(panel.nx * panel.cell + 2 * frameMm).toFixed(2)} × ${+(panel.ny * panel.cell + 2 * frameMm).toFixed(2)} mm`;
  const num = (v: string, lo: number, hi: number, d: number) => { const x = Number(v); return Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : d; };

  const reference = t === "auxetic" ? 0 : t === "bulk" ? kappaHS(res.vol) : undefined;
  const lines = (["E1", "G12", "nu12", "K"] as const).map((k) => quantity(k, q));

  return (
    <ToolShell
      path="/tools/unit-cell"
      slug="unit-cell"
      methodRef={{ label: "Andreassen & Andreasen 2014", href: "https://doi.org/10.1016/j.commatsci.2013.09.006" }}
      method={<>
        <p>Energy-based homogenization of a periodic unit cell on a square mesh of bilinear elements, after Andreassen and Andreasen (2014). Base material E = 1, ν = 0.3, plane stress.</p>
        <p>Densities follow SIMP (p = 3) with a density filter and a Heaviside projection that sharpens during the run; MMA updates the design under the volume constraint. The cell keeps the square’s symmetries, so it tiles in both directions.</p>
      </>}
      limits={<>
        <p>Linear elastic, small strains, plane stress; stiffness in units of the base material’s E. A research demo, not a design check.</p>
        <p>A link reproduces the settings. Another browser engine can end a run in a slightly different design.</p>
        <p>Cutting files trace density 0.5 after light smoothing. Check the thinnest features against your cutter’s kerf before cutting.</p>
      </>}
    >
      {clamped.length > 0 && <p className="t-small mb-4 text-ink-2">Some link settings were out of range and have been adjusted: {clamped.join(", ")}.</p>}
      <div className="grid gap-x-8 gap-y-8 md:grid-cols-[14rem_minmax(0,1fr)] xl:grid-cols-[14rem_minmax(0,1fr)_17rem]">
        {/* Controls */}
        <div className="flex min-w-0 flex-col gap-4">
          <Field label="Target"><Segmented label="Optimization target" cols={2} value={t} onChange={(v) => set({ target: v, seed: defaultSeed(v as Objective, n) })} options={TARGETS.map((x) => ({ v: x.id, text: x.label }))} /></Field>
          <Field label="Volume fraction" value={vf.toFixed(2)} htmlFor="uc-vf">
            <input id="uc-vf" type="range" min={0.3} max={0.6} step={0.05} value={vf} onChange={(e) => set({ vf: e.target.value })} className="w-full accent-ink" />
          </Field>
          <Field label="Filter radius, elements" value={r.toFixed(2)} htmlFor="uc-r">
            <input id="uc-r" type="range" min={1.5} max={3} step={0.25} value={r} onChange={(e) => set({ r: e.target.value })} className="w-full accent-ink" />
          </Field>
          <Field label="Mesh, elements per side"><Segmented label="Mesh" value={String(n)} onChange={(v) => set({ n: v, seed: defaultSeed(t, Number(v)) })} options={["48", "64", "80"].map((v) => ({ v, text: v }))} /></Field>
          <Field label="Seed" htmlFor="uc-seed">
            <div className="flex gap-2">
              <input id="uc-seed" type="number" inputMode="numeric" min={1} value={seed} onChange={(e) => e.target.value && set({ seed: e.target.value })}
                className="t-data h-9 w-full min-w-0 rounded-[2px] border border-rule bg-transparent px-2 [@media(pointer:coarse)]:h-11" />
              <button type="button" className="btn shrink-0" onClick={() => set({ seed: 1 + Math.floor(Math.random() * 2147483645) })}>New</button>
            </div>
          </Field>
          {!vetted && <p className="t-small text-ink-2">Seeds are checked at V = 0.40 and filter radius 2. Other settings can end grey or in separate pieces; the checks below the result say which.</p>}
          {supported && <button type="button" onClick={toggle} className="btn btn-solid self-start">{runText}</button>}
          {!supported && <p className="t-small text-ink-2">This browser can’t run the solver; the precomputed design shows instead.</p>}
        </div>

        {/* Lattice: first on phones, sized from the viewport height on larger screens so the tool fits the first screen */}
        <div className="min-w-0 max-md:order-first">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="t-small text-ink-2" aria-hidden="true">{status}</p>
            <div className="w-36"><Segmented label="Tiles" value={String(tiles)} onChange={(v) => set({ tiles: v })} options={["1", "3", "5"].map((v) => ({ v, text: `${v} × ${v}` }))} /></div>
          </div>
          <canvas ref={canvasRef} role="img" aria-label={label} className="mx-auto block aspect-square w-full md:max-w-[max(18rem,min(100%,calc(100svh-19.5rem)))]" />
          {retryNote && <p className="t-small mt-2 text-ink-2">{retryNote}</p>}
          <p className="sr-only" role="status" aria-live="polite">{mode === "running" ? "Computing in your browser" : status}</p>
        </div>

        {/* Readout */}
        <div className="flex min-w-0 flex-col gap-5 md:col-span-2 md:grid md:grid-cols-3 xl:col-span-1 xl:flex">
          <div className="min-w-0">
            <p className="t-small mb-1.5 text-ink-2">Objective</p>
            <div className="math sm flex flex-col gap-1 overflow-x-auto overflow-y-hidden">
              <MathML html={goalMath(t)} />
              <MathML html={subjectMath(vf)} />
            </div>
          </div>
          <div className="min-w-0">
            <p className="t-small mb-0.5 text-ink-2">Homogenized stiffness</p>
            <MathML className="math sm overflow-x-auto overflow-y-hidden" html={tensorMath(res.C, T.active)} />
          </div>
          <div className="min-w-0">
            <p className="t-small mb-1.5 text-ink-2">Properties</p>
            <div className="math sm flex flex-col gap-1">{lines.map((h, i) => <MathML key={i} html={h} />)}</div>
            <div className="mt-3 flex"><Trace data={res.hist} reference={reference} live={live} /></div>
            <p className="t-small mt-1 flex flex-wrap gap-x-3 text-ink-2">
              <span>Seed {seed}</span>
              {done && res.grey !== undefined && <span>Grey {(res.grey * 100).toFixed(1)} %</span>}
              {done && res.whole !== undefined && <span>{res.whole ? "Solid in one piece" : "Solid in separate pieces"}</span>}
            </p>
          </div>
        </div>
      </div>

      {/* Exports */}
      <section aria-labelledby="export-h" className="mt-12 border-t border-rule pt-8">
        <h2 id="export-h" className="t-h3">Export</h2>
        <p className="t-small mt-1 text-ink-2">Exports use the design on screen{live ? ", including a run in progress" : ""}.</p>
        <div className="mt-5 grid gap-x-10 gap-y-8 md:grid-cols-2">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn" onClick={exportCellSVG}>Cell SVG</button>
            <button type="button" className="btn" onClick={exportCSV}>Stiffness CSV</button>
            <button type="button" className="btn" onClick={exportJSON}>Settings JSON</button>
            <button type="button" className="btn" onClick={exportWallpaper}>Phone wallpaper</button>
          </div>
          <div className="min-w-0">
            <p className="t-small text-ink-2">Panel for cutting: the cell tiled in a solid frame, as closed outlines.</p>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {([["nx", "Tiles across", 1, 30], ["ny", "Tiles down", 1, 30], ["cell", "Cell, mm", 2, 500], ["frame", "Frame, mm", 0, 100]] as const).map(([k, l, lo, hi]) => (
                <label key={k} className="t-small text-ink-2">{l}
                  <input type="number" min={lo} max={hi} value={panel[k]} onChange={(e) => setPanel((s) => ({ ...s, [k]: num(e.target.value, lo, hi, s[k]) }))}
                    className="t-data mt-1 block h-9 w-full rounded-[2px] border border-rule bg-transparent px-2 text-ink [@media(pointer:coarse)]:h-11" />
                </label>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="t-data mr-2 text-ink-2">Panel {panelSize}</span>
              <button type="button" className="btn" onClick={() => exportPanel("svg")}>Panel SVG</button>
              <button type="button" className="btn" onClick={() => exportPanel("dxf")}>Panel DXF</button>
            </div>
          </div>
        </div>
      </section>
    </ToolShell>
  );
};

export default UnitCellDesigner;

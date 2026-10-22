import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { cells, initial, N, seeds } from "../lab/precomputed";
import type { Objective } from "../lab/unitcell";
import type { WorkerOut } from "../lab/unitcell.worker";
import { createWorker } from "../lab/createWorker";

type Mode = "precomputed" | "running" | "paused" | "converged";
type Key = "E1" | "G12" | "nu12" | "K";

const TARGETS: { id: Objective; label: string; track: Key; aria: string; active: number[] }[] = [
  { id: "axial", label: "Axial", track: "E1", aria: "axial stiffness", active: [0, 4] },
  { id: "shear", label: "Shear", track: "G12", aria: "shear stiffness", active: [8] },
  { id: "bulk", label: "Bulk", track: "K", aria: "bulk modulus", active: [0, 1, 3, 4] },
  { id: "auxetic", label: "Auxetic", track: "nu12", aria: "a negative Poisson's ratio", active: [0, 1, 3, 4] },
];

// Objective and homogenized stiffness, typeset as MathML (native in current browsers, no math library).
const Ch = (ij: string) => `<msubsup><mi>C</mi><mn>${ij}</mn><mi mathvariant="normal">H</mi></msubsup>`;
const op = (name: string) => `<munder><mi>${name}</mi><mi>ρ</mi></munder><mspace width="0.3em"></mspace>`;
const GOAL: Record<Objective, string> = {
  axial: `${op("max")}${Ch("11")}<mo>+</mo>${Ch("22")}`,
  shear: `${op("max")}${Ch("33")}`,
  bulk: `${op("max")}${Ch("11")}<mo>+</mo>${Ch("22")}<mo>+</mo><mn>2</mn>${Ch("12")}`,
  auxetic: `${op("min")}${Ch("12")}<mo>−</mo><mi>w</mi><mo stretchy="false">(</mo>${Ch("11")}<mo>+</mo>${Ch("22")}<mo stretchy="false">)</mo>`,
};
const goalMath = (t: Objective) => `<math displaystyle="true"><mrow>${GOAL[t]}</mrow></math>`;
const SUBJECT = `<math><mtext>subject to</mtext><mspace width="0.5em"></mspace><mi>V</mi><mo>≤</mo><mn>0.40</mn></math>`;
const entry = (v: number) => (!Number.isFinite(v) ? "·" : Math.abs(v) < 5e-4 ? "0.000" : (v < 0 ? "−" : "") + Math.abs(v).toFixed(3));
const tensorMath = (C: number[], active: number[]) =>
  `<math displaystyle="true"><mrow><mfrac><msup><mi>C</mi><mi mathvariant="normal">H</mi></msup><mi>E</mi></mfrac><mo>=</mo><mrow><mo>[</mo><mtable>${[0, 1, 2]
    .map((i) => `<mtr>${[0, 1, 2].map((j) => `<mtd><mn${active.includes(i * 3 + j) ? "" : ' class="dim"'}>${entry(C[i * 3 + j])}</mn></mtd>`).join("")}</mtr>`)
    .join("")}</mtable><mo>]</mo></mrow></mrow></math>`;

const decode = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
const INITIAL = decode(initial);
const FINAL = Object.fromEntries(Object.entries(cells).map(([k, v]) => [k, decode(v.rho)])) as Record<Objective, Uint8Array>;

// density 0 → canvas, 0.5 → steel, 1 → ink
const STOPS = [[0xf6, 0xf7, 0xf5], [0x81, 0x91, 0x99], [0x17, 0x20, 0x27]];
const LUT = new Uint8ClampedArray(256 * 4);
for (let i = 0; i < 256; i++) {
  const t = i / 255, s = t < 0.5 ? 0 : 1, u = t < 0.5 ? t * 2 : t * 2 - 1;
  for (let c = 0; c < 3; c++) LUT[i * 4 + c] = STOPS[s][c] + (STOPS[s + 1][c] - STOPS[s][c]) * u;
  LUT[i * 4 + 3] = 255;
}

// 2D bulk modulus from the equibiaxial energy, and its Hashin–Shtrikman upper bound for a porous solid at volume f
// (plane stress, E = 1, nu = 0.3: kappa_s = 1/1.4, mu_s = 1/2.6).
const kappa = (C: ArrayLike<number>) => (C[0] + C[4] + 2 * C[1]) / 4;
const KS = 1 / 1.4, GS = 1 / 2.6;
const kappaHS = (f: number) => (f * KS * GS) / ((1 - f) * KS + GS);
const SYM: Record<Key, string> = {
  E1: "<msub><mi>E</mi><mn>1</mn></msub>",
  G12: "<msub><mi>G</mi><mn>12</mn></msub>",
  nu12: "<msub><mi>ν</mi><mn>12</mn></msub>",
  K: "<mi>κ</mi>",
};
const num = (v: number, d: number) => (!Number.isFinite(v) ? "·" : (v < 0 ? "−" : "") + Math.abs(v).toFixed(d));
// The tracked result typeset as "symbol = value" in units of E; bulk also as a fraction of its HS bound (the dashed line).
const quantity = (k: Key, r: { E1: number; G12: number; nu12: number; K: number; vol: number }) => {
  const sp = '<mspace width="0.2em"></mspace>';
  const unit = k === "nu12" ? "" : `${sp}<mi>E</mi>`;
  const hs = k === "K" ? `<mo>=</mo><mn>${num(r.K / kappaHS(r.vol), 2)}</mn>${sp}<msub><mi>κ</mi><mtext>HS</mtext></msub>` : "";
  return `<math>${SYM[k]}<mo>=</mo><mn>${num(r[k], k === "nu12" ? 2 : 3)}</mn>${unit}${hs}</math>`;
};
const COLS = 4, ROWS = 3;   // the lattice shows the cell tiled 4 × 3
const media = (q: string) => typeof window !== "undefined" && !!window.matchMedia && window.matchMedia(q).matches;

const ICON = {
  play: <path d="M5 3.5v9l7.5-4.5z" fill="currentColor" stroke="none" />,
  pause: <path d="M5.5 3.5v9M10.5 3.5v9" />,
  again: <><path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9" /><path d="M12.6 1.8v2.8H9.8" /></>,
};

interface Readout { iter: number; vol: number; E1: number; G12: number; nu12: number; K: number; C: number[]; seed?: number; hist: number[] }

function finalReadout(t: Objective): Readout {
  const c = cells[t], track = TARGETS.find((x) => x.id === t)!.track;
  return { iter: c.iter, vol: c.vol, E1: c.E1, G12: c.G12, nu12: c.nu12, K: c.K, C: [...c.C], hist: [...c.hist[track]] };
}

// Convergence of the target quantity: a slim line with a dashed physical reference and the live end point, no axes.
const Trace: React.FC<{ data: number[]; reference?: number; live: boolean }> = ({ data, reference, live }) => {
  const W = 600, H = 36;
  if (data.length < 2) return <div className="h-9 min-w-0 flex-1" aria-hidden="true" />;
  const ref = reference !== undefined && Number.isFinite(reference) ? reference : undefined;
  let lo = Math.min(...data, ref ?? Infinity), hi = Math.max(...data, ref ?? -Infinity);
  if (hi - lo < 1e-9) { lo -= 1; hi += 1; }
  const x = (i: number) => (i / (data.length - 1)) * W;
  const y = (v: number) => H - 3 - ((v - lo) / (hi - lo)) * (H - 6);
  const last = data.length - 1;
  return (
    <div className="relative h-9 min-w-0 flex-1" aria-hidden="true">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
        {ref !== undefined && <line x1={0} x2={W} y1={y(ref)} y2={y(ref)} stroke="#819199" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />}
        <polyline points={data.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ")} fill="none" stroke="#172027" strokeWidth="1.25" vectorEffect="non-scaling-stroke" />
      </svg>
      <span
        className={`absolute h-[7px] w-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full ${live ? "bg-laser" : "bg-ink"}`}
        style={{ left: "100%", top: `${(y(data[last]) / H) * 100}%` }}
      />
    </div>
  );
};

const LiveCell: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const rhoRef = useRef<Uint8Array | Float32Array>(FINAL.auxetic);
  const visibleRef = useRef(true);
  const autoPausedRef = useRef(false);
  const autoplayRef = useRef<boolean | null>(null);
  const runIdRef = useRef(0);
  const targetRef = useRef<Objective>("auxetic");
  const lastSeedRef = useRef<Partial<Record<Objective, number>>>({});

  const [target, setTarget] = useState<Objective>("auxetic");
  const [mode, setMode] = useState<Mode>("precomputed");
  const [supported, setSupported] = useState(true);
  const [r, setR] = useState<Readout>(() => finalReadout("auxetic"));
  const [details, setDetails] = useState(false);   // phones only: formulation and matrix open on demand
  const detailsId = useId();
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const draw = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const dpr = window.devicePixelRatio || 1;
    const px = Math.round((cv.clientWidth || 300) * dpr), t = px / COLS, py = Math.round(t * ROWS);
    if (cv.width !== px || cv.height !== py) { cv.width = px; cv.height = py; }
    const g = cv.getContext("2d");
    if (!g) return;
    const src = rhoRef.current, isFloat = src instanceof Float32Array;
    const img = new ImageData(N, N);
    for (let ey = 0; ey < N; ey++)
      for (let ex = 0; ex < N; ex++) {
        const v = src[ey * N + ex], k = isFloat ? Math.round(Math.min(1, Math.max(0, v)) * 255) : v;
        img.data.set(LUT.subarray(k * 4, k * 4 + 4), ((N - 1 - ey) * N + ex) * 4);   // row 0 is the bottom edge
      }
    const tile = document.createElement("canvas");
    tile.width = N; tile.height = N;
    tile.getContext("2d")!.putImageData(img, 0, 0);
    g.imageSmoothingEnabled = false;
    const at = (k: number) => Math.round(k * t);
    for (let i = 0; i < COLS; i++) for (let j = 0; j < ROWS; j++) g.drawImage(tile, at(i), at(j), at(i + 1) - at(i), at(j + 1) - at(j));
    g.strokeStyle = "#F05A24";
    g.lineWidth = 1.5 * dpr;
    const h = g.lineWidth / 2;
    g.strokeRect(at(1) + h, at(1) + h, at(2) - at(1) - 2 * h, at(2) - at(1) - 2 * h);
  }, []);

  const showFinal = useCallback((t: Objective) => {
    runIdRef.current++;
    workerRef.current?.postMessage({ type: "cancel" });
    rhoRef.current = FINAL[t];
    setR(finalReadout(t));
    setMode("precomputed");
    draw();
  }, [draw]);

  const ensureWorker = useCallback(() => {
    if (workerRef.current) return workerRef.current;
    if (typeof Worker === "undefined") return null;
    try {
      const w = createWorker();
      w.onerror = () => {
        w.terminate();
        workerRef.current = null;
        setSupported(false);
        showFinal(targetRef.current);
      };
      workerRef.current = w;
      return w;
    } catch {
      return null;
    }
  }, [showFinal]);

  const start = useCallback((t: Objective) => {
    const w = ensureWorker();
    if (!w) { setSupported(false); showFinal(t); return; }
    const track = TARGETS.find((x) => x.id === t)!.track;
    const id = ++runIdRef.current;
    // A different vetted seed each run (never the same twice in a row), so every run grows a new design.
    const pool = seeds[t] ?? [];
    let seed = pool[Math.floor(Math.random() * pool.length)];
    while (pool.length > 1 && seed === lastSeedRef.current[t]) seed = pool[Math.floor(Math.random() * pool.length)];
    lastSeedRef.current[t] = seed;
    w.onmessage = (e: MessageEvent<WorkerOut>) => {
      const m = e.data;
      if (m.id !== runIdRef.current) return;
      rhoRef.current = m.rho;
      const G12 = m.C[8], K = kappa(m.C);
      setR((p) => ({ iter: m.iter, vol: m.vol, E1: m.E1, G12, nu12: m.nu12, K, C: m.C, seed, hist: [...(m.iter === 1 ? [] : p.hist), { E1: m.E1, G12, nu12: m.nu12, K }[track]] }));
      if (m.done) setMode("converged");
      draw();
    };
    autoPausedRef.current = false;
    setR({ iter: 0, vol: cells[t].vol, E1: NaN, G12: NaN, nu12: NaN, K: NaN, C: Array(9).fill(NaN), seed, hist: [] });
    setMode("running");
    draw();
    w.postMessage({ type: "run", obj: t, n: N, id, seed });
  }, [draw, ensureWorker, showFinal]);

  const select = (t: Objective) => {
    setTarget(t);
    targetRef.current = t;
    if (!supported || media("(prefers-reduced-motion: reduce)")) showFinal(t);
    else start(t);
  };

  const toggle = () => {
    const w = workerRef.current;
    if (mode === "running") { w?.postMessage({ type: "pause" }); autoPausedRef.current = false; setMode("paused"); }
    else if (mode === "paused") { w?.postMessage({ type: "resume" }); setMode("running"); }
    else start(target);
  };

  // Autoplay once on large, fine-pointer screens without reduced motion; otherwise the precomputed result stays.
  useEffect(() => {
    autoplayRef.current = media("(min-width: 1024px) and (pointer: fine)") && !media("(prefers-reduced-motion: reduce)");
    if (autoplayRef.current) rhoRef.current = INITIAL;
    draw();
    const box = boxRef.current;
    const pauseIfHidden = () => {
      const hidden = !visibleRef.current || document.hidden;
      const w = workerRef.current;
      if (hidden && modeRef.current === "running") { w?.postMessage({ type: "pause" }); autoPausedRef.current = true; setMode("paused"); }
      else if (!hidden && autoPausedRef.current && modeRef.current === "paused") { autoPausedRef.current = false; w?.postMessage({ type: "resume" }); setMode("running"); }
    };
    const io = new IntersectionObserver(([e]) => {
      visibleRef.current = e.isIntersecting;
      if (e.isIntersecting && autoplayRef.current) { autoplayRef.current = false; start("auxetic"); }
      pauseIfHidden();
    }, { threshold: 0.35 });
    if (box) io.observe(box);
    const ro = new ResizeObserver(() => draw());
    if (canvasRef.current) ro.observe(canvasRef.current);
    document.addEventListener("visibilitychange", pauseIfHidden);
    return () => {
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", pauseIfHidden);
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, [draw, start]);

  const T = TARGETS.find((x) => x.id === target)!;
  const live = mode === "running" || mode === "paused";
  const status =
    mode === "running" ? "Computing in your browser"
      : mode === "paused" ? `Paused at iteration ${r.iter}`
        : mode === "converged" ? `Converged at iteration ${r.iter}, computed in your browser`
          : `Precomputed result, converged at iteration ${r.iter}`;
  const label = `4 by 3 tiling of a unit cell optimized for ${T.aria}. ${mode === "running" ? `Iteration ${r.iter}.` : status + "."}`;

  const progress =
    mode === "running" ? `Iteration ${r.iter}`
      : mode === "paused" ? `Paused at iteration ${r.iter}`
        : mode === "converged" ? `Converged at iteration ${r.iter}`
          : `Precomputed, iteration ${r.iter}`;
  const reference = target === "auxetic" ? 0 : target === "bulk" ? kappaHS(r.vol) : undefined;

  const run = mode === "running" ? { icon: ICON.pause, text: "Pause" }
    : mode === "paused" ? { icon: ICON.play, text: "Resume" }
      : mode === "converged" ? { icon: ICON.again, text: "Run again" }
        : { icon: ICON.play, text: "Run live" };

  // The lattice is the object: controls above it, the maths as a quiet readout row below.
  // Phones: the convergence line first, formulation and matrix behind a toggle.
  return (
    <figure ref={boxRef} className="w-full min-w-0 max-w-[42rem] xl:w-[42rem]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 md:mb-5">
        <div className="flex w-full rounded-[2px] border border-ink md:w-auto" role="group" aria-label="Optimization target">
          {TARGETS.map((x, i) => (
            <button
              key={x.id}
              type="button"
              aria-pressed={target === x.id}
              onClick={() => select(x.id)}
              className={`t-data h-11 flex-1 px-3 transition-colors duration-150 md:h-10 md:flex-none md:px-[18px] ${i ? "border-l border-rule" : ""} ${
                target === x.id ? "bg-ink font-[600] text-canvas" : "text-ink-2 hover:bg-[#EEF0EE] hover:text-ink"
              }`}
            >
              {x.label}
            </button>
          ))}
        </div>
        {supported && (
          <button type="button" onClick={toggle} className="t-data inline-flex h-11 items-center gap-2 rounded-[2px] border border-ink pl-3 pr-3.5 transition-colors duration-150 hover:bg-[#EEF0EE] md:h-10">
            <svg viewBox="0 0 16 16" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">{run.icon}</svg>
            {run.text}
          </button>
        )}
      </div>

      <canvas ref={canvasRef} role="img" aria-label={label} className="block aspect-[4/3] w-full [image-rendering:pixelated]" />

      <div className="mt-5 flex flex-col gap-4 border-t border-rule pt-4 md:mt-6 md:grid md:grid-cols-[auto_auto_minmax(0,1fr)] md:gap-x-8">
        <div id={detailsId} className={`flex flex-col gap-5 max-md:order-3 md:contents ${details ? "" : "max-md:hidden"}`}>
          <div className="min-w-0">
            <p className="t-small mb-1.5 text-ink-2">Objective</p>
            <div className="math sm flex flex-col gap-1 overflow-x-auto overflow-y-hidden">
              <div dangerouslySetInnerHTML={{ __html: goalMath(target) }} />
              <div dangerouslySetInnerHTML={{ __html: SUBJECT }} />
            </div>
          </div>
          <div className="min-w-0">
            <p className="t-small mb-0.5 text-ink-2">Homogenized stiffness</p>
            <div className="math sm overflow-x-auto overflow-y-hidden" dangerouslySetInnerHTML={{ __html: tensorMath(r.C, T.active) }} />
          </div>
        </div>
        <div className="min-w-0 max-md:order-1">
          <p className="t-small mb-1.5 text-ink-2">Convergence</p>
          <div className="math sm" dangerouslySetInnerHTML={{ __html: quantity(T.track, r) }} />
          <div className="mt-2 flex"><Trace data={r.hist} reference={reference} live={live} /></div>
          <p className="t-data mt-1.5 flex flex-wrap gap-x-3 text-ink-2" aria-hidden="true">
            <span>{progress}</span>
            {r.seed !== undefined && <span>Seed {r.seed}</span>}
          </p>
          <p className="sr-only" role="status" aria-live="polite">{mode === "running" ? "Computing in your browser" : status}</p>
        </div>
        <button
          type="button"
          aria-expanded={details}
          aria-controls={detailsId}
          onClick={() => setDetails((v) => !v)}
          className="t-data link min-h-[44px] self-start text-ink max-md:order-2 md:hidden"
        >
          {details ? "Hide technical details" : "Show technical details"}
        </button>
      </div>
    </figure>
  );
};

export default LiveCell;

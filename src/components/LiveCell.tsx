import React, { useCallback, useEffect, useRef, useState } from "react";
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
const media = (q: string) => typeof window !== "undefined" && !!window.matchMedia && window.matchMedia(q).matches;

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
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const draw = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const dpr = window.devicePixelRatio || 1;
    const css = cv.clientWidth || 300;
    const px = Math.round(css * dpr);
    if (cv.width !== px) { cv.width = px; cv.height = px; }
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
    const t = px / 3;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) g.drawImage(tile, Math.round(i * t), Math.round(j * t), Math.round((i + 1) * t) - Math.round(i * t), Math.round((j + 1) * t) - Math.round(j * t));
    g.strokeStyle = "#F05A24";
    g.lineWidth = 1.5 * dpr;
    g.strokeRect(Math.round(t) + g.lineWidth / 2, Math.round(t) + g.lineWidth / 2, Math.round(2 * t) - Math.round(t) - g.lineWidth, Math.round(2 * t) - Math.round(t) - g.lineWidth);
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
  const label = `3 by 3 tiling of a unit cell optimized for ${T.aria}. ${mode === "running" ? `Iteration ${r.iter}.` : status + "."}`;

  const progress =
    mode === "running" ? `Iteration ${r.iter}`
      : mode === "paused" ? `Paused at iteration ${r.iter}`
        : mode === "converged" ? `Converged at iteration ${r.iter}`
          : `Precomputed, iteration ${r.iter}`;
  const reference = target === "auxetic" ? 0 : target === "bulk" ? kappaHS(r.vol) : undefined;

  return (
    <figure ref={boxRef} className="grid gap-x-10 gap-y-6 md:grid-cols-[minmax(0,24rem)_17.5rem]">
      <div className="flex flex-wrap items-center justify-between gap-x-6">
        <div className="flex gap-5" role="group" aria-label="Optimization target">
          {TARGETS.map((x) => (
            <button
              key={x.id}
              type="button"
              aria-pressed={target === x.id}
              onClick={() => select(x.id)}
              className={`t-data relative min-h-[44px] transition-colors duration-150 ${
                target === x.id ? "font-[640] text-ink after:absolute after:inset-x-0 after:bottom-2 after:h-[2px] after:bg-laser" : "text-ink-2 hover:text-ink"
              }`}
            >
              {x.label}
            </button>
          ))}
        </div>
        {supported && (
          <button type="button" onClick={toggle} className="t-data min-h-[44px] rounded-[2px] border border-ink px-4 transition-colors duration-150 hover:bg-[#EEF0EE]">
            {mode === "running" ? "Pause" : mode === "paused" ? "Resume" : mode === "converged" ? "Run again" : "Run live"}
          </button>
        )}
      </div>

      <canvas ref={canvasRef} role="img" aria-label={label} className="block aspect-square w-full [image-rendering:pixelated] md:row-start-2" />

      <div className="flex min-w-0 flex-col justify-between gap-8 md:col-start-2 md:row-start-2">
        <div className="math flex flex-col gap-1 overflow-x-auto overflow-y-hidden">
          <div dangerouslySetInnerHTML={{ __html: goalMath(target) }} />
          <div dangerouslySetInnerHTML={{ __html: SUBJECT }} />
        </div>
        <div className="math overflow-x-auto overflow-y-hidden py-1" dangerouslySetInnerHTML={{ __html: tensorMath(r.C, T.active) }} />
        <div>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4">
            <div className="math" dangerouslySetInnerHTML={{ __html: quantity(T.track, r) }} />
            <p className="t-data text-ink-2" aria-hidden="true">
              {progress}
              {r.seed !== undefined && <span className="ml-3">Seed {r.seed}</span>}
            </p>
          </div>
          <div className="mt-3 flex"><Trace data={r.hist} reference={reference} live={live} /></div>
          <p className="sr-only" role="status" aria-live="polite">{mode === "running" ? "Computing in your browser" : status}</p>
        </div>
      </div>
    </figure>
  );
};

export default LiveCell;

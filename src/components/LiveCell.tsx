import React, { useCallback, useEffect, useRef, useState } from "react";
import { cells, initial, N } from "../lab/precomputed";
import type { Objective } from "../lab/unitcell";
import type { WorkerOut } from "../lab/unitcell.worker";
import { createWorker } from "../lab/createWorker";

type Mode = "precomputed" | "running" | "paused" | "converged";
type Key = "E1" | "G12" | "nu12";

const TARGETS: { id: Objective; label: string; goal: string; track: Key; name: string; aria: string }[] = [
  { id: "axial", label: "Axial", goal: "Maximize C₁₁ + C₂₂", track: "E1", name: "E₁", aria: "axial stiffness" },
  { id: "shear", label: "Shear", goal: "Maximize C₃₃", track: "G12", name: "G₁₂", aria: "shear stiffness" },
  { id: "auxetic", label: "Auxetic", goal: "Minimize C₁₂ − w (C₁₁ + C₂₂)", track: "nu12", name: "ν₁₂", aria: "a negative Poisson's ratio" },
];

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

const fmt = (v: number, d = 3) => (v < 0 ? "−" : "") + Math.abs(v).toFixed(d);
const media = (q: string) => typeof window !== "undefined" && !!window.matchMedia && window.matchMedia(q).matches;

interface Readout { iter: number; vol: number; E1: number; G12: number; nu12: number; hist: number[] }

function finalReadout(t: Objective): Readout {
  const c = cells[t], track = TARGETS.find((x) => x.id === t)!.track;
  return { iter: c.iter, vol: c.vol, E1: c.E1, G12: c.G12, nu12: c.nu12, hist: [...c.hist[track]] };
}

const Sparkline: React.FC<{ data: number[]; live: boolean }> = ({ data, live }) => {
  const W = 200, H = 52, pad = 4;
  if (data.length < 2) return <svg viewBox={`0 0 ${W} ${H}`} className="h-[52px] w-full" aria-hidden="true" />;
  let lo = Math.min(...data), hi = Math.max(...data);
  if (hi - lo < 1e-9) { lo -= 1; hi += 1; }
  const x = (i: number) => pad + (i / (data.length - 1)) * (W - 2 * pad);
  const y = (v: number) => H - pad - ((v - lo) / (hi - lo)) * (H - 2 * pad);
  const pts = data.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const last = data.length - 1;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-[52px] w-full overflow-visible" aria-hidden="true">
      {lo < 0 && hi > 0 && <line x1={pad} x2={W - pad} y1={y(0)} y2={y(0)} stroke="#CBD2D5" strokeDasharray="3 3" />}
      <polyline points={pts} fill="none" stroke="#172027" strokeWidth="1.25" vectorEffect="non-scaling-stroke" />
      <circle cx={x(last)} cy={y(data[last])} r="3" fill={live ? "#F05A24" : "#172027"} />
    </svg>
  );
};

const LiveCell: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const rhoRef = useRef<Uint8Array | Float32Array>(FINAL.auxetic);
  const visibleRef = useRef(true);
  const autoPausedRef = useRef(false);
  const autoplayRef = useRef<boolean | null>(null);
  const runIdRef = useRef(0);
  const targetRef = useRef<Objective>("auxetic");

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
    w.onmessage = (e: MessageEvent<WorkerOut>) => {
      const m = e.data;
      if (m.id !== runIdRef.current) return;
      rhoRef.current = m.rho;
      const G12 = m.C[8];
      setR((p) => ({ iter: m.iter, vol: m.vol, E1: m.E1, G12, nu12: m.nu12, hist: [...(m.iter === 1 ? [] : p.hist), { E1: m.E1, G12, nu12: m.nu12 }[track]] }));
      if (m.done) setMode("converged");
      draw();
    };
    autoPausedRef.current = false;
    rhoRef.current = INITIAL;
    setR({ iter: 0, vol: cells[t].vol, E1: NaN, G12: NaN, nu12: NaN, hist: [] });
    setMode("running");
    draw();
    w.postMessage({ type: "run", obj: t, n: N, id });
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
  const num = (v: number, d = 3) => (Number.isFinite(v) ? fmt(v, d) : "–");

  return (
    <figure ref={boxRef} className="grid gap-x-8 gap-y-6 sm:grid-cols-[minmax(0,1fr)_13rem]">
      <div className="min-w-0">
        <canvas ref={canvasRef} role="img" aria-label={label} className="block aspect-square w-full max-w-[460px] [image-rendering:pixelated]" />
      </div>

      <div className="flex min-w-0 flex-col gap-5">
        <div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Optimization target">
            {TARGETS.map((x) => (
              <button
                key={x.id}
                type="button"
                aria-pressed={target === x.id}
                onClick={() => select(x.id)}
                className={`t-data min-h-[44px] rounded-[2px] border border-ink px-3 transition-colors duration-150 ${target === x.id ? "bg-ink text-canvas" : "hover:bg-[#EEF0EE]"}`}
              >
                {x.label}
              </button>
            ))}
          </div>
          <p className="t-data mt-2 text-ink-2">{T.goal}, volume ≤ 0.40</p>
        </div>

        <dl className="t-data grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          <dt className="text-ink-2">Iteration</dt><dd className="text-right">{r.iter || "–"}</dd>
          <dt className="text-ink-2">Volume</dt><dd className="text-right">{Number.isFinite(r.E1) ? fmt(r.vol, 2) : "–"}</dd>
          <dt className="text-ink-2">E₁ / E</dt><dd className="text-right">{num(r.E1)}</dd>
          <dt className="text-ink-2">G₁₂ / E</dt><dd className="text-right">{num(r.G12)}</dd>
          <dt className="text-ink-2">ν₁₂</dt><dd className="text-right">{num(r.nu12, 2)}</dd>
        </dl>

        <div>
          <Sparkline data={r.hist} live={live} />
          <p className="t-data mt-1 text-ink-2">{T.name} by iteration</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {supported && (
            <button type="button" onClick={toggle} className="t-data min-h-[44px] rounded-[2px] border border-ink px-4 hover:bg-[#EEF0EE]">
              {mode === "running" ? "Pause" : mode === "paused" ? "Resume" : "Run live"}
            </button>
          )}
          {mode === "paused" && (
            <button type="button" onClick={() => start(target)} className="t-data link min-h-[44px] px-1">Restart</button>
          )}
        </div>
        <p className="t-data text-ink-2" role="status" aria-live="polite">{mode === "running" ? "Computing in your browser" : status}</p>
      </div>

      <figcaption className="t-small max-w-[62ch] text-ink-2 sm:col-span-2">
        Simplified linear-elastic topology optimization, running in your browser. Not the model from my publications.
        <span className="block">Periodic homogenization, {N} × {N} elements, SIMP with projection, MMA, square symmetry.</span>
      </figcaption>
    </figure>
  );
};

export default LiveCell;

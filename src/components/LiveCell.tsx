import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { cells, initial, N, PHONE_N, phoneSeeds, seeds } from "../lab/precomputed";
import type { Objective } from "../lab/unitcell";
import type { WorkerOut } from "../lab/unitcell.worker";
import { createWorker } from "../lab/createWorker";
import { decode, drawLattice } from "../lab/lattice";
import { goalMath, kappa, kappaHS, quantity, subjectMath, TARGETS, tensorMath, Trace } from "../lab/readout";

type Mode = "precomputed" | "running" | "paused" | "converged";

const INITIAL = decode(initial);
const FINAL = Object.fromEntries(Object.entries(cells).map(([k, v]) => [k, decode(v.rho)])) as Record<Objective, Uint8Array>;

const COLS = 5, ROWS = 5;   // the lattice shows the cell tiled 5 × 5
const media = (q: string) => typeof window !== "undefined" && !!window.matchMedia && window.matchMedia(q).matches;

const ICON = {
  play: <path d="M5 3.5v9l7.5-4.5z" fill="currentColor" stroke="none" />,
  pause: <path d="M5.5 3.5v9M10.5 3.5v9" />,
  again: <><path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9" /><path d="M12.6 1.8v2.8H9.8" /></>,
};

interface Readout { iter: number; vol: number; E1: number; G12: number; nu12: number; K: number; C: number[]; seed?: number; hist: number[] }

function finalReadout(t: Objective): Readout {
  const c = cells[t], track = TARGETS.find((x) => x.id === t)!.track;
  return { iter: c.iter, vol: c.vol, E1: c.E1, G12: c.G12, nu12: c.nu12, K: c.K, C: [...c.C], seed: c.seed, hist: [...c.hist[track]] };
}

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
    if (canvasRef.current) drawLattice(canvasRef.current, rhoRef.current, COLS, ROWS, [2, 2]);
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

  const start = useCallback((t: Objective, first?: number) => {
    const w = ensureWorker();
    if (!w) { setSupported(false); showFinal(t); return; }
    const track = TARGETS.find((x) => x.id === t)!.track;
    const id = ++runIdRef.current;
    // A different vetted seed each run (never the same twice in a row), so every run grows a new design.
    // Touch devices run the coarser mesh from its own pool: about as fast on a phone as the fine mesh on a desktop.
    const n = media("(pointer: coarse)") ? PHONE_N : N;
    const pool = (n === N ? seeds : phoneSeeds)[t] ?? [];
    let seed = first ?? pool[Math.floor(Math.random() * pool.length)];
    while (first === undefined && pool.length > 1 && seed === lastSeedRef.current[t]) seed = pool[Math.floor(Math.random() * pool.length)];
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
    w.postMessage({ type: "run", obj: t, n, id, seed });
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
      if (e.isIntersecting && autoplayRef.current) { autoplayRef.current = false; start("auxetic", cells.auxetic.seed); }   // the seed whose first frame is already drawn
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
          : `Converged at iteration ${r.iter}`;
  const label = `5 by 5 tiling of a unit cell optimized for ${T.aria}. ${mode === "running" ? `Iteration ${r.iter}.` : status + "."}`;

  const progress =
    mode === "running" ? `Iteration ${r.iter}`
      : mode === "paused" ? `Paused at iteration ${r.iter}`
        : mode === "converged" ? `Converged at iteration ${r.iter}`
          : `Converged at iteration ${r.iter}`;
  const reference = target === "auxetic" ? 0 : target === "bulk" ? kappaHS(r.vol) : undefined;

  const run = mode === "running" ? { icon: ICON.pause, text: "Pause" }
    : mode === "paused" ? { icon: ICON.play, text: "Resume" }
      : mode === "converged" ? { icon: ICON.again, text: "Run again" }
        : { icon: ICON.play, text: "Run live" };

  // The square lattice, its top level with the headline's cap height, and to its right a column: objective, matrix,
  // convergence, then the target and run buttons. The lattice is sized from the viewport height so the whole lab fits
  // the first screen. Phones: controls, lattice, convergence line; formulation and matrix behind a toggle.
  return (
    <figure ref={boxRef} className="w-full min-w-0 md:grid md:w-max md:grid-cols-[clamp(21rem,min(calc(100svh-10rem),calc(100vw-22rem)),32rem)_13rem] md:grid-rows-[auto_1fr] md:gap-x-7">
      <div className="mb-4 flex items-center justify-between gap-2 md:col-start-2 md:row-start-2 md:mb-0 md:mt-6 md:flex-col md:items-start md:justify-start md:gap-3">
        <div className="flex min-w-0 flex-1 rounded-[2px] border border-ink md:w-full md:flex-none" role="group" aria-label="Optimization target">
          {TARGETS.map((x, i) => (
            <button
              key={x.id}
              type="button"
              aria-pressed={target === x.id}
              onClick={() => select(x.id)}
              className={`t-data h-11 min-w-0 flex-1 px-1 transition-colors duration-150 md:h-8 md:[@media(pointer:coarse)]:h-11 md:px-1 md:text-[0.875rem] ${i ? "border-l border-rule" : ""} ${
                target === x.id ? "bg-ink font-[600] text-canvas" : "text-ink-2 hover:bg-[#EEF0EE] hover:text-ink"
              }`}
            >
              {x.label}
            </button>
          ))}
        </div>
        {supported && (
          <button type="button" onClick={toggle} className="t-data inline-flex h-11 w-11 shrink-0 items-center justify-center gap-2 rounded-[2px] border border-ink bg-ink text-canvas transition-colors duration-150 hover:bg-ink-2 md:h-12 md:w-full md:text-[1.0625rem] md:font-[600]">
            <svg viewBox="0 0 16 16" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">{run.icon}</svg>
            <span className="max-md:sr-only">{run.text}</span>
          </button>
        )}
      </div>
      <canvas ref={canvasRef} role="img" aria-label={label} className="block aspect-square w-full md:col-start-1 md:row-span-2 md:row-start-1" />

      <div className="mt-5 flex min-w-0 flex-col gap-4 border-t border-rule pt-4 md:col-start-2 md:row-start-1 md:mt-0 md:gap-6 md:pt-3">
        <div id={detailsId} className={`flex flex-col gap-5 max-md:order-3 md:contents ${details ? "" : "max-md:hidden"}`}>
          <div className="min-w-0">
            <p className="t-small mb-1.5 text-ink-2">Objective</p>
            <div className="math sm flex flex-col gap-1 overflow-x-auto overflow-y-hidden">
              <div dangerouslySetInnerHTML={{ __html: goalMath(target) }} />
              <div dangerouslySetInnerHTML={{ __html: subjectMath() }} />
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
          <p className="t-small mt-1 flex flex-wrap gap-x-3 text-ink-2" aria-hidden="true">
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

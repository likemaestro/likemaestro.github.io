import React, { useCallback, useEffect, useRef, useState } from "react";
import { cells, initial, N, PHONE_N, phoneSeeds, seeds } from "../lab/precomputed";
import type { Objective } from "../lab/unitcell";
import type { WorkerOut } from "../lab/unitcell.worker";
import { createWorker } from "../lab/createWorker";
import { decode, drawLattice } from "../lab/lattice";
import { TARGETS } from "../lab/readout";

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
  const [iter, setIter] = useState<number>(cells.auxetic.iter);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const draw = useCallback(() => {
    if (canvasRef.current) drawLattice(canvasRef.current, rhoRef.current, COLS, ROWS, [2, 2]);
  }, []);

  const showFinal = useCallback((t: Objective) => {
    runIdRef.current++;
    workerRef.current?.postMessage({ type: "cancel" });
    rhoRef.current = FINAL[t];
    setIter(cells[t].iter);
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
      setIter(m.iter);
      if (m.done) setMode("converged");
      draw();
    };
    autoPausedRef.current = false;
    setIter(0);
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
  const status =
    mode === "running" ? "Computing in your browser…"
      : mode === "paused" ? `Paused at iteration ${iter}`
        : mode === "converged" ? `Converged at iteration ${iter}, computed in your browser`
          : `Converged at iteration ${iter}`;
  const label = `5 by 5 tiling of a unit cell optimized for ${T.aria}. ${mode === "running" ? `Iteration ${iter}.` : status + "."}`;
  // What a click on the chosen target does next.
  const next = mode === "running" ? { icon: ICON.pause, text: "pause" } : mode === "paused" ? { icon: ICON.play, text: "resume" } : { icon: ICON.again, text: "run again" };
  const press = (t: Objective) => (t !== target ? select(t) : supported && toggle());

  // The square lattice, its top level with the headline's cap height, and beside it the four targets as a ruled list
  // ending level with the lattice's bottom. A target runs live; the chosen one is set bold and carries what a click does
  // next. The numbers live in the unit-cell designer. The lattice is
  // sized from the viewport height so the hero fits the first screen; side by side (xl) it takes the height left by the
  // hero's padding, or 62 % of the page width less the column, whichever is smaller. Phones: targets above the lattice.
  return (
    <figure ref={boxRef} className="w-full min-w-0 md:grid md:w-max md:grid-cols-[clamp(21rem,min(calc(100svh-10rem),calc(100vw-18.5rem)),32rem)_9.5rem] md:gap-x-7 xl:grid-cols-[clamp(21rem,min(calc(100svh-13rem),calc((min(96rem,100vw)-3rem)*0.62-11.25rem)),52rem)_9.5rem]">
      <div role="group" aria-label="Optimization target"
        className="mb-4 flex rounded-[2px] border border-ink md:col-start-2 md:row-start-1 md:mb-0 md:flex-col md:self-end md:rounded-none md:border-0 md:border-t md:border-rule">
        {TARGETS.map((x, i) => {
          const on = target === x.id;
          return (
            <button key={x.id} type="button" aria-pressed={on} onClick={() => press(x.id)}
              className={`t-data flex h-11 min-w-0 flex-1 items-center justify-center gap-1.5 px-1 transition-colors duration-150 md:flex-none md:justify-start md:gap-2.5 md:border-b md:border-rule md:px-0 md:text-[1.0625rem] ${i ? "border-l border-rule md:border-l-0" : ""} ${
                on ? "font-[650] text-ink" : "text-ink-2 hover:bg-[#EEF0EE] hover:text-ink md:hover:bg-transparent"
              }`}>
              {x.label}
              {on && supported && (
                <>
                  <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3.5 w-3.5 shrink-0 md:ml-auto md:text-ink-2" fill="none" stroke="currentColor" strokeWidth="1.6">{next.icon}</svg>
                  <span className="sr-only">, {next.text}</span>
                </>
              )}
            </button>
          );
        })}
      </div>
      <canvas ref={canvasRef} role="img" aria-label={label} className="block aspect-square w-full md:col-start-1 md:row-start-1" />
      <p className="sr-only" role="status" aria-live="polite">{status}</p>
    </figure>
  );
};

export default LiveCell;

// Runs one optimization at a time off the main thread. In: run | pause | resume | cancel.
// Out, each iteration: { id, iter, rho (Float32Array, transferred), C, vol, E1, nu12, ms, done }.
import { createRun, Objective } from "./unitcell";

export type WorkerIn = { type: "run"; obj: Objective; n: number; id: number } | { type: "pause" | "resume" | "cancel" };
export interface WorkerOut {
  id: number; iter: number; rho: Float32Array; C: number[]; vol: number; E1: number; nu12: number; ms: number; done: boolean;
}

const ctx = globalThis as unknown as Worker;
const FRAME_MS = 40;   // floor per iteration so the evolution stays readable on fast machines
let run: ReturnType<typeof createRun> | null = null;
let paused = false;
let runId = 0;   // echoed so the page can drop frames from a cancelled run
let timer: ReturnType<typeof setTimeout> | undefined;

function step() {
  timer = undefined;
  if (!run || paused) return;
  const t0 = performance.now();
  const it = run.next();
  const ms = performance.now() - t0;
  const rho = Float32Array.from(it.phys);
  const out: WorkerOut = { id: runId, iter: it.iter, rho, C: Array.from(it.C), vol: it.vol, E1: it.E1, nu12: it.nu12, ms, done: it.done };
  ctx.postMessage(out, [rho.buffer]);
  if (it.done) run = null;
  else timer = setTimeout(step, Math.max(0, FRAME_MS - ms));
}

ctx.onmessage = (e: MessageEvent<WorkerIn>) => {
  const m = e.data;
  if (timer) clearTimeout(timer);
  timer = undefined;
  if (m.type === "run") { runId = m.id; run = createRun(m.obj, { n: m.n }); paused = false; step(); }
  else if (m.type === "pause") paused = true;
  else if (m.type === "resume") { paused = false; step(); }
  else { run = null; paused = false; }
};

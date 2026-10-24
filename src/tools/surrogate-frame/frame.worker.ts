// Frame analyses and GP fits off the main thread. In: fe | fit | exhaustive | cancel. Every reply carries the request id.
import { analyse, BEAMS, COLUMNS, type Design, type Loads, type Result } from "./frame";
import { fitSurrogate, type Outputs, type Sample, type Surrogate } from "./surrogate";

export type WorkerIn =
  | { id: number; type: "fe"; designs: Design[]; loads: Loads; full?: boolean }
  | { id: number; type: "fit"; samples: Sample[]; seed: number }
  | { id: number; type: "exhaustive"; loads: Loads }
  | { id: number; type: "cancel" };
export type WorkerOut =
  | { id: number; type: "run"; index: number; d: Design; r: Outputs; full?: Result; ms: number }
  | { id: number; type: "done" }
  | { id: number; type: "fit"; surrogate: Surrogate; ms: number }
  | { id: number; type: "progress"; done: number; total: number }
  | { id: number; type: "exhaustive"; out: Float64Array; ms: number }   // 6 values per design: drift, uCL, uCU, uB, acr, mass
  | { id: number; type: "error"; message: string };

const ctx = globalThis as unknown as Worker;
const cancelled = new Set<number>();
const post = (m: WorkerOut) => ctx.postMessage(m);
const pick = (r: Result): Outputs => ({ drift: r.drift, uCL: r.uCL, uCU: r.uCU, uB: r.uB, acr: r.acr, mass: r.mass });
const tick = () => new Promise((r) => setTimeout(r, 0));   // lets a cancel message in

ctx.onmessage = async (e: MessageEvent<WorkerIn>) => {
  const m = e.data;
  if (m.type === "cancel") { cancelled.add(m.id); return; }
  try {
    if (m.type === "fe") {
      for (const [index, d] of m.designs.entries()) {
        const t0 = performance.now(), r = analyse(d, m.loads), ms = performance.now() - t0;
        post({ id: m.id, type: "run", index, d, r: pick(r), full: m.full ? r : undefined, ms });
        if (m.designs.length > 1) { await tick(); if (cancelled.has(m.id)) return; }
      }
      post({ id: m.id, type: "done" });
    } else if (m.type === "fit") {
      const t0 = performance.now(), surrogate = fitSurrogate(m.samples, m.seed);
      post({ id: m.id, type: "fit", surrogate, ms: performance.now() - t0 });
    } else {
      const t0 = performance.now(), total = COLUMNS.length * COLUMNS.length * BEAMS.length, out = new Float64Array(6 * total);
      let k = 0;
      for (let a = 0; a < COLUMNS.length; a++) for (let b = 0; b < COLUMNS.length; b++) for (let c = 0; c < BEAMS.length; c++, k++) {
        const r = analyse({ cL: a, cU: b, bm: c }, m.loads);
        out.set([r.drift, r.uCL, r.uCU, r.uB, r.acr, r.mass], 6 * k);
        if (k % 12 === 11) { post({ id: m.id, type: "progress", done: k + 1, total }); await tick(); if (cancelled.has(m.id)) return; }
      }
      ctx.postMessage({ id: m.id, type: "exhaustive", out, ms: performance.now() - t0 } satisfies WorkerOut, [out.buffer]);
    }
  } catch (err) {
    post({ id: m.id, type: "error", message: err instanceof Error ? err.message : String(err) });
  }
};

// The page's side of frame.worker.ts: one request at a time per kind, as promises, with progress callbacks.
import type { Design, Loads, Result } from "./frame";
import type { Outputs, Sample, Surrogate } from "./surrogate";
import type { WorkerIn, WorkerOut } from "./frame.worker";

type Handler = (m: WorkerOut) => void;

export function createClient(onError: (message: string) => void) {
  const w = new Worker(new URL("./frame.worker.ts", import.meta.url), { type: "module" });
  const handlers = new Map<number, Handler>();
  let next = 1;
  w.onmessage = (e: MessageEvent<WorkerOut>) => {
    const m = e.data;
    if (m.type === "error") { handlers.delete(m.id); onError(m.message); return; }
    handlers.get(m.id)?.(m);
  };
  w.onerror = (e) => onError(e.message || "the worker failed to start");
  const send = (m: WorkerIn) => w.postMessage(m);

  return {
    /** FE runs; onRun after each, in order. */
    fe(designs: Design[], loads: Loads, onRun?: (i: number, d: Design, r: Outputs, ms: number, full?: Result) => void, full = false) {
      const id = next++;
      const promise = new Promise<Outputs[]>((resolve) => {
        const out: Outputs[] = [];
        handlers.set(id, (m) => {
          if (m.type === "run") { out[m.index] = m.r; onRun?.(m.index, m.d, m.r, m.ms, m.full); }
          if (m.type === "done") { handlers.delete(id); resolve(out); }
        });
      });
      send({ id, type: "fe", designs, loads, full });
      return { id, promise };
    },
    fit(samples: Sample[], seed: number) {
      const id = next++;
      const promise = new Promise<{ surrogate: Surrogate; ms: number }>((resolve) => {
        handlers.set(id, (m) => { if (m.type === "fit") { handlers.delete(id); resolve({ surrogate: m.surrogate, ms: m.ms }); } });
      });
      send({ id, type: "fit", samples, seed });
      return promise;
    },
    exhaustive(loads: Loads, onProgress: (done: number, total: number) => void) {
      const id = next++;
      const promise = new Promise<{ out: Float64Array; ms: number } | null>((resolve) => {
        handlers.set(id, (m) => {
          if (m.type === "progress") onProgress(m.done, m.total);
          if (m.type === "exhaustive") { handlers.delete(id); resolve({ out: m.out, ms: m.ms }); }
          if (m.type === "done") { handlers.delete(id); resolve(null); }
        });
      });
      send({ id, type: "exhaustive", loads });
      return { id, promise };
    },
    /** Stop a long request; its promise resolves with null (exhaustive) or what was done. */
    cancel(id: number) {
      send({ id, type: "cancel" });
      const h = handlers.get(id);
      handlers.delete(id);
      h?.({ id, type: "done" });
    },
    terminate() { w.terminate(); handlers.clear(); },
  };
}
export type Client = ReturnType<typeof createClient>;

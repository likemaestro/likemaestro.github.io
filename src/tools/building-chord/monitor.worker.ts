// Autoencoder training and the held-out test, off the main thread. In: train | test. To cancel, the page ends the worker.
import type { Building, Damage } from "./building";
import { test, train, type Trained } from "./monitor";

export type MonitorIn = { id: number; type: "train"; b: Building; seed: number } | { id: number; type: "test"; b: Building; dmg: Damage; trained: Trained; seed: number };
export type MonitorOut =
  | { id: number; type: "progress"; history: Trained["history"] }
  | { id: number; type: "trained"; trained: Trained; ms: number }
  | { id: number; type: "tested"; result: ReturnType<typeof test>; ms: number }
  | { id: number; type: "error"; message: string };

const ctx = globalThis as unknown as Worker;
ctx.onmessage = (e: MessageEvent<MonitorIn>) => {
  const m = e.data, t0 = performance.now();
  try {
    if (m.type === "train") {
      const trained = train(m.b, m.seed, (history) => ctx.postMessage({ id: m.id, type: "progress", history } satisfies MonitorOut));
      ctx.postMessage({ id: m.id, type: "trained", trained, ms: performance.now() - t0 } satisfies MonitorOut);
    } else {
      ctx.postMessage({ id: m.id, type: "tested", result: test(m.b, m.dmg, m.trained, m.seed), ms: performance.now() - t0 } satisfies MonitorOut);
    }
  } catch (err) {
    ctx.postMessage({ id: m.id, type: "error", message: err instanceof Error ? err.message : String(err) } satisfies MonitorOut);
  }
};

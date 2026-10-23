export const createWorker = () => new Worker(new URL("./unitcell.worker.ts", import.meta.url), { type: "module" });
export const createSketchWorker = () => new Worker(new URL("./sketch.worker.ts", import.meta.url), { type: "module" });

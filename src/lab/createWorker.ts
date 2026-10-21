// Kept apart from LiveCell so Jest never parses import.meta.
export const createWorker = () => new Worker(new URL("./unitcell.worker.ts", import.meta.url));

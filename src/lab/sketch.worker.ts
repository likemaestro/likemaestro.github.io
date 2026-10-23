// Homogenizes a drawn cell off the main thread. In: { id, n, cell (0/1 per element, row 0 at the bottom), sym }.
// Out: { id, C, vol, ms }. sym: the drawing is symmetric about both mid-lines, so the quarter-cell solve applies.
import { createProblem, homogenize, homogenizeSym } from "./unitcell";
import type { Problem } from "./unitcell";

export type SketchIn = { id: number; n: number; cell: Uint8Array; sym: boolean };
export type SketchOut = { id: number; C: number[]; vol: number; ms: number };

const ctx = globalThis as unknown as Worker;
const problems = new Map<number, Problem>();

ctx.onmessage = (e: MessageEvent<SketchIn>) => {
  const { id, n, cell, sym } = e.data, t0 = performance.now();
  const P = problems.get(n) ?? problems.set(n, createProblem({ n })).get(n)!;
  const E = Float64Array.from(cell, (v) => (v ? 1 : 1e-9));
  const { C } = sym ? homogenizeSym(P, E) : homogenize(P, E);
  let solid = 0;
  for (let k = 0; k < cell.length; k++) solid += cell[k] ? 1 : 0;
  const out: SketchOut = { id, C: Array.from(C), vol: solid / cell.length, ms: performance.now() - t0 };
  ctx.postMessage(out);
};

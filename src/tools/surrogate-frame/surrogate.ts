// The surrogate workflow: Latin hypercube samples of the catalog, one Gaussian process per output, a genetic algorithm
// that minimizes steel mass on the surrogate while keeping k standard deviations from every limit, and verification of
// its answer by the frame model; a failed check joins the training set and the search runs again (surrogate-assisted
// evolutionary design, Jin 2011). Everything here is pure; the page runs FE and fits in a worker.
import { fitGP, loo, predict, type GPState } from "../ml/gp";
import { lhs } from "../ml/lhs";
import { mulberry32 } from "../rng";
import { section } from "../steel/sections";
import { createNSGA2 } from "../truss-sizing/ga";
import { BEAMS, COLUMNS, feasible, massOf, type Design, type Result } from "./frame";

export const OUTS = ["drift", "uCL", "uCU", "uB", "acr"] as const;
export type Out = (typeof OUTS)[number];
export type Outputs = Pick<Result, Out | "mass">;
export const UB = [COLUMNS.length - 1, COLUMNS.length - 1, BEAMS.length - 1];
export const key = (d: Design) => `${d.cL},${d.cU},${d.bm}`;
export const toArr = (d: Design) => [d.cL, d.cU, d.bm];
export const fromArr = (x: number[]): Design => ({ cL: x[0], cU: x[1], bm: x[2] });

// GP input: each variable is the section's log10(Iy), scaled to [0, 1] over its catalog (an assumption of smoothness)
const logIy = (ids: string[]) => ids.map((id) => Math.log10(section(id)!.Iy));
const SCALE = [logIy(COLUMNS), logIy(COLUMNS), logIy(BEAMS)].map((v) => v.map((x) => (x - v[0]) / (v[v.length - 1] - v[0])));
export const encode = (d: Design) => toArr(d).map((i, k) => SCALE[k][i]);

/** N distinct designs: a Latin hypercube in the encoded space, each coordinate at the nearest catalog section;
 *  duplicates are replaced by seeded random designs not yet taken. */
export function sampleDesigns(n: number, seed: number): Design[] {
  const rng = mulberry32(seed), out: Design[] = [], seen = new Set<string>();
  for (const u of lhs(n, 3, rng)) {
    const x = u.map((v, k) => SCALE[k].reduce((best, s, i) => (Math.abs(s - v) < Math.abs(SCALE[k][best] - v) ? i : best), 0));
    let d = fromArr(x);
    while (seen.has(key(d))) d = fromArr(UB.map((ub) => Math.floor(rng() * (ub + 1))));
    seen.add(key(d));
    out.push(d);
  }
  return out;
}

export interface Sample { d: Design; r: Outputs }
export type Surrogate = Record<Out, GPState>;

/** The five GPs on the log of each output; fits are seeded. */
export function fitSurrogate(samples: Sample[], seed: number): Surrogate {
  const X = samples.map((s) => encode(s.d));
  return Object.fromEntries(OUTS.map((o, k) => [o, fitGP(X, samples.map((s) => Math.log(s.r[o])), { seed: seed + k })])) as Surrogate;
}

export interface Band { mu: number; lo: number; hi: number; m: number; s: number }   // back-transformed μ and μ ± 2σ; m, s in log space
export type Prediction = Record<Out, Band>;
export function predictDesign(g: Surrogate, d: Design): Prediction {
  const x = encode(d);
  return Object.fromEntries(OUTS.map((o) => {
    const { mu, sd } = predict(g[o], x);
    return [o, { mu: Math.exp(mu), lo: Math.exp(mu - 2 * sd), hi: Math.exp(mu + 2 * sd), m: mu, s: sd }];
  })) as Prediction;
}

/** Leave-one-out accuracy per output: R² in log space and the largest relative error on the original scale. */
export function looStats(g: Surrogate) {
  return Object.fromEntries(OUTS.map((o) => {
    const { mu, sd } = loo(g[o]), y = g[o].y, mean = y.reduce((a, b) => a + b, 0) / y.length;
    let ss = 0, st = 0, worst = 0;
    y.forEach((v, i) => { ss += (v - mu[i]) ** 2; st += (v - mean) ** 2; worst = Math.max(worst, Math.abs(Math.exp(mu[i] - v) - 1)); });
    const r2 = st > 0 ? 1 - ss / st : NaN;
    return [o, { r2, worst, mu, sd, y, ok: Number.isFinite(r2) && r2 > 0 }];
  })) as Record<Out, { r2: number; worst: number; mu: number[]; sd: number[]; y: number[]; ok: boolean }>;
}

export type Limit = 300 | 400 | 500;
/** Constraint violation on the surrogate, in log space, with caution k (standard deviations). */
export function violation(p: Prediction, lim: number, k: number) {
  let cv = Math.max(0, p.drift.m + k * p.drift.s - Math.log(1 / lim));
  for (const o of ["uCL", "uCU", "uB"] as const) cv += Math.max(0, p[o].m + k * p[o].s);
  return cv + Math.max(0, Math.log(3) - (p.acr.m - k * p.acr.s));
}

/** The surrogate's verdict on a design: feasible even at μ ± 2σ ("ok"), infeasible even then ("over"), or "unsure"
 *  when the ±2σ band straddles a limit. The predicted limit itself is μ (k = 0). */
export type CellState = "ok" | "unsure" | "over";
export const predictedFeasible = (p: Prediction, lim: number) => violation(p, lim, 0) === 0;
export function cellState(p: Prediction, lim: number): CellState {
  if (violation(p, lim, 2) === 0) return "ok";
  return violation(p, lim, -2) > 0 ? "over" : "unsure";
}

/** Catalog index of a design, in the exhaustive search's order (lower columns, upper columns, beams). */
export const catalogIndex = (d: Design) => (d.cL * COLUMNS.length + d.cU) * BEAMS.length + d.bm;

/** The map: every lower-column × beam design at one upper-column size, row by row from the lightest beam. */
export function sliceGrid(g: Surrogate, cU: number, lim: number) {
  return Array.from({ length: COLUMNS.length * BEAMS.length }, (_, i) => {
    const d: Design = { cL: i % COLUMNS.length, cU, bm: Math.floor(i / COLUMNS.length) }, p = predictDesign(g, d);
    return { d, state: cellState(p, lim), feasible: predictedFeasible(p, lim), mass: massOf(d) };
  });
}

/** How often the surrogate's predicted limit (μ) agrees with FE over the whole catalog, from the exhaustive results
 *  (6 values per design: drift, uCL, uCU, uB, αcr, mass). missed: feasible designs it calls infeasible; wrong: the reverse. */
export function agreement(g: Surrogate, out: Float64Array, lim: number) {
  let agree = 0, missed = 0, wrong = 0, n = 0;
  for (let a = 0; a < COLUMNS.length; a++) for (let b = 0; b < COLUMNS.length; b++) for (let c = 0; c < BEAMS.length; c++, n++) {
    const d = { cL: a, cU: b, bm: c }, o = out.subarray(6 * n, 6 * n + 6);
    const truth = feasible({ drift: o[0], uCL: o[1], uCU: o[2], uB: o[3], acr: o[4] }, lim), pred = predictedFeasible(predictDesign(g, d), lim);
    if (truth === pred) agree++; else if (truth) missed++; else wrong++;
  }
  return { agree, missed, wrong, n };
}

export interface GAOpts { pop: number; gens: number; pc: number; mut: number; etaC: number; etaM: number; seed: number }
export const GA_DEFAULT: GAOpts = { pop: 24, gens: 40, pc: 0.9, mut: 1, etaC: 3, etaM: 3, seed: 7 };

/** Minimize mass on the surrogate. Designs the frame model has already analysed count with their FE result: feasible
 *  ones are feasible with certainty, infeasible ones are excluded. Returns the lightest design found feasible (or null),
 *  the best such mass per generation and the population per generation. */
export function optimize(g: Surrogate, lim: number, k: number, o: GAOpts = GA_DEFAULT, known: Map<string, Outputs> = new Map()) {
  const ga = createNSGA2({
    n: 3, ub: UB,
    evaluate: (x) => {
      const d = fromArr(x), fe = known.get(key(d));
      if (fe && feasible(fe, lim)) return { f: [massOf(d)], cv: 0 };   // FE has the final word where it has run
      return { f: [massOf(d)], cv: violation(predictDesign(g, d), lim, k) + (fe ? 1 : 0) };
    },
  }, o);
  const bestOf = () => ga.state.pop.filter((p) => p.cv === 0).sort((a, b) => a.f[0] - b.f[0])[0];
  const history: (number | null)[] = [bestOf()?.f[0] ?? null];
  const trail: Design[][] = [ga.state.pop.map((p) => fromArr(p.x))];   // the population, generation by generation
  for (let i = 0; i < o.gens; i++) { ga.step(); history.push(bestOf()?.f[0] ?? null); trail.push(ga.state.pop.map((p) => fromArr(p.x))); }
  const b = bestOf();
  return { best: b ? fromArr(b.x) : null, mass: b?.f[0] ?? null, history, trail, evaluations: ga.state.evaluations };
}

export interface Round { round: number; d: Design; predicted: Prediction; fe: Outputs; ok: boolean; error: number; verdict: string; added: boolean }
export interface VerifyResult { rounds: Round[]; status: "accepted" | "not verified" | "no feasible"; accepted: Design | null; samples: Sample[]; surrogate: Surrogate; newRuns: number }

/** Largest relative error of the surrogate's μ against the frame model, over the five outputs. */
export const predError = (p: Prediction, r: Outputs) => Math.max(...OUTS.map((o) => Math.abs(p[o].mu / r[o] - 1)));

/**
 * At most 10 rounds: optimize on the surrogate, check the answer with the frame model. FE-feasible is accepted (an error
 * over 10 % still adds the run to training, with a warning). FE-infeasible joins the training set, the surrogate is
 * refitted and the search runs again.
 */
export async function verify(c: {
  samples: Sample[]; surrogate: Surrogate; lim: number; k: number; ga: GAOpts;
  fe: (d: Design) => Promise<Outputs>; refit: (s: Sample[]) => Promise<Surrogate>; onRound?: (r: Round) => void; maxRounds?: number;
}): Promise<VerifyResult> {
  let samples = c.samples.slice(), g = c.surrogate, newRuns = 0;
  const rounds: Round[] = [];
  for (let i = 1; i <= (c.maxRounds ?? 10); i++) {
    const known = new Map(samples.map((s) => [key(s.d), s.r]));
    const opt = optimize(g, c.lim, c.k, c.ga, known);
    if (!opt.best) return { rounds, status: "no feasible", accepted: null, samples, surrogate: g, newRuns };
    const d = opt.best, predicted = predictDesign(g, d);
    let fe = known.get(key(d));
    if (!fe) { fe = await c.fe(d); newRuns++; }
    const ok = feasible(fe, c.lim), error = predError(predicted, fe), add = !known.has(key(d)) && (!ok || error > 0.1);
    const verdict = ok ? (error > 0.1 ? "accepted; the surrogate was off by more than 10 %, so the run joins the training" : "accepted") : "added to training";
    const round: Round = { round: i, d, predicted, fe, ok, error, verdict, added: add };
    rounds.push(round);
    c.onRound?.(round);
    if (add) { samples = [...samples, { d, r: fe }]; g = await c.refit(samples); }
    if (ok) return { rounds, status: "accepted", accepted: d, samples, surrogate: g, newRuns };
  }
  return { rounds, status: "not verified", accepted: null, samples, surrogate: g, newRuns };
}

/** The lightest FE-feasible design among the runs so far (the incumbent), independent of the surrogate. */
export function incumbent(samples: Sample[], lim: number) {
  return samples.filter((s) => feasible(s.r, lim)).sort((a, b) => a.r.mass - b.r.mass)[0] ?? null;
}

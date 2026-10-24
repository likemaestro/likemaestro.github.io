// NSGA-II (Deb, Pratap, Agarwal & Meyarivan 2002) for integer design vectors: constrained domination, fast
// non-dominated sorting, crowding distance, binary tournaments, SBX crossover and polynomial mutation rounded to
// integers, duplicate children retried. Plus an exact hypervolume for three objectives.

import { mulberry32, type Rng } from "../rng";
export { mulberry32, type Rng };

export interface Ind { x: number[]; f: number[]; cv: number; rank: number; crowd: number }
export interface Problem { n: number; ub: number | number[]; evaluate: (x: number[]) => { f: number[]; cv: number } }   // ub: one for all variables, or one each
export interface Opts { pop: number; pc: number; mut: number; etaC: number; etaM: number; seed: number; initial?: number[][] }

/** a constrained-dominates b: a feasible design beats an infeasible one, the smaller violation wins between infeasible
 *  ones, and feasible ones compare by Pareto dominance (all objectives minimized). */
export function dominates(a: Ind, b: Ind) {
  if (a.cv > 0 || b.cv > 0) return a.cv < b.cv;
  let better = false;
  for (let k = 0; k < a.f.length; k++) {
    if (a.f[k] > b.f[k]) return false;
    if (a.f[k] < b.f[k]) better = true;
  }
  return better;
}

/** Fast non-dominated sort; sets rank and returns the fronts, best first. */
export function sortFronts(P: Ind[]): Ind[][] {
  const n = P.length, S: number[][] = P.map(() => []), cnt = new Array<number>(n).fill(0), fronts: Ind[][] = [];
  for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) {
    if (dominates(P[p], P[q])) { S[p].push(q); cnt[q]++; } else if (dominates(P[q], P[p])) { S[q].push(p); cnt[p]++; }
  }
  let cur: number[] = [];
  for (let p = 0; p < n; p++) if (!cnt[p]) cur.push(p);
  while (cur.length) {
    const next: number[] = [];
    for (const p of cur) { P[p].rank = fronts.length; for (const q of S[p]) if (!--cnt[q]) next.push(q); }
    fronts.push(cur.map((i) => P[i]));
    cur = next;
  }
  return fronts;
}

/** Crowding distance within one front: the ends are infinite, the rest sum normalized neighbour gaps. */
export function crowding(F: Ind[]) {
  F.forEach((i) => { i.crowd = 0; });
  for (let k = 0; k < (F[0]?.f.length ?? 0); k++) {
    const s = [...F].sort((a, b) => a.f[k] - b.f[k]), lo = s[0].f[k], hi = s[s.length - 1].f[k];
    s[0].crowd = s[s.length - 1].crowd = Infinity;
    if (hi > lo) for (let i = 1; i < s.length - 1; i++) s[i].crowd += (s[i + 1].f[k] - s[i - 1].f[k]) / (hi - lo);
  }
}

const better = (a: Ind, b: Ind) => (a.rank !== b.rank ? a.rank < b.rank : a.crowd > b.crowd);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Bounded simulated binary crossover of one variable (Deb & Agrawal). */
function sbx(a: number, b: number, lo: number, hi: number, eta: number, rnd: Rng): [number, number] {
  if (Math.abs(a - b) < 1e-12) return [a, b];
  const y1 = Math.min(a, b), y2 = Math.max(a, b), u = rnd();
  const bq = (beta: number) => {
    const alpha = 2 - Math.pow(beta, -(eta + 1));
    return u <= 1 / alpha ? Math.pow(u * alpha, 1 / (eta + 1)) : Math.pow(1 / (2 - u * alpha), 1 / (eta + 1));
  };
  const c1 = clamp(0.5 * (y1 + y2 - bq(1 + (2 * (y1 - lo)) / (y2 - y1)) * (y2 - y1)), lo, hi);
  const c2 = clamp(0.5 * (y1 + y2 + bq(1 + (2 * (hi - y2)) / (y2 - y1)) * (y2 - y1)), lo, hi);
  return rnd() < 0.5 ? [c2, c1] : [c1, c2];
}

/** Bounded polynomial mutation of one variable. */
function polyMut(y: number, lo: number, hi: number, eta: number, rnd: Rng) {
  const d1 = (y - lo) / (hi - lo), d2 = (hi - y) / (hi - lo), u = rnd(), p = 1 / (eta + 1);
  const dq = u < 0.5
    ? Math.pow(2 * u + (1 - 2 * u) * Math.pow(1 - d1, eta + 1), p) - 1
    : 1 - Math.pow(2 * (1 - u) + 2 * (u - 0.5) * Math.pow(1 - d2, eta + 1), p);
  return clamp(y + dq * (hi - lo), lo, hi);
}

/** A stepwise NSGA-II run. Integer variables 0..ub are crossed and mutated as reals, then rounded. One objective works too. */
export function createNSGA2(prob: Problem, o: Opts) {
  const rnd = mulberry32(o.seed), N = o.pop, pm = Math.min(1, o.mut / prob.n);
  const ub = (i: number) => (typeof prob.ub === "number" ? prob.ub : prob.ub[i]);
  const make = (x: number[]): Ind => { const e = prob.evaluate(x); return { x, f: e.f, cv: e.cv, rank: 0, crowd: 0 }; };
  const key = (x: number[]) => x.join(",");
  const rank = (P: Ind[]) => { const F = sortFronts(P); F.forEach(crowding); return F; };

  // the first population: the given designs, then random ones
  let pop: Ind[] = (o.initial ?? []).slice(0, N).map(make);
  const seen = new Set<string>(pop.map((i) => key(i.x)));
  for (let tries = 0; pop.length < N && tries < 50 * N; tries++) {
    const x = Array.from({ length: prob.n }, (_, i) => Math.floor(rnd() * (ub(i) + 1)));
    if (!seen.has(key(x)) || tries >= 20 * N) { seen.add(key(x)); pop.push(make(x)); }
  }
  rank(pop);
  const state = { gen: 0, pop, evaluations: N };

  const pick = () => { const a = pop[Math.floor(rnd() * N)], b = pop[Math.floor(rnd() * N)]; return better(a, b) ? a : b; };

  /** One generation: N children by tournament, crossover and mutation, then the best N of parents and children. */
  function step() {
    const have = new Set(pop.map((i) => key(i.x))), kids: Ind[] = [];
    while (kids.length < N) {
      const p1 = pick(), p2 = pick();
      for (let attempt = 0; ; attempt++) {
        const c1 = p1.x.slice(), c2 = p2.x.slice();
        if (rnd() < o.pc) for (let i = 0; i < prob.n; i++) if (rnd() < 0.5) [c1[i], c2[i]] = sbx(c1[i], c2[i], 0, ub(i), o.etaC, rnd);
        for (const c of [c1, c2]) for (let i = 0; i < prob.n; i++) {
          if (rnd() < pm) c[i] = polyMut(c[i], 0, ub(i), o.etaM, rnd);
          c[i] = Math.round(c[i]);
        }
        const fresh = [c1, c2].filter((c) => !have.has(key(c)));
        // duplicates waste evaluations and crowd the front; retry a few times before accepting one
        const take = fresh.length || attempt < 10 ? fresh : [c1];
        if (!take.length) continue;
        for (const c of take) if (kids.length < N) { have.add(key(c)); kids.push(make(c)); }
        break;
      }
    }
    state.evaluations += kids.length;
    const next: Ind[] = [];
    for (const F of rank(pop.concat(kids))) {
      if (next.length + F.length <= N) { next.push(...F); continue; }
      next.push(...[...F].sort((a, b) => b.crowd - a.crowd).slice(0, N - next.length));
      break;
    }
    pop = next;
    rank(pop);
    state.pop = pop;
    state.gen++;
  }
  return { state, step };
}

/** The feasible non-dominated designs of a population. */
export const paretoSet = (P: Ind[]) => P.filter((p) => p.cv === 0 && !P.some((q) => q !== p && q.cv === 0 && dominates(q, p)));

/** Area dominated by 2-D points (minimized) up to ref. */
function hv2(P: number[][], ref: number[]) {
  const s = [...P].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let area = 0, best = ref[1];
  for (const p of s) if (p[1] < best) { area += (ref[0] - p[0]) * (best - p[1]); best = p[1]; }
  return area;
}

/** Exact hypervolume of 3-D points (minimized) up to ref, by slicing along the third objective. */
export function hv3(points: number[][], ref: number[]) {
  const P = points.filter((p) => p[0] < ref[0] && p[1] < ref[1] && p[2] < ref[2]);
  const zs = Array.from(new Set(P.map((p) => p[2]))).sort((a, b) => a - b);
  let v = 0;
  zs.forEach((z, i) => { v += hv2(P.filter((p) => p[2] <= z), ref) * ((zs[i + 1] ?? ref[2]) - z); });
  return v;
}

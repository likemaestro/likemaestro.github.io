// Method of Moving Asymptotes (Svanberg 1987; 2007 form of p, q) for one inequality constraint
// g(x) <= 0 and box bounds [0, 1]. With a single constraint the dual is one scalar, found by bisection.

export interface MmaOptions { move?: number; asyInit?: number; asyIncr?: number; asyDecr?: number }

export class Mma {
  private xold1: Float64Array | null = null;
  private xold2: Float64Array | null = null;
  private low: Float64Array;
  private upp: Float64Array;
  private iter = 0;
  private readonly o: Required<MmaOptions>;

  constructor(private readonly n: number, opts: MmaOptions = {}) {
    this.o = { move: 0.2, asyInit: 0.5, asyIncr: 1.2, asyDecr: 0.7, ...opts };
    this.low = new Float64Array(n);
    this.upp = new Float64Array(n);
  }

  /** One MMA step. df: objective gradient, g: constraint value, dg: constraint gradient. Returns the new x. */
  update(x: Float64Array, df: Float64Array, g: number, dg: Float64Array): Float64Array {
    const { n, o } = this, xmin = 0, xmax = 1, range = xmax - xmin, raa0 = 1e-5;
    const { low, upp } = this;
    this.iter++;
    for (let j = 0; j < n; j++) {
      if (this.iter <= 2 || !this.xold1 || !this.xold2) {
        low[j] = x[j] - o.asyInit * range; upp[j] = x[j] + o.asyInit * range;
      } else {
        const s = (x[j] - this.xold1[j]) * (this.xold1[j] - this.xold2[j]);
        const gam = s < 0 ? o.asyDecr : s > 0 ? o.asyIncr : 1;
        low[j] = x[j] - gam * (this.xold1[j] - low[j]);
        upp[j] = x[j] + gam * (upp[j] - this.xold1[j]);
        low[j] = Math.min(Math.max(low[j], x[j] - 10 * range), x[j] - 0.01 * range);
        upp[j] = Math.max(Math.min(upp[j], x[j] + 10 * range), x[j] + 0.01 * range);
      }
    }
    const alpha = new Float64Array(n), beta = new Float64Array(n);
    const p0 = new Float64Array(n), q0 = new Float64Array(n), p1 = new Float64Array(n), q1 = new Float64Array(n);
    let r1 = g;
    for (let j = 0; j < n; j++) {
      alpha[j] = Math.max(xmin, low[j] + 0.1 * (x[j] - low[j]), x[j] - o.move * range);
      beta[j] = Math.min(xmax, upp[j] - 0.1 * (upp[j] - x[j]), x[j] + o.move * range);
      const ux = upp[j] - x[j], xl = x[j] - low[j], ux2 = ux * ux, xl2 = xl * xl;
      const dfp = Math.max(df[j], 0), dfm = Math.max(-df[j], 0);
      p0[j] = ux2 * (1.001 * dfp + 0.001 * dfm + raa0 / range);
      q0[j] = xl2 * (0.001 * dfp + 1.001 * dfm + raa0 / range);
      const dgp = Math.max(dg[j], 0), dgm = Math.max(-dg[j], 0);
      p1[j] = ux2 * (1.001 * dgp + 0.001 * dgm + raa0 / range);
      q1[j] = xl2 * (0.001 * dgp + 1.001 * dgm + raa0 / range);
      r1 -= p1[j] / ux + q1[j] / xl;
    }
    const xn = new Float64Array(n);
    const primal = (lam: number) => {
      let gv = r1;
      for (let j = 0; j < n; j++) {
        const P = p0[j] + lam * p1[j], Q = q0[j] + lam * q1[j], sp = Math.sqrt(P), sq = Math.sqrt(Q);
        let v = (sp * low[j] + sq * upp[j]) / (sp + sq);
        v = Math.min(beta[j], Math.max(alpha[j], v));
        xn[j] = v;
        gv += p1[j] / (upp[j] - v) + q1[j] / (v - low[j]);
      }
      return gv;   // approximated constraint, decreasing in lam
    };
    if (primal(0) > 0) {
      let hi = 1;
      while (primal(hi) > 0 && hi < 1e12) hi *= 2;
      let lo = 0;
      for (let k = 0; k < 100 && hi - lo > 1e-12 * hi; k++) { const m = 0.5 * (lo + hi); if (primal(m) > 0) lo = m; else hi = m; }
      primal(hi);
    }
    this.xold2 = this.xold1; this.xold1 = Float64Array.from(x);
    return xn;
  }
}

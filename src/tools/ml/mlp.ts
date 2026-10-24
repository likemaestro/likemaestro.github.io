// A small dense neural network: z_l = W_l a_(l−1) + b_l, tanh or linear activations, Xavier-uniform weights from a seed,
// mean-squared error (1 / (batch · outputs)) Σ (ŷ − y)², Adam (β1 0.9, β2 0.999, ε 1e-8) stepped once per minibatch,
// seeded shuffling. Enough for the autoencoder of the chord tool; deterministic for a seed.
import { mulberry32, shuffle } from "../rng";

export type Act = "tanh" | "linear";

export function createMLP(sizes: number[], acts: Act[], seed: number) {
  const L = sizes.length - 1, rng = mulberry32(seed), order = mulberry32(seed + 1);
  if (acts.length !== L) throw new Error("createMLP: one activation per layer");
  const W: Float64Array[] = [], b: Float64Array[] = [];
  for (let l = 0; l < L; l++) {
    const fin = sizes[l], fout = sizes[l + 1], r = Math.sqrt(6 / (fin + fout));
    W.push(Float64Array.from({ length: fout * fin }, () => (2 * rng() - 1) * r));
    b.push(new Float64Array(fout));
  }
  const params = [...W, ...b], m = params.map((p) => new Float64Array(p.length)), v = params.map((p) => new Float64Array(p.length));
  let t = 0;

  /** Activations of every layer, a[0] = x. */
  const run = (x: ArrayLike<number>) => {
    const a: Float64Array[] = [Float64Array.from(x)];
    for (let l = 0; l < L; l++) {
      const fin = sizes[l], fout = sizes[l + 1], z = new Float64Array(fout), prev = a[l];
      for (let o = 0; o < fout; o++) {
        let s = b[l][o];
        for (let i = 0; i < fin; i++) s += W[l][o * fin + i] * prev[i];
        z[o] = acts[l] === "tanh" ? Math.tanh(s) : s;
      }
      a.push(z);
    }
    return a;
  };

  /** Loss over a set and its gradient (same normalization as training): one array per W, then per b. */
  const grad = (X: ArrayLike<number>[], Y: ArrayLike<number>[]) => {
    const gW = W.map((w) => new Float64Array(w.length)), gb = b.map((x) => new Float64Array(x.length)), out = sizes[L];
    let loss = 0;
    const scale = 1 / (X.length * out);
    X.forEach((x, k) => {
      const a = run(x);
      let d = new Float64Array(out);
      for (let o = 0; o < out; o++) { const e = a[L][o] - Y[k][o]; loss += e * e * scale; d[o] = 2 * e * scale; }
      for (let l = L - 1; l >= 0; l--) {
        if (acts[l] === "tanh") for (let o = 0; o < d.length; o++) d[o] *= 1 - a[l + 1][o] ** 2;   // tanh′ = 1 − a²
        const fin = sizes[l], fout = sizes[l + 1], prev = a[l], back = new Float64Array(fin);
        for (let o = 0; o < fout; o++) {
          gb[l][o] += d[o];
          for (let i = 0; i < fin; i++) { gW[l][o * fin + i] += d[o] * prev[i]; back[i] += W[l][o * fin + i] * d[o]; }
        }
        d = back;
      }
    });
    return { loss, g: [...gW, ...gb] };
  };

  return {
    sizes,
    forward: (x: ArrayLike<number>) => run(x)[L],
    /** The activation after layer k (1-based): encode(x, 2) is the bottleneck of a 6–8–2–8–6 network. */
    encode: (x: ArrayLike<number>, k: number) => run(x)[k],
    loss: (X: ArrayLike<number>[], Y: ArrayLike<number>[] = X) => grad(X, Y).loss,
    grad,
    /** One epoch of minibatch Adam; returns the mean minibatch loss. Targets default to the inputs (an autoencoder). */
    trainEpoch(X: ArrayLike<number>[], lr: number, batch: number, Y: ArrayLike<number>[] = X) {
      const idx = shuffle(order, Array.from(X.keys()));
      let total = 0, nb = 0;
      for (let s = 0; s < idx.length; s += batch) {
        const ids = idx.slice(s, s + batch), r = grad(ids.map((i) => X[i]), ids.map((i) => Y[i]));
        t++;
        r.g.forEach((g, p) => {
          const P = params[p], M = m[p], V = v[p];
          for (let i = 0; i < g.length; i++) {
            M[i] = 0.9 * M[i] + 0.1 * g[i];
            V[i] = 0.999 * V[i] + 0.001 * g[i] * g[i];
            P[i] -= (lr * (M[i] / (1 - 0.9 ** t))) / (Math.sqrt(V[i] / (1 - 0.999 ** t)) + 1e-8);
          }
        });
        total += r.loss; nb++;
      }
      return total / nb;
    },
    params: () => Float64Array.from(params.flatMap((p) => Array.from(p))),
    setParams(flat: ArrayLike<number>) { let o = 0; for (const p of params) for (let i = 0; i < p.length; i++) p[i] = flat[o++]; },
  };
}
export type MLP = ReturnType<typeof createMLP>;

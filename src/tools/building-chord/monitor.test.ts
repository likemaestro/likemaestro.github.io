import { lu, luSolve } from "../la/dense";
import { mulberry32, normal } from "../rng";
import { modes, parseDamage, REF, type Building } from "./building";
import { days, features, mahalanobis, normalizer, percentile, restore, score, SPLITS, test as heldOut, train, zscore } from "./monitor";

const B6: Building = { n: 6, sys: "moment" };

test("percentile interpolates linearly", () => {
  expect(percentile([1, 2, 3, 4, 5], 50)).toBe(3);
  expect(percentile([1, 2, 3, 4, 5], 99)).toBeCloseTo(4.96, 12);   // rank 0.99 · 4 = 3.96
  expect(percentile([10], 99)).toBe(10);
});

test("the Mahalanobis distance matches a direct computation", () => {
  const rng = mulberry32(4), Z = Array.from({ length: 50 }, () => { const a = normal(rng), b = normal(rng); return [a, b, a + 0.3 * normal(rng), b - a + 0.3 * normal(rng), normal(rng), 0.5 * a + normal(rng)]; });
  const m = mahalanobis(Z), x = [0.3, -1, 0.5, 0.2, 1.1, -0.4], d = x.map((v, j) => v - m.mu[j]);
  const direct = luSolve(lu(m.cov, 6), Float64Array.from(d)).reduce((a, v, j) => a + v * d[j], 0);
  expect(Math.abs(m.score(x) / direct - 1)).toBeLessThan(1e-10);
  expect(m.score(m.mu)).toBeCloseTo(0, 12);
});

test("synthetic days are seeded, tracked and standardized with training statistics only", () => {
  const a = days(B6, null, 50, 7), b = days(B6, null, 50, 7);
  expect(b.X).toEqual(a.X);
  expect(a.redrawn).toBe(0);
  const n = normalizer(a.X), Z = a.X.map((x) => zscore(x, n));
  for (let j = 0; j < 6; j++) {
    expect(Z.reduce((s, z) => s + z[j], 0) / Z.length).toBeCloseTo(0, 10);
    expect(Math.sqrt(Z.reduce((s, z) => s + z[j] ** 2, 0) / (Z.length - 1))).toBeCloseTo(1, 10);
  }
  // identification noise is 0.2 % of f: the noise-free features of an environment sit within a few tenths of a percent
  const ref = modes(B6, REF), clean = features(B6, a.env[0], null, ref)!;
  a.X[0].forEach((f, j) => expect(Math.abs(f / clean[j] - 1)).toBeLessThan(0.01));
});

test("autoencoder and baseline on the default building, seed 7 (measured, not guaranteed)", () => {
  const t = train(B6, 7), again = train(B6, 7);
  expect(Array.from(again.params)).toEqual(Array.from(t.params));   // deterministic for a seed
  expect(t.trainP99).toBeLessThan(0.05);                             // spec: < 0.05 in feature space (measured 0.011)
  expect(t.best).toBeLessThan(300);                                  // early stopping found a best epoch
  // step 3, the ground-storey center column at 70 %: held-out 200 + 200 days
  const r = heldOut(B6, parseDamage("c1-5", B6, 0.7), t, 7);
  expect(r.damaged.ae / r.damaged.n).toBeGreaterThan(0.9);          // measured 183/200
  expect(r.healthy.ae / r.healthy.n).toBeLessThanOrEqual(0.03);     // measured 6/200; spec ≈ 1 % ± 2 %
  // the noise-free states of steps 2 and 3
  const ref = modes(B6, REF), net = restore(t, 7), msd = mahalanobis(days(B6, null, SPLITS.train, 7).X.map((x) => zscore(x, t.norm)));
  expect(score(net, msd, t.norm, features(B6, { T: 30, occ: 0.6 }, null, ref)!).ae).toBeLessThan(t.aeThreshold);
  expect(score(net, msd, t.norm, features(B6, REF, parseDamage("c1-5", B6, 0.7), ref)!).ae).toBeGreaterThan(t.aeThreshold);
}, 60000);

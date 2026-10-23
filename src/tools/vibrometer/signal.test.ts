import { analyse, detrend, rate, resample, simulated } from "./signal";

// Phone-like timestamps: about 60 Hz with jitter.
const jittered = (seconds: number) => {
  let s = 7; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const t: number[] = [];
  for (let time = 0; time < seconds; time += 1 / 60 + (rnd() - 0.5) * 0.006) t.push(time);
  return t;
};

test("the median rate and a resampled ramp", () => {
  const t = jittered(5);
  expect(rate(t)).toBeGreaterThan(57);
  expect(rate(t)).toBeLessThan(63);
  const u = resample(t, t.map((v) => 3 * v + 1), 50);
  u.forEach((v, k) => expect(v).toBeCloseTo(3 * (t[0] + k / 50) + 1, 6));
});

test("detrend removes a mean and a drift", () => {
  const d = detrend(Float64Array.from({ length: 101 }, (_, k) => 5 + 0.2 * k));
  d.forEach((v) => expect(Math.abs(v)).toBeLessThan(1e-9));
});

test("a 2.5 Hz sine on jittered timestamps peaks at 2.5 Hz within one bin", () => {
  const t = jittered(20), r = analyse(t, t.map((v) => 9.81 + 0.03 * Math.sin(2 * Math.PI * 2.5 * v)));
  expect(Math.abs(r.peaks[0].f - 2.5)).toBeLessThan(r.resolution);
  expect(r.peaks[0].a).toBeCloseTo(0.03, 2);
});

test("the simulated record shows both of its modes", () => {
  const s = simulated(), r = analyse(s.t, s.z);
  const fs = r.peaks.map((p) => p.f);
  expect(fs.some((f) => Math.abs(f - 2.2) < r.resolution)).toBe(true);
  expect(fs.some((f) => Math.abs(f - 6.8) < r.resolution)).toBe(true);
  // and nothing else: no ripple on the broad 2.2 Hz peak counts as a mode
  expect(fs).toHaveLength(2);
});

test("a flat record, as rounding leaves a weak vibration, has no peaks", () => {
  const t = jittered(10);
  expect(analyse(t, t.map(() => 9.8)).peaks).toHaveLength(0);
});

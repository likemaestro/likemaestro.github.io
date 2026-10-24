import { peaks, spectrum } from "../vibrometer/signal";
import { PEAK, synthesize } from "./partials";

test("the FFT of a synthesized buffer finds its partials within one bin; the peak is −12 dBFS", () => {
  const fs = 8000, P = [{ f: 110, a: 1, tau: 3 }, { f: 287.3, a: 0.6, tau: 2 }, { f: 401.9, a: 0.4, tau: 1 }];
  const x = synthesize(P, 2, fs), s = spectrum(Float64Array.from(x), fs), found = peaks(s.amp, s.df, 50, 3, 20).map((p) => p.f).sort((a, b) => a - b);
  P.forEach((p, i) => expect(Math.abs(found[i] - p.f)).toBeLessThan(s.df));
  let peak = 0;
  x.forEach((v) => { peak = Math.max(peak, Math.abs(v)); });
  expect(peak).toBeCloseTo(PEAK, 6);
  expect(Math.abs(x[0])).toBeLessThan(1e-6);                 // the attack starts at zero
  expect(Math.abs(x[x.length - 1])).toBeLessThan(1e-3);      // and the fade ends near zero
});

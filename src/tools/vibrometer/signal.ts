// Spectrum of an unevenly sampled acceleration record: resample, detrend, Hann window, zero-padded radix-2 FFT, peaks.

/** 1 / median time step, in Hz. t in seconds, increasing. */
export function rate(t: ArrayLike<number>) {
  const d: number[] = [];
  for (let k = 1; k < t.length; k++) if (t[k] > t[k - 1]) d.push(t[k] - t[k - 1]);
  d.sort((a, b) => a - b);
  return d.length ? 1 / d[d.length >> 1] : NaN;
}

/** Linear interpolation of (t, x) onto a uniform grid at fs from the first to the last sample. */
export function resample(t: ArrayLike<number>, x: ArrayLike<number>, fs: number) {
  const n = Math.floor((t[t.length - 1] - t[0]) * fs) + 1, out = new Float64Array(n);
  let j = 0;
  for (let k = 0; k < n; k++) {
    const tk = t[0] + k / fs;
    while (j < t.length - 2 && t[j + 1] < tk) j++;
    const span = t[j + 1] - t[j], a = span > 0 ? (tk - t[j]) / span : 0;
    out[k] = x[j] + Math.min(1, Math.max(0, a)) * (x[j + 1] - x[j]);
  }
  return out;
}

/** Remove the least-squares line (mean and drift). */
export function detrend(x: Float64Array) {
  const n = x.length, mt = (n - 1) / 2;
  let mx = 0; for (let k = 0; k < n; k++) mx += x[k] / n;
  let sxy = 0, sxx = 0;
  for (let k = 0; k < n; k++) { sxy += (k - mt) * (x[k] - mx); sxx += (k - mt) ** 2; }
  const b = sxx ? sxy / sxx : 0;
  return x.map((v, k) => v - mx - b * (k - mt));
}

export const variance = (x: Float64Array) => { let m = 0, s = 0; x.forEach((v) => { m += v; }); m /= x.length || 1; x.forEach((v) => { s += (v - m) ** 2; }); return s / (x.length || 1); };

/** In-place iterative radix-2 FFT; length a power of two. */
function fft(re: Float64Array, im: Float64Array) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = a + len / 2, tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
        const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
      }
    }
  }
}

/** One-sided amplitude spectrum of a detrended record at fs (Hann window, zero padding to at least 4× a power of two). */
export function spectrum(x: Float64Array, fs: number) {
  let n = 1; while (n < x.length * 4) n <<= 1;
  const re = new Float64Array(n), im = new Float64Array(n);
  let wsum = 0;
  for (let k = 0; k < x.length; k++) { const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * k) / (x.length - 1)); re[k] = x[k] * w; wsum += w; }
  fft(re, im);
  const m = n / 2 + 1, amp = new Float64Array(m);
  for (let k = 0; k < m; k++) amp[k] = (2 * Math.hypot(re[k], im[k])) / wsum;
  return { amp, df: fs / n, resolution: fs / x.length };
}

/** The strongest peaks above fmin: each the largest value within ±`win` Hz (so ripple on a broad peak doesn't count) and
 *  at least `floor` of the strongest, refined by a parabola through the three bins around it. */
export function peaks(amp: Float64Array, df: number, fmin = 0.5, count = 3, win = 0.3, floor = 0.1) {
  const w = Math.max(1, Math.round(win / df)), cand: { f: number; a: number }[] = [];
  for (let k = Math.max(1, Math.ceil(fmin / df)); k < amp.length - 1; k++) {
    if (!(amp[k] > 0)) continue;   // a flat record (e.g. readings rounded to one value) has no peaks
    let top = true;
    for (let j = Math.max(0, k - w); j <= Math.min(amp.length - 1, k + w) && top; j++) if (amp[j] > amp[k]) top = false;
    if (!top) continue;
    const a = amp[k - 1], b = amp[k], c = amp[k + 1], den = a - 2 * b + c, d = den ? (0.5 * (a - c)) / den : 0;
    cand.push({ f: (k + d) * df, a: b - 0.25 * (a - c) * d });
  }
  cand.sort((p, q) => q.a - p.a);
  return cand.filter((p) => p.a >= floor * (cand[0]?.a ?? 0)).slice(0, count);
}

/** Full chain for one axis: uniform resampling at the median rate, detrend, spectrum, peaks. */
export function analyse(t: ArrayLike<number>, x: ArrayLike<number>) {
  const fs = rate(t), u = detrend(resample(t, x, fs)), s = spectrum(u, fs);
  return { fs, signal: u, ...s, peaks: peaks(s.amp, s.df, 0.5, 3, Math.max(0.3, 4 * s.resolution)) };
}

/** A simulated record (clearly labelled as such on the page): two damped modes, a little noise, uneven timestamps. */
export function simulated(seconds = 20, f1 = 2.2, f2 = 6.8) {
  let s = 12345;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const t: number[] = [], z: number[] = [];
  for (let time = 0; time < seconds; time += 1 / 60 + (rnd() - 0.5) * 0.004) {
    const kick = (tk: number) => (time > tk ? Math.exp(-(time - tk) * 0.35) : 0);
    t.push(time);
    z.push(9.81 + 0.05 * (kick(1) + kick(9)) * Math.sin(2 * Math.PI * f1 * time) + 0.02 * (kick(1) + kick(9)) * Math.sin(2 * Math.PI * f2 * time) + 0.004 * (rnd() - 0.5));
  }
  return { t, x: t.map(() => 0), y: t.map(() => 0), z };
}

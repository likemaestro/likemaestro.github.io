// Tones from partials: Σ a sin(2π f t) e^(−t/τ), a 5 ms linear attack, a short fade at the end of the buffer (so a long
// decay doesn't click when the buffer stops), normalized to a peak of −12 dBFS. One AudioContext for the site, made on
// the first user gesture; every source goes through one master gain.

export interface Partial { f: number; a: number; tau: number }
export const PEAK = 10 ** (-12 / 20);

export function synthesize(partials: Partial[], seconds: number, sampleRate: number, fadeOut = 0.25): Float32Array<ArrayBuffer> {
  const n = Math.round(seconds * sampleRate), out = new Float32Array(n), attack = Math.round(0.005 * sampleRate), fade = Math.round(fadeOut * sampleRate);
  for (const p of partials) {
    const w = (2 * Math.PI * p.f) / sampleRate, k = Math.exp(-1 / (p.tau * sampleRate));
    let env = p.a;
    for (let i = 0; i < n; i++) { out[i] += env * Math.sin(w * i); env *= k; }
  }
  let peak = 0;
  for (let i = 0; i < n; i++) {
    if (i < attack) out[i] *= i / attack;
    if (i >= n - fade) out[i] *= (n - i) / fade;
    peak = Math.max(peak, Math.abs(out[i]));
  }
  if (peak > 0) for (let i = 0; i < n; i++) out[i] *= PEAK / peak;
  return out;
}

/** Whether the browser has Web Audio at all (checked without creating a context). */
export const hasWebAudio = () => typeof window !== "undefined" && !!(window.AudioContext ?? (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext);

let ctx: AudioContext | null = null, master: GainNode | null = null;
const active = new Set<AudioBufferSourceNode>();

/** The shared context and master gain; create or resume only from a user gesture. Null without Web Audio. */
export async function audio() {
  const AC = typeof window !== "undefined" ? (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) : undefined;
  if (!AC) return null;
  if (!ctx) { ctx = new AC(); master = ctx.createGain(); master.connect(ctx.destination); }
  if (ctx.state === "suspended") await ctx.resume();
  return { ctx, master: master! };
}

/** Schedule a buffer at `when` (audio clock) with a gain; the source is tracked so stopAll() can silence it. */
export function play(c: AudioContext, out: AudioNode, samples: Float32Array<ArrayBuffer>, when: number, gain = 1) {
  const buf = c.createBuffer(1, samples.length, c.sampleRate);
  buf.copyToChannel(samples, 0);
  const src = c.createBufferSource(), g = c.createGain();
  g.gain.value = gain;
  src.buffer = buf;
  src.connect(g).connect(out);
  src.onended = () => { active.delete(src); g.disconnect(); };
  active.add(src);
  src.start(when);
  return src;
}

export function stopAll() { for (const s of active) { try { s.stop(); } catch { /* not started */ } s.disconnect(); } active.clear(); }
export const setVolume = (v: number) => { if (master && ctx) master.gain.setTargetAtTime(v, ctx.currentTime, 0.02); };

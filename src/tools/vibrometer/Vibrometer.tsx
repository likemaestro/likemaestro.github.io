import React, { useEffect, useMemo, useRef, useState } from "react";
import ToolShell from "../ToolShell";
import { analyse, simulated, variance } from "./signal";
import { download } from "../../lab/export";

interface Record_ { t: number[]; x: number[]; y: number[]; z: number[]; source: "phone" | "file" | "simulated"; name?: string }
type Phase = "idle" | "countdown" | "recording";
const LENGTHS = [10, 20, 60];

/** Pick the axis that moved most, and analyse it. */
function result(r: Record_) {
  const axes = (["x", "y", "z"] as const).map((k) => ({ k, a: analyse(r.t, r[k]) }));
  const best = axes.reduce((p, q) => (variance(q.a.signal) > variance(p.a.signal) ? q : p));
  return { axis: best.k, ...best.a };
}

/** Plain polyline chart of y against x, with optional marked x positions. */
const Chart: React.FC<{ y: ArrayLike<number>; x0: number; dx: number; xLabel: string; ticks: number[]; marks?: { x: number; main: boolean }[]; label: string }> = ({ y, x0, dx, xLabel, ticks, marks, label }) => {
  const W = 640, H = 180, M = { l: 10, r: 10, t: 10, b: 34 };
  const n = y.length, xmax = x0 + (n - 1) * dx;
  let lo = Infinity, hi = -Infinity;
  for (let k = 0; k < n; k++) { lo = Math.min(lo, y[k]); hi = Math.max(hi, y[k]); }
  if (!(hi > lo)) { lo -= 1; hi += 1; }
  const sx = (v: number) => M.l + ((v - x0) / (xmax - x0)) * (W - M.l - M.r), sy = (v: number) => H - M.b - ((v - lo) / (hi - lo)) * (H - M.t - M.b);
  // Thin long records to at most ~1200 points for drawing.
  const stride = Math.max(1, Math.floor(n / 1200));
  let d = "";
  for (let k = 0; k < n; k += stride) d += `${k ? "L" : "M"}${sx(x0 + k * dx).toFixed(1)} ${sy(y[k]).toFixed(1)}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="block w-full text-ink">
      <line x1={M.l} x2={W - M.r} y1={H - M.b} y2={H - M.b} stroke="#CBD2D5" />
      {marks?.map((m, i) => <line key={i} x1={sx(m.x)} x2={sx(m.x)} y1={M.t} y2={H - M.b} stroke={m.main ? "#F05A24" : "#819199"} strokeDasharray={m.main ? undefined : "4 4"} strokeWidth={m.main ? 1.5 : 1} />)}
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
      <g className="fill-ink-2" fontSize="12">
        {ticks.map((v) => <text key={v} x={sx(v)} y={H - M.b + 16} textAnchor="middle">{v}</text>)}
        <text x={W - M.r} y={H - 2} textAnchor="end">{xLabel}</text>
      </g>
    </svg>
  );
};
const niceTicks = (max: number) => { const step = [0.5, 1, 2, 5, 10, 20].find((s) => max / s <= 7) ?? 50; return Array.from({ length: Math.floor(max / step) + 1 }, (_, k) => Number((k * step).toFixed(2))); };

function parseCSV(text: string, name: string): Record_ | string {
  const rows = text.split(/\r?\n/).map((l) => l.split(/[,;\t ]+/).filter(Boolean).map(Number)).filter((r) => r.length >= 2 && r.every(Number.isFinite));
  if (rows.length < 64) return "That file has fewer than 64 rows of numbers. Use time in seconds, then one or three acceleration columns.";
  const t = rows.map((r) => r[0]);
  if (!t.every((v, k) => !k || v > t[k - 1])) return "The first column must be time in seconds, increasing.";
  const col = (c: number) => rows.map((r) => r[Math.min(c, r.length - 1)]);
  return rows[0].length >= 4 ? { t, x: col(1), y: col(2), z: col(3), source: "file", name } : { t, x: col(1), y: col(1).map(() => 0), z: col(1).map(() => 0), source: "file", name };
}

const Vibrometer: React.FC = () => {
  const [rec, setRec] = useState<Record_>(() => ({ ...simulated(), source: "simulated" }));
  const [phase, setPhase] = useState<Phase>("idle");
  const [count, setCount] = useState(0);
  const [length, setLength] = useState(20);
  const [elapsed, setElapsed] = useState(0);
  const [problem, setProblem] = useState("");
  const bufRef = useRef<{ t: number[]; x: number[]; y: number[]; z: number[] }>({ t: [], x: [], y: [], z: [] });
  const stopRef = useRef<() => void>(() => {});
  useEffect(() => () => stopRef.current(), []);

  const res = useMemo(() => result(rec), [rec]);
  const main = res.peaks[0];

  const record = () => {
    bufRef.current = { t: [], x: [], y: [], z: [] };
    const buf = bufRef.current;
    let lock: { release: () => Promise<void> } | undefined;
    (navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } }).wakeLock?.request("screen").then((l) => { lock = l; }).catch(() => {});
    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity;
      if (!a || a.x === null || a.y === null || a.z === null) return;
      buf.t.push(e.timeStamp / 1000); buf.x.push(a.x); buf.y.push(a.y!); buf.z.push(a.z!);
    };
    const t0 = performance.now();
    let timers: number[] = [];
    const stop = (done: boolean) => {
      window.removeEventListener("devicemotion", onMotion);
      timers.forEach((id) => window.clearInterval(id));
      timers = [];
      lock?.release().catch(() => {});
      stopRef.current = () => {};
      setPhase("idle");
      if (!done) return;
      if (buf.t.length < 64) { setProblem("No motion data arrived. This device or browser doesn’t share its accelerometer; the simulated example shows instead."); return; }
      setRec({ ...buf, source: "phone" });
    };
    window.addEventListener("devicemotion", onMotion);
    setPhase("recording");
    timers.push(window.setInterval(() => {
      const s = (performance.now() - t0) / 1000;
      setElapsed(s);
      if (s > 1.5 && buf.t.length === 0) { stop(false); setProblem("No motion data arrived. This device or browser doesn’t share its accelerometer; the simulated example shows instead."); }
      else if (s >= length) stop(true);
    }, 100));
    stopRef.current = () => stop(false);
  };

  const start = () => {
    setProblem("");
    const go = () => {
      setPhase("countdown"); setCount(3);
      let c = 3;
      const id = window.setInterval(() => { c--; setCount(c); if (c <= 0) { window.clearInterval(id); record(); } }, 1000);
      stopRef.current = () => { window.clearInterval(id); setPhase("idle"); };
    };
    const DME = (window as unknown as { DeviceMotionEvent?: { requestPermission?: () => Promise<string> } }).DeviceMotionEvent;
    if (!DME) { setProblem("This browser has no motion sensor access. Open the page on a phone, or upload a CSV."); return; }
    // iOS asks for motion permission; the request has to come straight from the tap.
    if (typeof DME.requestPermission === "function") {
      DME.requestPermission().then((s) => (s === "granted" ? go() : setProblem("Motion access was declined. Allow it in the browser’s settings to measure, or upload a CSV."))).catch(() => setProblem("Motion access isn’t available here. Upload a CSV instead."));
    } else go();
  };

  const onFile = (f: File | undefined) => {
    if (!f) return;
    f.text().then((s) => { const r = parseCSV(s, f.name); if (typeof r === "string") setProblem(r); else { setProblem(""); setRec(r); } });
  };

  const fsTicks = niceTicks(res.fs / 2), tTicks = niceTicks(rec.t[rec.t.length - 1] - rec.t[0]);
  const exportRecording = () => download("vibrometer-recording.csv", `# Phone vibrometer, ${window.location.href}\n# source: ${rec.source}\n# time_s,ax_m_s2,ay_m_s2,az_m_s2\n${rec.t.map((t, k) => `${(t - rec.t[0]).toFixed(4)},${rec.x[k]},${rec.y[k]},${rec.z[k]}`).join("\n")}\n`, "text/csv");
  const exportSpectrum = () => download("vibrometer-spectrum.csv", `# Phone vibrometer, axis ${res.axis}, sampling ${res.fs.toFixed(2)} Hz, Hann window\n# frequency_hz,amplitude_m_s2\n${Array.from(res.amp, (a, k) => `${(k * res.df).toFixed(4)},${a.toExponential(4)}`).join("\n")}\n`, "text/csv");

  const busy = phase !== "idle";
  const sourceText = rec.source === "simulated" ? "Simulated example, not a measurement: two modes at 2.2 Hz and 6.8 Hz, struck twice, with noise."
    : rec.source === "file" ? `From ${rec.name}.` : "Your measurement.";

  return (
    <ToolShell
      path="/tools/vibrometer"
      slug="vibrometer"
      methodRef={{ label: "Feng et al. 2015", href: "https://doi.org/10.3390/s150202980" }}
      method={<>
        <p>The browser reads the phone’s accelerometer through motion events. The record is resampled to a uniform rate, the mean and drift are removed, and a Hann-windowed fast Fourier transform gives the spectrum of the axis that moved most.</p>
        <p>The highest peak above 0.5 Hz is the main frequency, refined between frequency bins. Smartphone accelerometers have been checked against reference sensors on shaking tables and a bridge (Feng et al. 2015).</p>
      </>}
      limits={<>
        <p>Browsers deliver about 60 to 100 samples a second, so only frequencies below half that rate show. Phone sensors are uncalibrated and noisy: frequencies are more reliable than amplitudes. A reading is indicative, not a structural assessment.</p>
        <p>Nothing leaves your device: the recording stays in this page until you export it.</p>
      </>}
    >
      <div className="grid gap-x-12 gap-y-10 md:grid-cols-[17rem_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          <button type="button" onClick={busy ? () => stopRef.current() : start} className="btn btn-solid h-14 text-[1.0625rem]">
            {phase === "countdown" ? `Starting in ${count}… (tap to cancel)` : phase === "recording" ? `Recording ${Math.min(length, Math.floor(elapsed))} / ${length} s (tap to stop)` : "Start measuring"}
          </button>
          <div role="group" aria-label="Record length" className="flex rounded-[2px] border border-ink">
            {LENGTHS.map((s, i) => (
              <button key={s} type="button" aria-pressed={length === s} disabled={busy} onClick={() => setLength(s)}
                className={`t-data min-h-[2.25rem] flex-1 transition-colors duration-150 [@media(pointer:coarse)]:min-h-[44px] ${i ? "border-l border-rule" : ""} ${length === s ? "bg-ink font-[600] text-canvas" : "text-ink-2 hover:bg-wash hover:text-ink"}`}>
                {s} s
              </button>
            ))}
          </div>
          <ol className="t-small list-decimal space-y-1.5 pl-4 text-ink-2">
            <li>Lay the phone flat on the structure, screen up, where it can’t fall.</li>
            <li>Tap Start and take your hands off it.</li>
            <li>Let the structure move: walk or jump once on a footbridge, or measure while people cross.</li>
          </ol>
          <label className="t-small text-ink-2">Or analyse a CSV (time in s, then one or three acceleration columns)
            <input type="file" accept=".csv,.txt,text/csv,text/plain" onChange={(e) => onFile(e.target.files?.[0])} className="t-small mt-2 block w-full text-ink file:mr-3 file:cursor-pointer file:rounded-[2px] file:border file:border-ink file:bg-transparent file:px-3 file:py-1.5 file:text-ink" />
          </label>
          {problem && <p className="t-small text-ink" role="alert">{problem}</p>}
        </div>

        <div className="min-w-0" aria-live="polite">
          <p className="t-small text-ink-2">{sourceText}</p>
          <div className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-2">
            <p className="t-h2">{main ? `${main.f.toFixed(2)} Hz` : "No clear peak"}</p>
            <p className="t-data text-ink-2">
              {res.peaks.length > 1 && <>Next peaks {res.peaks.slice(1).map((p) => `${p.f.toFixed(2)} Hz`).join(", ")} · </>}
              sampling {res.fs.toFixed(0)} Hz · resolution {res.resolution.toFixed(3)} Hz · axis {res.axis}
            </p>
          </div>
          <div className="mt-5">
            <p className="t-small mb-1 text-ink-2">Spectrum, amplitude against frequency</p>
            <Chart y={res.amp} x0={0} dx={res.df} xLabel="Hz" ticks={fsTicks} marks={res.peaks.map((p, i) => ({ x: p.f, main: i === 0 }))}
              label={`Spectrum up to ${(res.fs / 2).toFixed(0)} Hz. Main peak at ${main ? main.f.toFixed(2) : "none"} hertz.`} />
          </div>
          <div className="mt-5">
            <p className="t-small mb-1 text-ink-2">Acceleration on axis {res.axis}, mean and drift removed</p>
            <Chart y={res.signal} x0={0} dx={1 / res.fs} xLabel="s" ticks={tTicks} label="Acceleration over time" />
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" className="btn" onClick={exportRecording}>Recording CSV</button>
            <button type="button" className="btn" onClick={exportSpectrum}>Spectrum CSV</button>
            {rec.source !== "simulated" && <button type="button" className="btn" onClick={() => setRec({ ...simulated(), source: "simulated" })}>Show the example</button>}
          </div>
        </div>
      </div>
    </ToolShell>
  );
};

export default Vibrometer;

import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import ToolShell from "../ToolShell";
import { useToolParams } from "../useToolParams";
import { Field, Segmented, Tip } from "../controls";
import { hasWebGL2 } from "../three/support";
import { audio, hasWebAudio, play, setVolume, stopAll, synthesize } from "../audio/partials";
import { members, modes, parseDamage, REF, track, type Building, type System } from "./building";
import { partials, transposition, visualHz } from "./sound";
import { features, mahalanobisFrom, restore, score, type Trained } from "./monitor";
import type { MonitorIn, MonitorOut } from "./monitor.worker";
import { Health, Latent, Loss, Residuals, Shift, Spectrum } from "./Charts";
import type { Motion } from "./Building3D";

const Building3D = lazy(() => import("./Building3D"));

const SPEC = {
  n: { kind: "num", min: 4, max: 8, step: 1, def: 6 },
  sys: { kind: "enum", values: ["moment", "braced"], def: "moment" },
  T: { kind: "num", min: -10, max: 35, step: 1, def: 15 },
  occ: { kind: "num", min: 0, max: 1, step: 0.05, def: 0.3 },
  dmg: { kind: "text", ok: (v: string) => v === "" || /^[cb]\d+-\d+$/.test(v), def: "" },
  d: { kind: "num", min: 0, max: 0.9, step: 0.05, def: 0.5 },
  tap: { kind: "text", ok: (v: string) => /^\d+[xy]$/.test(v), def: "6y" },
  seed: { kind: "num", min: 1, max: 999999, step: 1, def: 7 },
  color: { kind: "enum", values: ["temp", "occ"], def: "temp" },
  step: { kind: "enum", values: ["1", "2", "3", "free"], def: "1" },
} as const;
const STEPS = [
  { key: "1", text: "Tap the building", caption: "Tap the building to hear its chord: each note is one vibration mode." },
  { key: "2", text: "A warm, full day", caption: "Temperature and occupancy change the frequencies, even without damage. Check what the trained model reports." },
  { key: "3", text: "Damage a column", caption: "Reducing a column’s stiffness can alter the chord. Compare it with ordinary variation and inspect the anomaly score." },
] as const;
const REDUCED = typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const ORDINAL = ["first", "second", "third", "fourth", "fifth", "sixth"];
const TYPE_TEXT = { X: "sway in x", Y: "sway in y", Twist: "twist" } as const;

const BuildingChord: React.FC = () => {
  const { values: p, clamped, set } = useToolParams(SPEC);
  const b: Building = useMemo(() => ({ n: p.n, sys: p.sys as System }), [p.n, p.sys]);
  const env = useMemo(() => ({ T: p.T, occ: p.occ }), [p.T, p.occ]);
  const dmg = useMemo(() => parseDamage(p.dmg, b, p.d), [p.dmg, b, p.d]);
  const tapM = /^(\d+)([xy])$/.exec(p.tap), tap = { floor: tapM && Number(tapM[1]) <= b.n && Number(tapM[1]) >= 1 ? Number(tapM[1]) : b.n, dir: (tapM?.[2] ?? "y") as "x" | "y" };

  // modes: the healthy reference fixes K and identifies modes; the current state is tracked against it by MAC
  const ref = useMemo(() => modes(b, REF), [b]);
  const healthy = useMemo(() => modes(b, env), [b, env]);
  const cur = useMemo(() => modes(b, env, dmg), [b, env, dmg]);
  const K = transposition(ref.modes[0].f), count = Math.min(6, 3 * b.n);
  const tr = useMemo(() => track(ref, cur.modes, count), [ref, cur, count]);
  const chordNow = useMemo(() => partials(cur.modes, b.n, tap, K), [cur, b.n, tap.floor, tap.dir, K]);   // eslint-disable-line react-hooks/exhaustive-deps
  const chordRef = useMemo(() => partials(ref.modes, b.n, tap, K), [ref, b.n, tap.floor, tap.dir, K]);   // eslint-disable-line react-hooks/exhaustive-deps
  const rows = tr.to.map((j, i) => ({ i, f: cur.modes[j].f, type: cur.modes[j].type, change: cur.modes[j].f / ref.modes[i].f - 1, mac: tr.mac[i], j }));
  const biggest = rows.reduce((a, r) => (Math.abs(r.change) > Math.abs(a.change) ? r : a), rows[0]);
  const vsHealthyToday = healthy.modes[0].f > 0 ? cur.modes[0].f / healthy.modes[0].f - 1 : 0;

  // monitoring: trained in a worker for this building; retrained when the building changes
  const workerRef = useRef<Worker | null>(null);
  const [trained, setTrained] = useState<Trained | null>(null), [history, setHistory] = useState<Trained["history"]>([]);
  const [trainMs, setTrainMs] = useState(0), [error, setError] = useState(""), [said, setSaid] = useState("");
  const [testRes, setTestRes] = useState<{ key: string; r: { healthy: { ae: number; md: number; n: number }; damaged: { ae: number; md: number; n: number } }; ms: number } | null>(null);
  const [testing, setTesting] = useState(false), testFor = useRef("");   // the state a running test belongs to
  const bKey = `${b.n}|${b.sys}|${p.seed}`;
  useEffect(() => {
    const w = new Worker(new URL("./monitor.worker.ts", import.meta.url), { type: "module" });
    workerRef.current = w;
    setTrained(null); setHistory([]); setTestRes(null);
    w.onmessage = (e: MessageEvent<MonitorOut>) => {
      const m = e.data;
      if (m.type === "progress") setHistory(m.history);
      if (m.type === "trained") { setTrained(m.trained); setHistory(m.trained.history); setTrainMs(m.ms); setSaid(`Training done: best of ${m.trained.history.length} epochs, in ${(m.ms / 1000).toFixed(1)} s.`); }
      if (m.type === "tested") { setTestRes({ key: testFor.current, r: m.result, ms: m.ms }); setTesting(false); }
      if (m.type === "error") { setError(m.message); setTesting(false); }
    };
    w.onerror = (e) => setError(e.message || "the worker failed");
    w.postMessage({ id: 1, type: "train", b, seed: p.seed } satisfies MonitorIn);
    return () => w.terminate();   // a new building ends the old training
  }, [bKey]);   // eslint-disable-line react-hooks/exhaustive-deps

  const model = useMemo(() => (trained ? { net: restore(trained, p.seed), msd: mahalanobisFrom(trained.msd.mu, trained.msd.cov) } : null), [trained]);   // eslint-disable-line react-hooks/exhaustive-deps
  const now = useMemo(() => { if (!model || !trained) return null; const x = features(b, env, dmg, ref); return x ? score(model.net, model.msd, trained.norm, x) : null; }, [model, trained, b, env, dmg, ref]);
  const refScore = useMemo(() => { if (!model || !trained) return null; const x = features(b, REF, null, ref); return x ? score(model.net, model.msd, trained.norm, x) : null; }, [model, trained, b, ref]);
  const aeFlag = now && trained ? now.ae > trained.aeThreshold : null, msdFlag = now && trained ? now.msd > trained.msdThreshold : null;

  // sound
  const [muted, setMuted] = useState(false), [vol, setVol] = useState(0.8), [noAudio, setNoAudio] = useState(() => !hasWebAudio()), [mutedNote, setMutedNote] = useState(false);
  const [playing, setPlaying] = useState<"none" | "current" | "healthy" | "both">("none");
  const clock = useRef(0);
  const [motion, setMotion] = useState<Motion | null>(null), [showMode, setShowMode] = useState<number | null>(null);
  const key = useRef(0);
  useEffect(() => () => { cancelAnimationFrame(clock.current); stopAll(); }, []);
  useEffect(() => { setVolume(muted ? 0 : vol); }, [muted, vol]);
  const follow = (ctx: AudioContext, phases: [number, number, typeof playing][]) => {   // highlight from the audio clock
    cancelAnimationFrame(clock.current);
    const tick = () => {
      const t = ctx.currentTime, ph = phases.find(([a, z]) => t >= a && t < z);
      setPlaying(ph ? ph[2] : "none");
      if (t < phases[phases.length - 1][1]) clock.current = requestAnimationFrame(tick);
    };
    clock.current = requestAnimationFrame(tick);
  };
  const animateTap = () => {
    if (REDUCED) return;
    setShowMode(null);
    setMotion({ key: ++key.current, shapes: chordNow.map((q) => cur.modes[q.mode].phi), amps: chordNow.map((q) => q.a), hz: chordNow.map((q) => visualHz(q.fPhys, ref.modes[0].f)), tau: chordNow.map((q) => q.tau), seconds: 4, loop: false });
  };
  const doTap = async () => {
    animateTap();
    const a = await audio();
    if (!a) { setNoAudio(true); return; }
    silence();
    if (muted) { setMutedNote(true); return; }
    setMutedNote(false);
    a.master.gain.setValueAtTime(vol, a.ctx.currentTime);   // the context may be new: give it the current volume
    const tone = synthesize(chordNow, 4, a.ctx.sampleRate), t0 = a.ctx.currentTime + 0.02;   // synthesize first, then set the time
    play(a.ctx, a.master, tone, t0);
    follow(a.ctx, [[t0, t0 + 4, "current"]]);
  };
  const doCompare = async () => {
    const a = await audio();
    if (!a) { setNoAudio(true); return; }
    silence();
    if (muted) { setMutedNote(true); return; }
    setMutedNote(false);
    a.master.gain.setValueAtTime(vol, a.ctx.currentTime);
    const sr = a.ctx.sampleRate, h = synthesize(chordRef, 3, sr), c = synthesize(chordNow, 3, sr), mix = new Float32Array(h.length);
    for (let i = 0; i < mix.length; i++) mix[i] = 10 ** (-6 / 20) * (h[i] + c[i]);
    const h2 = synthesize(chordRef, 2, sr), c2 = synthesize(chordNow, 2, sr), t0 = a.ctx.currentTime + 0.05;
    play(a.ctx, a.master, h2, t0);
    play(a.ctx, a.master, c2, t0 + 2.3);
    play(a.ctx, a.master, mix, t0 + 4.6);
    follow(a.ctx, [[t0, t0 + 2, "healthy"], [t0 + 2.3, t0 + 4.3, "current"], [t0 + 4.6, t0 + 7.6, "both"]]);
  };
  const silence = () => { stopAll(); cancelAnimationFrame(clock.current); setPlaying("none"); };   // the highlight ends with the sound
  const toggleMute = () => { if (!muted) silence(); setMuted(!muted); };
  const showOne = (j: number) => {
    if (showMode === j) { setShowMode(null); setMotion(null); return; }
    setShowMode(j);
    if (!REDUCED) setMotion({ key: ++key.current, shapes: [cur.modes[j].phi], amps: [1], hz: [visualHz(cur.modes[j].f, ref.modes[0].f)], tau: [Infinity], seconds: 30, loop: true });
  };

  const runStep = (k: string) => {
    if (k === "1") set({ step: "1", T: 15, occ: 0.3, dmg: "" });
    if (k === "2") set({ step: "2", T: 30, occ: 0.6, dmg: "" });
    if (k === "3") set({ step: "3", T: 15, occ: 0.3, dmg: "c1-5", d: 0.7 });   // the ground-storey center column (the spec's "inner column")
    if (k === "free") set({ step: "free" });
  };

  useEffect(() => {
    if (aeFlag === null) return;
    const t = window.setTimeout(() => setSaid(`Autoencoder: ${aeFlag ? "flagged" : "normal"}. Mahalanobis: ${msdFlag ? "flagged" : "normal"}.`), 400);
    return () => window.clearTimeout(t);
  }, [aeFlag, msdFlag]);

  const [picking, setPicking] = useState(false);
  const list = useMemo(() => members(b), [b]);
  const dmgLabel = dmg ? list.find((m) => m.id === p.dmg)?.label ?? p.dmg : null;
  const label = `${b.n}-storey steel building, ${b.sys === "moment" ? "moment frame" : "braced core"}.${dmgLabel ? ` ${dmgLabel} weakened ${Math.round(100 * p.d)} %.` : ""} First mode ${cur.modes[0].f.toFixed(2)} hertz${dmg ? `, ${Math.abs(100 * vsHealthyToday).toFixed(1)} % lower than healthy` : ""}.`;
  const change = !biggest || Math.abs(biggest.change) < 0.0005 ? "Every mode is where the healthy reference has it." : `The ${ORDINAL[biggest.i]} mode (${TYPE_TEXT[biggest.type]}) is ${Math.abs(100 * biggest.change).toFixed(1)} % ${biggest.change < 0 ? "lower" : "higher"} than the healthy reference.`;
  const webgl = useMemo(() => hasWebGL2(), []);
  const testKey = `${bKey}|${p.dmg}|${p.d}`;

  return (
    <ToolShell
      path="/tools/building-chord"
      slug="building-chord"
      methodRef={{ label: "Sohn, Worden and Farrar 2002", href: "https://doi.org/10.1106/104538902030904" }}
      method={<>
        <p>The building is a torsionally coupled shear model: rigid floors with three degrees of freedom each, columns (12EI/h³, fixed between rigid floors) and X-braces as storey springs. Its modes come from the generalized eigenproblem.</p>
        <p>Each mode becomes a tone: its frequency is multiplied by a fixed factor so the healthy building’s first mode sounds at 110 Hz, and the ratios between the modes, the chord, are the building’s own (parameter-mapping sonification). The loudness is how much a tap at a floor corner moves the mode times how much the roof corner moves in it; the decay is that of 2 % damping.</p>
        <p>An autoencoder (6–8–2–8–6) learns the first six frequencies over 1,000 simulated healthy days with changing temperature and occupancy; a day it cannot rebuild is flagged. Autoassociative networks have been used this way since Sohn, Worden and Farrar (2002); the Mahalanobis distance is the classic baseline (<a className="link" href="https://doi.org/10.1006/jsvi.1999.2514" rel="noopener noreferrer">Worden, Manson and Fieller 2000</a>). Both thresholds are the 99th percentile on 1,000 separate healthy days.</p>
        <p>The autoencoder idea comes from my team project for the EWSHM 2026 challenge; this tool uses synthetic data only.</p>
      </>}
      limits={<>
        <p>A simplified model with assumed loads (gk 4.0 kN/m², the roof without imposed load) and damping; the temperature effect (0.15 % stiffness per °C) is illustrative. Real buildings vary mostly through non-structural parts (Peeters and De Roeck 2001, the Z24 bridge).</p>
        <p>Frequencies are computed, not identified from measured vibration; the 0.2 % noise stands in for identification error. The sound is a mapping, not a recording. A symmetric building already beats a little, because some of its modes are close.</p>
        <p>The braces sit on the two center lines, so they add no twisting stiffness: the braced building twists first.</p>
        <p>Detection rates and false alarms describe this simulation, not a real building. A threshold taken from 1,000 days is itself uncertain: over ten training seeds, the false-alarm rate on 20,000 new healthy days ranged from 0.6 to 1.7 % (mean 1.0 %). Damage that lowers every frequency alike (an edge column, for instance) can look like a warm, busy day and go unflagged.</p>
      </>}
    >
      {clamped.length > 0 && <p className="t-small mb-4 text-ink-2">Some link settings were out of range and have been adjusted: {clamped.join(", ")}.</p>}
      {error && <p className="t-small mb-4 text-ink" role="alert">The analysis stopped: {error}. Reload the page to start again.</p>}

      {/* Guide */}
      <div className="pb-4">
        <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          {STEPS.map((s) => (
            <button key={s.key} type="button" className={`btn shrink-0 snap-start ${p.step === s.key ? "bg-wash" : ""}`} aria-pressed={p.step === s.key} onClick={() => runStep(s.key)}>
              <span className="text-ink-2">{s.key}</span> {s.text}
            </button>
          ))}
          <button type="button" className={`btn shrink-0 snap-start ${p.step === "free" ? "bg-wash" : ""}`} aria-pressed={p.step === "free"} onClick={() => runStep("free")}>Free play</button>
        </div>
        <p key={p.step} className="t-small mt-2 min-h-[1.45em] text-ink-2 motion-safe:animate-fade-in">{STEPS.find((s) => s.key === p.step)?.caption ?? "Set the building, the weather and the damage yourself."}</p>
      </div>

      <div className="grid border-t border-rule lg:grid-cols-[minmax(0,1fr)_22rem]">
        {/* Stage */}
        <div className="min-w-0 py-4 lg:pr-6">
          <div className="h-[clamp(18rem,55svh,30rem)] w-full lg:h-[clamp(20rem,calc(100svh-24rem),34rem)]">
            {webgl
              ? <Suspense fallback={<p className="t-small text-ink-2">Loading the 3D view…</p>}>
                  <Building3D b={b} dmg={dmg} picking={picking} tapFloor={tap.floor} motion={motion} still={REDUCED && showMode !== null ? cur.modes[showMode].phi : null} label={label}
                    onPick={(id) => { set({ dmg: id, step: "free" }); setPicking(false); }} onTapFloor={(f) => set({ tap: `${f}${tap.dir}` })} />
                </Suspense>
              : <p className="t-small text-ink-2">Your browser can’t show the 3D view; the sound, the spectrum and the monitoring still work.</p>}
          </div>
          {/* the sound bar */}
          {noAudio ? <p className="t-small mt-3 text-ink-2">Your browser can’t play sound here; the spectrum shows the chord.</p> : (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button type="button" className="btn btn-solid" onClick={doTap}>Tap</button>
              <div className="w-24"><Segmented label="Tap direction" value={tap.dir} onChange={(v) => set({ tap: `${tap.floor}${v}` })} options={[{ v: "x", text: "x" }, { v: "y", text: "y" }]} /></div>
              <span className="t-small text-ink-2">floor {tap.floor}</span>
              <button type="button" className="btn" onClick={doCompare}>Compare</button>
              <label className="t-small flex items-center gap-2 text-ink-2">Volume
                <input type="range" min={0} max={1} step={0.05} value={vol} onChange={(e) => setVol(Number(e.target.value))} className="w-24 accent-ink [@media(pointer:coarse)]:h-11" aria-label="Volume" />
              </label>
              <button type="button" className="btn" aria-pressed={muted} onClick={toggleMute}>{muted ? "Unmute" : "Mute"}</button>
              <Tip label="Compare">Healthy (2 s), then now (2 s), then both together (3 s). Where they differ you hear beats.</Tip>
              {muted && mutedNote && <span className="t-small text-ink-2">Sound is muted</span>}
            </div>
          )}
          <p className="t-small mt-2 text-ink">{change}</p>
          <p className="t-small mt-1 text-ink-2">Mode shapes enlarged (the roof moves H/30), illustrative. Click a floor to tap there.</p>
          <div className="mt-3"><Spectrum ref_={chordRef} cur={chordNow} playing={playing} K={K} /></div>
        </div>

        {/* Panel */}
        <div className="flex min-w-0 flex-col gap-4 border-t border-rule py-4 lg:border-l lg:border-t-0 lg:pl-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <Field label="Storeys"><Segmented label="Storeys" value={String(b.n)} onChange={(v) => set({ n: v, step: "free", dmg: "" })} options={[4, 5, 6, 7, 8].map((n) => ({ v: String(n), text: String(n) }))} /></Field>
            <Field label="Lateral system"><Segmented label="Lateral system" value={b.sys} onChange={(v) => set({ sys: v, step: "free", dmg: "" })} options={[{ v: "moment", text: "Moment frame" }, { v: "braced", text: "Braced core" }]} /></Field>
            <Field label="Temperature" value={`${p.T} °C`} htmlFor="bc-T"><input id="bc-T" type="range" min={-10} max={35} step={1} value={p.T} onChange={(e) => set({ T: e.target.value, step: "free" })} className="w-full accent-ink [@media(pointer:coarse)]:h-11" /></Field>
            <Field label="Occupancy" value={`${Math.round(100 * p.occ)} %`} htmlFor="bc-occ"><input id="bc-occ" type="range" min={0} max={1} step={0.05} value={p.occ} onChange={(e) => set({ occ: e.target.value, step: "free" })} className="w-full accent-ink [@media(pointer:coarse)]:h-11" /></Field>
          </div>
          <div className="flex flex-col gap-2 border-t border-rule pt-3">
            <Field label="Damage" htmlFor="bc-dmg">
              <select id="bc-dmg" value={dmg ? p.dmg : ""} onChange={(e) => set({ dmg: e.target.value, step: "free" })} className="t-data h-9 w-full rounded-[2px] border border-rule bg-transparent px-2 [@media(pointer:coarse)]:h-11">
                <option value="">None</option>
                {list.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </Field>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={`btn ${picking ? "btn-solid" : ""}`} aria-pressed={picking} onClick={() => setPicking((v) => !v)}>Pick in 3D</button>
              <button type="button" className="btn" disabled={!dmg} onClick={() => set({ dmg: "", step: "free" })}>Repair</button>
            </div>
            <Field label="Stiffness lost" value={`${Math.round(100 * p.d)} %`} htmlFor="bc-d"><input id="bc-d" type="range" min={0} max={0.9} step={0.05} value={p.d} disabled={!dmg} onChange={(e) => set({ d: e.target.value, step: "free" })} className="w-full accent-ink [@media(pointer:coarse)]:h-11" /></Field>
          </div>
          <table className="t-data w-full border-collapse text-left">
            <caption className="sr-only">Modes, tracked against the healthy reference</caption>
            <thead><tr className="border-b border-ink"><th scope="col" className="py-1 pr-2 font-[520]">Mode</th><th scope="col" className="py-1 pr-2 font-[520]">f, Hz</th><th scope="col" className="py-1 pr-2 font-[520]">Type</th><th scope="col" className="py-1 pr-2 font-[520]">Change</th><th scope="col"><span className="sr-only">Show</span></th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.i} className="border-b border-rule">
                  <td className="py-1 pr-2">{r.i + 1}</td>
                  <td className="py-1 pr-2">{r.f.toFixed(2)}</td>
                  <td className="py-1 pr-2">{r.type}</td>
                  <td className="py-1 pr-2">{r.mac < 0.8 ? <span title="mode identity uncertain">?</span> : `${r.change >= 0 ? "+" : "−"}${Math.abs(100 * r.change).toFixed(1)} %`}</td>
                  <td className="py-1 text-right"><button type="button" className="link t-small [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:px-2" aria-pressed={showMode === r.j} onClick={() => showOne(r.j)}>{showMode === r.j ? "Stop" : "Show"}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {tr.uncertain && <p className="t-small text-ink-2">?: mode identity uncertain (MAC below 0.8 against the healthy mode).</p>}
          <p className="sr-only" role="status" aria-live="polite">{said}</p>
        </div>
      </div>

      {/* Monitoring: the main point first (sideways vs. up), then the scores, residuals and what the code learned */}
      <div className="grid gap-x-8 gap-y-10 border-t border-rule pt-6 sm:grid-cols-2 lg:grid-cols-3">
        <Shift x={trained ? trained.calib.f1.map((f) => f / ref.modes[0].f - 1) : []} y={trained ? trained.calib.ae.map((v) => v / trained.aeThreshold) : []}
          current={now && trained ? [rows[0].change, now.ae / trained.aeThreshold] : null} reference={refScore && trained ? [0, refScore.ae / trained.aeThreshold] : null} />
        <div className="flex min-w-0 flex-col gap-4">
          <Health ae={now?.ae ?? null} msd={now?.msd ?? null} aeThr={trained?.aeThreshold ?? 1} msdThr={trained?.msdThreshold ?? 1} training={!trained} />
          <div>
            <p className="t-small text-ink-2">{trained ? `Trained on 1,000 healthy days in ${(trainMs / 1000).toFixed(1)} s (best of ${trained.history.length} epochs).` : `Training… epoch ${history.length ? history[history.length - 1].epoch : 0}`}</p>
            <Loss history={history} />
          </div>
        </div>
        <Residuals r={now?.residuals ?? null} />
        <Latent codes={trained?.latent ?? []} env={trained?.env ?? []} by={p.color as "temp" | "occ"} current={now?.latent ?? null} reference={refScore?.latent ?? null} onBy={(v) => set({ color: v })} />
      </div>
      <section className="mt-8 border-t border-rule pt-6" aria-labelledby="bc-test-h">
        <div className="flex flex-wrap items-center gap-3">
          <h3 id="bc-test-h" className="font-[520]">How good is it?</h3>
          <button type="button" className="btn" disabled={!trained || !dmg || testing} onClick={() => { setTesting(true); testFor.current = testKey; workerRef.current?.postMessage({ id: 2, type: "test", b, dmg, trained: trained!, seed: p.seed } satisfies MonitorIn); }}>
            {testing ? "Testing…" : "Test on 400 new days"}
          </button>
          {!dmg && <span className="t-small text-ink-2">Choose a damage first.</span>}
        </div>
        {testRes && testRes.key === testKey && (
          <div className="mt-3 overflow-x-auto">
            <table className="t-data w-full min-w-[24rem] border-collapse text-left">
              <caption className="sr-only">Detection on 200 damaged and 200 healthy new days</caption>
              <thead><tr className="border-b border-ink"><th scope="col" className="py-1 pr-3 font-[520]">Method</th><th scope="col" className="py-1 pr-3 font-[520]">Damaged days flagged</th><th scope="col" className="py-1 pr-3 font-[520]">Healthy days flagged (false alarms)</th></tr></thead>
              <tbody>
                <tr className="border-b border-rule"><td className="py-1 pr-3">Autoencoder</td><td className="py-1 pr-3">{testRes.r.damaged.ae}/{testRes.r.damaged.n} ({Math.round((100 * testRes.r.damaged.ae) / testRes.r.damaged.n)} %)</td><td className="py-1 pr-3">{testRes.r.healthy.ae}/{testRes.r.healthy.n}</td></tr>
                <tr className="border-b border-rule"><td className="py-1 pr-3">Mahalanobis</td><td className="py-1 pr-3">{testRes.r.damaged.md}/{testRes.r.damaged.n} ({Math.round((100 * testRes.r.damaged.md) / testRes.r.damaged.n)} %)</td><td className="py-1 pr-3">{testRes.r.healthy.md}/{testRes.r.healthy.n}</td></tr>
              </tbody>
            </table>
            <p className="t-small mt-2 text-ink-2">New days from the same weather and occupancy model, never used for training or the thresholds; {Math.round(testRes.ms)} ms on this device. Flagged under this simulation, not a diagnosis.</p>
          </div>
        )}
      </section>
    </ToolShell>
  );
};

export default BuildingChord;

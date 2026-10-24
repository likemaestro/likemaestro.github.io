import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import ToolShell from "../ToolShell";
import { useToolParams } from "../useToolParams";
import { Field, Segmented, Tip } from "../controls";
import { hasWebGL2, No3D } from "../three/support";
import { BEAMS, BUILDING, COLUMNS, CP_NET, feasible, massOf, MODEL, type Design, type Result } from "./frame";
import { createClient, type Client } from "./client";
import {
  incumbent, key, looStats, optimize, OUTS, predictDesign, sampleDesigns, verify,
  type GAOpts, type Out, type Outputs, type Round, type Sample, type Surrogate,
} from "./surrogate";
import { designName, Elevation, fmtOut, GaChart, LooChart, OUT_LABEL, RoundsTable } from "./Charts";
import type { GroupState } from "./Frame3D";

const Frame3D = lazy(() => import("./Frame3D"));

const SPEC = {
  qp: { kind: "num", min: 0.5, max: 1.5, step: 0.05, def: 0.9 },
  gk: { kind: "num", min: 2, max: 6, step: 0.5, def: 4 },
  qk: { kind: "num", min: 1.5, max: 5, step: 0.5, def: 3 },
  lim: { kind: "enum", values: ["300", "400", "500"], def: "300" },
  n: { kind: "num", min: 10, max: 50, step: 1, def: 24 },
  seed: { kind: "num", min: 1, max: 999999, step: 1, def: 7 },
  k: { kind: "num", min: 0, max: 3, step: 0.5, def: 2 },
  cL: { kind: "num", min: 0, max: 11, step: 1, def: 5 },
  cU: { kind: "num", min: 0, max: 11, step: 1, def: 2 },
  bm: { kind: "num", min: 0, max: 8, step: 1, def: 4 },
  step: { kind: "enum", values: ["explore", "optimized"], def: "explore" },
  pop: { kind: "num", min: 8, max: 80, step: 4, def: 24 },
  gens: { kind: "num", min: 10, max: 100, step: 5, def: 40 },
  pc: { kind: "num", min: 0, max: 1, step: 0.05, def: 0.9 },
  mut: { kind: "num", min: 0, max: 3, step: 0.5, def: 1 },
  etac: { kind: "num", min: 1, max: 30, step: 1, def: 3 },
  etam: { kind: "num", min: 1, max: 30, step: 1, def: 3 },
} as const;
const STEPS = ["Sample", "Train", "Explore", "Optimize", "Verify"];
const GROUP_NAME = ["Columns, storeys 1–3", "Columns, storeys 4–6", "Beams"];
const sec = (id: string) => id.replace(/^(HEB|IPE)/, "$1 ");

type Phase = "sampling" | "training" | "ready" | "verifying" | "error";

const SurrogateFrame: React.FC = () => {
  const { values: p, clamped, set } = useToolParams(SPEC);
  const loads = useMemo(() => ({ gk: p.gk, qk: p.qk, qp: p.qp }), [p.gk, p.qk, p.qp]);
  const lim = Number(p.lim), design: Design = useMemo(() => ({ cL: p.cL, cU: p.cU, bm: p.bm }), [p.cL, p.cU, p.bm]);
  const ga: GAOpts = useMemo(() => ({ pop: p.pop, gens: p.gens, pc: p.pc, mut: p.mut, etaC: p.etac, etaM: p.etam, seed: p.seed }), [p.pop, p.gens, p.pc, p.mut, p.etac, p.etam, p.seed]);
  const sampleKey = `${p.gk}|${p.qk}|${p.qp}|${p.n}|${p.seed}`, optKey = `${sampleKey}|${lim}|${p.k}|${JSON.stringify(ga)}`;

  const client = useRef<Client | null>(null);
  const [phase, setPhase] = useState<Phase>("sampling");
  const [error, setError] = useState("");
  const [strip, setStrip] = useState<(boolean | null)[]>([]);   // per initial run: FE-feasible or not, null = pending
  const [feMs, setFeMs] = useState<number[]>([]);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [surrogate, setSurrogate] = useState<Surrogate | null>(null);
  const [fitMs, setFitMs] = useState(0);
  const [check, setCheck] = useState<{ key: string; r: Result } | null>(null);
  const [opt, setOpt] = useState<{ key: string; best: Design | null; mass: number | null; history: (number | null)[]; ms: number } | null>(null);
  const [ver, setVer] = useState<{ key: string; rounds: Round[]; status: string; newRuns: number; accepted: Design | null } | null>(null);
  const [exh, setExh] = useState<{ loads: string; progress: number; id: number | null; out: Float64Array | null; ms: number } | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [deformed, setDeformed] = useState(false);
  const [said, setSaid] = useState("");
  const [showLoads, setShowLoads] = useState(false), [showAlgo, setShowAlgo] = useState(false);
  const busy = phase !== "ready";

  useEffect(() => {
    client.current = createClient((m) => { setError(m); setPhase("error"); });
    return () => { client.current?.terminate(); client.current = null; };
  }, []);

  // Sample and train, on first load and whenever the loads, N or the seed change
  useEffect(() => {
    const c = client.current;
    if (!c) return;
    let live = true;
    const designs = sampleDesigns(p.n, p.seed);
    setPhase("sampling"); setStrip(designs.map(() => null)); setFeMs([]); setSamples([]); setSurrogate(null); setCheck(null); setVer(null);
    setSaid(`Running ${p.n} frame analyses.`);
    const run = c.fe(designs, loads, (i, _d, r, ms) => {
      if (!live) return;
      setStrip((s) => s.map((v, k) => (k === i ? feasible(r, lim) : v)));
      setFeMs((t) => [...t, ms]);
    });
    run.promise.then(async (outs) => {
      if (!live || outs.length < designs.length) return;
      const S = designs.map((d, i) => ({ d, r: outs[i] }));
      setSamples(S); setPhase("training");
      const f = await c.fit(S, p.seed);
      if (!live) return;
      setSurrogate(f.surrogate); setFitMs(f.ms); setPhase("ready");
      const st = looStats(f.surrogate), worst = Math.min(...OUTS.map((o) => st[o].r2));
      setSaid(`Training done: ${S.length} runs; leave-one-out R² at least ${worst.toFixed(2)}.`);
    });
    return () => { live = false; c.cancel(run.id); };
  }, [sampleKey]);   // eslint-disable-line react-hooks/exhaustive-deps

  const stats = useMemo(() => (surrogate ? looStats(surrogate) : null), [surrogate]);
  const minR2 = stats ? Math.min(...OUTS.map((o) => stats[o].r2)) : NaN, maxErr = stats ? Math.max(...OUTS.map((o) => stats[o].worst)) : NaN;
  const pred = useMemo(() => (surrogate ? predictDesign(surrogate, design) : null), [surrogate, design]);
  const fe = check && check.key === `${sampleKey}|${key(design)}` ? check.r : null;
  const known = useMemo(() => new Map(samples.map((s) => [key(s.d), s.r])), [samples]);
  // a training or verification run of this design is FE too
  const rounds = ver && ver.key.startsWith(sampleKey) ? ver.rounds : [];
  const trained = known.get(key(design)) ?? null, verified = rounds.find((r) => key(r.d) === key(design))?.fe ?? null;
  const feOut: Outputs | null = fe ?? trained ?? verified;
  const mass = massOf(design);
  const accepted = ver && ver.key === optKey && ver.accepted && key(ver.accepted) === key(design);

  // group states for the colors: FE when known, else the GP band
  const groups = useMemo((): [GroupState, GroupState, GroupState] => (["uCL", "uCU", "uB"] as const).map((o) => {
    if (feOut) return { util: feOut[o], state: feOut[o] > 1 ? "over" : "ok" };
    if (!pred) return { util: 0, state: "ok" };
    const b = pred[o];
    return { util: b.mu, state: b.mu > 1 ? "over" : b.hi >= 1 ? "unsure" : "ok" };
  }) as [GroupState, GroupState, GroupState], [feOut, pred]);

  const checkFE = () => {
    const c = client.current;
    if (!c) return;
    c.fe([design], loads, (_i, _d, r, _ms, full) => {
      if (!full) return;
      setCheck({ key: `${sampleKey}|${key(design)}`, r: full });
      const e = pred ? (full.drift / pred.drift.mu - 1) : 0;
      setSaid(`FE: drift 1 in ${Math.round(1 / r.drift)}, largest utilization ${Math.max(r.uCL, r.uCU, r.uB).toFixed(2)}${pred ? `; the GP's drift was ${Math.abs(Math.round(100 * e))} % ${e > 0 ? "low" : "high"}` : ""}.`);
    }, true);
  };

  const runOptimize = () => {
    if (!surrogate) return;
    const t0 = performance.now(), o = optimize(surrogate, lim, p.k, ga, known), ms = performance.now() - t0;
    setOpt({ key: optKey, ...o, ms });
    if (o.best) { set({ cL: o.best.cL, cU: o.best.cU, bm: o.best.bm, step: "optimized" }); setSaid(`Optimize: the GA proposes ${designName(o.best)}, ${o.mass!.toFixed(1)} t, predicted feasible.`); }
    else setSaid("Optimize: no design the surrogate calls feasible.");
  };
  // a new caution, limit or GA setting re-runs Optimize if it was done; Verify then needs a new run
  const optDone = opt !== null && opt.key.startsWith(sampleKey);
  useEffect(() => { if (optDone && opt!.key !== optKey && phase === "ready") runOptimize(); }, [optKey]);   // eslint-disable-line react-hooks/exhaustive-deps

  const runVerify = async () => {
    const c = client.current;
    if (!c || !surrogate) return;
    setPhase("verifying");
    const rounds: Round[] = [];
    setVer({ key: optKey, rounds: [], status: "running", newRuns: 0, accepted: null });
    const v = await verify({
      samples, surrogate, lim, k: p.k, ga,
      fe: (d) => c.fe([d], loads).promise.then((r) => r[0]),
      refit: (S) => c.fit(S, p.seed).then((r) => r.surrogate),
      onRound: (r) => { rounds.push(r); setVer({ key: optKey, rounds: rounds.slice(), status: "running", newRuns: 0, accepted: null }); },
    });
    setSamples(v.samples); setSurrogate(v.surrogate);
    setVer({ key: optKey, rounds: v.rounds, status: v.status, newRuns: v.newRuns, accepted: v.accepted });
    setOpt((o) => (o ? { ...o, key: optKey } : o));
    if (v.accepted) set({ cL: v.accepted.cL, cU: v.accepted.cU, bm: v.accepted.bm, step: "optimized" });
    setPhase("ready");
    setSaid(v.status === "accepted" ? `Verified: ${designName(v.accepted!)}, ${massOf(v.accepted!).toFixed(1)} t, feasible by FE after ${v.rounds.length} round${v.rounds.length > 1 ? "s" : ""}.`
      : v.status === "no feasible" ? "No design the surrogate calls feasible." : "Not verified after 10 rounds: the surrogate can’t model this region well. Add more samples.");
  };

  const loadsKey = `${p.gk}|${p.qk}|${p.qp}`;
  const exhNow = exh && exh.loads === loadsKey ? exh : null;
  const runExhaustive = () => {
    const c = client.current;
    if (!c) return;
    const job = c.exhaustive(loads, (done, total) => setExh((e) => (e && e.id === job.id ? { ...e, progress: done / total } : e)));
    setExh({ loads: loadsKey, progress: 0, id: job.id, out: null, ms: 0 });
    job.promise.then((r) => {
      setExh((e) => (e && e.id === job.id ? (r ? { ...e, id: null, progress: 1, out: r.out, ms: r.ms } : null) : e));
      if (r) setSaid(`Exhaustive FE done: 1,296 designs in ${(r.ms / 1000).toFixed(0)} s.`);
    });
  };
  const exhOpt = useMemo(() => {
    if (!exhNow?.out) return null;
    let best: { d: Design; mass: number } | null = null, n = 0;
    for (let a = 0, k = 0; a < COLUMNS.length; a++) for (let b = 0; b < COLUMNS.length; b++) for (let c = 0; c < BEAMS.length; c++, k++) {
      const o = exhNow.out.subarray(6 * k, 6 * k + 6), r = { drift: o[0], uCL: o[1], uCU: o[2], uB: o[3], acr: o[4] };
      if (feasible(r, lim)) { n++; if (!best || o[5] < best.mass) best = { d: { cL: a, cU: b, bm: c }, mass: o[5] }; }
    }
    return { best, n };
  }, [exhNow?.out, lim]);   // eslint-disable-line react-hooks/exhaustive-deps

  const feRuns = samples.length > 0 ? p.n + (ver && ver.key === optKey ? ver.newRuns : 0) : 0;
  const msPer = feMs.length ? feMs.reduce((a, b) => a + b, 0) / feMs.length : 0;
  const inc = incumbent([...samples, ...(ver?.rounds ?? []).map((r) => ({ d: r.d, r: r.fe }))], lim);   // every FE run of the workflow
  const verifiedMass = ver && ver.key === optKey && ver.accepted ? massOf(ver.accepted) : null;
  const done = [samples.length > 0, !!surrogate, !!surrogate, optDone, !!ver && ver.key === optKey && ver.status !== "running"];
  const current = phase === "sampling" ? 0 : phase === "training" ? 1 : phase === "verifying" ? 4 : optDone ? (done[4] ? 4 : 3) : 2;

  const source: "FE" | "GP" = feOut ? "FE" : "GP";
  const band = (o: Out) => (pred ? `${fmtOut(o, pred[o].mu)} (${fmtOut(o, o === "drift" ? pred[o].hi : pred[o].lo)} to ${fmtOut(o, o === "drift" ? pred[o].lo : pred[o].hi)})` : "–");
  const limitOf = (o: Out) => (o === "drift" ? 1 / lim : o === "acr" ? 3 : 1);
  const passes = (o: Out, v: number) => (o === "acr" ? v >= 3 : v <= limitOf(o));
  const gpErr = (o: Out) => (fe && pred ? fe[o] / pred[o].mu - 1 : null);
  const status = accepted ? "FE-verified optimum" : feOut ? "Computed by FE" : "Estimated by the GP";
  const caption = !pred && !feOut ? "Training the surrogate…"
    : feOut ? `${status}${!fe ? (trained ? " (a training run)" : " (a verification run)") : ""}. Drift 1/${Math.round(1 / feOut.drift)}; largest utilization ${Math.max(feOut.uCL, feOut.uCU, feOut.uB).toFixed(2)}; αcr ${feOut.acr.toFixed(1)}. Mass ${mass.toFixed(1)} t.`
    : `${status} (${samples.length} FE runs). Drift 1/${Math.round(1 / pred!.drift.mu)} (1/${Math.round(1 / pred!.drift.hi)} to 1/${Math.round(1 / pred!.drift.lo)}). Mass ${mass.toFixed(1)} t.`;
  const label = `Six-storey steel frame. Lower columns ${sec(COLUMNS[design.cL])}, upper columns ${sec(COLUMNS[design.cU])}, beams ${sec(BEAMS[design.bm])}. ${feOut ? `FE drift 1 in ${Math.round(1 / feOut.drift)}` : pred ? `Predicted drift 1 in ${Math.round(1 / pred.drift.mu)}` : ""}; ${groups.map((g, i) => (g.state === "ok" ? "" : `${GROUP_NAME[i].toLowerCase()} ${g.state}`)).filter(Boolean).join(", ") || "all groups within their limits"}; mass ${mass.toFixed(1)} tonnes.`;
  const windForces = Array.from({ length: BUILDING.storeys }, (_, k) => CP_NET * p.qp * 18 * (k < BUILDING.storeys - 1 ? 3.6 : 1.8));
  const webgl = useMemo(() => hasWebGL2(), []);
  const greyCss = (g: number) => { const u = Math.min(1, groups[g].util), c = [0x81, 0x91, 0x99].map((v, i) => Math.round(v + ([0x17, 0x20, 0x27][i] - v) * u)); return groups[g].state === "over" ? "#172027" : `rgb(${c.join(",")})`; };

  const legend = (
    <>
      <div className="t-small pointer-events-none flex flex-col gap-1 bg-canvas/90 p-2 text-ink-2 sm:absolute sm:left-0 sm:top-0 max-sm:mt-2 max-sm:p-0">
        <span className="flex items-center gap-2">Utilization 0 <span className="inline-block h-2 w-14" style={{ background: "linear-gradient(90deg, #819199, #172027)" }} /> 1</span>
        <span className="flex items-center gap-2"><span className="inline-block h-3 w-5 border border-ink" style={{ background: "repeating-linear-gradient(135deg, #819199 0 3px, #172027 3px 5px)" }} /> Unsure: the band crosses 1</span>
        <span className="flex items-center gap-2"><span className="inline-block h-3 w-5 border border-ink" style={{ background: "repeating-linear-gradient(135deg, #172027 0 3px, #CBD2D5 3px 5px)" }} /> Over 1</span>
      </div>
      <span className="t-small pointer-events-none block text-ink-2 sm:absolute sm:bottom-1 sm:left-0">Wind on the long face, qp {p.qp.toFixed(2)} kN/m²</span>
    </>
  );

  const slider = (k: "n" | "pop" | "gens" | "pc" | "mut" | "etac" | "etam" | "gk" | "qk" | "qp", label: string, fmt: (v: number) => string) => {
    const f = SPEC[k];
    return (
      <Field label={label} value={fmt(p[k] as number)} htmlFor={`sf-${k}`}>
        <input id={`sf-${k}`} type="range" min={f.min} max={f.max} step={f.step} value={p[k] as number} disabled={busy} onChange={(e) => set({ [k]: e.target.value })} className="w-full accent-ink [@media(pointer:coarse)]:h-11" />
      </Field>
    );
  };

  return (
    <ToolShell
      path="/tools/surrogate-frame"
      slug="surrogate-frame"
      methodRef={{ label: "Jin 2011", href: "https://doi.org/10.1016/j.swevo.2011.05.001" }}
      method={<>
        <p>A Latin hypercube picks N frame designs; each is analysed with a linear 3D frame model: 12-degree-of-freedom beam elements, rigid floors, fixed bases, the EN 1990 combinations 6.10 with the recommended factors, sway imperfections (EN 1993-1-1, 5.3.2), Horne’s αcr with sway amplification (5.2.2) and simplified member screens.</p>
        <p>A Gaussian process per output (drift, utilization of three member groups, αcr; Matérn 5/2 with one length scale per variable) is fitted to these runs by maximizing the marginal likelihood. Its accuracy is measured by leave-one-out with the same hyperparameters.</p>
        <p>A genetic algorithm then minimizes steel mass on the surrogate, keeping k standard deviations away from every limit, and the frame model checks the answer; a failed check joins the training set and the search runs again (surrogate-assisted evolutionary design, Jin 2011; Forrester et al. 2008). The exhaustive search analyses all 1,296 catalog designs as the honest baseline.</p>
        <p>This is the workflow I use in my research: surrogates trained on expensive analyses, searched by an optimizer and checked by the full model.</p>
      </>}
      limits={<>
        <p>A teaching model, not a design tool: one wind direction (on the 18 m face) with a simplified net pressure coefficient of 1.3, rigid floors, fixed bases, no connection design, no checks of the floor beams’ lateral stability (the slab is assumed to hold them), S355 with γM0 = γM1 = 1.0.</p>
        <p>The column check N/(χmin Npl) + My/Mpl,y + Mz/Mpl,z with a storey-height buckling length is a simplified screen, not the EN 1993-1-1 interaction formula. Beams are checked for bending and shear separately. αcr comes from Horne’s storey method in both directions; amplification applies to the sway effects only.</p>
        <p>The drift limits h/300, h/400 and h/500 are illustrative screening limits. The ±2σ bands are model-based intervals of the surrogate, not probabilities of meeting a code; k = 2 is not a 98 % reliability. The exhaustive optimum is exact only within this catalog and this simplified model.</p>
        <p>Loads are stated assumptions you can change. Hand check before publication: the default design against a commercial frame program.</p>
      </>}
    >
      {clamped.length > 0 && <p className="t-small mb-4 text-ink-2">Some link settings were out of range and have been adjusted: {clamped.join(", ")}.</p>}
      {error && <p className="t-small mb-4 text-ink" role="alert">The analysis stopped: {error}. Reload the page to start again.</p>}

      {/* Workflow */}
      <div className="flex flex-wrap items-center gap-2 pb-3">
        <ol className="flex flex-wrap gap-2" aria-label="Workflow">
          {STEPS.map((s, i) => (
            <li key={s} className={`btn pointer-events-none gap-1.5 ${i === current ? "btn-solid" : ""}`} aria-current={i === current ? "step" : undefined}>
              <span className={i === current ? "" : "text-ink-2"}>{i + 1}</span> {s}
              {done[i] && i !== current && <svg viewBox="0 0 16 16" aria-label="done" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 8.5 6.5 12 13 4.5" /></svg>}
            </li>
          ))}
        </ol>
        <p className="t-small text-ink-2 sm:ml-3">
          FE runs: {phase === "sampling" ? `${strip.filter((s) => s !== null).length} / ${p.n}` : feRuns}
          {stats && <> · GP accuracy (leave-one-out): R² {minR2.toFixed(2)} or better, worst {Math.round(100 * maxErr)} %</>}
          {stats && !OUTS.every((o) => stats[o].ok) && <> · <span className="text-ink">accuracy insufficient for some outputs: add samples</span></>}
        </p>
      </div>
      {/* the run strip: one dot per sample, filled when FE says feasible */}
      <div className="flex flex-wrap gap-1 pb-4" aria-hidden="true">
        {strip.map((s, i) => <span key={i} className={`h-2 w-2 rounded-full border border-ink motion-safe:animate-fade-in ${s === null ? "border-rule" : s ? "bg-ink" : ""}`} />)}
      </div>

      {/* Settings */}
      <div className="grid gap-x-6 gap-y-3 border-t border-rule py-4 sm:flex sm:flex-wrap sm:items-end">
        <div className="sm:w-40">{slider("n", "FE samples", String)}</div>
        <div className="flex items-end gap-2">
          <Field label="Seed" htmlFor="sf-seed">
            <input id="sf-seed" type="number" inputMode="numeric" min={1} value={p.seed} disabled={busy} onChange={(e) => e.target.value && set({ seed: e.target.value })}
              className="t-data h-9 w-24 rounded-[2px] border border-rule bg-transparent px-2 [@media(pointer:coarse)]:h-11" />
          </Field>
          <button type="button" className="btn" disabled={busy} onClick={() => set({ seed: 1 + Math.floor(Math.random() * 999998) })}>New</button>
        </div>
        <div className="sm:w-48">{slider("qp", "Wind, qp", (v) => `${v.toFixed(2)} kN/m²`)}</div>
        <div className="sm:w-52"><Field label="Drift limit"><Segmented label="Drift limit" value={p.lim} onChange={(v) => set({ lim: v })} options={["300", "400", "500"].map((v) => ({ v, text: `h/${v}` }))} /></Field></div>
        <button type="button" className="btn gap-1.5" aria-expanded={showLoads} onClick={() => setShowLoads((v) => !v)}>Loads</button>
        <button type="button" className="btn gap-1.5" aria-expanded={showAlgo} onClick={() => setShowAlgo((v) => !v)}>Algorithm</button>
      </div>
      {showLoads && <div className="grid gap-x-8 gap-y-4 border-t border-rule py-4 sm:grid-cols-3">
        {slider("gk", "Dead load gk (slab, finishes)", (v) => `${v.toFixed(1)} kN/m²`)}
        {slider("qk", "Imposed load qk (offices)", (v) => `${v.toFixed(1)} kN/m²`)}
        <p className="t-small text-ink-2">One-way slabs span 6 m onto the beams in y; the roof carries gk only; steel self-weight added. Changing a load starts over with new FE runs.</p>
      </div>}
      {showAlgo && <div className="grid gap-x-8 gap-y-4 border-t border-rule py-4 sm:grid-cols-3 xl:grid-cols-6">
        {slider("pop", "Population", String)}
        {slider("gens", "Generations", String)}
        {slider("pc", "Crossover probability", (v) => v.toFixed(2))}
        {slider("mut", "Mutated sections per child", (v) => v.toFixed(1))}
        {slider("etac", "Crossover index ηc", String)}
        {slider("etam", "Mutation index ηm", String)}
      </div>}

      <div className="grid border-t border-rule lg:grid-cols-[minmax(0,1fr)_21rem]">
        {/* Stage */}
        <div className="min-w-0 py-4 lg:pr-6">
          <div className="relative h-[clamp(18rem,55svh,30rem)] w-full lg:h-[clamp(20rem,calc(100svh-22rem),36rem)]">
            {webgl
              ? <Suspense fallback={<p className="t-small text-ink-2">Loading the 3D view…</p>}>
                  <Frame3D design={design} groups={groups} memberUtil={fe?.util ?? null} disp={fe?.disp ?? null} deformed={deformed && !!fe}
                    windForces={windForces} picked={picked} onPick={setPicked} label={label} />
                </Suspense>
              : <No3D><Elevation grey={greyCss} hatch={(g) => groups[g].state !== "ok"} /></No3D>}
            <div className="max-sm:hidden">{legend}</div>
          </div>
          <div className="sm:hidden">{legend}</div>
          <p className="t-small mt-2 text-ink">{caption}</p>
          {fe && <label className="t-small mt-1 flex items-center gap-2 text-ink-2">
            <input type="checkbox" checked={deformed} onChange={(e) => setDeformed(e.target.checked)} className="accent-ink" />
            Deformed (FE){deformed ? `: × ${Math.round((BUILDING.storeys * BUILDING.h) / 40 / Math.max(1e-9, ...Array.from({ length: fe.disp.length / 6 }, (_, i) => Math.hypot(fe.disp[6 * i], fe.disp[6 * i + 1]))))}, illustrative, characteristic wind` : ""}
          </label>}
        </div>

        {/* Panel */}
        <div className="flex min-w-0 flex-col gap-4 border-t border-rule py-4 lg:border-l lg:border-t-0 lg:pl-6">
          {picked !== null && (() => {
            const m = MODEL.members[picked], g = m.group, id = g === 2 ? BEAMS[design.bm] : COLUMNS[g === 0 ? design.cL : design.cU];
            const u = fe ? fe.util[picked] : groups[g].util;
            return <div className="t-small border border-rule p-2">
              <p className="text-ink">{GROUP_NAME[g]}, {m.kind === "col" ? `storey ${m.level}` : `level ${m.level}, along ${m.kind === "bx" ? "x" : "y"}`}: {sec(id)}</p>
              <p className="text-ink-2">Utilization {u.toFixed(2)} {fe ? "(FE, this member)" : "(GP, the group’s largest)"}</p>
            </div>;
          })()}
          <div className="flex flex-col gap-3">
            <Field label="Columns, storeys 1–3" value={sec(COLUMNS[design.cL])} htmlFor="sf-cL"><input id="sf-cL" type="range" min={0} max={11} step={1} value={design.cL} onChange={(e) => set({ cL: e.target.value, step: "explore" })} className="w-full accent-ink [@media(pointer:coarse)]:h-11" /></Field>
            <Field label="Columns, storeys 4–6" value={sec(COLUMNS[design.cU])} htmlFor="sf-cU"><input id="sf-cU" type="range" min={0} max={11} step={1} value={design.cU} onChange={(e) => set({ cU: e.target.value, step: "explore" })} className="w-full accent-ink [@media(pointer:coarse)]:h-11" /></Field>
            <Field label="Beams" value={sec(BEAMS[design.bm])} htmlFor="sf-bm"><input id="sf-bm" type="range" min={0} max={8} step={1} value={design.bm} onChange={(e) => set({ bm: e.target.value, step: "explore" })} className="w-full accent-ink [@media(pointer:coarse)]:h-11" /></Field>
          </div>
          <table className="t-data w-full border-collapse text-left">
            <caption className="sr-only">Results for the current design</caption>
            <tbody>
              <tr className="border-b border-rule"><th scope="row" className="py-1 pr-2 font-normal text-ink-2">Mass</th><td className="py-1">{mass.toFixed(1)} t</td><td className="py-1 text-right"><span className="t-small border border-rule px-1">exact</span></td></tr>
              {OUTS.map((o) => {
                const v = feOut ? feOut[o] : pred?.[o].mu, e = gpErr(o);
                return <tr key={o} className="border-b border-rule">
                  <th scope="row" className="py-1 pr-2 font-normal text-ink-2">{o === "drift" ? "Drift" : o === "acr" ? "αcr" : OUT_LABEL[o]}</th>
                  <td className={`py-1 ${v !== undefined && !passes(o, v) ? "font-[600] text-ink" : ""}`}>
                    {feOut ? fmtOut(o, feOut[o]) : band(o)}
                    {e !== null && Math.abs(e) > 0.005 && <span className="t-small text-ink-2"> · GP {Math.abs(Math.round(100 * e))} % {e > 0 ? "low" : "high"}</span>}
                  </td>
                  <td className="py-1 text-right"><span className="t-small border border-rule px-1">{source}</span></td>
                </tr>;
              })}
            </tbody>
          </table>
          <p className="t-small text-ink-2">{feOut ? (feasible(feOut, lim) ? `Feasible by FE for h/${lim}.` : `Not feasible by FE for h/${lim}.`) : "GP: μ (μ ± 2σ). A band that crosses a limit is unsure."}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn" disabled={busy} onClick={checkFE}>Check with FE</button>
            <Tip label="Check with FE">One frame analysis of this design. It is not added to the training set, so you can compare the GP with FE without changing the surrogate.</Tip>
            <button type="button" className="btn btn-solid" disabled={busy || !surrogate} onClick={runOptimize}>Optimize</button>
            <button type="button" className="btn" disabled={busy || !optDone} onClick={runVerify}>Verify</button>
          </div>
          <Field label="Caution k" value={p.k.toFixed(1)} htmlFor="sf-k">
            <div className="flex items-center gap-2">
              <input id="sf-k" type="range" min={0} max={3} step={0.5} value={p.k} onChange={(e) => set({ k: e.target.value })} className="w-full accent-ink [@media(pointer:coarse)]:h-11" />
              <Tip label="caution">Margin from surrogate constraints, expressed in GP standard deviations; this is not a failure probability.</Tip>
            </div>
          </Field>
          <div className="border-t border-rule pt-3">
            {exhNow?.id ? <div className="flex items-center gap-3">
              <div role="progressbar" aria-label="Exhaustive FE" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(100 * exhNow.progress)} className="h-2 flex-1 border border-ink"><div className="h-full bg-ink" style={{ width: `${100 * exhNow.progress}%` }} /></div>
              <button type="button" className="btn" onClick={() => { client.current?.cancel(exhNow.id!); setExh(null); }}>Cancel</button>
            </div> : <button type="button" className="btn" disabled={busy || !msPer} onClick={runExhaustive}>Exhaustive FE{msPer ? ` (about ${Math.max(1, Math.round((msPer * 1296) / 1000))} s)` : ""}</button>}
            <p className="t-small mt-2 text-ink-2">All 1,296 catalog designs by FE: the true optimum of this model, and the cost the surrogate saves.</p>
          </div>
          {opt && opt.key === optKey && !opt.best && <p className="t-small text-ink">No design the surrogate calls feasible for these loads and limits. That is no proof none exists: the exhaustive FE search settles it.</p>}
          <p className="sr-only" role="status" aria-live="polite">{said}</p>
        </div>
      </div>

      {/* Evidence */}
      <div className="grid gap-x-8 gap-y-10 border-t border-rule pt-6 sm:grid-cols-2 lg:grid-cols-3">
        <LooChart loo={stats} />
        <GaChart history={opt && opt.key === optKey ? opt.history : null} />
        <div className="flex min-w-0 flex-col gap-4">
          <RoundsTable rounds={ver?.rounds ?? []} outdated={!!ver && ver.key !== optKey} exhaustive={exhOpt?.best ?? null} lim={lim} />
          {(verifiedMass !== null || exhOpt) && <p className="t-small text-ink">
            {verifiedMass !== null && `Surrogate: ${feRuns} FE runs, ${verifiedMass.toFixed(1)} t (FE-verified).`}
            {exhOpt && exhNow && ` Exhaustive FE: 1,296 runs, ${exhOpt.best ? `${exhOpt.best.mass.toFixed(1)} t` : "no feasible design"}, ${(exhNow.ms / 1000).toFixed(0)} s on this device.`}
            {verifiedMass !== null && exhOpt?.best && ` The surrogate's design is ${(100 * (verifiedMass / exhOpt.best.mass - 1)).toFixed(1)} % heavier.`}
          </p>}
          {inc && <p className="t-small text-ink-2">Lightest FE-feasible design among the runs so far: {designName(inc.d)}, {inc.r.mass.toFixed(1)} t.</p>}
          {opt && opt.key === optKey && <p className="t-small text-ink-2">The GA evaluated {ga.pop * (ga.gens + 1)} designs on the surrogate in {Math.round(opt.ms)} ms; GP fit {Math.round(fitMs)} ms; one FE run {msPer.toFixed(0)} ms on this device.</p>}
          {ver && ver.key === optKey && ver.rounds.some((r) => r.ok && r.error > 0.1) && <p className="t-small text-ink-2">The surrogate missed the accepted design by more than 10 %; that run joined the training set.</p>}
        </div>
      </div>
    </ToolShell>
  );
};

export default SurrogateFrame;

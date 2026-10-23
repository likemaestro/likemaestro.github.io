import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ToolShell from "../ToolShell";
import { useToolParams } from "../useToolParams";
import { Field, Segmented } from "../controls";
import { MathML, Trace } from "../../lab/readout";
import { download } from "../../lab/export";
import { normalize, rank, relink, type Method } from "../mcdm";
import { createNSGA2, hv3, paretoSet, type Ind } from "./ga";
import { analyse, bounds, genes, LAYOUTS, SECTIONS, type Analysis, type Layout } from "./truss";

const SPEC = {
  layout: { kind: "enum", values: ["bridge", "cantilever"], def: "bridge" },
  load: { kind: "num", min: 20, max: 400, step: 10, def: 100 },
  pop: { kind: "num", min: 20, max: 200, step: 4, def: 80 },
  gens: { kind: "num", min: 20, max: 400, step: 10, def: 150 },
  pc: { kind: "num", min: 0, max: 1, step: 0.05, def: 0.9 },
  mut: { kind: "num", min: 0, max: 4, step: 0.5, def: 1 },
  etac: { kind: "num", min: 1, max: 30, step: 1, def: 3 },
  etam: { kind: "num", min: 1, max: 30, step: 1, def: 3 },
  seed: { kind: "num", min: 1, max: 999999, step: 1, def: 7 },
  mcdm: { kind: "enum", values: ["topsis", "vikor"], def: "topsis" },
  wm: { kind: "num", min: 0, max: 1, step: 0.01, def: 0.34 },
  wd: { kind: "num", min: 0, max: 1, step: 0.01, def: 0.33 },
  ws: { kind: "num", min: 0, max: 1, step: 0.01, def: 0.33 },
} as const;
const WEIGHTS = ["wm", "wd", "ws"] as const;
const METHOD_NAME: Record<Method, string> = { topsis: "TOPSIS", vikor: "VIKOR" };
const CRITERIA = [["wm", "Low steel mass"], ["wd", "Small deflection"], ["ws", "Few different sections"]] as const;
const REDUCED = typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

type Mode = "running" | "paused" | "done";
interface Run { ga: ReturnType<typeof createNSGA2>; hv: number[]; raf: number; gens: number; norm: (f: number[]) => number[] }
interface Snap { gen: number; evaluations: number; pop: Ind[]; hv: number[] }

const snapOf = (run: Run): Snap => ({ gen: run.ga.state.gen, evaluations: run.ga.state.evaluations, pop: run.ga.state.pop, hv: run.hv.slice() });
const record = (run: Run) => run.hv.push(hv3(paretoSet(run.ga.state.pop).map((q) => run.norm(q.f)), [1, 1, 1]));
const key = (x: number[]) => x.map((v) => v.toString(36)).join("");
const kg = (v: number) => `${Math.round(v).toLocaleString("en")} kg`;
const mm = (v: number) => `${v < 10 ? v.toFixed(1) : Math.round(v)} mm`;
const lengthOf = (L: Layout) => Math.max(...L.nodes.map((n) => n[0])) - Math.min(...L.nodes.map((n) => n[0]));
function ticks(lo: number, hi: number, n = 5) {
  const raw = (hi - lo) / n, mag = 10 ** Math.floor(Math.log10(raw)), step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw)!;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(Number(v.toPrecision(12)));
  return out;
}
// utilization as a grey: 0 → steel, 1 → ink (the site keeps orange for the selected mark)
const grey = (u: number) => {
  const t = Math.min(1, Math.max(0, u)), a = [0x81, 0x91, 0x99], b = [0x17, 0x20, 0x27];
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(",")})`;
};
/** Size of an element in CSS pixels, so charts draw at their real size and text stays the page's size. */
function useBox<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBox({ w: Math.round(e.contentRect.width), h: Math.round(e.contentRect.height) }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, box] as const;
}

const FORMULATION = `<math displaystyle="true"><munder><mo movablelimits="false">min</mo><mrow><mi>x</mi><mo>∈</mo><msup><mi>S</mi><mi>n</mi></msup></mrow></munder><mspace width="0.3em"></mspace><mo>(</mo><mi>m</mi><mo>,</mo><mspace width="0.3em"></mspace><msub><mi>δ</mi><mtext>max</mtext></msub><mo>,</mo><mspace width="0.3em"></mspace><msub><mi>n</mi><mtext>s</mtext></msub><mo>)</mo></math>`;
const SUBJECT = `<math><mtext>subject to</mtext><mspace width="0.5em"></mspace><msub><mi>N</mi><mrow><mtext>Ed</mtext><mo>,</mo><mi>i</mi></mrow></msub><mo>≤</mo><msub><mi>N</mi><mrow><mtext>Rd</mtext><mo>,</mo><mi>i</mi></mrow></msub></math>`;

// The front: steel mass across, largest deflection up, in the property map's style. The picked design is orange; the
// front designs with as many different sections as it are filled.
const FrontChart: React.FC<{ snap: Snap; front: Ind[]; sel?: Ind; W: number; H: number; mini?: boolean }> = ({ snap, front, sel, W, H, mini }) => {
  const M = mini ? { l: 10, r: 10, t: 10, b: 10 } : { l: 56, r: 16, t: 16, b: 46 };
  const feas = snap.pop.filter((p) => p.cv === 0), base = feas.length ? feas : snap.pop;
  const ext = (k: number) => { const v = base.map((p) => p.f[k]); const lo = Math.min(...v), hi = Math.max(...v), pad = (hi - lo) * 0.05 || 1; return [Math.max(0, lo - pad), hi + pad]; };
  const [x0, x1] = ext(0), [y0, y1] = ext(1);
  const sx = (v: number) => M.l + ((v - x0) / (x1 - x0)) * (W - M.l - M.r), sy = (v: number) => H - M.b - ((v - y0) / (y1 - y0)) * (H - M.t - M.b);
  const inside = (p: Ind) => p.f[0] >= x0 && p.f[0] <= x1 && p.f[1] >= y0 && p.f[1] <= y1;
  const onFront = new Set(front);
  if (!(W > 0 && H > 0)) return null;

  if (mini) return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block w-full text-ink" aria-hidden="true">
      <g stroke="#CBD2D5"><line x1={M.l} x2={W - M.r} y1={H - M.b} y2={H - M.b} /><line x1={M.l} x2={M.l} y1={M.t} y2={H - M.b} /></g>
      <g fill="currentColor">{front.map((p) => <circle key={key(p.x)} cx={sx(p.f[0])} cy={sy(p.f[1])} r={2.2} />)}</g>
      {sel && <circle cx={sx(sel.f[0])} cy={sy(sel.f[1])} r={3.6} fill="#F05A24" stroke="#172027" strokeWidth="1" />}
    </svg>
  );
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block text-ink" role="img"
      aria-label={`Pareto front, generation ${snap.gen}: ${front.length} designs, steel mass across, deflection up.${sel ? ` The picked design weighs ${kg(sel.f[0])} and deflects ${mm(sel.f[1])}.` : ""}`}>
      <g className="text-rule" stroke="currentColor"><line x1={M.l} x2={W - M.r} y1={H - M.b} y2={H - M.b} /><line x1={M.l} x2={M.l} y1={M.t} y2={H - M.b} /></g>
      <g className="fill-ink-2" fontSize="12">
        {ticks(x0, x1, Math.max(3, Math.round(W / 150))).map((v) => <text key={v} x={sx(v)} y={H - M.b + 18} textAnchor="middle">{v.toLocaleString("en")}</text>)}
        {ticks(y0, y1, Math.max(3, Math.round(H / 80))).map((v) => <text key={v} x={M.l - 8} y={sy(v) + 4} textAnchor="end">{v}</text>)}
        <text x={(M.l + W - M.r) / 2} y={H - 6} textAnchor="middle">Steel mass, kg</text>
        <text x={14} y={(M.t + H - M.b) / 2} textAnchor="middle" transform={`rotate(-90 14 ${(M.t + H - M.b) / 2})`}>Largest deflection, mm</text>
      </g>
      {/* the rest of the population: feasible filled, infeasible hollow */}
      <g>
        {snap.pop.filter((p) => !onFront.has(p) && inside(p)).map((p, i) => p.cv === 0
          ? <circle key={i} cx={sx(p.f[0])} cy={sy(p.f[1])} r={2} fill="#CBD2D5" />
          : <circle key={i} cx={sx(p.f[0])} cy={sy(p.f[1])} r={2.2} fill="none" stroke="#819199" strokeWidth="0.9" />)}
      </g>
      <g stroke="currentColor" strokeWidth="1.1">
        {front.map((p) => <circle key={key(p.x)} cx={sx(p.f[0])} cy={sy(p.f[1])} r={3.6} fill={p.f[2] === sel?.f[2] ? "#172027" : "#F6F7F5"} />)}
      </g>
      {sel && <circle cx={sx(sel.f[0])} cy={sy(sel.f[1])} r={5.5} fill="#F05A24" stroke="#172027" strokeWidth="1.2" />}
    </svg>
  );
};

/** Deformation scale for the drawing: the largest displacement shows as about 6 % of the length, a round number. */
const ampOf = (L: Layout, r: Analysis) => Math.max(1, Math.round((0.06 * lengthOf(L)) / r.deflection / 5) * 5);

// The picked design as a line drawing to scale: tubes at their true diameter in greys by utilization, pinned joints as
// open circles, the deflected shape dashed, supports and loads in ink.
const TrussSvg: React.FC<{ L: Layout; x: number[]; r: Analysis; mini?: boolean; className?: string }> = ({ L, x, r, mini, className }) => {
  const xs = L.nodes.map((n) => n[0]), ys = L.nodes.map((n) => n[1]);
  const span = lengthOf(L), pad = span * (mini ? 0.03 : 0.06);
  const vb = [Math.min(...xs) - pad, -(Math.max(...ys) + pad * 0.9), span + 2 * pad, Math.max(...ys) - Math.min(...ys) + pad * (mini ? 2 : 2.6)];
  const amp = ampOf(L, r);
  const P = (k: number, def = 0) => [L.nodes[k][0] + def * r.u[2 * k], -(L.nodes[k][1] + def * r.u[2 * k + 1])];
  const fixedNodes = Array.from(new Set(L.fixed.map((d) => d >> 1)));
  const s = span / 100;   // symbol size
  return (
    <svg viewBox={vb.join(" ")} preserveAspectRatio="xMidYMax meet" className={className}
      role={mini ? undefined : "img"} aria-hidden={mini || undefined}
      aria-label={mini ? undefined : `Picked design drawn to scale. Highest utilization ${Math.max(...r.util).toFixed(2)}; deflected shape dashed, ${amp} times enlarged.`}>
      {!mini && L.members.map(([i, j], e) => {
        const [a, b] = [P(i, amp), P(j, amp)];
        return <line key={`d${e}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#819199" strokeWidth={s * 0.12} strokeDasharray={`${s * 0.9} ${s * 0.7}`} />;
      })}
      {L.members.map(([i, j], e) => {
        const [a, b] = [P(i), P(j)], sec = SECTIONS[x[L.group[e]]];
        return <line key={e} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={grey(r.util[e])} strokeWidth={Math.max(sec.D, s * (mini ? 0.6 : 0.25))}>
          {!mini && <title>{`${sec.name}, ${(r.N[e] / 1e3).toFixed(0)} kN, utilization ${r.util[e].toFixed(2)}`}</title>}
        </line>;
      })}
      {!mini && L.nodes.map((_, k) => { const [cx, cy] = P(k); return <circle key={`n${k}`} cx={cx} cy={cy} r={s * 0.6} fill="#F6F7F5" stroke="#172027" strokeWidth={s * 0.12} />; })}
      {!mini && fixedNodes.map((k) => {
        const [cx, cy] = P(k), roller = L.fixed.filter((d) => d >> 1 === k).length === 1, h = 2.2 * s, w = 1.4 * s;
        return <g key={k} fill="none" stroke="#172027" strokeWidth={s * 0.12}>
          <path d={`M${cx} ${cy + 0.6 * s}l${-w} ${h}h${2 * w}z`} />
          <line x1={cx - 2 * w} x2={cx + 2 * w} y1={cy + 0.6 * s + h + (roller ? 0.9 * s : 0)} y2={cy + 0.6 * s + h + (roller ? 0.9 * s : 0)} />
        </g>;
      })}
      {!mini && L.loaded.map((k) => {
        const [cx, cy] = P(k);
        return <g key={`p${k}`} stroke="#172027" strokeWidth={s * 0.12} fill="#172027">
          <line x1={cx} x2={cx} y1={cy + 0.8 * s} y2={cy + 4.6 * s} />
          <path d={`M${cx} ${cy + 5.8 * s}l${-0.6 * s} ${-1.4 * s}h${1.2 * s}z`} stroke="none" />
        </g>;
      })}
    </svg>
  );
};

const TrussSizing: React.FC = () => {
  const { values: p, clamped, set } = useToolParams(SPEC);
  const L = LAYOUTS[p.layout];
  const runRef = useRef<Run | null>(null);
  const [snap, setSnap] = useState<Snap | null>(null);
  const [mode, setMode] = useState<Mode>("running");
  const [showMembers, setShowMembers] = useState(false);
  const [view, setView] = useState<"front" | "truss">("front");
  const [stageRef, stage] = useBox<HTMLDivElement>();
  const [showTable, setShowTable] = useState(false);
  const [algo, setAlgo] = useState(false);

  const tick = useCallback(() => {
    const run = runRef.current;
    if (!run) return;
    // about 150 frames for a whole run; under reduced motion in larger steps, showing only the end
    const per = REDUCED ? 20 : Math.max(1, Math.ceil(run.gens / 150));
    for (let k = 0; k < per && run.ga.state.gen < run.gens; k++) { run.ga.step(); record(run); }
    const done = run.ga.state.gen >= run.gens;
    if (!REDUCED || done) setSnap(snapOf(run));
    if (done) setMode("done");
    else run.raf = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    const P = p.load * 1e3, b = bounds(L, P), n = genes(L);
    const prob = { n, ub: SECTIONS.length - 1, evaluate: (x: number[]) => { const r = analyse(L, x, P); return { f: [r.mass, r.deflection, r.distinct], cv: r.cv }; } };
    const ga = createNSGA2(prob, { pop: p.pop, pc: p.pc, mut: p.mut, etaC: p.etac, etaM: p.etam, seed: p.seed, initial: SECTIONS.map((_, k) => new Array(n).fill(k)) });
    const run: Run = { ga, hv: [], raf: 0, gens: p.gens, norm: (f) => f.map((v, k) => (v - b.lo[k]) / (b.hi[k] - b.lo[k])) };
    runRef.current = run;
    record(run);
    setSnap(snapOf(run));
    setMode("running");
    run.raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(run.raf);
  }, [L, p.load, p.pop, p.gens, p.pc, p.mut, p.etac, p.etam, p.seed, tick]);

  const toggle = () => {
    const run = runRef.current;
    if (mode === "running" && run) { cancelAnimationFrame(run.raf); setMode("paused"); }
    else if (mode === "paused") { setMode("running"); tick(); }
    else set({ seed: 1 + Math.floor(Math.random() * 999998) });
  };

  const front = useMemo(() => (snap ? paretoSet(snap.pop) : []), [snap]);
  // the picked design: the best on the current front for the weights and method, so it follows the run
  const method = p.mcdm as Method, weights = WEIGHTS.map((k) => p[k]);
  const byMass = useMemo(() => [...front].sort((a, b) => a.f[0] - b.f[0]), [front]);   // ties go to the lighter design
  const sel = useMemo(() => (byMass.length ? byMass[rank(byMass.map((q) => q.f), weights, method).i] : undefined), [byMass, method, ...weights]);   // eslint-disable-line react-hooks/exhaustive-deps
  const detail = useMemo(() => (sel ? analyse(L, sel.x, p.load * 1e3) : null), [L, sel, p.load]);
  const W = normalize(weights), shares = W.map((v) => Math.round(v * 100));
  shares[2] = 100 - shares[0] - shares[1];
  const setWeight = (j: number, v: number) => { const n = relink(weights, j, v); set({ wm: n[0], wd: n[1], ws: n[2] }); };
  const hv = snap?.hv[snap.hv.length - 1] ?? 0;
  const span = lengthOf(L);
  const status = !snap ? "" : `Generation ${snap.gen} of ${p.gens} · ${snap.evaluations.toLocaleString("en")} designs analysed · ${front.length} on the front`;

  const exportFront = () => download(`truss-front-${p.layout}.csv`,
    `# Truss sizing, ${window.location.href}\n# ${L.label}, ${p.load} kN per loaded node, generation ${snap?.gen}\n# mass_kg,deflection_mm,sections,sizes_by_variable\n` +
    [...front].sort((a, b) => a.f[2] - b.f[2] || a.f[0] - b.f[0]).map((q) => `${q.f[0].toFixed(1)},${q.f[1].toFixed(2)},${q.f[2]},${q.x.map((v) => SECTIONS[v].name).join(";")}`).join("\n") + "\n", "text/csv");
  const exportDesign = () => sel && detail && download(`truss-design-${p.layout}.csv`,
    `# Truss sizing, ${window.location.href}\n# ${L.label}, ${p.load} kN per loaded node; CHS D x t in mm, S355\n# member,node_i,node_j,length_m,section,area_mm2,force_kN,utilization\n` +
    L.members.map(([i, j], e) => { const sct = SECTIONS[sel.x[L.group[e]]], len = Math.hypot(L.nodes[j][0] - L.nodes[i][0], L.nodes[j][1] - L.nodes[i][1]) / 1000;
      return `${e + 1},${i + 1},${j + 1},${len.toFixed(3)},${sct.name},${sct.A.toFixed(0)},${(detail.N[e] / 1e3).toFixed(1)},${detail.util[e].toFixed(3)}`; }).join("\n") + "\n", "text/csv");

  const slider = (k: keyof typeof SPEC, label: string, fmt: (v: number) => string) => {
    const f = SPEC[k] as { min: number; max: number; step: number };
    return (
      <Field label={label} value={fmt(p[k] as number)} htmlFor={`ts-${k}`}>
        <input id={`ts-${k}`} type="range" min={f.min} max={f.max} step={f.step} value={p[k] as number} onChange={(e) => set({ [k]: e.target.value })} className="w-full accent-ink" />
      </Field>
    );
  };

  return (
    <ToolShell
      path="/tools/truss-sizing"
      slug="truss-sizing"
      methodRef={{ label: "Deb et al. 2002", href: "https://doi.org/10.1109/4235.996017" }}
      method={<>
        <p>Each member gets a hot-finished circular hollow section from a list of 16, in S355 steel. A linear-elastic analysis of the pin-jointed truss gives the member forces and deflections, and each member is checked to EN 1993-1-1: yielding in tension, flexural buckling in compression (curve a, pinned ends, γ<sub>M0</sub> = γ<sub>M1</sub> = 1.0).</p>
        <p>NSGA-II (Deb et al. 2002) searches the three objectives at once. Constrained domination ranks every design that passes the checks above every design that fails, and failing ones by how far they fail. Children come from binary tournaments, simulated binary crossover and polynomial mutation, rounded to the list; repeated designs are retried. The first population includes the 16 designs that use one size throughout, so the one-section end of the front is there from the start.</p>
        <p>To pick one design from the front, the weights rank it by TOPSIS (closeness to the ideal design) or VIKOR (a compromise of group utility and the worst single criterion, v = 0.5), both on the three objectives as costs (<a className="link" href="https://doi.org/10.1016/S0377-2217(03)00020-1" rel="noopener noreferrer">Opricovic and Tzeng 2004</a>).</p>
        <p>Hypervolume measures the front: the share of the box from the lightest to the heaviest design, the stiffest to the most flexible, and 1 to {Math.min(genes(L), SECTIONS.length) + 1} sections, that the front dominates. NSGA-II keeps a spread rather than the largest volume, so it can dip slightly between generations.</p>
      </>}
      limits={<>
        <p>Pin-jointed, linear elastic, small displacements. Self-weight, connections, joint eccentricities and out-of-plane stability are left out. The load is one design value per loaded node, and the deflection is reported under the same load.</p>
        <p>Section properties come from the nominal diameter and wall; check sizes against a manufacturer’s table. National annexes may set other partial factors.</p>
        <p>The cantilever uses the layout of the classic 10-bar truss with steel tubes and 5 m bays, so its numbers don’t compare with published results for that problem. A research demo, not a design check.</p>
      </>}
    >
      {clamped.length > 0 && <p className="t-small mb-4 text-ink-2">Some link settings were out of range and have been adjusted: {clamped.join(", ")}.</p>}
      {/* Workspace, no frame: toolbar, then the stage beside the weights that pick one design; thin rules divide them */}
      <div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pb-4">
          <div className="w-44"><Segmented label="Truss layout" value={p.layout} onChange={(v) => set({ layout: v })} options={[{ v: "bridge", text: "Bridge" }, { v: "cantilever", text: "10-bar" }]} /></div>
          <div className="flex items-center gap-3">
            <label htmlFor="ts-load" className="t-small text-ink-2">Load per arrow</label>
            <input id="ts-load" type="range" min={SPEC.load.min} max={SPEC.load.max} step={SPEC.load.step} value={p.load} onChange={(e) => set({ load: e.target.value })} className="w-32 accent-ink" />
            <output htmlFor="ts-load" className="t-data w-14">{p.load} kN</output>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="ts-seed" className="t-small text-ink-2">Seed</label>
            <input id="ts-seed" type="number" inputMode="numeric" min={1} value={p.seed} onChange={(e) => e.target.value && set({ seed: e.target.value })}
              className="t-data h-9 w-24 rounded-[2px] border border-rule bg-transparent px-2 [@media(pointer:coarse)]:h-11" />
            <button type="button" className="btn" onClick={() => set({ seed: 1 + Math.floor(Math.random() * 999998) })}>New</button>
          </div>
          <button type="button" className="btn gap-1.5" aria-expanded={algo} aria-controls="ts-algo" onClick={() => setAlgo((v) => !v)}>
            Algorithm
            <svg viewBox="0 0 16 16" aria-hidden="true" className={`h-3 w-3 transition-transform duration-150 ${algo ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3.5 6 8 10.5 12.5 6" /></svg>
          </button>
          <button type="button" onClick={toggle} className="btn btn-solid ml-auto min-w-[6.5rem]">{mode === "running" ? "Pause" : mode === "paused" ? "Resume" : "Run again"}</button>
        </div>
        {algo && <div id="ts-algo" className="grid gap-x-8 gap-y-4 border-t border-rule py-4 sm:grid-cols-3 xl:grid-cols-6">
          {slider("pop", "Population", String)}
          {slider("gens", "Generations", String)}
          {slider("pc", "Crossover probability", (v) => v.toFixed(2))}
          {slider("mut", "Mutated sizes per child", (v) => v.toFixed(1))}
          {slider("etac", "Crossover index ηc", String)}
          {slider("etam", "Mutation index ηm", String)}
        </div>}

        <div className="grid border-t border-rule lg:grid-cols-[minmax(0,1fr)_19rem]">
          {/* Stage: the front or the picked truss large, the other as a thumbnail that swaps them */}
          <div className="min-w-0 py-4 lg:pr-6">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-1">
              <p className="t-small text-ink-2" aria-hidden="true">{status}</p>
              <p className="t-small flex items-center gap-2 text-ink-2">Hypervolume <span className="t-data text-ink">{hv.toFixed(3)}</span><span className="flex w-28 sm:w-40"><Trace data={snap?.hv ?? []} live={mode === "running"} /></span></p>
            </div>
            <div ref={stageRef} className="relative h-[clamp(17rem,calc(100svh-26rem),32rem)] w-full">
              {view === "front"
                ? snap && <FrontChart snap={snap} front={front} sel={sel} W={stage.w} H={stage.h} />
                : sel && detail && <div className="absolute inset-x-0 bottom-0 top-28"><TrussSvg L={L} x={sel.x} r={detail} className="block h-full w-full" /></div>}
              {snap && sel && detail && (
                <button type="button" onClick={() => setView(view === "front" ? "truss" : "front")}
                  aria-label={view === "front" ? "Show the picked truss large" : "Show the Pareto front large"}
                  className="group absolute right-0 top-0 w-32 border border-rule bg-canvas px-2 pb-1.5 pt-1 text-left transition-colors duration-150 hover:border-ink sm:w-44">
                  <span className="t-small block text-ink-2 group-hover:text-ink">{view === "front" ? "Picked truss" : "Pareto front"}</span>
                  <span className="mt-1 block">
                    {view === "front" ? <TrussSvg mini L={L} x={sel.x} r={detail} className="block h-auto w-full" /> : <FrontChart mini snap={snap} front={front} sel={sel} W={176} H={88} />}
                  </span>
                </button>
              )}
            </div>
            {view === "front"
              ? <p className="t-small mt-2 text-ink-2">Orange: the picked design. Ringed: the front, filled where a design has {sel ? `${sel.f[2]} different section${sel.f[2] === 1 ? "" : "s"}` : "as many different sections"} like the picked one. Grey: the rest of the population; hollow grey ones fail a member check.</p>
              : detail && <p className="t-small mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-ink-2">
                  <span>Drawn to scale, tubes at their true diameter</span>
                  <span className="flex items-center gap-2">Utilization 0 <span className="inline-block h-2 w-16" style={{ background: `linear-gradient(90deg, ${grey(0)}, ${grey(1)})` }} /> 1</span>
                  <span>Dashed: deflected shape × {ampOf(L, detail)}</span>
                  <span>Arrows: {p.load} kN each</span>
                </p>}
            <p className="sr-only" role="status" aria-live="polite">{mode === "done" ? `Done: ${front.length} designs on the front.` : ""}</p>
            <div className="mt-6 min-w-0 border-t border-rule pt-4">
              <p className="t-small mb-1.5 text-ink-2">Objectives</p>
              <div className="math sm flex flex-col gap-1 overflow-x-auto overflow-y-hidden">
                <MathML html={FORMULATION} />
                <MathML html={SUBJECT} />
              </div>
              <p className="t-small mt-2 text-ink-2">Steel mass m, largest vertical deflection δ<sub>max</sub> and number of different sections n<sub>s</sub>; each of the n design variables takes a size from the list S.</p>
            </div>
          </div>

          {/* Picking one design from the front, and what it is */}
          <div className="flex min-w-0 flex-col gap-4 border-t border-rule py-4 lg:border-l lg:border-t-0 lg:pl-6">
            <div>
              <h2 className="font-[520]">Pick one design</h2>
              <p className="t-small mt-1 text-ink-2">Every design on the front is a fair trade-off: none is better in all three objectives. Say how much each one matters to you, and {METHOD_NAME[method]} picks the design that fits best (orange). The pick follows the run as the front improves.</p>
            </div>
            <Segmented label="Decision method" value={method} onChange={(v) => set({ mcdm: v })} options={[{ v: "topsis", text: "TOPSIS" }, { v: "vikor", text: "VIKOR" }]} />
            {CRITERIA.map(([k, label], j) => (
              <Field key={k} label={label} value={`${shares[j]} %`} htmlFor={`ts-${k}`}>
                <input id={`ts-${k}`} type="range" min={0} max={1} step={0.01} value={W[j]} onChange={(e) => setWeight(j, Number(e.target.value))} className="w-full accent-ink" />
              </Field>
            ))}
            <p className="t-small text-ink-2">The weights share 100 %: raising one lowers the other two.</p>
            {sel && detail && <div className="border-t border-rule pt-4">
              <p className="t-small text-ink-2">Picked design</p>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-3">
                {([["Steel", kg(sel.f[0])], ["Deflection", `${mm(sel.f[1])}, L / ${Math.round(span / sel.f[1])}`], ["Sections", `${sel.f[2]} different`], ["Utilization", `${Math.max(...detail.util).toFixed(2)} highest`]] as const).map(([k, v]) => (
                  <div key={k} className="min-w-0"><dt className="t-small text-ink-2">{k}</dt><dd className="t-data mt-0.5">{v}</dd></div>
                ))}
              </dl>
            </div>}
          </div>
        </div>
      </div>

      {sel && <section aria-labelledby="design-h" className="mt-12 border-t border-rule pt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="design-h" className="t-h3">Details</h2>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn" aria-expanded={showMembers} onClick={() => setShowMembers((v) => !v)}>{showMembers ? "Hide members" : "Show members"}</button>
            <button type="button" className="btn" aria-expanded={showTable} onClick={() => setShowTable((v) => !v)}>{showTable ? "Hide the front" : "Front as table"}</button>
            <button type="button" className="btn" onClick={exportDesign}>Design CSV</button>
            <button type="button" className="btn" onClick={exportFront}>Front CSV</button>
          </div>
        </div>

        {showMembers && detail && (
          <div className="mt-8 overflow-x-auto">
            <table className="t-data w-full min-w-[36rem] border-collapse text-left">
              <caption className="sr-only">Members of the picked design</caption>
              <thead><tr className="border-b border-ink">{["Member", "Nodes", "Length, m", "Section, mm", "Force, kN", "Utilization"].map((h) => <th key={h} scope="col" className="py-2 pr-4 font-[520]">{h}</th>)}</tr></thead>
              <tbody>
                {L.members.map(([i, j], e) => (
                  <tr key={e} className="border-b border-rule">
                    <td className="py-1.5 pr-4">{e + 1}</td><td className="py-1.5 pr-4">{i + 1}–{j + 1}</td>
                    <td className="py-1.5 pr-4">{(Math.hypot(L.nodes[j][0] - L.nodes[i][0], L.nodes[j][1] - L.nodes[i][1]) / 1000).toFixed(2)}</td>
                    <td className="py-1.5 pr-4">{SECTIONS[sel.x[L.group[e]]].name}</td>
                    <td className="py-1.5 pr-4">{(detail.N[e] / 1e3).toFixed(0)}{detail.N[e] < 0 ? " compr." : ""}</td>
                    <td className="py-1.5 pr-4">{detail.util[e].toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {showTable && (
          <div className="mt-8 overflow-x-auto">
            <table className="t-data w-full min-w-[28rem] border-collapse text-left">
              <caption className="sr-only">Designs on the front</caption>
              <thead><tr className="border-b border-ink">{["Sections", "Steel, kg", "Deflection, mm"].map((h) => <th key={h} scope="col" className="py-2 pr-4 font-[520]">{h}</th>)}</tr></thead>
              <tbody>
                {[...front].sort((a, b) => a.f[2] - b.f[2] || a.f[0] - b.f[0]).map((q) => (
                  <tr key={key(q.x)} className={`border-b border-rule ${q === sel ? "bg-wash" : ""}`}>
                    <td className="py-1.5 pr-4">{q.f[2]}</td><td className="py-1.5 pr-4">{Math.round(q.f[0]).toLocaleString("en")}</td><td className="py-1.5 pr-4">{q.f[1].toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>}
    </ToolShell>
  );
};

export default TrussSizing;

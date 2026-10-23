import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import ToolShell from "../ToolShell";
import { useToolParams } from "../useToolParams";
import { Field, Segmented, Tip } from "../controls";
import { classInBending, FY, section, SECTIONS, type Grade, type Series } from "../steel/sections";
import { hasWebGL2, No3D } from "../three/support";
import { ec3, solveLtb, type Height, type Load, type LtbResult } from "./ltb";
import { ChiCurve, SectionInset } from "./Insets";
import type { Show } from "./show";

const Beam3D = lazy(() => import("./Beam3D"));

const SPEC = {
  sec: { kind: "enum", values: SECTIONS.map((s) => s.id), def: "IPE300" },
  L: { kind: "num", min: 2, max: 12, step: 0.1, def: 6 },
  grade: { kind: "enum", values: ["S235", "S355", "S460"], def: "S355" },
  load: { kind: "enum", values: ["moment", "udl", "point"], def: "udl" },
  zg: { kind: "enum", values: ["top", "centre", "bottom"], def: "centre" },
  nr: { kind: "num", min: 0, max: 4, step: 1, def: 0 },
  r1: { kind: "num", min: 0.05, max: 0.95, step: 0.01, def: 0.5 },
  r2: { kind: "num", min: 0.05, max: 0.95, step: 0.01, def: 0.25 },
  r3: { kind: "num", min: 0.05, max: 0.95, step: 0.01, def: 0.75 },
  r4: { kind: "num", min: 0.05, max: 0.95, step: 0.01, def: 0.9 },
  rt: { kind: "enum", values: ["top", "full"], def: "top" },
  amp: { kind: "num", min: 1, max: 5, step: 0.5, def: 2 },
} as const;
const RK = ["r1", "r2", "r3", "r4"] as const;
const REDUCED = typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const RAMP = 2400;
const ease = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2);

const kNm = (v: number) => { const x = v / 1e6; return `${x >= 100 ? Math.round(x).toLocaleString("en") : x.toPrecision(3)} kNm`; };
const LOAD_TEXT: Record<Load, string> = { moment: "uniform moment", udl: "uniform load", point: "central point load" };
const HEIGHT_TEXT: Record<Height, string> = { top: "on the top flange", centre: "at the shear center", bottom: "on the bottom flange" };
const WAVES = ["no", "one half-wave", "two half-waves", "three half-waves", "four half-waves", "five half-waves"];

/** Half-waves of the buckled shape: sign changes of the top flange's sideways movement along the span, plus one. */
function halfWaves(r: LtbResult) {
  let n = 1, last = 0;
  for (let k = 0; k <= r.n; k++) {
    const u = r.mode.v[k] - r.ztop * r.mode.phi[k];
    if (Math.abs(u) < 0.05) continue;
    const s = Math.sign(u);
    if (last && s !== last) n++;
    last = s;
  }
  return n;
}

const STEPS = [
  { text: "Load it", caption: "A beam bends, and then it leaves its plane." },
  { text: "Top or bottom flange", caption: "A load on the top flange pulls it over sooner: Mcr drops." },
  { text: "Add a restraint", caption: "A midspan restraint forces two half-waves: Mcr jumps." },
  { text: "IPE or HEB", caption: "Wide flanges resist twisting: compare Mcr with the IPE." },
];

const BeamTwist: React.FC = () => {
  const { values: p, clamped, set } = useToolParams(SPEC);
  const sec = section(p.sec)!, L = p.L * 1000, load = p.load as Load, height = p.zg as Height, kind = p.rt as "top" | "full";
  const fy = FY[p.grade as Grade];
  const [drag, setDrag] = useState<{ i: number; s: number } | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [avis, setAvis] = useState(0);
  const [step, setStep] = useState<number | null>(null);
  const ramp = useRef(0);
  const shares = RK.slice(0, p.nr).map((k, i) => (drag?.i === i ? drag.s : p[k]));
  const sharesKey = shares.join(",");
  const at = useMemo(() => shares, [sharesKey]);   // eslint-disable-line react-hooks/exhaustive-deps

  const result = useMemo(() => solveLtb({ sec, L, load, height, at, kind }), [sec, L, load, height, at, kind]);
  const cls = classInBending(sec, fy);
  const check = result ? ec3(sec, cls, fy, result.Mcr) : null;
  const show: Show = useMemo(() => ({ amp: p.amp, avis }), [p.amp, avis]);
  const waves = result ? halfWaves(result) : 0;

  // "Load it": the drawn size of the mode grows from 0 to 1; nothing physical is animated
  const loadIt = () => {
    cancelAnimationFrame(ramp.current);
    if (REDUCED) { setAvis(1); return; }
    const t0 = performance.now();
    const tick = (now: number) => {
      const u = Math.min(1, (now - t0) / RAMP);
      setAvis(ease(u));
      if (u < 1) ramp.current = requestAnimationFrame(tick);
    };
    ramp.current = requestAnimationFrame(tick);
  };
  useEffect(() => () => cancelAnimationFrame(ramp.current), []);
  const loaded = avis >= 1;

  const runStep = (k: number) => {
    setStep(k);
    if (k === 0) { set({ sec: "IPE300", L: 6, load: "udl", zg: "centre", nr: 0 }); setAvis(0); loadIt(); return; }
    if (k === 1) set({ zg: "top" });
    if (k === 2) set({ nr: 1, r1: 0.5, rt: "full" });
    if (k === 3) set({ sec: "HEB300", nr: 1, r1: 0.5, rt: "full" });
    if (!avis) setAvis(1);
  };

  // announce the result after the settings settle
  const [said, setSaid] = useState("");
  useEffect(() => {
    if (!result) return;
    const t = window.setTimeout(() => setSaid(`Mcr ${Math.round(result.Mcr / 1e6)} kilonewton meters${check ? `, χLT ${check.chi.toFixed(2)}` : ""}`), 400);
    return () => window.clearTimeout(t);
  }, [result, check?.chi]);   // eslint-disable-line react-hooks/exhaustive-deps

  const label = `${sec.name}, ${p.L} m span, ${LOAD_TEXT[load]}${load === "moment" ? "" : ` ${HEIGHT_TEXT[height]}`}${p.nr ? `, ${p.nr} restraint${p.nr > 1 ? "s" : ""}` : ""}. Buckled shape: ${WAVES[waves] ?? `${waves} half-waves`}, sway and twist. Mcr ${result ? Math.round(result.Mcr / 1e6) : "unknown"} kilonewton meters.`;
  const webgl = useMemo(() => hasWebGL2(), []);
  const inset = <SectionInset sec={sec} L={L} load={load} height={height} result={result} show={show} />;
  const series: Series[] = ["IPE", "HEA", "HEB"];
  const MRdName = cls === 3 ? "Mel,Rd" : "Mpl,Rd";

  return (
    <ToolShell
      path="/tools/beam-twist"
      slug="beam-twist"
      methodRef={{ label: "NCCI SN003", href: "https://eurocodes.jrc.ec.europa.eu/sites/default/files/2022-06/SN003a-EN-EU.pdf" }}
      method={<>
        <p>The beam is divided into 40 finite elements. Each node carries the sideways displacement and the twist of the shear center, and their slopes (cubic Hermite functions). The elastic critical moment M<sub>cr</sub> is the lowest eigenvalue of the stability problem, including the height of the load above or below the shear center (after Trahair 1993). Fork supports and restraints are exact constraints.</p>
        <p>Section properties come from the nominal dimensions (EN 10365), root fillets included, and agree with the ArcelorMittal catalog within its rounding.</p>
        <p>The design resistance follows EN 1993-1-1:2005, 6.3.2.3, for rolled sections with the recommended values: λ̄<sub>LT,0</sub> = 0.4, β = 0.75, curve b for h/b ≤ 2 and c above, γ<sub>M1</sub> = 1.0.</p>
        <p>Checked against the closed form under uniform moment, the C<sub>1</sub> factors of NCCI SN003 in their limit κ = 0 (1.127 and 1.348), an independent Ritz sine series, and a hand calculation of the resistance.</p>
      </>}
      limits={<>
        <p>Doubly symmetric rolled sections on fork supports (free warping), elastic, with prebuckling deflections ignored. No local or distortional buckling, no web openings, no post-buckling.</p>
        <p>Restraints are discrete and rigid. “Top flange” holds the top flange sideways; “Full” holds the sideways movement and the twist. Loads act downwards, so the top flange is in compression.</p>
        <p>The drawn shape is the buckling mode, enlarged: an eigenvalue analysis gives its shape, not its size. M<sub>cr</sub> is a stability threshold, not a resistance.</p>
        <p>Recommended values of the 2005 edition, not a National Annex; the factor f of 6.3.2.3(2) is not used, which is conservative. The second-generation Eurocodes replace this edition nationally by 2028. For design, check with software such as LTBeam (CTICM).</p>
      </>}
    >
      {clamped.length > 0 && <p className="t-small mb-4 text-ink-2">Some link settings were out of range and have been adjusted: {clamped.join(", ")}.</p>}

      {/* Guide: four steps that set up the classic comparisons */}
      <div className="pb-4">
        <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          {STEPS.map((s, k) => (
            <button key={k} type="button" className={`btn shrink-0 snap-start ${step === k ? "bg-wash" : ""}`} aria-pressed={step === k} onClick={() => runStep(k)}>
              <span className="text-ink-2">{k + 1}</span> {s.text}
            </button>
          ))}
        </div>
        <p key={step ?? -1} className="t-small mt-2 min-h-[1.45em] text-ink-2 motion-safe:animate-fade-in" aria-live="polite">{step !== null ? STEPS[step].caption : "Try the steps, or set the beam below."}</p>
      </div>

      {/* Toolbar */}
      <div className="grid grid-cols-1 gap-x-6 gap-y-3 border-t border-rule py-4 sm:flex sm:flex-wrap sm:items-end">
        <Field label="Section" htmlFor="bt-sec">
          <select id="bt-sec" value={p.sec} onChange={(e) => set({ sec: e.target.value })}
            className="t-data h-9 w-full rounded-[2px] border border-rule bg-transparent px-2 sm:w-32 [@media(pointer:coarse)]:h-11">
            {series.map((g) => <optgroup key={g} label={g}>{SECTIONS.filter((s) => s.series === g).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</optgroup>)}
          </select>
        </Field>
        <div className="sm:w-40">
          <Field label="Span" value={`${p.L.toFixed(1)} m`} htmlFor="bt-L">
            <input id="bt-L" type="range" min={SPEC.L.min} max={SPEC.L.max} step={SPEC.L.step} value={p.L} onChange={(e) => set({ L: e.target.value })} className="w-full accent-ink [@media(pointer:coarse)]:h-11" />
          </Field>
        </div>
        <div className="sm:w-44"><Field label="Steel grade"><Segmented label="Steel grade" value={p.grade} onChange={(v) => set({ grade: v })} options={["S235", "S355", "S460"].map((v) => ({ v, text: v }))} /></Field></div>
        <div className="sm:w-56"><Field label="Load"><Segmented label="Load" value={load} onChange={(v) => set({ load: v })} options={[{ v: "moment", text: "Moment" }, { v: "udl", text: "Uniform" }, { v: "point", text: "Point" }]} /></Field></div>
        <div className="sm:w-56">
          <div className="flex items-center gap-1.5"><span className="t-small text-ink-2">Load height</span>{load === "moment" && <Tip label="load height">Load height has no effect under uniform moment.</Tip>}</div>
          <fieldset disabled={load === "moment"} className={`mt-1.5 ${load === "moment" ? "opacity-40" : ""}`}>
            <Segmented label="Load height" value={height} onChange={(v) => set({ zg: v })} options={[{ v: "top", text: "Top" }, { v: "centre", text: "Centre" }, { v: "bottom", text: "Bottom" }]} />
          </fieldset>
        </div>
        <div className="sm:w-48"><Field label="Restraints"><Segmented label="Number of restraints" value={String(p.nr)} onChange={(v) => { setPicked(null); set({ nr: v }); }} options={[0, 1, 2, 3, 4].map((n) => ({ v: String(n), text: String(n) }))} /></Field></div>
        <div className={`sm:w-48 ${p.nr ? "" : "opacity-40"}`}>
          <Field label="Restraint type">
            <fieldset disabled={!p.nr}><Segmented label="Restraint type" value={kind} onChange={(v) => set({ rt: v })} options={[{ v: "top", text: "Top flange" }, { v: "full", text: "Full" }]} /></fieldset>
          </Field>
        </div>
        <button type="button" className="btn btn-solid min-w-[7rem] sm:ml-auto" onClick={() => { if (loaded) { cancelAnimationFrame(ramp.current); setAvis(0); } else loadIt(); }}>
          {loaded ? "Reset load" : "Load it"}
        </button>
      </div>

      <div className="grid border-t border-rule lg:grid-cols-[minmax(0,1fr)_19rem] xl:grid-cols-[minmax(0,1fr)_21rem]">
        {/* Stage */}
        <div className="min-w-0 py-4 lg:pr-6">
          <div className="h-[clamp(16rem,55svh,28rem)] w-full lg:h-[clamp(18rem,calc(100svh-24rem),34rem)]">
            {webgl
              ? <Suspense fallback={<div className="flex h-full flex-col"><p className="t-small text-ink-2">Loading the 3D view…</p><div className="mx-auto mt-2 aspect-square h-[calc(100%-2rem)]">{inset}</div></div>}>
                  <Beam3D sec={sec} L={L} load={load} height={height} kind={kind} at={at} result={result} show={show} picked={picked} label={label}
                    onPick={setPicked} onDrag={(i, s) => setDrag({ i, s })} onDragEnd={(i, s) => { set({ [RK[i]]: Math.round(s * 100) / 100 }); setDrag(null); }} />
                </Suspense>
              : <No3D><div className="mx-auto aspect-square h-full max-w-full">{inset}</div></No3D>}
          </div>
          <div className="t-small mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-ink-2">
            <span className="text-ink">{result ? `Mcr = ${kNm(result.Mcr)}. The beam sways and twists in ${WAVES[waves] ?? `${waves} half-waves`}.` : "No buckling found."}</span>
            <label className="flex items-center gap-2">Drawn ×{p.amp}
              <input type="range" min={SPEC.amp.min} max={SPEC.amp.max} step={SPEC.amp.step} value={p.amp} onChange={(e) => set({ amp: e.target.value })} className="w-24 accent-ink [@media(pointer:coarse)]:h-11" aria-label="Exaggeration of the drawn shape" />
            </label>
          </div>
          <p className="t-small mt-1 min-h-[1.45em] text-ink-2">{avis > 0 ? "Mode shape exaggerated. The elastic critical moment is a stability threshold, not a simulated collapse." : "Press Load it to see the buckled shape."}</p>
          {result && result.shared.length > 0 && <p className="t-small mt-1 text-ink-2">{result.shared.map(([a, b]) => `Restraints ${a} and ${b} share a position`).join("; ")}; the second is ignored.</p>}
        </div>

        {/* Panel: results, insets, restraint positions */}
        <div className="flex min-w-0 flex-col gap-5 border-t border-rule py-4 lg:border-l lg:border-t-0 lg:pl-6">
          <dl className="t-data grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 max-lg:sm:grid-cols-[auto_1fr_auto_1fr]">
            {([
              ["Mcr", result ? kNm(result.Mcr) : "–", "The elastic critical moment: the largest moment at which the perfect, elastic beam stays straight. A stability threshold, not a resistance."],
              ["Equivalent Mcr ratio", result ? result.ratio.toFixed(2) : "–", "Mcr divided by Mcr under uniform moment for the same beam. Only with the load at the shear center and no restraints is it comparable with the C1 factors of SN003, which assume κ = 0; it is not a general C1 factor."],
              ["λ̄LT", check ? check.lam.toFixed(2) : "–", undefined],
              ["Curve", check ? check.curve : "–", "Buckling curve for rolled sections: b for h/b ≤ 2, c above (EN 1993-1-1, Table 6.5)."],
              ["χLT", check ? check.chi.toFixed(2) : "–", undefined],
              ["Mb,Rd", check?.MbRd != null ? kNm(check.MbRd) : "–", "The design buckling resistance moment, χLT Wy fy / γM1."],
              [MRdName, check?.MRd != null ? kNm(check.MRd) : "–", "The resistance of the cross-section, Wy fy / γM0, with Wpl for class 1 and 2 and Wel for class 3."],
              ["Section class", String(cls), "In bending, EN 1993-1-1, Table 5.2: the flange outstand and the web."],
            ] as const).map(([k, v, tip]) => (
              <React.Fragment key={k}>
                <dt className="flex items-center gap-1 text-ink-2">{k}{tip && <Tip label={k}>{tip}</Tip>}</dt>
                <dd>{v}</dd>
              </React.Fragment>
            ))}
          </dl>
          <p className="t-small text-ink-2">
            {!check ? "" : cls === 4 ? "Class 4: outside this tool."
              : check.short ? "Short enough: λ̄LT ≤ 0.4, so under the illustrated 2005 rolled-section check lateral-torsional buckling may be ignored, subject to the cross-section checks."
              : `What twisting costs you: Mb,Rd is ${Math.round(100 * check.chi)} % of ${MRdName}.`}
          </p>
          <div className="grid grid-cols-[9rem_minmax(0,1fr)] items-start gap-4 lg:grid-cols-1">
            <div className="w-36">{inset}</div>
            <ChiCurve check={check} className="h-40 lg:h-44" />
          </div>
          {p.nr > 0 && <div className="flex flex-col gap-3 border-t border-rule pt-4">
            <p className="t-small text-ink-2">Restraints {kind === "top" ? "(top flange)" : "(full)"}: drag them in the 3D view, or set them here.</p>
            {RK.slice(0, p.nr).map((k, i) => (
              <Field key={k} label={`Restraint ${i + 1}`} value={`${(shares[i] * p.L).toFixed(1)} m`} htmlFor={`bt-${k}`}>
                <input id={`bt-${k}`} type="range" min={0.05} max={0.95} step={0.01} value={shares[i]} onChange={(e) => set({ [k]: e.target.value })}
                  onFocus={() => setPicked(i)} onBlur={() => setPicked(null)} className="w-full accent-ink [@media(pointer:coarse)]:h-11" />
              </Field>
            ))}
          </div>}
          <p className="sr-only" role="status" aria-live="polite">{said}</p>
        </div>
      </div>
    </ToolShell>
  );
};

export default BeamTwist;

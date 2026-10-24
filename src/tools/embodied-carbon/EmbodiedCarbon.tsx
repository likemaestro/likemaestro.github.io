import React, { useEffect, useMemo, useState } from "react";
import ToolShell, { copy } from "../ToolShell";
import { useToolParams } from "../useToolParams";
import { Field, Segmented, Tip } from "../controls";
import { FACTORS, factorById, type Factor } from "../carbon/factors";
import { compute, ELEMENTS, SCENARIOS, type Element, type RowIn, type Totals, type Transport } from "./calc";
import { range, type Range } from "./mc";
import { decode, DEFAULT, encode, factorOf, toKg, type OptionState, type RowState, type State, type Unit } from "./state";
import { BandShares, Bars, Compare, ScorsLadder } from "./Charts";

const SPEC = { s: { kind: "text", ok: (v: string) => v === "" || decode(v) !== null, def: "" } } as const;
const NAMES = ["A", "B", "C"] as const;
const GROUPS = ["steel", "rebar", "concrete", "timber"] as const;
const GROUP_LABEL: Record<Factor["group"], string> = { steel: "Steel", rebar: "Reinforcement", concrete: "Concrete", timber: "Timber", other: "Other" };
/** Short names: [on the material's line, on its chip in the palette]. The datasets' full names are in Data and sources. */
const SHORT: Record<string, [string, string]> = {
  "steel-sections-eaf": ["Steel sections, electric arc furnace", "Sections, electric arc furnace"],
  "steel-sections-eaf-green": ["Steel sections, EAF with renewable power", "Sections, EAF with renewable power"],
  "steel-plates-bof": ["Steel plates, blast furnace", "Plates, blast furnace"],
  "steel-decking": ["Steel decking, galvanized", "Decking, galvanized"],
  rebar: ["Rebar, electric arc furnace", "Bars, electric arc furnace"],
  "concrete-c25-30": ["Concrete C25/30", "C25/30"],
  "concrete-c30-37": ["Concrete C30/37", "C30/37"],
  "concrete-c35-45": ["Concrete C35/45", "C35/45"],
  "concrete-c45-55": ["Concrete C45/55", "C45/55"],
  "concrete-c30-37-cem3": ["Concrete C30/37, blast-furnace cement", "C30/37, blast-furnace cement"],
  glulam: ["Glulam", "Glulam"],
  clt: ["Cross-laminated timber", "CLT"],
};
const nameOf = (id: string) => SHORT[id]?.[0] ?? factorById.get(id)?.label ?? "Unknown material";
const TR_TEXT: Record<Transport, string> = { local: "Local, 50 km", national: "National, 300 km", european: "European, 1,500 km", global: "Global, road and sea", custom: "Custom distances" };
/** New rows start from the transport the guide's worked example uses for each material and the usual unit. */
const TR_DEFAULT: Record<Factor["group"], Transport> = { steel: "national", rebar: "national", concrete: "local", timber: "european", other: "national" };
const unitFor = (f: Factor): Unit => (f.density && (f.group === "concrete" || f.group === "timber") ? "m3" : "t");
const EL_DEFAULT: Record<Element, string> = { sub: "concrete-c30-37", frame: "steel-sections-eaf", floors: "concrete-c30-37", roof: "steel-sections-eaf", cores: "concrete-c30-37" };
const newRow = (el: Element): RowState => { const f = factorById.get(EL_DEFAULT[el]) ?? FACTORS.factors[0]; return { f: f.id, q: null, u: unitFor(f), el, tr: TR_DEFAULT[f.group] }; };
const UNIT_TEXT: Record<Unit, string> = { kg: "kg", t: "t", m3: "m³" };
const t = (kg: number) => Math.round(kg / 1000).toLocaleString("en-US").replace(/,/g, " ");
const tq = (kg: number) => (Math.abs(kg) < 9950 ? (kg / 1000).toFixed(1) : t(kg));   // tonnes, one decimal under 10
const r1 = (v: number) => Math.round(v).toLocaleString("en-US").replace(/,/g, " ");
const f3 = (v: number) => (v < 0.2 ? v.toFixed(3) : v.toFixed(2));
// Inputs are underlined, not boxed; text actions are underlined; choices are chips. All 44 px on touch screens.
const fieldCls = "t-data h-9 border-b border-rule bg-transparent px-1 transition-colors duration-150 hover:border-ink-2 focus:border-ink [@media(pointer:coarse)]:h-11";
const quiet = "inline-flex min-h-9 items-center underline decoration-rule underline-offset-4 transition-colors duration-150 hover:decoration-ink [@media(pointer:coarse)]:min-h-11";
const chipCls = (on: boolean) => `t-data inline-flex min-h-9 items-center gap-2 rounded-[2px] border px-2.5 text-left transition-colors duration-150 [@media(pointer:coarse)]:min-h-11 ${on ? "border-ink bg-ink text-canvas" : "border-rule bg-canvas text-ink hover:border-ink-2"}`;
const Chevron: React.FC<{ open: boolean }> = ({ open }) => (
  <svg viewBox="0 0 12 12" aria-hidden="true" className={`h-3 w-3 shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M2.5 4.5 6 8l3.5-3.5" /></svg>
);

interface Result { rows: { in: RowIn; why?: string }[]; totals: Totals }
/** Option A still the guide's pavilion, unchanged (the note comparing with the guide's 163 holds only then). */
const isExample = (o: OptionState) => { const d = DEFAULT.o[0]; return o.gia === d.gia && o.cost === d.cost && JSON.stringify(o.rows) === JSON.stringify(d.rows); };
function evaluate(o: OptionState): Result {
  const rows = o.rows.map((r) => {
    const f = factorOf(r), { kg, why } = toKg(r, f);
    return { in: { factor: f ?? null, kg, el: r.el, tr: r.tr, road: r.road, sea: r.sea, wr: r.wr, cf: r.cf, cert: r.cert }, why };
  });
  return { rows, totals: compute({ gia: o.gia ?? 0, cost: o.cost ?? undefined, rows: rows.map((x) => x.in) }) };
}

const EmbodiedCarbon: React.FC = () => {
  const { values: p, clamped, set } = useToolParams(SPEC);
  const state: State = useMemo(() => (p.s ? decode(p.s) ?? DEFAULT : DEFAULT), [p.s]);
  const update = (f: (s: State) => void) => { const s = JSON.parse(JSON.stringify(state)) as State; f(s); set({ s: encode(s) }); };
  const [active, setActive] = useState(0), [status, setStatus] = useState(""), [showData, setShowData] = useState(false), [showRange, setShowRange] = useState<string | null>(null);
  // one panel open at a time: a material's palette or its settings, keyed "A-2-pick" or "A-2-more"
  const [panel, setPanel] = useState<string | null>(null), [focusId, setFocusId] = useState<string | null>(null);
  const flash = (m: string) => { setStatus(m); window.setTimeout(() => setStatus(""), 3000); };
  const act = Math.min(active, state.o.length - 1);
  // move the focus once the element it names has rendered (after adding, picking or removing a material)
  useEffect(() => { const el = focusId ? document.getElementById(focusId) : null; if (el) { el.focus(); setFocusId(null); } }, [focusId, state, panel]);

  const results = useMemo(() => state.o.map(evaluate), [state]);
  // the range, 300 ms after the last edit
  const [ranges, setRanges] = useState<(Range | null)[]>([]);
  useEffect(() => {
    const id = window.setTimeout(() => setRanges(state.o.map((o, i) => range({ gia: o.gia ?? 0, cost: o.cost ?? undefined, rows: results[i].rows.map((x) => x.in) }, state.sf, state.sq, state.seed))), 300);
    return () => window.clearTimeout(id);
  }, [results, state.sf, state.sq, state.seed]);   // eslint-disable-line react-hooks/exhaustive-deps

  const addOption = () => update((s) => { const src = s.o[act], n = NAMES.find((x) => !s.o.some((o) => o.n === x))!; s.o.push({ ...JSON.parse(JSON.stringify(src)), n, label: `${src.label.slice(0, 30)} (copy)` }); s.o.sort((a, b) => a.n.localeCompare(b.n)); setActive(s.o.findIndex((o) => o.n === n)); setPanel(null); });
  const share = async () => {
    const url = window.location.href;
    if (encode(state).length > 1800) { flash("Too long for a link. Download it as JSON instead."); return; }
    flash((await copy(url)) ? "Link copied, with these options" : "Copy the address bar instead");
  };
  const download = (name: string, type: string, text: string) => {
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); window.setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const csv = () => {
    const q = (v: unknown) => (v === null || v === undefined ? "" : typeof v === "string" ? `"${v.replace(/"/g, '""')}"` : String(v));
    const lines = [`# Embodied carbon of a structure (likemaestro.github.io); method: IStructE, How to calculate embodied carbon, 2nd ed.; data: ${FACTORS.release.name} ${FACTORS.release.stock} (${FACTORS.release.published}); kgCO2e unless stated`,
      "option,label,row,material,factor_id,dataset_uuid,quantity,unit,kg,element,transport,A1-A3,A4,A5w,biogenic,C2,C3-C4,D"];
    state.o.forEach((o, i) => results[i].rows.forEach((x, k) => {
      const r = o.rows[k], f = x.in.factor, c = x.in.kg === null || !f ? null : compute({ gia: 0, rows: [x.in] });
      lines.push([o.n, o.label, k + 1, f?.label ?? r.f, r.f, f?.source.uuid, r.q, r.u, x.in.kg, r.el, r.tr, c?.a13, c?.a4, c?.a5w, c?.bio, c?.c2, c?.c34, c && c.dMissing === 0 ? c.d : null].map(q).join(","));
    }));
    lines.push("", "option,label,GIA m2,A1-A3,A4,A5w,A5a,A1-A5,A1-A5 per m2,SCORS,biogenic,C1,C2,C3-C4,A-C,A-C per m2,D,P5 per m2,P50 per m2,P95 per m2");
    state.o.forEach((o, i) => { const T = results[i].totals, R = ranges[i]; lines.push([o.n, o.label, o.gia, T.a13, T.a4, T.a5w, T.a5a, T.a15, T.perM2?.a15, T.band, T.bio, T.c1, T.c2, T.c34, T.ac, T.perM2?.ac, T.d, R?.p5, R?.p50, R?.p95].map(q).join(",")); });
    download("embodied-carbon.csv", "text/csv", lines.join("\n") + "\n");
  };
  const openData = () => { setShowData(true); window.requestAnimationFrame(() => document.getElementById("ec-data")?.scrollIntoView({ block: "start" })); };

  // a render function, not a component: a component defined here would remount its inputs on every keystroke
  const option = (o: OptionState, i: number) => {
    const res = results[i], T = res.totals, R = ranges[i] ?? null;
    const edit = (f: (x: OptionState) => void) => update((s) => f(s.o[i]));
    const editRow = (k: number, f: (r: RowState) => void) => edit((x) => f(x.rows[k]));
    const isOpen = (k: number, what: "pick" | "more") => panel === `${o.n}-${k}-${what}`;
    const toggle = (k: number, what: "pick" | "more") => setPanel(isOpen(k, what) ? null : `${o.n}-${k}-${what}`);
    const close = (k: number) => (e: React.KeyboardEvent) => { if (e.key === "Escape") { setPanel(null); setFocusId(`name-${o.n}-${k}`); } };
    const addRow = (el: Element) => { const k = o.rows.length, r = newRow(el); edit((x) => { x.rows.push(r); }); setPanel(`${o.n}-${k}-pick`); setFocusId(`pick-${o.n}-${k}-${r.f}`); };
    const removeRow = (k: number) => {
      const el = o.rows[k].el, left = o.rows.some((r, j) => j !== k && r.el === el);
      edit((x) => { x.rows.splice(k, 1); }); setPanel(null); setFocusId(left ? `add-${o.n}-${el}` : `addel-${o.n}-${el}`);
    };
    const pick = (k: number, f: Factor) => {
      editRow(k, (y) => {
        const old = factorById.get(y.f);
        if (!old || y.tr === TR_DEFAULT[old.group]) y.tr = TR_DEFAULT[f.group];   // a default transport follows the material
        if (y.q === null || (y.u === "m3" && !f.density)) y.u = unitFor(f);
        y.f = f.id; delete y.cf; if (f.group !== "timber") delete y.cert;
      });
      setPanel(null); setFocusId(`q-${o.n}-${k}`);
    };
    const label = (k: number) => `${nameOf(o.rows[k].f)} (${ELEMENTS[o.rows[k].el].toLowerCase()})`;
    const notes: string[] = [];
    res.rows.forEach((x, k) => { if (x.why) notes.push(`${label(k)} not counted: ${x.why[0].toLowerCase()}${x.why.slice(1)}`); });
    if (T.a5a === null) notes.push("A5a (site activities) not included: no construction cost entered.");
    o.rows.forEach((r, k) => { const f = factorOf(r); if (f?.group === "timber" && r.cert === false) notes.push(`${label(k)}: biogenic carbon not counted (timber not certified).`); if (r.cf !== undefined) notes.push(`${label(k)}: own A1–A3 factor ${r.cf.toFixed(2)} kgCO2e/kg.`); });
    if (T.dMissing) notes.push(`Module D not declared for ${T.dMissing} material${T.dMissing > 1 ? "s" : ""}; the D total leaves ${T.dMissing > 1 ? "them" : "it"} out.`);
    const byMaterial = new Map<string, number>();
    res.rows.forEach((x, k) => { const v = T.byRow[k]; if (v !== null && x.in.factor) byMaterial.set(nameOf(x.in.factor.id), (byMaterial.get(nameOf(x.in.factor.id)) ?? 0) + v); });
    const els = Object.keys(ELEMENTS) as Element[], used = els.filter((el) => o.rows.some((r) => r.el === el)), unused = els.filter((el) => !used.includes(el));

    // one material: its name (opens the palette), quantity and unit, its result; below, its transport and waste (open the settings)
    const line = (k: number) => {
      const r = o.rows[k], f = factorOf(r), x = res.rows[k], v = T.byRow[k], name = nameOf(r.f), pickOpen = isOpen(k, "pick"), moreOpen = isOpen(k, "more");
      // tonnes always; m³ for concrete and timber (steel by volume only if a link already has it); kg only if a link has it
      const units: Unit[] = [...(r.u === "kg" ? ["kg" as Unit] : []), "t", ...((f?.density && (f.group === "concrete" || f.group === "timber")) || r.u === "m3" ? ["m3" as Unit] : [])];
      const meta = [r.tr === "custom" ? `${r.road ?? 0} km by road${r.sea ? `, ${r.sea} km by sea` : ""}` : TR_TEXT[r.tr], `waste ${+(100 * (r.wr ?? f?.wasteRate ?? 0)).toFixed(1)} %`,
        ...(f?.group === "timber" ? [r.cert === false ? "not certified" : "certified"] : []), ...(r.cf !== undefined ? [`own factor ${r.cf.toFixed(2)}`] : [])].join(" · ");
      return (
        <li key={k} className="border-b border-rule py-2" onKeyDown={pickOpen || moreOpen ? close(k) : undefined}>
          <div className="flex items-start justify-between gap-3">
            <button type="button" id={`name-${o.n}-${k}`} aria-label={`${name}, change the material`} aria-expanded={pickOpen} onClick={() => toggle(k, "pick")}
              className="group flex min-h-9 min-w-0 items-center gap-1.5 text-left [@media(pointer:coarse)]:min-h-11">
              <span className="underline decoration-rule underline-offset-4 transition-colors duration-150 group-hover:decoration-ink">{name}</span>
              <Chevron open={pickOpen} />
            </button>
            <span className="t-data shrink-0 pt-2">{v === null ? "—" : tq(v)}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <span className="flex items-center gap-1.5">
              <input id={`q-${o.n}-${k}`} aria-label={`Quantity of ${name}, ${ELEMENTS[r.el]}`} type="number" inputMode="decimal" min={0} placeholder="0" value={r.q ?? ""}
                onChange={(e) => editRow(k, (y) => { y.q = e.target.value === "" ? null : Number(e.target.value); })} className={`${fieldCls} w-24 text-right`} />
              {units.length === 1 ? <span className="t-data px-1">{UNIT_TEXT[units[0]]}</span> : (
                <span role="group" aria-label={`Unit for ${name}`} className="flex">
                  {units.map((u) => <button key={u} type="button" aria-pressed={r.u === u} onClick={() => editRow(k, (y) => { y.u = u; })}
                    className={`t-data min-h-9 min-w-9 rounded-[2px] px-1.5 transition-colors duration-150 [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:min-w-11 ${r.u === u ? "bg-ink text-canvas" : "text-ink-2 hover:bg-wash hover:text-ink"}`}>{UNIT_TEXT[u]}</button>)}
                </span>
              )}
            </span>
            <button type="button" aria-label={`${meta}: transport, waste and more for ${name}`} aria-expanded={moreOpen} onClick={() => toggle(k, "more")} className="t-small group flex min-h-9 items-center gap-1.5 text-left text-ink-2 transition-colors duration-150 hover:text-ink [@media(pointer:coarse)]:min-h-11">
              <span>{meta}</span><Chevron open={moreOpen} />
            </button>
          </div>
          {x.why && <p className="t-small mt-1 text-ink">{x.why}</p>}

          {pickOpen && <div className="mb-1 mt-2 flex flex-col gap-3 bg-wash p-3">
            {GROUPS.map((g) => (
              <div key={g} role="group" aria-labelledby={`grp-${o.n}-${k}-${g}`}>
                <p id={`grp-${o.n}-${k}-${g}`} className="t-small text-ink-2">{GROUP_LABEL[g]}</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {FACTORS.factors.filter((ff) => ff.group === g).map((ff) => (
                    <button key={ff.id} id={`pick-${o.n}-${k}-${ff.id}`} type="button" title={ff.label} aria-pressed={ff.id === r.f} onClick={() => (ff.id === r.f ? setPanel(null) : pick(k, ff))} className={chipCls(ff.id === r.f)}>
                      {SHORT[ff.id]?.[1] ?? ff.label}<span className={ff.id === r.f ? "text-canvas/75" : "text-ink-2"}>{f3(ff.a1a3)}<span className="sr-only"> kgCO2e per kg</span></span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div>
              <p className="t-small text-ink-2">Numbers: A1–A3 in kgCO2e/kg, from ÖKOBAUDAT. For a product with its own EPD, enter its factor in the material’s settings.</p>
              <button type="button" className={`${quiet} t-small`} onClick={openData}>Data and sources</button>
            </div>
          </div>}

          {moreOpen && <div className="mb-1 mt-2 flex flex-col gap-4 bg-wash p-3">
            <div role="group" aria-labelledby={`trl-${o.n}-${k}`}>
              <p id={`trl-${o.n}-${k}`} className="t-small text-ink-2">Transport to site</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {(Object.keys(TR_TEXT) as Transport[]).map((tr) => <button key={tr} type="button" aria-pressed={r.tr === tr} className={chipCls(r.tr === tr)}
                  onClick={() => editRow(k, (y) => { y.tr = tr; if (tr === "custom") { y.road ??= 100; y.sea ??= 0; } })}>{TR_TEXT[tr]}</button>)}
              </div>
              {r.tr === "global" && <p className="t-small mt-1 text-ink-2">{SCENARIOS.global.text}.</p>}
            </div>
            {r.tr === "custom" && <div className="grid grid-cols-2 gap-3">
              <Field label="By road, km" htmlFor={`road-${o.n}-${k}`}><input id={`road-${o.n}-${k}`} type="number" inputMode="decimal" min={0} value={r.road ?? 0} onChange={(e) => editRow(k, (y) => { y.road = Math.min(40000, Math.max(0, Number(e.target.value) || 0)); })} className={`${fieldCls} w-full`} /></Field>
              <Field label="By sea, km" htmlFor={`sea-${o.n}-${k}`}><input id={`sea-${o.n}-${k}`} type="number" inputMode="decimal" min={0} value={r.sea ?? 0} onChange={(e) => editRow(k, (y) => { y.sea = Math.min(40000, Math.max(0, Number(e.target.value) || 0)); })} className={`${fieldCls} w-full`} /></Field>
            </div>}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={`Waste rate, % (guide’s default ${Math.round(100 * (f?.wasteRate ?? 0))})`} htmlFor={`wr-${o.n}-${k}`}>
                <input id={`wr-${o.n}-${k}`} type="number" inputMode="decimal" min={0} max={90} step={0.5} value={r.wr === undefined ? "" : +(100 * r.wr).toFixed(2)} placeholder={String(Math.round(100 * (f?.wasteRate ?? 0)))} onChange={(e) => editRow(k, (y) => { if (e.target.value === "") delete y.wr; else y.wr = Math.min(0.9, Math.max(0, Number(e.target.value) / 100)); })} className={`${fieldCls} w-full`} />
              </Field>
              <Field label={`Own A1–A3 factor, kgCO2e/kg (data ${f ? f.a1a3.toFixed(3) : "—"})`} htmlFor={`cf-${o.n}-${k}`}>
                <input id={`cf-${o.n}-${k}`} type="number" inputMode="decimal" min={0} max={50} step={0.01} value={r.cf ?? ""} placeholder="from the data" onChange={(e) => editRow(k, (y) => { if (e.target.value === "") delete y.cf; else y.cf = Math.min(50, Math.max(0, Number(e.target.value))); })} className={`${fieldCls} w-full`} />
              </Field>
            </div>
            {f?.group === "timber" && <label className="t-small flex items-center gap-2 text-ink-2 [@media(pointer:coarse)]:min-h-11">
              <input type="checkbox" className="h-4 w-4 accent-ink" checked={r.cert !== false} onChange={(e) => editRow(k, (y) => { if (e.target.checked) delete y.cert; else y.cert = false; })} />
              Certified (FSC or PEFC): biogenic carbon counted
              <Tip label="Certified timber">The guide counts the carbon stored in timber only when it comes from certified, sustainably managed forests. It is reported apart from A1–A5 and returns at end of life (C3–C4).</Tip>
            </label>}
            <p className="t-small flex flex-wrap items-center gap-x-2 text-ink-2">Move to
              {els.filter((el) => el !== r.el).map((el) => <button key={el} type="button" className={`${quiet} text-ink`} onClick={() => { editRow(k, (y) => { y.el = el; }); setPanel(null); setFocusId(`name-${o.n}-${k}`); }}>{ELEMENTS[el]}</button>)}
            </p>
            {f && <p className="t-small text-ink-2">Data: <a className="link" href={f.source.url} rel="noopener noreferrer">{f.source.name}</a> ({f.source.owner}, {f.source.geography}, {f.source.referenceYear}), A1–A3 {f.a1a3.toFixed(3)} kgCO2e/kg.</p>}
            <div><button type="button" className={`${quiet} t-small`} onClick={() => removeRow(k)}>Remove {name}</button></div>
          </div>}
        </li>
      );
    };

    return (
      <section className={`grid min-w-0 gap-x-8 gap-y-5 lg:grid-cols-[minmax(0,1fr)_25rem] ${state.o.length > 1 ? "xl:grid-cols-1" : ""}`} aria-labelledby={`opt-${o.n}`}>
        <div className="flex min-w-0 flex-col gap-6">
          {/* header: the option's name, then its area and cost written as a line */}
          <div>
            <div className="flex items-baseline justify-between gap-3">
              <label htmlFor={`label-${o.n}`} className="t-small text-ink-2">Option {o.n}</label>
              {state.o.length > 1 && <button type="button" className={`${quiet} t-small`} onClick={() => { update((s) => { s.o.splice(i, 1); }); setActive(0); setPanel(null); }}>Remove option {o.n}</button>}
            </div>
            <input id={`label-${o.n}`} value={o.label} maxLength={40} onChange={(e) => edit((x) => { x.label = e.target.value; })}
              className="t-h3 w-full border-b border-rule bg-transparent py-1 transition-colors duration-150 hover:border-ink-2 focus:border-ink [@media(pointer:coarse)]:min-h-11" />
            <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
              <span className="flex items-center gap-2">
                <label htmlFor={`gia-${o.n}`} className="t-small text-ink-2">Gross internal area</label>
                <input id={`gia-${o.n}`} type="number" inputMode="decimal" min={0} value={o.gia ?? ""} onChange={(e) => edit((x) => { x.gia = e.target.value === "" ? null : Math.max(0, Number(e.target.value)); })} className={`${fieldCls} w-20 text-right`} />
                <span className="t-data">m²</span>
              </span>
              <span className="flex items-center gap-2">
                <label htmlFor={`cost-${o.n}`} className="t-small text-ink-2">Cost of the structure (optional)</label>
                <span className="t-data">£</span>
                <input id={`cost-${o.n}`} type="number" inputMode="decimal" min={0} value={o.cost ?? ""} onChange={(e) => edit((x) => { x.cost = e.target.value === "" ? null : Math.max(0, Number(e.target.value)); })} className={`${fieldCls} w-28 text-right`} />
                <Tip label="Construction cost">IStructE’s rate for site activities (A5a) is 700 kgCO2e per £100,000 and comes from UK data. Leave it empty to exclude site activities.</Tip>
              </span>
            </div>
          </div>
          <h3 id={`opt-${o.n}`} className="sr-only">Option {o.n}: {o.label}</h3>

          {/* materials, grouped by element like a bill of quantities */}
          <div>
            <div className="flex items-baseline justify-between gap-3">
              <p className="t-small text-ink-2">Materials by element. Transport and waste follow the guide’s defaults; change them under each material.</p>
              <p className="t-small shrink-0 text-ink-2">tCO2e</p>
            </div>
            <div className="mt-3 flex flex-col gap-5">
              {used.map((el) => (
                <section key={el} aria-labelledby={`el-${o.n}-${el}`}>
                  <div className="flex items-baseline justify-between gap-3 border-b border-ink pb-1">
                    <h4 id={`el-${o.n}-${el}`} className="font-[520]">{ELEMENTS[el]}</h4>
                    <span className="t-data font-[600]">{tq(T.byElement[el])}</span>
                  </div>
                  <ul>{o.rows.map((r, k) => (r.el === el ? line(k) : null))}</ul>
                  <button type="button" id={`add-${o.n}-${el}`} className={`${quiet} t-small mt-1`} onClick={() => addRow(el)}>+ Add material<span className="sr-only"> to {ELEMENTS[el]}</span></button>
                </section>
              ))}
            </div>
            {unused.length > 0 && <p className="t-small mt-4 flex flex-wrap items-center gap-x-2 text-ink-2">{used.length ? "Add another element" : "Add an element"}
              {unused.map((el) => <button key={el} type="button" id={`addel-${o.n}-${el}`} className={`${quiet} text-ink`} onClick={() => addRow(el)}>{ELEMENTS[el]}</button>)}
            </p>}
          </div>
        </div>
        {/* result card: first on phones, so the number shows first */}
        <div className="flex min-w-0 flex-col gap-4 self-start border border-rule p-4 max-lg:order-first">
          <div>
            <p className="t-small text-ink-2">A1–A5{T.band ? `, SCORS ${T.band}` : ""}</p>
            <p className="t-display mt-1" aria-live="polite">{T.perM2 ? <>{r1(T.perM2.a15)} <span className="t-h3 text-ink-2">kgCO2e/m²</span></> : "—"}</p>
            {!T.perM2 && <p className="t-small mt-1 text-ink">Enter the gross internal area.</p>}
            {T.perM2 && <p className="t-small mt-1 text-ink-2">{t(T.a15)} tCO2e in total</p>}
          </div>
          <ScorsLadder value={T.perM2?.a15 ?? null} band={T.band} />
          {R && <div>
            <p className="t-data">Range P5–P95: {r1(R.p5)}–{r1(R.p95)} kgCO2e/m²</p>
            <div className="mt-1.5"><BandShares r={R} /></div>
            <button type="button" aria-expanded={showRange === o.n} onClick={() => setShowRange(showRange === o.n ? null : o.n)} className={`${quiet} t-small text-ink-2`}>
              Assumed spreads: ± {Math.round(100 * state.sf)} % on factors, ± {Math.round(100 * state.sq)} % on quantities
            </button>
            {showRange === o.n && <div className="mt-2 grid gap-3 bg-wash p-3 sm:grid-cols-2">
              <Field label="Spread of the A1–A3 factors, ± %" htmlFor={`sf-${o.n}`}><input id={`sf-${o.n}`} type="number" min={0} max={90} step={5} value={Math.round(100 * state.sf)} onChange={(e) => update((s) => { s.sf = Math.min(0.9, Math.max(0, (Number(e.target.value) || 0) / 100)); })} className={`${fieldCls} w-full`} /></Field>
              <Field label="Spread of the quantities, ± %" htmlFor={`sq-${o.n}`}><input id={`sq-${o.n}`} type="number" min={0} max={90} step={5} value={Math.round(100 * state.sq)} onChange={(e) => update((s) => { s.sq = Math.min(0.9, Math.max(0, (Number(e.target.value) || 0) / 100)); })} className={`${fieldCls} w-full`} /></Field>
              <p className="t-small text-ink-2 sm:col-span-2">Each of 2,000 samples draws every factor and quantity uniformly within its spread, for every option. Defaults: ± 20 % and ± 10 %, assumptions, not data.</p>
            </div>}
          </div>}
          <table className="t-data w-full border-collapse text-left">
            <caption className="sr-only">Totals for option {o.n}, tCO2e{T.perM2 ? " and kgCO2e per m²" : ""}</caption>
            <thead><tr className="border-b border-ink"><th scope="col" className="py-1 font-[520]">Module</th><th scope="col" className="py-1 text-right font-[520]">tCO2e</th><th scope="col" className="py-1 text-right font-[520]">per m²</th></tr></thead>
            <tbody>
              {([["A1–A3", T.a13], ["A4 transport", T.a4], ["A5w waste", T.a5w], ["A5a site", T.a5a]] as [string, number | null][]).map(([k, v]) => (
                <tr key={k} className="border-b border-rule"><th scope="row" className="py-1 font-normal text-ink-2">{k}</th><td className="py-1 text-right">{v === null ? "not included" : t(v)}</td><td className="py-1 text-right">{v === null || !T.perM2 ? "" : r1(v / o.gia!)}</td></tr>
              ))}
              <tr className="border-b border-ink"><th scope="row" className="py-1 font-[600]">A1–A5</th><td className="py-1 text-right font-[600]">{t(T.a15)}</td><td className="py-1 text-right font-[600]">{T.perM2 ? r1(T.perM2.a15) : "—"}</td></tr>
              {([["Biogenic (apart)", T.bio], ["C1 demolition", T.c1], ["C2 transport", T.c2], ["C3–C4 end of life", T.c34]] as [string, number][]).map(([k, v]) => (
                <tr key={k} className="border-b border-rule"><th scope="row" className="py-1 font-normal text-ink-2">{k}</th><td className="py-1 text-right">{t(v)}</td><td className="py-1 text-right">{T.perM2 ? r1(v / o.gia!) : ""}</td></tr>
              ))}
              <tr className="border-b border-ink"><th scope="row" className="py-1 font-[600]">A–C</th><td className="py-1 text-right font-[600]">{t(T.ac)}</td><td className="py-1 text-right font-[600]">{T.perM2 ? r1(T.perM2.ac) : "—"}</td></tr>
              <tr className="border-b border-rule"><th scope="row" className="py-1 font-normal text-ink-2">D (apart)</th><td className="py-1 text-right">{t(T.d)}</td><td className="py-1 text-right">{T.perM2 ? r1(T.perM2.d) : ""}</td></tr>
            </tbody>
          </table>
          <div className="grid gap-4">
            <Bars title="A1–A5 by element" items={els.map((k) => ({ label: ELEMENTS[k], v: T.byElement[k] }))} />
            <Bars title="A1–A5 by material" items={[...byMaterial].map(([label, v]) => ({ label, v }))} />
          </div>
          {notes.length > 0 && <ul className="t-small flex flex-col gap-1 text-ink-2">{notes.map((n) => <li key={n}>Note: {n}</li>)}</ul>}
        </div>

      </section>
    );
  };

  const shown = state.o.map((o, i) => ({ o, i }));
  return (
    <ToolShell
      path="/tools/embodied-carbon"
      slug="embodied-carbon"
      methodRef={{ label: "IStructE guide", href: "https://www.istructe.org/resources/guidance/how-to-calculate-embodied-carbon/" }}
      method={<>
        <p>The calculation follows the IStructE guide <i>How to calculate embodied carbon</i> (2nd edition, 2022): quantities times carbon factors for modules A1–A3, transport to site (A4), waste and site activities (A5); end of life (C1–C4) and module D as the guide sets out, with biogenic carbon and module D always reported separately (EN 15978, EN 15804).</p>
        <p>Carbon factors for products come from ÖKOBAUDAT ({FACTORS.release.stock}, EN 15804+A2): GWP-fossil plus land use for A1–A3, per kg. Transport, waste and end-of-life defaults are the guide’s. Data and sources lists every dataset.</p>
        <p>The rating uses the IStructE SCORS bands on A1–A5 per m² of gross internal area. The range comes from sampling the carbon factors and quantities within the stated spreads (2,000 seeded samples).</p>
        <p>I work on life cycle assessment of structures: as a teaching assistant on Life-Cycle Driven Structures at Politecnico di Milano, as co-author of <i>Metals Driving Sustainable Construction</i> (Wiley, forthcoming), and in concApp, an early-stage structural design app that optimizes for cost and embodied carbon.</p>
      </>}
      limits={<>
        <p>An early-design estimate, not a certified assessment. Structure only: substructure and superstructure.</p>
        <p>Generic European factors, mostly German industry averages; specific EPDs will differ. There is no blast-furnace dataset for steel sections in ÖKOBAUDAT: the plates show that route. Hollow sections, precast hollow-core slabs and reused steel need a custom factor.</p>
        <p>Transport and waste defaults are UK-based guide values; A5 site activities use a UK cost-based rate and are optional.</p>
        <p>The 3rd edition of the guide (2025) splits A5 into four parts, adds an uncertainty factor and allowances for unmodelled items; this tool does not include them yet.</p>
        <p>The spreads behind the range are assumptions you can change.</p>
      </>}
    >
      {clamped.length > 0 && <p className="t-small mb-4 text-ink-2">The link’s options could not be read and the example is shown instead.</p>}

      {/* top bar: one action, then quiet links */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 pb-4">
        {state.o.length > 1 && <div className="xl:hidden"><Segmented label="Option" value={state.o[act].n} onChange={(v) => { setActive(state.o.findIndex((o) => o.n === v)); setPanel(null); }} options={state.o.map((o) => ({ v: o.n, text: `Option ${o.n}` }))} /></div>}
        {state.o.length < 3 ? <button type="button" className="btn btn-solid" onClick={addOption}>Add an option to compare</button> : <span className="t-small text-ink-2">Three options at most.</span>}
        <div className="flex flex-wrap items-center gap-x-4">
          <button type="button" className={`${quiet} t-data`} onClick={share}>Share link</button>
          <button type="button" className={`${quiet} t-data`} onClick={csv}>CSV</button>
          <button type="button" className={`${quiet} t-data`} onClick={() => download("embodied-carbon.json", "application/json", JSON.stringify(state, null, 1))}>JSON</button>
          <button type="button" className={`${quiet} t-data`} aria-expanded={showData} onClick={() => setShowData((v) => !v)}>Data and sources</button>
        </div>
        <span className={status ? "t-small text-ink-2" : "sr-only"} role="status" aria-live="polite">{status}</span>
      </div>
      {showData && <div id="ec-data" className="scroll-mt-4 border-t border-rule py-4">
        <p className="t-small text-ink-2">{FACTORS.release.name}, release {FACTORS.release.stock} ({FACTORS.release.published}), EN 15804+A2. Values per kg; A1–A3 is GWP-fossil plus GWP-luluc; C3–C4 and D are GWP-total in each dataset’s default end-of-life scenario. Every dataset: “Free of charge for all users and uses”.</p>
        <div className="mt-3 overflow-x-auto">
          <table className="t-data w-full min-w-[56rem] border-collapse text-left">
            <caption className="sr-only">Carbon factors and their sources</caption>
            <thead><tr className="border-b border-ink">{["Material", "A1–A3", "Biogenic", "C3–C4", "D", "Dataset (owner, region)", "Valid until"].map((h) => <th key={h} scope="col" className="py-1 pr-3 font-[520]">{h}</th>)}</tr></thead>
            <tbody>{FACTORS.factors.map((f) => (
              <tr key={f.id} className="border-b border-rule align-top">
                <td className="py-1 pr-3">{f.label}</td><td className="py-1 pr-3">{f.a1a3.toFixed(3)}</td><td className="py-1 pr-3">{f.biogenic?.toFixed(3) ?? "–"}</td>
                <td className="py-1 pr-3">{f.c3c4?.toFixed(4) ?? "–"}</td><td className="py-1 pr-3">{f.d?.toFixed(3) ?? "not declared"}</td>
                <td className="py-1 pr-3"><a className="link" href={f.source.url} rel="noopener noreferrer">{f.source.name}</a> ({f.source.owner}, {f.source.geography})</td><td className="py-1 pr-3">{f.source.validUntil}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>}

      {/* options: side by side from xl, one at a time below */}
      <div className={`grid gap-x-8 gap-y-10 border-t border-rule pt-6 ${state.o.length === 2 ? "xl:grid-cols-2" : state.o.length === 3 ? "xl:grid-cols-3" : ""}`}>
        {shown.map(({ o, i }) => <div key={o.n} className={`min-w-0 ${i === act ? "" : "max-xl:hidden"}`}>{option(o, i)}</div>)}
      </div>

      {/* comparison */}
      <div className="mt-10 border-t border-rule pt-6">
        <h3 className="font-[520]">Comparison</h3>
        <div className="mt-3 max-w-3xl"><Compare items={state.o.map((o, i) => ({ name: o.n, label: o.label, v: results[i].totals.perM2?.a15 ?? null, r: ranges[i] ?? null }))} /></div>
        <p className="t-small mt-3 text-ink">Typical new-build structures fall between 150 and 400 kgCO2e/m² (SCORS B to G) (IStructE, 2.3.3).</p>
        {isExample(state.o[0]) && <p className="t-small mt-1 text-ink-2">The guide’s UK factors give 163 kgCO2e/m² for this pavilion; the European factors here give {results[0].totals.perM2 ? r1(results[0].totals.perM2.a15) : "—"}.</p>}
      </div>
    </ToolShell>
  );
};

export default EmbodiedCarbon;

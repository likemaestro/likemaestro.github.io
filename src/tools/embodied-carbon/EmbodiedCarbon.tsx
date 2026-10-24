import React, { useEffect, useMemo, useState } from "react";
import ToolShell, { copy } from "../ToolShell";
import { useToolParams } from "../useToolParams";
import { Field, Segmented, Tip } from "../controls";
import { FACTORS, type Factor } from "../carbon/factors";
import { compute, ELEMENTS, SCENARIOS, type Element, type RowIn, type Totals, type Transport } from "./calc";
import { range, type Range } from "./mc";
import { decode, DEFAULT, encode, factorOf, toKg, type OptionState, type RowState, type State, type Unit } from "./state";
import { BandShares, Bars, Compare, ScorsLadder } from "./Charts";

const SPEC = { s: { kind: "text", ok: (v: string) => v === "" || decode(v) !== null, def: "" } } as const;
const NAMES = ["A", "B", "C"] as const;
const GROUP_LABEL: Record<Factor["group"], string> = { steel: "Steel", rebar: "Reinforcement", concrete: "Concrete", timber: "Timber", other: "Other" };
const TRANSPORT_TEXT: Record<Transport, string> = { local: "Local (50 km)", national: "National (300 km)", european: "European (1,500 km)", global: "Global (road + sea)", custom: "Custom" };
const UNIT_TEXT: Record<Unit, string> = { kg: "kg", t: "t", m3: "m³" };
const t = (kg: number) => Math.round(kg / 1000).toLocaleString("en-US").replace(/,/g, " ");
const r1 = (v: number) => Math.round(v).toLocaleString("en-US").replace(/,/g, " ");
const inputCls = "t-data h-9 w-full rounded-[2px] border border-rule bg-transparent px-2 [@media(pointer:coarse)]:h-11";

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
  const [active, setActive] = useState(0), [openRow, setOpenRow] = useState<string | null>(null), [status, setStatus] = useState(""), [showData, setShowData] = useState(false), [showRange, setShowRange] = useState(false);
  const flash = (m: string) => { setStatus(m); window.setTimeout(() => setStatus(""), 3000); };
  const act = Math.min(active, state.o.length - 1);

  const results = useMemo(() => state.o.map(evaluate), [state]);
  // the range, 300 ms after the last edit
  const [ranges, setRanges] = useState<(Range | null)[]>([]);
  useEffect(() => {
    const id = window.setTimeout(() => setRanges(state.o.map((o, i) => range({ gia: o.gia ?? 0, cost: o.cost ?? undefined, rows: results[i].rows.map((x) => x.in) }, state.sf, state.sq, state.seed))), 300);
    return () => window.clearTimeout(id);
  }, [results, state.sf, state.sq, state.seed]);   // eslint-disable-line react-hooks/exhaustive-deps

  const addOption = () => update((s) => { const src = s.o[act], n = NAMES.find((x) => !s.o.some((o) => o.n === x))!; s.o.push({ ...JSON.parse(JSON.stringify(src)), n, label: `${src.label.slice(0, 30)} (copy)` }); s.o.sort((a, b) => a.n.localeCompare(b.n)); setActive(s.o.findIndex((o) => o.n === n)); });
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

  // a render function, not a component: a component defined here would remount its inputs on every keystroke
  const option = (o: OptionState, i: number) => {
    const res = results[i], T = res.totals, R = ranges[i] ?? null, open = openRow?.startsWith(`${o.n}-`) ? Number(openRow.slice(2)) : null;
    const setOpen = (k: number | null) => setOpenRow(k === null ? null : `${o.n}-${k}`);
    const edit = (f: (x: OptionState) => void) => update((s) => f(s.o[i]));
    const editRow = (k: number, f: (r: RowState) => void) => edit((x) => f(x.rows[k]));
    const notes: string[] = [];
    res.rows.forEach((x, k) => { if (x.why) notes.push(`Row ${k + 1} excluded: ${x.why}`); });
    if (T.a5a === null) notes.push("A5a (site activities) not included: no construction cost entered.");
    o.rows.forEach((r, k) => { const f = factorOf(r); if (f?.group === "timber" && r.cert === false) notes.push(`Row ${k + 1}: biogenic carbon not counted (timber not certified).`); if (r.cf !== undefined) notes.push(`Row ${k + 1}: custom A1–A3 factor ${r.cf.toFixed(2)} kgCO2e/kg.`); });
    if (T.dMissing) notes.push(`Module D not declared for ${T.dMissing} row${T.dMissing > 1 ? "s" : ""}; the D total leaves ${T.dMissing > 1 ? "them" : "it"} out.`);
    const byMaterial = new Map<string, number>();
    res.rows.forEach((x, k) => { const v = T.byRow[k]; if (v !== null && x.in.factor) byMaterial.set(x.in.factor.label, (byMaterial.get(x.in.factor.label) ?? 0) + v); });

    return (
      <section className={`grid min-w-0 gap-x-8 gap-y-5 lg:grid-cols-[minmax(0,1fr)_25rem] ${state.o.length > 1 ? "xl:grid-cols-1" : ""}`} aria-labelledby={`opt-${o.n}`}>
        <div className="flex min-w-0 flex-col gap-5">
        {/* header */}
        <div className={`grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem_11rem] ${state.o.length > 1 ? "xl:grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_7rem_9rem]" : ""}`}>
          <Field label={`Option ${o.n}`} htmlFor={`label-${o.n}`}>
            <input id={`label-${o.n}`} value={o.label} maxLength={40} onChange={(e) => edit((x) => { x.label = e.target.value; })} className="t-h3 w-full rounded-[2px] border border-rule bg-transparent px-2 py-1 [@media(pointer:coarse)]:min-h-11" />
          </Field>
          <Field label="GIA, m²" htmlFor={`gia-${o.n}`}>
            <input id={`gia-${o.n}`} type="number" inputMode="decimal" min={0} value={o.gia ?? ""} onChange={(e) => edit((x) => { x.gia = e.target.value === "" ? null : Math.max(0, Number(e.target.value)); })} className={inputCls} />
          </Field>
          <Field label="Cost of the structure, £ (optional)" htmlFor={`cost-${o.n}`}>
            <div className="flex items-center gap-1">
              <input id={`cost-${o.n}`} type="number" inputMode="decimal" min={0} value={o.cost ?? ""} onChange={(e) => edit((x) => { x.cost = e.target.value === "" ? null : Math.max(0, Number(e.target.value)); })} className={inputCls} />
              <Tip label="Construction cost">IStructE’s rate for site activities (A5a) is 700 kgCO2e per £100,000 and comes from UK data. Leave it empty to exclude site activities.</Tip>
            </div>
          </Field>
        </div>
        <h3 id={`opt-${o.n}`} className="sr-only">Option {o.n}: {o.label}</h3>

        {/* materials */}
        <div>
          <h4 className="font-[520]">Materials</h4>
          <ul className="mt-2 flex flex-col gap-2">
            {o.rows.map((r, k) => {
              const f = factorOf(r), x = res.rows[k], v = T.byRow[k], timber = f?.group === "timber";
              return (
                <li key={k} className={`border p-2 ${x.why ? "border-ink" : "border-rule"}`}>
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <select aria-label={`Material, row ${k + 1}`} value={f ? r.f : ""} onChange={(e) => editRow(k, (y) => { y.f = e.target.value; delete y.cf; })} className={inputCls}>
                      {!f && <option value="">Choose a material</option>}
                      {(["steel", "rebar", "concrete", "timber"] as const).map((g) => (
                        <optgroup key={g} label={GROUP_LABEL[g]}>{FACTORS.factors.filter((ff) => ff.group === g).map((ff) => <option key={ff.id} value={ff.id}>{ff.label}</option>)}</optgroup>
                      ))}
                    </select>
                    <p className="t-data self-center text-right">{v === null ? "—" : `${t(v)} t`}</p>
                  </div>
                  <div className="mt-2 grid grid-cols-[minmax(0,1fr)_5rem] gap-2 sm:grid-cols-[minmax(0,6rem)_4.5rem_minmax(0,1fr)_minmax(0,1fr)_auto]">
                    <input aria-label={`Quantity, row ${k + 1}`} type="number" inputMode="decimal" min={0} value={r.q ?? ""} onChange={(e) => editRow(k, (y) => { y.q = e.target.value === "" ? null : Number(e.target.value); })} className={inputCls} />
                    <select aria-label={`Unit, row ${k + 1}`} value={r.u} onChange={(e) => editRow(k, (y) => { y.u = e.target.value as Unit; })} className={inputCls}>
                      {(Object.keys(UNIT_TEXT) as Unit[]).map((u) => <option key={u} value={u}>{UNIT_TEXT[u]}</option>)}
                    </select>
                    <select aria-label={`Element, row ${k + 1}`} value={r.el} onChange={(e) => editRow(k, (y) => { y.el = e.target.value as Element; })} className={`${inputCls} max-sm:col-span-2`}>
                      {(Object.keys(ELEMENTS) as Element[]).map((el) => <option key={el} value={el}>{ELEMENTS[el]}</option>)}
                    </select>
                    <select aria-label={`Transport, row ${k + 1}`} value={r.tr} onChange={(e) => editRow(k, (y) => { y.tr = e.target.value as Transport; if (y.tr === "custom") { y.road ??= 100; y.sea ??= 0; } })} className={`${inputCls} max-sm:col-span-2`}>
                      {(Object.keys(TRANSPORT_TEXT) as Transport[]).map((tr) => <option key={tr} value={tr}>{TRANSPORT_TEXT[tr]}</option>)}
                    </select>
                    <div className="flex gap-2 max-sm:col-span-2 max-sm:justify-end">
                      <button type="button" className="btn" aria-expanded={open === k} aria-label={`More settings, row ${k + 1}`} onClick={() => setOpen(open === k ? null : k)}>⋯</button>
                      <button type="button" className="btn" aria-label={`Remove row ${k + 1}`} onClick={() => edit((y) => { y.rows.splice(k, 1); })}>×</button>
                    </div>
                  </div>
                  {r.tr === "custom" && <div className="mt-2 grid grid-cols-2 gap-2">
                    <Field label="Road, km" htmlFor={`road-${o.n}-${k}`}><input id={`road-${o.n}-${k}`} type="number" min={0} value={r.road ?? 0} onChange={(e) => editRow(k, (y) => { y.road = Math.max(0, Number(e.target.value) || 0); })} className={inputCls} /></Field>
                    <Field label="Sea, km" htmlFor={`sea-${o.n}-${k}`}><input id={`sea-${o.n}-${k}`} type="number" min={0} value={r.sea ?? 0} onChange={(e) => editRow(k, (y) => { y.sea = Math.max(0, Number(e.target.value) || 0); })} className={inputCls} /></Field>
                  </div>}
                  {open === k && <div className="mt-2 grid gap-2 border-t border-rule pt-2 sm:grid-cols-2">
                    <Field label={`Waste rate, % (default ${Math.round(100 * (f?.wasteRate ?? 0))})`} htmlFor={`wr-${o.n}-${k}`}>
                      <input id={`wr-${o.n}-${k}`} type="number" min={0} max={90} step={0.5} value={r.wr === undefined ? "" : +(100 * r.wr).toFixed(2)} placeholder={String(Math.round(100 * (f?.wasteRate ?? 0)))} onChange={(e) => editRow(k, (y) => { if (e.target.value === "") delete y.wr; else y.wr = Math.min(0.9, Math.max(0, Number(e.target.value) / 100)); })} className={inputCls} />
                    </Field>
                    <Field label={`Custom A1–A3 factor, kgCO2e/kg (data: ${f ? f.a1a3.toFixed(3) : "—"})`} htmlFor={`cf-${o.n}-${k}`}>
                      <input id={`cf-${o.n}-${k}`} type="number" min={0} max={50} step={0.01} value={r.cf ?? ""} placeholder="from the data" onChange={(e) => editRow(k, (y) => { if (e.target.value === "") delete y.cf; else y.cf = Math.min(50, Math.max(0, Number(e.target.value))); })} className={inputCls} />
                    </Field>
                    {timber && <label className="t-small flex items-center gap-2 text-ink-2">
                      <input type="checkbox" className="accent-ink" checked={r.cert !== false} onChange={(e) => editRow(k, (y) => { if (e.target.checked) delete y.cert; else y.cert = false; })} />
                      Certified (FSC or PEFC): biogenic carbon counted
                      <Tip label="Certified timber">The guide counts the carbon stored in timber only when it comes from certified, sustainably managed forests. It is reported apart from A1–A5 and returns at end of life (C3–C4).</Tip>
                    </label>}
                  </div>}
                  {x.why && <p className="t-small mt-1.5 text-ink">{x.why}</p>}
                </li>
              );
            })}
          </ul>
          <button type="button" className="btn mt-2" onClick={() => edit((x) => { x.rows.push({ f: "steel-sections-eaf", q: 1, u: "t", el: "frame", tr: "national" }); })}>Add material</button>
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
            <Bars title="A1–A5 by element" items={(Object.keys(ELEMENTS) as Element[]).map((k) => ({ label: ELEMENTS[k], v: T.byElement[k] }))} />
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

      {/* top bar */}
      <div className="flex flex-wrap items-end gap-x-3 gap-y-3 pb-4">
        {state.o.length > 1 && <div className="xl:hidden"><Segmented label="Option" value={state.o[act].n} onChange={(v) => setActive(state.o.findIndex((o) => o.n === v))} options={state.o.map((o) => ({ v: o.n, text: `Option ${o.n}` }))} /></div>}
        <button type="button" className="btn" disabled={state.o.length >= 3} onClick={addOption}>Add option</button>
        {state.o.length >= 3 && <Tip label="Add option">Three options at most.</Tip>}
        <button type="button" className="btn" disabled={state.o.length <= 1} onClick={() => update((s) => { s.o.splice(act, 1); setActive(0); })}>Remove option {state.o[act].n}</button>
        <button type="button" className="btn" onClick={share}>Share link</button>
        <button type="button" className="btn" onClick={csv}>CSV</button>
        <button type="button" className="btn" onClick={() => download("embodied-carbon.json", "application/json", JSON.stringify(state, null, 1))}>JSON</button>
        <button type="button" className="btn" aria-expanded={showRange} onClick={() => setShowRange((v) => !v)}>Range settings</button>
        <button type="button" className="btn" aria-expanded={showData} onClick={() => setShowData((v) => !v)}>Data and sources</button>
        <span className={status ? "t-small text-ink-2" : "sr-only"} role="status" aria-live="polite">{status}</span>
      </div>
      {showRange && <div className="grid max-w-xl gap-3 border-t border-rule py-4 sm:grid-cols-2">
        <Field label="Spread of the A1–A3 factors, ± %" htmlFor="ec-sf"><input id="ec-sf" type="number" min={0} max={90} step={5} value={Math.round(100 * state.sf)} onChange={(e) => update((s) => { s.sf = Math.min(0.9, Math.max(0, (Number(e.target.value) || 0) / 100)); })} className={inputCls} /></Field>
        <Field label="Spread of the quantities, ± %" htmlFor="ec-sq"><input id="ec-sq" type="number" min={0} max={90} step={5} value={Math.round(100 * state.sq)} onChange={(e) => update((s) => { s.sq = Math.min(0.9, Math.max(0, (Number(e.target.value) || 0) / 100)); })} className={inputCls} /></Field>
        <p className="t-small text-ink-2 sm:col-span-2">Each of 2,000 samples draws every factor and quantity uniformly within its spread. Defaults: ± 20 % and ± 10 %, assumptions, not data.</p>
      </div>}
      {showData && <div className="border-t border-rule py-4">
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

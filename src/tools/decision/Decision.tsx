import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ToolShell from "../ToolShell";
import { Field, Segmented, Tip } from "../controls";
import { ahp, normalize, relink, smaa2, topsis, vikorChoice, vikorDetail } from "../mcdm";

// The decision table as edited: names, directions (up: higher is better) and raw cell text, so a half-typed number
// survives. It lives in the link as one JSON parameter.
interface Table { crit: string[]; up: boolean[]; alts: string[]; x: string[][] }
const EXAMPLE: Table = {
  crit: ["Rent, €/month", "Commute, min", "Floor area, m²", "Energy use, kWh/m²·yr"],
  up: [false, false, true, false],
  alts: ["Flat A", "Flat B", "Flat C", "Flat D"],
  x: [["950", "35", "55", "120"], ["1200", "15", "48", "90"], ["800", "50", "62", "160"], ["1050", "25", "70", "140"]],
};
const MAX_ALTS = 8, MAX_CRIT = 6, SAMPLES = 10000;
const VERBAL = ["equally", "equally to moderately", "moderately", "moderately to strongly", "strongly", "strongly to very strongly", "very strongly", "very strongly to extremely", "extremely"];

const parseCell = (s: string) => { const v = s.trim().replace(/\s/g, "").replace(",", "."); return v === "" ? NaN : Number(v); };
const ints = (s: string | null, len: number, lo: number, hi: number) => {
  const v = (s ?? "").split(",").map(Number);
  return s && v.length === len && v.every((x) => Number.isInteger(x) && x >= lo && x <= hi) ? v : null;
};
function readTable(s: string | null): Table {
  try {
    const [crit, up, alts, x] = JSON.parse(s ?? "");
    const n = crit.length, m = alts.length;
    if (n >= 2 && n <= MAX_CRIT && m >= 2 && m <= MAX_ALTS && typeof up === "string" && up.length === n && x.length === m && x.every((r: unknown) => Array.isArray(r) && r.length === n))
      return { crit: crit.map(String), up: Array.from(up as string, (c) => c === "1"), alts: alts.map(String), x: x.map((r: unknown[]) => r.map(String)) };
  } catch {}
  return EXAMPLE;
}
const writeTable = (t: Table) => JSON.stringify([t.crit, t.up.map((u) => (u ? "1" : "0")).join(""), t.alts, t.x]);
const pct = (v: number) => (v > 0 && v < 0.005 ? "<1 %" : `${Math.round(v * 100)} %`);
// rank acceptability as a grey from canvas (0) to mid grey (1), so ink text stays readable on every cell
const shade = (b: number) => `rgb(${[[0xf6, 0x17], [0xf7, 0x20], [0xf5, 0x27]].map(([a, z]) => Math.round(a + (z - a) * 0.5 * b)).join(",")})`;
const Dot: React.FC<{ on: boolean }> = ({ on }) => <span aria-hidden="true" className={`inline-block h-2 w-2 shrink-0 rounded-full ${on ? "bg-laser" : "bg-transparent"}`} />;

const cell = "t-data h-9 rounded-[2px] border bg-transparent px-2 transition-colors duration-150 hover:border-rule focus:border-ink focus:outline-none [@media(pointer:coarse)]:h-11";
const xBtn = "inline-flex h-7 w-7 shrink-0 items-center justify-center text-ink-2 transition-colors duration-150 hover:text-ink [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11";
const Cross = () => <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 4l8 8M12 4l-8 8" /></svg>;

const Decision: React.FC = () => {
  const [sp, setSp] = useSearchParams();
  const [note, setNote] = useState("");
  // The settings live in this state and the link mirrors them: the router updates the link asynchronously, and inputs
  // read straight from it would lose keystrokes and their caret.
  const [q, setQ] = useState(() => new URLSearchParams(sp));
  useEffect(() => { if (q.toString() !== sp.toString()) setSp(q, { replace: true }); }, [q]);   // eslint-disable-line react-hooks/exhaustive-deps
  const patch = (o: Record<string, string | null>) => setQ((prev) => {
    const next = new URLSearchParams(prev);
    Object.entries(o).forEach(([k, v]) => (v === null ? next.delete(k) : next.set(k, v)));
    return next;
  });

  const t = useMemo(() => readTable(q.get("t")), [q]);
  const n = t.crit.length, m = t.alts.length, isExample = writeTable(t) === writeTable(EXAMPLE);
  // a change in the number of criteria resets the weights, the comparisons and the order, which are per criterion
  const edit = (f: (d: Table) => void, reset = false) => {
    const d: Table = { crit: [...t.crit], up: [...t.up], alts: [...t.alts], x: t.x.map((r) => [...r]) };
    f(d);
    patch({ t: writeTable(d), ...(reset ? { w: null, p: null, o: null } : {}) });
  };

  // weights: linked sliders, or AHP from one comparison per pair (s < 0: the left criterion matters more, by 1 − s)
  const pairs: [number, number][] = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) pairs.push([i, j]);
  const wmode = q.get("wm") === "ahp" ? "ahp" : "sliders";
  const sliders = normalize(ints(q.get("w"), n, 0, 100) ?? new Array(n).fill(1));
  const pv = ints(q.get("p"), pairs.length, -8, 8) ?? new Array(pairs.length).fill(0);
  const A = Array.from({ length: n }, () => new Array(n).fill(1));
  pairs.forEach(([i, j], k) => { const s = pv[k], a = s <= 0 ? 1 - s : 1 / (1 + s); A[i][j] = a; A[j][i] = 1 / a; });
  const AH = ahp(A);
  const weights = wmode === "ahp" ? AH.w : sliders;
  const shares = weights.map((v) => Math.round(v * 100));
  shares[n - 1] = 100 - shares.slice(0, -1).reduce((a, b) => a + b, 0);
  const setWeight = (j: number, v: number) => patch({ w: relink(sliders, j, v).map((x) => Math.round(x * 100)).join(",") });
  const setPair = (k: number, v: number) => { const next = [...pv]; next[k] = v; patch({ p: next.join(",") }); };
  const pairText = (k: number) => {
    const [i, j] = pairs[k], s = pv[k];
    return s === 0 ? "Equally important" : `${s < 0 ? t.crit[i] : t.crit[j]}: ${VERBAL[Math.abs(s)]} more important (${1 + Math.abs(s)})`;
  };

  // SMAA-2 weight information
  const smode = (["none", "order", "around"].includes(q.get("sm") ?? "") ? q.get("sm") : "none") as "none" | "order" | "around";
  const order = (() => { const o = ints(q.get("o"), n, 0, n - 1); return o && new Set(o).size === n ? o : Array.from({ length: n }, (_, j) => j); })();
  const spread = Math.min(50, Math.max(5, Math.round(Number(q.get("sp") ?? 20)) || 20));
  const move = (r: number, d: number) => { const o = [...order]; [o[r], o[r + d]] = [o[r + d], o[r]]; patch({ o: o.join(",") }); };

  const nums = t.x.map((r) => r.map(parseCell));
  const bad = nums.flat().filter((v) => !Number.isFinite(v)).length;
  const key = JSON.stringify([nums, t.up, weights, smode, order, spread]);   // TOPSIS and VIKOR use the weights in every mode
  const res = useMemo(() => {
    if (bad) return null;
    const T = topsis(nums, weights, t.up), V = vikorDetail(nums, weights, t.up), C = vikorChoice(V.S, V.R, V.Q);
    const info = smode === "order" ? { kind: "order" as const, order } : smode === "around" ? { kind: "around" as const, w: weights, spread: spread / 100 } : { kind: "none" as const };
    return { T, V, C, S: smaa2(nums, t.up, info, SAMPLES, 1) };
  }, [key]);   // eslint-disable-line react-hooks/exhaustive-deps
  const byTopsis = res ? t.alts.map((_, i) => i).sort((a, b) => res.T[b] - res.T[a]) : [];
  const bySmaa = res ? t.alts.map((_, i) => i).sort((a, b) => res.S.holistic[b] - res.S.holistic[a]) : [];

  // a block pasted from a spreadsheet replaces the table; a single value goes into the cell as usual
  const onPaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text/plain");
    const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim() !== "");
    const sep = text.includes("\t") ? "\t" : lines.length > 1 ? (lines[0].includes(";") ? ";" : ",") : null;
    if (!sep) return;
    e.preventDefault();
    const rows = lines.map((l) => l.split(sep).map((c) => c.trim())), num = (s: string) => Number.isFinite(parseCell(s));
    const head = rows[0].slice(1).some((c) => !num(c)), body = head ? rows.slice(1) : rows;
    const names = body.some((r) => !num(r[0] ?? ""));
    const width = Math.max(...rows.map((r) => r.length)) - (names ? 1 : 0), nn = Math.min(MAX_CRIT, width), mm = Math.min(MAX_ALTS, body.length);
    if (nn < 2 || mm < 2) { setNote("That block is smaller than 2 options by 2 criteria, so the table stays as it was."); return; }
    const off = names ? 1 : 0;
    edit((d) => {
      d.crit = Array.from({ length: nn }, (_, j) => (head ? rows[0][j + off] : "") || `Criterion ${j + 1}`);
      d.up = new Array(nn).fill(false);
      d.alts = body.slice(0, mm).map((r, i) => (names ? r[0] : "") || `Option ${i + 1}`);
      d.x = body.slice(0, mm).map((r) => Array.from({ length: nn }, (_, j) => r[j + off] ?? ""));
    }, true);
    setNote(`Pasted ${mm} options by ${nn} criteria${width > nn || body.length > mm ? ` (up to ${MAX_ALTS} by ${MAX_CRIT} fit; the rest was left out)` : ""}. Each criterion starts as lower is better: set the direction where higher is better.`);
  };

  const vikorText = res && (res.C.set.length === 1
    ? `${t.alts[res.C.set[0]]} is VIKOR's choice: a clear lead in Q, and also best by S or R.`
    : `No single winner: ${res.C.set.map((i) => t.alts[i]).join(", ")} form the compromise set, because ${res.C.advantage
      ? `${t.alts[res.C.order[0]]} leads in Q but is best neither by S nor by R`
      : `the lead in Q is under 1 / (m − 1) = ${(1 / (m - 1)).toFixed(2)}`}.`);

  return (
    <ToolShell
      path="/tools/decision"
      slug="decision"
      methodRef={{ label: "Lahdelma and Salminen 2001", href: "https://doi.org/10.1287/opre.49.3.444.11220" }}
      method={<>
        <p>Every method works on the table as costs: a criterion where higher is better is negated first. TOPSIS (<a className="link" href="https://doi.org/10.1007/978-3-642-48318-9" rel="noopener noreferrer">Hwang and Yoon 1981</a>) normalizes each column by its length and ranks by closeness to the ideal option against the anti-ideal one. VIKOR (<a className="link" href="https://doi.org/10.1016/S0377-2217(03)00020-1" rel="noopener noreferrer">Opricovic and Tzeng 2004</a>) ranks by Q, a mix (v = 0.5) of the weighted sum of shortfalls S and the largest single shortfall R, and proposes one option only if it leads clearly and is stable.</p>
        <p>AHP (<a className="link" href="https://doi.org/10.1016/0377-2217(90)90057-I" rel="noopener noreferrer">Saaty 1990</a>) turns one judgement per pair of criteria, on the 1 to 9 scale, into weights: the principal eigenvector of the comparison matrix. The consistency ratio divides the consistency index by the random index, the mean index of random comparison matrices; the published tables of that index differ slightly between sources, so here it is estimated from 100,000 random matrices per size (0.525, 0.881, 1.108 and 1.247 for 3 to 6 criteria).</p>
        <p>SMAA-2 (Lahdelma and Salminen 2001) scores each option by a weighted sum of its criteria, each scaled from the worst option (0) to the best (1), for 10,000 weight vectors drawn from what is known about the weights, with a fixed seed so a link always gives the same numbers. Rank acceptability is the share of those weights that puts an option at each rank; central weights are the average weights where it comes first; holistic acceptability weighs the ranks linearly, from 1 for first to 0 for last.</p>
      </>}
      limits={<>
        <p>All three methods assume the criteria can be traded against each other and treat each one as linear between its worst and best values. They rank only the options in the table: adding or removing one can change the order of the others.</p>
        <p>The flats are made up to show the methods. A teaching tool, not decision advice; everything stays in your browser.</p>
      </>}
    >
      {/* The decision table */}
      <p className="t-small text-ink-2">{isExample ? "Made-up flats to show the methods. Edit any cell, or paste a table from a spreadsheet." : "Your table. Paste a block from a spreadsheet to replace it."}</p>
      <div className="mt-3 overflow-x-auto" onPaste={onPaste}>
        <table className="w-auto border-collapse">
          <caption className="sr-only">Options by criteria</caption>
          <thead>
            <tr>
              <th scope="col" className="t-small w-44 pb-2 pl-2 text-left align-bottom font-normal text-ink-2">Option</th>
              {t.crit.map((c, j) => (
                <th key={j} scope="col" className="px-1 pb-2 text-left align-bottom font-normal">
                  <div className="flex items-center">
                    <input aria-label={`Criterion ${j + 1}`} value={c} onChange={(e) => edit((d) => { d.crit[j] = e.target.value; })} className={`${cell} w-44 border-transparent font-[520]`} />
                    {n > 2 && <button type="button" aria-label={`Remove ${c}`} className={xBtn} onClick={() => edit((d) => { d.crit.splice(j, 1); d.up.splice(j, 1); d.x.forEach((r) => r.splice(j, 1)); }, true)}><Cross /></button>}
                  </div>
                  <button type="button" aria-pressed={t.up[j]} onClick={() => edit((d) => { d.up[j] = !d.up[j]; })}
                    className="t-small ml-2 mt-0.5 inline-flex min-h-[1.75rem] items-center gap-1 text-ink-2 transition-colors duration-150 hover:text-ink [@media(pointer:coarse)]:min-h-[44px]">
                    {t.up[j] ? "↑ higher is better" : "↓ lower is better"}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {t.alts.map((a, i) => (
              <tr key={i} className="border-t border-rule">
                <th scope="row" className="py-1 pr-1 text-left font-normal">
                  <div className="flex items-center">
                    <input aria-label={`Option ${i + 1}`} value={a} onChange={(e) => edit((d) => { d.alts[i] = e.target.value; })} className={`${cell} w-36 border-transparent`} />
                    {m > 2 && <button type="button" aria-label={`Remove ${a}`} className={xBtn} onClick={() => edit((d) => { d.alts.splice(i, 1); d.x.splice(i, 1); })}><Cross /></button>}
                  </div>
                </th>
                {t.x[i].map((v, j) => (
                  <td key={j} className="px-1 py-1">
                    <input inputMode="decimal" aria-label={`${a}, ${t.crit[j]}`} aria-invalid={!Number.isFinite(nums[i][j])} value={v}
                      onChange={(e) => edit((d) => { d.x[i][j] = e.target.value; })} className={`${cell} w-24 ${Number.isFinite(nums[i][j]) ? "border-transparent" : "border-ink"}`} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" className="btn" disabled={m >= MAX_ALTS} onClick={() => edit((d) => { d.alts.push(`Option ${m + 1}`); d.x.push(new Array(n).fill("")); })}>Add option</button>
        <button type="button" className="btn" disabled={n >= MAX_CRIT} onClick={() => edit((d) => { d.crit.push(`Criterion ${n + 1}`); d.up.push(false); d.x.forEach((r) => r.push("")); }, true)}>Add criterion</button>
        {!isExample && <button type="button" className="btn" onClick={() => { setNote(""); patch({ t: null, w: null, p: null, o: null }); }}>Back to the example</button>}
      </div>
      {note && <p className="t-small mt-2 text-ink-2" role="status">{note}</p>}
      {bad > 0 && <p className="t-small mt-2 text-ink" role="alert">{bad === 1 ? "One cell needs" : `${bad} cells need`} a number before anything can be ranked.</p>}

      {/* Weights beside the two rankings */}
      <div className="mt-8 grid border-t border-rule lg:grid-cols-[19rem_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-4 py-5 lg:pr-6">
          <h2 className="flex items-center gap-1.5 font-[520]">Weights
            <Tip label="weights">How much each criterion counts. Set them directly, or answer one question per pair of criteria and let AHP work them out.</Tip>
          </h2>
          <Segmented label="Weights from" value={wmode} onChange={(v) => patch({ wm: v })} options={[{ v: "sliders", text: "Sliders" }, { v: "ahp", text: "Pairwise (AHP)" }]} />
          {wmode === "sliders" ? <>
            {t.crit.map((c, j) => (
              <Field key={j} label={c} value={`${shares[j]} %`} htmlFor={`dc-w${j}`}>
                <input id={`dc-w${j}`} type="range" min={0} max={1} step={0.01} value={sliders[j]} onChange={(e) => setWeight(j, Number(e.target.value))} className="w-full accent-ink" />
              </Field>
            ))}
            <p className="t-small text-ink-2">The weights share 100 %: raising one lowers the others.</p>
          </> : <>
            {pairs.map(([i, j], k) => (
              <div key={`${i}-${j}`} className="min-w-0">
                <div className="t-small flex justify-between gap-3 text-ink-2"><span className="min-w-0 truncate">{t.crit[i]}</span><span className="min-w-0 truncate text-right">{t.crit[j]}</span></div>
                <input type="range" min={-8} max={8} step={1} value={pv[k]} onChange={(e) => setPair(k, Number(e.target.value))} aria-label={`${t.crit[i]} against ${t.crit[j]}`} aria-valuetext={pairText(k)} className="mt-1 w-full accent-ink" />
                <p className="t-small text-center">{pairText(k)}</p>
              </div>
            ))}
            <div className="border-t border-rule pt-3">
              <p className="t-small text-ink-2">Weights from the comparisons</p>
              <ul className="mt-1.5 flex flex-col gap-1">
                {t.crit.map((c, j) => (
                  <li key={j} className="t-small grid grid-cols-[minmax(0,1fr)_5rem_2.5rem] items-center gap-2">
                    <span className="truncate">{c}</span>
                    <span className="h-1.5 bg-rule"><span className="block h-full bg-ink" style={{ width: `${weights[j] * 100}%` }} /></span>
                    <span className="t-data text-right">{shares[j]} %</span>
                  </li>
                ))}
              </ul>
              {n > 2 && <p className="t-small mt-2 flex flex-wrap items-center gap-1.5">
                <span>Consistency ratio <span className="t-data">{AH.CR.toFixed(2)}</span></span>
                <Tip label="the consistency ratio">How far the answers contradict each other, for example A over B, B over C, but C over A. Below 0.10 is usually taken as consistent enough.</Tip>
              </p>}
              {n > 2 && AH.CR > 0.1 && <p className="t-small mt-1 text-ink" role="status">Above 0.10, so some answers contradict each other. Look first at {t.crit[AH.worst[0]]} against {t.crit[AH.worst[1]]}.</p>}
            </div>
          </>}
        </div>

        <div className="grid min-w-0 gap-x-8 gap-y-6 border-t border-rule py-5 sm:grid-cols-2 lg:border-l lg:border-t-0 lg:pl-6">
          <section aria-labelledby="dc-topsis" className="min-w-0">
            <h2 id="dc-topsis" className="flex items-center gap-1.5 font-[520]">TOPSIS
              <Tip label="TOPSIS">Ranks by closeness to an ideal option made of the best value on every criterion, against an anti-ideal made of the worst. 1 would be the ideal itself.</Tip>
            </h2>
            {res ? <ol className="mt-3 flex flex-col">
              {byTopsis.map((i, r) => (
                <li key={i} className="grid grid-cols-[1.25rem_minmax(0,1fr)_3.5rem] items-center gap-2 border-t border-rule py-2">
                  <span className="t-data text-ink-2">{r + 1}</span>
                  <span className="flex min-w-0 items-center gap-2"><Dot on={r === 0} /><span className="truncate">{t.alts[i]}</span></span>
                  <span className="t-data text-right">{res.T[i].toFixed(3)}</span>
                </li>
              ))}
            </ol> : <p className="t-small mt-3 text-ink-2">Appears once every cell has a number.</p>}
          </section>
          <section aria-labelledby="dc-vikor" className="min-w-0">
            <h2 id="dc-vikor" className="flex items-center gap-1.5 font-[520]">VIKOR
              <Tip label="VIKOR">Q mixes S, the weighted sum of how far an option falls short of the best on each criterion, and R, its largest single shortfall. Lower is better for all three.</Tip>
            </h2>
            {res ? <>
              <ol className="mt-3 flex flex-col">
                <li className="t-small grid grid-cols-[1.25rem_minmax(0,1fr)_3rem_3rem_3rem] gap-2 pb-1 text-ink-2" aria-hidden="true"><span /><span /><span className="text-right">Q</span><span className="text-right">S</span><span className="text-right">R</span></li>
                {res.C.order.map((i, r) => (
                  <li key={i} className="grid grid-cols-[1.25rem_minmax(0,1fr)_3rem_3rem_3rem] items-center gap-2 border-t border-rule py-2">
                    <span className="t-data text-ink-2">{r + 1}</span>
                    <span className="flex min-w-0 items-center gap-2"><Dot on={r === 0} /><span className="truncate">{t.alts[i]}</span></span>
                    <span className="t-data text-right" aria-label={`Q ${res.V.Q[i].toFixed(2)}`}>{res.V.Q[i].toFixed(2)}</span>
                    <span className="t-data text-right text-ink-2" aria-label={`S ${res.V.S[i].toFixed(2)}`}>{res.V.S[i].toFixed(2)}</span>
                    <span className="t-data text-right text-ink-2" aria-label={`R ${res.V.R[i].toFixed(2)}`}>{res.V.R[i].toFixed(2)}</span>
                  </li>
                ))}
              </ol>
              <p className="t-small mt-2 text-ink-2">{vikorText}</p>
            </> : <p className="t-small mt-3 text-ink-2">Appears once every cell has a number.</p>}
          </section>
        </div>
      </div>

      {/* SMAA-2 */}
      <section aria-labelledby="dc-smaa" className="border-t border-rule pt-5">
        <h2 id="dc-smaa" className="flex items-center gap-1.5 font-[520]">When the weights are uncertain: SMAA-2
          <Tip label="SMAA-2">Instead of one set of weights, 10,000 sets drawn from what you know about them. Each ranks the options; the table counts how often each option lands at each rank.</Tip>
        </h2>
        <div className="mt-3 grid gap-x-8 gap-y-5 lg:grid-cols-[19rem_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col gap-4 lg:pr-6">
            <Segmented label="What is known about the weights" value={smode} onChange={(v) => patch({ sm: v })}
              options={[{ v: "none", text: "Nothing" }, { v: "order", text: "Their order" }, { v: "around", text: "Roughly mine" }]} />
            {smode === "none" && <p className="t-small text-ink-2">Every set of weights is equally likely.</p>}
            {smode === "order" && <>
              <p className="t-small text-ink-2">Most important first; the weights are drawn so they keep this order.</p>
              <ol className="flex flex-col">
                {order.map((j, r) => (
                  <li key={j} className="grid grid-cols-[1.25rem_minmax(0,1fr)_auto] items-center gap-2 border-t border-rule py-1">
                    <span className="t-data text-ink-2">{r + 1}</span>
                    <span className="truncate">{t.crit[j]}</span>
                    <span className="flex">
                      <button type="button" className={xBtn} disabled={r === 0} aria-label={`Move ${t.crit[j]} up`} onClick={() => move(r, -1)}>
                        <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3.5 10 8 5.5l4.5 4.5" /></svg>
                      </button>
                      <button type="button" className={xBtn} disabled={r === n - 1} aria-label={`Move ${t.crit[j]} down`} onClick={() => move(r, 1)}>
                        <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3.5 6 8 10.5 12.5 6" /></svg>
                      </button>
                    </span>
                  </li>
                ))}
              </ol>
            </>}
            {smode === "around" && <Field label="Each weight within" value={`± ${spread} %`} htmlFor="dc-spread">
              <input id="dc-spread" type="range" min={5} max={50} step={5} value={spread} onChange={(e) => patch({ sp: e.target.value })} className="w-full accent-ink" />
            </Field>}
            {smode === "around" && <p className="t-small text-ink-2">Of the weights set above ({shares.map((s, j) => `${t.crit[j].split(",")[0]} ${s} %`).join(", ")}), each drawn within the range, then rescaled to 100 %.</p>}
          </div>

          <div className="min-w-0">
            {res ? <>
              <div className="overflow-x-auto">
                <table className="t-data w-full min-w-[30rem] border-collapse text-right">
                  <caption className="sr-only">Rank acceptability: the share of weights that puts each option at each rank</caption>
                  <thead>
                    <tr className="t-small text-ink-2">
                      <th scope="col" className="pb-2 text-left font-normal">Option</th>
                      {t.alts.map((_, r) => <th key={r} scope="col" className="px-1 pb-2 font-normal">Rank {r + 1}</th>)}
                      <th scope="col" className="pb-2 pl-3 font-normal"><span className="inline-flex items-center gap-1">Holistic <Tip label="holistic acceptability">One number per option from all its ranks: a first place counts fully, the last place not at all, ranks between in equal steps.</Tip></span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {bySmaa.map((i, r) => (
                      <tr key={i} className="border-t border-rule">
                        <th scope="row" className="py-1 pr-2 text-left font-normal"><span className="flex items-center gap-2"><Dot on={r === 0} /><span className="truncate">{t.alts[i]}</span></span></th>
                        {res.S.acc[i].map((b, k) => (
                          <td key={k} className="p-0.5">
                            <span className="block px-1.5 py-1" style={{ background: shade(b) }}>{b > 0 ? pct(b) : "–"}</span>
                          </td>
                        ))}
                        <td className="py-1 pl-3">{res.S.holistic[i].toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-6 overflow-x-auto">
                <table className="t-data w-full min-w-[30rem] border-collapse text-right">
                  <caption className="t-small mb-2 text-left text-ink-2">
                    <span className="inline-flex items-center gap-1.5">Central weights: the typical weights that make each option first
                      <Tip label="central weights">The average of all the drawn weights under which the option comes first. An option that never comes first has none.</Tip>
                    </span>
                  </caption>
                  <thead><tr className="t-small text-ink-2"><th scope="col" className="pb-2 text-left font-normal">Option</th>{t.crit.map((c, j) => <th key={j} scope="col" className="px-1 pb-2 font-normal">{c.split(",")[0]}</th>)}</tr></thead>
                  <tbody>
                    {bySmaa.map((i) => (
                      <tr key={i} className="border-t border-rule">
                        <th scope="row" className="py-1.5 pr-2 text-left font-normal">{t.alts[i]}</th>
                        {res.S.central[i] ? res.S.central[i]!.map((w, j) => <td key={j} className="px-1 py-1.5">{pct(w)}</td>)
                          : <td colSpan={n} className="t-small px-1 py-1.5 text-ink-2">Never first</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </> : <p className="t-small text-ink-2">Appears once every cell has a number.</p>}
          </div>
        </div>
      </section>
    </ToolShell>
  );
};

export default Decision;

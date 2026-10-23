import React, { useEffect, useMemo, useRef, useState } from "react";
import { geoEqualEarth, geoEquirectangular, geoGraticule10, geoMercator, geoNaturalEarth1, geoPath, type GeoPermissibleObjects, type GeoProjection } from "d3-geo";
import { geoRobinson, geoWinkel3 } from "d3-geo-projection";
import { feature } from "topojson-client";
import ToolShell from "../ToolShell";
import { Field, Segmented } from "../controls";
import { useToolParams } from "../useToolParams";
import { download, downloadPNG, svgText } from "../../lab/export";
import { anchorOf, niceName, placeLabels } from "./labels";

type Country = GeoJSON.Feature<GeoJSON.Geometry, { name: string }>;

const PROJ: Record<string, { text: string; make: () => GeoProjection }> = {
  robinson: { text: "Robinson", make: geoRobinson },
  equalearth: { text: "Equal Earth", make: geoEqualEarth },
  winkel: { text: "Winkel tripel", make: geoWinkel3 },
  natural: { text: "Natural Earth", make: geoNaturalEarth1 },
  plate: { text: "Plate carrée", make: geoEquirectangular },
  mercator: { text: "Mercator", make: geoMercator },
};
const COLOURS = ["water", "land", "hi", "border", "text"] as const;
const COLOUR_TEXT = { water: "Water", land: "Land", hi: "Highlight", border: "Borders", text: "Labels" };
const PRESETS: Record<string, Record<(typeof COLOURS)[number], string>> = {
  Paper: { water: "#FFFFFF", land: "#DDE2E3", hi: "#172027", border: "#FFFFFF", text: "#172027" },
  Laser: { water: "#FFFFFF", land: "#DDE2E3", hi: "#F05A24", border: "#FFFFFF", text: "#172027" },
  Night: { water: "#121A1F", land: "#34424B", hi: "#F6F7F5", border: "#121A1F", text: "#F6F7F5" },
};
const DEFAULT = ["United States", "Belgium", "United Kingdom", "Italy", "Switzerland", "Denmark", "China", "Norway", "Canada", "Australia", "Luxembourg", "Morocco", "Peru", "Japan", "Turkey"];
const isHex = (s: string) => /^#[0-9a-fA-F]{6}$/.test(s);
const SPEC = {
  proj: { kind: "enum", values: Object.keys(PROJ), def: "robinson" },
  frame: { kind: "enum", values: ["world", "sel"], def: "world" },
  ant: { kind: "enum", values: ["0", "1"], def: "0" },
  grat: { kind: "enum", values: ["0", "1"], def: "1" },
  lab: { kind: "enum", values: ["11", "14", "17", "0"], def: "11" },
  c: { kind: "text", ok: (s: string) => s.length < 4000, def: DEFAULT.join(",") },
  ...Object.fromEntries(COLOURS.map((k) => [k, { kind: "text", ok: isHex, def: PRESETS.Paper[k] }])) as Record<(typeof COLOURS)[number], { kind: "text"; ok: (s: string) => boolean; def: string }>,
} as const;

// Fixed width; the height follows the projection, so the file is the same at any window size.
const W = 1000, FONT = "'Archivo Variable', Archivo, Arial, sans-serif";
const box = "t-data h-9 w-full min-w-0 rounded-[2px] border border-rule bg-transparent px-2 [@media(pointer:coarse)]:h-11";

const WorldMap: React.FC = () => {
  const { values: p, clamped, set } = useToolParams(SPEC);
  const [world, setWorld] = useState<Country[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [entry, setEntry] = useState(""), [entryNote, setEntryNote] = useState("");
  const [moved, setMoved] = useState<Record<string, [number, number]>>({});   // labels dragged by hand, by offset
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    // Natural Earth 1:110m, served with the site: nothing is fetched from elsewhere.
    fetch(`${import.meta.env.BASE_URL}ne_110m_countries.json`).then((r) => r.json()).then((topo) => {
      const fc = feature(topo, topo.objects.countries) as unknown as GeoJSON.FeatureCollection<GeoJSON.Geometry, { name: string }>;
      setWorld(fc.features.map((f) => ({ ...f, properties: { name: niceName(f.properties.name) } })).sort((a, b) => a.properties.name.localeCompare(b.properties.name)));
    }).catch(() => setFailed(true));
  }, []);

  const names = useMemo(() => new Set(world?.map((f) => f.properties.name)), [world]);
  const picked = useMemo(() => [...new Set(p.c.split(",").map((s) => s.trim()).filter(Boolean))], [p.c]);
  const unknown = world ? picked.filter((n) => !names.has(n)) : [];
  const chosen = new Set(picked);
  const setPicked = (list: string[]) => set({ c: list.join(",") });
  const toggle = (n: string) => setPicked(chosen.has(n) ? picked.filter((x) => x !== n) : [...picked, n]);

  const map = useMemo(() => {
    if (!world) return null;
    // Mercator sends the poles to infinity, so it never shows Antarctica
    const merc = p.proj === "mercator";
    const shown = world.filter((f) => (p.ant === "1" && !merc) || f.properties.name !== "Antarctica");
    const sel = shown.filter((f) => chosen.has(f.properties.name));
    const fitSel = p.frame === "sel" && sel.length > 0;
    const proj = PROJ[p.proj].make().rotate([-10, 0]);
    const fit: GeoPermissibleObjects = fitSel || merc ? { type: "FeatureCollection", features: fitSel ? sel : shown } : { type: "Sphere" };
    let H: number;
    if (fitSel) {
      // frame the selection with a margin, in a box between 2.2:1 and 4:3
      proj.fitWidth(W, fit);
      const [[x0, y0], [x1, y1]] = geoPath(proj).bounds(fit);
      H = Math.round(Math.min(W * 0.75, Math.max(W / 2.2, (W * (y1 - y0)) / Math.max(1, x1 - x0))));
      proj.fitExtent([[48, 48], [W - 48, H - 48]], fit);
    } else {
      proj.fitWidth(W, fit);
      const [[, y0], [, y1]] = geoPath(proj).bounds(fit);
      H = Math.ceil(y1 - y0);
      proj.fitSize([W, H], fit);
    }
    const path = geoPath(proj);
    const pins = sel.map((f) => { const [x, y] = proj(anchorOf(f)) ?? [NaN, NaN]; return { name: f.properties.name, x, y }; })
      .filter((q) => Number.isFinite(q.x) && q.x >= 0 && q.x <= W && q.y >= 0 && q.y <= H);
    return { H, path, shown, sphere: !(fitSel || merc), pins };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world, p.proj, p.frame, p.ant, p.c]);

  const size = Number(p.lab);
  const labels = useMemo(() => (map && size ? placeLabels(map.pins, size) : []), [map, size]);
  useEffect(() => setMoved({}), [p.proj, p.frame, p.ant, p.lab]);

  // Dragging a label: offsets in map units from where the placement put it.
  const drag = useRef<{ name: string; sx: number; sy: number; ox: number; oy: number } | null>(null);
  const toMap = (e: React.PointerEvent) => {
    const m = svgRef.current!.getScreenCTM()!.inverse(), pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(m);
    return [pt.x, pt.y];
  };
  const onDown = (name: string) => (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    const [x, y] = toMap(e), [ox, oy] = moved[name] ?? [0, 0];
    drag.current = { name, sx: x, sy: y, ox, oy };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const [x, y] = toMap(e);
    setMoved((m) => ({ ...m, [d.name]: [d.ox + x - d.sx, d.oy + y - d.sy] }));
  };
  const onUp = () => { drag.current = null; };

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const n = world?.find((f) => f.properties.name.toLowerCase() === entry.trim().toLowerCase())?.properties.name;
    if (!n) { setEntryNote(entry.trim() ? `No country called “${entry.trim()}” on this map. Pick one from the list.` : ""); return; }
    if (!chosen.has(n)) setPicked([...picked, n]);
    setEntry(""); setEntryNote("");
  };

  const preset = Object.entries(PRESETS).find(([, c]) => COLOURS.every((k) => c[k].toLowerCase() === p[k].toLowerCase()))?.[0] ?? "";
  const saveSVG = () => svgRef.current && download("world-map.svg", svgText(svgRef.current), "image/svg+xml");
  const savePNG = () => svgRef.current && map && downloadPNG("world-map.png", svgText(svgRef.current), W, map.H);
  const label = `World map, ${PROJ[p.proj].text} projection, ${picked.filter((n) => names.has(n)).length} countries highlighted: ${picked.filter((n) => names.has(n)).join(", ") || "none"}.`;

  return (
    <ToolShell path="/tools/world-map" slug="world-map">
      {clamped.length > 0 && <p className="t-small mb-4 text-ink-2">Some link settings weren’t valid and have been reset: {clamped.join(", ")}.</p>}
      <div className="grid gap-x-12 gap-y-10 md:grid-cols-[17rem_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          <Field label="Highlighted countries" htmlFor="wm-add">
            <form onSubmit={add} className="flex gap-2">
              <input id="wm-add" list="wm-names" value={entry} onChange={(e) => setEntry(e.target.value)} placeholder="Type a country" autoComplete="off" className={box} />
              <datalist id="wm-names">{world?.filter((f) => !chosen.has(f.properties.name)).map((f) => <option key={f.properties.name} value={f.properties.name} />)}</datalist>
              <button type="submit" className="btn shrink-0">Add</button>
            </form>
          </Field>
          {entryNote && <p className="t-small -mt-3 text-ink" role="alert">{entryNote}</p>}
          <div className="-mt-2">
            {picked.length ? (
              <ul className="flex flex-wrap gap-1.5" aria-label="Highlighted countries">
                {picked.map((n) => (
                  <li key={n}>
                    <button type="button" onClick={() => toggle(n)} aria-label={`Remove ${n}`}
                      className={`t-small inline-flex h-8 items-center gap-1.5 rounded-[2px] border px-2 transition-colors duration-150 hover:bg-wash [@media(pointer:coarse)]:h-11 ${names.has(n) || !world ? "border-rule text-ink" : "border-dashed border-rule text-ink-2 line-through"}`}>
                      {n}<svg viewBox="0 0 12 12" aria-hidden="true" className="h-2.5 w-2.5 text-ink-2" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2.5 2.5l7 7M9.5 2.5l-7 7" /></svg>
                    </button>
                  </li>
                ))}
              </ul>
            ) : <p className="t-small text-ink-2">None yet. Click a country on the map, or type its name.</p>}
            {unknown.length > 0 && <p className="t-small mt-2 text-ink-2">Struck out: not on this map, so not drawn.</p>}
            {picked.length > 0 && <button type="button" className="link t-small mt-2 text-ink-2" onClick={() => setPicked([])}>Clear all</button>}
          </div>
          <Field label="Projection" htmlFor="wm-proj">
            <select id="wm-proj" value={p.proj} onChange={(e) => set({ proj: e.target.value })} className={`${box} cursor-pointer`}>
              {Object.entries(PROJ).map(([v, q]) => <option key={v} value={v}>{q.text}</option>)}
            </select>
          </Field>
          <Field label="Frame"><Segmented label="Frame" value={p.frame} onChange={(frame) => set({ frame })} options={[{ v: "world", text: "Whole world" }, { v: "sel", text: "Highlighted" }]} /></Field>
          <Field label="Labels"><Segmented label="Label size" value={p.lab} onChange={(lab) => set({ lab })} options={[{ v: "0", text: "Off" }, { v: "11", text: "S" }, { v: "14", text: "M" }, { v: "17", text: "L" }]} /></Field>
          <div className="flex flex-col gap-2">
            <label className="t-small flex items-center gap-2 text-ink-2"><input type="checkbox" checked={p.grat === "1"} onChange={(e) => set({ grat: e.target.checked ? "1" : "0" })} className="h-4 w-4 accent-ink" />Graticule</label>
            <label className="t-small flex items-center gap-2 text-ink-2"><input type="checkbox" checked={p.ant === "1" && p.proj !== "mercator"} disabled={p.proj === "mercator"} onChange={(e) => set({ ant: e.target.checked ? "1" : "0" })} className="h-4 w-4 accent-ink" />Antarctica{p.proj === "mercator" && ", not in Mercator"}</label>
          </div>
          <Field label="Colours">
            <Segmented label="Colour preset" value={preset} onChange={(v) => set(PRESETS[v])} options={Object.keys(PRESETS).map((v) => ({ v, text: v }))} />
            <div className="mt-3 grid grid-cols-5 gap-2">
              {COLOURS.map((k) => (
                <label key={k} className="t-small flex min-w-0 flex-col items-center gap-1 text-ink-2">
                  <input type="color" value={p[k]} onChange={(e) => set({ [k]: e.target.value.toUpperCase() })}
                    className="h-9 w-full cursor-pointer rounded-[2px] border border-rule bg-transparent p-0.5 [@media(pointer:coarse)]:h-11" />
                  <span className="truncate">{COLOUR_TEXT[k]}</span>
                </label>
              ))}
            </div>
          </Field>
        </div>

        <div className="min-w-0 max-md:order-first">
          {failed ? <p className="t-small border border-dashed border-rule p-6 text-ink-2">The country outlines didn’t load. Reload the page to try again.</p>
            : !map ? <div className="aspect-[2/1] w-full border border-dashed border-rule" aria-hidden="true" />
            : (
              <svg ref={svgRef} viewBox={`0 0 ${W} ${map.H}`} width={W} height={map.H} role="img" aria-label={label} fontFamily={FONT}
                className="block h-auto w-full select-none" onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
                <title>{label}</title>
                {map.sphere ? <path d={map.path({ type: "Sphere" }) ?? ""} fill={p.water} /> : <rect width={W} height={map.H} fill={p.water} />}
                {p.grat === "1" && <path d={map.path(geoGraticule10()) ?? ""} fill="none" stroke={p.text} strokeOpacity={0.12} strokeWidth={0.5} />}
                <g stroke={p.border} strokeWidth={0.5} strokeLinejoin="round">
                  {map.shown.map((f) => (
                    <path key={f.properties.name} d={map.path(f) ?? ""} fill={chosen.has(f.properties.name) ? p.hi : p.land} onClick={() => toggle(f.properties.name)}
                      className="cursor-pointer transition-opacity duration-150 hover:opacity-80"><title>{f.properties.name}</title></path>
                  ))}
                </g>
                {map.sphere && p.grat === "1" && <path d={map.path({ type: "Sphere" }) ?? ""} fill="none" stroke={p.text} strokeOpacity={0.25} strokeWidth={0.75} />}
                {labels.map((l) => {
                  const [ox, oy] = moved[l.name] ?? [0, 0], x0 = l.x0 + ox, x1 = l.x1 + ox, y0 = l.y0 + oy, y1 = l.y1 + oy;
                  const tx = l.anchor === "start" ? x0 : l.anchor === "end" ? x1 : (x0 + x1) / 2;
                  const ex = Math.min(x1, Math.max(x0, l.x)), ey = Math.min(y1, Math.max(y0, l.y)), far = Math.hypot(ex - l.x, ey - l.y) > 9;
                  return (
                    <g key={l.name} fill={p.text}>
                      {far && <line x1={l.x} y1={l.y} x2={ex} y2={ey} stroke={p.text} strokeOpacity={0.5} strokeWidth={0.75} />}
                      <circle cx={l.x} cy={l.y} r={size / 6} />
                      <text x={tx} y={y1 - size * 0.32} textAnchor={l.anchor} fontSize={size} fontWeight={500} stroke={p.water} strokeWidth={size / 4} strokeLinejoin="round" paintOrder="stroke"
                        onPointerDown={onDown(l.name)} className="cursor-grab touch-none active:cursor-grabbing">{l.name}</text>
                    </g>
                  );
                })}
              </svg>
            )}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button type="button" className="btn btn-solid" onClick={saveSVG} disabled={!map}>Download SVG</button>
            <button type="button" className="btn" onClick={savePNG} disabled={!map}>Download PNG</button>
            {Object.keys(moved).length > 0 && <button type="button" className="btn" onClick={() => setMoved({})}>Reset labels</button>}
          </div>
          <p className="t-small mt-2 text-ink-2">Click a country to add or remove it; drag a label to move it. Natural Earth borders at 1:110 million, so the smallest states don’t appear. The PNG is 3000 px wide, with its text in Arial.</p>
        </div>
      </div>
    </ToolShell>
  );
};

export default WorldMap;

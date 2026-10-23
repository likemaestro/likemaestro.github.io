import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import SiteHeader, { SiteFooter, Wrap } from "../components/SiteHeader";
import { cells } from "../lab/precomputed";
import { decode, drawLattice } from "../lab/lattice";
import registry from "./pages.json";
import { groupId, page } from "./ToolShell";

const GROUPS = ["Microstructures", "Structures", "Decision support", "Monitoring", "Other tools"];

const Lattice: React.FC<{ rho: string; tiles: number; className?: string; label?: string }> = ({ rho, tiles, className, label }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current, field = decode(rho);
    if (!cv) return;
    const draw = () => drawLattice(cv, field, tiles, tiles);
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(cv);
    return () => ro.disconnect();
  }, [rho, tiles]);
  return <canvas ref={ref} className={`block aspect-square w-full ${className ?? ""}`} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true} />;
};

// Small line drawings for the rows; the microstructure tools show their own lattice instead.
const GLYPH: Record<string, React.ReactNode> = {
  "/tools/world-map": <><circle cx="24" cy="24" r="17" /><ellipse cx="24" cy="24" rx="7" ry="17" /><path d="M7 24h34M10 15h28M10 33h28" /></>,
  "/tools/property-map": <><path d="M8 6v34h34" /><path d="M13 33l3-2M15 29l3-1M17 31l2-2M27 16l2 1M30 21l2 1M33 26l2 1M36 31l2 1" strokeWidth="2.4" strokeLinecap="round" /><path d="M24 6v34" strokeDasharray="2 2" /></>,
  "/tools/truss-sizing": <path d="M4 34h40M10 18h28M4 34l6-16M44 34l-6-16M17 18v16M24 18v16M31 18v16M10 18l7 16M17 18l7 16M38 18l-7 16M31 18l-7 16" />,
  "/tools/beam-twist": <><path d="M6 16h36M6 32h36" strokeDasharray="2 2" /><path d="M6 16c10 9 26 9 36 0M6 32c10 3 26 3 36 0M6 13v22M42 13v22" /></>,
  "/tools/decision": <><path d="M6 10h36v28H6zM6 19h36M6 28h36M18 10v28M30 10v28" /><circle cx="12" cy="23.5" r="2" fill="currentColor" /></>,
  "/tools/vibrometer": <path d="M4 24h6l3-9 4 18 4-24 4 28 4-20 3 12 3-5h9" />,
  "/tools/gauge": <><path d="M8 32a16 16 0 0 1 32 0" /><path d="M24 32l8-10" /><circle cx="24" cy="32" r="1.6" fill="currentColor" /></>,
};

// Microstructure rows show a lattice of one of the precomputed designs.
const LATTICE: Record<string, { rho: string }> = { "/tools/sketchpad": cells.shear, "/tools/unit-cell": cells.auxetic };

const Thumb: React.FC<{ path: string }> = ({ path }) =>
  GLYPH[path] ? (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="block aspect-square w-full border border-rule text-ink" fill="none" stroke="currentColor" strokeWidth="1.25">{GLYPH[path]}</svg>
  ) : (
    <Lattice rho={(LATTICE[path] ?? cells.bulk).rho} tiles={2} className="border border-rule" />
  );

// Pictures for the featured tools, each fitted to a 4:3 box.
const Cells: React.FC<{ names: (keyof typeof cells)[]; tiles: number }> = ({ names, tiles }) => (
  <div className={`grid aspect-square h-full gap-3 ${names.length > 1 ? "grid-cols-2" : ""}`}>
    {names.map((k) => <Lattice key={k} rho={cells[k].rho} tiles={tiles} />)}
  </div>
);

// The truss sizing tool's bridge: six square panels, X-braced, pinned and roller supports, a load at each inner joint.
const tx = (i: number) => 22 + i * 26, TOP = 52, BOT = 78, JOINTS = [0, 1, 2, 3, 4, 5, 6];
const BridgeArt = (
  <svg viewBox="0 0 200 150" aria-hidden="true" className="h-full w-full" fill="none">
    <g className="stroke-steel" strokeWidth="1.6">
      {JOINTS.slice(1).map((i) => <path key={i} d={`M${tx(i - 1)} ${TOP}L${tx(i)} ${BOT}M${tx(i - 1)} ${BOT}L${tx(i)} ${TOP}`} />)}
      {JOINTS.map((i) => <path key={i} d={`M${tx(i)} ${TOP}V${BOT}`} />)}
    </g>
    <g className="stroke-ink" strokeWidth="1.2">
      <path d={`M${tx(0)} ${TOP}H${tx(6)}M${tx(0)} ${BOT}H${tx(6)}`} strokeWidth="2.4" />
      {JOINTS.slice(1, 6).map((i) => <path key={i} d={`M${tx(i)} ${BOT + 5}V${BOT + 21}M${tx(i) - 3} ${BOT + 17}L${tx(i)} ${BOT + 21}L${tx(i) + 3} ${BOT + 17}`} />)}
      <path d={`M${tx(0)} ${BOT}l-6 10h12zM${tx(0) - 9} ${BOT + 10}h18M${tx(6)} ${BOT}l-6 10h12zM${tx(6) - 9} ${BOT + 13}h18`} />
      {JOINTS.flatMap((i) => [TOP, BOT].map((y) => <circle key={`${i}-${y}`} cx={tx(i)} cy={y} r="1.9" className="fill-canvas" strokeWidth="1.1" />))}
    </g>
  </svg>
);

// A free-decay record, what the vibrometer reads a frequency from, with its exponential envelope dashed.
const decay = (f: (t: number) => number, n: number) => Array.from({ length: n + 1 }, (_, k) => `${(14 + (172 * k) / n).toFixed(1)},${(75 - 44 * f(k / n)).toFixed(1)}`).join(" ");
const DecayArt = (
  <svg viewBox="0 0 200 150" aria-hidden="true" className="h-full w-full" fill="none">
    <path d="M14 75H186" className="stroke-rule" />
    <g className="stroke-steel" strokeDasharray="2 3">
      <polyline points={decay((t) => Math.exp(-3 * t), 40)} />
      <polyline points={decay((t) => -Math.exp(-3 * t), 40)} />
    </g>
    <polyline points={decay((t) => Math.exp(-3 * t) * Math.sin(2 * Math.PI * 9 * t), 360)} className="stroke-ink" strokeWidth="1.4" strokeLinejoin="round" />
  </svg>
);

const FEATURED = [
  { path: "/tools/unit-cell", cta: "Open the designer", art: <Cells names={["auxetic"]} tiles={3} /> },
  { path: "/tools/truss-sizing", cta: "Open truss sizing", art: BridgeArt },
  { path: "/tools/property-map", cta: "Open the property map", art: <Cells names={["axial", "shear", "bulk", "auxetic"]} tiles={2} /> },
  { path: "/tools/vibrometer", cta: "Open the vibrometer", art: DecayArt },
].map((f) => ({ ...f, ...registry.pages.find((t) => t.path === f.path)! }));
const SLIDE_MS = 3000;

const Icon: React.FC<{ d: string }> = ({ d }) => <svg viewBox="0 0 16 16" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5"><path d={d} /></svg>;

// One featured tool at a time. It moves on every SLIDE_MS while playing; pointing at it or keyboard focus inside it
// holds it, the button stops it, and with reduced motion it starts stopped. The active bar fills as the time runs.
// Phones swipe or use the bars; the arrows show from the sm width up.
const Featured: React.FC = () => {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(() => !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [hover, setHover] = useState(false), [focus, setFocus] = useState(false);
  const swipe = useRef<number | null>(null);
  const running = playing && !hover && !focus, n = FEATURED.length;
  const go = (d: number) => setI((k) => (k + d + n) % n);
  const btn = "btn w-9 px-0 [@media(pointer:coarse)]:w-11";

  return (
    <section aria-roledescription="carousel" aria-label="Featured tools" className="mt-10 border-t border-rule pt-4"
      onPointerEnter={(e) => e.pointerType === "mouse" && setHover(true)} onPointerLeave={() => setHover(false)}
      onFocus={(e) => (e.target as HTMLElement).matches(":focus-visible") && setFocus(true)} onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node | null) && setFocus(false)}>
      <div className="flex items-center gap-3">
        <p className="t-small text-ink-2">Featured</p>
        <button type="button" className={btn} onClick={() => setPlaying((v) => !v)} aria-label={playing ? "Stop the slide show" : "Start the slide show"}>
          {playing ? <Icon d="M5.5 3.5v9M10.5 3.5v9" /> : <svg viewBox="0 0 16 16" aria-hidden="true" className="h-4 w-4" fill="currentColor"><path d="M5 3.2v9.6L12.6 8z" /></svg>}
        </button>
        <div className="flex">
          {FEATURED.map((s, k) => (
            <button key={s.path} type="button" onClick={() => setI(k)} aria-label={`${s.title}, ${k + 1} of ${n}`} aria-current={k === i ? "true" : undefined}
              className="group px-1 py-4 [@media(pointer:coarse)]:px-2.5 [@media(pointer:coarse)]:py-[21px]">
              <span className="relative block h-0.5 w-6 overflow-hidden bg-rule group-hover:bg-steel sm:w-8">
                {k === i && <span key={`${i}-${playing}`} onAnimationEnd={() => go(1)} className={`absolute inset-0 origin-left bg-ink ${playing ? "animate-featured" : ""}`}
                  style={{ animationDuration: `${SLIDE_MS}ms`, animationPlayState: running ? "running" : "paused" }} />}
              </span>
            </button>
          ))}
        </div>
        <div className="ml-auto hidden gap-2 sm:flex">
          <button type="button" className={btn} onClick={() => go(-1)} aria-label="Previous tool"><Icon d="M10 3.5 5.5 8l4.5 4.5" /></button>
          <button type="button" className={btn} onClick={() => go(1)} aria-label="Next tool"><Icon d="M6 3.5 10.5 8 6 12.5" /></button>
        </div>
      </div>

      <div className="mt-4 grid touch-pan-y" aria-live={running ? "off" : "polite"}
        onPointerDown={(e) => { swipe.current = e.pointerType === "mouse" ? null : e.clientX; }}
        onPointerUp={(e) => { const x0 = swipe.current; swipe.current = null; if (x0 !== null && Math.abs(e.clientX - x0) > 48) go(e.clientX < x0 ? 1 : -1); }}>
        {FEATURED.map((s, k) => (
          <article key={s.path} role="group" aria-roledescription="slide" aria-label={`${k + 1} of ${n}`}
            className={`grid gap-x-12 gap-y-6 transition-[opacity,visibility] duration-300 [grid-area:1/1] motion-reduce:transition-none md:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] md:items-center ${k === i ? "visible opacity-100" : "invisible opacity-0"}`}>
            <Link to={s.path} tabIndex={-1} aria-hidden="true" className="flex aspect-[4/3] items-center justify-center">{s.art}</Link>
            <div className="min-w-0">
              <h2 className="t-h2"><Link to={s.path} className="hover:underline">{s.title}</Link></h2>
              <p className="mt-3 max-w-[52ch] text-ink-2">{s.line}</p>
              <div className="mt-6"><Link to={s.path} className="btn btn-solid">{s.cta}</Link></div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

const ToolsIndex: React.FC = () => {
  const p = page("/tools");
  const { hash } = useLocation();
  useEffect(() => { document.title = `${p.title} – Murat Güven`; return () => { document.title = "Murat Güven"; }; }, [p.title]);
  // A tool's breadcrumb links to its group, e.g. /tools#microstructures: jump there, as the home page does.
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "instant" as ScrollBehavior });
  }, [hash]);

  return (
    <>
      <SiteHeader />
      <main id="main">
        <Wrap className="pb-24 pt-6 md:pt-10">
          <h1 className="t-h2">{p.title}</h1>
          <p className="mt-3 max-w-[60ch] text-ink-2">{p.line}</p>

          <Featured />

          {GROUPS.map((g) => {
            const rows = registry.pages.filter((t) => "group" in t && t.group === g);
            if (!rows.length) return null;
            return (
              <section key={g} id={groupId(g)} aria-labelledby={`${groupId(g)}-h`} className="mt-14">
                <h2 id={`${groupId(g)}-h`} className="t-h3">{g}</h2>
                <ul className="mt-4 border-b border-rule">
                  {rows.map((t) => (
                    <li key={t.path} className="border-t border-rule">
                      <Link to={t.path} className="group grid grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-x-4 py-4 md:grid-cols-[3.5rem_minmax(0,1fr)_auto] md:gap-x-6">
                        <Thumb path={t.path} />
                        <span className="min-w-0">
                          <span className="block font-[520] group-hover:underline">{t.title}</span>
                          <span className="t-small block text-ink-2">{t.line}</span>
                        </span>
                        <svg viewBox="0 0 16 16" aria-hidden="true" className="h-4 w-4 text-ink-2 transition-transform duration-150 group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 3.5 10.5 8 6 12.5" /></svg>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </Wrap>
      </main>
      <SiteFooter />
    </>
  );
};

export default ToolsIndex;

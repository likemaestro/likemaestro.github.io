import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import SiteHeader, { SiteFooter, Wrap } from "../components/SiteHeader";
import { cells } from "../lab/precomputed";
import { decode, drawLattice } from "../lab/lattice";
import registry from "./pages.json";
import { page } from "./ToolShell";

const GROUPS = ["Microstructures", "Monitoring", "Other tools"];

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
  "/tools/WorldMap": <><circle cx="24" cy="24" r="17" /><ellipse cx="24" cy="24" rx="7" ry="17" /><path d="M7 24h34M10 15h28M10 33h28" /></>,
  "/tools/vibrometer": <path d="M4 24h6l3-9 4 18 4-24 4 28 4-20 3 12 3-5h9" />,
  "/tools/gauge-tool": <><path d="M8 32a16 16 0 0 1 32 0" /><path d="M24 32l8-10" /><circle cx="24" cy="32" r="1.6" fill="currentColor" /></>,
};

// Microstructure rows show a lattice of one of the precomputed designs.
const LATTICE: Record<string, { rho: string }> = { "/tools/sketchpad": cells.shear, "/tools/property-map": cells.bulk };

const Thumb: React.FC<{ path: string }> = ({ path }) =>
  GLYPH[path] ? (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="block aspect-square w-full border border-rule text-ink" fill="none" stroke="currentColor" strokeWidth="1.25">{GLYPH[path]}</svg>
  ) : (
    <Lattice rho={(LATTICE[path] ?? cells.bulk).rho} tiles={2} className="border border-rule" />
  );

const ToolsIndex: React.FC = () => {
  const p = page("/tools");
  const featured = registry.pages.find((t) => "featured" in t && t.featured)!;
  useEffect(() => { document.title = `${p.title} – Murat Güven`; return () => { document.title = "Murat Güven"; }; }, [p.title]);

  return (
    <>
      <SiteHeader />
      <main id="main">
        <Wrap className="pb-24 pt-6 md:pt-10">
          <h1 className="t-h2">{p.title}</h1>
          <p className="mt-3 max-w-[60ch] text-ink-2">{p.line}</p>

          <article className="mt-10 grid gap-x-12 gap-y-6 border-t border-rule pt-8 md:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] md:items-center">
            <Link to={featured.path} tabIndex={-1} aria-hidden="true" className="block">
              <Lattice rho={cells.auxetic.rho} tiles={3} />
            </Link>
            <div className="min-w-0">
              <p className="t-small text-ink-2">Featured</p>
              <h2 className="t-h2 mt-1"><Link to={featured.path} className="hover:underline">{featured.title}</Link></h2>
              <p className="mt-3 max-w-[52ch] text-ink-2">{featured.line}</p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Link to={featured.path} className="btn btn-solid">Open the designer</Link>
              </div>
            </div>
          </article>

          {GROUPS.map((g) => {
            const rows = registry.pages.filter((t) => "group" in t && t.group === g && !("featured" in t && t.featured));
            if (!rows.length) return null;
            return (
              <section key={g} aria-labelledby={`g-${g}`} className="mt-14">
                <h2 id={`g-${g}`} className="t-h3">{g}</h2>
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

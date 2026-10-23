import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SiteHeader, { SiteFooter, Wrap } from "../components/SiteHeader";
import registry from "./pages.json";

export const page = (path: string) => registry.pages.find((p) => p.path === path)!;
/** A group's anchor on /tools, e.g. "Decision support" -> "decision-support"; the breadcrumb links to it. */
export const groupId = (group: string) => group.toLowerCase().replace(/\s+/g, "-");
const REPO = "https://github.com/likemaestro/likemaestro.github.io/tree/master/src/tools";
/** Güven & Özdemir (2026), Finite Elements in Analysis and Design 260, 104599: the microstructure tools' related paper. */
export const MICRO_PAPER = "https://doi.org/10.1016/j.finel.2026.104599";

/** Back to /tools: a square button with a "‹", beside the title. From 1600 px it hangs in the left margin, 1.5rem from
 *  the content; below that it stands in front of the title. It sits centred on the title's first line (1.12 × the t-h2 size). */
const Back: React.FC = () => (
  <Link to="/tools" aria-label="Back to Tools"
    className="btn group mt-[calc((clamp(1.75rem,3vw,2.5rem)*1.12-2.75rem)/2)] h-11 w-11 shrink-0 px-0 min-[1600px]:absolute min-[1600px]:right-full min-[1600px]:top-0 min-[1600px]:mr-6">
    <svg viewBox="0 0 12 24" aria-hidden="true" className="h-[18px] w-auto transition-transform duration-150 group-hover:-translate-x-[2px] group-focus-visible:-translate-x-[2px] motion-reduce:transform-none" fill="none" stroke="currentColor">
      <path d="M9 3 3 12l6 9" strokeWidth="1.75" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </Link>
);

/** Copy text to the clipboard; resolves false where the browser refuses (the caller then shows the text). */
async function copy(text: string) {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

/** The frame every tool page shares: header, breadcrumb, title, the tool, then method (with its links), limits and citation. */
const ToolShell: React.FC<{
  path: string;
  slug: string;
  methodRef?: { label: string; href: string };
  paper?: string;
  method?: React.ReactNode;   // utilities (the map, the gauge) have none, and then no method, limits or citation either
  limits?: React.ReactNode;
  children: React.ReactNode;
}> = ({ path, slug, methodRef, paper, method, limits, children }) => {
  const p = page(path);
  const [note, setNote] = useState("");
  useEffect(() => { document.title = `${p.title} – Murat Güven`; return () => { document.title = "Murat Güven"; }; }, [p.title]);
  const year = new Date().getFullYear();
  const bib = `@software{guven_${slug.replace(/-/g, "_")},
  author = {Güven, Murat},
  title  = {${p.title}},
  year   = {${year}},
  url    = {${registry.site}${path}}
}`;
  const flash = (t: string) => { setNote(t); window.setTimeout(() => setNote(""), 2500); };

  return (
    <>
      <SiteHeader />
      <main id="main">
        <Wrap className="pb-20 pt-4 md:pt-6">
          <nav aria-label="Breadcrumb" className="t-data text-ink-2">
            <Link className="link" to="/tools">Tools</Link>
            <span aria-hidden="true"> / </span>
            {p.group && <>
              <Link className="link" to={`/tools#${groupId(p.group)}`}>{p.group}</Link>
              <span aria-hidden="true"> / </span>
            </>}
            <span aria-current="page">{p.title}</span>
          </nav>
          <h1 className="t-h2 relative mt-3 flex items-start gap-3">
            <Back />
            <span className="min-w-0">{p.title}</span>
          </h1>
          <p className="mt-2 max-w-[78ch] text-ink-2">{p.line}</p>

          <div className="mt-8">{children}</div>

          {method && <div className="mt-16 grid gap-x-10 gap-y-10 border-t border-rule pt-10 md:grid-cols-3">
            <section aria-labelledby="method-h" className="min-w-0">
              <h2 id="method-h" className="t-h3">Method</h2>
              <div className="mt-3 space-y-3 text-ink-2">{method}</div>
              <div className="mt-5 flex flex-wrap gap-2">
                {paper && <a className="btn" href={paper} rel="noopener noreferrer">My paper</a>}
                {methodRef && <a className="btn" href={methodRef.href} rel="noopener noreferrer">Method reference</a>}
                <a className="btn" href={`${REPO}/${slug}`} rel="noopener noreferrer">Code</a>
              </div>
            </section>
            <section aria-labelledby="limits-h" className="min-w-0">
              <h2 id="limits-h" className="t-h3">Assumptions and limits</h2>
              <div className="mt-3 space-y-3 text-ink-2">{limits}</div>
            </section>
            <section id="cite" aria-labelledby="cite-h" className="min-w-0">
              <h2 id="cite-h" className="t-h3">Cite</h2>
              <pre className="t-small mt-3 overflow-x-auto border border-rule bg-wash p-3 font-mono">{bib}</pre>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button type="button" className="btn" onClick={async () => flash((await copy(bib)) ? "Citation copied" : "Select the text to copy it")}>Copy BibTeX</button>
                <button type="button" className="btn" onClick={async () => flash((await copy(window.location.href)) ? "Link copied, with these settings" : "Copy the address bar instead")}>Copy link</button>
                <span className={note ? "t-small text-ink-2" : "sr-only"} role="status" aria-live="polite">{note}</span>
              </div>
            </section>
          </div>}
        </Wrap>
      </main>
      <SiteFooter />
    </>
  );
};

export default ToolShell;

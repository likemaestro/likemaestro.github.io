import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SiteHeader, { SiteFooter, Wrap } from "../components/SiteHeader";
import registry from "./pages.json";

export const page = (path: string) => registry.pages.find((p) => p.path === path)!;
const REPO = "https://github.com/likemaestro/likemaestro.github.io/tree/master/src/tools";
/** Güven & Özdemir (2026), Finite Elements in Analysis and Design 260, 104599: the microstructure tools' related paper. */
export const MICRO_PAPER = "https://doi.org/10.1016/j.finel.2026.104599";

/** Copy text to the clipboard; resolves false where the browser refuses (the caller then shows the text). */
async function copy(text: string) {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

/** The frame every tool page shares: header, breadcrumb, title, actions, the tool, then method, limits and citation. */
const ToolShell: React.FC<{
  path: string;
  slug: string;
  methodRef?: { label: string; href: string };
  paper?: string;
  method: React.ReactNode;
  limits: React.ReactNode;
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
          <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3">
            <nav aria-label="Breadcrumb" className="t-data text-ink-2">
              <Link className="link" to="/tools">Tools</Link>
              <span aria-hidden="true"> / </span>
              <span aria-current="page">{p.title}</span>
            </nav>
            <div className="flex flex-wrap items-center gap-2 max-md:order-last">
              <button type="button" className="btn" onClick={async () => flash((await copy(window.location.href)) ? "Link copied" : "Copy the address bar instead")}>Copy link</button>
              <a className="btn" href="#cite">Cite</a>
              {paper && <a className="btn" href={paper} rel="noopener noreferrer">My paper</a>}
              {methodRef && <a className="btn" href={methodRef.href} rel="noopener noreferrer">Method reference</a>}
              <a className="btn" href={`${REPO}/${slug}`} rel="noopener noreferrer">Code</a>
              <span className={note ? "t-small text-ink-2" : "sr-only"} role="status" aria-live="polite">{note}</span>
            </div>
            <div className="w-full min-w-0">
              <h1 className="t-h2">{p.title}</h1>
              <p className="mt-2 max-w-[78ch] text-ink-2">{p.line}</p>
            </div>
          </div>

          <div className="mt-8">{children}</div>

          <div className="mt-16 grid gap-x-10 gap-y-10 border-t border-rule pt-10 md:grid-cols-3">
            <section aria-labelledby="method-h" className="min-w-0">
              <h2 id="method-h" className="t-h3">Method</h2>
              <div className="mt-3 space-y-3 text-ink-2">{method}</div>
            </section>
            <section aria-labelledby="limits-h" className="min-w-0">
              <h2 id="limits-h" className="t-h3">Assumptions and limits</h2>
              <div className="mt-3 space-y-3 text-ink-2">{limits}</div>
            </section>
            <section id="cite" aria-labelledby="cite-h" className="min-w-0">
              <h2 id="cite-h" className="t-h3">Cite</h2>
              <pre className="t-small mt-3 overflow-x-auto border border-rule bg-wash p-3 font-mono">{bib}</pre>
              <button type="button" className="btn mt-3" onClick={async () => flash((await copy(bib)) ? "Citation copied" : "Select the text to copy it")}>Copy BibTeX</button>
            </section>
          </div>
        </Wrap>
      </main>
      <SiteFooter />
    </>
  );
};

export default ToolShell;

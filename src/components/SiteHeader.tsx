import React from "react";
import { Link, useLocation } from "react-router-dom";
import { profiles } from "../content/site";

export const Wrap: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <div className={`mx-auto max-w-page px-4 sm:px-6 ${className}`}>{children}</div>
);

/** Back to a section index (/tools, /articles): a square button with a "‹", beside the title. From 1600 px it hangs in
 *  the left margin, 1.5rem from the content; below that it stands in front of the title. It sits centred on the title's
 *  first line (1.12 × the t-h2 size). */
export const Back: React.FC<{ to: string; label: string }> = ({ to, label }) => (
  <Link to={to} aria-label={label}
    className="btn group mt-[calc((clamp(1.75rem,3vw,2.5rem)*1.12-2.75rem)/2)] h-11 w-11 shrink-0 px-0 min-[1600px]:absolute min-[1600px]:right-full min-[1600px]:top-0 min-[1600px]:mr-6">
    <svg viewBox="0 0 12 24" aria-hidden="true" className="h-[18px] w-auto transition-transform duration-150 group-hover:-translate-x-[2px] group-focus-visible:-translate-x-[2px] motion-reduce:transform-none" fill="none" stroke="currentColor">
      <path d="M9 3 3 12l6 9" strokeWidth="1.75" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </Link>
);

// Profile marks for the header (Simple Icons / GitHub Octicons paths, 24-unit viewBox); the full list is in Contact.
const MARKS: Record<string, string> = {
  GitHub: "M12 .3a12 12 0 0 0-3.8 23.38c.6.12.83-.26.83-.57L9 21.07c-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.08-.74.09-.73.09-.73 1.2.09 1.83 1.24 1.83 1.24 1.07 1.83 2.81 1.3 3.5 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18a4.65 4.65 0 0 1 1.23 3.22c0 4.61-2.8 5.63-5.48 5.92.42.36.81 1.1.81 2.22l-.01 3.29c0 .31.2.69.82.57A12 12 0 0 0 12 .3",
  LinkedIn: "M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zm1.78 13.02H3.56V9h3.56v11.45zM22.23 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0h.01z",
  "Google Scholar": "M5.24 13.77 0 9.5 12 0l12 9.5-5.24 4.27C17.55 11.25 14.98 9.5 12 9.5c-2.98 0-5.55 1.75-6.76 4.27zM12 10a7 7 0 1 0 0 14 7 7 0 0 0 0-14z",
};

/** Skip link and header, shared by the home page, the tool pages and the articles. Section links point at the home page. */
const SiteHeader: React.FC = () => {
  const { pathname } = useLocation();
  const inTools = pathname.startsWith("/tools"), inArticles = pathname.startsWith("/articles");
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-canvas focus:px-3 focus:py-2">
        Skip to content
      </a>
      <header>
        <Wrap className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-6">
          <a href="/" className="t-name" translate="no">Murat Güven</a>
          {/* Phones: name and profile marks on one row, the sections below. Wider: name … sections | marks. */}
          <nav aria-label="Sections" className="max-md:order-last max-md:w-full md:ml-auto">
            <ul className="t-data flex flex-wrap gap-x-6 gap-y-2">
              <li><a className="link" href="/#research">Research</a></li>
              <li><a className="link" href="/#publications">Publications</a></li>
              <li><Link className="link" to="/tools" aria-current={inTools ? "page" : undefined}>Tools</Link></li>
              <li><Link className="link" to="/articles" aria-current={inArticles ? "page" : undefined}>Articles</Link></li>
              <li><a className="link" href="/#about">About</a></li>
              <li><a className="link" href="/Murat_Guven_CV.pdf" aria-label="CV, PDF">CV</a></li>
            </ul>
          </nav>
          <ul aria-label="Profiles" className="-mr-1.5 flex items-center gap-x-1 md:border-l md:border-rule md:pl-4">
            {profiles.filter((p) => MARKS[p.label]).map((p) => (
              <li key={p.label}>
                <a href={p.href} rel="noopener noreferrer" aria-label={p.label} title={p.label} className="-my-1.5 block p-1.5 text-ink-2 transition-colors duration-150 hover:text-ink">
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[1.125rem] w-[1.125rem]" fill="currentColor"><path d={MARKS[p.label]} /></svg>
                </a>
              </li>
            ))}
          </ul>
        </Wrap>
      </header>
    </>
  );
};

export const SiteFooter: React.FC = () => (
  <footer className="border-t border-rule">
    <Wrap className="t-small py-8 text-ink-2">© {new Date().getFullYear()} Murat Güven</Wrap>
  </footer>
);

export default SiteHeader;

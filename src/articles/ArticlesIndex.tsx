import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import SiteHeader, { SiteFooter, Wrap } from "../components/SiteHeader";
import { articles, index, longDate } from "./registry";

/** /articles: every article, newest first, as rows (title, standfirst, topic, date, reading time). */
const ArticlesIndex: React.FC = () => {
  useEffect(() => { document.title = `${index.title} – Murat Güven`; return () => { document.title = "Murat Güven"; }; }, []);

  return (
    <>
      <SiteHeader />
      <main id="main">
        <Wrap className="pb-24 pt-6 md:pt-10">
          <h1 className="t-h2">{index.title}</h1>
          <p className="mt-3 max-w-[60ch] text-ink-2">{index.line}</p>
          <ul className="mt-10 border-b border-rule md:mt-14">
            {articles.map((a) => (
              <li key={a.slug} className="border-t border-rule">
                <Link to={`${index.path}/${a.slug}`} className="group grid gap-x-8 gap-y-2 py-6 md:grid-cols-[10rem_minmax(0,1fr)_auto] md:items-baseline">
                  <span className="t-data text-ink-2"><time dateTime={a.date}>{longDate(a.date)}</time></span>
                  <span className="min-w-0">
                    <span className="t-h3 block group-hover:underline">{a.title}</span>
                    <span className="mt-1 block max-w-[72ch] text-ink-2">{a.line}</span>
                    <span className="t-data mt-2 flex flex-wrap gap-x-4 text-ink-2"><span>{a.topic}</span><span>About {a.minutes} minutes</span></span>
                  </span>
                  <svg viewBox="0 0 16 16" aria-hidden="true" className="hidden h-4 w-4 self-center text-ink-2 transition-transform duration-150 group-hover:translate-x-0.5 md:block" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 3.5 10.5 8 6 12.5" /></svg>
                </Link>
              </li>
            ))}
          </ul>
        </Wrap>
      </main>
      <SiteFooter />
    </>
  );
};

export default ArticlesIndex;

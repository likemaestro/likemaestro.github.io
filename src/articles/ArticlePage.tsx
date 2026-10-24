import React, { Suspense, lazy, useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import type { MDXComponents } from "mdx/types";
import SiteHeader, { Back, SiteFooter, Wrap } from "../components/SiteHeader";
import { article, bodies, bodyPath, index, longDate } from "./registry";

const BODY = Object.fromEntries(Object.entries(bodies).map(([path, load]) => [path, lazy(load)]));

/** Plain text of a heading, for its id and the contents list. */
const textOf = (node: React.ReactNode): string =>
  typeof node === "string" || typeof node === "number" ? String(node)
    : Array.isArray(node) ? node.map(textOf).join("")
    : React.isValidElement<{ children?: React.ReactNode }>(node) ? textOf(node.props.children) : "";
const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Section headings get ids, so the contents list and shared links can point at them; site links stay in the app.
const COMPONENTS: MDXComponents = {
  h2: ({ children }) => <h2 id={slugify(textOf(children))}>{children}</h2>,
  a: ({ href = "", children, ...rest }) =>
    href.startsWith("/") && !/\.\w+$/.test(href) ? <Link to={href} {...rest}>{children}</Link>
      : <a href={href} rel={href.startsWith("http") ? "noopener noreferrer" : undefined} {...rest}>{children}</a>,
};

/** The article's sections, read from the rendered page, for the contents list beside it on wide screens. A link to a
 *  section (/articles/x#heading) is followed once the body has arrived, since the browser looked before it existed. */
function useSections(ready: string) {
  const [sections, setSections] = useState<{ id: string; text: string }[]>([]);
  useEffect(() => {
    const body = document.getElementById("article-body");
    if (!body) return;
    // The figures size themselves after the body arrives, moving what follows them, so the jump is repeated while the
    // body settles, until the reader scrolls or two seconds pass.
    let target: HTMLElement | null = null, pending = !!window.location.hash;
    const t0 = performance.now(), jump = () => target?.scrollIntoView({ behavior: "instant" as ScrollBehavior });
    const read = () => {
      setSections([...body.querySelectorAll("h2[id]")].map((h) => ({ id: h.id, text: h.textContent ?? "" })));
      if (pending) target = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
      if (target && pending) { pending = false; jump(); }
    };
    const settle = new ResizeObserver(() => { if (performance.now() - t0 < 2000) jump(); else target = null; });
    const stop = () => { target = null; };
    read();
    const mo = new MutationObserver(read);   // the body arrives after its chunk loads
    mo.observe(body, { childList: true, subtree: false });
    settle.observe(body);
    window.addEventListener("wheel", stop, { once: true, passive: true });
    window.addEventListener("touchstart", stop, { once: true, passive: true });
    window.addEventListener("keydown", stop, { once: true });
    return () => {
      mo.disconnect(); settle.disconnect();
      window.removeEventListener("wheel", stop); window.removeEventListener("touchstart", stop); window.removeEventListener("keydown", stop);
    };
  }, [ready]);
  return sections;
}

/** One article: breadcrumb, title, standfirst and date, then the MDX body, with its contents list beside it from 1280 px. */
const ArticlePage: React.FC = () => {
  const { slug = "" } = useParams();
  const meta = article(slug), Body = BODY[bodyPath(slug)];
  const sections = useSections(slug);
  useEffect(() => {
    if (!meta) return;
    document.title = `${meta.title} – Murat Güven`;
    return () => { document.title = "Murat Güven"; };
  }, [meta]);
  if (!meta || !Body) return <Navigate to={index.path} replace />;

  return (
    <>
      <SiteHeader />
      <main id="main">
        <Wrap className="pb-24 pt-4 md:pt-6">
          <nav aria-label="Breadcrumb" className="t-data text-ink-2">
            <Link className="link" to={index.path}>{index.title}</Link>
            <span aria-hidden="true"> / </span>
            <span aria-current="page">{meta.title}</span>
          </nav>
          {/* From 1280 px the contents list sits beside the body, level with its top rule, and stays in view. */}
          <article className="xl:grid xl:grid-cols-[minmax(0,44rem)_minmax(0,1fr)] xl:gap-x-16" aria-labelledby="article-h">
            <header className="min-w-0">
              <h1 id="article-h" className="t-h2 relative mt-3 flex items-start gap-3">
                <Back to={index.path} label={`Back to ${index.title}`} />
                <span className="min-w-0">{meta.title}</span>
              </h1>
              <p className="mt-4 text-ink-2 md:text-[1.1875rem]">{meta.line}</p>
              <p className="t-data mt-4 flex flex-wrap gap-x-4 text-ink-2">
                <span>{meta.topic}</span>
                <time dateTime={meta.date}>{longDate(meta.date)}</time>
                <span>About {meta.minutes} minutes</span>
              </p>
            </header>
            <div id="article-body" className="article mt-10 min-w-0 border-t border-rule pt-8 xl:col-start-1 xl:row-start-2">
              <Suspense fallback={<p className="t-small text-ink-2">Loading the article…</p>}>
                <Body components={COMPONENTS} />
              </Suspense>
            </div>
            {sections.length > 2 && (
              <nav aria-label="Contents" className="hidden xl:col-start-2 xl:row-start-2 xl:mt-10 xl:block">
                <div className="sticky top-8 border-t border-rule pt-8">
                  <p className="t-small text-ink-2">Contents</p>
                  <ol className="t-small mt-3 space-y-2">
                    {sections.map((s) => <li key={s.id}><a className="text-ink-2 hover:text-ink hover:underline" href={`#${s.id}`}>{s.text}</a></li>)}
                  </ol>
                </div>
              </nav>
            )}
          </article>
        </Wrap>
      </main>
      <SiteFooter />
    </>
  );
};

export default ArticlePage;

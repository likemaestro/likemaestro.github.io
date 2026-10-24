import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import data from "./articles.json";

/** Each article rendered to HTML, by slug. Rendering also proves the MDX and its figures run without throwing. */
const bodies = import.meta.glob<{ default: ComponentType }>("./*/index.mdx", { eager: true });
const html = Object.fromEntries(Object.entries(bodies).map(([file, m]) => [file.split("/")[1], renderToStaticMarkup(createElement(m.default))]));

/** Words a reader reads: text without tags, with each formula counted as one word. */
const words = (h: string) => h.replace(/<math[\s\S]*?<\/math>/g, " x ").replace(/<[^>]+>/g, " ").split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;

test("every listed article has a body, and every body is listed", () => {
  expect(data.articles.map((a) => a.slug).sort()).toEqual(Object.keys(html).sort());
});

test("articles are listed with a unique slug, an ISO date and a description that fits a link preview", () => {
  expect(new Set(data.articles.map((a) => a.slug)).size).toBe(data.articles.length);
  for (const a of data.articles) {
    expect(a.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(a.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(a.line.length).toBeLessThanOrEqual(200);
  }
});

test("the stated reading time matches the length, at 180 to 230 words a minute", () => {
  for (const a of data.articles) {
    const n = words(html[a.slug]);
    expect(a.minutes).toBeGreaterThanOrEqual(Math.floor(n / 230));
    expect(a.minutes).toBeLessThanOrEqual(Math.ceil(n / 180) + 2);   // a little longer for the figures
  }
});

test("formulas are typeset as MathML at build time, with no KaTeX markup left for the browser", () => {
  for (const h of Object.values(html)) {
    expect(h).toContain("<math");
    expect(h).not.toContain("katex-html");
    expect(h).not.toMatch(/mathvariant="(bold|bold-italic|script)"/);
  }
});

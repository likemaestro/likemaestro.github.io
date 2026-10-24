import type { ComponentType } from "react";
import type { MDXComponents } from "mdx/types";
import data from "./articles.json";

export interface ArticleMeta { slug: string; title: string; line: string; topic: string; date: string; minutes: number }

export const index = data.index;
/** Newest first. */
export const articles: ArticleMeta[] = [...data.articles].sort((a, b) => b.date.localeCompare(a.date));
export const article = (slug: string) => articles.find((a) => a.slug === slug);

/** Each article is src/articles/<slug>/index.mdx, loaded only when it is opened. */
export const bodies = import.meta.glob<{ default: ComponentType<{ components?: MDXComponents }> }>("./*/index.mdx");
export const bodyPath = (slug: string) => `./${slug}/index.mdx`;

/** "October 24, 2026" from an ISO date, read as a calendar day (no time zone shift). */
export const longDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });

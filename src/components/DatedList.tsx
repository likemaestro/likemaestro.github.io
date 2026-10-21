import React from "react";
import { DatedEntry, SELF } from "../content/site";

export const ordered = (items: DatedEntry[]) =>
  [...items].sort((a, b) => Number(!!b.forthcoming) - Number(!!a.forthcoming) || b.sort.localeCompare(a.sort));

const DatedList: React.FC<{ items: DatedEntry[] }> = ({ items }) => {
  if (!items.length) return null;
  return (
    <ol className="border-t border-rule">
      {ordered(items).map((it) => (
        <li key={it.title} className="grid gap-x-8 gap-y-1 border-b border-rule py-5 md:grid-cols-12">
          <span className="t-data text-ink-2 md:col-span-2">{it.date}</span>
          <div className="min-w-0 md:col-span-10">
            <h3 className="t-h3 max-w-[60ch]">
              {it.url ? <a className="link" href={it.url}>{it.title}</a> : it.title}
            </h3>
            {it.authors && (
              <p className="t-data mt-1 text-ink-2">
                {it.authors.map((a, i) => (
                  <React.Fragment key={a}>
                    {i > 0 && ", "}
                    {a === SELF ? <span className="font-[560] text-ink">{a}</span> : a}
                  </React.Fragment>
                ))}
              </p>
            )}
            <p className="t-data mt-1 text-ink-2">{it.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  );
};

export default DatedList;

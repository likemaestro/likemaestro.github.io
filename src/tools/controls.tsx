import React from "react";

// Labelled control and joined toggle buttons shared by the tools.
export const Field: React.FC<{ label: string; value?: string; children: React.ReactNode; htmlFor?: string }> = ({ label, value, children, htmlFor }) => (
  <div className="min-w-0">
    <div className="flex items-baseline justify-between gap-2">
      <label htmlFor={htmlFor} className="t-small text-ink-2">{label}</label>
      {value && <output htmlFor={htmlFor} className="t-data">{value}</output>}
    </div>
    <div className="mt-1.5">{children}</div>
  </div>
);

export const Segmented: React.FC<{ label: string; options: { v: string; text: string }[]; value: string; onChange: (v: string) => void; cols?: number }> = ({ label, options, value, onChange, cols }) => (
  <div role="group" aria-label={label} className={`grid rounded-[2px] border border-ink ${cols === 2 ? "grid-cols-2" : "grid-flow-col auto-cols-fr"}`}>
    {options.map((o, i) => (
      <button key={o.v} type="button" aria-pressed={value === o.v} onClick={() => onChange(o.v)}
        className={`t-data min-h-[2.25rem] px-2 transition-colors duration-150 [@media(pointer:coarse)]:min-h-[44px] ${i && (cols !== 2 || i % 2) ? "border-l border-rule" : ""} ${cols === 2 && i >= 2 ? "border-t border-rule" : ""} ${
          value === o.v ? "bg-ink font-[600] text-canvas" : "text-ink-2 hover:bg-wash hover:text-ink"}`}>
        {o.text}
      </button>
    ))}
  </div>
);

/** An ⓘ that shows a short explanation on hover or keyboard focus, and on tap on touch screens. */
export const Tip: React.FC<{ label: string; children: React.ReactNode; align?: "left" | "right" }> = ({ label, children, align = "left" }) => {
  const id = React.useId();
  return (
    <span className="group relative inline-flex align-middle">
      <button type="button" aria-label={`About ${label}`} aria-describedby={id}
        className="inline-flex h-5 w-5 items-center justify-center text-ink-2 transition-colors duration-150 hover:text-ink focus-visible:text-ink [@media(pointer:coarse)]:-m-3 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11">
        <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.3"><circle cx="8" cy="8" r="6.5" /><path d="M8 7.2v4.3M8 4.7v.1" strokeLinecap="round" /></svg>
      </button>
      <span id={id} role="tooltip" className={`t-small invisible absolute top-full z-30 mt-1 w-72 max-w-[80vw] bg-ink px-3 py-2 font-normal normal-case text-canvas opacity-0 transition-opacity duration-150 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100 ${align === "right" ? "right-0" : "left-0"}`}>
        {children}
      </span>
    </span>
  );
};

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

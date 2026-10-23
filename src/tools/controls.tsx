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

/** An ⓘ that shows a short explanation on hover or keyboard focus, and on tap on touch screens. The text is fixed to
 *  the window, so scroll boxes don't clip it, kept on screen, and closed by Escape or by scrolling. */
export const Tip: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => {
  const id = React.useId(), btn = React.useRef<HTMLButtonElement>(null), tip = React.useRef<HTMLSpanElement>(null);
  const [open, setOpen] = React.useState(false);
  React.useLayoutEffect(() => {
    const b = btn.current, t = tip.current;
    if (!open || !b || !t) return;
    const r = b.getBoundingClientRect(), W = document.documentElement.clientWidth, H = window.innerHeight;
    t.style.left = `${Math.max(8, Math.min(r.left, W - 8 - t.offsetWidth))}px`;
    t.style.top = `${r.bottom + 4 + t.offsetHeight > H && r.top > t.offsetHeight + 8 ? r.top - 4 - t.offsetHeight : r.bottom + 4}px`;
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, { capture: true, passive: true });
    window.addEventListener("resize", close);
    return () => { window.removeEventListener("scroll", close, { capture: true }); window.removeEventListener("resize", close); };
  }, [open]);
  return (
    <span className="inline-flex align-middle" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)} onBlur={() => setOpen(false)} onKeyDown={(e) => e.key === "Escape" && setOpen(false)}>
      <button ref={btn} type="button" aria-label={`About ${label}`} aria-describedby={id}
        className="inline-flex h-5 w-5 items-center justify-center text-ink-2 transition-colors duration-150 hover:text-ink focus-visible:text-ink [@media(pointer:coarse)]:-m-3 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11">
        <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.3"><circle cx="8" cy="8" r="6.5" /><path d="M8 7.2v4.3M8 4.7v.1" strokeLinecap="round" /></svg>
      </button>
      <span ref={tip} id={id} role="tooltip" hidden={!open}
        className="t-small fixed z-50 w-72 max-w-[calc(100vw-1rem)] bg-ink px-3 py-2 text-left font-normal normal-case text-canvas">
        {children}
      </span>
    </span>
  );
};

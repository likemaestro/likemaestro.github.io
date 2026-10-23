import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

// A tool's settings live in the query string, so a link reproduces them. Out-of-range values are clamped and reported.
export type Field =
  | { kind: "enum"; values: readonly string[]; def: string }
  | { kind: "num"; min: number; max: number; step: number; def: number }
  | { kind: "text"; ok: (v: string) => boolean; def: string };

const snap = (v: number, f: Extract<Field, { kind: "num" }>) => {
  const s = Math.round((Math.min(f.max, Math.max(f.min, v)) - f.min) / f.step) * f.step + f.min;
  return Number(s.toFixed(6));
};

export function useToolParams<S extends Record<string, Field>>(spec: S) {
  const [sp, setSp] = useSearchParams();
  // The settings live in state and the link mirrors them: the router updates the link asynchronously, so an input
  // that read straight from it would drop fast keystrokes.
  const [q, setQ] = useState(() => new URLSearchParams(sp));
  useEffect(() => { if (q.toString() !== sp.toString()) setSp(q, { replace: true }); }, [q]);   // eslint-disable-line react-hooks/exhaustive-deps
  const { values, clamped } = useMemo(() => {
    const values = {} as { [K in keyof S]: S[K] extends { kind: "num" } ? number : string };
    const clamped: string[] = [];
    for (const k of Object.keys(spec) as (keyof S & string)[]) {
      const f = spec[k], raw = q.get(k);
      let v: string | number = f.def;
      if (raw !== null) {
        if (f.kind === "enum") { if (f.values.includes(raw)) v = raw; else clamped.push(k); }
        else if (f.kind === "text") { if (f.ok(raw)) v = raw; else clamped.push(k); }
        else { const x = Number(raw); if (Number.isFinite(x)) { v = snap(x, f); if (v !== x) clamped.push(k); } else clamped.push(k); }
      }
      (values as Record<string, string | number>)[k] = v;
    }
    return { values, clamped };
  }, [q, spec]);
  const set = useCallback((patch: Partial<Record<keyof S, string | number>>) => {
    setQ((prev) => {
      const next = new URLSearchParams(prev);
      for (const [k, v] of Object.entries(patch)) if (v !== undefined) next.set(k, String(v));
      return next;
    });
  }, []);
  return { values, clamped, set };
}

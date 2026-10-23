import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

// A tool's settings live in the query string, so a link reproduces them. Out-of-range values are clamped and reported.
export type Field =
  | { kind: "enum"; values: readonly string[]; def: string }
  | { kind: "num"; min: number; max: number; step: number; def: number };

const snap = (v: number, f: Extract<Field, { kind: "num" }>) => {
  const s = Math.round((Math.min(f.max, Math.max(f.min, v)) - f.min) / f.step) * f.step + f.min;
  return Number(s.toFixed(6));
};

export function useToolParams<S extends Record<string, Field>>(spec: S) {
  const [sp, setSp] = useSearchParams();
  const { values, clamped } = useMemo(() => {
    const values = {} as { [K in keyof S]: S[K] extends { kind: "num" } ? number : string };
    const clamped: string[] = [];
    for (const k of Object.keys(spec) as (keyof S & string)[]) {
      const f = spec[k], raw = sp.get(k);
      let v: string | number = f.def;
      if (raw !== null) {
        if (f.kind === "enum") { if (f.values.includes(raw)) v = raw; else clamped.push(k); }
        else { const x = Number(raw); if (Number.isFinite(x)) { v = snap(x, f); if (v !== x) clamped.push(k); } else clamped.push(k); }
      }
      (values as Record<string, string | number>)[k] = v;
    }
    return { values, clamped };
  }, [sp, spec]);
  const set = useCallback((patch: Partial<Record<keyof S, string | number>>) => {
    setSp((prev) => {
      const next = new URLSearchParams(prev);
      for (const [k, v] of Object.entries(patch)) if (v !== undefined) next.set(k, String(v));
      return next;
    }, { replace: true });
  }, [setSp]);
  return { values, clamped, set };
}

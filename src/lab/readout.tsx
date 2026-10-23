import React from "react";
import { properties } from "./unitcell";
import type { Objective } from "./unitcell";

export type Key = "E1" | "G12" | "nu12" | "K";

export const TARGETS: { id: Objective; label: string; track: Key; aria: string; active: number[] }[] = [
  { id: "axial", label: "Axial", track: "E1", aria: "axial stiffness", active: [0, 4] },
  { id: "shear", label: "Shear", track: "G12", aria: "shear stiffness", active: [8] },
  { id: "bulk", label: "Bulk", track: "K", aria: "bulk modulus", active: [0, 1, 3, 4] },
  { id: "auxetic", label: "Auxetic", track: "nu12", aria: "a negative Poisson’s ratio", active: [0, 1, 3, 4] },
];
export const target = (t: Objective) => TARGETS.find((x) => x.id === t)!;

// Objective and homogenized stiffness, typeset as MathML (native in current browsers, no math library).
const Ch = (ij: string) => `<msubsup><mi>C</mi><mn>${ij}</mn><mi mathvariant="normal">H</mi></msubsup>`;
const op = (name: string) => `<munder><mi>${name}</mi><mi>ρ</mi></munder><mspace width="0.3em"></mspace>`;
const GOAL: Record<Objective, string> = {
  axial: `${op("max")}${Ch("11")}<mo>+</mo>${Ch("22")}`,
  shear: `${op("max")}${Ch("33")}`,
  bulk: `${op("max")}${Ch("11")}<mo>+</mo>${Ch("22")}<mo>+</mo><mn>2</mn>${Ch("12")}`,
  auxetic: `${op("min")}${Ch("12")}<mo>−</mo><mi>w</mi><mo stretchy="false">(</mo>${Ch("11")}<mo>+</mo>${Ch("22")}<mo stretchy="false">)</mo>`,
};
export const goalMath = (t: Objective) => `<math displaystyle="true"><mrow>${GOAL[t]}</mrow></math>`;
export const subjectMath = (vf = 0.4) => `<math><mtext>subject to</mtext><mspace width="0.5em"></mspace><mi>V</mi><mo>≤</mo><mn>${vf.toFixed(2)}</mn></math>`;
const entry = (v: number) => (!Number.isFinite(v) ? "·" : Math.abs(v) < 5e-4 ? "0.000" : (v < 0 ? "−" : "") + Math.abs(v).toFixed(3));
/** The 3 × 3 homogenized stiffness in units of E; entries outside `active` are dimmed. */
export const tensorMath = (C: ArrayLike<number>, active: number[]) =>
  `<math displaystyle="true"><mrow><mfrac><msup><mi>C</mi><mi mathvariant="normal">H</mi></msup><mi>E</mi></mfrac><mo>=</mo><mrow><mo>[</mo><mtable>${[0, 1, 2]
    .map((i) => `<mtr>${[0, 1, 2].map((j) => `<mtd><mn${active.includes(i * 3 + j) ? "" : ' class="dim"'}>${entry(C[i * 3 + j])}</mn></mtd>`).join("")}</mtr>`)
    .join("")}</mtable><mo>]</mo></mrow></mrow></math>`;

// 2D bulk modulus from the equibiaxial energy, and its Hashin–Shtrikman upper bound for a porous solid at volume f
// (plane stress, E = 1, nu = 0.3: kappa_s = 1/1.4, mu_s = 1/2.6).
export const kappa = (C: ArrayLike<number>) => (C[0] + C[4] + 2 * C[1]) / 4;
const KS = 1 / 1.4, GS = 1 / 2.6;
export const kappaHS = (f: number) => (f * KS * GS) / ((1 - f) * KS + GS);
const SYM: Record<Key, string> = {
  E1: "<msub><mi>E</mi><mn>1</mn></msub>",
  G12: "<msub><mi>G</mi><mn>12</mn></msub>",
  nu12: "<msub><mi>ν</mi><mn>12</mn></msub>",
  K: "<mi>κ</mi>",
};
export const num = (v: number, d: number) => (!Number.isFinite(v) ? "·" : (v < 0 ? "−" : "") + Math.abs(v).toFixed(d));
export interface Quantities { E1: number; G12: number; nu12: number; K: number; vol: number }
// A result typeset as "symbol = value" in units of E; bulk also as a fraction of its HS bound.
export const quantity = (k: Key, r: Quantities) => {
  const sp = '<mspace width="0.2em"></mspace>';
  const unit = k === "nu12" ? "" : `${sp}<mi>E</mi>`;
  const hs = k === "K" ? `<mo>=</mo><mn>${num(r.K / kappaHS(r.vol), 2)}</mn>${sp}<msub><mi>κ</mi><mtext>HS</mtext></msub>` : "";
  return `<math>${SYM[k]}<mo>=</mo><mn>${num(r[k], k === "nu12" ? 2 : 3)}</mn>${unit}${hs}</math>`;
};

/** E1, G12, nu12 and kappa from a 3 × 3 homogenized stiffness (plane stress, units of E). */
export function quantities(C: ArrayLike<number>, vol: number): Quantities {
  const { E1, nu12 } = properties(Float64Array.from(C as ArrayLike<number>));
  return { E1, G12: C[8], nu12, K: kappa(C), vol };
}

// Convergence of the target quantity: a slim line with a dashed physical reference and the live end point, no axes.
export const Trace: React.FC<{ data: number[]; reference?: number; live: boolean }> = ({ data, reference, live }) => {
  const W = 600, H = 36;
  if (data.length < 2) return <div className="h-9 min-w-0 flex-1" aria-hidden="true" />;
  const ref = reference !== undefined && Number.isFinite(reference) ? reference : undefined;
  let lo = Math.min(...data, ref ?? Infinity), hi = Math.max(...data, ref ?? -Infinity);
  if (hi - lo < 1e-9) { lo -= 1; hi += 1; }
  const x = (i: number) => (i / (data.length - 1)) * W;
  const y = (v: number) => H - 3 - ((v - lo) / (hi - lo)) * (H - 6);
  const last = data.length - 1;
  return (
    <div className="relative h-9 min-w-0 flex-1" aria-hidden="true">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
        {ref !== undefined && <line x1={0} x2={W} y1={y(ref)} y2={y(ref)} stroke="#819199" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />}
        <polyline points={data.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ")} fill="none" stroke="#172027" strokeWidth="1.25" vectorEffect="non-scaling-stroke" />
      </svg>
      <span
        className={`absolute h-[7px] w-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full ${live ? "bg-laser" : "bg-ink"}`}
        style={{ left: "100%", top: `${(y(data[last]) / H) * 100}%` }}
      />
    </div>
  );
};

/** MathML set as HTML; the strings above are built from fixed markup and numbers only. */
export const MathML: React.FC<{ html: string; className?: string }> = ({ html, className }) => (
  <div className={className} dangerouslySetInnerHTML={{ __html: html }} />
);

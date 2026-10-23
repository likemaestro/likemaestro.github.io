// Two small SVG drawings beside the 3D view: the cross-section where the beam sways most, and the χLT curve with the
// current beam on it.
import React from "react";
import type { Section } from "../steel/sections";
import { modeAt, zLoad, type Check, type Height, type Load, type LtbResult } from "./ltb";
import { displayScale, type Show } from "./show";

/** Where the flanges move most, as x in mm. */
export function swayAt(r: LtbResult) {
  let best = 0, x = r.L / 2;
  for (let k = 0; k <= r.n; k++) {
    const u = Math.max(Math.abs(r.mode.v[k] - r.ztop * r.mode.phi[k]), Math.abs(r.mode.v[k] + r.ztop * r.mode.phi[k]));
    if (u > best + 1e-9) { best = u; x = (k * r.L) / r.n; }
  }
  return x;
}

export const SectionInset: React.FC<{ sec: Section; L: number; load: Load; height: Height; result: LtbResult | null; show: Show; className?: string }> = ({ sec, L, load, height, result, show, className }) => {
  const { h, b, tw, tf } = sec, R = 1.1 * Math.max(h, b);
  const outline = (v: number, phi: number) => {
    const c = Math.cos(phi), s = Math.sin(phi), x = b / 2, y = h / 2, w = tw / 2, f = y - tf;
    // engineering axes, y to the right and z up; a positive twist turns the top flange towards −y
    const pts = [[-x, -y], [x, -y], [x, -f], [w, -f], [w, f], [x, f], [x, y], [-x, y], [-x, f], [-w, f], [-w, -f], [-x, -f]];
    return pts.map(([py, pz]) => `${(v + c * py - s * pz).toFixed(2)},${(-(s * py + c * pz)).toFixed(2)}`).join(" ");
  };
  const xs = result ? swayAt(result) : L / 2, c = result ? displayScale(result, L, show) : 0;
  const m = result ? modeAt(result, xs) : { v: 0, phi: 0 }, v = c * m.v, phi = c * m.phi;
  const zg = load === "moment" ? null : zLoad(h, height), arrowLen = 0.45 * h;
  const lp = zg === null ? null : [v - zg * Math.sin(phi), -zg * Math.cos(phi)];
  const label = `Cross-section ${(xs / 1e3).toFixed(1)} m from the left support${c ? `, swayed ${Math.abs(v).toFixed(0)} mm and twisted ${Math.abs((phi * 180) / Math.PI).toFixed(0)} degrees as drawn` : ", unloaded"}.`;
  return (
    <figure className={className}>
      <svg viewBox={`${-R} ${-R} ${2 * R} ${2 * R}`} role="img" aria-label={label} className="block aspect-square w-full border border-rule">
        <line x1={-R} x2={R} y1={0} y2={0} stroke="#CBD2D5" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
        <polygon points={outline(0, 0)} fill="none" stroke="#CBD2D5" vectorEffect="non-scaling-stroke" />
        <polygon points={outline(v, phi)} fill="#819199" fillOpacity="0.35" stroke="#172027" strokeWidth="1.25" vectorEffect="non-scaling-stroke" />
        <circle cx={v} cy={0} r={R * 0.025} fill="#172027" />
        {lp && <g stroke="#172027" fill="#172027" strokeWidth="1.25">
          {height === "bottom"
            ? <><line x1={lp[0]} x2={lp[0]} y1={lp[1]} y2={lp[1] + arrowLen} vectorEffect="non-scaling-stroke" /><path d={`M${lp[0]} ${lp[1] + arrowLen + R * 0.08}l${-R * 0.04} ${-R * 0.09}h${R * 0.08}z`} stroke="none" /></>
            : <><line x1={lp[0]} x2={lp[0]} y1={lp[1] - arrowLen} y2={lp[1] - R * 0.08} vectorEffect="non-scaling-stroke" /><path d={`M${lp[0]} ${lp[1]}l${-R * 0.04} ${-R * 0.09}h${R * 0.08}z`} stroke="none" /></>}
        </g>}
      </svg>
      <figcaption className="t-small mt-1 text-ink-2">Section at {(xs / 1e3).toFixed(1)} m{c ? ", drawn enlarged" : ""}</figcaption>
    </figure>
  );
};

/** χLT against λ̄LT for the section's curve (EN 1993-1-1, 6.3.2.3, recommended values), with the current beam. */
export const ChiCurve: React.FC<{ check: Check | null; className?: string }> = ({ check, className }) => {
  const W = 300, H = 160, M = { l: 44, r: 10, t: 10, b: 30 };
  const lmax = Math.max(2.5, Math.min(4, (check?.lam ?? 0) + 0.3));
  const alpha = check?.alpha ?? 0.34;
  const chi = (l: number) => {
    if (l <= 0.4) return 1;
    const P = 0.5 * (1 + alpha * (l - 0.4) + 0.75 * l * l);
    return Math.min(1, 1 / (l * l), 1 / (P + Math.sqrt(P * P - 0.75 * l * l)));
  };
  const sx = (l: number) => M.l + (l / lmax) * (W - M.l - M.r), sy = (c: number) => H - M.b - c * (H - M.t - M.b);
  const path = Array.from({ length: 121 }, (_, i) => { const l = (i / 120) * lmax; return `${i ? "L" : "M"}${sx(l).toFixed(1)} ${sy(chi(l)).toFixed(1)}`; }).join("");
  const label = check ? `Reduction curve ${check.curve}: current point at slenderness ${check.lam.toFixed(2)}, reduction ${check.chi.toFixed(2)}.` : "Reduction curve.";
  return (
    <figure className={className}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="block h-full w-full">
        <g stroke="#CBD2D5"><line x1={M.l} x2={W - M.r} y1={H - M.b} y2={H - M.b} /><line x1={M.l} x2={M.l} y1={M.t} y2={H - M.b} /></g>
        <g className="fill-ink-2" fontSize="11">
          {[0, 1, 2, 3, 4].filter((t) => t <= lmax).map((t) => <text key={t} x={sx(t)} y={H - M.b + 14} textAnchor="middle">{t}</text>)}
          {[0, 0.5, 1].map((t) => <text key={t} x={M.l - 6} y={sy(t) + 4} textAnchor="end">{t}</text>)}
          <text x={(M.l + W - M.r) / 2} y={H - 2} textAnchor="middle">λ̄LT</text>
          <text x={10} y={(M.t + H - M.b) / 2} textAnchor="middle" transform={`rotate(-90 10 ${(M.t + H - M.b) / 2})`}>χLT</text>
        </g>
        <path d={path} fill="none" stroke="#172027" strokeWidth="1.5" />
        {check && <circle cx={sx(Math.min(check.lam, lmax))} cy={sy(check.chi)} r={4.5} fill="#F05A24" stroke="#172027" strokeWidth="1" />}
      </svg>
      <figcaption className="t-small mt-1 text-ink-2">Curve {check?.curve ?? "b"}, rolled sections</figcaption>
    </figure>
  );
};

// From modes to a chord (parameter-mapping sonification): every mode becomes a tone at K·f, with K = 110 Hz / f1 of
// the healthy reference fixed for the building, so damage, temperature or occupancy move the notes and the chord can be
// heard to change. Amplitude: how much the tap excites the mode times how much the listening point moves in it.
// Decay: τ = 1 / (2π ζ f) with the physical frequency. A mapping, not a recording.
import type { Partial } from "../audio/partials";
import { SPAN, ZETA, type Mode } from "./building";

export const BASE = 110;
export const transposition = (f1ref: number) => BASE / f1ref;

export interface Tap { floor: number; dir: "x" | "y" }

/** Modal displacement at a point (x, y) of a floor in a direction: ux − y θ or uy + x θ. */
export const at = (m: Mode, floor: number, dir: "x" | "y", x = 0, y = 0) => {
  const r = 3 * (floor - 1);
  return dir === "x" ? m.phi[r] - y * m.phi[r + 2] : m.phi[r + 1] + x * m.phi[r + 2];
};

/** The partials of the first min(6, 3n) modes: tap at the corner (6, 6) of a floor, listen at the roof corner, same direction.
 *  An off-center tap lets the twisting modes sound too. */
export function partials(ms: Mode[], n: number, tap: Tap, K: number): (Partial & { mode: number; fPhys: number })[] {
  const raw = ms.slice(0, Math.min(6, 3 * n)).map((m, i) => ({ mode: i, fPhys: m.f, f: K * m.f, a: Math.abs(at(m, tap.floor, tap.dir, SPAN, SPAN) * at(m, n, tap.dir, SPAN, SPAN)), tau: 1 / (2 * Math.PI * ZETA * m.f) }));
  const top = Math.max(...raw.map((p) => p.a), 0);
  return top > 0 ? raw.map((p) => ({ ...p, a: p.a / top })).filter((p) => p.a >= 0.02) : [];
}

/** Visual frequency of a mode in the 3D view: f / f1 × 0.8 Hz. */
export const visualHz = (f: number, f1: number) => (f / f1) * 0.8;

/** K for a building: fixed by its healthy reference state, whatever the temperature, occupancy or damage. */
export const referenceK = (f1ref: number) => transposition(f1ref);

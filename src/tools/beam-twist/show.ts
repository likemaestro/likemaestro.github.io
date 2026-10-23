// How the buckling mode is drawn. A linear eigenproblem gives the shape of the mode, not its size, so the drawn size is
// a choice: the largest flange sway is L/20 × amp/2, with the twist capped at 30° × amp/2 (75° at most) so the drawing
// stays readable. avis (0 to 1) is the "Load it" animation. None of this changes a number.
import type { LtbResult } from "./ltb";

export interface Show { amp: number; avis: number }

/** Millimetres of flange sway per unit of the normalized mode (the mode's largest flange displacement is 1). */
export function displayScale(r: Pick<LtbResult, "mode">, L: number, s: Show) {
  let phi = 0;
  for (const p of r.mode.phi) phi = Math.max(phi, Math.abs(p));
  const twist = Math.min((75 * Math.PI) / 180, ((30 * Math.PI) / 180) * (s.amp / 2));
  return s.avis * Math.min((L / 20) * (s.amp / 2), phi > 0 ? twist / phi : Infinity);
}

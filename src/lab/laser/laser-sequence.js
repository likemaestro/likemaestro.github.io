// PhD band timeline. t is the band's scroll share (0..1): 0–12 approach, 12–62 bolt holes (pierce, lead-in,
// contour), 62–66 head retracts, 66–76 end cut drawn as a trace, 76–86 offcut moves to an exploded view, then hold.
import * as THREE from "three";
import { frontAt } from "./beam-scene.js";

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (t, a, b) => clamp((t - a) / (b - a));
export const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);

// Machined motion: cut progress is linear in scroll (constant feed). Camera motion is eased.
export const progressAt = (t) => seg(t, 0.12, 0.62);   // constant feed: linear in scroll
// After the last hole: the head retracts, the end cut is drawn as a trace, then the offcut moves to an exploded view.
export const parkAt = (t) => ease(seg(t, 0.62, 0.66));
export const endCutAt = (t) => seg(t, 0.66, 0.76);
export const explodeAt = (t) => ease(seg(t, 0.76, 0.86));
export const headAt = (t) => t < 0.68;

const V = (x, y, z) => new THREE.Vector3(x, y, z);
// Offsets from the cut front; z is clamped so the camera never sits inside or behind a flange.
const R = (x, y, z, fov, tx = 0, ty = 0.02, tz = 0) => (F) => {
  const pos = F.clone().add(V(x, y, z)); pos.z = clamp(pos.z, -0.4, 0.4);
  return { pos, tgt: F.clone().add(V(tx, ty, tz)), fov };
};
const A = (pos, tgt, fov) => () => ({ pos: V(...pos), tgt: V(...tgt), fov });
const KEYS = [
  { t: 0.0,  get: A([3.4, 3.4, 2.6], [0.5, 0, 0], 30) },
  { t: 0.12, get: R(1.3, 1.1, 0.05, 30, -0.15) },
  { t: 0.2,  get: R(1.3, 0.6, 0.06, 32, -0.1) },
  { t: 0.62, get: R(1.3, 0.6, 0.06, 32, -0.1) },
  { t: 0.76, get: A([1.3, 3.3, 2.3], [1.55, 0, 0], 30) },
  { t: 1.0,  get: A([1.4, 3.6, 2.6], [1.55, 0, 0], 30) },
];

// Camera at scroll share t; aspect widens the vertical FOV on portrait screens instead of cropping in.
export function cameraAt(t, aspect = 1.5) {
  const f = frontAt(progressAt(t)), F = V(f.x, 0.02, f.y);
  let i = 0; while (i < KEYS.length - 2 && t > KEYS[i + 1].t) i++;
  const a = KEYS[i].get(F), b = KEYS[i + 1].get(F), u = ease(seg(t, KEYS[i].t, KEYS[i + 1].t));
  const k = aspect < 1.5 ? Math.pow(1.5 / aspect, 0.75) : 1;
  const fov = 2 * Math.atan(Math.tan(((a.fov + (b.fov - a.fov) * u) * Math.PI) / 360) * k) * (180 / Math.PI);
  return { pos: a.pos.lerp(b.pos, u), target: a.tgt.lerp(b.tgt, u), fov };
}


// Options for beam-scene renderFrame() at scroll share t.
export function frameAt(t, width, height) {
  const c = cameraAt(t, width / height);
  return { progress: progressAt(t), explode: explodeAt(t), endCut: endCutAt(t), park: parkAt(t), head: headAt(t),
    camera: { pos: c.pos.toArray(), target: c.target.toArray(), fov: c.fov } };
}

// Laser chapter timeline: one source for the scroll-scrubbed test and the D3 storyboard keyframes.
// t is the chapter's scroll share (0..1). Scroll shares: 0–15 approach, 15–25 pierce, 25–60 bolt holes,
// 60–75 kerf close-up, 75–90 finished part (end cut, exploded offcut), 90–100 decision transition.
import * as THREE from "three";
import { LEAD_IN_SHARE, frontAt } from "./beam-scene.js";

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (t, a, b) => clamp((t - a) / (b - a));
export const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);

// Machined motion: cut progress is linear in scroll (constant feed). Camera motion is eased.
export const progressAt = (t) =>
  t < 0.15 ? 0 :
  t < 0.25 ? LEAD_IN_SHARE * seg(t, 0.15, 0.25) :
  t < 0.6  ? LEAD_IN_SHARE + (0.85 - LEAD_IN_SHARE) * seg(t, 0.25, 0.6) :
  t < 0.75 ? 0.85 + 0.12 * seg(t, 0.6, 0.75) :
  t < 0.78 ? 0.97 + 0.03 * seg(t, 0.75, 0.78) : 1;
// After the last hole: the head retracts, the end cut is drawn as a trace, then the offcut moves to an exploded view.
export const parkAt = (t) => ease(seg(t, 0.78, 0.81));
export const endCutAt = (t) => seg(t, 0.8, 0.86);
export const explodeAt = (t) => ease(seg(t, 0.86, 0.9));
export const headAt = (t) => t < 0.84;

const V = (x, y, z) => new THREE.Vector3(x, y, z);
// Offsets from the cut front; z is clamped so the camera never sits inside or behind a flange.
const R = (x, y, z, fov, tx = 0, ty = 0.02, tz = 0) => (F) => {
  const pos = F.clone().add(V(x, y, z)); pos.z = clamp(pos.z, -0.4, 0.4);
  return { pos, tgt: F.clone().add(V(tx, ty, tz)), fov };
};
const A = (pos, tgt, fov) => () => ({ pos: V(...pos), tgt: V(...tgt), fov });
const KEYS = [
  { t: 0.0,  get: A([3.4, 3.4, 2.6], [0.5, 0, 0], 30) },
  { t: 0.15, get: R(1.3, 1.1, 0.05, 30, -0.15) },
  { t: 0.24, get: R(1.0, 0.45, 0.06, 30, -0.05) },
  { t: 0.32, get: R(1.3, 0.6, 0.06, 32, -0.1) },
  { t: 0.6,  get: R(1.3, 0.6, 0.06, 32, -0.1) },
  { t: 0.66, get: R(-0.6, 0.28, 0.1, 32, 0.05) },
  { t: 0.75, get: R(-0.6, 0.28, 0.1, 32, 0.05) },
  { t: 0.86, get: A([1.3, 3.3, 2.3], [1.55, 0, 0], 30) },
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

// The six laser keyframes (scroll share at each settled state).
export const KEYFRAMES = [
  { id: "approach", t: 0.12, name: "Approach" },
  { id: "pierce",   t: 0.22, name: "Pierce and lead-in" },
  { id: "contour",  t: 0.5,  name: "Cutting the holes" },
  { id: "kerf",     t: 0.7,  name: "Kerf close-up" },
  { id: "profile",  t: 0.9,  name: "Finished part" },
  { id: "decision", t: 0.97, name: "Decision transition" },
];

// Options for beam-scene renderFrame() at scroll share t.
export function frameAt(t, width, height, style = "bay") {
  const c = cameraAt(t, width / height);
  return { style, width, height, progress: progressAt(t), explode: explodeAt(t), endCut: endCutAt(t), park: parkAt(t), head: headAt(t),
    camera: { pos: c.pos.toArray(), target: c.target.toArray(), fov: c.fov } };
}

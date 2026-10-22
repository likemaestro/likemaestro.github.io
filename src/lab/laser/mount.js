// PhD band, "model to metal". Scroll share t (0..1) drives one camera move: an invented steel frame drawn as BIM edge
// lines, a dive into one secondary beam (a dashed ghost: designed, not made) that rises out of its slot as real steel,
// laser bolt holes in the web, a plasma end cope, then the finished beam settles back into the frame.
// Illustrative render: invented frame, no process values. Sparks run on wall-clock time while a cut is active.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const BG = 0x121a1f;
const LIGHT = new THREE.Color(0xf6f7f5), DARK = new THREE.Color(BG), INK = new THREE.Color(0x172027), GREY = new THREE.Color(0x819199);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---- Frame: 3 bays × 2 storeys, two plane frames joined by secondary beams (metres, IPE/HEB-like sections).
const S = 6, BAYS = 3, H = 3.6, LEVELS = 2, D = 6;
const COL = { h: 0.3, b: 0.3, tf: 0.019, tw: 0.011 };
const MAIN = { h: 0.4, b: 0.18, tf: 0.0135, tw: 0.0086 };
const SEC = { h: 0.3, b: 0.15, tf: 0.0107, tw: 0.0071 };
const CENTER = V(1.5 * S, 3.2, D / 2);

// ---- The cut beam, in its own coordinates: x along the axis from the coped end, y up, z across (torch on +z).
const LB = D - MAIN.tw - 0.02;                         // clear length between the main-beam webs
const HB = SEC.h / 2, YW = HB - SEC.tf, TW = SEC.tw;   // half depth, web edge, web thickness
const CC = 0.11, YC = HB - 0.06, RC = 0.012;           // cope length, cope floor, corner radius
const HOLES = [[0.05, 0.07], [0.05, 0], [0.05, -0.07]], RH = 0.011;
const LIFT = 0.45;

// ---- Timeline (scroll share).
const LASER = [0.305, 0.52];
const FLANGE = [0.565, 0.62], WEB = [0.627, 0.725];
const holeSpan = (LASER[1] - LASER[0]) / HOLES.length;
const holeDone = (k) => LASER[0] + holeSpan * (k + 0.95);
const busyAt = (t) => t > LASER[0] - 0.005 && t < WEB[1] + 0.01;

function iShape({ h, b, tf, tw }) {
  const s = new THREE.Shape(), x = b / 2, y = h / 2, w = tw / 2;
  [[x, -y], [x, -y + tf], [w, -y + tf], [w, y - tf], [x, y - tf], [x, y], [-x, y], [-x, y - tf], [-w, y - tf], [-w, -y + tf], [-x, -y + tf]]
    .reduce((p, [px, py]) => p.lineTo(px, py), s.moveTo(-x, -y));
  s.closePath();
  return s;
}

// Edge lines of an I-member from a to b (web vertical for horizontal members).
function memberEdges(p, a, b) {
  const solid = new THREE.ExtrudeGeometry(iShape(p), { depth: a.distanceTo(b), bevelEnabled: false });
  const edges = new THREE.EdgesGeometry(solid);
  solid.dispose();
  const q = new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), b.clone().sub(a).normalize());
  return edges.applyMatrix4(new THREE.Matrix4().compose(a, q, V(1, 1, 1)));
}

function frameGeometry() {
  const parts = [];
  for (const z of [0, D]) {
    for (let i = 0; i <= BAYS; i++) parts.push(memberEdges(COL, V(i * S, 0, z), V(i * S, LEVELS * H, z)));
    for (let l = 1; l <= LEVELS; l++)
      for (let i = 0; i < BAYS; i++) parts.push(memberEdges(MAIN, V(i * S + COL.h / 2, l * H - MAIN.h / 2, z), V((i + 1) * S - COL.h / 2, l * H - MAIN.h / 2, z)));
  }
  for (let l = 1; l <= LEVELS; l++)
    for (let i = 0; i <= 2 * BAYS; i++) {
      if (l === 1 && i === 3) continue;   // the slot of the beam that gets made
      const x = (i * S) / 2, y = l * H - SEC.h / 2;
      parts.push(memberEdges(SEC, V(x, y, MAIN.tw / 2 + 0.01), V(x, y, D - MAIN.tw / 2 - 0.01)));
    }
  const g = mergeGeometries(parts);
  parts.forEach((p) => p.dispose());
  return g;
}

function webShape() {
  const s = new THREE.Shape();
  s.moveTo(0, -YW); s.lineTo(LB, -YW); s.lineTo(LB, YW); s.lineTo(CC, YW); s.lineTo(CC, YC + RC);
  s.absarc(CC - RC, YC + RC, RC, 0, -Math.PI / 2, true);
  s.lineTo(0, YC); s.closePath();
  for (const [x, y] of HOLES) { const h = new THREE.Path(); h.absarc(x, y, RH, 0, Math.PI * 2, true); s.holes.push(h); }
  return s;
}
function copeShape() {
  const s = new THREE.Shape();
  s.moveTo(0, YC); s.lineTo(CC - RC, YC);
  s.absarc(CC - RC, YC + RC, RC, -Math.PI / 2, 0, false);
  s.lineTo(CC, YW); s.lineTo(0, YW); s.closePath();
  return s;
}
const plate = (shape) => new THREE.ExtrudeGeometry(shape, { depth: TW, bevelEnabled: false, curveSegments: 40 }).translate(0, 0, -TW / 2);
const box = (x0, x1, y, t, b) => new THREE.BoxGeometry(x1 - x0, t, b).translate((x0 + x1) / 2, y, 0);

// A path along the cut with the scroll share at which the front passes each point.
function track(points, a, b) {
  const cum = [0];
  for (let i = 1; i < points.length; i++) cum.push(cum[i - 1] + points[i].distanceTo(points[i - 1]));
  const L = cum[cum.length - 1];
  return {
    points, a, b, ts: cum.map((c) => a + ((b - a) * c) / L),
    at(t) {
      if (t < a || t > b) return null;
      const s = ((t - a) / (b - a)) * L;
      let i = 1; while (i < cum.length - 1 && cum[i] < s) i++;
      return points[i - 1].clone().lerp(points[i], clamp((s - cum[i - 1]) / (cum[i] - cum[i - 1] || 1)));
    },
  };
}
const arc = (cx, cy, r, a0, a1, n, z) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / n; return V(cx + r * Math.cos(a), cy + r * Math.sin(a), z); });

const ZF = -TW / 2;   // the web face the camera sees (torch on the far side, sparks exit toward the camera)
const HOLE_TRACKS = HOLES.map(([x, y], k) => {
  const t0 = LASER[0] + holeSpan * k;
  return track(arc(x, y, RH, -Math.PI / 2, 1.5 * Math.PI, 64, ZF), t0 + holeSpan * 0.27, t0 + holeSpan * 0.95);
});
const FLANGE_TRACK = track([V(CC, HB, SEC.b / 2), V(CC, HB, -SEC.b / 2)], FLANGE[0], FLANGE[1]);
const WEB_TRACK = track([V(CC, YW, ZF), V(CC, YC + RC, ZF), ...arc(CC - RC, YC + RC, RC, 0, -Math.PI / 2, 14, ZF).slice(1), V(0, YC, ZF)], WEB[0], WEB[1]);
const inPart = (p) => p.x > CC - 1e-4 || p.y < YC + 1e-4;

// Glowing kerf (symmetric) or heat tint (one-sided, into the part) along a track; n is the face normal.
function ribbon(tr, n, half, lift, oneSided) {
  const P = tr.points, pos = [], aT = [], aS = [], idx = [];
  P.forEach((p, i) => {
    const tan = P[Math.min(i + 1, P.length - 1)].clone().sub(P[Math.max(i - 1, 0)]).normalize();
    const s = new THREE.Vector3().crossVectors(n, tan).normalize();
    if (oneSided && !inPart(p.clone().addScaledVector(s, 0.004))) s.negate();
    const o = p.clone().addScaledVector(n, lift);
    pos.push(...o.clone().addScaledVector(s, oneSided ? 0 : -half).toArray(), ...o.clone().addScaledVector(s, half).toArray());
    aT.push(tr.ts[i], tr.ts[i]); aS.push(oneSided ? 0 : -1, 1);
    if (i) { const k = 2 * (i - 1); idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("aT", new THREE.Float32BufferAttribute(aT, 1));
  g.setAttribute("aS", new THREE.Float32BufferAttribute(aS, 1));
  g.setIndex(idx);
  return g;
}

const RIBBON_VS = `attribute float aT; attribute float aS; varying float vT; varying float vS;
void main() { vT = aT; vS = aS; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const kerfMaterial = (cool, gain) => new THREE.ShaderMaterial({
  uniforms: { uNow: { value: 0 }, uCool: { value: cool }, uGain: { value: gain } },
  vertexShader: RIBBON_VS,
  fragmentShader: `uniform float uNow, uCool, uGain; varying float vT; varying float vS;
void main() {
  float age = uNow - vT;
  if (age < 0.0) discard;
  float h = (1.0 - clamp(age / uCool, 0.0, 1.0)) * (1.0 - smoothstep(0.3, 1.0, abs(vS)));
  if (h < 0.002) discard;
  vec3 c = mix(vec3(0.5, 0.05, 0.0), vec3(1.0, 0.3, 0.04), smoothstep(0.0, 0.45, h));
  c = mix(c, vec3(1.0, 0.85, 0.6), smoothstep(0.6, 1.0, h));
  gl_FragColor = vec4(c * h * (0.8 + uGain * h * h), 1.0);
}`,
  blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
});
// Temper colours left by plasma heat: blue at the kerf, through purple, to straw further out.
const tintMaterial = () => new THREE.ShaderMaterial({
  uniforms: { uNow: { value: 0 } },
  vertexShader: RIBBON_VS,
  fragmentShader: `uniform float uNow; varying float vT; varying float vS;
void main() {
  float a = smoothstep(0.0, 0.03, uNow - vT);
  if (a <= 0.0) discard;
  vec3 blue = vec3(0.07, 0.11, 0.32), purple = vec3(0.22, 0.09, 0.22), straw = vec3(0.5, 0.33, 0.11);
  vec3 c = vS < 0.4 ? mix(blue, purple, vS / 0.4) : mix(purple, straw, (vS - 0.4) / 0.6);
  gl_FragColor = vec4(c, a * 0.55 * (1.0 - smoothstep(0.55, 1.0, vS)));
}`,
  transparent: true, depthWrite: false,
});

// Sparks as short streaks: each one has a phase, a velocity in an exit frame (+y = out of the kerf) and a life.
function sparks(n, { spread, speed, life, streak, hot, warm }) {
  const vel = new Float32Array(n * 6), seed = new Float32Array(n * 4), end = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    const th = spread * Math.sqrt(Math.random()), ph = 2 * Math.PI * Math.random();
    const v = speed[0] + (speed[1] - speed[0]) * Math.random() ** 1.5;
    const d = [Math.sin(th) * Math.cos(ph) * v, Math.cos(th) * v, Math.sin(th) * Math.sin(ph) * v];
    const p = Math.random(), l = life[0] + (life[1] - life[0]) * Math.random();
    for (let e = 0; e < 2; e++) { vel.set(d, (2 * i + e) * 3); seed.set([p, l], (2 * i + e) * 2); end[2 * i + e] = e; }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 6), 3));
  g.setAttribute("aVel", new THREE.BufferAttribute(vel, 3));
  g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 2));
  g.setAttribute("aEnd", new THREE.BufferAttribute(end, 1));
  const m = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }, uOn: { value: 0 }, uStreak: { value: streak }, uOrigin: { value: V(0, 0, 0) },
      uBasis: { value: new THREE.Matrix3() }, uGrav: { value: V(0, -9.8, 0) }, uHot: { value: hot }, uWarm: { value: warm },
    },
    vertexShader: `uniform float uTime, uStreak, uOn; uniform vec3 uOrigin, uGrav; uniform mat3 uBasis;
attribute vec3 aVel; attribute vec2 aSeed; attribute float aEnd; varying float vA; varying float vAge;
void main() {
  float age = mod(uTime + aSeed.x * aSeed.y, aSeed.y);
  float a = max(age - uStreak * aEnd, 0.0);
  vec3 p = uOrigin + uBasis * aVel * a + 0.5 * uGrav * a * a;
  vAge = age / aSeed.y; vA = uOn * (1.0 - 0.92 * aEnd);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`,
    fragmentShader: `uniform vec3 uHot, uWarm; varying float vA; varying float vAge;
void main() { gl_FragColor = vec4(mix(uHot, uWarm, vAge) * pow(1.0 - vAge, 1.6) * vA, 1.0); }`,
    blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
  });
  const s = new THREE.LineSegments(g, m);
  s.frustumCulled = false;
  return s;
}
const basisFor = (e) => {
  const y = e.clone().normalize(), x = new THREE.Vector3().crossVectors(Math.abs(y.y) < 0.9 ? V(0, 1, 0) : V(1, 0, 0), y).normalize();
  return new THREE.Matrix3().setFromMatrix4(new THREE.Matrix4().makeBasis(x, y, new THREE.Vector3().crossVectors(x, y)));
};

function dotTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 64;
  const g = c.getContext("2d"), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.2, "rgba(255,255,255,0.5)"); r.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

// Camera keys: [target, position] in world space; close-ups are given in beam coordinates.
const KEYS = [
  { t: 0.0, fov: 30, at: () => [CENTER, V(-9, 13.2, 25.8)] },
  { t: 0.13, fov: 30, at: () => [CENTER, V(-6.6, 12, 27.6)] },
  { t: 0.3, fov: 26, at: (w) => [w(0.07, 0, 0), w(-0.28, 0.1, -0.78)] },
  { t: 0.52, fov: 26, at: (w) => [w(0.06, 0.01, 0), w(-0.2, 0.06, -0.74)] },
  { t: 0.565, fov: 28, at: (w) => [w(0.08, 0.1, 0), w(-0.38, 0.42, -0.62)] },
  { t: 0.73, fov: 28, at: (w) => [w(0.07, 0.09, 0), w(-0.3, 0.38, -0.66)] },
  { t: 0.8, fov: 30, at: (w) => [w(0.4, 0, 0), w(-1.6, 1.0, -2.8)] },
  { t: 0.92, fov: 30, at: () => [V(9, 3.4, 3), V(-16.2, 10.1, 22.2)] },
  { t: 1.0, fov: 30, at: () => [V(9, 3.4, 3), V(-17.2, 10.5, 21.2)] },
];

export function mount(canvas, { small = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 1.75));
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  scene.fog = new THREE.Fog(BG, 50, 200);   // both follow the light-to-dark entry in render()
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment(), env = pmrem.fromScene(room, 0.04).texture;
  pmrem.dispose(); room.dispose();
  scene.environment = env;
  scene.environmentIntensity = 0.45;
  scene.add(new THREE.HemisphereLight(0xb8c6d0, 0x0b0f12, 0.25));
  const key = new THREE.DirectionalLight(0xe4ecf5, 1.6); key.position.set(-6, 10, 8); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 0.7); rim.position.set(9, 4, -10); scene.add(rim);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 400);

  // Frame and the dashed ghost of the beam still to be made.
  const lines = new THREE.LineBasicMaterial({ color: 0x819199, transparent: true, opacity: 0.55, fog: true });
  scene.add(new THREE.LineSegments(frameGeometry(), lines));
  const base = V(1.5 * S, H - HB, D - MAIN.tw / 2 - 0.01);   // world position of the coped end, in its slot
  const placeBeam = (o, y = 0) => { o.position.copy(base).add(V(0, y, 0)); o.rotation.y = Math.PI / 2; };   // beam x → world −z
  const partGeos = [plate(webShape()), box(CC, LB, HB - SEC.tf / 2, SEC.tf, SEC.b), box(0, LB, -HB + SEC.tf / 2, SEC.tf, SEC.b)];
  const ghostGeo = mergeGeometries(partGeos.map((g) => new THREE.EdgesGeometry(g, 20)));
  const ghostMat = new THREE.LineDashedMaterial({ color: 0xf05a24, dashSize: 0.14, gapSize: 0.09, transparent: true, opacity: 0.85, fog: true });
  const ghost = new THREE.LineSegments(ghostGeo, ghostMat);
  ghost.computeLineDistances();
  placeBeam(ghost);
  scene.add(ghost);

  // The beam as steel: mill-scale faces, bright freshly cut faces, fine edge lines over both.
  const off = { polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 };
  const mill = new THREE.MeshStandardMaterial({ color: 0x33393e, metalness: 0.5, roughness: 0.62, ...off });
  const bright = new THREE.MeshStandardMaterial({ color: 0xb4bcc1, metalness: 1, roughness: 0.28, ...off });
  const edgeMat = new THREE.LineBasicMaterial({ color: 0xcad3d7, transparent: true, opacity: 0.3 });
  const beam = new THREE.Group();
  const solid = (geo, mats, parent = beam) => {
    parent.add(new THREE.Mesh(geo, mats));
    parent.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 20), edgeMat));
  };
  solid(partGeos[0], [mill, bright]);
  solid(partGeos[1], [mill, bright, mill, mill, mill, mill]);   // −x face is the plasma cut
  solid(partGeos[2], mill);
  const slugs = HOLES.map(([x, y]) => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(RH, RH, TW, 40).rotateX(Math.PI / 2), [bright, mill, mill]));
    g.position.set(x, y, 0);
    beam.add(g);
    return g;
  });
  const offcut = new THREE.Group(), pivot = V(CC / 2, (YC + HB) / 2, 0);
  solid(plate(copeShape()).translate(-pivot.x, -pivot.y, 0), [mill, bright], offcut);
  solid(box(0, CC, HB - SEC.tf / 2, SEC.tf, SEC.b).translate(-pivot.x, -pivot.y, 0), [bright, mill, mill, mill, mill, mill], offcut);
  beam.add(offcut);
  scene.add(beam);

  // Cut light: kerf glow, plasma heat tint, sparks, front glow, plasma arc, and a point light that moves with the front.
  const laserKerf = kerfMaterial(0.03, 5), plasmaKerf = kerfMaterial(0.06, 6), tint = tintMaterial();
  const k = TW / 8;
  HOLE_TRACKS.forEach((tr) => beam.add(new THREE.Mesh(ribbon(tr, V(0, 0, -1), 0.0013, k, false), laserKerf)));
  beam.add(new THREE.Mesh(ribbon(FLANGE_TRACK, V(0, 1, 0), 0.003, k, false), plasmaKerf));
  beam.add(new THREE.Mesh(ribbon(WEB_TRACK, V(0, 0, -1), 0.003, k, false), plasmaKerf));
  beam.add(new THREE.Mesh(ribbon(FLANGE_TRACK, V(0, 1, 0), 0.016, k / 2, true), tint));
  beam.add(new THREE.Mesh(ribbon(WEB_TRACK, V(0, 0, -1), 0.016, k / 2, true), tint));
  const n = small ? 0.5 : 1;
  const laserSparks = sparks(Math.round(600 * n), { spread: 0.5, speed: [1.2, 3.4], life: [0.22, 0.55], streak: 0.012, hot: V(4.5, 3.4, 2), warm: V(2, 0.6, 0.15) });
  const plasmaSparks = sparks(Math.round(2600 * n), { spread: 0.85, speed: [0.7, 2.6], life: [0.3, 0.85], streak: 0.02, hot: V(5, 2.8, 1.1), warm: V(2.2, 0.45, 0.08) });
  beam.add(laserSparks, plasmaSparks);
  const dot = dotTexture();
  const glow = (c) => new THREE.Sprite(new THREE.SpriteMaterial({ map: dot, color: c, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
  const hotSpot = glow(new THREE.Color(9, 7, 5)), halo = glow(new THREE.Color(0.7, 0.45, 1.6));
  // Visible plasma arc: a short jet that fades out toward the (unshown) torch.
  const arcCol = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.002, 0.06, 16, 1, true), new THREE.ShaderMaterial({
    vertexShader: "varying float vY; void main() { vY = uv.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: "varying float vY; void main() { float a = pow(1.0 - vY, 2.2); gl_FragColor = vec4(vec3(3.5, 4.2, 8.0) * a, 1.0); }",
    blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide,
  }));
  const cutLight = new THREE.PointLight(0xffa060, 0, 0.5, 2);
  beam.add(hotSpot, halo, arcCol, cutLight);

  const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: small ? 2 : 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.55, 0.3, 1.0);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  let w = 0, h = 0, steelOn = null;
  const resize = () => {
    w = canvas.clientWidth; h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(w, h);
  };
  resize();

  const setSteel = (r) => {
    beam.visible = r > 0;
    const fading = r < 1;
    for (const m of [mill, bright]) {
      m.opacity = r;
      if (m.transparent !== fading) { m.transparent = fading; m.needsUpdate = true; }
    }
    edgeMat.opacity = 0.3 * r;
    steelOn = r;
  };

  const toWorld = (x, y, z) => beam.localToWorld(V(x, y, z));
  function placeCamera(t) {
    let i = 0; while (i < KEYS.length - 2 && t > KEYS[i + 1].t) i++;
    const A = KEYS[i], B = KEYS[i + 1], u = ease(seg(t, A.t, B.t));
    const [ta, pa] = A.at(toWorld), [tb, pb] = B.at(toWorld);
    const oa = pa.clone().sub(ta), ob = pb.clone().sub(tb);
    const la = oa.length(), lb = ob.length(), dist = la * Math.pow(lb / la, u);
    const target = ta.clone().lerp(tb, u);
    camera.position.copy(target).addScaledVector(oa.normalize().lerp(ob.normalize(), u).normalize(), dist);
    camera.lookAt(target);
    // Tall screens widen the view of the far shots instead of cropping the frame; close-ups keep their framing.
    const tall = w / h < 1.5 ? Math.pow(1.5 / (w / h), 0.75) : 1, k = 1 + (tall - 1) * seg(dist, 1.5, 6);
    camera.fov = (2 * Math.atan(Math.tan(((A.fov + (B.fov - A.fov) * u) * Math.PI) / 360) * k) * 180) / Math.PI;
    camera.near = dist * 0.02; camera.far = dist * 40 + 60;
    scene.fog.near = dist * 1.6; scene.fog.far = dist * 1.6 + Math.max(4, dist * 6);
    // In the last shot the frame moves right (wide) or up (tall) to leave room for the paragraph.
    const o = ease(seg(t, 0.8, 0.92)), wide = w / h > 1.1;
    camera.setViewOffset(w, h, wide ? -0.22 * o * w : 0, wide ? 0 : 0.16 * o * h, w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  const exit = { laser: basisFor(V(0, -0.35, -1)), web: basisFor(V(0, -0.45, -1)), flange: basisFor(V(0, -1, -0.25)) };
  function cut(t, time) {
    // Which front is active, where it is, and what it looks like.
    let kind = null, p = null, pierce = 0, onFlange = false;
    const u = (t - LASER[0]) / (LASER[1] - LASER[0]);
    if (u >= 0 && u < 1) {
      const hk = Math.min(HOLES.length - 1, Math.floor(u * HOLES.length)), v = u * HOLES.length - hk, [hx, hy] = HOLES[hk];
      if (v < 0.15) { kind = "laser"; p = V(hx, hy, ZF); pierce = 1 - v / 0.15; }
      else if (v < 0.27) { kind = "laser"; p = V(hx, hy - (RH * (v - 0.15)) / 0.12, ZF); }
      else if (v < 0.95) { kind = "laser"; p = HOLE_TRACKS[hk].at(t); }
    } else if ((p = FLANGE_TRACK.at(t))) { kind = "plasma"; onFlange = true; }
    else if ((p = WEB_TRACK.at(t))) kind = "plasma";

    const flick = 0.82 + 0.18 * Math.sin(time * 61) * Math.sin(time * 37.3 + 1.7);
    laserSparks.visible = kind === "laser"; plasmaSparks.visible = kind === "plasma";
    hotSpot.visible = halo.visible = cutLight.visible = !!kind; arcCol.visible = kind === "plasma" && onFlange;
    if (!kind) return;
    const face = onFlange ? V(0, 0.0015, 0) : V(0, 0, -0.0015);
    hotSpot.position.copy(p).add(face); halo.position.copy(hotSpot.position);
    const sp = kind === "laser" ? laserSparks : plasmaSparks;
    sp.material.uniforms.uTime.value = time;
    sp.material.uniforms.uOn.value = pierce > 0 ? 0.25 : 1;
    sp.material.uniforms.uOrigin.value.copy(onFlange ? V(p.x, HB - SEC.tf, p.z) : V(p.x, p.y, ZF - 0.0005));
    sp.material.uniforms.uBasis.value.copy(kind === "laser" ? exit.laser : onFlange ? exit.flange : exit.web);
    if (kind === "laser") {
      hotSpot.scale.setScalar((0.006 + 0.022 * pierce) * flick);
      halo.scale.setScalar(0.03 + 0.03 * pierce); halo.material.color.setRGB(0.5, 0.18, 0.04);
      cutLight.color.setRGB(1, 0.62, 0.32); cutLight.intensity = (0.025 + 0.04 * pierce) * flick;
    } else {
      hotSpot.scale.setScalar(0.014 * flick);
      halo.scale.setScalar(0.07 * flick); halo.material.color.setRGB(0.5, 0.32, 1.2);
      cutLight.color.setRGB(0.8, 0.78, 1); cutLight.intensity = 0.07 * flick;
      arcCol.position.copy(p).add(V(0, 0.03, 0)); arcCol.scale.set(flick, 1, flick);
    }
    cutLight.position.copy(p).add(onFlange ? V(0, 0.05, -0.03) : V(0, -0.01, -0.05));
  }

  function fall(o, rest, tc, t, rate, drift, spin) {
    const tau = Math.max(0, t - tc) * rate, drop = 0.5 * 9.8 * tau * tau;
    o.visible = drop < 3;
    o.position.set(rest.x + drift.x * tau, rest.y - drop, rest.z + drift.z * tau);
    o.rotation.set(spin.x * tau, 0, spin.z * tau);
  }

  return {
    resize,
    busy: busyAt,
    render(t, time = 0) {
      if (!w || !h) return;
      placeBeam(beam, LIFT * (ease(seg(t, 0.16, 0.28)) - ease(seg(t, 0.82, 0.92))));
      beam.updateMatrixWorld();
      const r = seg(t, 0.18, 0.27);
      if (r !== steelOn) setSteel(r);
      const dark = ease(seg(t, 0.08, 0.22));   // the band enters on the page's light canvas and darkens during the dive
      scene.background.copy(LIGHT).lerp(DARK, dark); scene.fog.color.copy(scene.background); lines.color.copy(INK).lerp(GREY, dark);
      ghostMat.opacity = 0.85 * (1 - seg(t, 0.9, 0.95));
      edgeMat.opacity = 0.3 * r + 0.45 * seg(t, 0.9, 0.95);   // once it lands, the made beam reads out of the model
      slugs.forEach((s, i) => fall(s, V(HOLES[i][0], HOLES[i][1], 0), holeDone(i), t, 24, V(0, 0, -0.9), V(6, 0, 0)));
      fall(offcut, pivot, WEB[1], t, 14, V(-0.3, 0, -0.5), V(1, 0, 2));
      laserKerf.uniforms.uNow.value = plasmaKerf.uniforms.uNow.value = tint.uniforms.uNow.value = t;
      cut(t, time);
      placeCamera(t);
      composer.render();
    },
    dispose() {
      scene.traverse((o) => {
        if (!o.isSprite) o.geometry?.dispose();
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m?.dispose());
      });
      dot.dispose(); env.dispose(); composer.dispose(); rt.dispose(); renderer.dispose();
    },
  };
}

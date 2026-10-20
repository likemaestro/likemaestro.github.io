// Keyframe renderer and scroll scene for the design boards (design-only, not production code).
// Generic I-beam lying web-horizontal, flanges vertical; head moves along the fixed section.
// Follows design/d0-laser-reference.html: head between flanges, pierce -> lead-in -> contour,
// localized cut front, removed part only in an exploded view, no process values.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const BEAM_L = 6, GAP = 0.94, FLANGE_H = 1.0, FLANGE_T = 0.06, WEB_T = 0.04;
const OPEN_W = 0.72, OPEN_H = 0.36;              // generic stadium opening (x by z)
const OPENINGS = [-1.6, 0, 1.6];                 // done, cutting, planned
const WEB_TOP = WEB_T / 2;

const STYLES = {
  studio:   { bg: "#F6F7F5", env: 0.9,  key: 2.2,  hemi: 0.9,  steel: "#A7B1B6", glow: 1.0, fog: null,     lines: false, shadow: true },
  bay:      { bg: "#121A1F", env: 0.22, key: 0.55, hemi: 0.15, steel: "#8E9AA0", glow: 1.4, fog: [6, 14],  lines: false, shadow: true },
  macro:    { bg: "#0B1013", env: 0.12, key: 0.3,  hemi: 0.06, steel: "#87949A", glow: 2.0, fog: [1.2, 5], lines: false, shadow: false },
  linework: { bg: "#FFFFFF", env: 0,    key: 0,    hemi: 0,    steel: "#FFFFFF", glow: 0.5, fog: null,     lines: true,  shadow: false },
};

// Stadium perimeter, starting at the top-centre so the lead-in arrives perpendicular.
function stadium(cx, cz, w, h, n = 160) {
  const r = h / 2, a = w / 2 - r, pts = [];
  const len = 4 * a + 2 * Math.PI * r;
  for (let i = 0; i <= n; i++) {
    let s = (i / n) * len, x, z;
    if (s < a) { x = cx + s; z = cz - r; }
    else if ((s -= a) < Math.PI * r) { const t = -Math.PI / 2 + s / r; x = cx + a + r * Math.cos(t); z = cz + r * Math.sin(t); }
    else if ((s -= Math.PI * r) < 2 * a) { x = cx + a - s; z = cz + r; }
    else if ((s -= 2 * a) < Math.PI * r) { const t = Math.PI / 2 + s / r; x = cx - a + r * Math.cos(t); z = cz + r * Math.sin(t); }
    else { s -= Math.PI * r; x = cx - a + s; z = cz - r; }
    pts.push(new THREE.Vector2(x, z));
  }
  return pts;
}

// Full toolpath: pierce inside the slug, short lead-in, then the closed contour.
function toolpath(cx) {
  const loop = stadium(cx, 0, OPEN_W, OPEN_H);
  const pierce = new THREE.Vector2(cx, 0.02);
  const lead = [];
  for (let i = 0; i <= 12; i++) lead.push(pierce.clone().lerp(loop[0], i / 12));
  return { pierce, pts: [...lead, ...loop.slice(1)], leadN: lead.length };
}
export const LEAD_IN_SHARE = 13 / 173;           // fraction of the toolpath that is pierce + lead-in
const CUT_PATH = toolpath(OPENINGS[1]);
export const frontAt = (p) => pointAt(CUT_PATH, p);   // cut-front position (x, z) at toolpath progress p

function brushedTexture() {
  const c = document.createElement("canvas"); c.width = 512; c.height = 64;
  const g = c.getContext("2d"); g.fillStyle = "#808080"; g.fillRect(0, 0, 512, 64);
  for (let i = 0; i < 900; i++) {
    const r = (k) => (Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1;
    const y = Math.abs(r(1)) * 64, v = 100 + Math.abs(r(2)) * 60;
    g.fillStyle = `rgb(${v},${v},${v})`; g.globalAlpha = 0.25;
    g.fillRect(Math.abs(r(3)) * 512, y, 40 + Math.abs(r(4)) * 200, 0.6);
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 1);
  return t;
}

function glowTexture(inner, outer) {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const g = c.getContext("2d"), grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, inner); grd.addColorStop(0.18, outer); grd.addColorStop(1, "rgba(240,90,36,0)");
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

function pointAt(path, p) {
  const n = path.pts.length - 1, f = Math.min(Math.max(p, 0), 1) * n, i = Math.floor(f);
  return path.pts[i].clone().lerp(path.pts[Math.min(i + 1, n)], f - i);
}

const disposeTree = (o) => o.traverse((c) => { c.geometry?.dispose?.(); if (c.material) [].concat(c.material).forEach((m) => m.dispose()); });

export function createRenderer(canvas) {
  const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: !canvas, canvas });
  r.setPixelRatio(canvas ? Math.min(window.devicePixelRatio, 2) : 1);
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
  r.localClippingEnabled = true;
  return r;
}

// Persistent scene. update({progress, explode}) rebuilds only the parts that depend on progress.
export function createScene(r, style, opts = {}) {
  const S = STYLES[style];
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(S.bg);
  if (S.fog) scene.fog = new THREE.Fog(S.bg, S.fog[0], S.fog[1]);
  if (S.env) {
    const pm = new THREE.PMREMGenerator(r);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = S.env;
    pm.dispose();
  }
  scene.add(new THREE.HemisphereLight("#ffffff", "#B9C3C8", S.hemi));
  const key = new THREE.DirectionalLight("#ffffff", S.key);
  key.position.set(3, 6, 4); key.castShadow = S.shadow;
  key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4 });
  scene.add(key);

  const lines = S.lines || opts.split !== undefined;
  const steelMat = S.lines
    ? new THREE.MeshBasicMaterial({ color: S.steel, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 })
    : new THREE.MeshStandardMaterial({ color: S.steel, metalness: 0.55, roughness: 0.42, roughnessMap: brushedTexture() });
  const lineMat = new THREE.LineBasicMaterial({ color: S.lines || style === "studio" ? "#172027" : "#9FB0B8" });
  if (opts.split !== undefined) {
    steelMat.clippingPlanes = [new THREE.Plane(new THREE.Vector3(1, 0, 0), -opts.split)];
    lineMat.clippingPlanes = [new THREE.Plane(new THREE.Vector3(-1, 0, 0), opts.split + 0.002)];
  }
  const addMesh = (parent, geo, mat = steelMat) => {
    const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = S.shadow; parent.add(m);
    if (lines) parent.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 25), lineMat));
    return m;
  };
  for (const s of [-1, 1]) {
    const g = new THREE.BoxGeometry(BEAM_L, FLANGE_H, FLANGE_T);
    g.translate(0, 0, s * (GAP / 2 + FLANGE_T / 2)); addMesh(scene, g);
  }
  if (S.shadow) {
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: style === "studio" ? 0.12 : 0.35 }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -FLANGE_H / 2; ground.receiveShadow = true; scene.add(ground);
  }

  // Cutting head between the flanges; copper nozzle with a small standoff above the web.
  const head = new THREE.Group();
  {
    const dark = S.lines ? steelMat : new THREE.MeshStandardMaterial({ color: "#2A3238", metalness: 0.4, roughness: 0.5 });
    const copper = S.lines ? steelMat : new THREE.MeshStandardMaterial({ color: "#B87333", metalness: 0.8, roughness: 0.3 });
    const tip = WEB_TOP + 0.035;
    const part = (geo, mat, y) => { geo.translate(0, y, 0); const m = new THREE.Mesh(geo, mat); m.castShadow = S.shadow; head.add(m);
      if (S.lines) head.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 25), lineMat)); };
    part(new THREE.CylinderGeometry(0.06, 0.022, 0.12, 32), copper, tip + 0.06);
    part(new THREE.CylinderGeometry(0.13, 0.09, 0.14, 32), dark, tip + 0.19);
    part(new THREE.CylinderGeometry(0.15, 0.15, 0.62, 32), dark, tip + 0.57);
    part(new THREE.BoxGeometry(0.12, 1.4, 0.12), dark, tip + 1.58);
  }
  scene.add(head);

  const glowCore = glowTexture("#FFFFFF", "rgba(255,190,120,0.9)");
  const glowHalo = glowTexture("rgba(255,170,90,0.9)", "rgba(240,90,36,0.35)");
  const meltTex = glowTexture("#FFE2C2", "rgba(255,120,50,0.8)");
  const onWeb = (pts, y = WEB_TOP + 0.002) => pts.map((p) => new THREE.Vector3(p.x, y, p.y));
  const path = CUT_PATH;
  // One persistent light: adding/removing lights forces shader recompiles mid-scroll.
  const spot = new THREE.PointLight("#FF8A4C", 0, 0.45, 2); scene.add(spot);
  let dyn = null, lastDone = null, webGroup = null;

  function buildWeb(doneCount) {
    if (webGroup) { scene.remove(webGroup); disposeTree(webGroup); }
    webGroup = new THREE.Group();
    const shape = new THREE.Shape();
    shape.moveTo(-BEAM_L / 2, -GAP / 2); shape.lineTo(BEAM_L / 2, -GAP / 2);
    shape.lineTo(BEAM_L / 2, GAP / 2); shape.lineTo(-BEAM_L / 2, GAP / 2); shape.closePath();
    for (const cx of OPENINGS.slice(0, doneCount)) shape.holes.push(new THREE.Path(stadium(cx, 0, OPEN_W, OPEN_H, 64)));
    const web = new THREE.ExtrudeGeometry(shape, { depth: WEB_T, bevelEnabled: false, curveSegments: 24 });
    web.rotateX(Math.PI / 2); web.translate(0, WEB_TOP, 0); addMesh(webGroup, web);
    const cadMat = new THREE.LineDashedMaterial({ color: S.bg === "#FFFFFF" || style === "studio" ? "#172027" : "#9FB0B8", dashSize: 0.03, gapSize: 0.02 });
    for (const cx of OPENINGS.slice(doneCount)) {
      const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(onWeb(stadium(cx, 0, OPEN_W, OPEN_H))), cadMat);
      l.computeLineDistances(); webGroup.add(l);
    }
    scene.add(webGroup);
  }

  const state = { front: new THREE.Vector2() };
  function update({ progress = 0, explode = 0, head: showHead = true } = {}) {
    const p = Math.min(Math.max(progress, 0), 1);
    const doneCount = p >= 1 ? 2 : 1;
    if (doneCount !== lastDone) { buildWeb(doneCount); lastDone = doneCount; }
    if (dyn) { scene.remove(dyn); disposeTree(dyn); }
    dyn = new THREE.Group(); scene.add(dyn);
    const front = pointAt(path, p); state.front.copy(front);
    head.visible = showHead; head.position.set(front.x, 0, front.y);

    spot.intensity = 0;
    if (p > 0 && p < 1) {
      const n = Math.max(2, Math.round(p * (path.pts.length - 1)));
      const cut = [...path.pts.slice(0, n), front];
      dyn.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(onWeb(cut, WEB_TOP + 0.001)), cut.length * 2, S.lines ? 0.006 : 0.0022, 6),
        new THREE.MeshBasicMaterial({ color: S.lines ? "#F05A24" : "#15191C" })));
      if (!S.lines) {
        const trail = cut.slice(-7);
        if (trail.length > 2) dyn.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(onWeb(trail, WEB_TOP + 0.002)), 16, 0.003, 6),
          new THREE.MeshBasicMaterial({ color: "#FF7A3D" })));
        const f3 = new THREE.Vector3(front.x, WEB_TOP + 0.01, front.y);
        for (const [tex, size, op] of [[glowCore, 0.07, 1], [glowHalo, 0.16 * S.glow, 0.6]]) {
          const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: op, fog: false }));
          sp.position.copy(f3); sp.scale.setScalar(size); dyn.add(sp);
        }
        spot.intensity = 0.12 * S.glow; spot.position.copy(f3).add(new THREE.Vector3(0, 0.03, 0));
        // Restrained melt ejection below the web; deterministic so scrolling doesn't flicker.
        for (let i = 0; i < 9; i++) {
          const j = Math.sin((i + 1) * 91.7 + p * 400) * 0.5;
          const d = new THREE.Sprite(new THREE.SpriteMaterial({ map: meltTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.85 - i * 0.08, fog: false }));
          d.position.set(front.x + j * 0.03, -WEB_T / 2 - 0.02 - i * 0.03, front.y + Math.cos(i * 37.1) * 0.015);
          d.scale.setScalar(0.03 - i * 0.002); dyn.add(d);
        }
      }
    }

    // Removed part, shown only as a labelled exploded view above the finished opening.
    if (p >= 1 && explode > 0) {
      const slug = new THREE.ExtrudeGeometry(new THREE.Shape(stadium(OPENINGS[1], 0, OPEN_W - 0.006, OPEN_H - 0.006, 64)), { depth: WEB_T, bevelEnabled: false });
      slug.rotateX(Math.PI / 2); slug.translate(0, WEB_TOP + 0.55, 0);
      const ghost = steelMat.clone(); ghost.transparent = true; ghost.opacity = explode; ghost.depthWrite = explode > 0.99;
      const sm = new THREE.Mesh(slug, ghost); sm.castShadow = S.shadow && explode > 0.99; dyn.add(sm);
      if (lines) { const lm = lineMat.clone(); lm.transparent = true; lm.opacity = explode; dyn.add(new THREE.LineSegments(new THREE.EdgesGeometry(slug, 25), lm)); }
      const lead = new THREE.LineDashedMaterial({ color: S.lines || style === "studio" ? "#4F5D68" : "#8C9AA1", dashSize: 0.025, gapSize: 0.02, transparent: true, opacity: explode });
      for (const [x, z] of [[-OPEN_W / 2, 0], [OPEN_W / 2, 0]]) {
        const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x, WEB_TOP, z), new THREE.Vector3(x, WEB_TOP + 0.55, z)]), lead);
        l.computeLineDistances(); dyn.add(l);
      }
    }
    return state;
  }

  const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 100);
  function setCamera(c, aspect) {
    camera.fov = c.fov ?? 30; camera.aspect = aspect; camera.updateProjectionMatrix();
    const f = state.front;
    const tgt = c.target ? new THREE.Vector3(...c.target) : new THREE.Vector3(f.x, WEB_TOP, f.y).add(new THREE.Vector3(...(c.relTarget || [0, 0, 0])));
    camera.position.copy(c.relPos ? tgt.clone().add(new THREE.Vector3(...c.relPos)) : new THREE.Vector3(...c.pos));
    camera.lookAt(tgt);
  }
  function dispose() { disposeTree(scene); [glowCore, glowHalo, meltTex].forEach((t) => t.dispose()); scene.environment?.dispose?.(); }
  return { scene, camera, update, setCamera, dispose, state };
}

let shared;
// opts: { style, width, height, progress, explode, head, split, camera: {pos|relPos, target|relTarget, fov} }
export function renderFrame(opts) {
  shared ??= createRenderer();
  shared.setSize(opts.width, opts.height, false);
  const s = createScene(shared, opts.style, { split: opts.split });
  s.update({ progress: opts.progress ?? 0, explode: opts.explode ?? 0, head: opts.head !== false });
  s.setCamera(opts.camera, opts.width / opts.height);
  shared.render(s.scene, s.camera);
  const url = shared.domElement.toDataURL(STYLES[opts.style].lines ? "image/png" : "image/jpeg", 0.92);
  s.dispose();
  return url;
}

// Fill every <img data-frame='{json}'> on the page, one shared WebGL context.
export function renderAll(root = document) {
  for (const img of root.querySelectorAll("img[data-frame]")) {
    try { img.src = renderFrame(JSON.parse(img.dataset.frame)); }
    catch (e) { img.alt = "Render unavailable in this browser"; console.error(e); }
  }
}

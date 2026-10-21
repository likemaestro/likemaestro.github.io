// Scroll scene for the PhD band (ported from design/lib). Illustrative render, no process values.
// Generic HEA-like profile lying web-horizontal, flanges vertical; the head moves along the fixed section.
// The part: a group of six bolt holes in the web, then an angled end cut.
// Follows design/d0-laser-reference.html: head between the flanges; each hole is pierce -> lead-in -> contour;
// localized cut front; separated material only in an exploded view; no process values.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const X0 = -4.4, X1 = 1.6, BEAM_L = X1 - X0, CX = (X0 + X1) / 2;
const GAP = 0.94, FLANGE_H = 1.0, FLANGE_T = 0.06, WEB_T = 0.04;
const WEB_TOP = WEB_T / 2;
const HOLE_R = 0.055;
// Cut order runs as a zigzag so the moves between holes stay short.
const HOLES = [[0.25, -0.2], [0.25, 0.2], [0.55, 0.2], [0.55, -0.2], [0.85, -0.2], [0.85, 0.2]];
const END_X = 1.25, END_SKEW = Math.tan((12 * Math.PI) / 180);   // end-cut plane: x = END_X + END_SKEW * z
const RAPID_WEIGHT = 0.25;                                         // moves between holes take less scroll than cutting

const STYLES = {
  studio:   { bg: "#F6F7F5", env: 0.9,  key: 2.2,  hemi: 0.9,  steel: "#A7B1B6", glow: 1.0, fog: null,     lines: false, shadow: true },
  bay:      { bg: "#121A1F", env: 0.22, key: 0.55, hemi: 0.15, steel: "#8E9AA0", glow: 1.4, fog: [6, 14],  lines: false, shadow: true },
  macro:    { bg: "#0B1013", env: 0.12, key: 0.3,  hemi: 0.06, steel: "#87949A", glow: 2.0, fog: [1.2, 5], lines: false, shadow: false },
  linework: { bg: "#FFFFFF", env: 0,    key: 0,    hemi: 0,    steel: "#FFFFFF", glow: 0.5, fog: null,     lines: true,  shadow: false },
};

const V2 = (x, y) => new THREE.Vector2(x, y);
const circle = (cx, cz, r, n, a0 = -Math.PI / 2) => Array.from({ length: n + 1 }, (_, i) => V2(cx + r * Math.cos(a0 + (2 * Math.PI * i) / n), cz + r * Math.sin(a0 + (2 * Math.PI * i) / n)));

// Toolpath: for each hole, pierce at the centre, a short lead-in to the circle, the circle; rapid moves between holes.
function toolpath() {
  const pts = [];   // { p, w (cumulative weighted length), cut, hole, end (true on the last point of a hole) }
  let w = 0, prev = null;
  const push = (p, cut, hole) => { if (prev) w += prev.distanceTo(p) * (cut ? 1 : RAPID_WEIGHT); pts.push({ p, w, cut, hole }); prev = p; };
  HOLES.forEach(([x, z], h) => {
    const c = V2(x, z), start = V2(x, z - HOLE_R);
    if (prev) push(c, false, h);                 // rapid to the next pierce point
    else push(c, true, h);
    for (let i = 1; i <= 6; i++) push(c.clone().lerp(start, i / 6), true, h);
    for (const q of circle(x, z, HOLE_R, 48).slice(1)) push(q, true, h);
    pts[pts.length - 1].end = true;
  });
  return { pts, total: w };
}
const CUT_PATH = toolpath();
export const LEAD_IN_SHARE = CUT_PATH.pts[6].w / CUT_PATH.total;   // pierce + lead-in of the first hole

// Position along the path at progress p, with the index of the segment it lies on.
function locate(p) {
  const { pts, total } = CUT_PATH, s = Math.min(Math.max(p, 0), 1) * total;
  let i = 1; while (i < pts.length - 1 && pts[i].w < s) i++;
  const a = pts[i - 1], b = pts[i], u = b.w > a.w ? (s - a.w) / (b.w - a.w) : 1;
  return { pos: a.p.clone().lerp(b.p, Math.min(Math.max(u, 0), 1)), i, cut: b.cut && p > 0 && p < 1, hole: b.hole, s };
}
export const frontAt = (p) => locate(p).pos;
const holesDone = (p) => (p >= 1 ? HOLES.length : CUT_PATH.pts.filter((q) => q.end && q.w <= p * CUT_PATH.total).length);

// I-section outline at the end-cut plane, in (y, z), for the drawn end-cut trace.
const g = GAP / 2, ft = FLANGE_T, hy = FLANGE_H / 2, wt = WEB_T / 2;
const SECTION = [[hy, -g - ft], [hy, -g], [wt, -g], [wt, g], [hy, g], [hy, g + ft], [-hy, g + ft], [-hy, g], [-wt, g], [-wt, -g], [-hy, -g], [-hy, -g - ft], [hy, -g - ft]]
  .map(([y, z]) => new THREE.Vector3(END_X + END_SKEW * z, y, z));

function brushedTexture() {
  const c = document.createElement("canvas"); c.width = 512; c.height = 64;
  const g2 = c.getContext("2d"); g2.fillStyle = "#808080"; g2.fillRect(0, 0, 512, 64);
  for (let i = 0; i < 900; i++) {
    const r = (k) => (Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1;
    const y = Math.abs(r(1)) * 64, v = 100 + Math.abs(r(2)) * 60;
    g2.fillStyle = `rgb(${v},${v},${v})`; g2.globalAlpha = 0.25;
    g2.fillRect(Math.abs(r(3)) * 512, y, 40 + Math.abs(r(4)) * 200, 0.6);
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 1);
  return t;
}

function glowTexture(inner, outer) {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const g2 = c.getContext("2d"), grd = g2.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, inner); grd.addColorStop(0.18, outer); grd.addColorStop(1, "rgba(240,90,36,0)");
  g2.fillStyle = grd; g2.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

const disposeTree = (o) => o.traverse((c) => { c.geometry?.dispose?.(); if (c.material) [].concat(c.material).forEach((m) => m.dispose()); });

export function createRenderer(canvas, { maxDpr = 2, shadows = true } = {}) {
  const r = new THREE.WebGLRenderer({ antialias: true, canvas, powerPreference: "low-power" });
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.shadowMap.enabled = shadows; r.shadowMap.type = THREE.PCFSoftShadowMap;
  r.localClippingEnabled = true;
  return r;
}

// Persistent scene. update() rebuilds only the parts that depend on progress.
export function createScene(r, style, opts = {}) {
  const S = { ...STYLES[style], ...(opts.shadows === false ? { shadow: false } : {}) };
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
  steelMat.side = THREE.DoubleSide;   // clipped plates show their inside at the end cut
  const lineMat = new THREE.LineBasicMaterial({ color: S.lines || style === "studio" ? "#172027" : "#9FB0B8" });
  const basePlanes = [];
  if (opts.split !== undefined) {
    basePlanes.push(new THREE.Plane(new THREE.Vector3(1, 0, 0), -opts.split));
    lineMat.clippingPlanes = [new THREE.Plane(new THREE.Vector3(-1, 0, 0), opts.split + 0.002)];
  }
  const n = Math.hypot(1, END_SKEW);
  const keepPlane = new THREE.Plane(new THREE.Vector3(-1 / n, 0, END_SKEW / n), END_X / n);   // beam side of the end cut
  const offPlane = new THREE.Plane(new THREE.Vector3(1 / n, 0, -END_SKEW / n), -END_X / n);   // offcut side
  steelMat.clippingPlanes = basePlanes;

  const flangeGeos = [];
  const addMesh = (parent, geo, mat = steelMat) => {
    const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = S.shadow; parent.add(m);
    if (lines) parent.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 25), lineMat));
    return m;
  };
  for (const s of [-1, 1]) {
    const geo = new THREE.BoxGeometry(BEAM_L, FLANGE_H, FLANGE_T);
    geo.translate(CX, 0, s * (GAP / 2 + FLANGE_T / 2)); addMesh(scene, geo); flangeGeos.push(geo);
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
  const dark = S.bg !== "#FFFFFF" && style !== "studio";
  const cadColor = dark ? "#9FB0B8" : "#172027";
  const onWeb = (pts, y = WEB_TOP + 0.002) => pts.map((p) => new THREE.Vector3(p.x, y, p.y));
  const dashed = (pts3, mat) => { const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts3), mat); l.computeLineDistances(); return l; };
  // One persistent light: adding/removing lights forces shader recompiles mid-scroll.
  const spot = new THREE.PointLight("#FF8A4C", 0, 0.45, 2); scene.add(spot);
  let dyn = null, lastDone = null, webGroup = null, webGeo = null, offcut = null;

  function buildWeb(done) {
    if (webGroup) { scene.remove(webGroup); disposeTree(webGroup); }
    if (offcut) { scene.remove(offcut.group); offcut.group.traverse((c) => c.material?.dispose?.()); offcut = null; }
    webGroup = new THREE.Group();
    const shape = new THREE.Shape();
    shape.moveTo(X0, -GAP / 2); shape.lineTo(X1, -GAP / 2); shape.lineTo(X1, GAP / 2); shape.lineTo(X0, GAP / 2); shape.closePath();
    for (const [x, z] of HOLES.slice(0, done)) shape.holes.push(new THREE.Path(circle(x, z, HOLE_R, 40)));
    webGeo = new THREE.ExtrudeGeometry(shape, { depth: WEB_T, bevelEnabled: false, curveSegments: 24 });
    webGeo.rotateX(Math.PI / 2); webGeo.translate(0, WEB_TOP, 0); addMesh(webGroup, webGeo);
    const cadMat = new THREE.LineDashedMaterial({ color: cadColor, dashSize: 0.018, gapSize: 0.012 });
    for (const [x, z] of HOLES.slice(done)) webGroup.add(dashed(onWeb(circle(x, z, HOLE_R, 48)), cadMat));
    scene.add(webGroup);
  }

  // Offcut beyond the end cut, built once per web: one copy in place, one at the exploded offset.
  const EXPLODE = new THREE.Vector3(0.9, 0.1, 0);
  function getOffcut() {
    if (offcut) return offcut;
    const group = new THREE.Group(), mk = () => { const m = steelMat.clone(); m.clippingPlanes = [offPlane, ...basePlanes]; m.transparent = true; return m; };
    const inPlace = new THREE.Group(), out = new THREE.Group(); out.position.copy(EXPLODE);
    const mi = mk(), mo = mk();
    mo.clippingPlanes = [offPlane.clone().translate(EXPLODE)];   // clipping planes are world-space: shift with the copy
    for (const geo of [...flangeGeos, webGeo]) { inPlace.add(new THREE.Mesh(geo, mi)); out.add(new THREE.Mesh(geo, mo)); }
    group.add(inPlace, out); scene.add(group);
    return (offcut = { group, mi, mo, out });
  }

  const state = { front: new THREE.Vector2() };
  function update({ progress = 0, explode = 0, head: showHead = true, endCut = 0, park = 0 } = {}) {
    const p = Math.min(Math.max(progress, 0), 1);
    const done = holesDone(p);
    if (done !== lastDone) { buildWeb(done); lastDone = done; }
    if (dyn) { scene.remove(dyn); disposeTree(dyn); }
    dyn = new THREE.Group(); scene.add(dyn);
    const L = locate(p); state.front.copy(L.pos);
    head.visible = showHead; head.position.set(L.pos.x, 0.4 * park, L.pos.y);
    spot.intensity = 0;

    if (L.cut) {
      const hole = CUT_PATH.pts.filter((q, k) => q.hole === L.hole && q.cut && k < L.i).map((q) => q.p);
      const cut = [...hole, L.pos];
      if (cut.length > 1) {
        dyn.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(onWeb(cut, WEB_TOP + 0.001)), cut.length * 2, S.lines ? 0.006 : 0.0022, 6),
          new THREE.MeshBasicMaterial({ color: S.lines ? "#F05A24" : "#15191C" })));
      }
      if (!S.lines) {
        const trail = cut.slice(-6);
        if (trail.length > 2) dyn.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(onWeb(trail, WEB_TOP + 0.002)), 16, 0.003, 6),
          new THREE.MeshBasicMaterial({ color: "#FF7A3D" })));
        const f3 = new THREE.Vector3(L.pos.x, WEB_TOP + 0.01, L.pos.y);
        for (const [tex, size, op] of [[glowCore, 0.07, 1], [glowHalo, 0.16 * S.glow, 0.6]]) {
          const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: op, fog: false }));
          sp.position.copy(f3); sp.scale.setScalar(size); dyn.add(sp);
        }
        spot.intensity = 0.12 * S.glow; spot.position.copy(f3).add(new THREE.Vector3(0, 0.03, 0));
        // Restrained melt ejection below the web; deterministic so scrolling doesn't flicker.
        for (let i = 0; i < 9; i++) {
          const j = Math.sin((i + 1) * 91.7 + p * 400) * 0.5;
          const d = new THREE.Sprite(new THREE.SpriteMaterial({ map: meltTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.85 - i * 0.08, fog: false }));
          d.position.set(L.pos.x + j * 0.03, -WEB_T / 2 - 0.02 - i * 0.03, L.pos.y + Math.cos(i * 37.1) * 0.015);
          d.scale.setScalar(0.03 - i * 0.002); dyn.add(d);
        }
      }
    }

    // End cut: planned (dashed on the web), then drawn as a trace around the section, then the offcut in an exploded view.
    if (endCut <= 0) {
      dyn.add(dashed([new THREE.Vector3(END_X - END_SKEW * g, WEB_TOP + 0.002, -g), new THREE.Vector3(END_X + END_SKEW * g, WEB_TOP + 0.002, g)],
        new THREE.LineDashedMaterial({ color: cadColor, dashSize: 0.03, gapSize: 0.02 })));
    } else {
      const k = Math.max(2, Math.round(Math.min(endCut, 1) * (SECTION.length - 1) * 8));
      const path = new THREE.CurvePath(); for (let i = 0; i < SECTION.length - 1; i++) path.add(new THREE.LineCurve3(SECTION[i], SECTION[i + 1]));
      const all = path.getSpacedPoints((SECTION.length - 1) * 8), pts = all.slice(0, k + 1);
      dyn.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: "#F05A24" })));
    }
    const e = endCut >= 1 ? Math.min(Math.max(explode, 0), 1) : 0;
    steelMat.clippingPlanes = e > 0 ? [keepPlane, ...basePlanes] : basePlanes;
    if (e > 0) {
      const o = getOffcut(); o.group.visible = true;
      o.mi.opacity = 1 - e; o.mi.depthWrite = e < 0.01; o.mo.opacity = e; o.mo.depthWrite = e > 0.99;
      const lead = new THREE.LineDashedMaterial({ color: dark ? "#8C9AA1" : "#4F5D68", dashSize: 0.025, gapSize: 0.02, transparent: true, opacity: e });
      for (const v of [SECTION[0], SECTION[5], SECTION[6], SECTION[11]]) dyn.add(dashed([v, v.clone().add(EXPLODE)], lead));
    } else if (offcut) offcut.group.visible = false;
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

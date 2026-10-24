// The building in 3D: columns, beams and braces as instanced meshes, translucent floors, the weakened member hatched
// in orange and labeled, and the modes as motion: after a tap, the sounding modes together, decaying; or one mode, looping.
// Floors move rigidly (ux, uy, θz); members are drawn straight between them. Three's axes: x = x, y = z (up), z = −y.
import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import type { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { addStandardLights, createStage, fitDistance, groundDisc, type Stage } from "../three/stage";
import { orbit, OrbitButtons, type View } from "../three/controls";
import { hatchTexture } from "../three/hatch";
import { iSectionShape } from "../three/isection";
import { section } from "../steel/sections";
import { BAYS, columnSection, H, lineXY, SPAN, type Building, type Damage } from "./building";

/** What moves: shapes are mode vectors [ux, uy, θz] per floor; each runs at its visual frequency and decays with tau. */
export interface Motion { key: number; shapes: Float64Array[]; amps: number[]; hz: number[]; tau: number[]; seconds: number; loop: boolean }

export interface Building3DProps {
  b: Building; dmg: Damage; picking: boolean; tapFloor: number;
  motion: Motion | null; still: Float64Array | null;   // still: a shape to show without motion (reduced motion)
  onPick: (id: string) => void; onTapFloor: (floor: number) => void; label: string;
}

const STEEL = 0x819199;
const P = (x: number, y: number, z: number) => new THREE.Vector3(x, z, -y);

function extruded(h: number, b: number, tw: number, tf: number, along: "x" | "y") {
  const s = new THREE.Shape();
  iSectionShape(h, b, tw, tf).forEach(([lat, ver], i) => (i ? s.lineTo(lat, ver) : s.moveTo(lat, ver)));
  const g = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false });
  if (along === "y") g.rotateX(-Math.PI / 2); else g.rotateY(Math.PI / 2);   // unit length along +y (columns) or +x (beams)
  return g;
}

interface Member { kind: "col" | "bx" | "by" | "br"; id: string; a: [number, number, number]; b: [number, number, number] }   // engineering x, y, z (floor index in z)

function layout(bd: Building) {
  const out: Member[] = [];
  for (let s = 1; s <= bd.n; s++) {
    for (let k = 1; k <= 9; k++) { const [x, y] = lineXY(k); out.push({ kind: "col", id: `c${s}-${k}`, a: [x, y, s - 1], b: [x, y, s] }); }
    for (const y of [-SPAN, 0, SPAN]) for (const x of [-SPAN, 0]) out.push({ kind: "bx", id: "", a: [x, y, s], b: [x + SPAN, y, s] });
    for (const x of [-SPAN, 0, SPAN]) for (const y of [-SPAN, 0]) out.push({ kind: "by", id: "", a: [x, y, s], b: [x, y + SPAN, s] });
    if (bd.sys === "braced") BAYS.forEach((bay, i) => {
      const [cx, cy] = bay.at, dx = bay.dir === "x" ? SPAN / 2 : 0, dy = bay.dir === "y" ? SPAN / 2 : 0;
      out.push({ kind: "br", id: `b${s}-${i + 1}`, a: [cx - dx, cy - dy, s - 1], b: [cx + dx, cy + dy, s] }, { kind: "br", id: `b${s}-${i + 1}`, a: [cx + dx, cy + dy, s - 1], b: [cx - dx, cy - dy, s] });
    });
  }
  return out;
}

const Building3D: React.FC<Building3DProps> = (p) => {
  const canvasRef = useRef<HTMLCanvasElement>(null), labelRef = useRef<HTMLSpanElement>(null);
  const props = useRef(p);
  props.current = p;
  const world = useRef<{ stage: Stage; controls: OrbitControls; home: View; group: THREE.Group; floors: THREE.Mesh[]; meshes: { mesh: THREE.InstancedMesh; members: Member[] }[]; weak: THREE.Mesh[]; hatch: THREE.Texture; disp: Float64Array; anchor: THREE.Vector3 | null } | null>(null);
  const cancel = useRef<(() => void) | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current!, stage = createStage(canvas);
    addStandardLights(stage.scene);
    const group = new THREE.Group();
    stage.scene.add(groundDisc(14), group);
    const controls = orbit(stage, { minDistance: 6, maxDistance: 120 });
    world.current = { stage, controls, home: { position: new THREE.Vector3(), target: new THREE.Vector3() }, group, floors: [], meshes: [], weak: [], hatch: hatchTexture(), disp: new Float64Array(0), anchor: null };
    stage.onRender = () => {   // the "Weakened" label follows its member
      const w = world.current, el = labelRef.current;
      if (!w || !el) return;
      if (!w.anchor) { el.style.display = "none"; return; }
      const v = w.anchor.clone().project(stage.camera), r = canvas.getBoundingClientRect();
      el.style.display = v.z < 1 ? "block" : "none";
      el.style.transform = `translate(${((v.x + 1) / 2) * r.width + 8}px, ${((1 - v.y) / 2) * r.height - 10}px)`;
    };
    return () => { cancel.current?.(); controls.dispose(); world.current?.hatch.dispose(); stage.dispose(); world.current = null; };
  }, []);

  // geometry for the building; camera framed when the height changes
  const { b, dmg } = p;
  useEffect(() => {
    const w = world.current;
    if (!w) return;
    cancel.current?.();
    for (const c of [...w.group.children]) { w.group.remove(c); c.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose(); }); }
    const steel = new THREE.MeshStandardMaterial({ color: STEEL, metalness: 0.2, roughness: 0.6 });
    const members = layout(b), kinds: [Member["kind"], string, THREE.BufferGeometry][] = [];
    const lowC = columnSection(1), upC = columnSection(4), beam = section("IPE360")!;
    kinds.push(["col", "low", extruded(lowC.h / 1e3, lowC.b / 1e3, lowC.tw / 1e3, lowC.tf / 1e3, "y")]);
    kinds.push(["col", "up", extruded(upC.h / 1e3, upC.b / 1e3, upC.tw / 1e3, upC.tf / 1e3, "y")]);
    kinds.push(["bx", "", extruded(beam.h / 1e3, beam.b / 1e3, beam.tw / 1e3, beam.tf / 1e3, "x")]);
    kinds.push(["by", "", extruded(beam.h / 1e3, beam.b / 1e3, beam.tw / 1e3, beam.tf / 1e3, "x")]);
    kinds.push(["br", "", new THREE.CylinderGeometry(0.07, 0.07, 1, 10).translate(0, 0.5, 0)]);
    w.meshes = kinds.map(([kind, part, g]) => {
      const list = members.filter((m) => m.kind === kind && (kind !== "col" || (part === "low") === (m.a[2] < 3)));
      const mesh = new THREE.InstancedMesh(g, steel, Math.max(1, list.length));
      mesh.count = list.length;
      w.group.add(mesh);
      return { mesh, members: list };
    });
    const fm = new THREE.MeshBasicMaterial({ color: 0xeef0ee, transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide });
    w.floors = Array.from({ length: b.n }, (_, i) => { const f = new THREE.Mesh(new THREE.BoxGeometry(2 * SPAN, 0.1, 2 * SPAN), fm); f.userData.floor = i + 1; w.group.add(f); return f; });
    // the weakened member: a hatched copy of it in laser orange (the hatch tinted), on top of its (hidden) instance
    const hatchMat = new THREE.MeshStandardMaterial({ color: 0xf05a24, map: w.hatch, metalness: 0.1, roughness: 0.7 });
    w.weak = [];
    if (dmg) {
      const id = `${dmg.kind}${dmg.storey}-${dmg.at}`;
      for (const { mesh, members: list } of w.meshes) list.forEach((m) => { if (m.id === id) { const c = new THREE.Mesh(mesh.geometry, hatchMat); c.userData.member = m; w.weak.push(c); w.group.add(c); } });
    }
    w.disp = new Float64Array(3 * b.n);
    pose();
    // camera: azimuth 35°, elevation 20°, the whole building
    const Ht = b.n * H, target = new THREE.Vector3(0, Ht / 2, 0), az = (35 * Math.PI) / 180, el = (20 * Math.PI) / 180;
    const dir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
    const pts = [-1, 1].flatMap((x) => [0, Ht].flatMap((y) => [-1, 1].map((z) => new THREE.Vector3(x * (SPAN + 1), y, z * (SPAN + 1)))));
    const d = fitDistance(w.stage.camera, target, dir, pts, 0.85);
    w.stage.camera.position.copy(target).addScaledVector(dir, d);
    w.controls.target.copy(target);
    w.controls.update();
    w.home = { position: w.stage.camera.position.clone(), target: target.clone() };
  }, [b.n, b.sys, dmg?.kind, dmg?.storey, dmg?.at]);   // eslint-disable-line react-hooks/exhaustive-deps

  /** Place everything for the floor motions in w.disp ([ux, uy, θz] per floor, metres and radians). */
  const pose = () => {
    const w = world.current, P2 = props.current;
    if (!w) return;
    const u = w.disp, at = (x: number, y: number, f: number) => {
      if (f === 0) return P(x, y, 0);
      const r = 3 * (f - 1);
      return P(x + u[r] - y * u[r + 2], y + u[r + 1] + x * u[r + 2], f * H);
    };
    const M = new THREE.Matrix4(), up = new THREE.Vector3(0, 1, 0), X = new THREE.Vector3(1, 0, 0), Z = new THREE.Vector3(0, 0, 1);
    const matrixOf = (m: Member) => {
      const A = at(m.a[0], m.a[1], m.a[2]), B = at(m.b[0], m.b[1], m.b[2]), d = B.clone().sub(A);
      if (m.kind === "col") return M.makeBasis(X, d, Z).setPosition(A);
      if (m.kind === "br") { const s1 = new THREE.Vector3().crossVectors(d, Z).normalize(), s2 = new THREE.Vector3().crossVectors(s1, d).normalize(); return M.makeBasis(s1, d, s2).setPosition(A); }
      const side = new THREE.Vector3().crossVectors(d, up).normalize();
      return M.makeBasis(d, up, side).setPosition(A);
    };
    const weakId = P2.dmg ? `${P2.dmg.kind}${P2.dmg.storey}-${P2.dmg.at}` : null;
    for (const { mesh, members: list } of w.meshes) {
      list.forEach((m, i) => { matrixOf(m); if (m.id && m.id === weakId) M.scale(new THREE.Vector3(0, 0, 0)); mesh.setMatrixAt(i, M); });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
    w.anchor = null;
    for (const c of w.weak) {
      const m = c.userData.member as Member;
      matrixOf(m);
      c.matrixAutoUpdate = false;
      c.matrix.copy(M);
      const A = at(m.a[0], m.a[1], m.a[2]), B = at(m.b[0], m.b[1], m.b[2]);
      w.anchor = A.add(B).multiplyScalar(0.5);
    }
    w.floors.forEach((f, i) => {
      const r = 3 * i;
      f.position.copy(P(u[r], u[r + 1], (i + 1) * H + 0.05));
      f.rotation.y = u[r + 2];
      (f.material as THREE.MeshBasicMaterial).color.setHex(i + 1 === P2.tapFloor ? 0xcbd2d5 : 0xeef0ee);
    });
    w.stage.requestRender();
  };

  // motion: after a tap, or one mode looping; still shapes under reduced motion
  const { motion, still, tapFloor } = p;
  useEffect(() => {
    const w = world.current;
    if (!w) return;
    cancel.current?.();
    cancel.current = null;
    const n = b.n, roof = (v: Float64Array) => Math.max(...[[SPAN, SPAN], [-SPAN, SPAN], [SPAN, -SPAN], [-SPAN, -SPAN]].map(([x, y]) => Math.hypot(v[3 * (n - 1)] - y * v[3 * (n - 1) + 2], v[3 * (n - 1) + 1] + x * v[3 * (n - 1) + 2])));
    const scaleTo = (v: Float64Array) => { const r = roof(v); return r > 0 ? (n * H) / 30 / r : 0; };   // the roof moves H/30
    if (still) { const s = scaleTo(still); w.disp = still.map((x) => x * s); pose(); return; }
    if (!motion || !motion.shapes.length) { w.disp = new Float64Array(3 * n); pose(); return; }
    const norm = motion.shapes.map((v) => { const r = roof(v); return r > 0 ? v.map((x) => x / r) : v; });
    const peak = new Float64Array(3 * n);
    norm.forEach((v, i) => v.forEach((x, k) => { peak[k] += motion.amps[i] * x; }));
    const s = scaleTo(peak) || 1;
    cancel.current = w.stage.animate((u) => {
      const t = u * motion.seconds, fade = motion.loop ? 1 : Math.min(1, (motion.seconds - t) / 0.25);
      const d = new Float64Array(3 * n);
      norm.forEach((v, i) => { const c = motion.amps[i] * Math.cos(2 * Math.PI * motion.hz[i] * t) * Math.exp(-t / motion.tau[i]) * fade * s; v.forEach((x, k) => { d[k] += c * x; }); });
      w.disp = u >= 1 ? new Float64Array(3 * n) : d;
      pose();
    }, motion.seconds * 1000);
  }, [motion?.key, still]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { pose(); }, [tapFloor]);   // eslint-disable-line react-hooks/exhaustive-deps

  // clicks: a floor sets the tap floor; in picking mode a column or brace is chosen for damage
  useEffect(() => {
    const canvas = canvasRef.current!, ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    let down: { x: number; y: number } | null = null;
    const onDown = (e: PointerEvent) => { down = { x: e.clientX, y: e.clientY }; };
    const onUp = (e: PointerEvent) => {
      const w = world.current;
      if (!w || !down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > (e.pointerType === "mouse" ? 3 : 8)) return;
      const r = canvas.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, w.stage.camera);
      if (props.current.picking) {
        const pickable = w.meshes.filter(({ members: l }) => l[0] && (l[0].kind === "col" || l[0].kind === "br"));
        const hit = ray.intersectObjects([...pickable.map((x) => x.mesh), ...w.weak], false)[0];
        if (!hit) return;
        const own = pickable.find((x) => x.mesh === hit.object), m = own && hit.instanceId !== undefined ? own.members[hit.instanceId] : (hit.object.userData.member as Member | undefined);
        if (m?.id) props.current.onPick(m.id);
        return;
      }
      const hit = ray.intersectObjects(w.floors, false)[0];
      if (hit) props.current.onTapFloor(hit.object.userData.floor as number);
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointerup", onUp);
    return () => { canvas.removeEventListener("pointerdown", onDown); canvas.removeEventListener("pointerup", onUp); };
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <canvas ref={canvasRef} role="img" aria-label={p.label} className={`block h-full w-full touch-none ${p.picking ? "cursor-crosshair" : ""}`} />
      <span ref={labelRef} className="t-small pointer-events-none absolute left-0 top-0 hidden bg-canvas/90 px-1 text-ink">{p.dmg ? `Weakened ${Math.round(100 * p.dmg.d)} %` : ""}</span>
      <OrbitButtons get={() => world.current} className="absolute right-0 top-0" />
    </div>
  );
};

export default Building3D;

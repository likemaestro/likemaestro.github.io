// The twisting beam in 3D: the buckling mode on a steel I-beam, its fork supports, the loads at their height and the
// restraints, which can be dragged along the span. Rendering on demand; Three's axes: X along the span, Y up, Z = −y.
import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import type { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { addStandardLights, createStage, fitDistance, groundDisc, type Stage } from "../three/stage";
import { orbit, OrbitButtons, type View } from "../three/controls";
import { deformedMember, iSectionShape } from "../three/isection";
import type { Section } from "../steel/sections";
import { displayScale, type Show } from "./show";
import { modeAt, zLoad, type Height, type Load, type LtbResult } from "./ltb";

const INK = 0x172027, INK2 = 0x4f5d68, LASER = 0xf05a24, STEEL = 0x819199, RULE = 0xcbd2d5;

export interface Beam3DProps {
  sec: Section; L: number; load: Load; height: Height; kind: "top" | "full";
  at: number[];                    // restraint shares, as shown (snapped to nodes)
  result: LtbResult | null; show: Show;
  picked: number | null;
  onPick: (i: number | null) => void;
  onDrag: (i: number, share: number) => void;
  onDragEnd: (i: number, share: number) => void;
  label: string;
}

interface World {
  stage: Stage; controls: OrbitControls; home: View;
  beam: THREE.Group; member: ReturnType<typeof deformedMember>; edges: THREE.LineSegments;
  arrows: THREE.Group; struts: THREE.Group; supports: THREE.Group; ground: THREE.Mesh;
  key: string;
}

const mat = (color: number) => new THREE.MeshStandardMaterial({ color, metalness: 0.1, roughness: 0.7 });
const disposeChildren = (g: THREE.Object3D) => {
  for (const c of [...g.children]) {
    g.remove(c);
    c.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose(); (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) => x?.dispose()); });
  }
};

/** A downward arrow with its tip at the origin, shaft length len (m). */
function arrow(len: number, r: number, material: THREE.Material) {
  const g = new THREE.Group(), head = Math.min(0.3 * len, 10 * r);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len - head, 10), material);
  shaft.position.y = head + (len - head) / 2;
  const cone = new THREE.Mesh(new THREE.ConeGeometry(2.6 * r, head, 16), material);
  cone.rotation.x = Math.PI;
  cone.position.y = head / 2;
  g.add(shaft, cone);
  return g;
}

/** A curved arrow in the XY plane around the origin: the end moment, turning clockwise (sign −1) or anticlockwise. */
function momentArrow(R: number, r: number, sign: 1 | -1, material: THREE.Material) {
  const g = new THREE.Group(), sweep = 1.4 * Math.PI, start = -0.2 * Math.PI;
  const arc = new THREE.Mesh(new THREE.TorusGeometry(R, r, 8, 40, sweep), material);
  arc.rotation.z = start;
  const end = start + (sign > 0 ? sweep : 0), head = new THREE.Mesh(new THREE.ConeGeometry(2.6 * r, 8 * r, 16), material);
  head.position.set(R * Math.cos(end), R * Math.sin(end), 0);
  head.rotation.z = end + (sign > 0 ? 0 : Math.PI);   // the cone points along +Y; tangent at the arc's end
  g.add(arc, head);
  return g;
}

const Beam3D: React.FC<Beam3DProps> = (p) => {
  const canvasRef = useRef<HTMLCanvasElement>(null), wrapRef = useRef<HTMLDivElement>(null);
  const world = useRef<World | null>(null);
  const props = useRef(p);
  props.current = p;

  // the stage, once
  useEffect(() => {
    const canvas = canvasRef.current!;
    const stage = createStage(canvas);
    addStandardLights(stage.scene);
    const beam = new THREE.Group(), arrows = new THREE.Group(), struts = new THREE.Group(), supports = new THREE.Group();
    const member = deformedMember(iSectionShape(0.3, 0.15, 0.007, 0.01), 1, 60);
    const steel = new THREE.MeshStandardMaterial({ color: STEEL, metalness: 0.2, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
    const edges = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: RULE }));
    beam.add(new THREE.Mesh(member.geometry, steel), edges, arrows, struts, supports);
    const ground = groundDisc(1);
    stage.scene.add(beam, ground);
    const controls = orbit(stage, { minDistance: 0.5, maxDistance: 60 });
    world.current = { stage, controls, home: { position: new THREE.Vector3(), target: new THREE.Vector3() }, beam, member, edges, arrows, struts, supports, ground, key: "" };
    return () => { controls.dispose(); stage.dispose(); world.current = null; };
  }, []);

  // geometry that depends on the section and span; the camera frames the beam when the span or section changes
  const { sec, L, load, height, kind, at, result, show, picked } = p;
  useEffect(() => {
    const w = world.current;
    if (!w) return;
    const h = sec.h / 1e3, b = sec.b / 1e3, Lm = L / 1e3;
    w.member.geometry.dispose();
    const m = deformedMember(iSectionShape(h, b, sec.tw / 1e3, sec.tf / 1e3), Lm, 60);
    (w.beam.children[0] as THREE.Mesh).geometry = m.geometry;
    w.member = m;
    const straight = deformedMember(iSectionShape(h, b, sec.tw / 1e3, sec.tf / 1e3), Lm, 1);
    w.edges.geometry.dispose();
    w.edges.geometry = new THREE.EdgesGeometry(straight.geometry, 30);
    straight.geometry.dispose();
    w.beam.position.set(-Lm / 2, 0, 0);

    disposeChildren(w.supports);
    const ink = mat(INK), base = -h / 2 - 0.25;
    for (const x of [0, Lm]) {
      for (const s of [-1, 1]) {
        const plate = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.9 * h, 0.012), ink);
        plate.position.set(x, 0, s * (b / 2 + 0.012));
        w.supports.add(plate);
      }
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.08, -h / 2 - base, b + 0.06), ink);
      seat.position.set(x, (base - h / 2) / 2, 0);
      w.supports.add(seat);
    }
    w.ground.position.set(0, base, 0);
    w.ground.scale.setScalar(0.62 * Lm + 0.5);

    const key = `${sec.id}|${L}`;
    if (w.key !== key) {
      const target = new THREE.Vector3(0, 0, 0), dir = w.key ? w.stage.camera.position.clone().sub(w.controls.target).normalize()
        : new THREE.Vector3(Math.sin((35 * Math.PI) / 180) * Math.cos((25 * Math.PI) / 180), Math.sin((25 * Math.PI) / 180), Math.cos((35 * Math.PI) / 180) * Math.cos((25 * Math.PI) / 180));
      const pts = [-Lm / 2, Lm / 2].flatMap((x) => [-1, 1].flatMap((y) => [-1, 1].map((z) => new THREE.Vector3(x, y > 0 ? h / 2 + 0.6 * h + 0.3 : base, z * (b / 2 + 0.4)))));
      const d = fitDistance(w.stage.camera, target, dir, pts, 0.9);
      w.stage.camera.position.copy(target).addScaledVector(dir, d);
      w.controls.target.copy(target);
      w.controls.maxDistance = 4 * d;
      w.controls.minDistance = Math.max(0.3, 2 * h);
      w.controls.update();
      if (!w.key) w.home = { position: w.stage.camera.position.clone(), target: target.clone() };
      else w.home = { position: target.clone().addScaledVector(dir, d), target: target.clone() };
      w.key = key;
    }
    w.stage.requestRender();
  }, [sec, L]);   // eslint-disable-line react-hooks/exhaustive-deps

  // the mode: the member's slices, and the loads and struts that ride on it; meshes are only moved here
  const pose = () => {
    const w = world.current, P = props.current;
    if (!w) return;
    const c = P.result ? displayScale(P.result, P.L, P.show) : 0;   // mm per unit of the normalized mode
    const at3 = (s: number) => {
      if (!P.result || !c) return { dx: 0, dy: 0, dz: 0, rx: 0 };
      const m = modeAt(P.result, s * P.L);
      return { dx: 0, dy: 0, dz: (-c * m.v) / 1e3, rx: c * m.phi };
    };
    w.member.update(at3);
    const Lm = P.L / 1e3;
    for (const a of w.arrows.children) {
      const { s, z, below, len } = a.userData as { s?: number; z: number; below: boolean; len: number };
      if (s === undefined) continue;   // end moments stay put
      const mv = at3(s);
      a.position.set(s * Lm, z * Math.cos(mv.rx) - (below ? len : 0), mv.dz + z * Math.sin(mv.rx));
    }
    for (const g of w.struts.children) {
      const mv = at3(g.userData.s as number);
      for (const part of g.children) {
        const { z, dz } = part.userData as { z: number; dz: number };
        part.position.set((g.userData.s as number) * Lm, z * Math.cos(mv.rx), mv.dz + z * Math.sin(mv.rx) + dz);
      }
    }
    w.stage.requestRender();
  };

  // loads and restraints: built when what they show changes
  useEffect(() => {
    const w = world.current;
    if (!w) return;
    const h = sec.h / 1e3, b = sec.b / 1e3, Lm = L / 1e3, ztop = (sec.h - sec.tf) / 2e3;
    disposeChildren(w.arrows);
    const ink = mat(INK), len = Math.min(0.8, Math.max(0.25, 0.1 * Lm)), r = Math.max(0.006, 0.012 * len);
    const add = (s: number) => {
      const g = new THREE.Group(), a = arrow(len, r, ink);
      if (height === "centre") {   // at the shear center: drawn beside the beam, with a short bracket to the web
        const off = b / 2 + 0.04, bracket = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.7, r * 0.7, off, 8), ink);
        bracket.rotation.x = Math.PI / 2;
        bracket.position.z = off / 2;
        a.position.z = off;
        g.add(bracket);
      }
      g.add(a);
      g.userData = { s, z: zLoad(h, height), below: height === "bottom", len };
      w.arrows.add(g);
    };
    if (load === "udl") for (let i = 1; i <= 9; i++) add(i / 10);
    else if (load === "point") add(0.5);
    else for (const [x, sgn] of [[0, -1], [Lm, 1]] as const) {   // sagging end moments: clockwise at the left, seen from the front
      const m = momentArrow(0.75 * h + 0.08, r, sgn, ink);
      m.position.set(x + sgn * 0.06, 0, b / 2 + 0.06);
      w.arrows.add(m);
    }

    disposeChildren(w.struts);
    const reach = Math.max(0.3, 1.5 * b), hidden = new THREE.MeshBasicMaterial({ visible: false });
    at.forEach((s, i) => {
      const g = new THREE.Group(), m = mat(picked === i ? LASER : INK);
      for (const z of kind === "full" ? [ztop, -ztop] : [ztop]) {
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, reach, 10), m);
        rod.rotation.x = Math.PI / 2;
        rod.userData = { z, dz: b / 2 + reach / 2 };
        const foot = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.02), m);
        foot.userData = { z, dz: b / 2 + reach };
        // an invisible, thicker twin for picking: the rod itself is a few pixels wide
        const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, reach + 0.1, 8), hidden);
        grip.rotation.x = Math.PI / 2;
        grip.userData = { z, dz: b / 2 + reach / 2 };
        g.add(rod, foot, grip);
      }
      g.userData = { index: i, s };
      w.struts.add(g);
    });
    pose();
  }, [sec, L, load, height, kind, at, picked]);   // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(pose, [result, show]);   // eslint-disable-line react-hooks/exhaustive-deps

  // picking and dragging restraints; capture phase so the orbit controls never see a drag that starts on a strut
  useEffect(() => {
    const wrap = wrapRef.current!, canvas = canvasRef.current!, ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    let drag: { i: number; share: number; id: number } | null = null, hover = -1, raf = 0;
    const hit = (e: PointerEvent) => {
      const w = world.current;
      if (!w) return -1;
      const r = canvas.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, w.stage.camera);
      ray.params.Line = { threshold: 0.02 };
      const hits = ray.intersectObjects(w.struts.children, true);
      return hits.length ? (hits[0].object.parent!.userData.index as number) : -1;
    };
    const tint = (i: number, on: boolean) => {   // a hovered strut turns ink-2; the picked one stays laser
      const w = world.current, g = w?.struts.children[i];
      if (!w || !g || props.current.picked === i) return;
      for (const part of g.children) ((part as THREE.Mesh).material as THREE.MeshStandardMaterial).color?.setHex(on ? INK2 : INK);
      w.stage.requestRender();
    };
    const shareAt = (e: PointerEvent) => {   // the pointer ray against the plane through the beam axis facing the camera
      const w = world.current!, r = canvas.getBoundingClientRect(), P = props.current;
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, w.stage.camera);
      const toCam = w.stage.camera.position.clone().sub(w.controls.target);
      toCam.x = 0;
      if (toCam.lengthSq() < 1e-9) toCam.set(0, 0, 1);
      const pt = new THREE.Vector3();
      if (!ray.ray.intersectPlane(new THREE.Plane().setFromNormalAndCoplanarPoint(toCam.normalize(), new THREE.Vector3()), pt)) return null;
      const n = P.result?.n ?? 40, s = Math.min(0.95, Math.max(0.05, (pt.x + P.L / 2e3) / (P.L / 1e3)));
      return Math.round(s * n) / n;
    };
    const down = (e: PointerEvent) => {
      if (e.target !== canvas) return;   // the view buttons sit over the canvas
      const i = hit(e);
      if (i < 0) { if (props.current.picked !== null) props.current.onPick(null); return; }
      e.stopPropagation();
      e.preventDefault();
      props.current.onPick(i);
      drag = { i, share: props.current.at[i], id: e.pointerId };
      wrap.setPointerCapture(e.pointerId);
      wrap.style.cursor = "grabbing";
    };
    const move = (e: PointerEvent) => {
      if (drag && e.pointerId === drag.id) {
        const s = shareAt(e);
        if (s !== null && s !== drag.share) {
          drag.share = s;
          if (!raf) raf = requestAnimationFrame(() => { raf = 0; if (drag) props.current.onDrag(drag.i, drag.share); });
        }
        return;
      }
      if (e.pointerType !== "mouse") return;
      const i = hit(e);
      if (i !== hover) {
        tint(hover, false);
        hover = i;
        tint(hover, true);
        wrap.style.cursor = i >= 0 ? "grab" : "";
      }
    };
    const up = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      const d = drag;
      drag = null;
      wrap.releasePointerCapture(e.pointerId);
      wrap.style.cursor = hover >= 0 ? "grab" : "";
      props.current.onDragEnd(d.i, d.share);
    };
    wrap.addEventListener("pointerdown", down, { capture: true });
    wrap.addEventListener("pointermove", move);
    wrap.addEventListener("pointerup", up);
    wrap.addEventListener("pointercancel", up);
    return () => {
      cancelAnimationFrame(raf);
      wrap.removeEventListener("pointerdown", down, { capture: true });
      wrap.removeEventListener("pointermove", move);
      wrap.removeEventListener("pointerup", up);
      wrap.removeEventListener("pointercancel", up);
    };
  }, []);

  return (
    <div ref={wrapRef} className="relative h-full w-full max-sm:flex max-sm:flex-col">
      <canvas ref={canvasRef} role="img" aria-label={p.label} className="block h-full w-full touch-none max-sm:min-h-0 max-sm:flex-1" />
      <OrbitButtons get={() => world.current} className="absolute right-0 top-0 max-sm:static max-sm:mt-2 max-sm:justify-end" />
    </div>
  );
};

export default Beam3D;

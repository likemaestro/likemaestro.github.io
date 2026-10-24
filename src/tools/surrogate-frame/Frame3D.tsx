// The frame in 3D: members as instanced I-sections in greys by utilization (hatched where the surrogate is unsure or
// over), translucent floors, the wind on the windward face, and, after an FE check, the deformed shape under wind.
// Three's axes: x = X, y = Z (up), z = −Y; metres, centered on the building.
import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import type { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { addStandardLights, createStage, fitDistance, groundDisc, type Stage } from "../three/stage";
import { orbit, OrbitButtons, type View } from "../three/controls";
import { hatchTexture } from "../three/hatch";
import { iSectionShape } from "../three/isection";
import { MODEL, sectionsOf, type Design, type Kind } from "./frame";

export type GroupState = { util: number; state: "ok" | "unsure" | "over" };
export interface Frame3DProps {
  design: Design;
  groups: [GroupState, GroupState, GroupState];   // lower columns, upper columns, beams
  memberUtil?: Float64Array | null;                // FE, per member, when checked
  disp?: Float64Array | null;                      // FE node displacements under wind, when checked
  deformed: boolean;
  windForces: number[];                            // N per floor, for the arrows
  picked: number | null;
  onPick: (member: number | null) => void;
  label: string;
}

const STEEL = new THREE.Color(0x819199), INK = new THREE.Color(0x172027), WHITE = new THREE.Color(0xffffff), LASER = 0xf05a24;
const { b } = MODEL, W = (b.nx * b.sx) / 1e3, D = (b.ny * b.sy) / 1e3, HT = (b.storeys * b.h) / 1e3;
const P = (x: number, y: number, z: number) => new THREE.Vector3(x / 1e3 - W / 2, z / 1e3, -(y / 1e3 - D / 2));   // mm, engineering → three
const V3 = (v: number[]) => new THREE.Vector3(v[0], v[2], -v[1]);                                                // a direction
export const grey = (u: number) => STEEL.clone().lerp(INK, Math.min(1, Math.max(0, u)));

/** A member of length L along +x with its web along +y (an extruded I-section with UVs for the hatch). */
function memberGeometry(h: number, bw: number, tw: number, tf: number, L: number) {
  const pts = iSectionShape(h, bw, tw, tf), s = new THREE.Shape();
  pts.forEach(([lat, ver], i) => (i ? s.lineTo(lat, ver) : s.moveTo(lat, ver)));
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: L, bevelEnabled: false });   // along +z; shape x = lateral, y = web
  g.rotateY(Math.PI / 2);   // +z → +x; the shape's x (lateral) goes to −z
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 4, uv.getY(i) * 4);   // stripes about 0.25 m apart
  return g;
}

/** Rotation taking the member frame (+x axis, +y web, +z = −lateral) to its place: columns, X-beams, Y-beams. */
function basis(kind: Kind) {
  const R = MODEL.geo[MODEL.members.findIndex((m) => m.kind === kind)].R;   // rows ex, ey, ez (engineering)
  return new THREE.Matrix4().makeBasis(V3(R[0]), V3(R[2]), V3(R[1]).negate());
}

const Frame3D: React.FC<Frame3DProps> = (p) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const world = useRef<{ stage: Stage; controls: OrbitControls; home: View; meshes: THREE.InstancedMesh[]; mats: THREE.MeshStandardMaterial[]; owner: number[][]; outline: THREE.LineSegments; deformed: THREE.LineSegments; hatch: [THREE.Texture, THREE.Texture]; arrows: THREE.Group } | null>(null);
  const props = useRef(p);
  props.current = p;

  useEffect(() => {
    const canvas = canvasRef.current!, stage = createStage(canvas);
    addStandardLights(stage.scene);
    const ground = groundDisc(Math.max(W, D) * 0.9);
    ground.position.y = -0.02;
    const floors = new THREE.Group(), fm = new THREE.MeshBasicMaterial({ color: 0xeef0ee, transparent: true, opacity: 0.35, depthWrite: false });
    for (let k = 1; k <= b.storeys; k++) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(W, 0.12, D), fm);
      f.position.y = (k * b.h) / 1e3 + 0.06;
      floors.add(f);
    }
    const mats = [0, 1, 2].map(() => new THREE.MeshStandardMaterial({ color: WHITE, metalness: 0.2, roughness: 0.6 }));
    const outline = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: LASER }));
    const deformed = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x172027 }));
    const arrows = new THREE.Group();
    stage.scene.add(ground, floors, outline, deformed, arrows);
    const controls = orbit(stage, { minDistance: 8, maxDistance: 160 });
    const target = new THREE.Vector3(0, HT / 2, 0), az = (40 * Math.PI) / 180, el = (20 * Math.PI) / 180;
    const dir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
    const corners = [-1, 1].flatMap((x) => [0, HT].flatMap((y) => [-1, 1].map((z) => new THREE.Vector3((x * W) / 2, y, (z * D) / 2))));
    const d = fitDistance(stage.camera, target, dir, corners, 0.85);
    stage.camera.position.copy(target).addScaledVector(dir, d);
    controls.target.copy(target);
    controls.update();
    world.current = { stage, controls, home: { position: stage.camera.position.clone(), target }, meshes: [], mats, owner: [], outline, deformed, hatch: [hatchTexture(), hatchTexture(true)], arrows };
    return () => { controls.dispose(); world.current?.hatch.forEach((t) => t.dispose()); stage.dispose(); world.current = null; };
  }, []);

  // members: rebuilt when the sections change
  const { design } = p;
  useEffect(() => {
    const w = world.current;
    if (!w) return;
    for (const m of w.meshes) { w.stage.scene.remove(m); m.geometry.dispose(); }
    const secs = sectionsOf(design), kinds: [Kind, number][] = [["col", 0], ["col", 1], ["bx", 2], ["by", 2]];
    w.meshes = []; w.owner = [];
    for (const [kind, group] of kinds) {
      const idx = MODEL.members.map((m, e) => (m.kind === kind && m.group === group ? e : -1)).filter((e) => e >= 0);
      const s = secs[group], L = MODEL.geo[idx[0]].L / 1e3;
      const mesh = new THREE.InstancedMesh(memberGeometry(s.h / 1e3, s.b / 1e3, s.tw / 1e3, s.tf / 1e3, L), w.mats[group], idx.length);
      const R = basis(kind), M = new THREE.Matrix4();
      idx.forEach((e, k) => {
        const n0 = MODEL.nodes[MODEL.members[e].i];
        M.copy(R).setPosition(P(n0[0], n0[1], n0[2]));
        mesh.setMatrixAt(k, M);
      });
      idx.forEach((_, k) => mesh.setColorAt(k, STEEL));
      mesh.userData.group = group;
      w.meshes.push(mesh); w.owner.push(idx);
      w.stage.scene.add(mesh);
    }
    paint();
  }, [design.cL, design.cU, design.bm]);   // eslint-disable-line react-hooks/exhaustive-deps

  // colors and hatches; the picked group's outline; the deformed shape; the wind arrows
  const paint = () => {
    const w = world.current, P2 = props.current;
    if (!w) return;
    // instance colors carry the grey (per member after an FE check); the hatch multiplies it
    const ghost = !!(P2.deformed && P2.disp);
    P2.groups.forEach((g, i) => {
      const m = w.mats[i];
      m.map = g.state === "ok" ? null : w.hatch[g.state === "over" ? 1 : 0];
      m.transparent = ghost;
      m.opacity = ghost ? 0.25 : 1;
      m.needsUpdate = true;
    });
    w.meshes.forEach((mesh, k) => {
      const base = P2.groups[mesh.userData.group as number];
      w.owner[k].forEach((e, i) => mesh.setColorAt(i, base.state === "over" ? WHITE : grey(P2.memberUtil ? P2.memberUtil[e] : base.util)));
      mesh.instanceColor!.needsUpdate = true;
    });
    // outline of the picked group
    const pos: number[] = [];
    if (P2.picked !== null) {
      const group = MODEL.members[P2.picked].group;
      for (const m of MODEL.members) {
        if (m.group !== group) continue;
        const a = MODEL.nodes[m.i], c = MODEL.nodes[m.j], A = P(a[0], a[1], a[2]), C = P(c[0], c[1], c[2]);
        pos.push(A.x, A.y, A.z, C.x, C.y, C.z);
      }
    }
    w.outline.geometry.dispose();
    w.outline.geometry = new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    // deformed centerlines under wind, cubic along each member; the roof moves H/40
    const dpos: number[] = [];
    if (P2.deformed && P2.disp) {
      const u = P2.disp;
      let roof = 0;
      for (let i = 0; i < u.length; i += 6) roof = Math.max(roof, Math.hypot(u[i], u[i + 1]));
      const s = roof > 0 ? (b.storeys * b.h) / 40 / roof : 0;
      MODEL.members.forEach((m, e) => {
        const { L, R } = MODEL.geo[e], g = (nd: number, a: number) => u[6 * nd + a];
        const loc = (nd: number) => [0, 1, 2].map((r) => R[r][0] * g(nd, 0) + R[r][1] * g(nd, 1) + R[r][2] * g(nd, 2));
        const rot = (nd: number) => [0, 1, 2].map((r) => R[r][0] * g(nd, 3) + R[r][1] * g(nd, 4) + R[r][2] * g(nd, 5));
        const [t1, t2, r1, r2] = [loc(m.i), loc(m.j), rot(m.i), rot(m.j)], a = MODEL.nodes[m.i];
        let prev: THREE.Vector3 | null = null;
        for (let k = 0; k <= 8; k++) {
          const x = k / 8, H = [1 - 3 * x * x + 2 * x ** 3, L * (x - 2 * x * x + x ** 3), 3 * x * x - 2 * x ** 3, L * (x ** 3 - x * x)];
          const ul = [t1[0] * (1 - x) + t2[0] * x, H[0] * t1[1] + H[1] * r1[2] + H[2] * t2[1] + H[3] * r2[2], H[0] * t1[2] - H[1] * r1[1] + H[2] * t2[2] - H[3] * r2[1]];
          const ug = [0, 1, 2].map((c) => R[0][c] * ul[0] + R[1][c] * ul[1] + R[2][c] * ul[2]);
          const q = P(a[0] + R[0][0] * L * x + s * ug[0], a[1] + R[0][1] * L * x + s * ug[1], a[2] + R[0][2] * L * x + s * ug[2]);
          if (prev) dpos.push(prev.x, prev.y, prev.z, q.x, q.y, q.z);
          prev = q;
        }
      });
    }
    w.deformed.geometry.dispose();
    w.deformed.geometry = new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(dpos, 3));
    // wind: arrows on the windward face (y = 0), pointing +Y, length by force
    while (w.arrows.children.length) { const c = w.arrows.children[0] as THREE.ArrowHelper; w.arrows.remove(c); c.dispose(); }
    const fmax = Math.max(...P2.windForces, 1);
    P2.windForces.forEach((f, k) => {
      const len = 1.5 + 4 * (f / fmax), at = P(b.nx * b.sx / 2, -len * 1000 - 600, ((k + 1) * b.h));
      w.arrows.add(new THREE.ArrowHelper(new THREE.Vector3(0, 0, -1), at, len, 0x172027, 0.6, 0.35));
    });
    w.stage.requestRender();
  };
  useEffect(paint, [p.groups, p.memberUtil, p.disp, p.deformed, p.picked, p.windForces]);   // eslint-disable-line react-hooks/exhaustive-deps

  // picking a member
  useEffect(() => {
    const canvas = canvasRef.current!, ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    let down: { x: number; y: number } | null = null;
    const onDown = (e: PointerEvent) => { down = { x: e.clientX, y: e.clientY }; };
    const onUp = (e: PointerEvent) => {
      const w = world.current;
      if (!w || !down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > (e.pointerType === "mouse" ? 3 : 8)) return;   // a drag orbits
      const r = canvas.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, w.stage.camera);
      const hit = ray.intersectObjects(w.meshes, false)[0];
      props.current.onPick(hit && hit.instanceId !== undefined ? w.owner[w.meshes.indexOf(hit.object as THREE.InstancedMesh)][hit.instanceId] : null);
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointerup", onUp);
    return () => { canvas.removeEventListener("pointerdown", onDown); canvas.removeEventListener("pointerup", onUp); };
  }, []);

  return (
    <div className="relative h-full w-full">
      <canvas ref={canvasRef} role="img" aria-label={p.label} className="block h-full w-full touch-none" />
      <OrbitButtons get={() => world.current} className="absolute right-0 top-0" />
    </div>
  );
};

export default Frame3D;

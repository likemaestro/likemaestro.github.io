import React from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { Stage } from "./stage";

const REDUCED = typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Orbit with the pointer, no damping (so idle means no frames), limited zoom and no view from below the ground. */
export function orbit(stage: Stage, opts: { minDistance: number; maxDistance: number }) {
  const c = new OrbitControls(stage.camera, stage.renderer.domElement);
  c.enableDamping = false;
  c.enablePan = false;
  c.minDistance = opts.minDistance;
  c.maxDistance = opts.maxDistance;
  c.maxPolarAngle = Math.PI * 0.55;
  c.addEventListener("change", stage.requestRender);
  return c;
}

export interface View { position: THREE.Vector3; target: THREE.Vector3 }

/** Buttons for the 3D view: the keyboard path, and an easy reset. */
export const OrbitButtons: React.FC<{ get: () => { stage: Stage; controls: OrbitControls; home: View } | null; className?: string }> = ({ get, className }) => {
  const turn = (deg: number) => {
    const { stage, controls } = get() ?? {};
    if (!stage || !controls) return;
    const off = stage.camera.position.clone().sub(controls.target).applyAxisAngle(new THREE.Vector3(0, 1, 0), (deg * Math.PI) / 180);
    stage.camera.position.copy(controls.target).add(off);
    controls.update();
  };
  const zoom = (f: number) => {
    const { stage, controls } = get() ?? {};
    if (!stage || !controls) return;
    const off = stage.camera.position.clone().sub(controls.target), d = THREE.MathUtils.clamp(off.length() * f, controls.minDistance, controls.maxDistance);
    stage.camera.position.copy(controls.target).add(off.setLength(d));
    controls.update();
  };
  const reset = () => {
    const { stage, controls, home } = get() ?? {};
    if (!stage || !controls || !home) return;
    const p0 = stage.camera.position.clone(), t0 = controls.target.clone();
    const go = (u: number) => {
      const e = 1 - (1 - u) ** 3;   // ease-out
      stage.camera.position.lerpVectors(p0, home.position, e);
      controls.target.lerpVectors(t0, home.target, e);
      controls.update();
    };
    if (REDUCED) go(1); else stage.animate(go, 300);
  };
  const B: React.FC<{ label: string; onClick: () => void; children: React.ReactNode }> = ({ label, onClick, children }) => (
    <button type="button" aria-label={label} title={label} onClick={onClick} className="btn h-9 w-9 bg-canvas px-0">
      <svg viewBox="0 0 16 16" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
    </button>
  );
  return (
    <div role="group" aria-label="3D view" className={`flex gap-1.5 ${className ?? ""}`}>
      <B label="Rotate left" onClick={() => turn(-15)}><path d="M10.5 3.5A5 5 0 1 0 13 8M10.5 3.5V1.2M10.5 3.5H8.2" /></B>
      <B label="Rotate right" onClick={() => turn(15)}><path d="M5.5 3.5A5 5 0 1 1 3 8M5.5 3.5V1.2M5.5 3.5h2.3" /></B>
      <B label="Zoom in" onClick={() => zoom(0.8)}><path d="M8 3v10M3 8h10" /></B>
      <B label="Zoom out" onClick={() => zoom(1.25)}><path d="M3 8h10" /></B>
      <B label="Reset view" onClick={reset}><path d="M2.5 6.5V2.5h4M2.8 2.8 6 6M13.5 9.5v4h-4M13.2 13.2 10 10" /></B>
    </div>
  );
};

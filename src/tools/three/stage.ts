// One way to set up three.js for the tools: render on demand (no loop while idle), pause off screen, clean up fully.
// Three's axes: X along the member, Y up, Z towards the viewer. Units: metres.
import * as THREE from "three";

export interface Stage {
  renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera;
  /** Many calls in one frame make one render. */
  requestRender(): void;
  /** Calls step(u) with u from 0 to 1 over ms of visible time, rendering each frame, then stops. Returns a cancel. */
  animate(step: (u: number) => void, ms: number): () => void;
  dispose(): void;
}

const COARSE = typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(pointer: coarse)").matches;

export function createStage(canvas: HTMLCanvasElement): Stage {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, COARSE ? 1.5 : 1.75));
  renderer.setClearColor(0xf6f7f5, 1);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(35, 1, 0.05, 200);
  let frame = 0, visible = true, frames = 0;
  let anim: { step: (u: number) => void; ms: number; t: number; last: number } | null = null;

  const render = (now: number) => {
    frame = 0;
    if (anim) {
      anim.t += Math.min(100, anim.last ? now - anim.last : 0);   // visible time only; a long gap counts as one frame
      anim.last = now;
      const u = Math.min(1, anim.t / anim.ms);
      anim.step(u);
      if (u >= 1) anim = null;
    }
    renderer.render(scene, camera);
    canvas.dataset.frames = String(++frames);   // read by the browser checks: no frames while idle
    if (anim && visible) frame = requestAnimationFrame(render);
  };
  const requestRender = () => { if (!frame && visible) frame = requestAnimationFrame(render); };

  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    requestRender();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  const setVisible = (v: boolean) => {
    visible = v;
    if (!v && frame) { cancelAnimationFrame(frame); frame = 0; }
    if (v) { if (anim) anim.last = 0; requestRender(); }
  };
  let onScreen = true;
  const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; setVisible(onScreen && !document.hidden); });
  io.observe(canvas);
  const onVis = () => setVisible(onScreen && !document.hidden);
  document.addEventListener("visibilitychange", onVis);
  resize();

  return {
    renderer, scene, camera, requestRender,
    animate(step, ms) {
      anim = { step, ms, t: 0, last: 0 };
      requestRender();
      const mine = anim;
      return () => { if (anim === mine) anim = null; };
    },
    dispose() {
      cancelAnimationFrame(frame);
      ro.disconnect(); io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
        for (const mat of mats) { (mat as THREE.MeshBasicMaterial).map?.dispose(); mat.dispose(); }
      });
      renderer.dispose();
    },
  };
}

/** A hemisphere light and one directional light: a fixed count, so shaders never recompile. No shadows. */
export function addStandardLights(scene: THREE.Scene) {
  scene.add(new THREE.HemisphereLight(0xffffff, 0x819199, 1.0));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(-3, 6, 4);
  scene.add(sun);
}

/** A soft radial disc under the model in place of shadows. */
export function groundDisc(radius: number) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!, grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(129,145,153,0.28)");
  grad.addColorStop(1, "rgba(129,145,153,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(radius, 48), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

/** Camera distance along dir (from target) at which every point fits within the given share of the view. */
export function fitDistance(camera: THREE.PerspectiveCamera, target: THREE.Vector3, dir: THREE.Vector3, points: THREE.Vector3[], share = 0.9) {
  const cam = camera.clone(), p = new THREE.Vector3();
  const fits = (d: number) => {
    cam.position.copy(target).addScaledVector(dir, d);
    cam.lookAt(target);
    cam.updateMatrixWorld();
    return points.every((q) => { p.copy(q).project(cam); return Math.abs(p.x) <= share && Math.abs(p.y) <= share && p.z < 1; });
  };
  let lo = 0.1, hi = 1;
  while (!fits(hi) && hi < 1e4) hi *= 2;
  for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (fits(m)) hi = m; else lo = m; }
  return hi;
}

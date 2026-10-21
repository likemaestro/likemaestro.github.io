// Owns the WebGL renderer and scene for the PhD band. render(t) draws the band at scroll share t.
import { createRenderer, createScene } from "./beam-scene.js";
import { frameAt } from "./laser-sequence.js";

export function mount(canvas, { small = false } = {}) {
  const renderer = createRenderer(canvas, { maxDpr: small ? 1.5 : 2, shadows: !small });
  const s = createScene(renderer, "bay", { shadows: !small });
  let w = 0, h = 0, last = -1;
  const resize = () => {
    w = canvas.clientWidth; h = canvas.clientHeight;
    if (w && h) renderer.setSize(w, h, false);
    last = -1;
  };
  resize();
  return {
    resize,
    render(t) {
      if (!w || !h || t === last) return;
      last = t;
      const f = frameAt(t, w, h);
      s.update(f);
      s.setCamera(f.camera, w / h);
      renderer.render(s.scene, s.camera);
    },
    dispose() { s.dispose(); renderer.dispose(); },
  };
}

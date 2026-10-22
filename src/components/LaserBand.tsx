import React, { useEffect, useRef, useState } from "react";
import { phdParagraph } from "../content/site";

const media = (q: string) => typeof window !== "undefined" && !!window.matchMedia && window.matchMedia(q).matches;
const hasWebGL = () => {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
};
const seg = (t: number, a: number, b: number) => Math.min(1, Math.max(0, (t - a) / (b - a)));
const STILL = { t: 0.66, time: 0.37 };   // mid plasma cope: the frame shown without scroll motion
const TEXT = [0.86, 0.93];               // the paragraph fades in as the finished beam settles into the frame

// Screenshot hook: ?band=<scroll share>&bt=<spark seconds> renders exactly that frame, with no smoothing or loop;
// window.__bandPaint(t, seconds) then renders any other frame (used to record a video frame by frame).
const forced = () => {
  const q = new URLSearchParams(window.location.search), b = q.get("band");
  return b === null ? null : { t: Number(b), time: Number(q.get("bt") ?? 0.3) };
};

interface View { render(t: number, time?: number): void; resize(): void; busy(t: number): boolean; dispose(): void }

// Silent scroll film, "model to metal": the camera dives from a BIM-style steel frame into one beam, which is cut
// (laser bolt holes, plasma end cope) and settles back into the frame; then the PhD paragraph lands.
// The band's height is fixed from the first render, so anchors below it land where they should.
const LaserBand: React.FC = () => {
  const [still] = useState(() => media("(prefers-reduced-motion: reduce)"));
  const [gl, setGl] = useState(true);
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasWebGL()) { setGl(false); return; }
    const section = sectionRef.current!, canvas = canvasRef.current!;
    const fixed = still ? STILL : forced();
    let view: View | null = null, near = false, raf = 0, dead = false, shown = -1, last = 0;
    const t0 = performance.now();

    const goal = () => {
      const r = section.getBoundingClientRect(), span = r.height - window.innerHeight;
      return span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0;
    };
    const paint = (t: number, time: number) => {
      view!.render(t, time);
      if (!still && textRef.current) textRef.current.style.opacity = String(seg(t, TEXT[0], TEXT[1]));
    };
    const tick = () => {
      raf = 0;
      if (!view || !near) return;
      if (fixed) { paint(fixed.t, fixed.time); return; }
      const g = goal(), now = performance.now(), dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      shown = shown < 0 ? g : shown + (g - shown) * (1 - Math.exp(-dt / 0.12));   // eased scroll (time-based), so the camera glides
      if (Math.abs(g - shown) < 2e-4) shown = g;
      paint(shown, (now - t0) / 1000);
      if (shown !== g || view.busy(shown)) raf = requestAnimationFrame(tick);
      else last = 0;
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };
    const fail = () => {
      if (dead) return;
      if (textRef.current) textRef.current.style.opacity = "";
      setGl(false);
    };
    const onResize = () => { view?.resize(); kick(); };
    if (fixed && !still) (window as unknown as { __bandPaint: typeof paint }).__bandPaint = (t, time) => view && paint(t, time);

    const io = new IntersectionObserver(([e]) => {
      near = e.isIntersecting;
      if (near && !view) {
        import("../lab/laser/mount").then(({ mount }) => {
          if (dead) return;
          try {
            view = mount(canvas, { small: !media("(min-width: 1024px)") }) as View;
            kick();
          } catch {
            fail();
          }
        }, fail);
      }
      kick();
    }, { rootMargin: "40% 0px" });
    io.observe(section);
    if (!fixed) window.addEventListener("scroll", kick, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      dead = true;
      io.disconnect();
      window.removeEventListener("scroll", kick);
      window.removeEventListener("resize", onResize);
      if (raf) cancelAnimationFrame(raf);
      view?.dispose();
    };
  }, [still]);

  const scroll = gl && !still;
  const text = (
    <div
      ref={textRef}
      style={scroll ? { opacity: 0 } : undefined}
      className={`relative max-w-[38ch] lg:max-w-[34ch] ${scroll ? "max-lg:-mx-4 max-lg:bg-bay/80 max-lg:px-4 max-lg:py-5" : ""}`}
    >
      <h2 id="phd-h" className="sr-only">Current work</h2>
      <p className="lg:text-[1.25rem] lg:leading-[1.55]">{phdParagraph}</p>
    </div>
  );
  // Scrolling: the paragraph lands over the last shot. Still or no WebGL: it sits above the image instead.
  return (
    <section ref={sectionRef} aria-labelledby="phd-h" className={`relative bg-bay text-[#D5DCDF] ${scroll ? "h-[340vh]" : ""}`}>
      {!scroll && <div className="mx-auto max-w-page px-4 py-16 sm:px-6 md:py-20">{text}</div>}
      {gl && (
        <div className={scroll ? "sticky top-0 h-screen overflow-hidden bg-canvas" : "relative h-[75vh] min-h-[28rem] overflow-hidden"}>
          <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 h-full w-full" />
          {scroll && <div className="absolute inset-0 mx-auto flex max-w-page items-end px-4 pb-10 sm:px-6 lg:items-center lg:pb-0">{text}</div>}
          <p className="t-small absolute bottom-3 right-4 text-[#8C9AA1] sm:right-6">Illustrative render</p>
        </div>
      )}
    </section>
  );
};

export default LaserBand;

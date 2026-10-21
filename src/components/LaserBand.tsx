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
const FINAL_T = 0.9;   // finished part with the exploded offcut: the frame shown without scroll motion

// Silent scroll visual: a laser head cuts bolt holes and an end cut as the band scrolls past.
// The band's height is fixed from the first render, so anchors below it land where they should.
const LaserBand: React.FC = () => {
  const [still] = useState(() => media("(prefers-reduced-motion: reduce)"));
  const [gl, setGl] = useState(true);
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!hasWebGL()) { setGl(false); return; }
    const section = sectionRef.current!, canvas = canvasRef.current!;
    let view: { render(t: number): void; resize(): void; dispose(): void } | null = null;
    let near = false, frame = 0, dead = false;

    const shareAt = () => {
      if (still) return FINAL_T;
      const r = section.getBoundingClientRect(), span = r.height - window.innerHeight;
      return span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0;
    };
    const draw = () => { frame = 0; if (view && near) view.render(Math.round(shareAt() * 2000) / 2000); };
    const queue = () => { if (!frame) frame = requestAnimationFrame(draw); };
    const onResize = () => { view?.resize(); queue(); };

    const io = new IntersectionObserver(([e]) => {
      near = e.isIntersecting;
      if (near && !view) {
        import("../lab/laser/mount").then(({ mount }) => {
          if (dead) return;
          try {
            view = mount(canvas, { small: !media("(min-width: 1024px)") });
            queue();
          } catch {
            setGl(false);
          }
        }, () => !dead && setGl(false));
      }
      queue();
    }, { rootMargin: "40% 0px" });
    io.observe(section);
    if (!still) window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      dead = true;
      io.disconnect();
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", onResize);
      if (frame) cancelAnimationFrame(frame);
      view?.dispose();
    };
  }, [still]);

  const scroll = gl && !still;
  return (
    <section ref={sectionRef} aria-labelledby="phd-h" className={`relative bg-bay text-[#D5DCDF] ${scroll ? "h-[240vh]" : ""}`}>
      <div className={scroll ? "sticky top-0 h-screen" : ""}>
        <div className="mx-auto flex h-full max-w-page flex-col justify-center gap-6 px-4 py-10 sm:px-6 lg:grid lg:grid-cols-12 lg:items-center lg:gap-8 lg:py-16">
          <div className="lg:col-span-4">
            <h2 id="phd-h" className="sr-only">Current work</h2>
            <p className="max-w-[40ch] lg:text-[1.25rem] lg:leading-[1.55]">{phdParagraph}</p>
          </div>
          {gl && (
            <figure className={`relative min-w-0 lg:col-span-8 lg:h-[72vh] lg:flex-none ${scroll ? "min-h-[12rem] flex-1" : "h-[52vh]"}`}>
              <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 h-full w-full [mask-image:radial-gradient(ellipse_closest-side,#000_62%,transparent)]" />
              <figcaption className="t-small absolute bottom-0 right-0 text-[#8C9AA1]">Illustrative render</figcaption>
            </figure>
          )}
        </div>
      </div>
    </section>
  );
};

export default LaserBand;

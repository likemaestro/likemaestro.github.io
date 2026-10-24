import React, { useEffect, useMemo, useRef, useState } from "react";
import { Field } from "../../tools/controls";
import { draws, linspace, mulberry32, normals, posterior, sampleAt, se, type Data } from "./gp";

// The article's three figures: two correlated values, prior draws for a length scale, and the posterior given points
// the reader can add. Site colours: ink for the answer, steel for draws, a light band for uncertainty, and orange only
// for the one active mark (the best guess, the widest point of the band).
const INK = "#172027", INK2 = "#4F5D68", STEEL = "#819199", RULE = "#CBD2D5", LASER = "#F05A24", CANVAS = "#F6F7F5";
const Z95 = 1.96;

/** Width of an element in CSS pixels, so the plots draw at their real size and text stays the page's size. */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

const fmt = (v: number, d = 2) => (v < -0.5 * 10 ** -d ? "−" : "") + Math.abs(v).toFixed(d);
const path = (xs: number[], ys: number[]) => xs.map((x, i) => `${i ? "L" : "M"}${x.toFixed(1)} ${ys[i].toFixed(1)}`).join("");
const pdf = (y: number, mu: number, sd: number) => Math.exp(-0.5 * ((y - mu) / sd) ** 2) / sd;

const Slider: React.FC<{ id: string; label: string; value: number; min: number; max: number; step: number; text: string; onChange: (v: number) => void }> =
  ({ id, label, value, min, max, step, text, onChange }) => (
    <Field label={label} value={text} htmlFor={id}>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-ink" />
    </Field>
  );

const Check: React.FC<{ label: string; checked: boolean; onChange: (v: boolean) => void }> = ({ label, checked, onChange }) => (
  <label className="t-small flex cursor-pointer items-center gap-2 text-ink-2 [@media(pointer:coarse)]:min-h-[44px]">
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-ink" />
    {label}
  </label>
);

const Caption: React.FC<{ n: number; children?: React.ReactNode }> = ({ n, children }) => (
  <figcaption className="t-small mt-4 text-ink-2"><span className="font-[600] text-ink">Figure {n}.</span> {children}</figcaption>
);

/** Axes with a few ticks, drawn in the plot's own pixel space. */
const Axes: React.FC<{ W: number; H: number; M: { l: number; r: number; t: number; b: number }; sx: (v: number) => number; sy: (v: number) => number;
  xt: number[]; yt: number[]; xl: string; yl: string }> = ({ W, H, M, sx, sy, xt, yt, xl, yl }) => (
  <>
    <g stroke={RULE}>
      <line x1={M.l} x2={W - M.r} y1={H - M.b} y2={H - M.b} />
      <line x1={M.l} x2={M.l} y1={M.t} y2={H - M.b} />
      {yt.includes(0) && <line x1={M.l} x2={W - M.r} y1={sy(0)} y2={sy(0)} strokeDasharray="2 3" />}
    </g>
    <g fill={INK2} fontSize="12" style={{ fontVariantNumeric: "tabular-nums" }}>
      {xt.map((v) => <text key={v} x={sx(v)} y={H - M.b + 16} textAnchor="middle">{fmt(v, 0)}</text>)}
      {yt.map((v) => <text key={v} x={M.l - 7} y={sy(v) + 4} textAnchor="end">{fmt(v, 0)}</text>)}
      <text x={(M.l + W - M.r) / 2} y={H - 4} textAnchor="middle">{xl}</text>
      <text x={12} y={(M.t + H - M.b) / 2} textAnchor="middle" transform={`rotate(-90 12 ${(M.t + H - M.b) / 2})`}>{yl}</text>
    </g>
  </>
);

// ---------------------------------------------------------------------------------------------------------------------
// Figure 1: two values that move together. Observing one moves the best guess for the other and narrows its spread.

const PAIR_Z = (() => { const r = mulberry32(11); return Array.from({ length: 260 }, () => normals(2, r)); })();

export const PairFigure: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [rho, setRho] = useState(0.8), [a, setA] = useState(1.5);
  const [ref, w] = useWidth<HTMLDivElement>();
  const mu = rho * a, sd = Math.sqrt(1 - rho * rho);
  const side = Math.max(0, Math.min(w, 400)), W = side, H = side * 0.86;
  const M = { l: 40, r: Math.round(W * 0.27), t: 10, b: 36 }, R = 3.2;
  const sx = (v: number) => M.l + ((v + R) / (2 * R)) * (W - M.l - M.r), sy = (v: number) => H - M.b - ((v + R) / (2 * R)) * (H - M.t - M.b);
  // beliefs about B, drawn sideways in the strip at the right: before (dashed) and after observing A
  const ys = linspace(-R, R, 121), x0 = W - M.r + 10, xw = M.r - 16;
  // one scale for both curves, so the narrower belief is also the taller one; above ρ ≈ 0.95 it runs off the strip
  const curve = (m: number, s: number) => path(ys.map((y) => x0 + pdf(y, m, s) * 0.32 * xw), ys.map(sy));
  const label = `Scatter of pairs of values at A and B with correlation ${fmt(rho)}. Observed value at A: ${fmt(a, 1)}. Best guess for B: ${fmt(mu)}, spread ${fmt(sd)} instead of 1.`;

  return (
    <figure className="!mt-8 border-y border-rule py-6">
      <div className="grid gap-x-8 gap-y-6 md:grid-cols-[minmax(0,25rem)_minmax(0,1fr)]">
        <div ref={ref} className="min-w-0">
          {W > 0 && (
            <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={label} className="block max-w-full">
              <Axes W={W - M.r + 4} H={H} M={{ ...M, r: 4 }} sx={sx} sy={sy} xt={[-2, 0, 2]} yt={[-2, 0, 2]} xl="Value at A" yl="Value at B" />
              <g fill={STEEL} fillOpacity="0.5">
                {PAIR_Z.map(([z1, z2], i) => {
                  const zb = rho * z1 + sd * z2;
                  return Math.abs(z1) < R && Math.abs(zb) < R && <circle key={i} cx={sx(z1)} cy={sy(zb)} r="1.7" />;
                })}
              </g>
              <line x1={sx(a)} x2={sx(a)} y1={M.t} y2={H - M.b} stroke={INK} strokeDasharray="3 3" />
              <line x1={sx(a)} x2={sx(a)} y1={sy(Math.min(R, mu + Z95 * sd))} y2={sy(Math.max(-R, mu - Z95 * sd))} stroke={INK} strokeWidth="3" />
              <circle cx={sx(a)} cy={sy(mu)} r="5" fill={LASER} stroke={INK} strokeWidth="1.2" />
              <line x1={x0} x2={x0} y1={M.t} y2={H - M.b} stroke={RULE} />
              <clipPath id="pair-strip"><rect x={x0} y={0} width={M.r} height={H} /></clipPath>
              <g clipPath="url(#pair-strip)">
                <path d={curve(0, 1)} fill="none" stroke={STEEL} strokeDasharray="3 3" strokeWidth="1.3" />
                <path d={curve(mu, sd)} fill="none" stroke={INK} strokeWidth="1.6" />
              </g>
              <g fill={INK2} fontSize="12"><text x={x0 + 4} y={H - 4}>B: before, after</text></g>
            </svg>
          )}
        </div>
        <div className="min-w-0 space-y-5">
          <Slider id="pair-rho" label="Correlation between A and B, ρ" value={rho} min={0} max={0.99} step={0.01} text={fmt(rho)} onChange={setRho} />
          <Slider id="pair-a" label="Measured value at A" value={a} min={-2.5} max={2.5} step={0.1} text={fmt(a, 1)} onChange={setA} />
          <dl className="t-data grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-t border-rule pt-4" aria-live="polite">
            <dt className="text-ink-2">Best guess for B</dt><dd>ρ × a = {fmt(rho)} × {fmt(a, 1)} = {fmt(mu)}</dd>
            <dt className="text-ink-2">Spread of B</dt><dd>√(1 − ρ²) = {fmt(sd)}, was 1</dd>
            <dt className="text-ink-2">95% range for B</dt><dd>{fmt(mu - Z95 * sd)} to {fmt(mu + Z95 * sd)}</dd>
          </dl>
        </div>
      </div>
      <Caption n={1}>{children}</Caption>
    </figure>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
// Figure 2: draws from the prior. One rule (correlation falls with distance at the rate the length scale sets) is
// enough to turn a list of bell curves into random smooth functions.

const GRID = linspace(0, 10, 121);
const zs = (seed: number, k: number) => { const r = mulberry32(seed); return Array.from({ length: k }, () => normals(GRID.length, r)); };

export const PriorFigure: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [ell, setEll] = useState(1), [seed, setSeed] = useState(5);
  const [ref, w] = useWidth<HTMLDivElement>();
  const z = useMemo(() => zs(seed, 4), [seed]);
  const F = useMemo(() => draws(posterior({ x: [], y: [] }, GRID, ell), z), [ell, z]);
  const W = w, H = Math.round(Math.min(320, Math.max(220, W * 0.42))), M = { l: 36, r: 8, t: 10, b: 36 }, R = 3.2;
  const sx = (v: number) => M.l + (v / 10) * (W - M.l - M.r), sy = (v: number) => H - M.b - ((v + R) / (2 * R)) * (H - M.t - M.b);
  // the kernel itself: correlation against distance, with the length scale marked
  const iW = 200, iH = 120, iM = { l: 36, r: 8, t: 10, b: 36 }, D = 4;
  const ix = (d: number) => iM.l + (d / D) * (iW - iM.l - iM.r), iy = (c: number) => iH - iM.b - c * (iH - iM.t - iM.b);
  const ds = linspace(0, D, 81);

  return (
    <figure className="!mt-8 border-y border-rule py-6">
      <div className="grid gap-x-8 gap-y-6 md:grid-cols-[minmax(0,1fr)_12.5rem]">
        <div ref={ref} className="min-w-0">
          {W > 0 && (
            <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" className="block max-w-full"
              aria-label={`Four random functions drawn from a Gaussian process with length scale ${fmt(ell)}, inside the band that holds 95% of draws at every input.`}>
              <rect x={M.l} y={sy(Z95)} width={W - M.l - M.r} height={sy(-Z95) - sy(Z95)} fill={RULE} fillOpacity="0.45" />
              <Axes W={W} H={H} M={M} sx={sx} sy={sy} xt={[0, 2, 4, 6, 8, 10]} yt={[-2, 0, 2]} xl="Input, x" yl="Output, f(x)" />
              {F.map((f, k) => <path key={k} d={path(GRID.map(sx), f.map(sy))} fill="none" stroke={k ? STEEL : INK} strokeWidth={k ? 1.2 : 1.8} strokeLinejoin="round" />)}
            </svg>
          )}
        </div>
        <div className="min-w-0 space-y-5">
          <Slider id="prior-ell" label="Length scale, ℓ" value={ell} min={0.2} max={3} step={0.05} text={fmt(ell)} onChange={setEll} />
          <button type="button" className="btn" onClick={() => setSeed((s) => s + 1)}>New draws</button>
          <div>
            <p className="t-small text-ink-2">The rule behind the draws: correlation against distance</p>
            <svg viewBox={`0 0 ${iW} ${iH}`} className="mt-1 block w-full max-w-[12.5rem]" role="img"
              aria-label={`Correlation falls from 1 at distance 0; at distance ℓ = ${fmt(ell)} it is 0.61.`}>
              <Axes W={iW} H={iH} M={iM} sx={ix} sy={iy} xt={[0, 2, 4]} yt={[0, 1]} xl="Distance" yl="Corr." />
              <path d={path(ds.map(ix), ds.map((d) => iy(se(0, d, ell))))} fill="none" stroke={INK} strokeWidth="1.6" />
              {ell <= D && <circle cx={ix(ell)} cy={iy(Math.exp(-0.5))} r="3.5" fill={LASER} stroke={INK} />}
            </svg>
          </div>
        </div>
      </div>
      <Caption n={2}>{children}</Caption>
    </figure>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
// Figure 3: the posterior. The reader first guesses where the curve is least certain, then sees it, then adds points.

const TRUE_ELL = 1.2, START_X = [1, 2.4, 3.1, 6.2, 7.3];
const truthOf = (seed: number) => draws(posterior({ x: [], y: [] }, GRID, TRUE_ELL), zs(1000 + seed, 1))[0];
/** Observations of the hidden function f at xs, each with its own measurement noise of size σn. */
const obsFrom = (f: number[], xs: number[], noise = 0, rnd?: () => number): Data =>
  ({ x: xs.slice(), y: xs.map((x) => sampleAt(GRID, f, x) + (noise && rnd ? noise * normals(1, rnd)[0] : 0)) });

export const PosteriorFigure: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [revealed, setRevealed] = useState(false);
  const [ell, setEll] = useState(TRUE_ELL), [noise, setNoise] = useState(0);
  const [showDraws, setShowDraws] = useState(true), [showTruth, setShowTruth] = useState(false);
  const [truthSeed, setTruthSeed] = useState(0);
  const truth = useMemo(() => truthOf(truthSeed), [truthSeed]);
  const [data, setData] = useState<Data>(() => obsFrom(truthOf(0), START_X));
  const noiseRng = useRef(mulberry32(99));
  const z = useMemo(() => zs(21, 3), []);
  const post = useMemo(() => posterior(data, GRID, ell, noise), [data, ell, noise]);
  const F = useMemo(() => (showDraws && revealed ? draws(post, z) : []), [post, z, showDraws, revealed]);
  const widest = post.sd.reduce((best, s, i) => (s > post.sd[best] + 1e-9 ? i : best), 0);

  const [ref, w] = useWidth<HTMLDivElement>();
  const W = w, H = Math.round(Math.min(360, Math.max(240, W * 0.48))), M = { l: 36, r: 8, t: 10, b: 36 }, R = 3.2;
  const sx = (v: number) => M.l + (v / 10) * (W - M.l - M.r), sy = (v: number) => H - M.b - ((v + R) / (2 * R)) * (H - M.t - M.b);
  const band = `${path(GRID.map(sx), post.mean.map((m, i) => sy(m + Z95 * post.sd[i])))}L${[...GRID].reverse().map((g, j) => {
    const i = GRID.length - 1 - j;
    return `${sx(g).toFixed(1)} ${sy(post.mean[i] - Z95 * post.sd[i]).toFixed(1)}`;
  }).join("L")}Z`;

  const add = (p: Data) => setData((d) => ({ x: [...d.x, ...p.x], y: [...d.y, ...p.y] }));
  const onPointer = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!revealed) return;
    const r = e.currentTarget.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
    const hit = data.x.findIndex((x, i) => (sx(x) - px) ** 2 + (sy(data.y[i]) - py) ** 2 < 14 * 14);
    if (hit >= 0) { setData((d) => ({ x: d.x.filter((_, i) => i !== hit), y: d.y.filter((_, i) => i !== hit) })); return; }
    const x = ((px - M.l) / (W - M.l - M.r)) * 10, y = ((H - M.b - py) / (H - M.t - M.b)) * 2 * R - R;
    if (x >= 0 && x <= 10 && Math.abs(y) <= R) add({ x: [x], y: [y] });
  };
  const label = revealed
    ? `Gaussian process fitted to ${data.x.length} observations, length scale ${fmt(ell)}, noise ${fmt(noise)}. The 95% band is widest at x = ${fmt(GRID[widest], 1)}, plus or minus ${fmt(Z95 * post.sd[widest])}.`
    : `${data.x.length} observations at x = ${data.x.map((x) => fmt(x, 1)).join(", ")}. The model is hidden until you reveal it.`;

  return (
    <figure className="!mt-8 border-y border-rule py-6">
      <div ref={ref} className="min-w-0">
        {W > 0 && (
          <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={label} onPointerDown={onPointer}
            className={`block max-w-full touch-manipulation ${revealed ? "cursor-crosshair" : ""}`}>
            {revealed && <path d={band} fill={RULE} fillOpacity="0.55" />}
            <Axes W={W} H={H} M={M} sx={sx} sy={sy} xt={[0, 2, 4, 6, 8, 10]} yt={[-2, 0, 2]} xl="Input, x" yl="Output, f(x)" />
            {revealed && showTruth && <path d={path(GRID.map(sx), truth.map(sy))} fill="none" stroke={INK2} strokeWidth="1.3" strokeDasharray="5 4" />}
            {F.map((f, k) => <path key={k} d={path(GRID.map(sx), f.map(sy))} fill="none" stroke={STEEL} strokeWidth="1.1" strokeLinejoin="round" />)}
            {revealed && <path d={path(GRID.map(sx), post.mean.map(sy))} fill="none" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />}
            {revealed && (
              <g>
                <line x1={sx(GRID[widest])} x2={sx(GRID[widest])} y1={sy(post.mean[widest] + Z95 * post.sd[widest])} y2={sy(post.mean[widest] - Z95 * post.sd[widest])} stroke={LASER} strokeWidth="2.5" />
                <text x={sx(GRID[widest]) + (GRID[widest] > 8 ? -6 : 6)} y={sy(post.mean[widest] + Z95 * post.sd[widest]) - 6} fontSize="12" fill={INK2} textAnchor={GRID[widest] > 8 ? "end" : "start"}>widest</text>
              </g>
            )}
            <g fill={INK} stroke={CANVAS} strokeWidth="1.5">
              {data.x.map((x, i) => <circle key={`${x}-${i}`} cx={sx(x)} cy={sy(data.y[i])} r="5" />)}
            </g>
            {!revealed && <text x={(M.l + W - M.r) / 2} y={M.t + 18} textAnchor="middle" fontSize="13" fill={INK2}>Where would you be least sure of the curve?</text>}
          </svg>
        )}
      </div>

      {revealed && (
        <p className="t-small mt-2 flex flex-wrap gap-x-5 gap-y-1 text-ink-2" aria-hidden="true">
          <span><span className="mr-1.5 inline-block h-0.5 w-5 bg-ink align-middle" />mean, the best guess</span>
          <span><span className="mr-1.5 inline-block h-2.5 w-5 bg-rule align-middle" />95% band</span>
          {showDraws && <span><span className="mr-1.5 inline-block h-px w-5 bg-steel align-middle" />curves drawn from the posterior</span>}
          {showTruth && <span><span className="mr-1.5 inline-block w-5 border-t border-dashed border-ink-2 align-middle" />hidden function</span>}
        </p>
      )}

      {!revealed ? (
        <div className="mt-4"><button type="button" className="btn btn-solid" onClick={() => setRevealed(true)}>Show the Gaussian process</button></div>
      ) : (
        <div className="mt-5 grid gap-x-8 gap-y-5 md:grid-cols-2">
          <div className="min-w-0 space-y-5">
            <Slider id="post-ell" label="Length scale, ℓ" value={ell} min={0.3} max={3} step={0.05} text={fmt(ell)} onChange={setEll} />
            <Slider id="post-noise" label="Measurement noise, σn" value={noise} min={0} max={0.6} step={0.02} text={fmt(noise)} onChange={setNoise} />
            <div className="flex flex-wrap gap-x-6">
              <Check label="Curves drawn from the posterior" checked={showDraws} onChange={setShowDraws} />
              <Check label="Hidden function" checked={showTruth} onChange={setShowTruth} />
            </div>
          </div>
          <div className="min-w-0 space-y-3">
            <p className="t-small text-ink-2">Tap the plot to add a point; tap a point to remove it.</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-solid" onClick={() => add(obsFrom(truth, [GRID[widest]], noise, noiseRng.current))}>Measure where the band is widest</button>
              <button type="button" className="btn" onClick={() => { const s = truthSeed + 1; setTruthSeed(s); setData((d) => obsFrom(truthOf(s), d.x, noise, noiseRng.current)); }}>New values, same places</button>
              <button type="button" className="btn" disabled={!data.x.length} onClick={() => setData((d) => ({ x: d.x.slice(0, -1), y: d.y.slice(0, -1) }))}>Remove the last point</button>
              <button type="button" className="btn" onClick={() => { setTruthSeed(0); setData(obsFrom(truthOf(0), START_X)); setEll(TRUE_ELL); setNoise(0); }}>Start again</button>
            </div>
            <p className="t-data text-ink-2" aria-live="polite">
              {data.x.length} {data.x.length === 1 ? "point" : "points"}. Band widest at x = {fmt(GRID[widest], 1)}: ±{fmt(Z95 * post.sd[widest])}.
            </p>
          </div>
        </div>
      )}
      <Caption n={3}>{children}</Caption>
    </figure>
  );
};

import { area, contour, panelField } from "./contour";
import { loopsToDXF, loopsToSVG } from "./export";
import { connected, greyFraction } from "./geometry";

// A cell of side n, solid except a centred square hole of side h.
const holed = (n: number, h: number) => {
  const r = new Float32Array(n * n).fill(1), a = (n - h) / 2;
  for (let y = a; y < a + h; y++) for (let x = a; x < a + h; x++) r[y * n + x] = 0;
  return r;
};

test("a holed cell in a frame gives one outline and one hole per tile, all closed", () => {
  const { f, W, H } = panelField(holed(12, 4), 12, 3, 2, 2);
  const loops = contour(f, W, H);
  expect(loops).toHaveLength(1 + 3 * 2);
  const areas = loops.map(area).map(Math.abs).sort((a, b) => b - a);
  // The outline encloses the whole panel (40 × 28 elements), give or take the smoothing at the corners.
  expect(areas[0]).toBeGreaterThan(40 * 28 * 0.97);
  expect(areas[0]).toBeLessThan(40 * 28 * 1.01);
  // Each hole is close to 4 × 4.
  for (const a of areas.slice(1)) { expect(a).toBeGreaterThan(9); expect(a).toBeLessThan(20); }
});

test("saddles do not break loops: a checkerboard of solid squares", () => {
  const n = 8, r = new Float32Array(n * n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) r[y * n + x] = (x >> 2) === (y >> 2) ? 1 : 0;
  const { f, W, H } = panelField(r, n, 2, 2, 0);
  const loops = contour(f, W, H);
  for (const l of loops) expect(l.length).toBeGreaterThan(3);
  expect(loops.reduce((s, l) => s + area(l), 0)).not.toBeNaN();
});

test("SVG and DXF carry one path segment or polyline per loop, in millimetres", () => {
  const { f, W, H } = panelField(holed(12, 4), 12, 2, 1, 1);
  const loops = contour(f, W, H), s = 2.5;
  const dxf = loopsToDXF(loops, s);
  expect(dxf.match(/\nPOLYLINE\n/g)).toHaveLength(loops.length);
  expect(dxf.trim().endsWith("EOF")).toBe(true);
  const svg = loopsToSVG(loops, W, H, s);
  expect(svg).toContain(`width="${(W - 2) * s}mm"`);
  expect(svg.match(/Z/g)).toHaveLength(loops.length);
});

test("connectivity and grey fraction", () => {
  const n = 10, bar = new Float32Array(n * n);
  for (let x = 0; x < n; x++) bar[4 * n + x] = 1;   // a bar across the cell joins itself through the periodic edge
  expect(connected(bar, n)).toBe(true);
  bar[8 * n + 3] = 1;                                // a separate island
  expect(connected(bar, n)).toBe(false);
  expect(greyFraction(Float32Array.from([0, 0.5, 1, 0.05]))).toBeCloseTo(0.25);
  expect(greyFraction(Uint8Array.from([0, 128, 255, 10]))).toBeCloseTo(0.25);
});

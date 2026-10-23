// Draw a density field tiled cols × rows onto a canvas, sized to the canvas' CSS width at the device pixel ratio.

// density 0 → canvas, 0.5 → steel, 1 → ink
const STOPS = [[0xf6, 0xf7, 0xf5], [0x81, 0x91, 0x99], [0x17, 0x20, 0x27]];
const LUT = new Uint8ClampedArray(256 * 4);
for (let i = 0; i < 256; i++) {
  const t = i / 255, s = t < 0.5 ? 0 : 1, u = t < 0.5 ? t * 2 : t * 2 - 1;
  for (let c = 0; c < 3; c++) LUT[i * 4 + c] = STOPS[s][c] + (STOPS[s + 1][c] - STOPS[s][c]) * u;
  LUT[i * 4 + 3] = 255;
}

/** src: n × n densities, row 0 at the bottom; Uint8Array in 0..255 or Float32Array in 0..1. mark: outline one tile. */
export function drawLattice(cv: HTMLCanvasElement, src: Uint8Array | Float32Array, cols: number, rows: number, mark?: [number, number], widthPx?: number) {
  const dpr = window.devicePixelRatio || 1;
  const px = widthPx ?? Math.round((cv.clientWidth || 300) * dpr), t = px / cols, py = Math.round(t * rows);
  if (cv.width !== px || cv.height !== py) { cv.width = px; cv.height = py; }
  const g = cv.getContext("2d");
  if (!g) return;
  const isFloat = src instanceof Float32Array, n = Math.round(Math.sqrt(src.length));
  // The whole lattice as one image at one pixel per element (no seams between tiles), blown up with hard edges to
  // the next whole multiple of the screen size, then scaled down smoothly: element edges blend over at most one
  // device pixel, so they stay crisp and evenly wide at any screen density.
  const W = n * cols, img = new ImageData(W, n * rows);
  for (let ey = 0; ey < n; ey++)
    for (let ex = 0; ex < n; ex++) {
      const v = src[ey * n + ex], k = isFloat ? Math.round(Math.min(1, Math.max(0, v)) * 255) : v, c = LUT.subarray(k * 4, k * 4 + 4);
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) img.data.set(c, ((j * n + n - 1 - ey) * W + i * n + ex) * 4);   // row 0 is the bottom edge
    }
  const lattice = document.createElement("canvas"), big = document.createElement("canvas"), k = Math.ceil(px / W);
  lattice.width = W; lattice.height = n * rows;
  lattice.getContext("2d")!.putImageData(img, 0, 0);
  big.width = W * k; big.height = n * rows * k;
  const b = big.getContext("2d")!;
  b.imageSmoothingEnabled = false;
  b.drawImage(lattice, 0, 0, big.width, big.height);
  g.imageSmoothingEnabled = true;
  g.drawImage(big, 0, 0, px, py);
  if (!mark) return;
  const at = (k: number) => Math.round(k * t), [mx, my] = mark;
  g.strokeStyle = "#F05A24";
  g.lineWidth = 1.5 * dpr;
  const h = g.lineWidth / 2;
  g.strokeRect(at(mx) + h, at(my) + h, at(mx + 1) - at(mx) - 2 * h, at(my + 1) - at(my) - 2 * h);
}

export const decode = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

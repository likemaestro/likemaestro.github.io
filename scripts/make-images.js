// Writes the share image (public/og.png, 1200 × 630) and the icons (favicon.ico, logo192.png, logo512.png) from the
// precomputed auxetic cell, in the site's colours. Plain Node: a small PNG encoder, no image libraries.
// Usage: node scripts/make-images.js
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const root = path.resolve(__dirname, "..");
const src = fs.readFileSync(path.join(root, "src/lab/precomputed.ts"), "utf8");
const cells = JSON.parse(src.match(/^export const cells = (.*?)(?: as const)?;$/m)[1]);
const rho = Buffer.from(cells.auxetic.rho, "base64"), n = Math.round(Math.sqrt(rho.length));

// density 0 → canvas, 0.5 → steel, 1 → ink (as src/lab/lattice.ts)
const STOPS = [[0xf6, 0xf7, 0xf5], [0x81, 0x91, 0x99], [0x17, 0x20, 0x27]];
const colour = (t) => { const s = t < 0.5 ? 0 : 1, u = t < 0.5 ? t * 2 : t * 2 - 1; return STOPS[s].map((c, k) => c + (STOPS[s + 1][k] - c) * u); };
// Periodic bilinear density at (x, y) in cell units, y up; element centres at (i + 0.5) / n.
const at = (i, j) => rho[(((j % n) + n) % n) * n + (((i % n) + n) % n)] / 255;
const density = (x, y) => {
  const u = x * n - 0.5, v = y * n - 0.5, i = Math.floor(u), j = Math.floor(v), a = u - i, b = v - j;
  return (1 - a) * (1 - b) * at(i, j) + a * (1 - b) * at(i + 1, j) + (1 - a) * b * at(i, j + 1) + a * b * at(i + 1, j + 1);
};

/** RGB image W × H of the lattice, `cell` pixels per cell, the origin of a cell at (ox, oy); 4 × 4 supersampling. */
function lattice(W, H, cell, ox, oy) {
  const px = Buffer.alloc(W * H * 3), S = 4;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const acc = [0, 0, 0];
      for (let sy = 0; sy < S; sy++)
        for (let sx = 0; sx < S; sx++) {
          const cx = (x + (sx + 0.5) / S - ox) / cell, cy = (H - y - (sy + 0.5) / S - oy) / cell;
          const c = colour(Math.min(1, Math.max(0, (density(cx, cy) - 0.5) * 3 + 0.5)));   // sharpen the 0.5 edge
          for (let k = 0; k < 3; k++) acc[k] += c[k];
        }
      for (let k = 0; k < 3; k++) px[(y * W + x) * 3 + k] = Math.round(acc[k] / (S * S));
    }
  return px;
}

const CRC = new Int32Array(256).map((_, k) => { let c = k; for (let i = 0; i < 8; i++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc = (buf) => { let c = -1; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (type, data) => {
  const len = Buffer.alloc(4), t = Buffer.from(type), sum = Buffer.alloc(4);
  len.writeUInt32BE(data.length); sum.writeUInt32BE(crc(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, sum]);
};
function png(W, H, rgb) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 2;
  const raw = Buffer.alloc((W * 3 + 1) * H);
  for (let y = 0; y < H; y++) rgb.copy(raw, y * (W * 3 + 1) + 1, y * W * 3, (y + 1) * W * 3);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}
function outline(rgb, W, x0, y0, size, w, c) {
  for (let y = y0; y < y0 + size; y++)
    for (let x = x0; x < x0 + size; x++)
      if (x < x0 + w || x >= x0 + size - w || y < y0 + w || y >= y0 + size - w) for (let k = 0; k < 3; k++) rgb[(y * W + x) * 3 + k] = c[k];
}

// Share image: the lattice full-bleed, one cell outlined in laser orange at the centre (as on the home page).
const W = 1200, H = 630, cell = 150, x0 = (W - cell) / 2, y0 = (H - cell) / 2;
const og = lattice(W, H, cell, x0, H - y0 - cell);
outline(og, W, x0, y0, cell, 3, [0xf0, 0x5a, 0x24]);
fs.writeFileSync(path.join(root, "public/og.png"), png(W, H, og));

// Icons: one cell, 2 × 2 tiled so the pattern reads at small sizes.
const icon = (s) => png(s, s, lattice(s, s, s / 2, 0, 0));
fs.writeFileSync(path.join(root, "public/logo192.png"), icon(192));
fs.writeFileSync(path.join(root, "public/logo512.png"), icon(512));
const sizes = [16, 32, 48], pngs = sizes.map(icon);
const head = Buffer.alloc(6 + 16 * sizes.length);
head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(sizes.length, 4);
let offset = head.length;
sizes.forEach((s, k) => {
  const e = 6 + 16 * k;
  head[e] = s; head[e + 1] = s; head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6);
  head.writeUInt32LE(pngs[k].length, e + 8); head.writeUInt32LE(offset, e + 12);
  offset += pngs[k].length;
});
fs.writeFileSync(path.join(root, "public/favicon.ico"), Buffer.concat([head, ...pngs]));
console.log("wrote public/og.png, logo192.png, logo512.png, favicon.ico");

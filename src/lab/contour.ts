// Contours of a density field for cutting files: marching squares at one level, joined into closed loops.
// The field is W × H values at element centres, row 0 at the bottom; points are in element units from the field's
// lower-left corner. Callers pad the field with values below the level, so every loop closes.

export type Loop = [number, number][];

// Segments per marching-squares case, as pairs of square edges: 0 bottom, 1 right, 2 top, 3 left.
// Corner bits: 1 lower-left, 2 lower-right, 4 upper-right, 8 upper-left. Saddles (5, 10) are resolved below.
const CASES: number[][] = [[], [3, 0], [0, 1], [3, 1], [1, 2], [], [0, 2], [3, 2], [3, 2], [0, 2], [], [1, 2], [3, 1], [0, 1], [3, 0], []];

export function contour(f: ArrayLike<number>, W: number, H: number, level = 0.5): Loop[] {
  const at = (i: number, j: number) => f[j * W + i];
  // Each crossing lives on a grid edge: horizontal edge (i, j)–(i+1, j) has key 2(jW + i), vertical (i, j)–(i, j+1) key 2(jW + i) + 1.
  const point = new Map<number, [number, number]>();
  const links = new Map<number, number[]>();
  const cross = (key: number): [number, number] => {
    let p = point.get(key);
    if (p) return p;
    const cell = key >> 1, i = cell % W, j = (cell - i) / W;
    if (key & 1) { const a = at(i, j), b = at(i, j + 1); p = [i + 0.5, j + 0.5 + (level - a) / (b - a)]; }
    else { const a = at(i, j), b = at(i + 1, j); p = [i + 0.5 + (level - a) / (b - a), j + 0.5]; }
    point.set(key, p);
    return p;
  };
  const link = (u: number, v: number) => {
    cross(u); cross(v);
    (links.get(u) ?? links.set(u, []).get(u)!).push(v);
    (links.get(v) ?? links.set(v, []).get(v)!).push(u);
  };
  for (let j = 0; j + 1 < H; j++)
    for (let i = 0; i + 1 < W; i++) {
      const a = at(i, j), b = at(i + 1, j), c = at(i + 1, j + 1), d = at(i, j + 1);
      const k = (a > level ? 1 : 0) | (b > level ? 2 : 0) | (c > level ? 4 : 0) | (d > level ? 8 : 0);
      if (k === 0 || k === 15) continue;
      const edge = [2 * (j * W + i), 2 * (j * W + i + 1) + 1, 2 * ((j + 1) * W + i), 2 * (j * W + i) + 1];   // bottom, right, top, left
      let segs = CASES[k];
      if (k === 5 || k === 10) {
        const centreIn = (a + b + c + d) / 4 > level;
        // Inside corners joined through the centre: cut off the outside corners, otherwise the inside ones.
        segs = (k === 5) === centreIn ? [0, 1, 3, 2] : [3, 0, 1, 2];
      }
      for (let s = 0; s < segs.length; s += 2) link(edge[segs[s]], edge[segs[s + 1]]);
    }
  // Walk the links into loops; every crossing has exactly two neighbours when the field is padded.
  const loops: Loop[] = [], done = new Set<number>();
  links.forEach((_, startKey) => {
    if (done.has(startKey)) return;
    const loop: Loop = [];
    let prev = -1, cur = startKey;
    while (!done.has(cur)) {
      done.add(cur);
      loop.push(point.get(cur)!);
      let next = -1;
      for (const v of links.get(cur)!) if (v !== prev && !done.has(v)) { next = v; break; }
      if (next < 0) break;
      prev = cur; cur = next;
    }
    if (loop.length > 2) loops.push(loop);
  });
  return loops;
}

/** Signed area (positive counter-clockwise). */
export const area = (l: Loop) => l.reduce((s, [x, y], k) => { const [u, v] = l[(k + 1) % l.length]; return s + x * v - u * y; }, 0) / 2;

/** A panel for cutting: the cell (n × n densities, 0..1 or 0..255) tiled nx × ny inside a solid frame `frame` elements
 *  wide, lightly smoothed, padded with one empty element all round. */
export function panelField(rho: ArrayLike<number>, n: number, nx: number, ny: number, frame: number) {
  const scale = rho instanceof Uint8Array ? 1 / 255 : 1;
  const W = nx * n + 2 * frame + 2, H = ny * n + 2 * frame + 2, raw = new Float32Array(W * H);
  for (let j = 1; j < H - 1; j++)
    for (let i = 1; i < W - 1; i++) {
      const x = i - 1 - frame, y = j - 1 - frame;
      raw[j * W + i] = x < 0 || y < 0 || x >= nx * n || y >= ny * n ? 1 : rho[(y % n) * n + (x % n)] * scale;
    }
  // One pass of a 3 × 3 binomial filter so the contours follow the shape, not the element staircase.
  const f = new Float32Array(W * H), w = [1, 2, 1];
  for (let j = 1; j < H - 1; j++)
    for (let i = 1; i < W - 1; i++) {
      let s = 0;
      for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) s += w[a + 1] * w[b + 1] * raw[(j + b) * W + i + a];
      f[j * W + i] = s / 16;
    }
  for (let i = 0; i < W; i++) { f[i] = 0; f[(H - 1) * W + i] = 0; }
  for (let j = 0; j < H; j++) { f[j * W] = 0; f[j * W + W - 1] = 0; }
  return { f, W, H };
}

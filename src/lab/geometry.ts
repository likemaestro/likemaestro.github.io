// Checks on an optimized design: how much of it is grey, and whether the solid holds together on the periodic cell.

const solidAt = (rho: ArrayLike<number>) => (rho instanceof Uint8Array ? 128 : 0.5);

/** Share of elements between 0.1 and 0.9 density. */
export function greyFraction(rho: ArrayLike<number>) {
  const s = rho instanceof Uint8Array ? 255 : 1;
  let g = 0;
  for (let e = 0; e < rho.length; e++) { const v = rho[e] / s; if (v > 0.1 && v < 0.9) g++; }
  return g / rho.length;
}

/** The solid phase (density above one half) is one piece on the periodic n × n cell: no floating islands. */
export function connected(rho: ArrayLike<number>, n: number) {
  const t = solidAt(rho), seen = new Uint8Array(n * n);
  let start = -1, total = 0;
  for (let e = 0; e < n * n; e++) if (rho[e] > t) { total++; if (start < 0) start = e; }
  if (start < 0) return false;
  const stack = [start]; seen[start] = 1; let count = 1;
  while (stack.length) {
    const e = stack.pop()!, x = e % n, y = (e - x) / n;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const f = ((y + dy + n) % n) * n + ((x + dx + n) % n);
      if (!seen[f] && rho[f] > t) { seen[f] = 1; count++; stack.push(f); }
    }
  }
  return count === total;
}

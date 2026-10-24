// Geometry for the design-space map: the edges between neighboring cells whose flags differ, as segments in cell units
// (x to the right, y up from the bottom row). Row-major flags, row 0 at the bottom.
export function edges(flags: boolean[], nx: number, ny: number) {
  const out: [number, number, number, number][] = [];
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const f = flags[j * nx + i];
    if (i + 1 < nx && flags[j * nx + i + 1] !== f) out.push([i + 1, j, i + 1, j + 1]);   // vertical edge to the right
    if (j + 1 < ny && flags[(j + 1) * nx + i] !== f) out.push([i, j + 1, i + 1, j + 1]);   // horizontal edge above
  }
  return out;
}

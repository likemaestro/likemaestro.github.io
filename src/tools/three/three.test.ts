import { deformedMember, iSectionShape } from "./isection";

test("the I outline has 12 points, closed and symmetric", () => {
  const s = iSectionShape(300, 150, 7.1, 10.7);
  expect(s).toHaveLength(12);
  for (const [y, z] of s) {
    expect(s.some(([a, b]) => a === -y && b === z)).toBe(true);
    expect(s.some(([a, b]) => a === y && b === -z)).toBe(true);
  }
  // shoelace: anticlockwise, area 2 b tf + (h − 2 tf) tw
  let A = 0;
  s.forEach(([y0, z0], i) => { const [y1, z1] = s[(i + 1) % 12]; A += y0 * z1 - y1 * z0; });
  expect(A / 2).toBeCloseTo(2 * 150 * 10.7 + (300 - 2 * 10.7) * 7.1, 9);
});

test("a member with no deformation is the straight extrusion, with outward side normals", () => {
  const s = iSectionShape(0.3, 0.15, 0.0071, 0.0107), { geometry } = deformedMember(s, 6, 10);
  const p = geometry.attributes.position, n = geometry.attributes.normal;
  for (let v = 0; v < p.count; v++) {
    const x = p.getX(v), Y = p.getY(v), Z = p.getZ(v);
    expect(x).toBeGreaterThanOrEqual(0);
    expect(x).toBeLessThanOrEqual(6 + 1e-6);
    expect(s.some(([lat, ver]) => Math.abs(-lat - Z) < 1e-6 && Math.abs(ver - Y) < 1e-6)).toBe(true);
  }
  // the vertex of the bottom face at the middle ring points down
  const v = 5 * 24;   // ring 5, side 0 (bottom face), first point
  expect(n.getY(v)).toBeCloseTo(-1, 6);
});

test("a twist about X turns the top flange towards +Z, which is engineering −y", () => {
  const s = iSectionShape(0.3, 0.15, 0.0071, 0.0107), m = deformedMember(s, 6, 2);
  m.update(() => ({ dx: 0, dy: 0, dz: 0, rx: 0.1 }));
  const p = m.geometry.attributes.position;
  const top = 6 * 2;   // ring 0, side 6 starts at outline point 6, (b/2, h/2): lateral +b/2 sits at Z = −b/2
  expect(p.getZ(top)).toBeCloseTo(-0.075 * Math.cos(0.1) + 0.15 * Math.sin(0.1), 6);   // Float32 positions
});

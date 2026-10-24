// I-section members for the 3D view: the outline (no fillets) and a member made of slices that can each move and twist.
import * as THREE from "three";

/** The 12-point outline of a doubly symmetric I-section, [lateral, vertical], centered on the shear center. */
export function iSectionShape(h: number, b: number, tw: number, tf: number): [number, number][] {
  const x = b / 2, y = h / 2, w = tw / 2, f = y - tf;
  return [[-x, -y], [x, -y], [x, -f], [w, -f], [w, f], [x, f], [x, y], [-x, y], [-x, f], [-w, f], [-w, -f], [-x, -f]];
}

export interface SliceMove { dx: number; dy: number; dz: number; rx: number }
const STILL: SliceMove = { dx: 0, dy: 0, dz: 0, rx: 0 };

/**
 * A member along +X from 0 to length, n slices. Slice positions come from at(s), s from 0 to 1: a shift (dx, dy, dz) and
 * a rotation rx about X, applied to the outline [lateral, vertical] mapped to (Z = −lateral, Y = vertical). Each side face
 * has its own vertices, so edges stay crisp. update() recomputes the positions in place.
 */
export function deformedMember(shape: [number, number][], length: number, n: number) {
  const m = shape.length, ringV = 2 * m, capV = m;
  const pos = new Float32Array(((n + 1) * ringV + 2 * capV) * 3), idx: number[] = [];
  for (let k = 0; k < n; k++) for (let j = 0; j < m; j++) {   // side j between outline points j and j + 1
    const a = k * ringV + 2 * j, b = a + 1, c = a + ringV, d = b + ringV;
    idx.push(a, b, c, b, d, c);   // outward normals: the outline runs anticlockwise seen from +X
  }
  // end caps: bottom flange, web, top flange as three rectangles of the outline points
  const rects = [[0, 1, 2, 11], [10, 3, 4, 9], [8, 5, 6, 7]];
  for (const [end, base] of [[0, (n + 1) * ringV], [1, (n + 1) * ringV + capV]] as const)
    for (const [p, q, r, s] of rects) end === 0 ? idx.push(base + p, base + r, base + q, base + p, base + s, base + r) : idx.push(base + p, base + q, base + r, base + p, base + r, base + s);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setIndex(idx);

  const update = (at: (s: number) => SliceMove = () => STILL) => {
    const put = (v: number, x: number, lat: number, ver: number, mv: SliceMove) => {
      const c = Math.cos(mv.rx), s = Math.sin(mv.rx), Y = ver, Z = -lat;
      pos[3 * v] = x + mv.dx;
      pos[3 * v + 1] = c * Y - s * Z + mv.dy;
      pos[3 * v + 2] = s * Y + c * Z + mv.dz;
    };
    for (let k = 0; k <= n; k++) {
      const sk = k / n, mv = at(sk), x = sk * length;
      for (let j = 0; j < m; j++) {
        const [l0, v0] = shape[j], [l1, v1] = shape[(j + 1) % m];
        put(k * ringV + 2 * j, x, l0, v0, mv);
        put(k * ringV + 2 * j + 1, x, l1, v1, mv);
        if (k === 0) put((n + 1) * ringV + j, x, l0, v0, mv);
        if (k === n) put((n + 1) * ringV + capV + j, x, l0, v0, mv);
      }
    }
    geo.attributes.position.needsUpdate = true;
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
  };
  update();
  return { geometry: geo, update };
}

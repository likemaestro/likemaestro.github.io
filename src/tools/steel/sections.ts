// Hot-rolled IPE, HEA and HEB sections: properties computed from the nominal dimensions, and the class in bending.
// Units: N, mm. Nominal dimensions as in EN 10365 (formerly Euronorm 19-57 for IPE and 53-62 for HE), as listed in the
// ArcelorMittal sales programme for sections and merchant bars. Every property below agrees with that catalog within its
// rounding (checked for all 56 sections; sections.test.ts keeps a few as fixtures).

export const E = 210000, NU = 0.3, G = E / (2 * (1 + NU));   // N/mm²; G = 80 769.23 (SN003 rounds it to 80 770)
export const RHO = 7850e-9;                                  // kg/mm³

export type Series = "IPE" | "HEA" | "HEB";
export interface Section {
  id: string; name: string; series: Series;
  h: number; b: number; tw: number; tf: number; r: number;   // depth, width, web, flange, root radius
  A: number; Iy: number; Iz: number; Wel: number; Wpl: number; It: number; Iw: number; mass: number;
}

// [size, h, b, tw, tf, r] in mm
const DIMS: Record<Series, number[][]> = {
  IPE: [
    [80, 80, 46, 3.8, 5.2, 5], [100, 100, 55, 4.1, 5.7, 7], [120, 120, 64, 4.4, 6.3, 7], [140, 140, 73, 4.7, 6.9, 7],
    [160, 160, 82, 5, 7.4, 9], [180, 180, 91, 5.3, 8, 9], [200, 200, 100, 5.6, 8.5, 12], [220, 220, 110, 5.9, 9.2, 12],
    [240, 240, 120, 6.2, 9.8, 15], [270, 270, 135, 6.6, 10.2, 15], [300, 300, 150, 7.1, 10.7, 15],
    [330, 330, 160, 7.5, 11.5, 18], [360, 360, 170, 8, 12.7, 18], [400, 400, 180, 8.6, 13.5, 21],
    [450, 450, 190, 9.4, 14.6, 21], [500, 500, 200, 10.2, 16, 21], [550, 550, 210, 11.1, 17.2, 24],
    [600, 600, 220, 12, 19, 24],
  ],
  HEA: [
    [100, 96, 100, 5, 8, 12], [120, 114, 120, 5, 8, 12], [140, 133, 140, 5.5, 8.5, 12], [160, 152, 160, 6, 9, 15],
    [180, 171, 180, 6, 9.5, 15], [200, 190, 200, 6.5, 10, 18], [220, 210, 220, 7, 11, 18],
    [240, 230, 240, 7.5, 12, 21], [260, 250, 260, 7.5, 12.5, 24], [280, 270, 280, 8, 13, 24],
    [300, 290, 300, 8.5, 14, 27], [320, 310, 300, 9, 15.5, 27], [340, 330, 300, 9.5, 16.5, 27],
    [360, 350, 300, 10, 17.5, 27], [400, 390, 300, 11, 19, 27], [450, 440, 300, 11.5, 21, 27],
    [500, 490, 300, 12, 23, 27], [550, 540, 300, 12.5, 24, 27], [600, 590, 300, 13, 25, 27],
  ],
  HEB: [
    [100, 100, 100, 6, 10, 12], [120, 120, 120, 6.5, 11, 12], [140, 140, 140, 7, 12, 12], [160, 160, 160, 8, 13, 15],
    [180, 180, 180, 8.5, 14, 15], [200, 200, 200, 9, 15, 18], [220, 220, 220, 9.5, 16, 18],
    [240, 240, 240, 10, 17, 21], [260, 260, 260, 10, 17.5, 24], [280, 280, 280, 10.5, 18, 24],
    [300, 300, 300, 11, 19, 27], [320, 320, 300, 11.5, 20.5, 27], [340, 340, 300, 12, 21.5, 27],
    [360, 360, 300, 12.5, 22.5, 27], [400, 400, 300, 13.5, 24, 27], [450, 450, 300, 14, 26, 27],
    [500, 500, 300, 14.5, 28, 27], [550, 550, 300, 15, 29, 27], [600, 600, 300, 15.5, 30, 27],
  ],
};

/** Properties of a doubly symmetric I-section with circular root fillets. */
export function iSection(h: number, b: number, tw: number, tf: number, r: number) {
  // one fillet: an r × r square minus a quarter disc; centroid c from both straight edges, Ic about its own centroid
  const a = (1 - Math.PI / 4) * r * r, c = (r * (10 - 3 * Math.PI)) / (12 - 3 * Math.PI);
  const aq = (Math.PI * r * r) / 4, e = (4 * r) / (3 * Math.PI);
  const Ic = r ** 4 / 3 - ((Math.PI * r ** 4) / 16 - aq * e * e + aq * (r - e) ** 2) - a * c * c;
  const hw = h - 2 * tf, zf = h / 2 - tf - c, yf = tw / 2 + c;
  const A = 2 * b * tf + hw * tw + 4 * a;
  const Iy = (b * h ** 3 - (b - tw) * hw ** 3) / 12 + 4 * (Ic + a * zf * zf);
  const Iz = (2 * tf * b ** 3 + hw * tw ** 3) / 12 + 4 * (Ic + a * yf * yf);
  const Wpl = 2 * (b * tf * (h - tf) / 2 + (tw * hw * hw) / 8 + 2 * a * zf);
  // Saint-Venant torsion: thin rectangles plus a fillet term of the Roark type, in the coefficient form that reproduces
  // the catalog's It (within 0.33 % for all 56 sections); warping: Iw = Iz (h − tf)² / 4 (SCI P385)
  const D = ((r + tw / 2) ** 2 + (r + tf) ** 2 - r * r) / (2 * r + tf);
  const It = (2 / 3) * (b - 0.63 * tf) * tf ** 3 + (hw * tw ** 3) / 3 + 2 * (tw / tf) * (0.145 + (0.1 * r) / tf) * D ** 4;
  const Iw = (Iz * (h - tf) ** 2) / 4;
  return { A, Iy, Iz, Wel: Iy / (h / 2), Wpl, It, Iw, mass: A * RHO * 1000 };
}

export const SECTIONS: Section[] = (Object.keys(DIMS) as Series[]).flatMap((series) =>
  DIMS[series].map(([size, h, b, tw, tf, r]) => ({
    id: `${series}${size}`, name: `${series} ${size}`, series, h, b, tw, tf, r, ...iSection(h, b, tw, tf, r),
  })),
);
const BY_ID = new Map(SECTIONS.map((s) => [s.id, s]));
export const section = (id: string) => BY_ID.get(id);

export type Grade = "S235" | "S355" | "S460";
export const FY: Record<Grade, number> = { S235: 235, S355: 355, S460: 460 };   // t ≤ 40 mm (EN 1993-1-1, Table 3.1)

/** Cross-section class in bending about y-y (EN 1993-1-1, Table 5.2): the flange outstand and the web in bending. */
export function classInBending(s: Section, fy: number) {
  const eps = Math.sqrt(235 / fy);
  const flange = (s.b - s.tw - 2 * s.r) / 2 / s.tf / eps, web = (s.h - 2 * s.tf - 2 * s.r) / s.tw / eps;
  const cf = flange <= 9 ? 1 : flange <= 10 ? 2 : flange <= 14 ? 3 : 4;
  const cw = web <= 72 ? 1 : web <= 83 ? 2 : web <= 124 ? 3 : 4;
  return Math.max(cf, cw) as 1 | 2 | 3 | 4;
}

import { classInBending, FY, G, iSection, section, SECTIONS, type Grade } from "./sections";

// ArcelorMittal sales programme, tabulated values (cm², cm⁴, cm³, ×10³ cm⁶, kg/m), rounded as printed there
const CATALOG: Record<string, { A: number; Iy: number; Iz: number; Wpl: number; It: number; Iw: number; mass: number }> = {
  IPE300: { A: 53.8, Iy: 8356, Iz: 604, Wpl: 628, It: 20.1, Iw: 126, mass: 42.2 },
  IPE600: { A: 156, Iy: 92080, Iz: 3387, Wpl: 3512, It: 165, Iw: 2846, mass: 122 },
  HEA300: { A: 112.5, Iy: 18260, Iz: 6310, Wpl: 1383, It: 85.17, Iw: 1200, mass: 88.3 },
  HEB300: { A: 149.1, Iy: 25170, Iz: 8563, Wpl: 1869, It: 185, Iw: 1688, mass: 117 },
  HEB600: { A: 270, Iy: 171000, Iz: 13530, Wpl: 6425, It: 667.2, Iw: 10970, mass: 212 },
};

test("computed properties agree with the catalog within its rounding", () => {
  const rel = (x: number, ref: number) => Math.abs(x / ref - 1);
  for (const [id, c] of Object.entries(CATALOG)) {
    const s = section(id)!;
    const got = { A: s.A / 1e2, Iy: s.Iy / 1e4, Iz: s.Iz / 1e4, Wpl: s.Wpl / 1e3, It: s.It / 1e4, Iw: s.Iw / 1e9, mass: s.mass };
    for (const k of Object.keys(c) as (keyof typeof c)[]) expect([id, k, rel(got[k], c[k]) < 0.005]).toEqual([id, k, true]);
  }
});

test("weak-axis plastic modulus and shear area agree with the catalog", () => {
  // catalog Wpl,z (cm³) and Av,z (cm²)
  for (const [id, wz, av] of [["HEB200", 305.8, 24.83], ["HEB300", 870.1, 47.43], ["HEB500", 1292, 89.82], ["IPE270", 0, 22.1], ["IPE400", 0, 42.7], ["IPE600", 0, 83.8]] as const) {
    const s = section(id)!;
    if (wz) expect(Math.abs(s.Wplz / 1e3 / wz - 1)).toBeLessThan(0.005);
    expect(Math.abs(s.Avz / 1e2 / av - 1)).toBeLessThan(0.005);
  }
});

test("without fillets the section reduces to thin-rectangle formulas", () => {
  const h = 300, b = 150, tw = 7.1, tf = 10.7, hw = h - 2 * tf, q = iSection(h, b, tw, tf, 0);
  expect(q.A).toBeCloseTo(2 * b * tf + hw * tw, 9);
  expect(q.Iz).toBeCloseTo((2 * tf * b ** 3 + hw * tw ** 3) / 12, 6);
  expect(q.Wpl).toBeCloseTo(b * tf * (h - tf) + (tw * hw * hw) / 4, 6);
});

// Catalog class in pure bending about y-y for S235, S355, S460 ("-": not rolled in that grade)
const CLASS: Record<string, string> = {
  IPE80: "11-", IPE100: "11-", IPE120: "11-", IPE140: "111", IPE160: "111", IPE180: "111", IPE200: "111", IPE220: "111",
  IPE240: "111", IPE270: "111", IPE300: "111", IPE330: "111", IPE360: "111", IPE400: "111", IPE450: "111", IPE500: "111",
  IPE550: "111", IPE600: "111", HEA100: "111", HEA120: "111", HEA140: "112", HEA160: "112", HEA180: "123",
  HEA200: "123", HEA220: "123", HEA240: "123", HEA260: "133", HEA280: "133", HEA300: "133", HEA320: "123",
  HEA340: "113", HEA360: "112", HEA400: "111", HEA450: "111", HEA500: "111", HEA550: "111", HEA600: "111",
  HEB100: "111", HEB120: "111", HEB140: "111", HEB160: "111", HEB180: "111", HEB200: "111", HEB220: "111",
  HEB240: "111", HEB260: "111", HEB280: "111", HEB300: "111", HEB320: "111", HEB340: "111", HEB360: "111",
  HEB400: "111", HEB450: "111", HEB500: "111", HEB550: "111", HEB600: "111",
};

test("the class in bending matches the catalog for every section and grade", () => {
  expect(SECTIONS).toHaveLength(56);
  const grades: Grade[] = ["S235", "S355", "S460"];
  for (const s of SECTIONS) grades.forEach((g, k) => {
    const c = CLASS[s.id][k];
    if (c !== "-") expect([s.id, g, classInBending(s, FY[g])]).toEqual([s.id, g, Number(c)]);
  });
});

test("HEA 300 in S355 is class 3 through its flange", () => {
  // c = (300 − 8.5 − 2·27) / 2 = 118.75 mm; c / tf = 8.48; ε = √(235/355) = 0.814: 10ε = 8.14 < 8.48 ≤ 14ε = 11.4
  expect(classInBending(section("HEA300")!, 355)).toBe(3);
  expect(G).toBeCloseTo(80769.23, 2);
});

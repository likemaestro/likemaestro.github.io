// Gauge geometry and colour scales. Angles are in degrees, counter-clockwise from 3 o'clock, y up.

export const SCALES = {
  rdylgn: { text: "Green to red", stops: ["#1A9850", "#66BD63", "#A6D96A", "#D9EF8B", "#FEE08B", "#FDAE61", "#F46D43", "#D73027"] },   // ColorBrewer RdYlGn, reversed
  viridis: { text: "Viridis", stops: ["#440154", "#3B528B", "#21918C", "#5EC962", "#FDE725"] },
  blues: { text: "Blues", stops: ["#DEEBF7", "#9ECAE1", "#4292C6", "#2171B5", "#08306B"] },   // ColorBrewer Blues
  steel: { text: "Steel", stops: ["#CBD2D5", "#819199", "#4F5D68", "#172027"] },   // the site's own greys
} as const;
export type Scale = keyof typeof SCALES;

/** The sweep's start and end angles: the scale runs from start (minimum) to end (maximum), clockwise. */
export const SWEEPS = { "270": [225, -45], "180": [180, 0] } as const;
export type Sweep = keyof typeof SWEEPS;

const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const toHex = (v: number[]) => "#" + v.map((x) => Math.round(x).toString(16).padStart(2, "0")).join("").toUpperCase();

/** Colour at t in [0, 1] along a scale, interpolated in sRGB between its stops. */
export function colorAt(scale: Scale, t: number, reverse = false) {
  const s = SCALES[scale].stops, u = Math.min(1, Math.max(0, reverse ? 1 - t : t)) * (s.length - 1);
  const i = Math.min(Math.floor(u), s.length - 2), f = u - i, a = hex(s[i]), b = hex(s[i + 1]);
  return toHex(a.map((x, k) => x + (b[k] - x) * f));
}

/** Where a value falls on the scale, 0 at the minimum and 1 at the maximum, clamped. */
export const fraction = (v: number, lo: number, hi: number) => (hi > lo ? Math.min(1, Math.max(0, (v - lo) / (hi - lo))) : 0);

export const angleAt = (sweep: Sweep, t: number) => { const [a, b] = SWEEPS[sweep]; return a + (b - a) * t; };

export const polar = (cx: number, cy: number, r: number, deg: number): [number, number] => {
  const a = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy - r * Math.sin(a)];
};

/** A band between radii r0 < r1 from angle a to b (a > b, drawn clockwise), as a closed path. */
export function bandPath(cx: number, cy: number, r0: number, r1: number, a: number, b: number) {
  const f = (p: [number, number]) => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`, big = a - b > 180 ? 1 : 0;
  return `M${f(polar(cx, cy, r1, a))}A${r1} ${r1} 0 ${big} 1 ${f(polar(cx, cy, r1, b))}L${f(polar(cx, cy, r0, b))}A${r0} ${r0} 0 ${big} 0 ${f(polar(cx, cy, r0, a))}Z`;
}

/** Numbers as people write them: thousands separated, at most two decimals. */
export const fmt = (v: number) => v.toLocaleString("en-GB", { maximumFractionDigits: 2 });

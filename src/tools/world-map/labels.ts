import { geoCentroid } from "d3-geo";

// Natural Earth's short names, written out for labels and the country list. Countries are keyed by these names.
const NICE: Record<string, string> = {
  "United States of America": "United States", "Bosnia and Herz.": "Bosnia and Herzegovina", "Central African Rep.": "Central African Republic",
  "Dem. Rep. Congo": "DR Congo", "Dominican Rep.": "Dominican Republic", "Eq. Guinea": "Equatorial Guinea", "S. Sudan": "South Sudan",
  "Solomon Is.": "Solomon Islands", "Falkland Is.": "Falkland Islands", "Fr. S. Antarctic Lands": "French Southern Lands",
  "W. Sahara": "Western Sahara", "N. Cyprus": "Northern Cyprus", "Macedonia": "North Macedonia", "eSwatini": "Eswatini",
};
export const niceName = (n: string) => NICE[n] ?? n;

// Where a label points for countries whose centroid falls badly: overseas parts, long or curved shapes.
const POINT: Record<string, [number, number]> = {
  "United States": [-98.5, 39.8], Russia: [90, 62], Canada: [-100, 57], France: [2.4, 46.6], Norway: [9, 61.5], Indonesia: [114, -1.5],
  Chile: [-71, -33], "New Zealand": [172.5, -42], Japan: [138.5, 36.5], Malaysia: [102, 4], "United Kingdom": [-1.8, 53], Denmark: [9.3, 56],
  Fiji: [178, -17.8], Croatia: [16, 45.4], Vietnam: [106, 16], Italy: [12.6, 43], Greece: [22, 39.4], Philippines: [122.5, 12],
};
export const anchorOf = (f: GeoJSON.Feature) => POINT[(f.properties as { name: string }).name] ?? (geoCentroid(f) as [number, number]);

export interface Pin { name: string; x: number; y: number }
export interface Label extends Pin { x0: number; y0: number; x1: number; y1: number; anchor: "start" | "middle" | "end" }

const DIRS = [[1, 0], [-1, 0], [0, -1], [0, 1], [1, -1], [-1, -1], [1, 1], [-1, 1]] as const;
const GAPS = [5, 12, 22, 34, 48];

/** The box a label of width w and height h takes at gap d from (x, y) in direction (dx, dy). */
function box(p: Pin, w: number, h: number, d: number, [dx, dy]: readonly [number, number]): Label {
  const x0 = dx > 0 ? p.x + d : dx < 0 ? p.x - d - w : p.x - w / 2;
  const y0 = dy < 0 ? p.y - d - h : dy > 0 ? p.y + d : p.y - h / 2;
  return { ...p, x0, y0, x1: x0 + w, y1: y0 + h, anchor: dx > 0 ? "start" : dx < 0 ? "end" : "middle" };
}
const hit = (a: { x0: number; y0: number; x1: number; y1: number }, b: typeof a) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

/** Greedy placement: each label takes the nearest of eight positions around its point that overlaps no label placed
 *  before it and no other country's point, trying wider gaps when all eight are taken. Width is estimated from the
 *  character count, which suits Archivo at regular width. */
export function placeLabels(pins: Pin[], size: number, width = (s: string) => s.length * size * 0.56): Label[] {
  const h = size * 1.25, dots = pins.map((p) => ({ x0: p.x - 3, y0: p.y - 3, x1: p.x + 3, y1: p.y + 3 }));
  const out: Label[] = [];
  for (const p of [...pins].sort((a, b) => a.y - b.y || a.x - b.x)) {
    const w = width(p.name);
    let best: Label | null = null;
    search: for (const d of GAPS) for (const dir of DIRS) {
      const b = box(p, w, h, d, dir);
      if (out.some((o) => hit(o, b)) || dots.some((o, k) => pins[k] !== p && hit(o, b))) continue;
      best = b; break search;
    }
    out.push(best ?? box(p, w, h, GAPS[0], DIRS[0]));
  }
  return out;
}

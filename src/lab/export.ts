// File exports for the tools: SVG and DXF outlines from contour loops, CSV, and a browser download.
import type { Loop } from "./contour";

const mm = (v: number) => Number(v.toFixed(3));

/** Loops (element units, y up, with a one-element pad) as an SVG at real size: s millimetres per element. */
export function loopsToSVG(loops: Loop[], W: number, H: number, s: number) {
  const w = (W - 2) * s, h = (H - 2) * s;
  const d = loops.map((l) => "M" + l.map(([x, y]) => `${mm((x - 1) * s)} ${mm(h - (y - 1) * s)}`).join("L") + "Z").join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${mm(w)}mm" height="${mm(h)}mm" viewBox="0 0 ${mm(w)} ${mm(h)}">
<path fill="#172027" fill-rule="evenodd" d="${d}"/>
</svg>
`;
}

/** Loops as closed polylines in an R12 DXF, in millimetres (R12 has no unit field: the file name says mm). */
export function loopsToDXF(loops: Loop[], s: number) {
  const out = ["0", "SECTION", "2", "HEADER", "9", "$ACADVER", "1", "AC1009", "0", "ENDSEC", "0", "SECTION", "2", "ENTITIES"];
  for (const l of loops) {
    out.push("0", "POLYLINE", "8", "0", "66", "1", "70", "1", "10", "0", "20", "0", "30", "0");
    for (const [x, y] of l) out.push("0", "VERTEX", "8", "0", "10", String(mm((x - 1) * s)), "20", String(mm((y - 1) * s)), "30", "0");
    out.push("0", "SEQEND", "8", "0");
  }
  out.push("0", "ENDSEC", "0", "EOF");
  return out.join("\n") + "\n";
}

export function download(name: string, data: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

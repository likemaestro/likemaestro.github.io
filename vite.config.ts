import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import mdx from "@mdx-js/rollup";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

// MathML Core (Chrome) ignores mathvariant other than "normal", so \mathbf{y} or \mathcal{G} would show as plain
// italics. Swap those letters for their Unicode mathematical alphanumerics, which every browser draws.
const SCRIPT_GAPS: Record<string, number> = { B: 0x212c, E: 0x2130, F: 0x2131, H: 0x210b, I: 0x2110, L: 0x2112, M: 0x2133, R: 0x211b, e: 0x212f, g: 0x210a, o: 0x2134 };
const VARIANTS: Record<string, { A: number; a: number; Alpha?: number; alpha?: number }> = {
  bold: { A: 0x1d400, a: 0x1d41a, Alpha: 0x1d6a8, alpha: 0x1d6c2 },
  "bold-italic": { A: 0x1d468, a: 0x1d482, Alpha: 0x1d71c, alpha: 0x1d736 },
  script: { A: 0x1d49c, a: 0x1d4b6 },
};
const styled = (ch: string, v: (typeof VARIANTS)[string], variant: string) => {
  const c = ch.codePointAt(0)!;
  if (variant === "script" && SCRIPT_GAPS[ch]) return String.fromCodePoint(SCRIPT_GAPS[ch]);
  if (c >= 0x41 && c <= 0x5a) return String.fromCodePoint(v.A + c - 0x41);
  if (c >= 0x61 && c <= 0x7a) return String.fromCodePoint(v.a + c - 0x61);
  if (v.Alpha && c >= 0x391 && c <= 0x3a9) return String.fromCodePoint(v.Alpha + c - 0x391);
  if (v.alpha && c >= 0x3b1 && c <= 0x3c9) return String.fromCodePoint(v.alpha + c - 0x3b1);
  return ch;
};
type Node = { type: string; value?: string; properties?: Record<string, unknown>; children?: Node[] };
const rehypeMathVariants = () => (tree: Node) => {
  const walk = (n: Node) => {
    const key = n.properties && ("mathVariant" in n.properties ? "mathVariant" : "mathvariant" in n.properties ? "mathvariant" : null);
    const variant = key ? String(n.properties![key]) : "", v = VARIANTS[variant];
    if (key && v) {
      for (const t of n.children ?? []) if (t.type === "text") t.value = [...t.value!].map((ch) => styled(ch, v, variant)).join("");
      delete n.properties![key];
    }
    n.children?.forEach(walk);
  };
  walk(tree);
};

export default defineConfig({
  plugins: [
    // Articles are MDX. Math is turned into MathML at build time, so the page ships no math library or fonts.
    { enforce: "pre", ...mdx({ remarkPlugins: [remarkGfm, remarkMath], rehypePlugins: [[rehypeKatex, { output: "mathml" }], rehypeMathVariants] }) },
    react({ include: /\.(mdx|js|jsx|ts|tsx)$/ }),
  ],
  build: { outDir: "build" },   // scripts/postbuild.js and gh-pages read build/
  worker: { format: "es" },
  server: { port: 3000 },
  test: { globals: true, include: ["src/**/*.test.ts"] },
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: { outDir: "build" },   // scripts/postbuild.js and gh-pages read build/
  worker: { format: "es" },
  server: { port: 3000 },
  test: { globals: true, include: ["src/**/*.test.ts"] },
});

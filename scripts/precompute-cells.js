// Runs the browser solver in Node and writes src/lab/precomputed.ts: a pool of vetted seeds per target, so every
// live run starts from a different random design, and the result of each target's first vetted seed (shown before
// or instead of a live run). One child process per target, in parallel.
// Usage: node scripts/precompute-cells.js
const { execFileSync, fork } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const N = 80, PHONE_N = 48;   // touch devices run live at the coarser mesh, from their own vetted pool
// Hand-picked after looking at every converged design from random starts at n = 80 (2026-10-22): the most intricate, varied cells. They still go
// through the checks below. Other targets try k x 7919 in order. The first seed of each list is the default design.
const PICKS = {
  bulk: [364274, 340517, 269246, 190056, 126704, 23757, 237570, 95028, 308841, 7919, 221732],
  auxetic: [316760, 197975, 7919, 23757, 31676, 102947, 110866, 332598, 253408, 182137, 79190, 118785, 348436, 63352],
};
const root = path.resolve(__dirname, "..");

// Solid phase (density > 0.5) as one connected piece on the periodic cell: no floating islands.
function connected(phys, N) {
  const seen = new Uint8Array(N * N), solid = (e) => phys[e] > 0.5;
  const start = phys.findIndex((v) => v > 0.5);
  if (start < 0) return false;
  const stack = [start]; seen[start] = 1; let count = 1;
  while (stack.length) {
    const e = stack.pop(), x = e % N, y = (e / N) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const f = ((y + dy + N) % N) * N + ((x + dx + N) % N);
      if (!seen[f] && solid(f)) { seen[f] = 1; count++; stack.push(f); }
    }
  }
  return count === phys.filter((v) => v > 0.5).length;
}

const q = (a) => Buffer.from(Uint8Array.from(a, (v) => Math.round(Math.min(1, Math.max(0, v)) * 255))).toString("base64");
const r = (v, d = 4) => Number(v.toFixed(d));
const kappa = (C) => (C[0] + C[4] + 2 * C[1]) / 4;   // 2D bulk modulus from the equibiaxial energy

// Child: vet seeds for one target at mesh n. A seed joins the pool when its run converges to a crisp, connected design
// that is distinct from the others (and, for the auxetic target, clearly negative in Poisson's ratio).
function vet(solver, obj, n) {
  const { createRun } = require(solver);
  const KEEP = 16, pool = [], keys = new Set();
  const candidates = (n === N && PICKS[obj]) || Array.from({ length: 40 }, (_, k) => (k + 1) * 7919);
  let cell = null;
  for (const seed of candidates) {
    if (pool.length >= KEEP) break;
    const run = createRun(obj, { n, seed });
    const hist = { E1: [], G12: [], nu12: [], K: [] };
    let it;
    do {
      it = run.next();
      hist.E1.push(r(it.E1)); hist.G12.push(r(it.C[8])); hist.nu12.push(r(it.nu12)); hist.K.push(r(kappa(it.C)));
    } while (!it.done);
    const grey = it.phys.filter((v) => v > 0.1 && v < 0.9).length / it.phys.length;
    const key = [it.E1, it.C[8], it.nu12].map((v) => v.toFixed(3)).join();
    const ok = it.iter < run.P.o.maxIter && grey < 0.05 && connected(it.phys, n) && !keys.has(key) && (obj !== "auxetic" || it.nu12 < -0.2);
    if (ok) {
      keys.add(key); pool.push(seed);
      cell ??= { seed, rho: q(it.phys), iter: it.iter, vol: r(it.vol), E1: r(it.E1), G12: r(it.C[8]), nu12: r(it.nu12), K: r(kappa(it.C)), C: Array.from(it.C, (v) => r(v)), hist };
    }
    console.error(obj, n, seed, ok ? "kept" : "skipped", "iter", it.iter, "grey", grey.toFixed(3), "nu12", it.nu12.toFixed(3));
  }
  return { pool, cell };
}

if (process.argv[2] === "--vet") {
  process.send(vet(process.argv[3], process.argv[4], +process.argv[5]), () => process.exit(0));
} else {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "cells-"));
  execFileSync(process.execPath, [require.resolve("typescript/bin/tsc"), "--outDir", out, "--module", "commonjs",
    "--target", "es2019", "--skipLibCheck", path.join(root, "src/lab/unitcell.ts")], { stdio: "inherit" });
  const solver = path.join(out, "unitcell.js");
  const { createRun, OBJECTIVES } = require(solver);
  const jobs = OBJECTIVES.flatMap((obj) => [[obj, N], [obj, PHONE_N]]);
  Promise.all(jobs.map(([obj, n]) => new Promise((resolve, reject) => {
    const child = fork(__filename, ["--vet", solver, obj, String(n)]);
    child.on("message", (m) => resolve([obj, n, m]));
    child.on("exit", (code) => code && reject(new Error(`${obj} at n = ${n} exited with ${code}`)));
  }))).then((results) => {
    const cells = {}, seeds = {}, phoneSeeds = {};
    for (const [obj, n, { pool, cell }] of results) {
      if (!cell) throw new Error(`no vetted seed for ${obj} at n = ${n}`);
      if (n === PHONE_N) { phoneSeeds[obj] = pool; console.log(obj, "phone pool", pool.length); continue; }
      cells[obj] = cell; seeds[obj] = pool;
      console.log(obj, "pool", pool.length, "default seed", cell.seed, "iter", cell.iter, "E1", cell.E1, "G12", cell.G12, "nu12", cell.nu12, "K", cell.K);
    }
    // The first frame of the default auxetic seed: shown before autoplay's first frame, and autoplay runs that seed.
    const initial = q(createRun("auxetic", { n: N, seed: cells.auxetic.seed }).next().phys);
    const ts = `// Generated by scripts/precompute-cells.js. Do not edit.
export const N = ${N};
export const initial = "${initial}";
export const cells = ${JSON.stringify(cells)} as const;
export const seeds: Record<string, number[]> = ${JSON.stringify(seeds)};
export const PHONE_N = ${PHONE_N};
export const phoneSeeds: Record<string, number[]> = ${JSON.stringify(phoneSeeds)};
`;
    fs.writeFileSync(path.join(root, "src/lab/precomputed.ts"), ts);
    fs.rmSync(out, { recursive: true, force: true });
    console.log("wrote src/lab/precomputed.ts", ts.length, "bytes");
  });
}

// Runs the browser solver in Node for the property map: every target at V = 0.30, 0.40 and 0.50 from many seeds at
// n = 48, keeping the designs that converge crisp, connected and distinct. Writes public/data/property-map.json only
// (src/lab/precomputed.ts, the home page's data, is not touched). One child process per target and volume fraction.
// Usage: node scripts/precompute-map.js
const { execFileSync, fork } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const N = 48, VFS = [0.3, 0.4, 0.5], SEEDS = 60, STEP = 7919;
const root = path.resolve(__dirname, "..");

function connected(phys, n) {
  const seen = new Uint8Array(n * n), start = phys.findIndex((v) => v > 0.5);
  if (start < 0) return false;
  const stack = [start]; seen[start] = 1; let count = 1;
  while (stack.length) {
    const e = stack.pop(), x = e % n, y = (e / n) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const f = ((y + dy + n) % n) * n + ((x + dx + n) % n);
      if (!seen[f] && phys[f] > 0.5) { seen[f] = 1; count++; stack.push(f); }
    }
  }
  return count === phys.filter((v) => v > 0.5).length;
}
// 1 bit per element, row 0 at the bottom, base64.
const bits = (phys) => { const b = Buffer.alloc(phys.length / 8); phys.forEach((v, k) => { if (v > 0.5) b[k >> 3] |= 1 << (k & 7); }); return b.toString("base64"); };
const r = (v, d = 5) => Number(v.toFixed(d));

function vet(solver, obj, vf) {
  const { createRun } = require(solver);
  const out = [], keys = new Set();
  for (let k = 1; k <= SEEDS; k++) {
    const seed = k * STEP, run = createRun(obj, { n: N, seed, vf });
    let it; do { it = run.next(); } while (!it.done);
    const grey = it.phys.filter((v) => v > 0.1 && v < 0.9).length / it.phys.length;
    const key = [it.C[0], it.C[1], it.C[8]].map((v) => v.toFixed(4)).join();
    const ok = it.iter < run.P.o.maxIter && grey < 0.05 && connected(it.phys, N) && !keys.has(key);
    if (ok) { keys.add(key); out.push({ t: obj, v: vf, s: seed, i: it.iter, c: [r(it.C[0]), r(it.C[1]), r(it.C[8])], b: bits(it.phys) }); }
  }
  console.error(obj, vf, "kept", out.length, "of", SEEDS);
  return out;
}

if (process.argv[2] === "--vet") {
  process.send(vet(process.argv[3], process.argv[4], +process.argv[5]), () => process.exit(0));
} else {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "map-"));
  execFileSync(process.execPath, [require.resolve("typescript/bin/tsc"), "--outDir", tmp, "--module", "commonjs",
    "--target", "es2019", "--skipLibCheck", path.join(root, "src/lab/unitcell.ts")], { stdio: "inherit" });
  const solver = path.join(tmp, "unitcell.js");
  const { OBJECTIVES } = require(solver);
  const jobs = OBJECTIVES.flatMap((obj) => VFS.map((vf) => [obj, vf]));
  Promise.all(jobs.map(([obj, vf]) => new Promise((resolve, reject) => {
    const child = fork(__filename, ["--vet", solver, obj, String(vf)]);
    child.on("message", resolve);
    child.on("exit", (code) => code && reject(new Error(`${obj} at V = ${vf} exited with ${code}`)));
  }))).then((parts) => {
    const designs = parts.flat();
    const file = path.join(root, "public/data/property-map.json");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify({ n: N, step: STEP, generated: new Date().toISOString().slice(0, 10), designs }));
    console.log(`wrote ${designs.length} designs to ${path.relative(root, file)} (${(fs.statSync(file).size / 1024).toFixed(0)} KB)`);
  });
}

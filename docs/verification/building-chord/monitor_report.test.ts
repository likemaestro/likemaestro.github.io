// The monitoring numbers quoted in README.md. Run from the repository root (vitest only collects src/):
//   cp docs/verification/building-chord/monitor_report.test.ts src/tools/building-chord/zz-report.test.ts
//   REPORT_OUT=docs/verification/building-chord/monitor_report.out.txt npx vitest run zz-report
//   rm src/tools/building-chord/zz-report.test.ts
import { writeFileSync } from "node:fs";
import { modes, parseDamage, REF, type Building } from "./building";
import { days, features, mahalanobisFrom, restore, score, test as heldOut, train } from "./monitor";

test("monitor report", () => {
  const out: string[] = [], b: Building = { n: 6, sys: "moment" }, pct = (k: number, n: number) => `${k}/${n} (${((100 * k) / n).toFixed(1)} %)`;
  const t0 = performance.now(), t = train(b, 7), ms = performance.now() - t0;
  out.push(`seed 7: trained in ${ms.toFixed(0)} ms (node ${process.version}); best epoch ${t.best} of ${t.history.length}; validation loss ${t.history[t.best - 1].val.toExponential(2)}; train P99 ${t.trainP99.toExponential(2)}; AE threshold ${t.aeThreshold.toExponential(2)}; MSD threshold ${t.msdThreshold.toFixed(2)}; redrawn days ${t.redrawn}`);

  // the false-alarm rate on many new healthy days (seed 1000, never used above)
  const net = restore(t, 7), msd = mahalanobisFrom(t.msd.mu, t.msd.cov), H = days(b, null, 5000, 1000).X;
  let ae = 0, md = 0;
  for (const x of H) { const s = score(net, msd, t.norm, x); if (s.ae > t.aeThreshold) ae++; if (s.msd > t.msdThreshold) md++; }
  out.push(`false alarms on 5,000 new healthy days: AE ${pct(ae, 5000)}, MSD ${pct(md, 5000)} (target 1 %)`);

  // damage cases: held-out detection (200 damaged, 200 healthy days) and the noise-free state at the reference environment
  for (const [id, d] of [["c1-5", 0.7], ["c1-5", 0.5], ["c1-5", 0.9], ["c1-4", 0.7], ["c1-1", 0.7], ["c3-5", 0.7], ["c6-5", 0.7]] as const) {
    const dmg = parseDamage(id, b, d), r = heldOut(b, dmg, t, 7);
    const x = score(net, msd, t.norm, features(b, REF, dmg, modes(b, REF))!);
    out.push(`${id} at ${d}: AE ${pct(r.damaged.ae, 200)} flagged, false ${r.healthy.ae}/200; MSD ${pct(r.damaged.md, 200)}, false ${r.healthy.md}/200; noise-free at 15 °C, 0.3: AE ${(x.ae / t.aeThreshold).toFixed(2)}× threshold, MSD ${(x.msd / t.msdThreshold).toFixed(2)}×`);
  }

  // seed to seed: the guide's step 3 (c1-5 at 70 %) with five other training seeds
  for (const seed of [1, 2, 3, 4, 5]) {
    const ts = train(b, seed), r = heldOut(b, parseDamage("c1-5", b, 0.7), ts, seed);
    out.push(`seed ${seed}: best epoch ${ts.best}/${ts.history.length}; c1-5 at 0.7: AE ${pct(r.damaged.ae, 200)}, false ${r.healthy.ae}/200; MSD ${pct(r.damaged.md, 200)}, false ${r.healthy.md}/200`);
  }
  writeFileSync(process.env.REPORT_OUT!, out.join("\n") + "\n");
}, 600000);

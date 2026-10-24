// Is the 99th-percentile threshold calibrated? Ten training seeds, each scored on the same 20,000 new healthy days.
// Run from the repository root (vitest only collects src/):
//   cp docs/verification/building-chord/false_alarm_check.test.ts src/tools/building-chord/zz-fa.test.ts
//   REPORT_OUT=docs/verification/building-chord/false_alarm_check.out.txt npx vitest run zz-fa
//   rm src/tools/building-chord/zz-fa.test.ts
import { writeFileSync } from "node:fs";
import { type Building } from "./building";
import { days, mahalanobisFrom, percentile, restore, score, train } from "./monitor";

test("false alarms across seeds", () => {
  const b: Building = { n: 6, sys: "moment" }, out: string[] = [], H = days(b, null, 20000, 4242).X;
  let sa = 0, sm = 0;
  for (let seed = 1; seed <= 10; seed++) {
    const t = train(b, seed), net = restore(t, seed), msd = mahalanobisFrom(t.msd.mu, t.msd.cov);
    let ae = 0, md = 0;
    const ea: number[] = [], em: number[] = [];
    for (const x of H) { const s = score(net, msd, t.norm, x); ea.push(s.ae); em.push(s.msd); if (s.ae > t.aeThreshold) ae++; if (s.msd > t.msdThreshold) md++; }
    sa += ae; sm += md;
    out.push(`seed ${seed}: AE ${((100 * ae) / H.length).toFixed(2)} %, MSD ${((100 * md) / H.length).toFixed(2)} %; threshold / P99 of 20,000 days: AE ${(t.aeThreshold / percentile(ea, 99)).toFixed(3)}, MSD ${(t.msdThreshold / percentile(em, 99)).toFixed(3)}`);
  }
  out.push(`mean over 10 seeds: AE ${((100 * sa) / H.length / 10).toFixed(2)} %, MSD ${((100 * sm) / H.length / 10).toFixed(2)} %`);
  writeFileSync(process.env.REPORT_OUT!, out.join("\n") + "\n");
}, 600000);

import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
const rules = JSON.parse(readFileSync(new URL("../dist/data/ui/fusion-confirm-rules.json", import.meta.url), "utf8"));
const code = readFileSync(new URL("../dist/app-ui-fusion.js", import.meta.url), "utf8");
const model = runInNewContext(code + "\nfusionPreviewModel", {})(rules), pets = model.all.filter(p => p.CanFuse === "1");
let scenarios = 0, zeroCap = 0;
for (const a of pets) for (const b of pets) {
  const base = model.compute(a, b, 0);
  for (const dust of [0, base.cap]) {
    const result = model.compute(a, b, dust), sum = result.results.reduce((s, r) => s + r.weight, 0);
    assert.ok(Math.abs(sum - 1) < 1e-8, `${a.ID}/${b.ID}: weights ${sum}`);
    assert.ok(result.results.length > 0 && result.results.length <= 3);
    assert.ok(result.results.every(r => r.weight > 0 && r.weight <= 1));
    assert.ok(result.cost >= 0n && result.dust >= 0 && result.dust <= result.cap);
    if (!result.cap) zeroCap++; scenarios++;
  }
}
const report = { invariant: "pass", scenarios, zeroCap, checks: ["probabilities sum to one", "one to three visible slots", "positive bounded weights", "dust stays within source cap", "nonnegative cost"], limitation: "invariants are not an independent implementation of the game's result algorithm; mutated/weather/passive pets are outside fixtures" };
writeFileSync(new URL("../dist/data/ui/fusion-model-audit.json", import.meta.url), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report));

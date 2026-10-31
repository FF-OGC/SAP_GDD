import assert from "node:assert/strict";
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url), model = require("../dist/mail-composer-model.js");
const data = JSON.parse(readFileSync(path.join(root, "dist/data/ui/mail-composer.json"), "utf8"));
const at = process.argv.indexOf("--project-root");
if (at < 0) throw new Error("Use --project-root <game>");
const game = process.argv[at + 1];
for (const file of data.sourceFiles) assert.equal(createHash("sha256").update(readFileSync(path.join(game, file.file))).digest("hex"), file.sha256, file.file);
for (const icon of data.sprites) assert.ok(existsSync(path.join(root, "dist", icon.output)), icon.output);
const build = rewards => model.build(data, { detailId: "1", rewards });
const example = build([{ type: "PetCoin", amount: "10" }, { type: "Dust", amount: "500" }]);
assert.deepEqual(example.fields, { IsConfig: "0", GiftId: "1", RewardTypes: "3,7", RewardValues: "{5:10}{5:500}", RewardAmounts: "10,500" });
// Independent reader for the custom brace/semicolon format, including nested RV.
function objects(text) {
  let depth = 0, start = -1; const result = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "{" && depth++ === 0) start = i;
    if (text[i] === "}" && --depth === 0) result.push(text.slice(start + 1, i));
  }
  assert.equal(depth, 0); return result;
}
function pairs(text) {
  let depth = 0, start = 0; const result = {};
  for (let i = 0; i <= text.length; i++) {
    if (text[i] === "{") depth++;
    if (text[i] === "}") depth--;
    if ((text[i] === ";" && depth === 0) || i === text.length) { const part = text.slice(start, i), colon = part.indexOf(":"); if (colon >= 0) result[part.slice(0, colon)] = part.slice(colon + 1); start = i + 1; }
  }
  return result;
}
const one = build([{ type: "PetCoin", amount: 10 }]);
assert.equal(one.fields.RewardValues, "{5:10}"); // A lone {} is discarded by ExtractRewardValue.
const otherScalars = build([{ type: "Spin", amount: 3 }, { type: "DuplicateTicket", amount: 2 }]);
assert.equal(otherScalars.fields.RewardTypes, "9,17");
assert.equal(otherScalars.fields.RewardValues, "{8:3}{5:2}");
const complex = build([
  { type: "Pet", amount: 2, value: data.pets[0].ID, mutationId: "2", weathers: ["1", "2"] },
  { type: "Mutagen", amount: 3, value: data.mutagens[0].ID },
  { type: "WeatherGen", amount: 4, value: data.weatherGens[0].ID },
  { type: "RandomPet", amount: 1, rarity: "COMMON", mutationId: "1" },
  { type: "MoneyTime", amount: 2 }
]);
assert.equal(complex.valid, true, JSON.stringify(complex.errors));
const f = complex.fields, outer = pairs(objects(`;{IC:0;ID:1;CA:123;RT:${f.RewardTypes};RV:${f.RewardValues};RA:${f.RewardAmounts}}`)[0]);
assert.equal(outer.RT, "1,10,16,4,5"); assert.equal(outer.RA, "2,3,4,1,2");
const values = objects(outer.RV).map(pairs);
assert.equal(values.length, 5); assert.deepEqual(values[0], { "0": data.pets[0].ID, "1": "2", "2": "1,2" });
const sourceSaved = pairs(objects(`{RT:${f.RewardTypes};RV:${objects(f.RewardValues).map(v => "{" + v + "}").join(";")};RA:${f.RewardAmounts}}`)[0]);
assert.equal(objects(sourceSaved.RV).length, 1, "Keep evidence of the source persistence delimiter defect");
assert.deepEqual(values[1], { "7": data.mutagens[0].ID }); assert.deepEqual(values[2], { "12": data.weatherGens[0].ID });
assert.deepEqual(values[3], { "1": "1", "4": "COMMON" }); assert.deepEqual(values[4], { "6": "2" });
assert.equal(build([{ type: "Money", amount: 1, moneyValue: "10", moneyUnit: "3" }]).fields.RewardAmounts, "30100");
assert.equal(build([{ type: "Money", amount: 1, moneyValue: "999.9", moneyUnit: "2" }]).fields.RewardAmounts, "29999");
const invalid = [[], Array.from({ length: 6 }, () => ({ type: "Dust", amount: 1 })), ...[0, -1, 1.5, "", "1;7", Infinity, Number.MAX_SAFE_INTEGER + 1].map(amount => [{ type: "PetCoin", amount }]), [{ type: "RandomPet", amount: 2, rarity: "COMMON", mutationId: "1" }], [{ type: "MoneyTime", amount: 0.5 }], [{ type: "RandomSecretPool", amount: 1 }], [{ type: "Pet", amount: 1, value: "bogus", mutationId: "1", weathers: [] }], [{ type: "Pet", amount: 1, value: "1", mutationId: "1", weathers: ["1", "1"] }], [{ type: "Money", amount: 1, moneyValue: "10.25", moneyUnit: "3" }]];
for (const rows of invalid) { const result = build(rows); assert.equal(result.valid, false); assert.equal(result.fields, null); }
const report = { source: "pass", example: example.fields, gmtInputRoundTrip: "pass", sourcePersistence: "source serializer separates RV maps with semicolons; outer parser truncates after first map", supportedTypes: data.types.map(t => t.name), invalidCases: invalid.length, maxRewards: data.maxRewards, browser: "see mail-composer-browser-audit.json", runtimeDelivery: "not executed" };
writeFileSync(path.join(root, "dist/data/ui/mail-composer-audit.json"), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report));

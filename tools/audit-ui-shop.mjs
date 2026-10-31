import assert from "node:assert/strict";
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const at = process.argv.indexOf("--project-root");
if (at < 0 || !process.argv[at + 1]) throw new Error("Use --project-root <game>");
const game = path.resolve(process.argv[at + 1]), read = file => JSON.parse(readFileSync(path.join(root, file), "utf8"));
const screen = read("dist/data/ui/shop.json"), rules = read("dist/data/ui/shop-rules.json"), manifest = read("dist/data/ui/shop-sprites.json");
const hash = value => createHash("sha256").update(value).digest("hex");
const raw = readFileSync(path.join(game, "Assets/HUDs/Shop.ui"), "utf8");
assert.equal(hash(raw), rules.uiSha256);
let entities = 0;
function compare(a, b, parent = "") {
  const p = parent ? `${parent}/${a._entityName}` : a._entityName;
  assert.deepEqual({ id: b.id, path: b.path, type: b.type, props: b.propsData, eca: b.ecaProps }, { id: a._entityId, path: p, type: a._tag.type, props: a.propsData || {}, eca: a.ecaProps || {} });
  assert.deepEqual(b.sourceFields, Object.fromEntries(Object.entries(a).filter(([key]) => !["children", "propsData", "ecaProps"].includes(key))));
  assert.equal(a.children?.length || 0, b.children.length); entities++;
  (a.children || []).forEach((child, i) => compare(child, b.children[i], p));
}
compare(JSON.parse(raw.split(/\n\/\//)[0]), screen.tree); assert.equal(entities, screen.entityCount);
for (const file of rules.sourceFiles) assert.equal(hash(readFileSync(path.join(game, file.file))), file.sha256, file.file);
for (const sprite of manifest.sprites.filter(s => !s.missing)) {
  assert.ok(existsSync(path.join(root, "dist", sprite.output)));
  assert.equal(hash(readFileSync(path.join(root, "dist", sprite.output))), hash(readFileSync(path.join(game, sprite.key))));
  const meta = JSON.parse(readFileSync(path.join(game, sprite.key + ".meta"), "utf8"));
  if (sprite.fileId) assert.equal(meta.fileId, sprite.fileId, sprite.key);
  assert.deepEqual(sprite.border, { left: Number(meta.borderLeft) || 0, right: Number(meta.borderRight) || 0, top: Number(meta.borderTop) || 0, bottom: Number(meta.borderBottom) || 0 });
}
for (const wave of rules.waves) {
  const ids = [...wave.Items.matchAll(/\{ID:(\d+);Count:(\d+)\}/g)].map(m => m[1]);
  assert.ok(ids.length); assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.ok(rules.rotation.some(r => r.ID === id), id);
}
for (const row of rules.normal) assert.ok(row.Name in rules.spriteKeys);
for (const row of rules.rotation) { assert.ok(row.icon in rules.spriteKeys); assert.ok(["Pet", "Mutagen", "Weather", "WeatherGen"].includes(row.typeName)); }
assert.equal(rules.maxRebirth, 15); assert.equal(rules.petMultiplier, "5.0");
const report = { source: "pass", sourceCommit: rules.sourceCommit, entities, sprites: manifest.sprites.length, missing: manifest.missing.map(s => s.key), normalItems: rules.normal.length, rotationItems: rules.rotation.length, waves: rules.waves.length, unsupported: manifest.unsupported, gaps: rules.gaps, browser: "see plans/PLAN-ui-shop.md for separately executed CUA checks", engineParity: "not verified; no engine screenshots" };
writeFileSync(path.join(root, "dist/data/ui/shop-audit.json"), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({ source: report.source, entities, sprites: report.sprites, missing: report.missing.length, waves: report.waves }));

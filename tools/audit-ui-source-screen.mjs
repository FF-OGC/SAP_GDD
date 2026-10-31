import assert from "node:assert/strict";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const value = flag => process.argv[process.argv.indexOf(flag) + 1];
if (!process.argv.includes("--project-root") || !process.argv.includes("--screen")) throw new Error("Use --project-root <game> --screen <id>");
const game = path.resolve(value("--project-root")), id = value("--screen");
if (!/^[a-z-]+$/.test(id)) throw new Error("Invalid screen");
const json = file => JSON.parse(readFileSync(path.join(root, "dist/data/ui", file), "utf8"));
const screen = json(`${id}.json`), rules = json(`${id}-rules.json`), manifest = json(`${id}-sprites.json`), i18n = json(`${id}-i18n.json`);
const hash = value => createHash("sha256").update(value).digest("hex");
const raw = readFileSync(path.join(game, screen.source), "utf8");
assert.equal(hash(raw), rules.uiSha256);
const nodes = [];
function compare(a, b, parent = "") {
  const p = parent ? `${parent}/${a._entityName}` : a._entityName;
  assert.deepEqual({ id: b.id, path: b.path, type: b.type, props: b.propsData, eca: b.ecaProps }, { id: a._entityId, path: p, type: a._tag.type, props: a.propsData || {}, eca: a.ecaProps || {} }, p);
  assert.deepEqual(b.sourceFields, Object.fromEntries(Object.entries(a).filter(([key]) => !["children", "propsData", "ecaProps"].includes(key))), p);
  assert.equal(a.children?.length || 0, b.children.length); nodes.push(b);
  (a.children || []).forEach((child, i) => compare(child, b.children[i], p));
}
compare(JSON.parse(raw.split(/\n\/\//)[0]), screen.tree); assert.equal(nodes.length, screen.entityCount);
for (const file of rules.sourceFiles) assert.equal(hash(readFileSync(path.join(game, file.file))), file.sha256, file.file);
const unresolvedRegistrations = Object.entries(rules.widgetIds).filter(([, id]) => !nodes.some(n => n.id === id)).map(([name, id]) => ({ name, id }));
for (const sprite of manifest.sprites.filter(s => !s.missing)) {
  assert.ok(existsSync(path.join(root, "dist", sprite.output)), sprite.key);
  assert.equal(hash(readFileSync(path.join(root, "dist", sprite.output))), hash(readFileSync(path.join(game, sprite.key))), sprite.key);
  const meta = JSON.parse(readFileSync(path.join(game, sprite.key + ".meta"), "utf8"));
  if (sprite.fileId) assert.equal(meta.fileId, sprite.fileId, sprite.key);
  assert.deepEqual(sprite.border, { left: Number(meta.borderLeft) || 0, right: Number(meta.borderRight) || 0, top: Number(meta.borderTop) || 0, bottom: Number(meta.borderBottom) || 0 }, sprite.key);
}
assert.ok(!rules.sourceFiles.some(f => /giftcode\.csv|Compensate[\\/]/i.test(f.file)), "Restricted source must use ID/Reward projection");
for (const projection of rules.projections || []) assert.deepEqual(projection.fields, ["ID", "Reward"]);
const report = { source: "pass", sourceCommit: rules.sourceCommit, entities: nodes.length, sprites: manifest.sprites.length, missingSprites: manifest.missing.map(s => s.key), missingLocalization: i18n.missing, unresolvedRegistrations, unsupported: manifest.unsupported, runtimeAssignments: rules.runtimeAssignments.length, gaps: rules.gaps, browser: "separate CUA verification in screen plan", engineParity: "unverified; no runtime game screenshots" };
writeFileSync(path.join(root, "dist/data/ui", `${id}-audit.json`), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({ screen: id, source: report.source, entities: report.entities, sprites: report.sprites, missing: report.missingSprites.length, missingLocalization: i18n.missing.length, staleRegistration: unresolvedRegistrations.length }));

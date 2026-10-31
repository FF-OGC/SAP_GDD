import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";

// Each screen provides an explicit source allowlist and derives its own data.
export function sourceScreenRules(spec, source, tree, sprite, parseCsv) {
  const sourceFiles = [], code = {}, keys = new Set(), spriteKeys = {}, gaps = [];
  const hash = value => createHash("sha256").update(value).digest("hex");
  const read = file => { const raw = readFileSync(source(file), "utf8"); sourceFiles.push({ file, sha256: hash(raw) }); return raw; };
  const csv = name => { if (/giftcode|Compensate/i.test(name)) throw new Error("Restricted table"); const rows = parseCsv(read(`Assets/CSV/${name}.csv`)); return rows.slice(2).filter(r => r[0]).map(r => Object.fromEntries(rows[0].map((k, i) => [k, r[i] || ""]))); };
  for (const file of spec.files) code[file] = read(file);
  const controller = code[spec.controller], bindings = {}, runtimeAssignments = [], constants = {};
  for (const file of spec.files) {
    const raw = code[file];
    for (const m of raw.matchAll(/(?:async )?func (\w+)\(/g)) bindings[m[1]] ||= `${file}:${raw.slice(0, m.index).split(/\r?\n/).length}`;
    if (file === spec.controller || spec.localizationFiles?.includes(file)) for (const m of raw.matchAll(/LocString\{\s*"([A-Z][A-Z0-9_]+)"/g)) keys.add(m[1]);
    if (file === spec.controller || spec.runtimeFiles?.includes(file)) {
      raw.split(/\r?\n/).forEach((line, i) => { const m = line.match(/^\s*(.+?)<(\w+)>\.(\w+)\s*=\s*(.+)$/); if (m) runtimeAssignments.push({ target: m[1].trim(), property: m[3], expression: m[4], source: `${file}:${i + 1}` }); });
      for (const m of raw.matchAll(/^\s+(\w+)(?: (?:int|float|Color|string))? = (#[\dA-Fa-f]{6,8}|-?[\d.]+|"[^"\r\n]*")\s*$/gm)) constants[m[1]] = m[2].startsWith("#") ? m[2] : m[2].startsWith('"') ? m[2].slice(1, -1) : Number(m[2]);
    }
  }
  (function walk(n) { if (n.text?.key) keys.add(n.text.key); n.children.forEach(walk); })(tree);
  const registration = JSON.parse(read("ProjectSettings/ResourceRegisteration.asset").split(/\n\/\//)[0]).Resource;
  const resources = new Map();
  (function walk(n) { if (n.refer && n.scriptName) resources.set(n.scriptName, n.refer); (n.children || []).forEach(walk); })(registration.texture);
  const widgetIds = Object.fromEntries((registration.ui.children.find(n => n.scriptName === spec.ui.replace(/\.ui$/, ""))?.children || []).map(n => [n.scriptName, n.id]));
  function resource(name) {
    if (!name || name in spriteKeys) return;
    const ref = resources.get(name);
    spriteKeys[name] = ref ? sprite(ref, `runtime:${spec.id}:${name}`, spec.controller) : null;
    if (!ref) gaps.push(`Resource ${name}: not registered`);
  }
  for (const m of controller.matchAll(/EResSprite\.(\w+)/g)) resource(m[1]);
  const projections = [];
  function giftRewards(ids) {
    const rows = parseCsv(readFileSync(source("Assets/CSV/giftcode.csv"), "utf8")), id = rows[0].indexOf("ID"), reward = rows[0].indexOf("Reward");
    const selected = rows.slice(2).filter(r => ids.has(r[id])).map(r => ({ ID: r[id], Reward: r[reward] }));
    projections.push({ source: "Assets/CSV/giftcode.csv", fields: ["ID", "Reward"], sha256: hash(JSON.stringify(selected)) });
    return selected;
  }
  const extra = spec.derive?.({ read, csv, code, resource, keys, constants, gaps, giftRewards }) || {};
  const common = Object.values(code).join("\n");
  const rarityBlock = common.match(/RARITY_COLOR[^=]*=\s*Map[^\{]*\{([\s\S]*?)\n\s*\}/)?.[1] || "";
  const rarityColors = Object.fromEntries([...rarityBlock.matchAll(/RarityEnum\.(\w+):\s*(#[\dA-Fa-f]+)/g)].map(m => [m[1].toUpperCase(), m[2]]));
  const suffixes = Object.fromEntries([...(common.match(/MONEY_SUFFIX[\s\S]*?\{([\s\S]*?)\n\s*\}/)?.[1] || "").matchAll(/(\d+):\s*"([^"]*)"/g)].map(m => [m[1], m[2]]));
  const loc = parseCsv(readFileSync(source("Assets/Localization/key.csv"), "utf8")), col = k => loc[0].indexOf(k);
  const entries = Object.fromEntries(loc.slice(1).filter(r => keys.has(r[col("Key")])).map(r => [r[col("Key")], { en: r[col("English")] || "", vi: r[col("Vietnamese")] || "" }]));
  const git = spawnSync("git", ["-C", source("."), "rev-parse", "HEAD"], { encoding: "utf8" });
  return { rules: { sourceCommit: git.stdout.trim(), uiSha256: hash(readFileSync(source(`Assets/HUDs/${spec.ui}`))), controller: spec.controller, sourceFiles, projections, widgetIds, constants, bindings, runtimeAssignments, spriteKeys, rarityColors, suffixes, ...extra, gaps: [...gaps, ...(spec.gaps || []), "No engine screenshots; font/shader/scaler, hit order, safe area and scroll inertia unverified; player state is a local simulation"] }, i18n: { source: "Assets/Localization/key.csv", entries, missing: [...keys].filter(k => !entries[k]).sort() } };
}

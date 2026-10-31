import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";

export function mailRules(source, tree, sprite, parseCsv) {
  const sourceFiles = [];
  const hash = text => createHash("sha256").update(text).digest("hex");
  const read = file => { const text = readFileSync(source(file), "utf8"); sourceFiles.push({ file, sha256: hash(text) }); return text; };
  const code = Object.fromEntries(["HUDs/HudMail", "Manager/MailsManager", "Configs/MailConfigs", "Configs/ItemConfigs", "Configs/PetConfigs", "Utils/UIUtils", "Utils/BigNumberHandler"].map(f => [f.split("/").at(-1), read(`Assets/Scripts/${f}.fcg`)]));
  const csv = parseCsv(read("Assets/CSV/MailDetails.csv"));
  const details = csv.slice(2).filter(r => r[0]).map(r => Object.fromEntries(csv[0].map((key, i) => [key, r[i]])));
  const rows = name => { const data = parseCsv(read(`Assets/CSV/${name}.csv`)); return data.slice(2).filter(r => r[0]).map(r => Object.fromEntries(data[0].map((key, i) => [key, r[i] || ""]))); };
  const pet = rows("Pet")[0], mutagen = rows("Mutagen")[0], weatherGen = rows("WeatherGen")[0];
  const mutation = rows("mutation").find(r => r.ID === mutagen.Mutation), weather = rows("weatherEffects").find(r => r.ID === weatherGen.WeatherEffect);
  const register = JSON.parse(read("ProjectSettings/ResourceRegisteration.asset").split(/\n\/\//)[0]).Resource;
  const resources = new Map();
  (function walk(n) { if (n.refer && n.scriptName) resources.set(n.scriptName, n.refer); (n.children || []).forEach(walk); })(register.texture);
  const widgetIds = Object.fromEntries(register.ui.children.find(n => n.scriptName === "Mail").children.map(n => [n.scriptName, n.id]));
  const constants = Object.fromEntries([...code.HudMail.matchAll(/^\s+(\w+)(?: int)? = (#[\dA-Fa-f]{6,8}|\d+)\s*$/gm)].map(m => [m[1], m[2].startsWith("#") ? m[2] : Number(m[2])]));
  for (const key of ["MAX_MAILS", "MAX_VALID_DATE"]) constants[key] = Number(code.MailsManager.match(new RegExp(`${key} int = (\\d+)`))[1]);
  const keys = new Set(), nodes = [];
  (function walk(n) { nodes.push(n); if (n.text?.key) keys.add(n.text.key); n.children.forEach(walk); })(tree);
  for (const m of code.HudMail.matchAll(/LocString\{"([A-Z][A-Z0-9_]+)"/g)) keys.add(m[1]);
  keys.add("PROMPT_FULL_SLOT");
  const petMailTypes = [...code.MailsManager.match(/PET_MAIL_TYPE[\s\S]*?\n\s*\}/)[0].matchAll(/TypeReward\.TypeReward_(\w+)/g)].map(m => m[1]);
  for (const d of details) { keys.add(d.Title); keys.add(d.Content); }
  const spriteKeys = {}, gaps = [];
  function resource(name) {
    if (name in spriteKeys) return;
    const ref = resources.get(name);
    spriteKeys[name] = ref ? sprite(ref, `runtime:Mail:${name}`, "HudMail/ItemConfigs + ResourceRegisteration.asset") : null;
    if (!ref) gaps.push(`Resource ${name}: not registered`);
  }
  for (const m of code.HudMail.matchAll(/EResSprite\.(\w+)/g)) resource(m[1]);
  const itemIcons = Object.fromEntries([...code.ItemConfigs.match(/ITEM_ICON[\s\S]*?\{([\s\S]*?)\n\s*\}/)[1].matchAll(/ItemType\.(\w+):\s*EResSprite\.(\w+)/g)].map(m => [m[1], m[2]]));
  const itemRarities = Object.fromEntries([...code.ItemConfigs.match(/ITEM_RARITY[\s\S]*?\{([\s\S]*?)\n\s*\}/)[1].matchAll(/ItemType\.(\w+):\s*RarityEnum\.(\w+)/g)].map(m => [m[1], m[2].toUpperCase()]));
  const rarityColors = Object.fromEntries([...code.ItemConfigs.matchAll(/RarityEnum\.(\w+):\s*(#[\dA-Fa-f]+)/g)].map(m => [m[1].toUpperCase(), m[2]]));
  const notices = [...code.HudMail.match(/MAIL_NOTICE_TITLE[\s\S]*?\n\s*\}/)[0].matchAll(/LocString\{"(\w+)"/g)].map(m => m[1]);
  const contents = [...code.HudMail.match(/MAIL_NOTICE_CONTENT[\s\S]*?\n\s*\}/)[0].matchAll(/LocString\{"(\w+)"/g)].map(m => m[1]);
  // Explicit synthetic UI scenarios, never player mail or operational gift data.
  const fixtures = [
    { id: "currency", detailId: "1", daysLeft: 7, rewards: [{ type: "PetCoin", amount: 100 }, { type: "Dust", amount: 50 }, { type: "Spin", amount: 2 }] },
    { id: "random", detailId: "3", daysLeft: 1, rewards: [{ type: "RandomPet", rarity: "COMMON", amount: 1 }, { type: "Money", amount: 30100 }] },
    { id: "login", detailId: "2", daysLeft: 3, rewards: [] },
    { id: "pet", detailId: "5", daysLeft: 5, rewards: [{ type: "Pet", amount: 1, petId: pet.ID, icon: pet.Name, rarity: pet.Rarity, mutationIcon: mutation.Name, weatherIcons: [weather.Icon], badge: null }] },
    { id: "items", detailId: "3", daysLeft: 4, rewards: [{ type: "Mutagen", amount: 1, icon: mutation.Name }, { type: "WeatherGen", amount: 1, icon: weather.Icon }, { type: "DuplicateTicket", amount: 2 }, { type: "RandomSecretPool", amount: 1 }, { type: "MoneyTime", amount: 2 }] }
  ];
  for (const f of fixtures) for (const r of f.rewards) {
    resource(r.icon || (r.type === "RandomPet" ? `Summon${r.rarity}` : itemIcons[r.type]));
    for (const icon of [r.mutationIcon, ...(r.weatherIcons || [])].filter(Boolean)) resource(icon);
  }
  const contactUrl = code.HudMail.match(/\.ActiveText = "([^"]+)"/)[1];
  const suffixes = Object.fromEntries([...code.BigNumberHandler.match(/MONEY_SUFFIX[\s\S]*?\{([\s\S]*?)\n\s*\}/)[1].matchAll(/(\d+):\s*"([^"]*)"/g)].map(m => [m[1], m[2]]));
  const bindings = Object.fromEntries([...code.HudMail.matchAll(/func (\w+)\(/g)].map(m => [m[1], `Assets/Scripts/HUDs/HudMail.fcg:${code.HudMail.slice(0, m.index).split(/\r?\n/).length}`]));
  const runtimeAssignments = code.HudMail.split(/\r?\n/).flatMap((line, i) => { const m = line.match(/^\s*(.+?)<(\w+)>\.(\w+)\s*=\s*(.+)$/); return m ? [{ target: m[1], property: m[3], expression: m[4], source: `Assets/Scripts/HUDs/HudMail.fcg:${i + 1}` }] : []; });
  const loc = parseCsv(readFileSync(source("Assets/Localization/key.csv"), "utf8")), col = k => loc[0].indexOf(k);
  const entries = Object.fromEntries(loc.slice(1).filter(r => keys.has(r[col("Key")])).map(r => [r[col("Key")], { en: r[col("English")] || "", vi: r[col("Vietnamese")] || "" }]));
  const git = spawnSync("git", ["-C", source("."), "rev-parse", "HEAD"], { encoding: "utf8" });
  return { rules: { sourceCommit: git.stdout.trim(), uiSha256: hash(readFileSync(source("Assets/HUDs/Mail.ui"))), sourceFiles, widgetIds, constants, notices, contents, details, contactUrl, petMailTypes, spriteKeys, itemIcons, itemRarities, rarityColors, suffixes, bindings, runtimeAssignments, fixtures, fixturePolicy: "synthetic QA data; not server mail or giftcode config; pet fixture uses first road pet, whose obtain badge is nil", gaps: [...gaps, ...Object.entries(widgetIds).filter(([, id]) => !nodes.some(n => n.id === id)).map(([name]) => `Stale registration: ${name}`), "No engine screenshots; font/shader/scaler, input, hit order and scroll inertia unverified", "Server/database gating, reward granting and tooltip effects are not executed; loading switch is an isolated web scenario", "Config gift mail names are unavailable under current giftcode projection; never export operational Name", "Pet fixture covers one road pet with mutation/weather; other obtain badges are not exercised", "Source keeps selected index after claim, including out-of-range selection after last-item claim"] }, i18n: { source: "Assets/Localization/key.csv", entries, missing: [...keys].filter(k => !entries[k]).sort() } };
}

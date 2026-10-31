import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const at = process.argv.indexOf("--project-root");
if (at < 0 || !process.argv[at + 1]) throw new Error("Use --project-root <game checkout>");
const game = path.resolve(process.argv[at + 1]);
const output = path.join(root, "dist/data/ui/mail-composer.json");
const relative = path.relative(game, output);
if (!relative.startsWith(".." + path.sep) && relative !== ".." && !path.isAbsolute(relative)) throw new Error("Output cannot be inside game checkout");
const sourceFiles = [];
const read = file => { const text = readFileSync(path.join(game, file), "utf8"); sourceFiles.push({ file, sha256: createHash("sha256").update(text).digest("hex") }); return text; };
function csv(name) {
  const raw = read(`Assets/CSV/${name}.csv`), rows = []; let row = [], cell = "", quoted = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === '"') { if (quoted && raw[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
    else if (ch === "," && !quoted) { row.push(cell); cell = ""; }
    else if (/[\r\n]/.test(ch) && !quoted) { if (ch === "\r" && raw[i + 1] === "\n") i++; row.push(cell); if (row.some(Boolean)) rows.push(row); row = []; cell = ""; }
    else cell += ch;
  }
  row.push(cell); if (row.some(Boolean)) rows.push(row);
  return rows.slice(2).filter(r => r[0]).map(r => Object.fromEntries(rows[0].map((key, i) => [key, r[i] || ""])));
}
const gmtFile = "Assets/GMT/Scripts/HudMailsManager.fcg", gmt = read(gmtFile);
const managerFile = "Assets/Scripts/Manager/MailsManager.fcg", manager = read(managerFile);
const rewardFile = "Assets/Scripts/Manager/RewardManager.fcg", rewardCode = read(rewardFile);
const dataFile = "Assets/Scripts/Utils/DataUtils.fcg", dataCode = read(dataFile);
const editor = read("Temp/UGCLanguage/editorGen/EditorGenLib.fcc");
const enums = name => Object.fromEntries([...editor.match(new RegExp(`enum ${name}\\s*\\{([^}]+)\\}`))[1].matchAll(/(\w+)\s*=\s*(-?\d+)/g)].map(m => [m[1], Number(m[2])]));
const typeIds = enums("TypeReward"), valueKeys = enums("RewardValue");
for (const expected of ["func UpdatePendingMail(", '";{IC:"', '";RV:"', '";RA:"']) if (!gmt.includes(expected)) throw new Error("GMT source changed: " + expected);
for (const expected of ['StringToListIntV2(data[DataKey.Mail_RewardAmounts], ",")', 'rawData == "{}"']) if (!manager.includes(expected)) throw new Error("Mail parser changed: " + expected);
if (!dataCode.includes("func SplitTopLevelObjects(") || !dataCode.includes("func JsonStringToKeyValueV3(")) throw new Error("Mail format parser changed");
const snapshot = JSON.parse(readFileSync(path.join(root, "dist/data/config-snapshot.json"), "utf8"));
const baseline = JSON.parse(readFileSync(path.join(root, "dist/data/ui/mail-rules.json"), "utf8"));
const translations = JSON.parse(readFileSync(path.join(root, "dist/data/ui/collection-i18n.json"), "utf8")).entries;
const visuals = snapshot.visualAssets, spriteKeys = {}, sprites = [];
const reference = (name, url) => {
  if (!url || !existsSync(path.resolve(root, "dist", url))) return null;
  const key = `gdd://mail-composer/${name}`, png = readFileSync(path.resolve(root, "dist", url));
  spriteKeys[name] = key;
  sprites.push({ key, output: url, missing: false, border: { left: 0, right: 0, top: 0, bottom: 0 }, width: png.readUInt32BE(16), height: png.readUInt32BE(20), origins: ["GDD catalog snapshot; simulated mail"], references: [], declaredKeys: [] });
  return name;
};
const sameCatalogEntry = (table, row, key) => snapshot.tables.find(t => t.path === `Assets/CSV/${table}.csv`)?.rows.some(r => r.ID === row.ID && r[key] === row[key]);
const project = (rows, fields) => rows.map(r => Object.fromEntries(fields.map(k => [k, r[k]])));
const pets = project(csv("Pet"), ["ID", "Name", "Rarity"]).map(r => ({ ...r, label: translations[r.Name]?.vi || r.Name, icon: reference(`pet:${r.ID}`, sameCatalogEntry("Pet", r, "Name") ? visuals.petIcons?.[r.ID] : null) }));
const mutations = project(csv("mutation"), ["ID", "Name"]).map(r => ({ ...r, icon: reference(`mutation:${r.ID}`, sameCatalogEntry("mutation", r, "Name") ? visuals.mutationIcons?.[r.ID] : null) }));
const weathers = project(csv("weatherEffects"), ["ID", "Name", "Icon"]).map(r => ({ ...r, icon: reference(`weather:${r.ID}`, sameCatalogEntry("weatherEffects", r, "Icon") ? visuals.weatherEffectIcons?.[r.ID] : null) }));
const mutagens = project(csv("Mutagen"), ["ID", "Mutation", "Rarity"]);
const weatherGens = project(csv("WeatherGen"), ["ID", "WeatherEffect", "Rarity"]);
const details = csv("MailDetails").map(r => ({ ID: r.ID, Title: r.Title, Content: r.Content, label: baseline.details.some(d => d.ID === r.ID) ? r.Title : r.ID }));
const collectionSprites = JSON.parse(readFileSync(path.join(root, "dist/data/ui/collection-sprites.json"), "utf8")).sprites;
const randomIcons = Object.fromEntries([...new Set(pets.map(p => p.Rarity))].map(rarity => [rarity, reference(`random:${rarity}`, collectionSprites.find(s => s.key.endsWith(`/Summon/${rarity}.png`))?.output)]));
const schemas = [
  ["PetCoin", "Pet Coin", "scalar", "Currency"], ["Dust", "Dust", "scalar", "Currency"],
  ["Money", "Money", "money", "Currency"], ["MoneyTime", "Money theo giờ", "hours", "Hour"],
  ["Pet", "Pet cụ thể", "pet"], ["RandomPet", "Pet ngẫu nhiên theo độ hiếm", "random"],
  ["Mutagen", "Tinh chất đột biến", "mutagen", "Mutagen"], ["WeatherGen", "Máy tạo thời tiết", "weatherGen", "WeatherGen"],
  ["Spin", "Lượt quay", "scalar", "Spin"], ["DuplicateTicket", "Vé nhân bản", "scalar", "Currency"]
];
const types = schemas.map(([name, label, kind, valueKey]) => {
  if (!rewardCode.includes(`rewardType == TypeReward.TypeReward_${name}`)) throw new Error("Missing claim branch: " + name);
  const id = typeIds[`TypeReward_${name}`]; if (!Number.isInteger(id)) throw new Error("Missing reward enum: " + name);
  return { name, label, kind, id, valueKey: valueKey ? valueKeys[valueKey] : null };
});
const atLine = (file, text, pattern) => `${file}:${text.split(/\r?\n/).findIndex(l => l.includes(pattern)) + 1}`;
const result = { maxValidDays: Number(manager.match(/MAX_VALID_DATE int = (\d+)/)[1]), maxRewards: 5, maxRewardsSource: "user requirement; Mail.ui contains five reward widgets", isConfig: 0, sourceCommit: spawnSync("git", ["-C", game, "rev-parse", "HEAD"], { encoding: "utf8" }).stdout.trim(), sourceFiles, gddSnapshotCommit: snapshot.sourceCommit, types, valueKeys, randomIcons, pets, mutations, weathers, mutagens, weatherGens, details, suffixes: baseline.suffixes, rarityColors: baseline.rarityColors, rarities: [...new Set(pets.map(p => p.Rarity))], spriteKeys, sprites, bindings: { gmt: atLine(gmtFile, gmt, "func UpdatePendingMail("), parse: atLine(managerFile, manager, "func ExtractMailsData("), values: atLine(managerFile, manager, "func ExtractRewardValue("), claim: atLine(rewardFile, rewardCode, "func ClaimReward("), serializer: atLine(dataFile, dataCode, "func ListKeyValueToJsonString(") }, notes: ["GMT Update Pending Mails appends a mail; Update Mails still targets the deprecated store", "Adjacent nonempty RewardValues maps survive both outer and inner parsers; semicolon between maps truncates RV", "Source ListKeyValueToJsonString writes semicolons between maps on persistence; reconnect round-trip remains a source limitation", "MoneyTime uses integer hours because mail RA parser reads int", "RandomPet ClaimReward ignores RA and grants one pet per entry", "RandomSecretPool claim branch is a no-op; other unhandled types are excluded", "WeatherGen value is retained as string by ExtractRewardValue; engine cast to int has not been tested", "Icons reuse the existing GDD snapshot; source and snapshot commits may differ; no game/runtime execution"] };
writeFileSync(output, JSON.stringify(result, null, 2) + "\n");
console.log(`Mail composer: ${types.length} types, ${pets.length} pets, ${sprites.length} existing GDD icons`);

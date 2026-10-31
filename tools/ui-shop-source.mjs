import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";

export function shopRules(source, tree, sprite, parseCsv) {
  const sourceFiles = [];
  const read = file => { const text = readFileSync(source(file), "utf8"); sourceFiles.push({ file, sha256: createHash("sha256").update(text).digest("hex") }); return text; };
  const code = Object.fromEntries(["HUDs/HudShop", "Configs/ShopItemsConfigs", "Configs/RotationShopConfigs", "Manager/ShopItemsManager", "Manager/RotationShopManager", "Configs/RebirthConfigs", "Configs/PetConfigs", "Configs/MutagenConfigs", "Configs/MutationConfigs", "Configs/WeatherConfigs", "Configs/WeatherGenConfigs", "Utils/UIUtils", "Utils/BigNumberHandler"].map(f => [f.split("/").at(-1), read(`Assets/Scripts/${f}.fcg`)]));
  const csv = file => { const rows = parseCsv(read(`Assets/CSV/${file}.csv`)); return rows.slice(2).filter(r => r[0]).map(r => Object.fromEntries(rows[0].map((k, i) => [k, r[i] || ""]))); };
  const normal = csv("shopItems"), rotation = csv("RotationShopItems"), waves = csv("RotationShopWaves"), rebirth = csv("rebirth");
  const pets = csv("Pet"), mutagens = csv("Mutagen"), mutations = csv("mutation"), weathers = csv("weather"), effects = csv("weatherEffects"), gens = csv("WeatherGen");
  const raw = read("ProjectSettings/ResourceRegisteration.asset"), register = JSON.parse(raw.split(/\n\/\//)[0]).Resource;
  const resources = new Map();
  (function walk(n) { if (n.refer && n.scriptName) resources.set(n.scriptName, n.refer); (n.children || []).forEach(walk); })(register.texture);
  const widgetIds = Object.fromEntries(register.ui.children.find(n => n.scriptName === "Shop").children.map(n => [n.scriptName, n.id]));
  const editor = read("Temp/UGCLanguage/editorGen/EditorGenLib.fcc");
  const types = Object.fromEntries([...editor.match(/enum RSItemType\s*\{([^}]+)\}/)[1].matchAll(/(\w+)\s*=\s*(\d+)/g)].map(m => [m[2], m[1]]));
  const constants = Object.fromEntries([...code.HudShop.matchAll(/^\s+(\w+)(?: int)? = (#[\dA-Fa-f]{6,8}|\d+)\s*$/gm)].map(m => [m[1], m[2].startsWith("#") ? m[2] : Number(m[2])]));
  const maxRebirth = Number(code.ShopItemsManager.match(/MAX_REBIRTH_LEVEL_TO_BUY_PET int = (\d+)/)[1]);
  const petMultiplier = code.ShopItemsManager.match(/REBIRTH_PET_PRICE_MULTIPLIER float = ([\d.]+)/)[1];
  const rarityColors = Object.fromEntries([...code.PetConfigs.match(/RARITY_COLOR[^=]*=\s*Map[^\{]*\{([\s\S]*?)\n\s*\}/)[1].matchAll(/RarityEnum\.(\w+):\s*(#[\dA-Fa-f]+)/g)].map(m => [m[1].toUpperCase(), m[2]]));
  const suffixes = Object.fromEntries([...code.BigNumberHandler.match(/MONEY_SUFFIX[\s\S]*?\{([\s\S]*?)\n\s*\}/)[1].matchAll(/(\d+):\s*"([^"]*)"/g)].map(m => [m[1], m[2]]));
  const keys = new Set(), spriteKeys = {}, gaps = [];
  const nodes = [];
  (function walk(n) { nodes.push(n); if (n.text?.key) keys.add(n.text.key); n.children.forEach(walk); })(tree);
  function resource(name) {
    if (!name || name in spriteKeys) return;
    const ref = resources.get(name);
    if (!ref) { spriteKeys[name] = null; gaps.push(`Resource ${name}: not registered`); return; }
    spriteKeys[name] = sprite(ref, `runtime:Shop:${name}`, "HudShop/config + ResourceRegisteration.asset");
  }
  for (const m of code.HudShop.matchAll(/EResSprite\.(\w+)/g)) resource(m[1]);
  for (const m of (code.HudShop + code.RotationShopConfigs).matchAll(/LocString\{"([A-Z][A-Z0-9_]+)"/g)) keys.add(m[1]);
  const petIds = new Set(rebirth.filter(r => Number(r.ID) <= maxRebirth).flatMap(r => r.NextLevelMobList.split(",")).filter(Boolean));
  for (const r of rotation) if (types[r.Type] === "Pet") petIds.add(r.Value.split(";")[0]);
  const selectedPets = pets.filter(p => petIds.has(p.ID));
  for (const p of selectedPets) { keys.add(p.Name); resource(p.Name); }
  for (const r of normal) { keys.add(r.NameLocalize); keys.add(r.Description); resource(r.Name); }
  for (const r of rotation) {
    r.typeName = types[r.Type];
    if (r.typeName === "Pet") {
      const [id, mutation, weather] = r.Value.split(";"); const p = pets.find(p => p.ID === id);
      r.nameKey = p?.Name; r.icon = p?.Name; r.rarity = p?.Rarity;
      r.mutationIcon = mutations.find(m => m.ID === mutation && Number(m.ID) !== 1)?.Name;
      r.weatherIcon = effects.find(w => w.ID === weather)?.Icon;
    } else {
      const config = (r.typeName === "Mutagen" ? mutagens : r.typeName === "WeatherGen" ? gens : weathers).find(x => x.ID === r.Value);
      const effect = r.typeName === "Mutagen" ? mutations.find(m => m.ID === config?.Mutation) : r.typeName === "WeatherGen" ? effects.find(w => w.ID === config?.WeatherEffect) : config;
      r.icon = r.typeName === "Mutagen" ? effect?.Name : effect?.Icon;
      const nameEffect = r.typeName === "WeatherGen" ? weathers.find(w => w.ID === config?.WeatherEffect) : effect;
      r.nameKey = (r.typeName === "Mutagen" ? "MUTATION_" : "WEATHER_") + nameEffect?.Name.toUpperCase();
      r.rarity = config?.Rarity;
    }
    for (const name of [r.icon, r.mutationIcon, r.weatherIcon]) resource(name);
    if (r.nameKey) keys.add(r.nameKey);
  }
  for (const rarity of Object.keys(rarityColors)) keys.add(`RARITY_${rarity}`);
  const loc = parseCsv(readFileSync(source("Assets/Localization/key.csv"), "utf8")), col = k => loc[0].indexOf(k);
  const entries = Object.fromEntries(loc.slice(1).filter(r => keys.has(r[col("Key")])).map(r => [r[col("Key")], { en: r[col("English")] || "", vi: r[col("Vietnamese")] || "" }]));
  const bindings = Object.fromEntries(["RenderNormalItem", "RenderRotationItem", "RenderRebirthPet", "UpdateShopBalance", "SetBuyButtonAvailable", "UpdateNormalItemCooldownWidget", "OpenShop", "CloseShop", "UpdateNormalItemsLayoutPosition", "GetRotationPriceContent"].map(name => [name, `Assets/Scripts/HUDs/HudShop.fcg:${code.HudShop.split(/\r?\n/).findIndex(l => l.includes(`func ${name}(`)) + 1}`]));
  const runtimeAssignments = code.HudShop.split(/\r?\n/).flatMap((line, i) => { const m = line.match(/^\s*(.+?)<(\w+)>\.(\w+)\s*=\s*(.+)$/); return m ? [{ target: m[1], property: m[3], expression: m[4], source: `Assets/Scripts/HUDs/HudShop.fcg:${i + 1}` }] : []; });
  const git = spawnSync("git", ["-C", source("."), "rev-parse", "HEAD"], { encoding: "utf8" });
  const rules = { sourceCommit: git.stdout?.trim(), uiSha256: createHash("sha256").update(readFileSync(source("Assets/HUDs/Shop.ui"))).digest("hex"), sourceFiles, constants, maxRebirth, petMultiplier, rarityColors, suffixes, widgetIds, spriteKeys, bindings, runtimeAssignments, normal, rotation, waves, rebirth, pets: selectedPets, gaps: [...gaps, ...Object.entries(widgetIds).filter(([, id]) => !nodes.some(n => n.id === id)).map(([key]) => `Registered ${key} is stale; Shop widget resolved as BuyButton parent per HudShop`), "No engine screenshots: font/shader/scaler, scroll inertia and hit order unverified", "Wave selection, wallets, friend presence, stocks and purchases are local simulations; no server, pet spawning or UseItem gameplay", "Normal-item Requirement and gameplay success/target checks are not executed; buy is an explicit local UI simulation", "WeatherGen description preserves the unreachable duplicated Mutagen branch in source", "Native web scrolling; source section positions retained even when config exceeds source section height"] };
  return { rules, i18n: { source: "Assets/Localization/key.csv", entries, missing: [...keys].filter(k => !entries[k]).sort() } };
}

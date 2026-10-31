import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";

// Only Activities dependencies; no other HUDs or operational gift fields.
export function activitiesRules(source, tree, sprite, parseCsv) {
  const files = ["HUDs/HudActivities", "Manager/ActivitiesManager", "Configs/ActivitiesConfigs", "Configs/DailyRewardConfigs", "Manager/DailyRewardManager", "Configs/MilestoneConfig", "Configs/MailConfigs", "Configs/ItemConfigs", "Utils/UIUtils", "Utils/BigNumberHandler", "Utils/WeightedRandom", "Configs/PetConfigs", "Configs/MutationConfigs", "Configs/WeatherConfigs", "Configs/MutagenConfigs", "Configs/WeatherGenConfigs"];
  const code = Object.fromEntries(files.map(name => {
    const file = `Assets/Scripts/${name}.fcg`;
    return [name.split("/").at(-1), { file, text: readFileSync(source(file), "utf8") }];
  }));
  const hud = code.HudActivities;
  const constants = {};
  for (const match of hud.text.matchAll(/^\s+(\w+)(?: int)? = (#[\dA-Fa-f]{6,8}|\d+)\s*$/gm)) constants[match[1]] = match[2].startsWith("#") ? match[2] : Number(match[2]);
  const assignments = hud.text.split(/\r?\n/).flatMap((line, index) => {
    const m = line.match(/^\s*(.+?)<(\w+)>\.(Color|OutlineColor|ShadowColor|GradientTop|GradientBottom|SpriteName|SpriteResource|Content|IsVisible|SizeDelta|Priority|FillAmount)\s*=\s*(.+?)\s*$/);
    return m ? [{ target: m[1], widgetType: m[2], property: m[3], expression: m[4], source: `${hud.file}:${index + 1}` }] : [];
  });
  const rows = file => {
    const csv = parseCsv(readFileSync(source(`Assets/CSV/${file}`), "utf8"));
    return csv.slice(2).map(row => Object.fromEntries(csv[0].map((key, i) => [key, row[i] || ""])));
  };
  const dailyRewards = rows("DailyRewards.csv"), missions = rows("DailyMissions.csv"), events = rows("DailyEvent.csv"), spin = rows("loginReward.csv"), spins = rows("luckySpin.csv");
  const milestone = rows("milestone.csv").find(row => Number(row.ID) === constants.DAILY_MISSION_MILESTONE_ID);
  if (!milestone) throw new Error("Activities milestone config missing");
  const giftIds = new Set([...dailyRewards.map(r => r.Gift), ...events.map(r => r.Gift), ...spin.map(r => r.RewardId), ...milestone.Gift.split(";")]);
  const giftCsv = parseCsv(readFileSync(source("Assets/CSV/giftcode.csv"), "utf8"));
  const idAt = giftCsv[0].indexOf("ID"), rewardAt = giftCsv[0].indexOf("Reward");
  if (idAt < 0 || rewardAt < 0) throw new Error("Gift ID/Reward columns missing");
  const gifts = Object.fromEntries(giftCsv.slice(2).filter(row => giftIds.has(row[idAt])).map(row => [row[idAt], { ID: row[idAt], Reward: row[rewardAt] }]));
  const rewardIds = new Set(Object.values(gifts).flatMap(row => row.Reward.split(";")));
  const rewards = rows("reward.csv").filter(row => rewardIds.has(row.ID));
  const petRows = rows("Pet.csv");
  const editor = readFileSync(source("Temp/UGCLanguage/editorGen/EditorGenLib.fcc"), "utf8");
  const itemTypes = Object.fromEntries([...editor.match(/enum ItemType\s*\{([^}]+)\}/)[1].matchAll(/(\w+)\s*=\s*(\d+)/g)].map(m => [m[2], m[1]]));
  const keys = new Set();
  const nodes = [];
  (function walk(n) { nodes.push(n); if (n.text?.key) keys.add(n.text.key); n.children.forEach(walk); })(tree);
  for (const { text } of [hud, code.ActivitiesConfigs]) for (const m of text.matchAll(/LocString\{"([A-Z][A-Z0-9_]+)"/g)) keys.add(m[1]);
  for (const m of missions) { keys.add(m.Description); if (m.TargetCondition && !["Mutation", "Weather"].includes(m.TargetCondition)) keys.add(`RARITY_${m.TargetCondition.toUpperCase()}`); }
  const registerRaw = readFileSync(source("ProjectSettings/ResourceRegisteration.asset"), "utf8");
  const register = JSON.parse(registerRaw.includes("\n//") ? registerRaw.slice(0, registerRaw.lastIndexOf("\n//")) : registerRaw).Resource;
  const registeredSprites = new Map();
  (function walk(n) { if (n.refer && n.scriptName) registeredSprites.set(n.scriptName, n.refer); (n.children || []).forEach(walk); })(register.sprite || register.texture || {});
  // Resource keys may use a capitalized category in older checkouts.
  if (!registeredSprites.size) for (const [category, node] of Object.entries(register)) if (/sprite|texture/i.test(category)) (function walk(n) { if (n.refer && n.scriptName) registeredSprites.set(n.scriptName, n.refer); (n.children || []).forEach(walk); })(node);
  const activitiesRegistration = register.ui.children.find(n => n.scriptName === "Activities");
  const widgetIds = Object.fromEntries(activitiesRegistration.children.map(n => [n.scriptName, n.id]));
  const spriteKeys = {}, gaps = [];
  function resource(name) {
    if (!name || name in spriteKeys) return spriteKeys[name];
    const ref = registeredSprites.get(name);
    if (!ref) { spriteKeys[name] = null; gaps.push(`Resource ${name}: not registered`); return null; }
    spriteKeys[name] = sprite(ref, `runtime:Activities:${name}`, "runtime-code + ResourceRegisteration.asset");
    return spriteKeys[name];
  }
  for (const m of hud.text.matchAll(/EResSprite\.(\w+)/g)) resource(m[1]);
  const itemIcons = Object.fromEntries([...code.ItemConfigs.text.match(/ITEM_ICON[\s\S]*?\{([\s\S]*?)\n\s*\}/)[1].matchAll(/ItemType\.(\w+):\s*EResSprite\.(\w+)/g)].map(m => [m[1], m[2]]));
  const itemRarities = Object.fromEntries([...code.ItemConfigs.text.match(/ITEM_RARITY[\s\S]*?\{([\s\S]*?)\n\s*\}/)[1].matchAll(/ItemType\.(\w+):\s*RarityEnum\.(\w+)/g)].map(m => [m[1], m[2].toUpperCase()]));
  const rarityColors = Object.fromEntries([...code.ItemConfigs.text.matchAll(/RarityEnum\.(\w+):\s*(#[\dA-Fa-f]+)/g)].map(m => [m[1].toUpperCase(), m[2]]));
  const descriptionCode = code.ItemConfigs.text.slice(code.ItemConfigs.text.indexOf("func GetItemDescription"), code.ItemConfigs.text.indexOf("func GetItemIcon("));
  const descriptions = Object.fromEntries([...descriptionCode.matchAll(/itemType == ItemType\.(\w+)([\s\S]*?)(?=} else|$)/g)].flatMap(m => {
    const key = m[2].match(/LocString\{"(HUD_\w+)"/)?.[1];
    return key ? [[m[1], key]] : [];
  }));
  function labelColors(text, start, end, enumName) {
    const block = text.slice(text.indexOf(start), text.indexOf(end));
    return Object.fromEntries([...block.matchAll(new RegExp(`${enumName}\\.(\\w+)[\\s\\S]*?LocString\\{\\"\\[([\\dA-Fa-f]{6})\\]`, "g"))].map(m => [m[1].toUpperCase(), "#" + m[2]]));
  }
  const textColors = {
    base: "#" + descriptionCode.match(/\[([\dA-Fa-f]{6})\]/)[1],
    rarity: labelColors(code.PetConfigs.text, "func GetPetNameLocalizationColor(", "func GetPetNameLocalizationLightColor(", "RarityEnum"),
    mutation: labelColors(code.MutationConfigs.text, "func GetMutationNameLocalizationColor(", "func GetMutationNameLocalizationLightColor(", "MutationEnum"),
    weather: labelColors(code.WeatherConfigs.text, "func GetWeatherEffectNameLocalizationColor(", "func GetWeatherEffectNameColor(", "WeatherEffect")
  };
  const pets = {}, dynamicRewards = {};
  const mutagens = rows("Mutagen.csv"), weatherGens = rows("WeatherGen.csv"), mutations = rows("mutation.csv"), weathers = rows("weatherEffects.csv");
  for (const row of rewards) {
    const type = itemTypes[row.TypeReward], value = row.Value.split(";")[0];
    if (type === "Pet") {
      const pet = petRows.find(p => p.ID === value);
      if (pet) { pets[value] = pet; keys.add(pet.Name); resource(pet.Name); }
    } else if (type === "RandomPet") resource("Summon" + value);
    else if (type === "Mutagen" || type === "WeatherGen") {
      const config = (type === "Mutagen" ? mutagens : weatherGens).find(r => r.ID === value);
      const effect = (type === "Mutagen" ? mutations : weathers).find(r => r.ID === config?.[type === "Mutagen" ? "Mutation" : "WeatherEffect"]);
      const name = type === "Mutagen" ? effect?.Name : effect?.Icon;
      if (name) { resource(name); dynamicRewards[row.ID] = { icon: name, rarity: config.Rarity, nameKey: `MUTATION_${effect.Name.toUpperCase()}`, textColor: (type === "Mutagen" ? textColors.mutation : textColors.weather)[effect.Name.toUpperCase()] || textColors.base }; keys.add(dynamicRewards[row.ID].nameKey); }
      else gaps.push(`Reward ${row.ID}: ${type} config missing`);
    }
    else if (itemIcons[type]) resource(itemIcons[type]);
    else gaps.push(`Reward ${row.ID}: ${type} dynamic icon not bound`);
  }
  for (const row of missions) for (const id of row.RewardType.split("|")) if (itemIcons[itemTypes[id]]) resource(itemIcons[itemTypes[id]]);
  for (const rarity of Object.keys(rarityColors)) keys.add(`RARITY_${rarity}`);
  for (const key of Object.values(descriptions)) keys.add(key);
  const localization = parseCsv(readFileSync(source("Assets/Localization/key.csv"), "utf8"));
  const col = name => localization[0].indexOf(name);
  const entries = Object.fromEntries(localization.slice(1).filter(row => keys.has(row[col("Key")])).map(row => [row[col("Key")], { en: row[col("English")] || "", vi: row[col("Vietnamese")] || "" }]));
  const suffixes = Object.fromEntries([...code.BigNumberHandler.text.match(/MONEY_SUFFIX[\s\S]*?\{([\s\S]*?)\n\s*\}/)[1].matchAll(/(\d+):\s*"([^"]*)"/g)].map(m => [m[1], m[2]]));
  const managerConstants = Object.fromEntries([...code.ActivitiesManager.text.matchAll(/^\s*(MAX_LOGIN_REWARD\w*) = (\d+)/gm)].map(m => [m[1], Number(m[2])]));
  const sourceRef = pattern => {
    const index = hud.text.split(/\r?\n/).findIndex(line => line.includes(pattern));
    if (index < 0) throw new Error(`Activities binding missing: ${pattern}`);
    return `${hud.file}:${index + 1}`;
  };
  const git = spawnSync("git", ["-C", source("."), "rev-parse", "HEAD"], { encoding: "utf8" });
  const rules = {
    sourceCommit: git.status === 0 ? git.stdout.trim() : null,
    sourceFiles: [...Object.values(code), { file: "ProjectSettings/ResourceRegisteration.asset", text: registerRaw }, { file: "Temp/UGCLanguage/editorGen/EditorGenLib.fcc", text: editor }].map(({ file, text }) => ({ file, sha256: createHash("sha256").update(text).digest("hex") })),
    uiSha256: createHash("sha256").update(readFileSync(source("Assets/HUDs/Activities.ui"))).digest("hex"),
    constants, managerConstants, maxCycleDays: Number(code.ActivitiesConfigs.text.match(/MAX_DATES int = (\d+)/)[1]), runtimeAssignments: assignments, itemTypes, itemIcons, itemRarities, rarityColors, descriptions, suffixes, widgetIds, textColors,
    spriteKeys, pets, dynamicRewards, dailyRewards, missions, events, spin, spins, milestone, gifts, rewards,
    tabs: ["Rewards", "Missions", "Spin", "Event"].map((content, i) => ({ content, index: i, button: ["DailyRewardsTabButton", "DailyMissionsTabButton", "DailySpinTabButton", "DailyEventTabButton"][i], source: sourceRef("func SwitchTab(") })),
    bindings: { daily: sourceRef("func UpdateDailyRewardItem("), colors: sourceRef("func ApplyDailyRewardColors("), mission: sourceRef("func UpdateDailyMissionWidget("), milestone: sourceRef("func UpdateMilestoneRewards("), spin: sourceRef("func LoadConfigSpin("), event: sourceRef("func UpdateDailyEventItem("), reward: sourceRef("func SetGiftRewardByRewardId(") },
    gaps: [...new Set([...gaps, ...Object.entries(widgetIds).filter(([, id]) => !nodes.some(n => n.id === id)).map(([key, id]) => `Registered widget ${key} (${id}) is stale; not used by binder`), "No engine screenshots for parity; browser fallback font, shader/scaler and hit order unverified", "MoneyTime uses explicit simulated base income, never live player data", "Event tab remains inactive as serialized; its content can be inspected through the simulation panel", "Reward tooltip/effect, database gating and server requests are not executed", "Vertical scroll uses native web scrolling; engine inertia and scroll origin unverified", "Spin easing is a web approximation of the source tween curve"])]
  };
  return { rules, i18n: { source: "Assets/Localization/key.csv", entries, missing: [...keys].filter(key => !entries[key]).sort() } };
}

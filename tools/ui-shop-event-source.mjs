const root = "Assets/Scripts/";
export const shopEventSpec = {
  id: "shop-event", ui: "ShopEvent.ui", controller: root + "Events/HUD/HudShopEvent.fcg",
  files: ["Events/HUD/HudShopEvent", "Events/Core/EventShopConfigs", "Events/Core/EventShopManager", "Events/Core/EventCurrencyManager", "Events/Core/EventSettings", "Configs/PetConfigs", "Configs/MutationConfigs", "Configs/WeatherConfigs", "Configs/WeatherGenConfigs", "Configs/MutagenConfigs", "Configs/BaseColorConfigs", "Configs/MailConfigs", "Configs/RewardRandomConfig", "Configs/ItemConfigs", "Events/RarityContract/EventRarityContractConfigs", "Events/Meteorite/EventMeteoriteConfig", "Utils/BigNumberHandler", "Utils/UIUtils"].map(f => root + f + ".fcg"),
  localizationFiles: [root + "Events/Core/EventShopConfigs.fcg"],
  derive({ read, csv, code, resource, keys, gaps, giftRewards }) {
    const items = csv("Event/shopEventItems"), schedules = csv("Event/EventSchedule"), pets = csv("Pet"), mutations = csv("mutation"), effects = csv("weatherEffects"), mutagens = csv("Mutagen"), gens = csv("WeatherGen"), rewards = csv("reward");
    const editor = read("Temp/UGCLanguage/editorGen/EditorGenLib.fcc");
    const enums = name => Object.fromEntries([...(editor.match(new RegExp(`enum ${name}\\s*\\{([^}]+)\\}`))?.[1] || "").matchAll(/(\w+)\s*=\s*(\d+)/g)].map(m => [m[2], m[1]]));
    const types = enums("ItemType"), eventTypes = enums("EventType");
    // Operational columns never enter the derived model. Read only the two
    // authorized projected fields for gift IDs referenced by this HUD config.
    const links = giftRewards(new Set(items.filter(i => i.GiftId && !i.Behavior).map(i => i.GiftId)));
    const selected = new Map(links.map(x => [x.ID, x.Reward.split(/[,;|]/).filter(Boolean)]));
    const weatherNames = Object.fromEntries([...code[root + "Configs/WeatherConfigs.fcg"].matchAll(/WeatherEffect\.(\w+): LocString\{"(\w+)"/g)].map(m => [m[1], m[2]]));
    const mutationNames = Object.fromEntries([...code[root + "Configs/MutationConfigs.fcg"].matchAll(/MutationEnum\.(\w+): LocString\{"(\w+)"/g)].map(m => [m[1], m[2]]));
    const petCode = code[root + "Configs/PetConfigs.fcg"], rarityNames = Object.fromEntries([...petCode.matchAll(/RarityEnum\.(\w+): LocString\{"(RARITY_\w+)"/g)].map(m => [m[1].toUpperCase(), m[2]]));
    const colorsIn = (raw, condition) => Object.fromEntries([...raw.matchAll(new RegExp(`${condition} == (?:RarityEnum|MutationEnum|WeatherEffect)\\.(\\w+)[^\\n]*\\{[^\\n]*\\n\\s*(?:return |mutationNameColor = )LocString\\{\"\\[([A-Fa-f0-9]+)\\]`, "g"))].map(m => [m[1].toUpperCase(), m[2]]));
    const rarityTextColors = colorsIn(petCode.slice(petCode.indexOf("func GetRarityLocalizationColor"), petCode.indexOf("func GetRarityLocalizationLightColor")), "rarity");
    const mutationTextColors = colorsIn(code[root + "Configs/MutationConfigs.fcg"], "mutationId"), weatherTextColors = colorsIn(code[root + "Configs/WeatherConfigs.fcg"], "weatherEffectId");
    const makePet = id => {
      const p = pets.find(p => p.ID === id);
      if (!p) return null;
      const nameKey = (pets.find(b => p.Name.startsWith(b.Name + "_")) || p).Name;
      resource(p.Name); keys.add(nameKey); if (rarityNames[p.Rarity]) keys.add(rarityNames[p.Rarity]);
      return { id: p.ID, icon: p.Name, nameKey, rarity: p.Rarity, value: p.Value, price: p.Price };
    };
    const currency = code[root + "Events/Core/EventCurrencyManager.fcg"];
    const currencyIcons = Object.fromEntries([...currency.matchAll(/eventType == EventType\.(\w+)\s*\{\s*return EResSprite\.(\w+)/g)].map(m => [m[1], m[2]]));
    for (const icon of Object.values(currencyIcons)) resource(icon);
    for (const item of items) {
      item.kind = item.Behavior || "SpecialPet";
      const reward = rewards.find(r => r.ID === selected.get(item.GiftId)?.[0]);
      item.reward = reward || null;
      const type = types[reward?.TypeReward], id = reward?.Value?.split(";")[0];
      item.rewardType = type;
      if (type === "Pet") { const pet = makePet(id); if (pet) { item.pet = pet; Object.assign(item, { icon: pet.icon, nameKey: pet.nameKey, rarity: pet.rarity }); } }
      else if (type === "Mutagen") { const g = mutagens.find(g => g.ID === id), m = mutations.find(m => m.ID === g?.Mutation); item.icon = m?.Name; item.nameKey = mutationNames[m?.Name]; item.namePrefix = "HUD_ITEM_MUTAGEN"; item.nameColor = mutationTextColors[m?.Name.toUpperCase()]; item.rarity = g?.Rarity; }
      else if (type === "WeatherGen") { const g = gens.find(g => g.ID === id), e = effects.find(e => e.ID === g?.WeatherEffect); item.icon = e?.Icon; item.nameKey = weatherNames[e?.Name]; item.namePrefix = "HUD_ITEM_WEATHERGEN"; item.nameColor = weatherTextColors[e?.Name.toUpperCase()]; item.rarity = g?.Rarity; }
      if (item.Behavior) { item.icon = item.Behavior; item.nameKey = "HUD_SHOP_EVENT_ITEM_" + item.Behavior.replace(/([a-z])([A-Z])/g, "$1_$2").toUpperCase().replace("RANDOM_", "RANDOM"); item.detailKey = item.nameKey.replace("ITEM_", "DETAILS_"); }
      if (item.icon) resource(item.icon); else gaps.push(`Shop item ${item.ID}: gift reward unresolved by safe projection`);
      if (item.nameKey) keys.add(item.nameKey); if (item.detailKey) keys.add(item.detailKey);
      if (item.namePrefix) keys.add(item.namePrefix); if (rarityNames[item.rarity]) keys.add(rarityNames[item.rarity]);
    }
    const random = code[root + "Configs/RewardRandomConfig.fcg"], currentPool = random.match(/CURREWARDID\s*=\s*(\d+)/)?.[1];
    const randomPetPool = (csv("poolRewardSecret").find(r => r.ID === currentPool)?.Pool || "").split(";").filter(Boolean).map(id => { const pet = makePet(id); if (!pet) gaps.push(`Random pet pool ${currentPool}: unknown Pet ${id}`); return pet; }).filter(Boolean);
    const itemCode = code[root + "Configs/ItemConfigs.fcg"], itemIcons = Object.fromEntries([...(itemCode.match(/ITEM_ICON[^=]*=\s*Map[^\{]*\{([\s\S]*?)\n\s*\}/)?.[1] || "").matchAll(/ItemType\.(\w+):\s*EResSprite\.(\w+)/g)].map(m => [m[1], m[2]]));
    const itemRarities = Object.fromEntries([...(itemCode.match(/ITEM_RARITY[^=]*=\s*Map[^\{]*\{([\s\S]*?)\n\s*\}/)?.[1] || "").matchAll(/ItemType\.(\w+):\s*RarityEnum\.(\w+)/g)].map(m => [m[1], m[2].toUpperCase()]));
    const randomItemPool = csv("PoolRandomItem").map(({ ID, Type, Value }) => { const type = types[Type], icon = itemIcons[type]; if (icon) resource(icon); else gaps.push(`Random item ${ID}: unsupported ItemConfigs icon for ${type}`); return { id: ID, type, icon, rarity: itemRarities[type], value: Value }; });
    const timeCode = code[root + "Utils/UIUtils.fcg"], eventSettings = code[root + "Events/Core/EventSettings.fcg"];
    const timeUnits = ["YEAR", "MONTH", "DAY", "HOUR", "MINUTE", "SECOND"].map(unit => { keys.add(`TIME_${unit}`); keys.add(`TIME_${unit}S`); return { unit, seconds: unit === "SECOND" ? 1 : Number(timeCode.match(new RegExp(`SECONDS_PER_${unit} int = (\\d+)`))?.[1]) }; });
    const timeParts = Number(eventSettings.match(/TIME_FORMAT_MODE_FULL int = (\d+)/)?.[1]), shopExtendSeconds = Number(eventSettings.match(/SHOP_EXTEND_SECONDS int = (\d+)/)?.[1]);
    const rarityTasks = csv("Event/RarityContract/RarityDailyTask");
    const meteorite = code[root + "Events/Meteorite/EventMeteoriteConfig.fcg"], number = name => Number(meteorite.match(new RegExp(`${name} int = (\\d+)`))[1]);
    const meteoriteTasks = [{ ID: "fish", TaskType: "1", Target: number("METEORITE_TASK_TARGET"), Reward: number("METEORITE_TASK_REWARD") }, { ID: "dig", TaskType: "2", Target: number("METEORITE_TASK_TARGET"), Reward: number("METEORITE_TASK_REWARD") }];
    const specialIncomeFormat = code[root + "Events/HUD/HudShopEvent.fcg"].match(/var income = LocString\{"([^"]+)"/)?.[1];
    const itemNameFormat = code[root + "Configs/WeatherGenConfigs.fcg"].match(/return LocString\{"(\[324765\][^"]+)"/)?.[1];
    return { items, randomPetPool, randomItemPool, currentPool, rarityNames, rarityTextColors, specialIncomeFormat, itemNameFormat, timeUnits, timeParts, shopExtendSeconds, rarityTasks, meteoriteTasks, hitCap: number("METEORITE_HIT_DAILY_GEM_CAP"), schedules: schedules.map(s => ({ ...s, eventName: eventTypes[s.EventType], currencyIcon: currencyIcons[eventTypes[s.EventType]] || "GemstoneIcon" })) };
  },
  gaps: ["Task server progress, dynamic rarity missions, reward draws, BaseColor unlocks and submit validation are not executed; daily task progress is an explicit local scenario"]
};

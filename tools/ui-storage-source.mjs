const controller = "Assets/Scripts/HUDs/HudPetStorage.fcg";
const petFile = "Assets/Scripts/Configs/PetConfigs.fcg";
const mutationFile = "Assets/Scripts/Configs/MutationConfigs.fcg";

export const storageSpec = {
  id: "storage", name: "Storage", ui: "PetStorage.ui", controller,
  files: [controller, petFile, mutationFile, "Assets/Scripts/Configs/WeatherConfigs.fcg", "Assets/Scripts/Configs/RebirthConfigs.fcg", "Assets/Scripts/Utils/BigNumberHandler.fcg"],
  derive({ read, csv, code, resource, keys }) {
    const pets = csv("Pet").map(({ ID, Name, Rarity, Value, Price, Rank }) => ({ ID, Name, Rarity, Value, Price, Rank }));
    const mutations = csv("mutation"), effects = csv("weatherEffects"), rebirth = csv("Rebirth").map(({ ID, Storage }) => ({ ID, Storage }));
    const uiUtils = read("Assets/Scripts/Utils/UIUtils.fcg"), manager = read("Assets/Scripts/Manager/StorageManager.fcg");
    for (const m of uiUtils.slice(uiUtils.indexOf("func UpdatePetWidgetV3"), uiUtils.indexOf("func UpdatePassiveWidget")).matchAll(/EResSprite\.(\w+)/g)) resource(m[1]);
    const rarityNames = Object.fromEntries([...code[petFile].matchAll(/RarityEnum\.(\w+): LocString\{"(RARITY_\w+)"/g)].map(m => [m[1].toUpperCase(), m[2]]));
    Object.values(rarityNames).forEach(k => keys.add(k));
    const rarityTextColors = Object.fromEntries([...code[petFile].slice(code[petFile].indexOf("func GetRarityLocalizationColor"), code[petFile].indexOf("func GetRarityLocalizationLightColor")).matchAll(/rarity == RarityEnum\.(\w+)[^\n]*\{[^\n]*\n\s*return LocString\{"\[([A-Fa-f0-9]+)\]/g)].map(m => [m[1].toUpperCase(), "#" + m[2]]));
    pets.forEach(p => { resource(p.Name); const base = pets.find(r => p.Name.startsWith(r.Name + "_")) || p; p.nameKey = base.Name; keys.add(p.nameKey); });
    mutations.filter(r => r.Name !== "Normal").forEach(r => resource(r.Name));
    effects.forEach(r => resource(r.Icon));
    ["TIME_HOUR", "TIME_HOURS", "TIME_MINUTE", "TIME_MINUTES", "TIME_SECOND", "TIME_SECONDS"].forEach(k => keys.add(k));
    const bindings = Object.fromEntries([...Object.entries(code), ["Assets/Scripts/Utils/UIUtils.fcg", uiUtils]].flatMap(([file, raw]) => [...raw.matchAll(/(?:async )?func (\w+)\(/g)].map(m => [m[1], `${file}:${raw.slice(0, m.index).split(/\r?\n/).length}`])));
    return { pets, mutations, effects, rebirth, rarityNames, rarityTextColors,
      bindings,
      lockDuration: Number(manager.match(/LOCK_DURATION int = (\d+)/)?.[1]),
      fixtures: Object.values(Object.fromEntries(pets.map(p => [p.Rarity, p]))).map(p => ({ petId: p.ID, level: 1, mutationId: "1", weatherIds: [], locked: false })),
      fixturePolicy: "Synthetic local storage, level-one pets sampled from each Pet.csv rarity; no player storage read. Capacity override is QA only, source capacity comes from Rebirth.csv"
    };
  },
  gaps: ["Fixtures cover Pet.csv normal pets at level 1; secret fusion pets, lucky boxes and special eggs are not exercised", "Level-one income is derived from CSV value and additive mutation/weather multipliers; higher-level BigNumber growth/rounding is not simulated", "Store/retrieve and lock age are local scenarios; no database writes or gameplay rewards", "Capacity above current Rebirth.csv maximum is an explicit synthetic QA override for pagination"]
};

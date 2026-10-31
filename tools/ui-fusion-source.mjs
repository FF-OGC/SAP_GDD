const base = "Assets/Scripts/";
const manager = base + "Manager/FusionManager.fcg", pets = base + "Configs/PetConfigs.fcg";
const commonFiles = [manager, pets, base + "Utils/UIUtils.fcg", base + "Utils/BigNumberHandler.fcg"];
function deriveFusion({ read, csv, code, resource, keys, constants, gaps }) {
  const petCode = code[pets], managerCode = code[manager];
  const number = name => Number(petCode.match(new RegExp(`${name} int = (\\d+)`))[1]);
  const petRows = csv("Pet").filter(p => +p.ID <= number("PET_COUNT") || (+p.ID > number("SECRET_FUSION_PET_START_INDEX") && +p.ID <= number("SECRET_FUSION_PET_START_INDEX") + number("SECRET_FUSION_PET_COUNT")));
  const separator = petCode.match(/PET_SKIN_SEPARATOR string = "([^"]+)"/)[1];
  for (const p of petRows) { const baseName = p.Name.split(separator)[0]; p.nameKey = petRows.some(row => row.Name === baseName) ? baseName : p.Name; keys.add(p.nameKey); resource(p.Name); }
  for (const name of ["ItemBG", "EmptyItemBG", "DustIcon", "PetCoinIcon"]) resource(name);
  const map = (text, name) => Object.fromEntries([...(text.match(new RegExp(`${name}[^=]*=[^\\{]*\\{([\\s\\S]*?)\\n\\s*\\}`))?.[1] || "").matchAll(/RarityEnum\.(\w+):\s*(\d+)/g)].map(m => [m[1].toUpperCase(), +m[2]]));
  const chances = [...code[base + "HUDs/HudFusionConfirm.fcg"]?.matchAll(/chancePercent (>=|>) ([\d.]+)[\s\S]*?LocString\{"(HUD_FUSION_\w+)"[\s\S]*?chanceCount = (\d+)/g) || []].map(m => ({ operator: m[1], threshold: +m[2], key: m[3], count: +m[4] }));
  for (const tier of chances) keys.add(tier.key);
  keys.add("HUD_FUSION_IMPOSSIBLE"); keys.add("PROMPT_NOT_ENOUGH_DUST");
  const actions = read(base + "Utils/CustomUIUtils.fcg");
  constants.FUSION_DUST_ADJUSTMENT_STEP = +actions.match(/FUSION_DUST_ADJUSTMENT_STEP(?: int)? = (\d+)/)[1];
  constants.rankChanceScalar = +managerCode.match(/rankUpChance float = 1\.0 \/ \(1 \+ ([\d.]+) \* diffRank\)/)[1];
  constants.FUSION_COST_MULTIPLIER = +managerCode.match(/FUSION_COST_MULTIPLIER = (\d+)/)[1];
  constants.RETRIEVE_COST_MULTIPLIER = +managerCode.match(/RETRIEVE_COST_MULTIPLIER = (\d+)/)[1];
  constants.BASE_SECRET_RATE = +managerCode.match(/BASE_SECRET_RATE = (\d+)/)[1];
  const zeroDustCapPets = petRows.filter(p => +p.ID > number("SECRET_FUSION_PET_START_INDEX") && !Number(p.DustCap)).map(p => p.ID);
  if (zeroDustCapPets.length) gaps.push(`Source secret pet rows have blank/zero DustCap: ${zeroDustCapPets.join(", ")}; zero denominator follows BigNumberHandler fallback 0, no cap is invented`);
  return { pets: petRows, entrySecret: map(managerCode, "ENTRY_SECRET_PET"), dustYield: map(managerCode, "RARITY_DUST_YIELD"), rarityIndex: map(petCode, "RARITY_INDEX"), chances,
    zeroDustCapPets,
    fixturePolicy: "Two selectable source pet rows with no mutation/weather/passive; wallet, timestamps and result selection are synthetic scenarios" };
}
const gaps = ["Mutation/weather inheritance and Purebred passive reduction are not simulated; all fixture pets are base level with no mutation/weather/passive", "Mutation percentages are hidden, matching ordinary player capability; GMT rate view is outside this preview", "Hatching, selection ownership, reward/retrieve server requests and pet tooltip popup are not executed"];
export const fusionConfirmSpec = { id: "fusion-confirm", nonGridLayout: "serialized", name: "Fusion · Confirm", ui: "FusionConfirm.ui", controller: base + "HUDs/HudFusionConfirm.fcg", files: [base + "HUDs/HudFusionConfirm.fcg", ...commonFiles], runtimeFiles: [manager, pets], derive: deriveFusion, gaps };
export const fusionResultSpec = { id: "fusion-result", nonGridLayout: "serialized", name: "Fusion · Result", ui: "FusionResult.ui", controller: base + "HUDs/HudFusionResult.fcg", files: [base + "HUDs/HudFusionResult.fcg", base + "HUDs/HudFusionConfirm.fcg", ...commonFiles], runtimeFiles: [manager, pets], derive: deriveFusion, gaps };

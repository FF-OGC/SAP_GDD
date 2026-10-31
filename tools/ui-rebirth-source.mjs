const base = "Assets/Scripts/";
const controller = base + "HUDs/HudRebirth.fcg", feature = base + "Configs/FeatureUnlockConfigs.fcg";
export const rebirthSpec = {
  id: "rebirth", name: "Rebirth", ui: "Rebirth.ui", controller,
  files: [controller, ...["Configs/RebirthConfigs", "Configs/PetConfigs", "Configs/FeatureUnlockConfigs", "Manager/RebirthManager", "Utils/BigNumberHandler", "Utils/UIUtils"].map(f => base + f + ".fcg")],
  derive({ csv, code, resource, keys, gaps }) {
    const levels = csv("rebirth"), allPets = csv("Pet"), ids = new Set(levels.flatMap(l => l.NextLevelMobList.split(",")).filter(Boolean)), pets = allPets.filter(p => ids.has(p.ID));
    for (const p of pets) { p.nameKey = (allPets.find(b => p.Name.startsWith(b.Name + "_")) || p).Name; keys.add(p.nameKey); resource(p.Name); }
    const icons = Object.fromEntries([...code[controller].matchAll(/RebirthRewardType\.(\w+): EResSprite\.(\w+)/g)].map(m => [m[1], m[2]]));
    const labels = Object.fromEntries([...code[controller].matchAll(/RebirthRewardType\.(\w+): LocString\{"(\w+)"/g)].map(m => [m[1], m[2]]));
    Object.values(icons).forEach(resource);
    resource("ItemBG");
    const unlocks = {};
    for (const m of code[feature].matchAll(/(?:if|else if) (featureId[^\{]+)\{\s*return (\d+)/g)) for (const f of m[1].matchAll(/FEATURE_(\w+)/g)) unlocks[f[1]] = Number(m[2]);
    const moneyRank = raw => { const n = Number(raw), group = Math.floor(n / 10000), prefix = Math.floor(n % 10000 / 10), decimal = n % 10; return group <= 1 ? String(prefix) : String(BigInt(prefix * 10 + decimal) * (10n ** BigInt((group - 1) * 3 - 1))); };
    for (let i = 0; i < levels.length; i++) {
      const current = levels[i], next = levels[i + 1]; current.rewards = []; current.maxMoneyValue = moneyRank(current.MaxMoney);
      if (!next) continue;
      const add = (type, value) => current.rewards.push({ type, value, icon: icons[type], label: labels[type] });
      if (current.MoneyMultiplier !== next.MoneyMultiplier) add("CashIncome", next.MoneyMultiplier);
      if (current.BaseLockTime !== next.BaseLockTime) add("LockDuration", next.BaseLockTime);
      if (Number(next.MobAmount) > Number(current.MobAmount)) add("PetSlots", Number(next.MobAmount) - Number(current.MobAmount));
      if (unlocks.SWAP === Number(next.ID)) add("Swap", true);
      if (unlocks.FUSION === Number(next.ID)) add("Fusion", true);
      for (const rarity of ["EPIC", "LEGENDARY", "MYTHIC", "APEX", "LIMITED"]) if (unlocks["STEAL_" + rarity] === Number(next.ID)) { keys.add("RARITY_" + rarity); add("Steal", "RARITY_" + rarity); }
      if (unlocks.PORTALS === Number(next.ID)) add("Portal", true);
      if (current.MaxMoney !== next.MaxMoney) add("ExtendMoney", moneyRank(next.MaxMoney));
      if (Number(next.Storage) > Number(current.Storage)) add("Storage", next.Storage);
    }
    gaps.push("ConfirmWidget and legacy max-level label registrations may be stale: current Rebirth.ui contains Rebirth and UnlockContent only; no invented canvas confirm dialog");
    return { levels, pets, icons, labels, unlocks, rewardPolicy: "RebirthManager.GetNextRebirthRewards; first six visible per source capacity, map enumeration order uses source insertion order on web" };
  }
};

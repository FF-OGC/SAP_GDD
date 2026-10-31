const base = "Assets/Scripts/", controller = base + "HUDs/HudPermanentEvent.fcg", dig = base + "Configs/EventDigConfig.fcg", pets = base + "ClientConfigs/PetConfigs_Client.fcg", utils = base + "Utils/UIUtilsClient.fcg";
export const permanentSpec = {
  id: "permanent-event", name: "Permanent Event · Dig / Fish", ui: "PermanentEvent.ui", controller,
  files: [controller, base + "Player/PlayerEventDig.fcg", base + "Player/PlayerFishingClient.fcg", dig, pets, utils, base + "Utils/BigNumberHandlerClient.fcg"],
  derive({ csv, code, resource, keys }) {
    const rows = csv("Pet"), digIds = csv("Event/Dig/DigPools").map(p => p.IDPET), fishIds = csv("Event/Fishing/PoolFishing").map(p => p.IDPET);
    const start = +code[pets].match(/SECRET_FUSION_PET_START_INDEX int = (\d+)/)[1], count = +code[pets].match(/SECRET_FUSION_PET_COUNT int = (\d+)/)[1];
    const fixtures = Object.fromEntries([["Dig", digIds], ["Fish", fishIds]].map(([type, ids]) => [type, rows.filter(p => ids.includes(p.ID)).slice(0, 2).map(p => ({ ...p, obtainIcon: +p.ID > start && +p.ID <= start + count ? "FusionSecret" : fishIds.includes(p.ID) ? "FishIcon" : "DigIcon" }))]));
    for (const p of Object.values(fixtures).flat()) { resource(p.Name); keys.add(p.Name); }
    for (const name of ["DigIcon", "FishIcon", "Dirt", "Tidal", "FusionSecret"]) resource(name);
    const map = (raw, name, pattern) => Object.fromEntries([...(raw.match(new RegExp(`${name}[^=]*=[^\\{]*\\{([\\s\\S]*?)\\n\\s*\\}`))?.[1] || "").matchAll(pattern)].map(m => [m[1].toUpperCase(), +m[2]]));
    const power = map(code[dig], "DIG_MASH_POWER", /RarityEnum\.(\w+):\s*([\d.]+)/g), drift = map(code[dig], "DIG_MASH_DRIFT_SPEED", /RarityEnum\.(\w+):\s*([\d.]+)/g);
    const widths = map(code[utils], "CHARACTER_WIDTH", /(\d+):\s*([\d.]+)/g);
    return { fixtures, digPower: power, digDrift: drift, characterWidths: widths, fixturePolicy: "First two source pool pets, base level, no mutation/weather; synthetic nearby spot of matching COMMON scan/spot tier, inventory ownership, purchases and reward outcomes" };
  },
  gaps: ["Attack control device position/size are unavailable; serialized action control geometry is retained instead of inventing engine default dimensions", "Dig/Fish world targeting, camera/water/spot checks, server RNG and requests are simulated; reward selection is a labelled local scenario", "Only same COMMON scan/spot tier is exercised in Dig hitbar; other tier-gap multipliers and Fish difficulty overrides are not simulated", "3D animations, world assets, tween easing, default attack hiding and real inventory authority are outside the static canvas", "Legacy registered aliases Event/MashMeter can be stale; source tree remains authoritative"]
};

const controller = "Assets/Scripts/HUDs/HudLobby.fcg";
const weatherFile = "Assets/Scripts/Configs/WeatherConfigs.fcg";
const currencyFile = "Assets/Scripts/Events/Core/EventCurrencyManager.fcg";

export const lobbySpec = {
  id: "lobby", name: "Lobby", ui: "Lobby.ui", controller,
  files: [controller, weatherFile, currencyFile, "Assets/Scripts/Configs/FeatureUnlockConfigs.fcg"],
  derive({ read, csv, code, resource, keys, constants }) {
    read("Assets/Scripts/Utils/UIUtils.fcg");
    const weather = csv("Weather"), effects = csv("weatherEffects");
    const weatherNames = Object.fromEntries([...code[weatherFile].matchAll(/WeatherType\.(\w+): LocString\{"(\w+)"/g)].map(m => [m[1], m[2]]));
    const effectNames = Object.fromEntries([...code[weatherFile].matchAll(/WeatherEffect\.(\w+): LocString\{"(\w+)"/g)].map(m => [m[1], m[2]]));
    weather.forEach(r => { resource(r.Icon); if (weatherNames[r.Name]) keys.add(weatherNames[r.Name]); });
    effects.forEach(r => { resource(r.Icon); if (effectNames[r.Name]) keys.add(effectNames[r.Name]); });
    const eventIcons = Object.fromEntries([...code[currencyFile].matchAll(/eventType == EventType\.(\w+)\s*\{\s*return EResSprite\.(\w+)/g)].map(m => [m[1], m[2]]));
    Object.values(eventIcons).forEach(resource);
    const details = [
      { type: "EventDigMeteorite", icon: "Meteorite", title: "HUD_TITLE_EVENT_METEORITE", obtain: "HUD_OBTAIN_METEORITE", reward: "HUD_REWARD_DETAIL_METEORITE" },
      { type: "EventWhackAMole", icon: "MoleEmerge", title: "HUD_TITLE_EVENT_WHACK_A_MOLE", obtain: "HUD_OBTAIN_GEM_MOLE", reward: "HUD_REWARD_DETAIL_GEM_MOLE" },
      { type: "EventStealABall", icon: "FootBallEvent", title: "HUD_TITLE_EVENT_STEAL_A_BALL", obtain: "HUD_OBTAIN_GEM_BALL", reward: "HUD_REWARD_DETAIL_GEM_BALL" },
      { type: "EventKickBall", icon: "FootBallEvent", title: "HUD_TITLE_EVENT_KICK_A_BALL", obtain: "HUD_OBTAIN_GEM_KICK_BALL", reward: "HUD_REWARD_DETAIL_GEM_KICK_BALL" }
    ];
    details.forEach(r => { resource(r.icon); [r.title, r.obtain, r.reward].forEach(k => keys.add(k)); });
    return { weather, effects, weatherNames, effectNames, eventIcons, details,
      featureUnlockLevel: Number(code["Assets/Scripts/Configs/FeatureUnlockConfigs.fcg"].match(/FEATURE_EVENT_HUD[^\n]*\{\s*return (\d+)/)?.[1] || 6),
      bossDurationMs: Number(code[controller].match(/WaitForMillisecond\((\d+)\)\s*if currentTurn == _BossTeleTurn/)?.[1]),
      fixturePolicy: "Weather/event selections, countdown duration, player names, data readiness and contextual buttons are synthetic local scenarios; active event schedule is not asserted"
    };
  },
  gaps: ["Database/onboarding/revival gating is exposed as local readiness; no player data read", "External teleport, lucky spin, profile and social effects are reported as simulation only", "Popup sprite/content and weather/event duration are local test inputs; engine tween curves are not reproduced", "Active-event ordering is supplied by the local scenario; live schedule and weekend clock are not queried"]
};

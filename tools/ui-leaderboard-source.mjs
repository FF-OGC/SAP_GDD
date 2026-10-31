const base = "Assets/Scripts/";
export const leaderboardSpec = {
  id: "leaderboard", name: "Leaderboard", ui: "Leaderboard.ui", controller: base + "HUDs/HudLeaderboard.fcg",
  files: [base + "HUDs/HudLeaderboard.fcg", base + "Manager/LeaderboardManager.fcg", base + "Utils/BigNumberHandler.fcg"],
  derive({ code }) {
    const source = code[base + "HUDs/HudLeaderboard.fcg"];
    const tabs = [...source.matchAll(/_TabButtons\[LeaderboardType\.(\w+)\] = GetChildByName\(tabsLayout, "(\w+)"/g)].map(m => ({ type: m[1], widget: m[2] }));
    // Intentionally synthetic scores; do not query any player's leaderboard.
    return { tabs, fixturePolicy: "Synthetic top-ten rank-score values, player rank and loading/empty modes; no server leaderboard or accounts read", fixtures: Array.from({ length: 10 }, (_, i) => ({ rank: i + 1, moneyRankScore: 30000 + 1000 - i * 37, collection: 100 - i * 3, likes: 12345 - i * 29 })) };
  },
  gaps: ["UIProfile is a native account widget; account avatar/name rendering unavailable without server data, serialized props retained and AccountID shown in Inspector", "Synthetic rows are already ranked inputs; server cache, timing, anti-cheat, ranking calculations and database responses are not executed"]
};

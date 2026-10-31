"use strict";
function initLeaderboardPreview(screen, rules, rendered) {
  const t = uiSourceTools(screen, rules, rendered), { key, child, text, visible, image, color } = t;
  const state = { type: rules.tabs[0].type, mode: "populated", rank: 1, score: 31000, closed: false };
  t.controls('<label>Dữ liệu <select data-leaderboard="mode"><option value="populated">Top 10 mô phỏng</option><option value="empty">Trống</option><option value="loading">Đang tải</option></select></label><label>Hạng của tôi <input data-leaderboard="rank" type="number" min="0" value="1"></label><label>Score của tôi <input data-leaderboard="score" type="number" value="31000"></label><p>Avatar/tên tài khoản là widget native của game, chưa có dữ liệu tài khoản để dựng trên web.</p>', el => { const field = el.dataset.leaderboard; if (field) { state[field] = field === "mode" ? el.value : Number(el.value) || 0; render(); } });
  function score(raw) {
    if (["Income", "Wealth"].includes(state.type)) { const suffix = Math.floor(raw / 10000), prefix = Math.floor(raw % 10000 / 10), decimal = raw % 10; return `$${prefix}.${decimal} ${rules.suffixes[suffix] || ""}` + (state.type === "Income" ? "/s" : ""); }
    if (state.type === "Like") return String(raw).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return String(raw);
  }
  function profile(el, account) { visible(el, !!account, "UpdateRankWidget"); t.record(el, "AccountID", account, "UpdateRankWidget"); }
  function render() {
    for (const tab of rules.tabs) { const button = t.find(tab.widget), selected = tab.type === state.type; image(button, selected ? "SelectTabBG" : "NormalTabBG", "SwitchLeaderboardTab"); color(child(button, "Text"), selected ? rules.constants.ACTIVE_TEXT_COLOR : rules.constants.DEFAULT_TEXT_COLOR, "SwitchLeaderboardTab"); }
    visible(key("LoadingLabel"), state.mode === "loading", "UpdateLeaderboardLayout"); visible(key("DetailsWidget"), state.mode !== "loading", "UpdateLeaderboardLayout");
    [...(key("RanksLayout")?.children || [])].forEach((el, i) => {
      const fixture = state.mode === "populated" ? rules.fixtures[i] : null;
      const raw = state.type === "Collection" ? fixture?.collection : state.type === "Like" ? fixture?.likes : fixture?.moneyRankScore;
      text(child(el, "Score"), fixture ? score(raw) : "", "UpdateRankWidget"); profile(child(el, "Avatar"), fixture ? `synthetic-rank-${fixture.rank}` : "");
    });
    const mine = key("CurrentRank"), rankNumber = child(mine, "RankNumber"), icon = child(rankNumber, "Icon"), label = child(rankNumber, "Text");
    profile(child(mine, "Avatar"), "synthetic-current-player"); text(child(mine, "Score"), score(state.score), "UpdateRankWidget");
    visible(icon, state.rank >= 1 && state.rank <= 3, "UpdateRankWidget"); visible(label, state.rank < 1 || state.rank > 3, "UpdateRankWidget");
    if (state.rank >= 1 && state.rank <= 3) image(icon, `RankNo${state.rank}`, "UpdateRankWidget"); text(label, state.rank > 0 ? state.rank : "120+", "UpdateRankWidget");
    rendered.canvas.classList.toggle("ui-closed", state.closed); t.refresh();
  }
  rendered.canvas.addEventListener("click", e => { const button = e.target.closest("button"), tab = rules.tabs.find(tab => tab.widget === button?.dataset.uiName); if (tab) { state.type = tab.type; render(); } if (button?.dataset.uiName === "CloseButton") { state.closed = true; render(); } });
  render(); return { state, render, dispose() { t.panel.onchange = null; } };
}

"use strict";

function initLobbyPreview(screen, rules, rendered) {
  const t = uiSourceTools(screen, rules, rendered), c = rules.constants;
  const state = { weather: rules.weather[0]?.ID || "", event: rules.details[0]?.type || "", duration: 300, ready: true, weekend: false, context: "", details: "", elapsed: 0 };
  const timer = widget => t.child(t.child(t.key(widget), "Timer"), "Label");
  const format = (seconds, compact = false) => { seconds = Math.max(0, Math.floor(seconds)); const pad = value => String(value).padStart(2, "0"), days = Math.floor(seconds / 86400), hours = Math.floor(seconds / 3600) % 24, minutes = Math.floor(seconds / 60) % 60; if (compact) return days ? `${days}d` : hours ? `${pad(hours)}h` : `${pad(minutes)}m`; return days ? `${days}d ${pad(hours)}:${pad(minutes)}` : hours ? `${pad(hours)}:${pad(minutes)}` : `${pad(minutes)}:${pad(seconds % 60)}`; };
  const countdown = () => Math.max(0, state.duration - state.elapsed);
  function detailsText() {
    if (state.details === "weekend") return uiTranslate("HUD_LOBBY_WEEKEND_DUST_X4") + "\n" + uiTranslate("HUD_OBTAIN_DUST");
    if (state.details === "event") {
      const d = rules.details.find(r => r.type === state.event);
      return d ? [d.title, d.obtain, d.reward].map(k => uiTranslate(k)).join("\n") : "";
    }
    const weather = rules.weather.find(r => r.ID === state.weather);
    if (!weather) return "";
    const lines = [];
    const names = String(weather.Effects || "").split(";").map(id => rules.effects.find(r => r.ID === id)).filter(Boolean).map(r => uiTranslate(rules.effectNames[r.Name] || r.Name));
    if (names.length) lines.push(uiTranslate("HUD_LOBBY_DETAILS_APPEARANCES", [names.join(", ")]));
    if (["GroundShake", "HeavyRain", "HighTide"].includes(weather.Name)) lines.push(uiTranslate("HUD_LOBBY_DETAILS_SPECIAL_PETS"));
    return lines.join("\n");
  }
  function render() {
    const weather = rules.weather.find(r => r.ID === state.weather), event = rules.details.find(r => r.type === state.event);
    t.visible(t.key("Weather"), !!weather && countdown() > 0, "UpdateWeather");
    if (weather) t.image(t.child(t.key("Weather"), "Icon"), weather.Icon, "UpdateWeather");
    t.text(timer("Weather"), format(countdown()), "CountdownWeather");
    t.visible(t.key("EventCountdown"), state.ready && !!event && countdown() > 0, "RefreshEventCountdown");
    t.visible(t.key("Event"), state.ready && !!event && countdown() > 0, "UpdateEventWidget");
    if (event) {
      t.image(t.child(t.key("EventCountdown"), "Icon"), event.icon, "RefreshEventCountdown");
      t.image(t.child(t.key("Event"), "Icon"), rules.eventIcons[event.type], "UpdateEventWidget");
    }
    t.text(timer("EventCountdown"), format(countdown()), "CountdownEvent");
    t.text(timer("Event"), format(countdown(), countdown() >= 86400), "CountdownEventWidget");
    t.visible(t.key("WeekendEvent"), state.ready && state.weekend, "UpdateWeekendEvent");
    t.text(t.child(t.key("WeekendEvent"), "Label"), uiTranslate("HUD_LOBBY_WEEKEND_DUST_X4"), "OpenWeekendEvent");
    if ((state.details === "event" && (!state.ready || !event || !countdown())) || (state.details === "weekend" && (!state.ready || !state.weekend))) state.details = "";
    t.visible(t.key("Details"), !!state.details, "UpdateDetailsContent");
    t.text(t.child(t.key("Details"), "Label"), detailsText(), "UpdateDetailsContent");
    for (const key of ["LikeButton", "Report", "LuckySpinButton", "EditProfileButton", "TeleportToBossButton"]) t.visible(t.key(key), key === state.context || (state.context === "LikeButton" && key === "Report"), "OpenContextualButton");
    t.refresh();
  }
  t.visible(t.key("PopupIcon"), false, "InitLobbyHUD");
  t.controls(`<label>Thời tiết <select data-lobby="weather"><option value="">Không có</option>${rules.weather.map(r => `<option value="${esc(r.ID)}">${esc(uiTranslate(rules.weatherNames[r.Name] || r.Name))}</option>`).join("")}</select></label><label>Event thử <select data-lobby="event"><option value="">Không có</option>${rules.details.map(r => `<option value="${esc(r.type)}">${esc(uiTranslate(r.title))}</option>`).join("")}</select></label><label>Thời gian thử (giây) <input data-lobby="duration" type="number" min="0" value="${state.duration}"></label><label><input data-lobby="ready" type="checkbox" checked> Đủ điều kiện event (data/onboard/revival/rebirth)</label><label><input data-lobby="weekend" type="checkbox"> Cuối tuần</label><label>Nút ngữ cảnh <select data-lobby="context"><option value="">Không có</option>${["LikeButton", "LuckySpinButton", "EditProfileButton", "TeleportToBossButton"].map(k => `<option>${k}</option>`).join("")}</select></label><button type="button" data-lobby-popup>Thử popup thu nhập</button>`, el => {
    const name = el.dataset.lobby;
    if (!name) return;
    state[name] = el.type === "checkbox" ? el.checked : name === "duration" ? Math.max(0, Number(el.value) || 0) : el.value;
    if (name === "duration") state.elapsed = 0;
    if (name === "context") { clearTimeout(contextTimeout); if (state.context === "TeleportToBossButton") contextTimeout = setTimeout(() => { state.context = ""; render(); }, rules.bossDurationMs); }
    render();
  });
  t.panel.querySelector('[data-lobby="weather"]').value = state.weather;
  t.panel.querySelector('[data-lobby="event"]').value = state.event;
  let popupTimeout, contextTimeout;
  t.panel.onclick = event => { if (event.target.closest("[data-lobby-popup]")) { const popup = t.key("PopupIcon"); t.visible(popup, true, "ShowPopUpWithType"); t.text(t.child(popup, "Label"), "+100", "ShowPopUpWithType"); clearTimeout(popupTimeout); popupTimeout = setTimeout(() => t.visible(popup, false, "ReleasePopup"), c.DURATION_DISAPEAR); t.status("Popup thu nhập +100 là dữ liệu thử."); } };
  for (const [name, context] of [["Weather", "weather"], ["EventCountdown", "event"], ["WeekendEvent", "weekend"]]) t.child(t.key(name), "ShowDetailsButton")?.addEventListener("click", () => { state.details = context; render(); });
  t.child(t.key("Details"), "CloseButton")?.addEventListener("click", () => { state.details = ""; render(); });
  t.key("LikeButton")?.addEventListener("click", () => { state.context = ""; render(); t.status("Đã mô phỏng Like; không gửi tương tác người chơi."); });
  for (const key of ["LuckySpinButton", "EditProfileButton", "TeleportToBossButton"]) t.key(key)?.addEventListener("click", () => { state.context = ""; render(); t.status(`${key}: mô phỏng thao tác; không gọi game/server.`); });
  t.child(t.key("Event"), "OpenShopEventButton")?.addEventListener("click", () => t.status("Mô phỏng mở Shop Event; chọn tab Shop Event để xem UI tương ứng."));
  const tick = setInterval(() => { state.elapsed++; render(); }, c.COUNTDOWN_REFRESH_INTERVAL_MS || 964);
  render();
  return { state, render, dispose() { clearInterval(tick); clearTimeout(popupTimeout); clearTimeout(contextTimeout); t.panel.onclick = t.panel.onchange = null; } };
}

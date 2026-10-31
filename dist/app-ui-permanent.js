"use strict";

function initPermanentPreview(screen, rules, rendered) {
  const t = uiSourceTools(screen, rules, rendered), c = rules.constants;
  const state = { type: "Dig", mode: true, scenario: "ready", value: 0, scanEnd: 0, switchEnd: 0, running: false, inventory: false, needPurchase: false, exchange: false, confirm: false };
  let stopped = false, last = performance.now(), hintEnd = performance.now() + c.SWITCH_MODE_HINT_DURATION_MS;
  const geometry = new Map();
  function position(el, x, y, source) {
    if (!el) return;
    if (!geometry.has(el)) geometry.set(el, { left: parseFloat(el.style.left) || 0, top: parseFloat(el.style.top) || 0, anchor: t.node(el)?.transform?.anchoredPosition || { x: 0, y: 0 } });
    const initial = geometry.get(el); el.style.left = initial.left + x - initial.anchor.x + "px"; el.style.top = initial.top - y + initial.anchor.y + "px";
    t.record(el, "AnchorPosition", { x, y }, source);
  }
  function fill(el, value, source) { if (!el) return; uiRenderer.setFillAmount(el, value, t.node(el)?.image); t.record(el, "FillAmount", value, source); }
  const pet = index => rules.fixtures[state.type][index] || rules.fixtures[state.type][0];
  t.controls('<label>Type <select data-permanent-type><option>Dig</option><option>Fish</option></select></label><label><input type="checkbox" data-permanent-mode checked> Chế độ event</label><label>Trạng thái mô phỏng <select data-permanent-scenario><option value="ready">Sẵn sàng</option><option value="hitbar">Hit bar</option><option value="inventory">Có pet, nhận miễn phí</option><option value="purchase">Có pet cần mua</option><option value="exchange">Đổi pet trong inventory</option><option value="reward">Reveal phần thưởng</option></select></label><p>Dig thử spot COMMON với scan tier COMMON; Fish dùng gain/drift mặc định nguồn.</p>', el => {
    if (el.hasAttribute("data-permanent-type")) { state.type = el.value; state.scanEnd = state.switchEnd = 0; hintEnd = performance.now() + c.SWITCH_MODE_HINT_DURATION_MS; }
    if (el.hasAttribute("data-permanent-mode")) state.mode = el.checked;
    if (el.hasAttribute("data-permanent-scenario")) state.scenario = el.value;
    configure();
  });
  function configure() {
    state.inventory = ["inventory", "purchase", "exchange"].includes(state.scenario); state.needPurchase = state.scenario === "purchase"; state.exchange = state.scenario === "exchange"; state.confirm = false;
    state.running = state.scenario === "hitbar" && state.mode;
    state.value = state.type === "Fish" ? c.HIT_BAR_FISH_START_RATIO : c.HIT_BAR_DIG_START_RATIO;
    last = performance.now(); render();
  }
  function updateInventory() {
    const inventory = t.key("Inventory"), details = t.child(inventory, "Details"), returnButton = t.child(inventory, "ReturnButton"), reject = t.child(inventory, "RejectButton"), current = pet(0), replacement = pet(1);
    const currentName = uiTranslate(current.Name), newName = uiTranslate(replacement.Name), income = t.money(current.Value), newIncome = t.money(replacement.Value);
    const content = state.exchange ? uiTranslate("HUD_PERMANENT_EVENT_EXCHANGE_DETAILS", [newName, newIncome, currentName, income]) : state.inventory ? uiTranslate("HUD_PERMANENT_EVENT_INVENTORY_DETAILS", [currentName, income]) : "";
    t.text(details, content, "UpdateInventoryDetails"); t.text(t.child(returnButton, "Label"), uiTranslate(state.exchange ? "HUD_YES" : state.needPurchase ? "HUD_BUY" : "HUD_CLAIM"), "UpdateInventoryDetails");
    const returnAnchor = t.node(returnButton)?.transform?.anchoredPosition, rejectAnchor = t.node(reject)?.transform?.anchoredPosition;
    position(returnButton, returnAnchor?.x || 0, state.exchange ? c.INVENTORY_RETURN_EXCHANGE_Y : c.INVENTORY_BUTTON_NORMAL_Y, "UpdateInventoryButtons");
    position(reject, rejectAnchor?.x || 0, state.exchange ? c.INVENTORY_REJECT_EXCHANGE_Y : c.INVENTORY_BUTTON_NORMAL_Y, "UpdateInventoryButtons"); t.visible(reject, state.exchange, "UpdateInventoryButtons");
    t.visible(inventory, state.inventory || state.exchange, "SetInventoryActive");
    const sourceSize = t.node(inventory)?.transform?.sizeDelta, availableWidth = (sourceSize?.x || 0) + (t.node(details)?.transform?.sizeDelta?.x || 0), template = state.exchange ? c.INVENTORY_EXCHANGE_TEMPLATE_LENGTH : c.INVENTORY_DETAILS_TEMPLATE_MAX_LENGTH;
    const rawLength = state.exchange ? (newName + newIncome + currentName + income).length : (currentName + income).length;
    const characterWidth = rules.characterWidths[uiPreview.language === "vi" ? "5" : "1"];
    const lines = Math.max(c.INVENTORY_MIN_LINES, Math.ceil(Math.round((rawLength + template) * characterWidth) / Math.max(1, availableWidth)));
    const height = (state.exchange ? c.INVENTORY_EXCHANGE_HEIGHT : c.INVENTORY_NORMAL_HEIGHT) + (lines - c.INVENTORY_MIN_LINES) * ((t.node(details)?.text?.fontSize || 0) + c.INVENTORY_LINE_SPACING);
    uiRenderer.setSize(inventory, { height }, rendered.canvas, screen); t.record(inventory, "SizeDelta", { x: sourceSize?.x, y: height }, "UpdateInventoryHeight");
    t.visible(t.key("PlacePetButton"), state.inventory && !state.exchange && !state.confirm, "UpdatePlacePetButton");
    const confirm = t.key("ConfirmBuy"); t.visible(confirm, state.confirm, "ShowEventPetBuyConfirmWidget");
    t.text(t.child(t.child(confirm, "Title"), "Label"), uiTranslate("HUD_PERMANENT_EVENT_CONFIRM_BUY"), "ShowEventPetBuyConfirmWidget");
    t.text(t.child(confirm, "ConfirmDetails"), uiTranslate("HUD_PERMANENT_EVENT_CONFIRM_BUY_DETAILS", [currentName, t.money(current.Price)]), "ShowEventPetBuyConfirmWidget");
  }
  function updateReward() {
    const reward = t.key("Reward"), value = pet(0); t.visible(reward, state.scenario === "reward", "OpenEventReward");
    t.color(t.child(reward, "RarityBG"), rules.rarityColors[value.Rarity], "UpdatePetWidget"); t.image(t.child(reward, "PetThumbnail"), value.Name, "UpdatePetWidget");
    t.text(t.child(reward, "PetName"), uiTranslate(value.Name), "UpdatePetWidget"); t.visible(t.child(reward, "MutationIcon"), false, "UpdatePetWidget");
    const badge = t.child(reward, "SecretFusionIcon");
    t.visible(badge, true, "UpdatePetObtainBadge"); t.image(badge, value.obtainIcon, "UpdatePetObtainBadge");
    const weather = t.child(reward, "WeatherIcons"); for (const el of weather?.children || []) t.visible(el, false, "UpdatePetWidget");
  }
  function hitbar() {
    t.visible(t.key("HitBar"), state.running, "OpenHitBar");
    const handle = t.key("Handle"), original = t.node(handle)?.transform?.anchoredPosition;
    position(handle, c.HIT_BAR_TRACK_MIN + (c.HIT_BAR_TRACK_MAX - c.HIT_BAR_TRACK_MIN) * state.value, original?.y || 0, "UpdateHitBar");
    t.record(handle, "HitBarValue", state.value, "UpdateHitBar");
    if (state.running) {
      const action = t.key("MashButton").getBoundingClientRect(), canvas = rendered.canvas.getBoundingClientRect(), scale = canvas.width / uiPreview.width;
      for (const [name, offset] of [["TapRing", 0], ["TapPrompt", c.HIT_BAR_TAP_PROMPT_OFFSET_Y]]) {
        const el = t.key(name), box = el.getBoundingClientRect();
        el.style.left = (parseFloat(el.style.left) || 0) + (action.left + action.width / 2 - box.left - box.width / 2) / scale + "px";
        el.style.top = (parseFloat(el.style.top) || 0) + (action.top + action.height / 2 - box.top - box.height / 2) / scale - offset + "px";
        t.record(el, "ActualPosition", { action: "MashButton", offsetY: offset }, "UpdateHitBarLayout");
      }
    }
  }
  function render() {
    t.visible(t.key("Cost"), false, "InitPermanentEventHUD"); t.visible(t.key("HintSwitchMode"), performance.now() < hintEnd, "SetSwitchModeHintActive");
    t.visible(t.key("SwitchModeButton"), true, "SetSwitchModeButtonActive");
    t.visible(t.key("DigEvent"), state.type === "Dig" && state.mode, "UpdateActiveEventProfile"); t.visible(t.key("FishEvent"), state.type === "Fish" && state.mode, "UpdateActiveEventProfile");
    t.visible(t.key("ScanButton"), state.type === "Dig" && state.mode && !state.running, "UpdateDigActions");
    t.visible(t.key("MashButton"), state.mode && (state.type === "Fish" || state.scenario === "ready" || state.running), "UpdateActiveEventProfile");
    t.image(t.key("MashButtonIcon"), state.type === "Fish" ? "FishIcon" : "DigIcon", "UpdateActiveEventProfile"); t.image(t.key("Handle"), state.type === "Fish" ? "FishIcon" : "DigIcon", "UpdateHitBarAppearance"); t.image(t.key("EventBG"), state.type === "Fish" ? "Tidal" : "Dirt", "UpdateHitBarAppearance");
    updateInventory(); updateReward(); hitbar(); t.refresh();
  }
  function tap() {
    if (!state.mode) return;
    if (!state.running) { state.scenario = "hitbar"; configure(); return; }
    const gain = state.type === "Fish" ? c.HIT_BAR_FISH_DEFAULT_GAIN : rules.digPower.COMMON / c.HIT_BAR_DIG_RANGE;
    state.value = Math.min(c.HIT_BAR_MAX_RATIO, state.value + gain);
    if (state.value >= c.HIT_BAR_MAX_RATIO) { state.running = false; t.status("Hit bar thành công. Phần thưởng là tình huống thử; chọn Reveal trong bảng mô phỏng để xem."); }
    hitbar(); renderUiResourcePanel();
  }
  rendered.canvas.addEventListener("click", event => {
    const button = event.target.closest("button"), name = button?.dataset.uiName;
    if (!name) return;
    if (name === "SwitchModeButton" && performance.now() >= state.switchEnd) { state.mode = !state.mode; state.running = false; state.switchEnd = performance.now() + c.SWITCH_MODE_COOLDOWN_MS; t.panel.querySelector("[data-permanent-mode]").checked = state.mode; render(); }
    else if (name === "MashButton") tap();
    else if (name === "ScanButton" && performance.now() >= state.scanEnd) { state.scanEnd = performance.now() + c.SCAN_COOLDOWN_MS; t.status("Đang mô phỏng cooldown quét; vị trí spot trong thế giới không được tạo."); }
    else if (["ReturnButton", "PlacePetButton"].includes(name)) { if (state.exchange) { state.exchange = false; state.scenario = "inventory"; t.status("Đồng ý đổi pet (mô phỏng)."); } else if (state.needPurchase) state.confirm = true; else { state.inventory = false; state.scenario = "ready"; t.status("Đã yêu cầu đặt/nhận pet (mô phỏng)."); } render(); }
    else if (name === "RejectButton") { state.exchange = false; state.scenario = "inventory"; render(); }
    else if (["NoButton", "CloseButton"].includes(name)) { state.confirm = false; render(); }
    else if (name === "YesButton") { state.confirm = false; state.inventory = false; state.scenario = "ready"; t.status("Xác nhận mua/đặt pet được mô phỏng cục bộ."); render(); }
  });
  const interval = setInterval(() => {
    if (stopped) return;
    if (!rendered.canvas.isConnected) { stopped = true; clearInterval(interval); return; }
    const now = performance.now(), elapsed = (now - last) / c.HIT_BAR_MILLISECONDS_PER_SECOND; last = now;
    t.visible(t.key("HintSwitchMode"), now < hintEnd, "PlayEventSwitchHint");
    const scan = t.child(t.key("ScanButton"), "Cooldown"), waiting = t.key("WaitingBorder");
    t.visible(scan, now < state.scanEnd, "StartScanCooldown"); fill(scan, Math.max(0, (state.scanEnd - now) / c.SCAN_COOLDOWN_MS), "StartScanCooldown");
    t.visible(waiting, now < state.switchEnd, "StartSwitchModeCooldown"); fill(waiting, Math.max(0, (state.switchEnd - now) / c.SWITCH_MODE_COOLDOWN_MS), "StartSwitchModeCooldown");
    if (state.running) {
      state.value = Math.max(c.HIT_BAR_MIN_RATIO, state.value - (state.type === "Fish" ? c.HIT_BAR_FISH_DEFAULT_DRIFT : rules.digDrift.COMMON / c.HIT_BAR_DIG_RANGE) * elapsed);
      if (state.value <= c.HIT_BAR_MIN_RATIO) { state.running = false; t.status("Hit bar thất bại (mô phỏng); chọn lại trạng thái để thử."); }
      hitbar();
    }
  }, 100);
  configure(); return { state, render, dispose() { stopped = true; clearInterval(interval); } };
}

"use strict";

function initShopEventPreview(screen, rules, rendered) {
  const t = uiSourceTools(screen, rules, rendered), { key, child, visible, text, color, image } = t, c = rules.constants;
  const state = { schedule: rules.schedules.at(-1), balance: 0, selected: null, view: "shop", floor: 1, bought: new Map(), cooldown: new Map(), now: Math.floor(Date.now() / 1000), grace: false, tasksReady: false, claimed: new Set() };
  const shop = key("ShopWidget") || t.find("Shop"), submit = key("SubmitPets");
  // Shop.ui's root and Shop child share a name. Registration resolves the child.
  const shopPanel = shop === rendered.canvas ? child(shop, "Shop") : shop;
  const groups = [key("ExclusiveItem"), key("RecommendedItems"), key("GeneralItems")];
  const format = (pattern, args) => String(pattern || "").replace(/\{(\d+)\}/g, (_, index) => args[Number(index)] ?? "");
  const rich = (value, tint) => tint ? `[${tint}]${value}[-]` : value;
  const rarityName = rarity => rich(uiTranslate(rules.rarityNames[rarity] || rarity), rules.rarityTextColors[rarity]);
  const itemName = row => row.namePrefix ? format(rules.itemNameFormat, [uiTranslate(row.namePrefix), rich(uiTranslate(row.nameKey), row.nameColor), rarityName(row.rarity)]) : row.nameKey ? uiTranslate(row.nameKey) : "chưa có dữ liệu";
  function timeText(seconds) {
    let rest = Math.max(0, Math.floor(seconds)); const parts = [];
    for (const { unit, seconds: span } of rules.timeUnits) { const amount = Math.floor(rest / span); rest %= span; if (amount) parts.push(uiTranslate(`TIME_${unit}${amount === 1 ? "" : "S"}`, [amount])); if (parts.length >= rules.timeParts) break; }
    return parts.join(" ") || uiTranslate("TIME_SECONDS", [0]);
  }
  function specialDetails(row) {
    if (row.rewardType !== "Pet" || !row.pet) return itemName(row);
    const income = format(rules.specialIncomeFormat, [uiTranslate("HUD_REBIRTH_MULTI"), t.money(row.pet.value)]);
    if (!Number(row.MaxPurchase)) return income;
    const remaining = Math.max(0, Number(row.MaxPurchase) - (state.bought.get(row.ID) || 0));
    return income + "\n" + rich(uiTranslate("HUD_SHOP_LIMIT", [remaining, row.MaxPurchase]), c.TAB_NORMAL_COLOR.replace("#", ""));
  }
  function selectedDetails(row, exclusive) {
    if (!row) return "";
    if (row.rewardType === "Pet" && row.pet) return exclusive ? specialDetails(row) : `${rarityName(row.rarity)} ${uiTranslate(row.pet.nameKey)}\n${uiTranslate("HUD_REWARD_DETAIL_PET", [t.money(row.pet.price), t.money(row.pet.value)])}`;
    return row.detailKey ? uiTranslate(row.detailKey) : itemName(row);
  }
  function rewardPool(row) {
    const isPet = row?.kind === "RandomPet", show = isPet || row?.kind === "RandomItem";
    visible(t.find("ObtainableRewards"), show, "UpdateObtainableRewards");
    const rewards = show ? isPet ? rules.randomPetPool : rules.randomItemPool : [];
    t.slots(t.find("RewardsLayout"), rewards.length).forEach((el, index) => { const reward = rewards[index]; image(child(el, "Thumbnail"), reward.icon, "RenderRewardWidget"); color(child(el, "Rarity"), rules.rarityColors[reward.rarity], "RenderRewardWidget"); visible(child(el, "Amount"), !isPet, "RenderRewardWidget"); text(child(el, "Amount"), isPet ? "" : "x" + reward.value, "RenderRewardWidget"); });
  }
  let cards = [];
  const options = rules.schedules.map((s, i) => `<option value="${i}" ${s === state.schedule ? "selected" : ""}>Shop ${s.ShopId} · ${s.eventName}</option>`).join("");
  t.controls(`<label>Sự kiện <select data-shop-event="schedule">${options}</select></label><label>Số dư <input data-shop-event="balance" type="number" min="0" value="0"></label><label><input data-shop-event="grace" type="checkbox"> Grace: chỉ mở shop</label><label>Thời điểm Unix (mô phỏng)<input data-shop-event="now" type="number" value="${state.now}"></label><label>Trạng thái <select data-shop-event="view"><option value="shop">Shop</option><option value="dialog">Dialog</option><option value="tasks">Tasks</option><option value="submit">Submit pets</option></select></label>`, el => {
    const field = el.dataset.shopEvent;
    if (field === "schedule") { state.schedule = rules.schedules[Number(el.value)]; state.selected = null; state.bought.clear(); state.cooldown.clear(); }
    else if (field === "balance" || field === "now") state[field] = Math.max(0, Number(el.value) || 0);
    else if (field === "grace") state.grace = el.checked;
    else if (field === "tasksReady") state.tasksReady = el.checked;
    else if (field === "view") state.view = el.value;
    render();
  });
  const taskControl = document.createElement("label"); taskControl.innerHTML = '<input type="checkbox" data-shop-event="tasksReady"> Hoàn thành nhiệm vụ ngày (mô phỏng)'; t.panel.appendChild(taskControl);
  function taskRows() {
    const meteorite = state.schedule.eventName === "EventDigMeteorite";
    const rows = meteorite ? [{ ID: "cap", cap: true, TaskType: "-1", Target: rules.hitCap, Reward: rules.hitCap }, ...rules.meteoriteTasks] : rules.rarityTasks;
    t.slots(t.find("TasksLayout"), rows.length).forEach((el, i) => {
      const row = rows[i], k = `${state.schedule.ID}:${row.ID}`, claimed = state.claimed.has(k), progress = state.tasksReady ? Number(row.Target) : 0;
      const icon = row.TaskType === "1" ? "FishIcon" : row.TaskType === "2" ? "DigIcon" : state.schedule.currencyIcon;
      image(child(child(el, "Item"), "Thumbnail"), icon, "UpdateTaskView"); color(child(child(el, "Item"), "Rarity"), c.DAILY_TASK_ITEM_COLOR, "RenderDailyTaskRow");
      const titleKey = row.TaskType === "1" ? "HUD_EVENT_RARITY_DAILY_TASK_FISH" : row.TaskType === "2" ? "HUD_EVENT_RARITY_DAILY_TASK_DIG" : "HUD_EVENT_RARITY_DAILY_TASK_LOGIN";
      text(child(el, "Details"), row.cap ? uiTranslate("HUD_EVENT_METEORITE_HIT_CAP", [Math.max(0, Number(row.Target) - progress), row.Target]) : `${uiTranslate(titleKey)}\n${uiTranslate("HUD_EVENT_RARITY_CONTRACT_LIMIT", [progress, row.Target])}`, "RenderDailyTaskRow");
      image(child(child(el, "Reward"), "Thumbnail"), state.schedule.currencyIcon, "RenderDailyTaskRow"); text(child(child(el, "Reward"), "Amount"), "+" + row.Reward, "RenderDailyTaskRow"); color(child(child(el, "Reward"), "Rarity"), c.DAILY_TASK_ITEM_COLOR, "RenderDailyTaskRow");
      visible(child(el, "ClaimButton"), !claimed && !row.cap, "RenderTaskButton"); visible(child(el, "Completed"), claimed || (row.cap && state.tasksReady), "RenderDailyTaskRow");
      const button = child(el, "ClaimButton"); image(button, state.tasksReady ? "YellowButton" : "BlueButton", "RenderTaskButton"); text(child(button, "Label"), uiTranslate(state.tasksReady ? "HUD_CLAIM_REWARD" : "HUD_EVENT_RARITY_DAILY_TASK_DO"), "RenderTaskButton");
      if (button) button.onclick = () => { if (state.tasksReady && !claimed) { state.claimed.add(k); state.balance += Number(row.Reward); render(); t.status("Đã nhận thưởng nhiệm vụ trong mô phỏng."); } else t.status("Chưa đạt tiến độ mô phỏng."); };
    });
  }
  function supportsTasks() { return !state.grace && /EventRarityContract|EventDigMeteorite/.test(state.schedule?.eventName); }
  function updateView() {
    const isSubmit = state.view === "submit" && !state.grace && state.schedule?.eventName === "EventRarityContract";
    visible(shopPanel, state.view !== "dialog" && !isSubmit, "OpenShopEvent");
    visible(submit, isSubmit, "OpenSubmitPets");
    visible(key("Dialog"), state.view === "dialog", "UpdateDialogVisibility");
    visible(key("ShopView"), state.view !== "tasks" || !supportsTasks(), "SelectTab");
    visible(key("TaskView"), state.view === "tasks" && supportsTasks(), "SelectTab");
    visible(t.find("TaskTabButton"), supportsTasks(), "UpdateTaskTabVisibility");
    visible(t.find("OpenTaskButton"), supportsTasks(), "UpdateDialogVisibility");
    visible(t.find("SubmitPetButton"), !state.grace && state.schedule?.eventName === "EventRarityContract", "UpdateDialogVisibility");
    for (const name of ["ShopTabButton", "TaskTabButton"]) {
      const button = t.find(name), selected = (name === "TaskTabButton") === (state.view === "tasks");
      image(button, selected ? "SelectTabBG" : "NormalTabBG", "RenderTab");
      for (const n of ["Icon", "Label"]) color(child(button, n), selected ? c.TAB_SELECTED_COLOR : c.TAB_NORMAL_COLOR, "RenderTab");
    }
  }
  function renderCard(el, row) {
    el.dataset.shopEventItem = row.ID;
    const count = state.bought.get(row.ID) || 0, soldOut = Number(row.MaxPurchase) > 0 && count >= Number(row.MaxPurchase), timeLocked = Number(row.TimeAvailable) > state.now, locked = timeLocked || soldOut;
    const footer = rules.rarityColors[row.rarity] || c.FOOTER_DEFAULT_COLOR;
    image(child(el, "Thumbnail"), row.icon, "RenderItemWidget"); color(child(el, "Thumbnail"), locked ? c.ITEM_LOCKED_COLOR : c.ITEM_AVAILABLE_COLOR, "AvailableItem");
    const thumbnail = child(el, "Thumbnail"), original = t.node(thumbnail)?.transform?.sizeDelta;
    if (original) { const scale = row.rewardType === "WeatherGen" ? c.WEATHER_GEN_THUMBNAIL_SCALE : 1; uiRenderer.setSize(thumbnail, { width: original.x * scale, height: original.y * scale }, rendered.canvas, screen); }
    text(child(child(el, "Header"), "Name"), itemName(row), "RenderItemWidget");
    color(child(child(el, "Header"), "Name"), footer, "SetItemFooterColor"); color(child(el, "Footer"), footer, "SetItemFooterColor");
    image(child(el, "GemIcon"), state.schedule.currencyIcon, "UpdateItemGemIcon"); text(child(child(el, "GemIcon"), "Amount"), soldOut ? "" : row.Cost, "SetItemPrice");
    color(child(child(el, "GemIcon"), "Amount"), state.balance >= Number(row.Cost) ? c.COLOR_ENOUGH_GEMSTONE : c.COLOR_NOT_ENOUGH_GEMSTONE, "UpdateGem");
    const limit = Number(row.MaxPurchase) ? `${Math.max(0, Number(row.MaxPurchase) - count)}/${row.MaxPurchase}` : "";
    text(child(el, "Details"), timeLocked ? timeText(Number(row.TimeAvailable) - state.now) : el === groups[0] && row.kind === "SpecialPet" ? specialDetails(row) : limit, "SetItemLimitLabel");
    const remaining = Math.max(0, (state.cooldown.get(row.ID) || 0) - Date.now());
    visible(child(el, "LockButton"), locked, "SetLimitSpecialEvent"); visible(child(el, "SelectBorder"), state.selected === row.ID && remaining <= 0, "TurnOffSelect");
    visible(child(el, "CoolDown"), remaining > 0, "CoolDownItem"); text(child(child(el, "CoolDown"), "Timer"), Math.ceil(remaining / 1000), "CoolDownItem");
    if (child(el, "CoolDown")) { uiRenderer.setFillAmount(child(el, "CoolDown"), Number(row.TimeLock) > 0 ? remaining / Number(row.TimeLock) : 0, t.node(child(el, "CoolDown"))?.image); t.record(child(el, "CoolDown"), "FillAmount", Number(row.TimeLock) > 0 ? remaining / Number(row.TimeLock) : 0, "CoolDownItem"); }
    const select = child(el, "SelectButton"); if (select) select.onclick = () => { if (!locked && !remaining) { state.selected = row.ID; render(); } };
  }
  function render() {
    const rows = rules.items.filter(r => r.ShopId === state.schedule?.ShopId);
    cards = [];
    if (groups[0]) { visible(groups[0], rows.length > 0, "UpdateShopItems"); if (rows[0]) cards.push([groups[0], rows[0]]); }
    const exclusiveCount = c.EXCLUSIVE_SHOP_ITEM_COUNT, recommendedCount = c.RECOMMENDED_ITEMS_COUNT, generalStart = exclusiveCount + recommendedCount;
    visible(groups[1], rows.length > exclusiveCount, "UpdateShopItems"); visible(groups[2], rows.length > generalStart, "UpdateShopItems");
    t.slots(groups[1], Math.min(recommendedCount, Math.max(0, rows.length - exclusiveCount))).forEach((el, i) => cards.push([el, rows[i + exclusiveCount]]));
    t.slots(groups[2], Math.max(0, rows.length - generalStart)).forEach((el, i) => cards.push([el, rows[i + generalStart]]));
    cards.forEach(([el, row]) => renderCard(el, row));
    image(key("WalletGemIcon"), state.schedule.currencyIcon, "UpdateGemIcons"); image(key("CostGemIcon"), state.schedule.currencyIcon, "UpdateGemIcons");
    text(key("BalanceLabel"), state.balance, "UpdateGem");
    const selected = rows.find(r => r.ID === state.selected), available = selected && state.balance >= Number(selected.Cost);
    visible(key("ItemDetails"), !!selected, "TurnOnDetailItem");
    rewardPool(selected);
    text(key("ItemDetailsNameLabel"), selected ? itemName(selected) : "", "TurnOnDetailItem");
    text(child(key("ItemDetails"), "Details"), selectedDetails(selected, selected === rows[0]), "SetDetailDescItem");
    text(key("CostLabel"), selected?.Cost || 0, "SelectItem");
    image(key("BuyButton"), available ? "YellowButton" : "BlueButton", "SetBuyButtonAvailable");
    color(key("BuyButton"), available ? c.BUY_BUTTON_ENOUGH_COLOR : c.BUY_BUTTON_NOT_ENOUGH_COLOR, "SetBuyButtonAvailable");
    color(child(key("BuyButton"), "Label"), available ? c.BUY_BUTTON_LABEL_ENOUGH_COLOR : c.BUY_BUTTON_LABEL_NOT_ENOUGH_COLOR, "SetBuyButtonAvailable");
    color(child(key("BuyButton"), "Icon"), available ? c.BUY_BUTTON_LABEL_ENOUGH_COLOR : c.BUY_BUTTON_LABEL_NOT_ENOUGH_COLOR, "SetButtonCanBuy");
    color(key("CostLabel"), available ? c.COST_LABEL_ENOUGH_COLOR : c.COST_LABEL_NOT_ENOUGH_COLOR, "SetBuyButtonAvailable");
    visible(key("CostGemIcon"), !!selected, "TurnOffSelect");
    text(key("CountdownLabel"), `${uiTranslate("HUD_SHOP_EVENT_END_LABEL")} ${timeText(Number(state.schedule.End) + (state.grace ? rules.shopExtendSeconds : 0) - state.now)}`, "ShowTimeCoolDown");
    taskRows();
    text(child(t.find("Floor"), "FloorLabel"), uiTranslate("HUD_FLOOR", [state.floor]), "UpdateSubmitPetsOnFloor");
    for (const el of [...(t.find("PetsLayout")?.children || [])]) { visible(child(el, "SelectBorder"), false, "RefreshSubmitPets"); visible(child(el, "Thumbnail"), false, "UpdateSubmitPetsOnFloor"); visible(child(el, "HasMW"), false, "UpdateSubmitPetsOnFloor"); text(child(el, "Income"), "", "UpdateSubmitPetsOnFloor"); }
    visible(t.find("UpFloorButton"), state.floor < c.SUBMIT_MAX_FLOORS, "UpdateSubmitPetsOnFloor"); visible(t.find("DownFloorButton"), state.floor > c.SUBMIT_FIRST_FLOOR, "UpdateSubmitPetsOnFloor");
    updateView(); t.refresh();
  }
  rendered.canvas.addEventListener("click", e => {
    const button = e.target.closest("button"), name = button?.dataset.uiName;
    if (["ShopTabButton", "OpenShopButton"].includes(name)) state.view = "shop";
    else if (["TaskTabButton", "OpenTaskButton"].includes(name)) state.view = "tasks";
    else if (name === "SubmitPetButton") state.view = "submit";
    else if (name === "UpFloorButton") state.floor = Math.min(c.SUBMIT_MAX_FLOORS, state.floor + 1);
    else if (name === "DownFloorButton") state.floor = Math.max(c.SUBMIT_FIRST_FLOOR, state.floor - 1);
    else if (name === "CloseButton") state.view = "dialog";
    else if (name === "BuyButton") {
      const row = rules.items.find(r => r.ID === state.selected), count = row ? state.bought.get(row.ID) || 0 : 0;
      if (!row || state.balance < Number(row.Cost) || Number(row.TimeAvailable) > state.now || (Number(row.MaxPurchase) > 0 && count >= Number(row.MaxPurchase)) || (state.cooldown.get(row.ID) || 0) > Date.now()) return;
      state.balance -= Number(row.Cost); state.bought.set(row.ID, count + 1); state.cooldown.set(row.ID, Date.now() + Number(row.TimeLock));
      t.panel.querySelector('[data-shop-event="balance"]').value = state.balance; t.status("Đã mua trong mô phỏng; không phát thưởng game.");
    } else if (name === "SubmitButton") t.status("Chưa chọn thú; kho thử đang trống.");
    else return;
    render();
  });
  render();
  const timer = setInterval(() => { if (cards.some(([, r]) => (state.cooldown.get(r.ID) || 0) > Date.now() - 1000)) cards.forEach(([el, r]) => renderCard(el, r)); }, 1000);
  return { state, render, dispose() { clearInterval(timer); t.panel.onchange = null; } };
}

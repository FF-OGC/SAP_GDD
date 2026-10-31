"use strict";

const activitiesPreview = { tab: 0, userType: "New", rebirth: 1, day: 1, cycleDay: 1, eventDay: 0, progress: 0, income: 0, points: 0, spins: null, claimed: new Set(), claimedMissions: new Set(), claimedMilestones: new Set(), claimedEvent: new Set() };
activitiesPreview.missionProgress = new Map();
activitiesPreview.debugMission = null;

function initActivitiesPreview(screen, rules, rendered) {
  const state = activitiesPreview, c = rules.constants, source = rules.bindings;
  let disposed = false, timer = null, spinning = false, lastResult = "";
  const nodes = new Map();
  (function walk(n) { nodes.set(n.id, n); n.children.forEach(walk); })(screen.tree);
  const byKey = key => rendered.byId.get(rules.widgetIds[key]);
  const child = (el, name) => [...(el?.children || [])].find(e => e.dataset.uiName === name);
  const children = el => [...(el?.children || [])].filter(e => e.classList.contains("ui-entity"));
  const node = el => nodes.get(el?.dataset.uiId || el?.dataset.uiSourceEntityId);
  const lookup = name => [...rendered.byId.values()].find(e => e.dataset.uiName === name);
  function record(el, property, value, at) {
    if (!el) return;
    const values = JSON.parse(el.dataset.uiRuntimeValues || "{}");
    values[property] = { value, source: at || source.reward };
    el.dataset.uiRuntimeValues = JSON.stringify(values);
  }
  function visible(el, value, at) { if (el) { el.classList.toggle("ui-inactive", !value); record(el, "IsVisible", value, at); } }
  function text(el, value, at) {
    if (!el) return;
    uiRenderer.setText(el, String(value).replace(/\[(?:[A-Fa-f\d]{6}|-)\]/g, "")); record(el, "Content", value, at);
    const content = el.querySelector(":scope > .ui-text > .ui-text-content");
    if (!content || !/\[[A-Fa-f\d]{6}\]/.test(String(value))) return;
    content.replaceChildren(); let tint = "", index = 0;
    for (const m of String(value).matchAll(/\[([A-Fa-f\d]{6}|-)\]/g)) {
      const span = document.createElement("span"); span.textContent = String(value).slice(index, m.index); if (tint) span.style.color = tint; content.appendChild(span);
      tint = m[1] === "-" ? "" : "#" + m[1]; index = m.index + m[0].length;
    }
    const span = document.createElement("span"); span.textContent = String(value).slice(index); if (tint) span.style.color = tint; content.appendChild(span);
  }
  function color(el, value, at) { if (!el) return; if (node(el)?.text) uiRenderer.setTextColor(el, value); else uiRenderer.tint(el, value); record(el, "Color", value, at); }
  function image(el, key, tint = "#FFFFFF", at = source.reward) {
    if (!el) return;
    const props = node(el)?.image || node(el)?.button || {};
    const spriteKey = rules.spriteKeys[key];
    if (spriteKey) { uiRenderer.setSprite(el, spriteKey, { ...props, color: tint }, uiPreview.manifest); record(el, "SpriteResource", { key, spriteKey }, at); record(el, "Color", tint, at); }
    else { uiRenderer.setImage(el, "", { ...props, color: tint }); record(el, "SpriteResource", { key, missing: true }, at); }
  }
  function gradient(el, top, bottom, at) {
    if (!el) return;
    const rgb = hex => ({ r: parseInt(hex.slice(1, 3), 16), g: parseInt(hex.slice(3, 5), 16), b: parseInt(hex.slice(5, 7), 16), a: 1 });
    const props = node(el)?.image || {};
    const key = el.dataset.uiSpriteKey || props.spriteKey;
    uiRenderer.setSprite(el, key, { ...props, color: "#FFFFFF", gradient: 1, gradientTop: rgb(top), gradientBottom: rgb(bottom) }, uiPreview.manifest);
    record(el, "GradientTop", top, at); record(el, "GradientBottom", bottom, at);
  }
  function shadow(el, value, at) { const label = el?.querySelector(":scope > .ui-text"); if (label) { const p = node(el)?.text; label.style.textShadow = `${p?.shadowOffset?.x || 1}px ${p?.shadowOffset?.y || 1}px ${value}`; record(el, "ShadowColor", value, at); } }
  const money = value => `$${Math.floor(Number(value) % 10000 / 10)}.${Number(value) % 10} ${rules.suffixes[Math.floor(Number(value) / 10000)] || ""}`;
  const reward = id => rules.rewards.find(row => row.ID === String(id));
  const giftReward = id => reward(rules.gifts[id]?.Reward.split(";")[0]);
  const amountLabel = el => child(el, "RewardAmount") || child(child(el, "RewardIcon"), "RewardAmount");
  function rewardInfo(row, v3 = false) {
    if (!row) return { icon: "", amount: "chưa có dữ liệu", description: "chưa có dữ liệu", tint: "#FFFFFF", rarity: "" };
    const type = rules.itemTypes[row.TypeReward], value = row.Value.split(";")[0], qty = Number(row.Quantity);
    const dynamic = rules.dynamicRewards[row.ID];
    let icon = rules.itemIcons[type], amount = `x${qty * Number(value)}`, description = uiTranslate(rules.descriptions[type] || ""), rarity = rules.itemRarities[type], tint = "#FFFFFF";
    if (type === "Money") amount = money(value);
    if (type === "MoneyTime") {
      icon = rules.itemIcons.Money;
      const rankValue = rank => (Math.floor(rank % 10000 / 10) + rank % 10 / 10) * 1000 ** (Math.floor(rank / 10000) - 1);
      const cash = Math.max(rankValue(c.MIN_GIFT_MONEY_TIME), Math.min(rankValue(c.MAX_GIFT_MONEY_TIME), state.income * Number(value) * 3600));
      const group = Math.max(0, Math.floor(Math.log10(Math.max(1, cash)) / 3));
      const whole = Math.floor(cash / 1000 ** group), digit = Math.floor(cash / 1000 ** group * 10) % 10;
      amount = group ? `${whole}${digit ? "." + digit : ""} ${rules.suffixes[group + 1] || ""}` : String(Math.floor(cash));
    }
    const colored = (label, tint) => `[${(tint || rules.textColors.base).slice(1)}]${label}[-]`;
    description = colored(description, rules.textColors.base);
    if (type === "Pet") { const pet = rules.pets[value]; icon = pet?.Name; description = colored(uiTranslate(pet?.Name || "chưa có dữ liệu"), rules.textColors.rarity[pet?.Rarity]); rarity = pet?.Rarity; amount = `x${qty}`; }
    if (type === "RandomPet") { icon = "Summon" + value; description = `${colored(uiTranslate(rules.descriptions.RandomPet, [""]), rules.textColors.base)}${colored(uiTranslate("RARITY_" + value), rules.textColors.rarity[value])}`; rarity = value; amount = `x${qty}`; }
    if (type === "RandomSecretPool") { icon = v3 ? rules.itemIcons[type] : "MOODENG"; tint = v3 ? "#FFFFFF" : "#111111"; amount = `x${qty}`; }
    if (dynamic) { icon = dynamic.icon; rarity = dynamic.rarity; description += " " + colored(uiTranslate(dynamic.nameKey), dynamic.textColor); }
    return { type, icon, amount, description, tint, rarity };
  }
  function showReward(el, row, options = {}) {
    const info = rewardInfo(row, options.v3), icon = child(el, "RewardIcon");
    visible(icon, !!row);
    image(icon, info.icon, info.tint);
    text(amountLabel(el), info.amount);
    text(child(child(el, "RewardDetails"), "Content"), info.description);
    color(child(el, "GlowIcon"), rules.rarityColors[info.rarity] || "#1F64C4");
    color(child(el, "Rarity"), rules.rarityColors[info.rarity] || "#1F64C4");
    if (options.v3) {
      visible(child(el, "ClaimedMask"), !!options.claimed, "Assets/Scripts/Utils/UIUtils.fcg:685");
      visible(child(el, "ClaimButton"), !!options.claimable && !options.claimed, "Assets/Scripts/Utils/UIUtils.fcg:685");
    } else if (row) {
      const size = options.final ? (info.type === "Pet" ? c.DAILY_REWARD_FINAL_PET_ICON_SIZE : c.DAILY_REWARD_FINAL_ICON_SIZE) : (info.type === "Pet" ? c.PET_REWARD_ICON_SIZE : c.DEFAULT_REWARD_ICON_SIZE);
      uiRenderer.setSize(icon, { width: size, height: size }, rendered.canvas, screen);
      record(icon, "SizeDelta", { x: size, y: size });
    }
  }
  function clone(template, parent, index) {
    const el = template.cloneNode(true);
    for (const part of [el, ...el.querySelectorAll("[data-ui-path]")]) {
      part.dataset.uiClonePath = part.dataset.uiPath;
      part.dataset.uiCloneTemplatePath = template.dataset.uiPath;
      part.dataset.uiCloneIndex = String(index);
      part.dataset.uiSourceEntityId = part.dataset.uiId;
      part.dataset.uiEntityKey = `clone:${template.dataset.uiId}#${index}:${part.dataset.uiId}`;
      delete part.dataset.uiId; delete part.dataset.uiPath;
    }
    parent.appendChild(el); uiRenderer.refreshSprites(el);
    return el;
  }
  function daily() {
    const levels = rules.dailyRewards.filter(r => r.UserType === state.userType && Number(r.RebirthLevel) <= state.rebirth).map(r => Number(r.RebirthLevel));
    const level = Math.max(0, ...levels);
    for (const [index, el] of children(byKey("Rewards")).entries()) {
      const day = index + 1, row = rules.dailyRewards.find(r => r.UserType === state.userType && Number(r.RebirthLevel) === level && Number(r.Day) === day);
      visible(el, !!row, source.daily); if (!row) continue;
      const claimed = state.claimed.has(day), claimable = !claimed && day <= state.day;
      const final = day === rules.managerConstants.MAX_LOGIN_REWARD_DAY;
      el.dataset.activityDay = String(day);
      text(child(child(el, "Day"), "DayLabel"), uiTranslate("HUD_ACTIVITIES_DAY", [day]), source.daily);
      showReward(el, giftReward(row.Gift), { final });
      const prefix = `DAILY_REWARD_${claimable ? "CLAIMABLE" : final ? "FINAL" : "DEFAULT"}_`;
      color(el, c[prefix + "WIDGET_COLOR"], source.colors);
      gradient(child(el, "Day"), c[prefix + "DAY_TOP_COLOR"], c[prefix + "DAY_BOTTOM_COLOR"], source.colors);
      color(child(child(el, "Day"), "DayLabel"), c[prefix + "DAY_LABEL_COLOR"], source.colors);
      color(amountLabel(el), c[prefix + "AMOUNT_COLOR"], source.colors);
      gradient(child(el, "RewardDetails"), c[prefix + "DETAILS_TOP_COLOR"], c[prefix + "DETAILS_BOTTOM_COLOR"], source.colors);
      shadow(child(child(el, "RewardDetails"), "Content"), c[prefix + "DETAILS_SHADOW_COLOR"], source.colors);
      visible(child(el, "ClaimedButton"), claimed, source.daily);
      record(child(el, "ClaimButton"), "Claimable", claimable, "preview simulated CanClaimDates");
    }
  }
  const layout = byKey("MissionsLayout"), cards = children(layout), template = cards[0];
  // Native web scroll for the serialized vertical scrollView; inertia remains unverified.
  const scroll = layout.parentElement;
  scroll.style.overflowY = "auto"; scroll.style.overflowX = "hidden"; scroll.style.overscrollBehavior = "contain"; scroll.style.scrollbarWidth = "none";
  scroll.style.pointerEvents = "auto";
  record(scroll, "ScrollPolicy", "web vertical scrolling; engine inertia unverified", "Activities.ui propsData.scrollView");
  function missionRows() { return rules.missions.filter(r => Number(r.Day) === 0 || Number(r.Day) === state.cycleDay); }
  function missionProgress(row) { return Math.max(0, Math.min(Number(row.TargetValue), state.missionProgress.get(row.ID) ?? Math.floor(Number(row.TargetValue) * state.progress / 100))); }
  function missionClaimable(row) { return Number(row.TargetValue) > 0 && missionProgress(row) >= Number(row.TargetValue) && !state.claimedMissions.has(row.ID); }
  function description(row) {
    const value = row.Action === "SaveMoney" ? money(row.TargetValue) : row.TargetValue;
    let condition = "";
    if (row.TargetCondition) condition = uiTranslate(row.TargetCondition === "Mutation" ? "MISSION_CONDITION_MUTATION" : row.TargetCondition === "Weather" ? "MISSION_CONDITION_WEATHER" : `RARITY_${row.TargetCondition.toUpperCase()}`);
    let result = uiTranslate(row.Description, [value, condition]);
    if (["MISSION_LUCKY_SPIN", "MISSION_FUSION", "MISSION_CLAIM_PET_INCOME", "MISSION_LOCK_BASE"].includes(row.Description)) result += " " + uiTranslate("HUD_ACTIVITIES_MISSION_TIMES", [value]);
    return result;
  }
  function missions() {
    const rows = missionRows();
    while (cards.length < rows.length) cards.push(clone(template, layout, cards.length));
    cards.forEach((el, index) => {
      const row = rows[index]; visible(el, !!row, source.mission); if (!row) return;
      const claimed = state.claimedMissions.has(row.ID), claimable = missionClaimable(row);
      const progress = missionProgress(row);
      el.dataset.activityMission = row.ID;
      el.dataset.uiPriority = String(Number(row.Priority) + rows.length * (claimable ? c.PRIORITY_CLAIMABLE : claimed ? c.PRIORITY_CLAIMED : c.PRIORITY_INPROGRESS));
      record(el, "Priority", Number(el.dataset.uiPriority), source.mission);
      text(child(el, "Details"), description(row), source.mission);
      const progressEl = child(el, "Progress");
      text(progressEl, row.Action === "SaveMoney" ? `${money(progress)}/${money(row.TargetValue)}` : `${progress}/${row.TargetValue}`, source.mission);
      visible(progressEl, !claimed, source.mission); visible(child(el, "Claimed"), claimed, source.mission);
      image(child(progressEl, "ClaimButton"), claimable ? "YellowButton" : "BlueButton", claimable ? "#FFFFFF" : "#777777", source.mission);
      const types = row.RewardType.split("|"), values = row.RewardValue.split("|");
      children(child(el, "RewardsLayout")).forEach((rewardEl, i) => {
        visible(rewardEl, i < Math.min(types.length, values.length), source.mission);
        if (i < Math.min(types.length, values.length)) showReward(rewardEl, { TypeReward: types[i], Value: values[i], Quantity: "1" }, { v3: true });
      });
    });
    const grid = node(layout).layout;
    const extentCount = grid.ignoreInactive ? rows.length : cards.length;
    const height = extentCount * grid.size.y + Math.max(0, extentCount - 1) * grid.space.y + grid.offset.up + grid.offset.down;
    uiRenderer.setSize(layout, { height }, rendered.canvas, screen);
    record(layout, "Size", { height }, "preview scroll extent from source layout, including inactive cells when ignoreInactive=false");
    // Keep the source content anchored to the scroll viewport's top when it grows.
    requestAnimationFrame(() => { if (!disposed) layout.style.top = "0px"; });
    milestones();
  }
  function milestones() {
    const values = rules.milestone.Milestone.split(";").map(Number), gifts = rules.milestone.Gift.split(";");
    text(byKey("MilestonePoints"), uiTranslate("HUD_ACTIVITIES_PET_POINTS", [state.points]), source.milestone);
    const bar = byKey("MilestoneBar");
    uiRenderer.setFillAmount(bar, Math.min(1, state.points / values.at(-1)), node(bar)?.image);
    record(bar, "FillAmount", Math.min(1, state.points / values.at(-1)), source.milestone);
    children(byKey("MilestoneRewardsLayout")).forEach((el, i) => {
      visible(el, i < values.length, source.milestone); if (i >= values.length) return;
      el.dataset.activityMilestone = String(values[i]);
      color(el, state.points >= values[i] ? c.RECEIVE_MILESTONE_COLOR : c.DEFAULT_MILESTONE_COLOR, source.milestone);
      text(child(el, "MilestoneLabel"), values[i], source.milestone);
      showReward(child(el, "RewardDetail"), giftReward(gifts[i]), { v3: true, claimed: state.claimedMilestones.has(values[i]), claimable: state.points >= values[i] });
    });
  }
  function spin() {
    children(lookup("SpinLayout")).forEach((el, index) => showReward(el, giftReward(rules.spin.find(r => Number(r.ID) === index + 1)?.RewardId), { v3: true }));
    text(lookup("NumberSpinLabel"), uiTranslate("HUD_LUCKY_NUMBEROF_SPIN", [state.spins]), source.spin);
  }
  function eventRewards() {
    children(lookup("EventLayout")).forEach((el, i) => {
      const row = rules.events[i]; visible(el, !!row, source.event); if (!row) return;
      const day = i + 1, claimed = state.claimedEvent.has(day), claimable = day <= state.eventDay && !claimed;
      el.dataset.activityEvent = String(day);
      text(child(child(el, "Day"), "DayLabel"), uiTranslate("HUD_ACTIVITIES_DAY", [day]), source.event);
      showReward(el, giftReward(row.Gift));
      const mode = day === rules.managerConstants.MAX_LOGIN_REWARD_EVENT_DAY ? "SPECIAL" : claimable ? "CLAIM" : "DEFAULT";
      color(el, c[`REWARD_BG_TOP_${mode}_COLOR`], source.event);
      gradient(child(el, "Day"), c[`REWARD_TAG_TOP_${mode}_COLOR`], c[`REWARD_TAG_BOT_${mode}_COLOR`], source.event);
      color(child(child(el, "Day"), "DayLabel"), c[`REWARD_TITLE_${mode}_COLOR`], source.event);
      color(amountLabel(el), c[`REWARD_AMOUNT_${mode}_COLOR`], source.event);
      color(child(el, "RewardDetails"), c[`REWARD_DETAILS_${mode}_COLOR`], source.event);
      shadow(child(child(el, "RewardDetails"), "Content"), c[`REWARD_DETAILS_SHADOW_${mode}_COLOR`], source.event);
      visible(child(el, "ClaimedButton"), claimed, source.event);
    });
  }
  function refresh() {
    if (disposed) return;
    for (const tab of rules.tabs) {
      const button = lookup(tab.button), active = state.tab === tab.index;
      image(button, active ? "SelectTabBG" : "NormalTabBG", "#FFFFFF", tab.source); color(child(button, "Text"), active ? c.ACTIVE_TEXT_COLOR : c.DEFAULT_TEXT_COLOR, tab.source);
      visible(byKey(tab.content), active, tab.source);
      visible(child(button, "AlertIcon"), tab.index === 0 ? [...Array(state.day)].some((_, i) => !state.claimed.has(i + 1)) : tab.index === 1 ? missionRows().some(missionClaimable) : tab.index === 2 ? state.spins > 0 : false);
    }
    visible(byKey("ClaimAllButton"), false, rules.tabs[0].source); visible(byKey("ComingSoonLabel"), false, rules.tabs[0].source);
    if (state.tab === 0) daily(); else if (state.tab === 1) missions(); else if (state.tab === 2) spin(); else eventRewards();
    uiRenderer.refreshLayouts(rendered.canvas, screen); renderUiResourcePanel();
    const result = document.getElementById("activities-result"); if (result) result.textContent = spinning ? "Đang quay…" : lastResult;
    updateMissionDebug();
  }
  function updateMissionDebug() {
    const select = document.getElementById("activities-debug-mission"); if (!select) return;
    const rows = missionRows();
    const signature = `${uiPreview.language}:${rows.map(row => row.ID).join(",")}`;
    if (select.dataset.rows !== signature) {
      select.innerHTML = rows.map(row => `<option value="${esc(row.ID)}">#${esc(row.ID)} · ${esc(description(row))}</option>`).join("");
      select.dataset.rows = signature;
    }
    const row = rows.find(row => row.ID === state.debugMission) || rows[0];
    state.debugMission = row?.ID || null; select.value = state.debugMission || "";
    const progress = row ? missionProgress(row) : 0, claimed = row && state.claimedMissions.has(row.ID);
    document.getElementById("activities-debug-progress").textContent = row ? `${row.Action === "SaveMoney" ? money(progress) + "/" + money(row.TargetValue) : progress + "/" + row.TargetValue} · ${claimed ? "Đã nhận" : missionClaimable(row) ? "Có thể nhận" : "Đang làm"}${row.Action === "SaveMoney" ? " (đơn vị MoneyRank theo source)" : ""}` : "Không có nhiệm vụ trong ngày này";
    for (const id of ["activities-debug-add", "activities-debug-complete"]) document.getElementById(id).disabled = !row || claimed || progress >= Number(row.TargetValue);
  }
  if (state.spins == null) state.spins = Number(rules.spins.find(r => Number(r.Day) === state.day)?.Spin || 0);
  const panel = document.getElementById("ui-player-panel");
  panel.innerHTML = `<h2>Mô phỏng người chơi</h2><p>Trạng thái cục bộ để xem UI; quà và nhiệm vụ lấy từ config.</p>
    <label>Loại người chơi <select id="activities-user">${[...new Set(rules.dailyRewards.map(r => r.UserType))].map(type => `<option ${type === state.userType ? "selected" : ""}>${esc(type)}</option>`).join("")}</select></label>
    <label>Rebirth <input id="activities-rebirth" type="number" min="0" max="999" value="${state.rebirth}"></label>
    <label>Ngày đăng nhập <select id="activities-day">${Array.from({ length: rules.managerConstants.MAX_LOGIN_REWARD_DAY }, (_, i) => `<option value="${i + 1}" ${i + 1 === state.day ? "selected" : ""}>${i + 1}</option>`).join("")}</select></label>
    <label>Ngày cycle nhiệm vụ <select id="activities-cycle">${Array.from({ length: rules.maxCycleDays }, (_, i) => `<option value="${i + 1}" ${i + 1 === state.cycleDay ? "selected" : ""}>${i + 1}</option>`).join("")}</select></label>
    <label>Tiến độ nhiệm vụ <select id="activities-progress">${[0, 50, 100].map(n => `<option value="${n}" ${n === state.progress ? "selected" : ""}>${n}%</option>`).join("")}</select></label>
    <details open><summary>Debug progress nhiệm vụ</summary>
      <label>Nhiệm vụ <select id="activities-debug-mission" style="width:100%"></select></label>
      <p id="activities-debug-progress" role="status"></p>
      <label>Mức tăng <input id="activities-debug-step" type="number" min="1" max="9007199254740991" step="1" value="1" required></label>
      <button type="button" id="activities-debug-add">Tăng progress</button>
      <button type="button" id="activities-debug-complete">Hoàn thành</button>
      <button type="button" id="activities-debug-reset">Reset nhiệm vụ</button>
      <p>Tăng riêng nhiệm vụ đã chọn. Pet Points chỉ cộng khi bấm Nhận. Reset xoá tiến độ, quà nhiệm vụ đã nhận và Pet Points mô phỏng.</p>
    </details>
    <label>Pet Points <input id="activities-points" type="number" min="0" max="99999" value="${state.points}"></label>
    <label>Lượt quay <input id="activities-spins" type="number" min="0" max="999" value="${state.spins}"></label>
    <label>Thu nhập base / giây (MoneyTime) <input id="activities-income" type="number" min="0" value="${state.income}"></label>
    <button type="button" id="activities-reset">Đặt lại đã nhận</button><p id="activities-result" role="status"></p>
    <details><summary>Kiểm tra nhánh Event (inactive)</summary><p>Tab Event được giữ ẩn theo .ui. Công cụ này chỉ mở nội dung để kiểm tra.</p><label>Ngày Event có thể nhận <input id="activities-event-day" type="number" min="0" max="${rules.managerConstants.MAX_LOGIN_REWARD_EVENT_DAY}" value="${state.eventDay}"></label><button type="button" id="activities-event-preview">Xem nội dung Event</button></details>
    <details><summary>Giới hạn đối chiếu</summary><p>${rules.gaps.map(esc).join("<br>")}</p></details>`;
  panel.onchange = event => {
    if (event.target.id === "activities-debug-mission") { state.debugMission = event.target.value; state.tab = rules.tabs.find(tab => tab.content === "Missions").index; refresh(); return; }
    const map = { "activities-user": "userType", "activities-rebirth": "rebirth", "activities-day": "day", "activities-cycle": "cycleDay", "activities-event-day": "eventDay", "activities-progress": "progress", "activities-points": "points", "activities-spins": "spins", "activities-income": "income" };
    const key = map[event.target.id]; if (!key) return;
    state[key] = key === "userType" ? event.target.value : Math.max(0, Math.min(Number(event.target.max) || Number.MAX_SAFE_INTEGER, Number(event.target.value) || 0));
    if (["progress", "userType", "rebirth", "day", "cycleDay"].includes(key)) state.missionProgress.clear();
    if (["userType", "rebirth", "day"].includes(key)) state.claimed.clear();
    if (["userType", "rebirth", "day", "cycleDay"].includes(key)) { state.claimedMissions.clear(); state.claimedMilestones.clear(); state.points = 0; document.getElementById("activities-points").value = 0; }
    refresh();
  };
  for (const [id, complete] of [["activities-debug-add", false], ["activities-debug-complete", true]]) panel.querySelector("#" + id).onclick = () => {
    const row = missionRows().find(row => row.ID === state.debugMission);
    if (!row || state.claimedMissions.has(row.ID)) return;
    const input = document.getElementById("activities-debug-step"), step = Number(input.value);
    if (!complete && (!Number.isSafeInteger(step) || step < 1)) { input.reportValidity(); return; }
    state.missionProgress.set(row.ID, complete ? Number(row.TargetValue) : Math.min(Number(row.TargetValue), missionProgress(row) + step));
    state.tab = rules.tabs.find(tab => tab.content === "Missions").index; refresh();
  };
  panel.querySelector("#activities-debug-reset").onclick = () => {
    state.progress = 0; state.missionProgress.clear(); state.claimedMissions.clear(); state.claimedMilestones.clear(); state.points = 0;
    document.getElementById("activities-progress").value = "0"; document.getElementById("activities-points").value = "0";
    state.tab = rules.tabs.find(tab => tab.content === "Missions").index; refresh();
  };
  panel.querySelector("#activities-reset").onclick = () => { state.claimed.clear(); state.claimedMissions.clear(); state.claimedMilestones.clear(); state.claimedEvent.clear(); lastResult = ""; refresh(); };
  panel.querySelector("#activities-event-preview").onclick = () => { state.tab = rules.tabs.find(tab => tab.content === "Event").index; refresh(); };
  for (const type of ["pointerdown", "pointerup", "pointercancel", "pointerout"]) rendered.canvas.addEventListener(type, event => {
    const button = event.target.closest("button[data-ui-name]"); if (!button || button.disabled) return;
    const props = node(button)?.button; if (!props) return;
    const runtime = JSON.parse(button.dataset.uiRuntimeValues || "{}");
    uiRenderer.tint(button, type === "pointerdown" ? props.pressed : runtime.Color?.value || props.normal);
  });
  rendered.canvas.addEventListener("click", event => {
    const button = event.target.closest("button[data-ui-name]");
    if (!button || button.disabled || disposed || button.closest(".ui-closed")) return;
    const name = button.dataset.uiName;
    const tab = rules.tabs.find(t => t.button === name);
    if (tab) { state.tab = tab.index; refresh(); return; }
    if (name === "CloseButton" || name === "DarkBG") { uiPreview.open = false; rendered.canvas.classList.add("ui-closed"); document.getElementById("ui-open-toggle").textContent = "Mở UI"; return; }
    if (name === "SpinButton" && state.spins > 0 && !spinning) {
      spinning = true; state.spins--;
      const random = () => crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
      let draw = random() * rules.spin.reduce((n, r) => n + Number(r.Weight), 0);
      const selected = rules.spin.find(r => (draw -= Number(r.Weight)) < 0) || rules.spin.at(-1);
      const angle = Number(selected.MinAngle) + Math.floor(random() * (Number(selected.MaxAngle) - Number(selected.MinAngle) + 1));
      const wheel = lookup("SpinLayout"); wheel.style.transition = "none"; wheel.style.transform = "rotate(0deg)";
      requestAnimationFrame(() => { if (disposed) return; wheel.style.transition = `transform ${c.ROTATE_DURATION}ms cubic-bezier(0,0,.05,1)`; wheel.style.transform = `rotate(${-360 * c.MAX_SPINNING_WHEEL - angle}deg)`; });
      timer = setTimeout(() => { if (disposed) return; spinning = false; const info = rewardInfo(giftReward(selected.RewardId)); lastResult = `${info.description} ${info.amount}`.replace(/\[(?:[A-Fa-f\d]{6}|-)\]/g, ""); refresh(); }, c.ROTATE_DURATION);
      refresh(); return;
    }
    if (name !== "ClaimButton") return;
    const dailyEl = button.closest("[data-activity-day]"), missionEl = button.closest("[data-activity-mission]"), milestoneEl = button.closest("[data-activity-milestone]"), eventEl = button.closest("[data-activity-event]");
    if (dailyEl) { const day = Number(dailyEl.dataset.activityDay); if (day <= state.day) state.claimed.add(day); }
    if (missionEl && missionClaimable(rules.missions.find(r => r.ID === missionEl.dataset.activityMission))) {
      const row = rules.missions.find(r => r.ID === missionEl.dataset.activityMission); state.claimedMissions.add(row.ID);
      const pointAt = row.RewardType.split("|").findIndex(type => rules.itemTypes[type] === "DMMPoint");
      if (pointAt >= 0) state.points += Number(row.RewardValue.split("|")[pointAt]);
      document.getElementById("activities-points").value = state.points;
    }
    if (milestoneEl && state.points >= Number(milestoneEl.dataset.activityMilestone)) state.claimedMilestones.add(Number(milestoneEl.dataset.activityMilestone));
    if (eventEl && Number(eventEl.dataset.activityEvent) <= state.eventDay) state.claimedEvent.add(Number(eventEl.dataset.activityEvent));
    refresh();
  });
  refresh();
  return { refresh, dispose() { disposed = true; clearTimeout(timer); panel.onchange = null; } };
}

"use strict";

function initMailPreview(screen, rules, rendered) {
  const state = { tab: "notice", selected: 0, mails: [], ready: true }, c = rules.constants;
  const nodes = new Map();
  (function walk(n) { nodes.set(n.id, n); n.children.forEach(walk); })(screen.tree);
  const byKey = key => rendered.byId.get(rules.widgetIds[key]);
  const lookup = name => [...rendered.byId.values()].find(el => el.dataset.uiName === name);
  const child = (el, name) => [...(el?.children || [])].find(e => e.dataset.uiName === name);
  const node = el => nodes.get(el?.dataset.uiId || el?.dataset.uiSourceEntityId);
  const at = name => rules.bindings[name];
  function record(el, property, value, source) {
    if (!el) return;
    const data = JSON.parse(el.dataset.uiRuntimeValues || "{}"); data[property] = { value, source };
    el.dataset.uiRuntimeValues = JSON.stringify(data);
  }
  function visible(el, value, source = at("RefreshMailTitles")) { if (el) { el.classList.toggle("ui-inactive", !value); record(el, "IsVisible", value, source); } }
  function text(el, raw, source = at("UpdateNoticeContent")) {
    if (!el) return;
    raw = String(raw ?? "");
    uiRenderer.setText(el, raw.replace(/\[(?:\/?[bis]|[A-Fa-f0-9]{6}|-)\]/g, "")); record(el, "Content", raw, source);
    const content = el.querySelector(":scope > .ui-text > .ui-text-content");
    if (!content || !/\[(?:[bis]|[A-Fa-f0-9]{6})\]/.test(raw)) return;
    content.replaceChildren(); const stack = [content]; let offset = 0;
    for (const m of raw.matchAll(/\[(\/?[bis]|[A-Fa-f0-9]{6}|-)\]/g)) {
      stack.at(-1).appendChild(document.createTextNode(raw.slice(offset, m.index)));
      if (m[1].startsWith("/") || m[1] === "-") { if (stack.length > 1) stack.pop(); }
      else { const span = document.createElement(["b", "i", "s"].includes(m[1]) ? m[1] : "span"); if (span.tagName === "SPAN") span.style.color = "#" + m[1]; stack.at(-1).appendChild(span); stack.push(span); }
      offset = m.index + m[0].length;
    }
    stack.at(-1).appendChild(document.createTextNode(raw.slice(offset)));
  }
  function color(el, value, source = at("RefreshMailTitles")) { if (!el) return; node(el)?.text ? uiRenderer.setTextColor(el, value) : uiRenderer.tint(el, value); record(el, "Color", value, source); }
  function image(el, name, source = at("RefreshMailTitles")) {
    if (!el) return;
    const key = rules.spriteKeys[name], props = node(el)?.image || node(el)?.button || {};
    if (key) uiRenderer.setSprite(el, key, { ...props, color: "#FFFFFF" }, uiPreview.manifest);
    else uiRenderer.setImage(el, "", props);
    record(el, "SpriteName", { name, key }, source);
  }
  const layout = byKey("MailTitlesLayout"), titles = [...layout.children].filter(el => el.classList.contains("ui-entity"));
  const rewards = [...byKey("RewardsLayout").children].filter(el => el.classList.contains("ui-entity"));
  function cloneTitle() {
    const template = titles[0], el = template.cloneNode(true), index = titles.length;
    for (const part of [el, ...el.querySelectorAll("[data-ui-path]")]) {
      part.dataset.uiClonePath = part.dataset.uiPath; part.dataset.uiCloneTemplatePath = template.dataset.uiPath;
      part.dataset.uiCloneIndex = String(index); part.dataset.uiSourceEntityId = part.dataset.uiId;
      part.dataset.uiEntityKey = `clone:${template.dataset.uiId}#${index}:${part.dataset.uiId}`;
      delete part.dataset.uiId; delete part.dataset.uiPath;
    }
    const data = node(el).button;
    el.addEventListener("pointerdown", () => uiRenderer.tint(el, data.pressed));
    for (const event of ["pointerup", "pointercancel", "pointerleave"]) el.addEventListener(event, () => uiRenderer.tint(el, data.normal));
    layout.appendChild(el); titles.push(el); uiRenderer.refreshSprites(el);
  }
  for (const scroll of [lookup("MailsScrollView"), lookup("Scroll View")]) {
    Object.assign(scroll.style, { overflowY: "auto", overflowX: "hidden", pointerEvents: "auto", overscrollBehavior: "contain", scrollbarWidth: "none" });
    record(scroll, "ScrollPolicy", "native web scrolling; engine inertia unverified", "Mail.ui propsData.scrollView");
  }
  const url = byKey("Url") || lookup("Url"), input = document.createElement("input");
  input.value = rules.contactUrl; input.maxLength = node(url).propsData.text.maxLength; input.setAttribute("aria-label", "Liên hệ cộng đồng");
  const inputText = node(url).propsData.text;
  Object.assign(input.style, { width: "100%", height: "100%", border: "0", padding: "0", borderRadius: "0", background: node(url).propsData.input.color.normal, color: inputText.color, fontSize: `${inputText.fontSize}px`, fontStyle: inputText.fontStyle.italic ? "italic" : "normal", textAlign: inputText.alignment.h, pointerEvents: "auto" });
  // Retain the renderer's source label for Inspector, then overlay the input.
  text(url, input.value, at("InitMailHUD"));
  url.querySelector(":scope > .ui-text").style.display = "none";
  url.appendChild(input); record(url, "ActiveText", input.value, at("InitMailHUD"));
  input.addEventListener("input", () => record(url, "ActiveText", input.value, "Mail.ui UIInputEntity; local web input"));
  function amount(reward) {
    const rankValue = rank => (Math.floor(rank % 10000 / 10) + rank % 10 / 10) * 1000 ** (Math.floor(rank / 10000) - 1);
    if (reward.type === "Money") return `$${Math.floor(reward.amount % 10000 / 10)}.${reward.amount % 10} ${rules.suffixes[Math.floor(reward.amount / 10000)] || ""}`;
    if (reward.type === "MoneyTime") {
      const income = Math.max(0, Number(panel.querySelector("#mail-income").value) || 0);
      const cash = Math.max(rankValue(c.MIN_GIFT_MONEY_TIME), Math.min(rankValue(c.MAX_GIFT_MONEY_TIME), income * reward.amount * 3600));
      const group = Math.max(0, Math.floor(Math.log10(Math.max(1, cash)) / 3)), value = Math.floor(cash / 1000 ** group * 10) / 10;
      return `${value}${group ? " " + rules.suffixes[group + 1] : ""}`;
    }
    return `x${reward.amount}`;
  }
  function refresh() {
    const notice = state.tab === "notice", count = notice ? c.MAX_NOTICE_MAILS : state.mails.length;
    while (titles.length < count) cloneTitle();
    for (const [key, active] of [["TabNoticeButton", notice], ["TabSystemButton", !notice]]) {
      const button = lookup(key); image(button, active ? "SelectTabBG" : "NormalTabBG", at("UpdateTab"));
      color(child(button, "Label"), active ? c.ACTIVE_TEXT_COLOR : c.DEFAULT_TEXT_COLOR, at("UpdateTab"));
    }
    visible(byKey("NoticeContent"), notice, at("UpdateTab")); visible(byKey("SystemContent"), !notice, at("UpdateTab"));
    visible(lookup("AlertIconNotice"), false, at("RefreshMailTabs")); visible(lookup("AlertIconSystem"), state.mails.length > 0, at("RefreshMailTabs"));
    titles.forEach((el, i) => {
      el.dataset.mailIndex = String(i); visible(el, i < count);
      if (i >= count) return;
      const selected = state.selected === i, tint = selected ? c.ACTIVE_TEXT_COLOR : c.DEFAULT_TEXT_COLOR;
      image(el, selected ? "LongSelectTabBG" : "NormalTabBG"); image(child(el, "Icon"), notice ? "NewsIcon" : "MailsIcon");
      for (const name of ["Title", "TimeLabel", "ExpiredIcon"]) color(child(el, name), tint);
      visible(child(el, "TimeLabel"), !notice); visible(child(el, "ExpiredIcon"), !notice);
      const mail = state.mails[i], detail = rules.details.find(d => d.ID === mail?.detailId);
      text(child(el, "Title"), uiTranslate(notice ? rules.notices[i] : detail?.Title || "HUD_MAIL_TITLE_SYSTEM"), at(notice ? "UpdateNoticeTitles" : "UpdateSystemTitles"));
      if (!notice) text(child(el, "TimeLabel"), uiTranslate("HUD_REWARD_DATE", [mail.daysLeft]), at("UpdateSystemTitles"));
    });
    visible(byKey("MailsCount"), !notice, at("UpdateSystemMails")); text(byKey("MailsCount"), uiTranslate("HUD_MAIL_COUNT", [state.mails.length, c.MAX_MAILS]), at("UpdateSystemMails"));
    visible(byKey("NextVersionLabel"), notice && state.selected === 0, at("UpdateNoticeContent"));
    const mail = state.mails[state.selected], detail = rules.details.find(d => d.ID === mail?.detailId);
    text(byKey("MailContent"), uiTranslate(notice ? rules.contents[state.selected] : !state.ready ? "HUD_LOADING" : mail ? detail?.Content || "HUD_REWARD_NOT_RECEIVE" : "HUD_MAIL_NO_REWARD"), at(notice ? "UpdateNoticeContent" : "UpdateSystemContent"));
    const showRewards = !notice && state.ready && !!mail;
    visible(byKey("RewardsLayout"), showRewards, at("UpdateSystemContent")); visible(byKey("ClaimButton"), showRewards, at("UpdateSystemContent"));
    rewards.forEach((el, i) => {
      const rewardSource = "Assets/Scripts/Utils/UIUtils.fcg:638";
      const reward = showRewards && mail.rewards[i]; visible(el, !!reward, at("UpdateSystemRewards")); if (!reward) return;
      const isPet = reward.type === "Pet", petWidget = child(el, "RewardPet");
      visible(petWidget, isPet, rewardSource); visible(child(el, "RewardIcon"), !isPet, rewardSource);
      if (isPet) {
        image(child(petWidget, "PetThumbnail"), reward.icon, "Assets/Scripts/Utils/UIUtils.fcg:74");
        color(child(petWidget, "RarityBG"), rules.rarityColors[reward.rarity] || c.DEFAULT_TEXT_COLOR, "Assets/Scripts/Utils/UIUtils.fcg:74");
        visible(child(petWidget, "MutationIcon"), !!reward.mutationIcon, "Assets/Scripts/Utils/UIUtils.fcg:74");
        if (reward.mutationIcon) image(child(petWidget, "MutationIcon"), reward.mutationIcon, "Assets/Scripts/Utils/UIUtils.fcg:74");
        visible(child(petWidget, "SecretFusionIcon"), !!reward.badge, "Assets/Scripts/Utils/UIUtils.fcg:59");
        [...child(petWidget, "WeatherIcons").children].filter(e => e.classList.contains("ui-entity")).forEach((icon, index) => {
          visible(icon, index < reward.weatherIcons.length, "Assets/Scripts/Utils/UIUtils.fcg:74"); if (reward.weatherIcons[index]) image(icon, reward.weatherIcons[index], "Assets/Scripts/Utils/UIUtils.fcg:74");
        });
      } else image(child(el, "RewardIcon"), reward.icon || (reward.type === "RandomPet" ? `Summon${reward.rarity}` : rules.itemIcons[reward.type]), "Assets/Scripts/Utils/UIUtils.fcg:638");
      color(el, rules.rarityColors[reward.rarity || rules.itemRarities[reward.type]] || c.DEFAULT_TEXT_COLOR, "Assets/Scripts/Configs/ItemConfigs.fcg:82");
      text(child(el, "RewardAmount"), amount(reward), "Assets/Scripts/Configs/ItemConfigs.fcg:258");
    });
    uiRenderer.refreshLayouts(rendered.canvas, screen); renderUiResourcePanel();
  }
  const panel = document.getElementById("ui-player-panel");
  panel.innerHTML = `<h2>Mô phỏng Mail</h2><p>Thư Hệ thống là dữ liệu thử tổng hợp; nhận thử chỉ xóa thư trong RAM.</p><label>Hộp thư <select id="mail-fixture"><option value="empty">Trống</option><option value="sample">${rules.fixtures.length} thư thử</option><option value="full">Đầy ${c.MAX_MAILS} thư</option></select></label><label>Ô trống trong nhà (thử) <input id="mail-slots" type="number" min="0" value="10"></label><label>Thu nhập Money/s (thử) <input id="mail-income" type="number" value="100" min="0"></label><label><input type="checkbox" id="mail-ready" checked> Database sẵn sàng (thử trạng thái tải)</label><button id="mail-reset" type="button">Khôi phục mô phỏng</button><p id="mail-result" aria-live="polite"></p>`;
  function load() {
    const mode = panel.querySelector("#mail-fixture").value;
    state.mails = mode === "empty" ? [] : Array.from({ length: mode === "full" ? c.MAX_MAILS : rules.fixtures.length }, (_, i) => structuredClone(rules.fixtures[i % rules.fixtures.length]));
    state.selected = 0; panel.querySelector("#mail-result").textContent = ""; refresh();
  }
  panel.onchange = event => { if (event.target.id === "mail-fixture") load(); else { if (event.target.id === "mail-ready") state.ready = event.target.checked; refresh(); } };
  panel.onclick = event => { if (event.target.id === "mail-reset") load(); };
  function click(event) {
    const button = event.target.closest("button[data-ui-name]"); if (!button || button.closest(".ui-inactive")) return;
    const name = button.dataset.uiName;
    if (["CloseMailButton", "CloseButton"].includes(name)) { rendered.canvas.classList.add("ui-closed"); uiPreview.open = false; document.getElementById("ui-open-toggle").textContent = "Mở UI"; state.tab = "notice"; state.selected = 0; refresh(); return; }
    if (name === "TabNoticeButton" || name === "TabSystemButton") {
      const next = name === "TabNoticeButton" ? "notice" : "system";
      if (next !== state.tab) { state.tab = next; state.selected = 0; refresh(); } return;
    }
    if (button.dataset.mailIndex) { state.selected = Number(button.dataset.mailIndex); refresh(); }
    if (button === byKey("ClaimButton") && state.ready && state.mails[state.selected]) {
      const needSlots = state.mails[state.selected].rewards.filter(r => rules.petMailTypes.includes(r.type)).reduce((sum, r) => sum + r.amount, 0);
      const slots = panel.querySelector("#mail-slots");
      if (needSlots > Number(slots.value)) { panel.querySelector("#mail-result").textContent = uiTranslate("PROMPT_FULL_SLOT"); return; }
      slots.value = String(Math.max(0, Number(slots.value) - needSlots));
      state.mails.splice(state.selected, 1); panel.querySelector("#mail-result").textContent = "Đã nhận thử và xóa thư khỏi mô phỏng. Không cấp thưởng thật."; refresh();
    }
  }
  rendered.canvas.addEventListener("click", click); refresh();
  return { state, refresh, dispose() { rendered.canvas.removeEventListener("click", click); panel.onchange = panel.onclick = null; } };
}

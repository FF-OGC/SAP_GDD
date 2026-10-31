"use strict";
function initRebirthPreview(screen, rules, rendered) {
  const t = uiSourceTools(screen, rules, rendered), { key, child, text, visible, image, color } = t, c = rules.constants;
  const state = { level: rules.levels[0]?.ID, balance: "0", owned: new Set(), unlock: false, closed: false, previousRewards: [] };
  const main = key("Rebirth"), popup = key("UnlockContent");
  t.controls(`<label>Rebirth <select data-rebirth="level">${rules.levels.map(l => `<option value="${l.ID}">${l.ID}</option>`).join("")}</select></label><label>Tiền <input data-rebirth="balance" type="text" inputmode="numeric" value="0"></label><label><input type="checkbox" data-rebirth="owned"> Có đủ thú yêu cầu (mô phỏng)</label><button data-rebirth-action="reopen">Mở Rebirth</button><button data-rebirth-action="confirm">Xác nhận Rebirth mô phỏng</button><div data-rebirth-requirements></div>`, el => {
    if (el.dataset.rebirth === "level") { state.level = el.value; state.unlock = false; state.closed = false; state.owned.clear(); t.panel.querySelector('[data-rebirth="owned"]').checked = false; }
    if (el.dataset.rebirth === "balance") state.balance = el.value.replace(/[^\d]/g, "") || "0";
    if (el.dataset.rebirth === "owned") state.owned = new Set(el.checked ? current().NextLevelMobList.split(",").filter(Boolean) : []);
    render();
  });
  const current = () => rules.levels.find(l => l.ID === state.level);
  function rewardWidgets(layout, rows) {
    const widgets = [...(layout?.children || [])].filter(el => el.classList.contains("ui-entity"));
    widgets.forEach((el, i) => {
      const row = rows[i]; visible(el, !!row, "ResetRewardsLayout"); if (!row) return;
      image(child(el, "Icon"), row.icon, "UpdateRewardWidget"); color(child(el, "Icon"), ["PetSlots", "Swap", "Steal"].includes(row.type) ? "#1F64C4" : "#FFFFFF", "UpdateRewardWidget");
      text(child(el, "Label"), uiTranslate(row.label), "UpdateRewardWidget");
      let value = row.value;
      if (row.type === "CashIncome") value = "x" + Number(value).toFixed(2).replace(/0$/, "");
      else if (row.type === "LockDuration") value += "s";
      else if (row.type === "PetSlots") value = "+" + value;
      else if (row.type === "Steal") value = uiTranslate(value);
      else if (row.type === "ExtendMoney") value = t.money(value);
      visible(child(el, "ValueLabel"), !["Swap", "Fusion", "Portal"].includes(row.type), "UpdateRewardWidget"); text(child(el, "ValueLabel"), value, "UpdateRewardWidget");
    });
  }
  function render() {
    const row = current(), max = row === rules.levels.at(-1), ids = max ? [] : row.NextLevelMobList.split(",").filter(Boolean);
    visible(main, !state.closed && !state.unlock, "OpenRebirthWidget"); visible(popup, state.unlock, "OpenUnlockPopup");
    rewardWidgets(key("RewardsLayout"), max ? [] : row.rewards); rewardWidgets(child(popup, "RewardsLayout"), state.previousRewards);
    const cost = BigInt(row.NextLevelMoney.replaceAll(",", "") || "0"), balance = BigInt(state.balance), filled = cost > 0n ? Math.min(1, Number(balance * 10000n / cost) / 10000) : 1;
    const progress = key("ReqMoneyProgress"); if (progress) { uiRenderer.setFillAmount(progress, max ? 0 : filled, t.node(progress)?.image); t.record(progress, "FillAmount", max ? 0 : filled, "UpdateRequireMoney"); }
    text(key("ReqMoneyLabel"), max ? "$ ??? / ???" : `$ ${t.money(balance > cost ? cost : balance)} / ${t.money(cost)}`, "UpdateRequireMoney");
    visible(key("WarningLabel"), max, "CheckMaxLevel"); text(key("WarningLabel"), uiTranslate(max ? "HUD_REBIRTH_MAX_LEVEL" : "HUD_REBIRTH_WARNING"), "CheckMaxLevel"); visible(key("RebirthButton"), !max, "CheckMaxLevel");
    const layout = key("ReqPetsLayout"), cards = t.slots(layout, ids.length);
    uiRenderer.setSize(layout, { width: Math.max(0, c.REQUIRE_PETS_LAYOUT_SIZE * ids.length + (ids.length - 1) * c.REQUIRE_PETS_LAYOUT_DISTANCE), height: c.REQUIRE_PETS_LAYOUT_SIZE }, rendered.canvas, screen);
    cards.forEach((el, i) => {
      const pet = rules.pets.find(p => p.ID === ids[i]), owned = state.owned.has(ids[i]);
      image(el, "ItemBG", "UpdatePetWidgetV3");
      image(child(el, "Thumbnail"), pet?.Name, "UpdateRequirePetWidget"); color(child(el, "Rarity"), rules.rarityColors[pet?.Rarity], "UpdateRequirePetWidget"); text(child(el, "Name"), uiTranslate(pet?.nameKey), "UpdateRequirePetWidget");
      color(child(el, "Thumbnail"), "#FFFFFF", "UpdatePetWidgetV3");
      visible(child(el, "Thumbnail"), true, "UpdatePetWidgetV3"); visible(child(el, "Name"), true, "UpdatePetWidgetV3");
      text(child(el, "Income"), t.money(pet?.Value) + "/s", "UpdatePetWidgetV3"); visible(child(el, "Income"), true, "UpdatePetWidgetV3");
      for (const name of ["HasMW", "Mutation", "Weathers"]) visible(child(el, name), false, "UpdatePetWidgetV3");
      visible(child(el, "DarkMask"), !owned, "UpdateRequirePetWidget"); visible(child(el, "OwnedMask"), owned, "UpdateRequirePetWidget");
      const redirect = child(child(el, "Name"), "RedirectCollectionButton"); visible(redirect, !owned, "UpdateRequirePetWidget"); if (redirect) redirect.onclick = () => t.status(`Mô phỏng mở Collection: ${uiTranslate(pet?.nameKey)} (ID ${pet?.ID}).`);
    });
    t.panel.querySelector("[data-rebirth-requirements]").textContent = max ? uiTranslate("HUD_REBIRTH_MAX_LEVEL") : `Yêu cầu: ${ids.map(id => uiTranslate(rules.pets.find(p => p.ID === id)?.nameKey)).join(", ") || "—"}`;
    t.refresh();
  }
  function confirm() {
    const row = current(), index = rules.levels.indexOf(row), required = row.NextLevelMobList.split(",").filter(Boolean);
    if (index === rules.levels.length - 1 || BigInt(state.balance) < BigInt(row.NextLevelMoney.replaceAll(",", "") || "0") || required.some(id => !state.owned.has(id))) { t.status("Chưa đủ điều kiện Rebirth trong mô phỏng."); return; }
    state.previousRewards = row.rewards; state.level = rules.levels[index + 1].ID; state.unlock = true; state.owned.clear(); state.balance = "0";
    t.panel.querySelector('[data-rebirth="level"]').value = state.level; t.panel.querySelector('[data-rebirth="balance"]').value = "0"; t.panel.querySelector('[data-rebirth="owned"]').checked = false; render(); t.status("Rebirth mô phỏng thành công; không ghi dữ liệu game.");
  }
  t.panel.onclick = e => { if (e.target.dataset.rebirthAction === "confirm") confirm(); if (e.target.dataset.rebirthAction === "reopen") { state.closed = false; state.unlock = false; render(); } };
  rendered.canvas.addEventListener("click", e => {
    const button = e.target.closest("button"); if (!button) return;
    if (button.dataset.uiName === "RebirthButton") { t.status("ConfirmWidget không còn trong cây UI hiện tại. Dùng nút xác nhận mô phỏng ngoài canvas để thử UnlockContent."); }
    if (["CloseButton", "OkButton"].includes(button.dataset.uiName)) { state.unlock = false; state.closed = true; render(); }
  });
  render(); return { state, render, dispose() { t.panel.onchange = t.panel.onclick = null; } };
}

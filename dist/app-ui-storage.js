"use strict";

function initStoragePreview(screen, rules, rendered) {
  const t = uiSourceTools(screen, rules, rendered), c = rules.constants;
  const defaultRebirth = rules.rebirth.find(r => Number(r.Storage) > 0) || rules.rebirth[0];
  const state = { rebirth: defaultRebirth.ID, capacityOverride: 0, page: 1, selected: 0, open: true, confirm: false, remind: true, inTrigger: true, selecting: true, pets: rules.fixtures.map(r => ({ ...r, weatherIds: [...r.weatherIds] })) };
  const capacity = () => state.capacityOverride || Number(rules.rebirth.find(r => r.ID === state.rebirth)?.Storage || 0);
  const pages = () => Math.max(1, Math.ceil(capacity() / c.MAX_PETS_PER_PAGE));
  const locked = entry => !!entry?.locked;
  const petConfig = entry => rules.pets.find(p => p.ID === entry?.petId);
  const detail = t.key("PetDetails"), petWidget = t.child(t.key("LevelLabel").parentElement.parentElement, "PetWidget") || t.key("LevelLabel").parentElement;
  const storage = t.find("Storage"), confirm = t.find("Confirm"), layout = t.key("PetsLayout");
  function income(entry) {
    const p = petConfig(entry);
    if (!p) return "0";
    const mutation = rules.mutations.find(r => r.ID === entry.mutationId);
    const additive = (entry.weatherIds || []).map(id => rules.effects.find(r => r.ID === id)).filter(Boolean).reduce((sum, r) => sum + Number(r.MultiplierPrice || 0), 0);
    const multiplier = Number(mutation?.Multiplier || 1) + additive;
    // Fixtures are level one; integer arithmetic keeps large CSV values intact.
    const scale = 1000000n, amount = BigInt(p.Value.replaceAll(",", "") || "0");
    return String(amount * BigInt(Math.round(multiplier * Number(scale))) / scale);
  }
  function renderPet(el, entry) {
    const p = petConfig(entry), at = "UpdatePetWidgetV3";
    t.image(el, p ? "ItemBG" : "EmptyItemBG", at);
    for (const name of ["Rarity", "Thumbnail", "Name", "Income"]) t.visible(t.child(el, name), !!p, at);
    t.visible(t.child(el, "HasMW"), !!p && (entry.mutationId !== "1" || entry.weatherIds.length > 0), at);
    if (!p) return;
    t.color(t.child(el, "Rarity"), rules.rarityColors[p.Rarity], at);
    t.image(t.child(el, "Thumbnail"), p.Name, at);
    t.color(t.child(el, "Thumbnail"), "#FFFFFF", at);
    t.text(t.child(el, "Name"), uiTranslate(p.nameKey), at);
    t.text(t.child(el, "Income"), t.money(income(entry)) + "/s", at);
  }
  const formatTime = value => { const units = [[Math.floor(value / 3600), "HOUR"], [Math.floor(value % 3600 / 60), "MINUTE"], [value % 60, "SECOND"]]; return units.filter(([amount]) => amount > 0).slice(0, 2).map(([amount, unit]) => uiTranslate(`TIME_${unit}${amount === 1 ? "" : "S"}`, [amount])).join(" "); };
  function render() {
    state.page = Math.min(state.page, pages());
    t.visible(storage, state.open && capacity() > 0, "OpenStorage");
    t.visible(confirm, state.confirm, "OpenConfirmWidget");
    const confirmDetails = t.child(confirm, "ConfirmDetails");
    if (confirmDetails) t.text(confirmDetails, uiTranslate(t.node(confirmDetails)?.text?.key), "Assets/Localization/key.csv:HUD_STORAGE_WARNING");
    t.visible(t.key("CheckRemindIcon"), !state.remind, "ToggleAllowRemindConfirm");
    t.visible(t.find("OpenStorageButton"), state.inTrigger, "ShowPetStorageHUD");
    t.visible(t.find("StoreButton"), state.inTrigger && state.selecting, "ShowPetStorageHUD");
    const start = (state.page - 1) * c.MAX_PETS_PER_PAGE, count = Math.max(0, Math.min(c.MAX_PETS_PER_PAGE, capacity() - start));
    const cards = t.slots(layout, count);
    cards.forEach((el, index) => { const slot = start + index; renderPet(el, state.pets[slot]); t.visible(t.child(el, "SelectBorder"), slot === state.selected, "UpdateSelectPetWidget"); el.dataset.storageSlot = String(slot); });
    t.text(t.key("PageLabel"), `${state.page} / ${pages()}`, "UpdatePaging");
    t.visible(t.key("PrevPageButton"), state.page > 1, "UpdatePaging");
    t.visible(t.key("NextPageButton"), state.page < pages(), "UpdatePaging");
    const entry = state.pets[state.selected], p = petConfig(entry), hasPet = !!p && state.selected < capacity();
    t.visible(detail, hasPet, "UpdatePetDetails");
    t.visible(t.key("RetrievePetButton"), hasPet, "UpdatePetDetails");
    if (hasPet) {
      renderPet(petWidget, entry);
      t.text(t.child(petWidget, "RarityName"), uiTranslate(rules.rarityNames[p.Rarity] || p.Rarity), "UpdatePetDetails");
      t.color(t.child(petWidget, "RarityName"), rules.rarityTextColors[p.Rarity], "UpdatePetDetails");
      t.text(t.key("LevelLabel"), uiTranslate("HUD_BASE_LEVEL", [entry.level]), "UpdatePetDetails");
      t.text(t.key("PriceLabel"), "$" + t.money(p.Price), "UpdatePetDetails");
      t.text(t.key("IncomeLabel"), "$" + t.money(income(entry)) + "/s", "UpdatePetDetails");
      const mutation = rules.mutations.find(r => r.ID === entry.mutationId);
      t.visible(t.key("MutationIcon"), !!mutation && mutation.Name !== "Normal", "UpdatePetDetails");
      if (mutation && mutation.Name !== "Normal") t.image(t.key("MutationIcon"), mutation.Name, "UpdatePetDetails");
      [...t.key("WeathersLayout").children].filter(el => el.classList.contains("ui-entity")).forEach((el, i) => { const effect = rules.effects.find(r => r.ID === entry.weatherIds[i]); t.visible(el, !!effect, "UpdatePetDetails"); if (effect) t.image(el, effect.Icon, "UpdatePetDetails"); });
      const lock = t.child(t.key("RetrievePetButton"), "Locked");
      t.visible(lock, locked(entry), "UpdatePetDetails");
      t.text(t.child(lock, "RetrieveTimer"), uiTranslate("HUD_STORAGE_RETRIEVE_TIMER", [formatTime(rules.lockDuration)]), "UpdatePetDetails");
    }
    const control = name => t.panel.querySelector(`[data-storage="${name}"]`);
    if (control("mutation")) control("mutation").value = entry?.mutationId || "1";
    if (control("weather")) control("weather").value = entry?.weatherIds[0] || "";
    if (control("locked")) control("locked").checked = locked(entry);
    if (control("selecting")) control("selecting").checked = state.selecting;
    t.refresh();
  }
  function changePage(delta) { state.page = Math.max(1, Math.min(pages(), state.page + delta)); state.selected = (state.page - 1) * c.MAX_PETS_PER_PAGE; render(); }
  function storePet() {
    if (!state.inTrigger || !state.selecting) return;
    const free = Array.from({ length: capacity() }, (_, i) => i).find(i => !state.pets[i]);
    if (free === undefined) { t.status("Kho thử đã đầy; không gửi request game."); return; }
    const prototype = rules.fixtures[0];
    state.pets[free] = { ...prototype, weatherIds: [], locked: true }; state.selecting = false; state.confirm = false; render(); t.status("Đã mô phỏng cất pet level 1; slot mới bị khóa theo thời gian nguồn.");
  }
  t.controls(`<label>Rebirth <select data-storage="rebirth">${rules.rebirth.map(r => `<option value="${esc(r.ID)}" ${r.ID === state.rebirth ? "selected" : ""}>${esc(r.ID)} · ${esc(r.Storage)} ô</option>`).join("")}</select></label><label>Số ô thử (0 = config; > config là QA) <input data-storage="capacity" type="number" min="0" max="90" value="0"></label><label><input data-storage="trigger" type="checkbox" checked> Trong vùng Storage</label><label><input data-storage="selecting" type="checkbox" checked> Đang chọn pet để cất</label><label>Mutation ô đang chọn <select data-storage="mutation">${rules.mutations.map(r => `<option value="${esc(r.ID)}">${esc(r.Name)}</option>`).join("")}</select></label><label>Weather ô đang chọn <select data-storage="weather"><option value="">Không có</option>${rules.effects.map(r => `<option value="${esc(r.ID)}">${esc(r.Name)}</option>`).join("")}</select></label><label><input data-storage="locked" type="checkbox"> Khóa lấy pet đang chọn (8 giờ nguồn)</label><button type="button" data-storage-empty>Làm trống kho thử</button><button type="button" data-storage-fill>Nạp pet mẫu vào các ô</button>`, el => {
    const name = el.dataset.storage, entry = state.pets[state.selected];
    if (name === "rebirth") { state.rebirth = el.value; state.page = 1; state.selected = 0; }
    if (name === "capacity") { state.capacityOverride = Math.max(0, Math.min(90, Number(el.value) || 0)); state.page = 1; state.selected = 0; }
    if (name === "trigger") state.inTrigger = el.checked;
    if (name === "selecting") state.selecting = el.checked;
    if (name === "mutation" && entry) entry.mutationId = el.value;
    if (name === "weather" && entry) entry.weatherIds = el.value ? [el.value] : [];
    if (name === "locked" && entry) entry.locked = el.checked;
    render();
  });
  t.panel.onclick = event => {
    if (event.target.closest("[data-storage-empty]")) { state.pets = []; state.selected = 0; state.page = 1; render(); }
    if (event.target.closest("[data-storage-fill]")) { state.pets = Array.from({ length: capacity() }, (_, i) => ({ ...rules.fixtures[i % rules.fixtures.length], weatherIds: [] })); render(); }
  };
  rendered.canvas.addEventListener("click", event => {
    const button = event.target.closest("button"), card = button?.closest("[data-storage-slot]");
    if (card) { state.selected = Number(card.dataset.storageSlot); render(); return; }
    if (!button) return;
    if (button === t.key("PrevPageButton")) return changePage(-1);
    if (button === t.key("NextPageButton")) return changePage(1);
    if (button === t.find("OpenStorageButton")) { state.open = true; state.page = 1; state.selected = 0; render(); return; }
    if (button === t.find("StoreButton")) { if (state.remind) { state.confirm = true; render(); } else storePet(); return; }
    if (button === t.key("RetrievePetButton")) {
      if (locked(state.pets[state.selected])) { t.status("Pet thử đang khóa; không gửi request game."); return; }
      if (state.pets[state.selected]) { state.pets.splice(state.selected, 1); state.page = 1; state.selected = 0; render(); t.status("Đã mô phỏng lấy pet; không thay đổi kho thật."); }
      return;
    }
    if (button === t.child(confirm, "YesButton")) return storePet();
    if (button === t.child(t.child(confirm, "NotRemindLabel"), "NotRemindButton")) { state.remind = !state.remind; render(); return; }
    if (button.closest('[data-ui-name="Confirm"]') && ["DarkBG", "NoButton", "CloseButton"].includes(button.dataset.uiName)) state.confirm = false;
    if (button.closest('[data-ui-name="Storage"]') && ["DarkBG", "CloseButton"].includes(button.dataset.uiName)) state.open = false;
    render();
  });
  render();
  return { state, render, dispose() { t.panel.onclick = t.panel.onchange = null; } };
}

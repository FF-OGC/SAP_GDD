"use strict";

function fusionPreviewModel(rules) {
  const all = rules.pets, byId = id => all.find(p => p.ID === String(id)), byRank = rank => all.find(p => +p.Rank === rank);
  const secret = p => +p.ID > rules.constants.SECRET_FUSION_PET_START_INDEX;
  const maxRank = Math.max(...all.map(p => +p.Rank));
  function previous(rank, a, b) {
    const original = rank;
    while (!byRank(rank) || secret(byRank(rank)) || (byRank(rank).CanFuse !== "1" && rank !== +a.Rank && rank !== +b.Rank)) { if (--rank < 1) return byRank(original); }
    return byRank(rank);
  }
  function nextSecret(rank) {
    const candidates = all.filter(p => secret(p) && +p.Rank > rank).sort((a, b) => +a.Rank - +b.Rank);
    return candidates[0]?.CanFuse === "1" ? candidates[0] : all.filter(p => secret(p) && +p.Rank <= rank).sort((a, b) => +b.Rank - +a.Rank)[0];
  }
  function compute(a, b, used = 0) {
    const sameRarity = a.Rarity === b.Rarity, lowerRarity = rules.rarityIndex[a.Rarity] < rules.rarityIndex[b.Rarity] ? a.Rarity : b.Rarity;
    const highSecret = Math.max(secret(a) ? +a.Rank : -1, secret(b) ? +b.Rank : -1), hi = Math.max(+a.Rank, +b.Rank), middle = Math.floor((+a.Rank + +b.Rank) / 2) + 1;
    const secretPet = highSecret > 0 && sameRarity ? nextSecret(highSecret) : byId(rules.entrySecret[lowerRarity]);
    const cap = Number(String(secretPet?.DustCap || 0).replaceAll(",", "")), dust = Math.min(cap, Math.max(0, used));
    const sr = rules.constants.BASE_SECRET_RATE / 100 + (cap ? dust / cap : 0) * (1 - rules.constants.BASE_SECRET_RATE / 100), standard = 1 - sr;
    const up = 1 / (1 + rules.constants.rankChanceScalar * Math.abs(+a.Rank - +b.Rank));
    let results;
    if (a.ID === b.ID) results = [[a, standard]];
    else if (highSecret > 0) results = [[byRank(highSecret), standard * (1 - up)], [previous(middle, a, b), standard * up]];
    else if (hi === maxRank) results = [[previous(hi, a, b), standard * (1 - up)], [previous(middle, a, b), standard * up]];
    else results = [[previous(middle, a, b), standard * (1 - up)], [previous(hi + 1, a, b), standard * up]];
    results.push([secretPet, sr]);
    const merged = [];
    for (const [pet, weight] of results) if (pet && weight > 0) { const same = merged.find(x => x.pet.ID === pet.ID); if (same) same.weight += weight; else merged.push({ pet, weight }); }
    if (merged.length === 2) { merged[0].weight /= 2; merged.unshift({ ...merged[0] }); }
    const amount = value => BigInt(String(value || "0").replaceAll(",", ""));
    const priceA = amount(a.Price), priceB = amount(b.Price);
    return { results: merged, cap, dust, cost: (priceA > priceB ? priceA : priceB) * BigInt(rules.constants.FUSION_COST_MULTIPLIER), yield: Math.round(Math.sqrt(rules.dustYield[a.Rarity] * rules.dustYield[b.Rarity])) };
  }
  return { all, byId, compute };
}

function fusionPetWidget(t, el, pet, rules) {
  if (!el || !pet) return;
  const child = name => t.child(el, name);
  t.image(el, "ItemBG", "UpdatePetWidgetV3"); t.visible(el, true, "UpdatePetWidgetV3");
  t.color(child("Rarity"), rules.rarityColors[pet.Rarity], "UpdatePetWidgetV3");
  t.visible(child("Thumbnail"), true, "UpdatePetWidgetV3"); t.image(child("Thumbnail"), pet.Name, "UpdatePetWidgetV3"); t.color(child("Thumbnail"), "#FFFFFF", "UpdatePetWidgetV3");
  t.text(child("Name"), uiTranslate(pet.nameKey), "UpdatePetWidgetV3"); t.visible(child("Name"), true, "UpdatePetWidgetV3");
  t.text(child("Income"), t.money(pet.Value) + "/s", "UpdatePetWidgetV3");
  for (const name of ["HasMW", "Mutation", "Weathers"]) t.visible(child(name), false, "UpdatePetWidgetV3");
}

function initFusionConfirmPreview(screen, rules, rendered) {
  const t = uiSourceTools(screen, rules, rendered), model = fusionPreviewModel(rules), c = rules.constants;
  const state = { a: model.all[0].ID, b: model.all[1].ID, dust: 0, rich: false, walletDust: 0, confirmed: false };
  const options = model.all.filter(p => p.CanFuse === "1").map(p => `<option value="${p.ID}">${p.ID} · ${uiTranslate(p.nameKey)}</option>`).join("");
  t.controls(`<label>Nguyên liệu 1 <select data-fusion-pet="a">${options}</select></label><label>Nguyên liệu 2 <select data-fusion-pet="b">${options}</select></label><label><input type="checkbox" data-fusion-rich> Đủ tiền/bụi (mô phỏng)</label><button type="button" data-fusion-reopen>Mở lại xác nhận</button>`, el => {
    if (el.dataset.fusionPet) { state[el.dataset.fusionPet] = el.value; state.dust = 0; }
    if (el.hasAttribute("data-fusion-rich")) state.rich = el.checked;
    state.confirmed = false; render();
  });
  t.panel.querySelector('[data-fusion-pet="b"]').value = state.b;
  t.panel.querySelector("[data-fusion-reopen]").onclick = () => { state.confirmed = false; t.visible(t.key("FusionButton").parentElement, true, "ShowFusionConfirmHUD"); t.visible(t.find("DarkBG"), true, "ShowFusionConfirmHUD"); render(); };
  function render() {
    const a = model.byId(state.a), b = model.byId(state.b), data = model.compute(a, b, state.dust);
    state.walletDust = state.rich ? data.cap : 0; state.dust = Math.min(state.dust, state.walletDust);
    const computed = model.compute(a, b, state.dust);
    fusionPetWidget(t, t.key("PetMaterial1"), a, rules); fusionPetWidget(t, t.key("PetMaterial2"), b, rules);
    const cards = [...t.key("PetResultsLayout").children].filter(el => el.classList.contains("ui-entity"));
    cards.forEach((el, i) => { const index = computed.results.length === 1 ? (i === 1 ? 0 : -1) : i, result = computed.results[index]; t.visible(el, !!result, "UpdatePetResults"); if (result) fusionPetWidget(t, el, result.pet, rules); });
    for (let i = 0; i < 3; i++) {
      const suffix = ["1", "2", "Secret"][i], widget = t.key("Chance" + suffix), label = t.key("Chance" + suffix + "Label");
      const result = computed.results[computed.results.length === 1 ? (i === 1 ? 0 : -1) : i];
      t.visible(widget, !!result, "UpdateChancesWidgets"); t.visible(label, !!result, "UpdateChancesWidgets");
      if (!result) continue;
      const percent = result.weight * 100, tier = rules.chances.find(x => x.operator === ">=" ? percent >= x.threshold : percent > x.threshold) || { key: "HUD_FUSION_IMPOSSIBLE", count: 3 };
      t.text(label, uiTranslate(tier.key), "UpdateChanceWidgetV2");
      [...widget.children].filter(el => el.classList.contains("ui-entity")).forEach((el, j) => { t.visible(el, j < tier.count, "UpdateChanceWidgetV2"); t.color(el, percent >= 60 ? c.GREEN_CHANCE : c.RED_CHANCE, "UpdateChanceWidgetV2"); const visual = el.querySelector(":scope > .ui-image"); if (visual) visual.style.transform = percent >= 60 ? "scaleY(-1)" : ""; t.record(el, "Flip", percent >= 60 ? 2 : 1, "UpdateChanceWidgetV2"); });
    }
    t.text(t.key("DustBalance"), t.money(state.walletDust), "UpdateDustBalance"); t.text(t.key("CostMoneyAmount"), t.money(computed.cost), "UpdateCostAmountWidget");
    t.color(t.key("CostMoneyAmount"), state.rich ? c.ACTIVE_MONEY_COLOR : c.INACTIVE_MONEY_COLOR, "UpdateCostAmountWidget");
    t.text(t.key("CostDustAmount"), t.money(state.dust), "UpdateDustAmount"); t.text(t.key("DustAmount"), `${t.money(state.dust)} / ${t.money(computed.cap)}`, "UpdateDustAmount");
    uiRenderer.setFillAmount(t.key("DustPercent"), computed.cap ? state.dust / computed.cap : 0, t.node(t.key("DustPercent"))?.image); t.record(t.key("DustPercent"), "FillAmount", computed.cap ? state.dust / computed.cap : 0, "UpdateDustAmount");
    t.visible(t.key("MutationPercentsLayout"), false, "UpdateMutationPercents"); t.refresh();
  }
  rendered.canvas.addEventListener("click", event => {
    const name = event.target.closest("button")?.dataset.uiName; if (!name) return;
    const data = model.compute(model.byId(state.a), model.byId(state.b), state.dust);
    if (name === "CloseButton") { t.visible(t.find("Container"), false, "HideFusionConfirmHUD"); t.visible(t.find("DarkBG"), false, "HideFusionConfirmHUD"); }
    else if (name === "FusionButton") { if (state.confirmed) return; state.confirmed = true; t.visible(t.find("Container"), false, "HandleFusionPets"); t.visible(t.find("DarkBG"), false, "HideFusionConfirmHUD"); t.status("Đã đóng xác nhận; yêu cầu fusion được mô phỏng cục bộ. Xem tab Fusion Result để thử kết quả."); }
    else if (name === "ExchangeButton") t.status("Game mở Exchange Dust; UI đó ngoài phạm vi lần này.");
    else if (["IncDustButton", "DecDustButton", "MaxDustButton", "MinDustButton"].includes(name)) {
      const next = name === "MaxDustButton" ? Math.min(data.cap, state.walletDust) : name === "MinDustButton" ? 0 : state.dust + (name === "IncDustButton" ? 1 : -1) * c.FUSION_DUST_ADJUSTMENT_STEP;
      if (next > state.walletDust) { t.status(uiTranslate("PROMPT_NOT_ENOUGH_DUST")); return; }
      if (next < 0 || next > data.cap) return; state.dust = next; render();
    }
  });
  render(); return { state, render };
}

function initFusionResultPreview(screen, rules, rendered) {
  const t = uiSourceTools(screen, rules, rendered), model = fusionPreviewModel(rules), a = model.all[0], b = model.all[1], computed = model.compute(a, b);
  const state = { result: computed.results[0]?.pet.ID, rich: false, weekend: false };
  t.controls(`<label>Kết quả (mô phỏng) <select data-fusion-result>${computed.results.map(r => `<option value="${r.pet.ID}">${uiTranslate(r.pet.nameKey)}</option>`).join("")}</select></label><label><input type="checkbox" data-result-rich> Đủ Pet Coin</label><label><input type="checkbox" data-result-weekend> Đủ điều kiện bonus cuối tuần</label><button type="button" data-result-reopen>Mở lại kết quả</button>`, el => { if (el.hasAttribute("data-fusion-result")) state.result = el.value; if (el.hasAttribute("data-result-rich")) state.rich = el.checked; if (el.hasAttribute("data-result-weekend")) state.weekend = el.checked; render(); });
  function render() {
    fusionPetWidget(t, t.key("PetMaterial1"), a, rules); fusionPetWidget(t, t.key("PetMaterial2"), b, rules); fusionPetWidget(t, t.key("PetResult"), model.byId(state.result), rules);
    for (const [n, pet] of [[1, a], [2, b]]) { t.text(t.key("CostRetrievePet" + n), rules.rarityIndex[pet.Rarity] * rules.constants.RETRIEVE_COST_MULTIPLIER, "UpdateRetrieveCostWidgets"); t.color(t.key("CostRetrievePet" + n), state.rich ? rules.constants.ACTIVE_COIN_COLOR : rules.constants.INACTIVE_COIN_COLOR, "UpdateRetrieveCostWidgets"); }
    t.visible(t.key("DustResult"), true, "UpdateDustAmount"); t.visible(t.key("WeekendBonus"), state.weekend, "UpdateDustAmount");
    t.text(t.key("DustAmount"), state.weekend ? `[s][1F64C4]${t.money(computed.yield)}[-][/s] [F57C00]${t.money(computed.yield * rules.constants.WEEKEND_DUST_MULTIPLIER)}[-]` : `[1F64C4]${t.money(computed.yield)}[-]`, "UpdateDustAmount"); t.refresh();
  }
  t.panel.querySelector("[data-result-reopen]").onclick = () => { t.visible(t.find("Container"), true, "ShowFusionResultHUD"); t.visible(t.find("DarkBG"), true, "ShowFusionResultHUD"); render(); };
  rendered.canvas.addEventListener("click", event => { const name = event.target.closest("button")?.dataset.uiName; if (["CloseButton", "DarkBG", "ClaimPetResultButton", "RetrievePet1Button", "RetrievePet2Button"].includes(name)) { t.visible(t.find("Container"), false, "HandleGetPet"); t.visible(t.find("DarkBG"), false, "HideFusionResultHUD"); t.status("Đã đóng kết quả; nhận/retrieve chỉ mô phỏng, không cấp vật phẩm."); } else if (name === "Tooltip") t.status("Tooltip pet ngoài phạm vi popup lần này."); });
  render(); return { state, render };
}

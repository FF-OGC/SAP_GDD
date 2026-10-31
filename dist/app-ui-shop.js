"use strict";

function initShopPreview(screen, rules, rendered) {
  const c = rules.constants, nodes = new Map(), state = { open: true, coins: 0n, money: 0n, friend: false, rebirth: 1, wave: rules.waves[0]?.ID, selected: null, stocks: new Map(), cooldowns: new Map(), end: 0 };
  (function walk(n) { nodes.set(n.id, n); n.children.forEach(walk); })(screen.tree);
  const byKey = key => rendered.byId.get(rules.widgetIds[key]);
  const child = (el, name) => [...(el?.children || [])].find(e => e.dataset.uiName === name);
  const node = el => nodes.get(el?.dataset.uiId || el?.dataset.uiSourceEntityId);
  const shop = byKey("BuyButton").parentElement, panel = document.getElementById("ui-player-panel");
  function record(el, property, value, source) {
    if (!el) return;
    const values = JSON.parse(el.dataset.uiRuntimeValues || "{}"); values[property] = { value, source };
    el.dataset.uiRuntimeValues = JSON.stringify(values);
  }
  function visible(el, value, source = rules.bindings.OpenShop) { if (el) { el.classList.toggle("ui-inactive", !value); record(el, "IsVisible", value, source); } }
  function text(el, value, source = rules.bindings.RenderNormalItem) {
    if (!el) return;
    const raw = String(value ?? "");
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
  function color(el, value, source) { if (el) { node(el)?.text ? uiRenderer.setTextColor(el, value) : uiRenderer.tint(el, value); record(el, "Color", value, source); } }
  function image(el, name, source) {
    if (!el) return;
    const key = rules.spriteKeys[name];
    if (key) { uiRenderer.setSprite(el, key, { ...(node(el)?.image || node(el)?.button || {}), color: "#FFFFFF" }, uiPreview.manifest); record(el, "SpriteName", { name, key }, source); }
  }
  const integer = value => { try { return BigInt(String(value || "0").split(",").map((s, i) => i ? s.padStart(3, "0") : s).join("")); } catch { return 0n; } };
  function money(value) {
    const s = String(value), group = Math.min(Math.floor((s.length - 1) / 3), 11);
    if (!group) return s;
    const n = s.length - group * 3, decimal = s.slice(n, n + 1).replace(/0$/, "");
    return `${s.slice(0, n)}${decimal ? "." + decimal : ""} ${rules.suffixes[group + 1] || ""}`;
  }
  function clone(template, parent, index) {
    const el = template.cloneNode(true);
    for (const part of [el, ...el.querySelectorAll("[data-ui-path]")]) {
      part.dataset.uiClonePath = part.dataset.uiPath; part.dataset.uiCloneTemplatePath = template.dataset.uiPath;
      part.dataset.uiCloneIndex = String(index); part.dataset.uiSourceEntityId = part.dataset.uiId;
      part.dataset.uiEntityKey = `clone:${template.dataset.uiId}#${index}:${part.dataset.uiId}`;
      delete part.dataset.uiId; delete part.dataset.uiPath;
    }
    for (const button of el.querySelectorAll("button")) {
      const data = node(button)?.button;
      if (!data) continue;
      button.addEventListener("pointerdown", () => uiRenderer.tint(button, data.pressed));
      for (const event of ["pointerup", "pointercancel", "pointerleave"]) button.addEventListener(event, () => uiRenderer.tint(button, data.normal));
    }
    parent.appendChild(el); uiRenderer.refreshSprites(el); return el;
  }
  const groups = Object.fromEntries(["normal", "rotation", "rebirth"].map(type => {
    const layout = byKey({ normal: "NormalItemsLayout", rotation: "RotationItemsLayout", rebirth: "RebirthPetsLayout" }[type]);
    return [type, { layout, cards: [...layout.children].filter(el => el.classList.contains("ui-entity")) }];
  }));
  const scroll = groups.normal.layout.parentElement.parentElement;
  scroll.style.overflowY = "auto"; scroll.style.overflowX = "hidden"; scroll.style.pointerEvents = "auto"; scroll.style.overscrollBehavior = "contain"; scroll.style.scrollbarWidth = "none";
  record(scroll, "ScrollPolicy", "native web scroll; engine inertia unverified", "Shop.ui propsData.scrollView");
  const normalPosition = node(byKey("NormalItems")).transform.anchoredPosition;
  function price(row, type) {
    if (type === "normal") return integer(row.Cost);
    if (type === "rebirth") return integer(row.Price) * BigInt(rules.petMultiplier.split(".")[0]);
    return integer(state.friend ? row.DiscountPrice : row.Price);
  }
  function rows(type) {
    if (type === "normal") return rules.normal;
    if (type === "rotation") return [...state.stocks.keys()].map(id => rules.rotation.find(r => r.ID === id)).filter(Boolean);
    if (state.rebirth <= 0 || state.rebirth > rules.maxRebirth) return [];
    const config = rules.rebirth.find(r => Number(r.ID) === state.rebirth), ids = config?.NextLevelMobList.split(",").filter(Boolean) || [];
    if (new Set(ids).size !== ids.length || ids.some(id => !rules.pets.some(p => p.ID === id))) return [];
    return ids.map(id => rules.pets.find(p => p.ID === id));
  }
  const weatherItem = row => /^Summon(Rainy|Snowy|Windy|Shadowfall|Rainbow)$/.test(row.Name);
  const remaining = id => Math.max(0, Math.ceil(((state.cooldowns.get(id) || 0) - Date.now()) / c.MILLISECONDS_PER_SECOND));
  let current = new Map();
  function available(row, type) { return price(row, type) <= (type === "rebirth" ? state.money : state.coins) && (type !== "rotation" || state.stocks.get(row.ID).left > 0) && (type !== "normal" || !remaining(row.ID)); }
  function renderGroup(type) {
    const group = groups[type], data = rows(type), source = rules.bindings[{ normal: "RenderNormalItem", rotation: "RenderRotationItem", rebirth: "RenderRebirthPet" }[type]];
    while (group.cards.length < data.length) group.cards.push(clone(group.cards[0], group.layout, group.cards.length));
    group.cards.forEach((card, index) => {
      const row = data[index]; visible(card, !!row, source); if (!row) return;
      card.dataset.shopType = type; card.dataset.shopItem = row.ID; current.set(`${type}:${row.ID}`, { row, type });
      const name = uiTranslate(type === "normal" ? row.NameLocalize : type === "rebirth" ? row.Name : row.nameKey || "");
      const label = type !== "rotation" || row.typeName === "Pet" ? name : uiTranslate(row.typeName === "Mutagen" ? "HUD_ROTATION_SHOP_MUTAGEN_TITLE" : "HUD_ROTATION_SHOP_SUMMON_TITLE", [name, uiTranslate(`RARITY_${row.rarity}`)]);
      text(child(card, "Name"), label, source);
      image(child(card, "Thumbnail"), type === "normal" ? row.Name : type === "rebirth" ? row.Name : row.icon, source);
      color(child(child(card, "SelectButton"), "Rarity"), rules.rarityColors[type === "rebirth" ? row.Rarity : row.rarity] || c.NORMAL_ITEM_RARITY_COLOR, source);
      const amount = child(child(card, "Price"), "Amount"), value = price(row, type), discounted = type === "rotation" && state.friend && value !== integer(row.Price);
      text(amount, money(value), source); color(amount, value <= (type === "rebirth" ? state.money : state.coins) ? c.COLOR_ENOUGH_COIN : c.COLOR_NOT_ENOUGH_COIN, source);
      if (discounted) {
        const content = amount.querySelector(".ui-text-content"), old = document.createElement("s"); old.textContent = money(integer(row.Price)); old.style.color = "#1f64c4";
        content?.prepend(old, document.createTextNode(" "));
        record(amount, "Content", `${money(integer(row.Price))} → ${money(value)}`, rules.bindings.GetRotationPriceContent);
      }
      visible(child(card, "Select"), state.selected === `${type}:${row.ID}`, source);
      if (type === "rotation") {
        const stock = state.stocks.get(row.ID); text(child(card, "Count"), `${stock.left}/${stock.origin}`, source); visible(child(card, "LockBG"), stock.left <= 0, source);
        const thumb = child(card, "Thumbnail");
        uiRenderer.setSize(thumb, { width: row.typeName === "Pet" ? c.PET_ITEM_THUMBNAIL_SIZE : c.DEFAULT_ITEM_THUMBNAIL_SIZE, height: row.typeName === "Pet" ? c.PET_ITEM_THUMBNAIL_SIZE : c.DEFAULT_ITEM_THUMBNAIL_SIZE }, rendered.canvas, screen);
        record(thumb, "SizeDelta", row.typeName === "Pet" ? c.PET_ITEM_THUMBNAIL_SIZE : c.DEFAULT_ITEM_THUMBNAIL_SIZE, source);
        for (const [key, icon] of [["MutationIcon", row.mutationIcon], ["WeatherIcon", row.weatherIcon]]) { visible(child(thumb, key), !!icon, source); if (icon) image(child(thumb, key), icon, source); }
      }
      if (type === "normal") {
        const bg = child(card, "CooldownBG"), seconds = remaining(row.ID); visible(bg, seconds > 0, rules.bindings.UpdateNormalItemCooldownWidget);
        text(child(bg, "Timer"), seconds ? String(seconds) : "", rules.bindings.UpdateNormalItemCooldownWidget);
        const fill = seconds / (Number(row.TimeLock) / c.MILLISECONDS_PER_SECOND);
        uiRenderer.setFillAmount(bg, fill, node(bg)?.image); record(bg, "FillAmount", fill, rules.bindings.UpdateNormalItemCooldownWidget);
      }
    });
  }
  function details(row, type) {
    if (type === "normal") return uiTranslate(row.Description);
    if (type === "rebirth") return uiTranslate(row.Name);
    const key = { Pet: "HUD_ROTATION_SHOP_SUMMON_PET_DESC", Mutagen: "HUD_ROTATION_SHOP_MUTAGEN_DESC", Weather: "HUD_ROTATION_SHOP_SUMMON_WEATHER_DESC" }[row.typeName];
    return key ? uiTranslate(key, [uiTranslate(row.nameKey)]) : "";
  }
  function refresh() {
    current = new Map(); ["normal", "rotation", "rebirth"].forEach(renderGroup);
    const rebirthVisible = rows("rebirth").length > 0; visible(byKey("RebirthPets"), rebirthVisible, rules.bindings.RenderRebirthPet);
    const y = rebirthVisible ? normalPosition.y : node(byKey("RebirthPets")).transform.anchoredPosition.y;
    byKey("NormalItems").style.top = `${-y}px`; record(byKey("NormalItems"), "AnchorPosition", { ...normalPosition, y }, rules.bindings.UpdateNormalItemsLayoutPosition);
    const selected = current.get(state.selected); if (!selected) state.selected = null;
    visible(byKey("ItemDetails"), state.open && !!selected);
    if (selected) text(byKey("ItemDetailsLabel"), details(selected.row, selected.type));
    const currency = selected?.type === "rebirth" ? "money" : "coins";
    text(byKey("Balance"), money(state[currency]), rules.bindings.UpdateShopBalance);
    image(child(byKey("Balance").parentElement, "Icon"), currency === "money" ? "MoneyIcon" : "PetCoinIcon", rules.bindings.UpdateShopBalance);
    const canBuy = !!selected && available(selected.row, selected.type);
    image(byKey("BuyButton"), canBuy ? "YellowButton" : "GrayButton", rules.bindings.SetBuyButtonAvailable);
    byKey("BuyButton").dataset.shopAvailable = String(canBuy);
    visible(shop, state.open); visible(byKey("ShopButton"), !state.open);
    uiRenderer.refreshLayouts(rendered.canvas, screen); renderUiResourcePanel(); tick();
  }
  function loadWave() {
    state.selected = null; state.stocks.clear();
    const wave = rules.waves.find(w => w.ID === state.wave);
    for (const m of (wave?.Items || "").matchAll(/\{ID:(\d+);Count:(\d+)\}/g)) state.stocks.set(m[1], { left: Number(m[2]), origin: Number(m[2]) });
    state.end = Date.now() + Number(wave?.Duration || 0) * 60 * c.MILLISECONDS_PER_SECOND;
  }
  function tick() {
    const seconds = Math.max(0, Math.ceil((state.end - Date.now()) / c.MILLISECONDS_PER_SECOND));
    text(byKey("RefreshTimer"), uiTranslate("HUD_ROTATION_SHOP_COUNTDOWN", [`${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`]), "Assets/Scripts/HUDs/HudShop.fcg:RunRotationCountdown");
  }
  panel.innerHTML = `<h2>Người chơi mô phỏng</h2><p>Ví, stock và mua thử chỉ lưu trong RAM. Không chạy UseItem/server.</p><label>Pet Coin <input id="shop-coins" type="text" inputmode="numeric" value="0"></label><label>Money <input id="shop-money" type="text" inputmode="numeric" value="0"></label><label>Rebirth <input id="shop-rebirth" type="number" min="0" value="1"></label><label><input id="shop-friend" type="checkbox"> Có bạn trong phòng</label><label>Wave mô phỏng <select id="shop-wave">${rules.waves.map(w => `<option value="${esc(w.ID)}">${esc(w.ID)} · ${esc(w.Duration)} phút</option>`).join("")}</select></label><button id="shop-restock" type="button">Nạp lại wave</button><button id="shop-cooldown-reset" type="button">Xóa cooldown thử</button><p id="shop-result" aria-live="polite"></p><details><summary>Giới hạn nguồn (${rules.gaps.length})</summary>${rules.gaps.map(g => `<p>${esc(g)}</p>`).join("")}</details>`;
  panel.oninput = event => { if (["shop-coins", "shop-money", "shop-rebirth"].includes(event.target.id)) panel.onchange(event); };
  panel.onchange = event => {
    const id = event.target.id;
    if (id === "shop-coins" || id === "shop-money") state[id.slice(5)] = /^\d+$/.test(event.target.value) ? BigInt(event.target.value) : 0n;
    if (id === "shop-rebirth") { state.rebirth = Math.max(0, Math.floor(Number(event.target.value) || 0)); if (state.selected?.startsWith("rebirth:")) state.selected = null; }
    if (id === "shop-friend") state.friend = event.target.checked;
    if (id === "shop-wave") { state.wave = event.target.value; loadWave(); }
    refresh();
  };
  panel.querySelector("#shop-restock").onclick = () => { loadWave(); refresh(); };
  panel.querySelector("#shop-cooldown-reset").onclick = () => { state.cooldowns.clear(); refresh(); };
  function click(event) {
    const button = event.target.closest("button[data-ui-name]"); if (!button) return;
    if (button === byKey("ShopButton") || button.dataset.uiName === "CloseButton") { state.open = button === byKey("ShopButton"); state.selected = null; refresh(); return; }
    const card = button.closest("[data-shop-item]");
    if (card && button.dataset.uiName === "SelectButton") {
      if (card.dataset.shopType === "normal" && remaining(card.dataset.shopItem)) { panel.querySelector("#shop-result").textContent = "Vật phẩm đang hồi (mô phỏng)."; return; }
      state.selected = `${card.dataset.shopType}:${card.dataset.shopItem}`; refresh(); return;
    }
    if (button === byKey("BuyButton")) {
      const selected = current.get(state.selected); if (!selected || !available(selected.row, selected.type)) return;
      const { row, type } = selected, currency = type === "rebirth" ? "money" : "coins";
      state[currency] -= price(row, type); panel.querySelector(`#shop-${currency}`).value = String(state[currency]);
      if (type === "rotation") state.stocks.get(row.ID).left--;
      if (type === "normal") {
        const affected = weatherItem(row) ? rules.normal.filter(weatherItem) : [row];
        const duration = Math.max(...affected.map(r => Number(r.TimeLock)));
        for (const item of affected) state.cooldowns.set(item.ID, Date.now() + duration);
        if (duration > 0) state.selected = null;
      }
      panel.querySelector("#shop-result").textContent = `Đã mua thử #${row.ID}. Chỉ cập nhật mô phỏng cục bộ.`; refresh();
    }
  }
  rendered.canvas.addEventListener("click", click);
  loadWave(); refresh();
  const timer = setInterval(() => { const active = [...state.cooldowns.keys()].some(id => remaining(id)); if (active || state.cooldowns.size) { for (const id of state.cooldowns.keys()) if (!remaining(id)) state.cooldowns.delete(id); refresh(); } else tick(); }, c.MILLISECONDS_PER_SECOND);
  return { refresh, dispose() { clearInterval(timer); rendered.canvas.removeEventListener("click", click); panel.onchange = null; panel.oninput = null; } };
}

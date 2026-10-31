"use strict";

// Source adapters share primitives, while each HUD owns its state and bindings.
function uiSourceTools(screen, rules, rendered) {
  const nodes = new Map();
  (function walk(n) { nodes.set(String(n.id), n); n.children.forEach(walk); })(screen.tree);
  const node = el => nodes.get(String(el?.dataset.uiId || el?.dataset.uiSourceEntityId));
  const child = (el, name) => [...(el?.children || [])].find(e => e.dataset.uiName === name);
  const find = name => [...rendered.byId.values()].find(el => el.dataset.uiName === name);
  const key = name => rendered.byId.get(rules.widgetIds?.[name]) || find(name);
  const at = name => rules.bindings?.[name] || rules.controller;
  function record(el, property, value, source) {
    if (!el) return;
    const values = JSON.parse(el.dataset.uiRuntimeValues || "{}");
    values[property] = { value, source: at(source) }; el.dataset.uiRuntimeValues = JSON.stringify(values);
  }
  function visible(el, value, source) { if (el) { el.classList.toggle("ui-inactive", !value); record(el, "IsVisible", value, source); } }
  function text(el, value, source) {
    if (!el) return;
    const raw = String(value ?? "");
    uiRenderer.setText(el, raw.replace(/\[(?:\/?[bis]|[A-Fa-f0-9]{6}|-)\]/g, "")); record(el, "Content", value, source);
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
  function color(el, value, source) { if (el && value) { node(el)?.text ? uiRenderer.setTextColor(el, value) : uiRenderer.tint(el, value); record(el, "Color", value, source); } }
  function image(el, name, source) {
    if (!el) return;
    const spriteKey = rules.spriteKeys?.[name], props = node(el)?.image || node(el)?.button || {};
    if (spriteKey) uiRenderer.setSprite(el, spriteKey, props, uiPreview.manifest);
    else uiRenderer.setImage(el, "", props);
    record(el, "SpriteName", { name, key: spriteKey }, source);
  }
  function clone(template, parent, index) {
    const el = template.cloneNode(true);
    for (const part of [el, ...el.querySelectorAll("[data-ui-path]")]) {
      part.dataset.uiClonePath = part.dataset.uiPath; part.dataset.uiCloneTemplatePath = template.dataset.uiPath;
      part.dataset.uiCloneIndex = String(index); part.dataset.uiSourceEntityId = part.dataset.uiId;
      part.dataset.uiEntityKey = `clone:${template.dataset.uiId}#${index}:${part.dataset.uiId}`;
      delete part.dataset.uiId; delete part.dataset.uiPath;
    }
    for (const button of [el, ...el.querySelectorAll("button")].filter(e => e.tagName === "BUTTON")) {
      const data = node(button)?.button;
      if (!data) continue;
      button.addEventListener("pointerdown", () => uiRenderer.tint(button, data.pressed));
      for (const type of ["pointerup", "pointercancel", "pointerleave"]) button.addEventListener(type, () => uiRenderer.tint(button, data.normal));
    }
    parent.appendChild(el); uiRenderer.refreshSprites(el); return el;
  }
  function slots(layout, count) {
    const cards = [...(layout?.children || [])].filter(el => el.classList.contains("ui-entity"));
    if (!cards.length) return [];
    while (cards.length < count) cards.push(clone(cards[0], layout, cards.length));
    cards.forEach((el, i) => visible(el, i < count, "clone-template")); return cards.slice(0, count);
  }
  function refresh() { uiRenderer.refreshLayouts(rendered.canvas, screen); renderUiResourcePanel(); }
  const panel = document.getElementById("ui-player-panel");
  function controls(html, change) {
    panel.onclick = panel.oninput = null;
    panel.innerHTML = '<h2>Mô phỏng người chơi</h2><p>Dữ liệu thử cục bộ; không kết nối server game.</p>' + html + '<p class="muted">Font, shader, scaler/safe area và quán tính cuộn chưa đối chiếu runtime game.</p><div data-ui-status></div>';
    panel.onchange = event => change?.(event.target);
    panel.oninput = event => { if (event.target.matches('input:not([type="checkbox"]):not([type="radio"]), textarea')) change?.(event.target); };
  }
  const status = value => { const el = panel.querySelector("[data-ui-status]"); if (el) el.textContent = value; };
  function money(value) {
    const digits = String(value ?? "0").replaceAll(",", "");
    if (!/^\d+$/.test(digits)) return String(value);
    const group = Math.min(Math.floor((digits.length - 1) / 3), 11), length = digits.length - group * 3;
    return group ? digits.slice(0, length) + (digits[length] && digits[length] !== "0" ? "." + digits[length] : "") + " " + (rules.suffixes?.[group + 1] || "") : digits;
  }
  for (const el of rendered.byId.values()) if (node(el)?.propsData?.scrollView) {
    el.style.overflowY = "auto"; el.style.overflowX = "hidden"; el.style.pointerEvents = "auto"; el.style.overscrollBehavior = "contain"; el.style.scrollbarWidth = "none";
    record(el, "ScrollPolicy", "native web scroll; engine inertia unverified", screen.source);
  }
  return { nodes, node, child, find, key, at, record, visible, text, color, image, clone, slots, refresh, panel, controls, status, money };
}

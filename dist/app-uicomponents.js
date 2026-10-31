"use strict";

Object.assign(pages, { uicomponents: "UI Components" });
const uiComponents = { registry: null, manifest: null, i18n: null, data: new Map(), search: "", group: "", screen: "", resources: {}, token: 0, selected: null, rendered: null, values: {}, state: "" };
const uicWalk = tree => [tree, ...tree.children.flatMap(uicWalk)];
const uicTarget = (nodes, target) => nodes.find(n => n.path === target.path && (!target.sourceId || n.id === target.sourceId));
const uicResources = data => uiComponents.resources[data.sourceScreen || "collection"] || { manifest: uiComponents.manifest, i18n: uiComponents.i18n };
function uiComponentsPage() {
  return '<div class="uic-page"><p class="eyebrow">THƯ VIỆN UI · COLLECTION / ACTIVITIES</p><h1>UI Components</h1><p>Template từ subtree .ui và sprite đã sync. Dữ liệu runtime chỉ mô phỏng khi có nguồn rule.</p><section class="uic-section"><h2>Thư viện</h2><div class="uic-toolbar"><label>Tìm component<input id="uic-search" type="search" placeholder="Tên hoặc nguồn .ui"></label><label>Nguồn<select id="uic-source"><option value="">Tất cả màn hình</option></select></label><label>Nhóm<select id="uic-group"><option value="">Tất cả nhóm</option></select></label></div><p id="uic-count" role="status">Đang tải…</p><div id="uic-library" class="uic-library"></div></section><section id="uic-detail" class="uic-section" aria-live="polite"><h2>Chi tiết component</h2><p>Chọn một component trong thư viện.</p></section><section id="uic-variants" class="uic-section" hidden></section></div>';
}
function uicTranslatedTree(tree, i18n = uiComponents.i18n) {
  const copy = structuredClone(tree);
  for (const node of uicWalk(copy)) if (node.text?.key) {
    const entry = i18n?.entries[node.text.key];
    node.text.value = entry?.vi || entry?.en || node.text.key; node.text.key = "";
  }
  return copy;
}
function uicFit(host) {
  const canvas = host.firstElementChild;
  if (!canvas || !host.isConnected) return;
  const width = +canvas.dataset.uicWidth, height = +canvas.dataset.uicHeight;
  let bounds = { left: 0, top: 0, right: width, bottom: height };
  if (canvas.dataset.uicFitOverflow === 'true') {
    const origin = canvas.getBoundingClientRect(), oldScale = +canvas.dataset.uicScale || 1;
    for (const el of canvas.querySelectorAll('.ui-entity')) {
      const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
      bounds.left = Math.min(bounds.left, (r.left-origin.left)/oldScale); bounds.top = Math.min(bounds.top, (r.top-origin.top)/oldScale);
      bounds.right = Math.max(bounds.right, (r.right-origin.left)/oldScale); bounds.bottom = Math.max(bounds.bottom, (r.bottom-origin.top)/oldScale);
    }
  }
  const frameWidth = bounds.right-bounds.left, frameHeight = bounds.bottom-bounds.top;
  const scale = Math.max(.001, Math.min((host.clientWidth - 16) / frameWidth, (host.clientHeight - 16) / frameHeight, 1));
  canvas.style.transform = `scale(${Math.max(.001, scale)})`;
  canvas.dataset.uicScale = scale;
  canvas.style.left = `${(host.clientWidth - frameWidth * scale) / 2 - bounds.left*scale}px`;
  canvas.style.top = `${(host.clientHeight - frameHeight * scale) / 2 - bounds.top*scale}px`;
}
const uicResize = new ResizeObserver(entries => entries.forEach(e => { if (e.target.isConnected) uicFit(e.target); else uicResize.unobserve(e.target); }));
function uicMount(host, data, tree = data.tree) {
  const { width, height } = data.referenceSize;
  const resources = uicResources(data);
  const rendered = uiRenderer.render({ tree: uicTranslatedTree(tree, resources.i18n) }, resources.manifest, width, height);
  for (const fallback of data.previewFallbacks || []) {
    const el = rendered.byId.get(fallback.sourceId), node = uicWalk(tree).find(n => n.id === fallback.sourceId);
    const visual = el?.querySelector(":scope > .ui-visual.ui-missing-sprite");
    if (visual) { visual.style.background = node.image.color; visual.dataset.uicFallback = "solid-color; original lib sprite still missing"; }
  }
  rendered.canvas.dataset.uicWidth = width; rendered.canvas.dataset.uicHeight = height;
  rendered.canvas.dataset.uicFitOverflow = String(data.sourceScreen === 'activities');
  host.replaceChildren(rendered.canvas); uicFit(host); uicResize.observe(host);
  return rendered;
}
async function updateUiComponentsPage() {
  const token = ++uiComponents.token;
  uicResize.disconnect();
  try {
    const registry = await fetchUiResource('./data/ui/components/registry.json').then(checkUiJson);
    const resources = Object.fromEntries(await Promise.all(Object.entries(registry.sources || { collection: { manifest: './data/ui/collection-sprites.json', i18n: './data/ui/collection-i18n.json' } }).map(async ([id, urls]) => [id, { manifest: await fetchUiResource(urls.manifest).then(checkUiJson), i18n: await fetchUiResource(urls.i18n).then(checkUiJson) }])));
    const { manifest, i18n } = resources.collection;
    const components = await Promise.all(registry.components.map(c => fetchUiResource(c.data).then(checkUiJson)));
    if (s.page !== 'uicomponents' || token !== uiComponents.token) return;
    Object.assign(uiComponents, { registry, manifest, i18n, resources, data: new Map(components.map(c => [c.id, c])) });
    const sourceSelect = document.getElementById('uic-source');
    sourceSelect.innerHTML = '<option value="">Tất cả màn hình</option>' + Object.keys(resources).map(id => `<option value="${id}">${id === 'activities' ? 'Activities' : 'Collection'}</option>`).join(''); sourceSelect.value = uiComponents.screen;
    const select = document.getElementById('uic-group');
    select.innerHTML = '<option value="">Tất cả nhóm</option>' + registry.groups.map(g => `<option>${esc(g)}</option>`).join('');
    select.value = uiComponents.group; document.getElementById('uic-search').value = uiComponents.search;
    renderUicLibrary();
    const id = decodeURIComponent(location.hash.split('/')[1] || '');
    if (!location.hash.startsWith('#uicomponents')) history.replaceState(null, '', '#uicomponents');
    uiComponents.selected = id ? uiComponents.data.get(id) : null;
    if (id && !uiComponents.selected) document.getElementById('uic-detail').innerHTML = '<h2>Chi tiết component</h2><p>Component không tồn tại.</p>';
    if (uiComponents.selected) renderUicDetail();
  } catch (error) {
    if (s.page === 'uicomponents' && token === uiComponents.token) document.getElementById('uic-count').textContent = 'Không tải được thư viện: ' + error.message;
  }
}
function renderUicLibrary() {
  const list = uiComponents.registry.components.filter(c => (!uiComponents.group || c.group === uiComponents.group) && (!uiComponents.screen || (c.sourceScreen || 'collection') === uiComponents.screen) && `${c.name} ${c.id} ${c.sourcePath}`.toLocaleLowerCase('vi').includes(uiComponents.search.toLocaleLowerCase('vi')));
  document.getElementById('uic-count').textContent = `${list.length}/${uiComponents.registry.components.length} component`;
  const library = document.getElementById('uic-library');
  if (library.children.length && library.dataset.uicReady === 'true') {
    const visible = new Set(list.map(c => c.id));
    for (const card of library.querySelectorAll('[data-uic-card]')) card.hidden = !visible.has(card.dataset.uicCard);
    let empty = library.querySelector('.uic-empty');
    if (!empty) { empty = document.createElement('p'); empty.className = 'uic-empty'; empty.textContent = 'Không có component khớp bộ lọc.'; library.appendChild(empty); }
    empty.hidden = list.length > 0;
    return;
  }
  for (const host of library.querySelectorAll('.uic-thumb')) uicResize.unobserve(host);
  library.innerHTML = uiComponents.registry.components.map(c => `<a class="uic-card" href="#uicomponents/${esc(c.id)}" data-uic-card="${esc(c.id)}"><div class="uic-thumb" aria-hidden="true" inert></div><strong>${esc(c.name)}</strong><span>${esc(c.sourceScreen || "collection")} · ${esc(c.group)} · ${esc(c.status)}</span><small>${c.usedCount} màn dùng · ${c.plannedCount} dự kiến</small></a>`).join('');
  for (const card of library.querySelectorAll('[data-uic-card]')) uicMount(card.querySelector('.uic-thumb'), uiComponents.data.get(card.dataset.uicCard));
  library.dataset.uicReady = 'true';
  renderUicLibrary();
}
function selectUicRoute() {
  if (!uiComponents.registry || !document.getElementById('uic-detail')) return updateUiComponentsPage();
  const id = decodeURIComponent(location.hash.split('/')[1] || '');
  uiComponents.selected = uiComponents.data.get(id) || null;
  if (uiComponents.selected) renderUicDetail();
  else {
    document.getElementById('uic-detail').innerHTML = `<h2>Chi tiết component</h2><p>${id ? 'Component không tồn tại.' : 'Chọn một component trong thư viện.'}</p>`;
    document.getElementById('uic-variants').hidden = true;
  }
}
function renderUicDetail() {
  const data = uiComponents.selected;
  uiComponents.values = {}; uiComponents.state = '';
  document.getElementById('uic-detail').innerHTML = `<h2>${esc(data.name)}</h2><p>${esc(data.sourcePath)} · ${esc(data.status)} · ${data.entityCount} entity</p>
    <div class="uic-toolbar"><label>Trạng thái<select id="uic-state"><option value="">Mặc định .ui</option>${data.states.map(st => `<option>${esc(st.name)}</option>`).join('')}</select></label><label><span>Đường viền entity</span><input id="uic-outlines" type="checkbox"></label><button id="uic-reset" type="button">Khôi phục .ui</button></div>
    <div class="uic-preview-layout"><div id="uic-stage" class="uic-preview"></div><div><h3>Tham số instance</h3><p><small>Chỉ đổi bản xem thử. Dữ liệu mẫu có nhãn “mẫu”.</small></p><div id="uic-controls" class="uic-controls"></div><p id="uic-control-status" role="status"></p></div></div>
    <details class="uic-disclosure"><summary>Cây entity và rect sau layout</summary><p>Đơn vị .ui trước scale; gốc đã re-root. Transform/props gốc giữ trong dữ liệu JSON.</p><div id="uic-tree"></div></details>
    <div id="uic-spec"></div>`;
  renderUicControls(); renderUicInstance(); renderUicVariants(); renderUicSpec();
}
function uicGet(node, field) { return field.split('.').reduce((v, k) => v?.[k], node); }
function uicPut(node, field, value) { const keys = field.split('.'); let at = node; for (const key of keys.slice(0,-1)) at = at[key] ||= {}; at[keys.at(-1)] = structuredClone(value); }
function uicInstance(data, state = '', values = {}) {
  const tree = structuredClone(data.tree), nodes = uicWalk(tree);
  for (const change of data.states.find(st => st.name === state)?.overrides || []) uicPut(uicTarget(nodes, change), change.field, change.value);
  for (const slot of data.slots) if (Object.hasOwn(values, slot.name)) uicPut(uicTarget(nodes, slot), slot.field, values[slot.name]);
  return tree;
}
function renderUicControls() {
  const data = uiComponents.selected, nodes = uicWalk(uicInstance(data, uiComponents.state, uiComponents.values));
  document.getElementById('uic-controls').innerHTML = data.slots.map((slot, index) => {
    const value = uicGet(uicTarget(nodes, slot), slot.field), attr = `data-uic-slot="${index}" id="uic-slot-${index}"`;
    let input;
    if (slot.type === 'active') input = `<input ${attr} type="checkbox" ${value ? 'checked' : ''}>`;
    else if (slot.type === 'sprite') input = `<select ${attr}>${uicResources(data).manifest.sprites.map(sp => `<option value="${esc(sp.key)}" ${sp.key === value ? 'selected' : ''}>${esc(sp.key.split('/').at(-1))}${sp.missing ? ' · thiếu' : ''}</option>`).join('')}</select>`;
    else input = `<input ${attr} type="${slot.type === 'count' ? 'number' : 'text'}" ${slot.type === 'count' ? 'step="any"' : ''} value="${esc(value ?? '')}" ${slot.type === 'tint' ? 'pattern="#[0-9a-fA-F]{3}([0-9a-fA-F]{3}|[0-9a-fA-F]{5})?"' : ''}>`;
    return `<div class="uic-control"><label for="uic-slot-${index}">${esc(slot.name)} · ${esc(slot.type)}</label>${input}${Object.hasOwn(slot, 'sample') ? `<button type="button" data-uic-sample="${index}">Dùng mẫu: ${esc(slot.sample)}</button>` : ''}</div>`;
  }).join('');
}
function renderUicInstance() {
  const data = uiComponents.selected, tree = uicInstance(data, uiComponents.state, uiComponents.values);
  const host = document.getElementById('uic-stage');
  host.classList.toggle('ui-debug', !!document.getElementById('uic-outlines').checked);
  uiComponents.instance = tree;
  uiComponents.rendered = uicMount(host, data, tree);
  const nodes = uicWalk(tree), depth = tree.path.split('/').length;
  document.getElementById('uic-tree').innerHTML = nodes.map(n => {
    const element = uiComponents.rendered.byId.get(n.id), rect = ['left','top','width','height'].map(f => `${f}: ${parseFloat(element.style[f])}`);
    return `<div class="uic-tree-row" data-uic-tree="${esc(n.id)}" style="padding-left:${Math.min(6,n.path.split('/').length-depth)*10}px"><strong>${esc(n.name)}</strong><span>${esc(n.type)} · ${n.active ? 'active' : 'inactive'}</span><code>${esc(rect.join(' · '))}</code></div>`;
  }).join('');
  renderUicTemplate();
}
const uicValue = value => value == null ? 'chưa có dữ liệu' : typeof value === 'object' ? JSON.stringify(value) : String(value);
function uicTable(headings, rows) {
  return rows.length ? `<table class="uic-table"><thead><tr>${headings.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map((cell, i) => `<td data-label="${esc(headings[i])}">${cell}</td>`).join('')}</tr>`).join('')}</tbody></table>` : '<p>chưa có dữ liệu</p>';
}
function renderUicSpec() {
  const d = uiComponents.selected, size = r => `${r.width} × ${r.height}`, val = v => esc(uicValue(v));
  const imageRows = d.spec.images.map(r => [r.sprite?.output ? `<img class="uic-spec-thumb" src="${esc(r.sprite.output)}" alt="${esc(r.key || '')}">` : 'thiếu',
    `${val(r.path)}<small>${val(r.key)} · ${r.sprite?.missing ? 'thiếu' : r.key ? 'có file' : 'chưa có dữ liệu'}</small><small>${val(r.sprite?.declaredKeys)}</small>`, `${size(r.rect)}<small>Sprite: ${val(r.sprite?.width)} × ${val(r.sprite?.height)}</small>`, `${val(r.sprite?.border)}<small>fillType: ${val(r.image.fillType)} · centerInvisible: ${val(r.image.centerInvisible)}</small>`, val(r.tint)]);
  const shapeRows = d.spec.shapes.map(r => [val(r.path),size(r.rect),val(r.color),`${r.alpha}% · ${r.active ? 'active' : 'inactive'}`]);
  const textRows = d.spec.texts.map(r => [val(r.path),`${val(r.key || r.value)}<small>${val(r.localization?.vi || r.value)}</small>`, `${val(r.fontSize)} · ${val(r.color)}`, `${val(r.outline)} · ${val(r.outlineColor)}<small>offset: ${val(r.outlineOffset)} · alpha: ${val(r.outlineAlpha)}</small>`, `${val(r.alignment)}<small>font: ${val(r.font)} · style: ${val(r.fontStyle)} · overflow: ${val(r.overflow)}</small>`]);
  const slotRows = d.slots.map(slot => [val(slot.name),val(slot.type),`${val(slot.default)}${Object.hasOwn(slot,'sample') ? `<small>Mẫu: ${val(slot.sample)}</small>` : ''}`,`${val(slot.path)}<small>${val(slot.field)}${slot.sourceId ? ` · ID: ${val(slot.sourceId)}` : ""}</small>`]);
  const stateRows = d.states.map(st => [val(st.name),val(st.when),`${val(st.ruleSource)}<small>${val(d.stateEvidence.find(e => e.name === st.name)?.rule)}</small>`,val(st.overrides)]);
  const links = ids => ids.length ? ids.map(id => `<a href="#uicomponents/${esc(id)}">${esc(id)}</a>`).join(' · ') : 'chưa có dữ liệu';
  document.getElementById('uic-spec').innerHTML = `<details class="uic-disclosure"><summary>Spec cho dev · dữ liệu nguồn .ui</summary><p>Kích thước nguồn trước scale/layout runtime. Hình khối là rect entity, không phải asset thay thế. 9-grid theo metadata đã sync (left/right/top/bottom).</p><h3>Hình ảnh</h3>${uicTable(['Xem trước','Nguồn / key','Kích thước','9-grid / fill','Tint'],imageRows)}<h3>Hình khối / màu</h3>${uicTable(['Entity','Kích thước','Màu','Alpha / active'],shapeRows)}<h3>Chữ</h3>${uicTable(['Entity','i18n / nội dung','Cỡ / màu','Outline','Căn / font'],textRows)}</details>
    <details class="uic-disclosure"><summary>Slot và state</summary><h3>Slot</h3>${uicTable(['Tên','Kiểu','Mặc định .ui','Đích'],slotRows)}<h3>State</h3>${uicTable(['Tên','Điều kiện','Nguồn rules.json của màn hình','Override'],stateRows)}</details>
    <details class="uic-disclosure"><summary>Nguồn và tái dùng</summary><p>${val(d.source)}<br>${val(d.sourcePath)}<br>ID: ${val(d.sourceId)} · ${val(d.status)}</p><p>composedOf: ${links(d.composedOf)}<br>usedBy: ${links(d.usedBy)}</p><ul>${d.usedIn.map(u => `<li>${u.planned ? `${val(u.screen)} · dự kiến` : ['collection','activities'].includes(u.screen) ? `<a href="#uipreview/${u.screen}">${val(u.screen)} · UI Preview</a>` : val(u.screen)}: ${val(u.note)}</li>`).join('')}</ul><ul>${d.notes.map(note => `<li>${val(note)}</li>`).join('')}</ul><p>Font, shader, alpha cascade và scaler: chưa xác minh runtime game. Không thực thi binder game.</p></details>
    <details class="uic-disclosure"><summary>Template JSON · op add</summary><p>Slot/state hiện tại đã áp vào entity; binding slot ghi ở reason. Sửa parent/ID và khai báo sprite trong manifest đích trước khi tái dùng; Activities chưa có màn UI Proposal đăng ký. Chỉ xuất field được schema Proposal hỗ trợ.</p><p>${d.templateOmitted.length} field không xuất (gồm gradient/raw props hoặc sprite thiếu); đây là template cho Proposal, không bảo đảm giữ toàn bộ hiệu ứng serialize.</p><details><summary>Chi tiết field không xuất</summary><ul>${d.templateOmitted.map(v => `<li>${val(v)}</li>`).join('')}</ul></details><button type="button" id="uic-copy" class="uic-copy">Sao chép template</button><p id="uic-copy-status" role="status"></p><pre id="uic-template"></pre></details>`;
  renderUicTemplate();
}
function currentUicTemplate() {
  const d = uiComponents.selected, op = structuredClone(d.template), targets = uicWalk(op.entity), sources = uicWalk(d.tree);
  const overrides = [...(d.states.find(st => st.name === uiComponents.state)?.overrides || []), ...d.slots.filter(slot => Object.hasOwn(uiComponents.values,slot.name)).map(slot => ({path:slot.path,sourceId:slot.sourceId,field:slot.field,value:uiComponents.values[slot.name]}))];
  for (const change of overrides) {
    const source = uicTarget(sources, change), target = targets.find(n => n.id === `uic-${d.id}-${source.id}`);
    if (change.field.endsWith('.spriteKey') && !uicResources(d).manifest.sprites.some(sp => sp.key === change.value && !sp.missing && sp.output)) {
      delete target[change.field.split('.')[0]].spriteKey;
    } else uicPut(target, change.field, change.value);
  }
  return op;
}
function renderUicTemplate() {
  const pre = document.getElementById('uic-template');
  if (pre) pre.textContent = JSON.stringify(currentUicTemplate(), null, 2);
}
function renderUicVariants() {
  const data = uiComponents.selected, section = document.getElementById('uic-variants');
  section.hidden = !data.states.length;
  if (!data.states.length) { section.replaceChildren(); return; }
  section.innerHTML = '<h2>So sánh biến thể</h2><p>Các instance độc lập theo rule đã sync. Bản mặc định giữ .ui.</p><div class="uic-comparison">' + [{name:'Mặc định .ui',state:''}, ...data.states.map(st => ({name:st.name,state:st.name}))].map(st => `<article><h3>${esc(st.name)}</h3><div class="uic-preview" data-uic-variant="${esc(st.state)}"></div></article>`).join('') + '</div>';
  for (const host of section.querySelectorAll('[data-uic-variant]')) uicMount(host, data, uicInstance(data, host.dataset.uicVariant));
}
function applyUicSlot(index, value) {
  const slot = uiComponents.selected.slots[index];
  if (slot.type === 'tint' && !/^#(?:[\da-f]{3}|[\da-f]{6}|[\da-f]{8})$/i.test(value)) { document.getElementById('uic-control-status').textContent = 'Màu cần có dạng #RGB, #RRGGBB hoặc #RRGGBBAA'; return; }
  if (slot.type === 'count' && (!Number.isFinite(value) || (slot.field.endsWith('fillAmount') && (value < 0 || value > 1)))) { document.getElementById('uic-control-status').textContent = 'Giá trị không hợp lệ (fillAmount từ 0 đến 1).'; return; }
  uiComponents.values[slot.name] = value; document.getElementById('uic-control-status').textContent = '';
  renderUicInstance();
}
document.addEventListener('input', event => {
  if (event.target.id === 'uic-search') { uiComponents.search = event.target.value; renderUicLibrary(); }
  const input = event.target;
  if (input.dataset.uicSlot != null) applyUicSlot(+input.dataset.uicSlot, input.type === 'checkbox' ? input.checked : input.type === 'number' ? Number(input.value) : input.value);
});
document.addEventListener('change', event => {
  if (event.target.id === 'uic-source') { uiComponents.screen = event.target.value; renderUicLibrary(); }
  if (event.target.id === 'uic-group') { uiComponents.group = event.target.value; renderUicLibrary(); }
  if (event.target.id === 'uic-state') { uiComponents.state = event.target.value; uiComponents.values = {}; renderUicControls(); renderUicInstance(); }
  if (event.target.id === 'uic-outlines') renderUicInstance();
});
document.addEventListener('click', event => {
  if (event.target.id === 'uic-reset') renderUicDetail();
  const sample = event.target.closest('[data-uic-sample]');
  if (sample) { const index = +sample.dataset.uicSample; applyUicSlot(index, uiComponents.selected.slots[index].sample); renderUicControls(); }
});
document.addEventListener('click', async event => {
  if (event.target.id !== 'uic-copy') return;
  const status = document.getElementById('uic-copy-status');
  try { await navigator.clipboard.writeText(JSON.stringify(currentUicTemplate(),null,2)); status.textContent = 'Đã sao chép template'; }
  catch (error) { status.textContent = 'Không sao chép được: ' + error.message + '. Có thể chọn JSON bên dưới để sao chép thủ công.'; }
});

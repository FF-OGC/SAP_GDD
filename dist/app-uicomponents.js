"use strict";

Object.assign(pages, { uicomponents: "UI Components" });
const uiComponents = { registry: null, manifest: null, i18n: null, data: new Map(), search: "", group: "", token: 0, selected: null, rendered: null, values: {}, state: "" };
const uicWalk = tree => [tree, ...tree.children.flatMap(uicWalk)];
function uiComponentsPage() {
  return '<div class="uic-page"><p class="eyebrow">THƯ VIỆN UI · COLLECTION</p><h1>UI Components</h1><p>Template từ subtree .ui và sprite đã sync. Dữ liệu runtime chỉ mô phỏng khi có nguồn rule.</p><section class="uic-section"><h2>Thư viện</h2><div class="uic-toolbar"><label>Tìm component<input id="uic-search" type="search" placeholder="Tên hoặc nguồn .ui"></label><label>Nhóm<select id="uic-group"><option value="">Tất cả nhóm</option></select></label></div><p id="uic-count" role="status">Đang tải…</p><div id="uic-library" class="uic-library"></div></section><section id="uic-detail" class="uic-section" aria-live="polite"><h2>Chi tiết component</h2><p>Chọn một component trong thư viện.</p></section><section id="uic-variants" class="uic-section" hidden></section></div>';
}
function uicTranslatedTree(tree) {
  const copy = structuredClone(tree);
  for (const node of uicWalk(copy)) if (node.text?.key) {
    const entry = uiComponents.i18n?.entries[node.text.key];
    node.text.value = entry?.vi || entry?.en || node.text.key; node.text.key = "";
  }
  return copy;
}
function uicFit(host) {
  const canvas = host.firstElementChild;
  if (!canvas || !host.isConnected) return;
  const width = +canvas.dataset.uicWidth, height = +canvas.dataset.uicHeight;
  const scale = Math.min((host.clientWidth - 16) / width, (host.clientHeight - 16) / height, 1);
  canvas.style.transform = `scale(${Math.max(.001, scale)})`;
  canvas.style.left = `${(host.clientWidth - width * scale) / 2}px`;
  canvas.style.top = `${(host.clientHeight - height * scale) / 2}px`;
}
const uicResize = new ResizeObserver(entries => entries.forEach(e => { if (e.target.isConnected) uicFit(e.target); else uicResize.unobserve(e.target); }));
function uicMount(host, data, tree = data.tree) {
  const { width, height } = data.referenceSize;
  const rendered = uiRenderer.render({ tree: uicTranslatedTree(tree) }, uiComponents.manifest, width, height);
  rendered.canvas.dataset.uicWidth = width; rendered.canvas.dataset.uicHeight = height;
  host.replaceChildren(rendered.canvas); uicFit(host); uicResize.observe(host);
  return rendered;
}
async function updateUiComponentsPage() {
  const token = ++uiComponents.token;
  uicResize.disconnect();
  try {
    const [registry, manifest, i18n] = await Promise.all(['./data/ui/components/registry.json','./data/ui/collection-sprites.json','./data/ui/collection-i18n.json'].map(url => fetchUiResource(url).then(checkUiJson)));
    const components = await Promise.all(registry.components.map(c => fetchUiResource(c.data).then(checkUiJson)));
    if (s.page !== 'uicomponents' || token !== uiComponents.token) return;
    Object.assign(uiComponents, { registry, manifest, i18n, data: new Map(components.map(c => [c.id, c])) });
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
  const list = uiComponents.registry.components.filter(c => (!uiComponents.group || c.group === uiComponents.group) && `${c.name} ${c.id} ${c.sourcePath}`.toLocaleLowerCase('vi').includes(uiComponents.search.toLocaleLowerCase('vi')));
  document.getElementById('uic-count').textContent = `${list.length}/${uiComponents.registry.components.length} component`;
  const library = document.getElementById('uic-library');
  library.innerHTML = list.map(c => `<a class="uic-card" href="#uicomponents/${esc(c.id)}" data-uic-card="${esc(c.id)}"><div class="uic-thumb" aria-hidden="true"></div><strong>${esc(c.name)}</strong><span>${esc(c.group)} · ${esc(c.status)}</span><small>${c.usedCount} màn dùng · ${c.plannedCount} dự kiến</small></a>`).join('') || '<p>Không có component khớp bộ lọc.</p>';
  for (const card of library.querySelectorAll('[data-uic-card]')) uicMount(card.querySelector('.uic-thumb'), uiComponents.data.get(card.dataset.uicCard));
}
function renderUicDetail() {
  const data = uiComponents.selected;
  uiComponents.values = {}; uiComponents.state = '';
  document.getElementById('uic-detail').innerHTML = `<h2>${esc(data.name)}</h2><p>${esc(data.sourcePath)} · ${esc(data.status)} · ${data.entityCount} entity</p>
    <div class="uic-toolbar"><label>Trạng thái<select id="uic-state"><option value="">Mặc định .ui</option>${data.states.map(st => `<option>${esc(st.name)}</option>`).join('')}</select></label><label><span>Đường viền entity</span><input id="uic-outlines" type="checkbox"></label><button id="uic-reset" type="button">Khôi phục .ui</button></div>
    <div class="uic-preview-layout"><div id="uic-stage" class="uic-preview"></div><div><h3>Tham số instance</h3><p><small>Chỉ đổi bản xem thử. Dữ liệu mẫu có nhãn “mẫu”.</small></p><div id="uic-controls" class="uic-controls"></div><p id="uic-control-status" role="status"></p></div></div>
    <details class="uic-disclosure"><summary>Cây entity và rect sau layout</summary><p>Đơn vị .ui trước scale; gốc đã re-root. Transform/props gốc giữ trong dữ liệu JSON.</p><div id="uic-tree"></div></details>
    <div id="uic-spec"></div>`;
  renderUicControls(); renderUicInstance(); renderUicVariants();
}
function uicGet(node, field) { return field.split('.').reduce((v, k) => v?.[k], node); }
function uicPut(node, field, value) { const keys = field.split('.'); let at = node; for (const key of keys.slice(0,-1)) at = at[key] ||= {}; at[keys.at(-1)] = structuredClone(value); }
function uicInstance(data, state = '', values = {}) {
  const tree = structuredClone(data.tree), nodes = uicWalk(tree);
  for (const change of data.states.find(st => st.name === state)?.overrides || []) uicPut(nodes.find(n => n.path === change.path), change.field, change.value);
  for (const slot of data.slots) if (Object.hasOwn(values, slot.name)) uicPut(nodes.find(n => n.path === slot.path), slot.field, values[slot.name]);
  return tree;
}
function renderUicControls() {
  const data = uiComponents.selected, nodes = uicWalk(uicInstance(data, uiComponents.state, uiComponents.values));
  document.getElementById('uic-controls').innerHTML = data.slots.map((slot, index) => {
    const value = uicGet(nodes.find(n => n.path === slot.path), slot.field), attr = `data-uic-slot="${index}" id="uic-slot-${index}"`;
    let input;
    if (slot.type === 'active') input = `<input ${attr} type="checkbox" ${value ? 'checked' : ''}>`;
    else if (slot.type === 'sprite') input = `<select ${attr}>${uiComponents.manifest.sprites.map(sp => `<option value="${esc(sp.key)}" ${sp.key === value ? 'selected' : ''}>${esc(sp.key.split('/').at(-1))}${sp.missing ? ' · thiếu' : ''}</option>`).join('')}</select>`;
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
  if (event.target.id === 'uic-group') { uiComponents.group = event.target.value; renderUicLibrary(); }
  if (event.target.id === 'uic-state') { uiComponents.state = event.target.value; uiComponents.values = {}; renderUicControls(); renderUicInstance(); }
  if (event.target.id === 'uic-outlines') renderUicInstance();
});
document.addEventListener('click', event => {
  if (event.target.id === 'uic-reset') renderUicDetail();
  const sample = event.target.closest('[data-uic-sample]');
  if (sample) { const index = +sample.dataset.uicSample; applyUicSlot(index, uiComponents.selected.slots[index].sample); renderUicControls(); }
});

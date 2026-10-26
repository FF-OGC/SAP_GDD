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
  document.getElementById('uic-detail').innerHTML = `<h2>${esc(data.name)}</h2><p>${esc(data.sourcePath)} · ${esc(data.status)} · ${data.entityCount} entity</p><div class="uic-preview"></div>`;
  uiComponents.rendered = uicMount(document.querySelector('#uic-detail .uic-preview'), data);
}
document.addEventListener('input', event => {
  if (event.target.id === 'uic-search') { uiComponents.search = event.target.value; renderUicLibrary(); }
});
document.addEventListener('change', event => {
  if (event.target.id === 'uic-group') { uiComponents.group = event.target.value; renderUicLibrary(); }
});

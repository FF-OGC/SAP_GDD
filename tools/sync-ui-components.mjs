import { readFileSync, readdirSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import vm from 'node:vm';
import { GDD_ROOT, guard } from './sync-ui-proposals.mjs';
import { PATCH_FIELDS } from './ui-proposal-fields.mjs';
import { walk, get, put, validateDefinitions } from './ui-component-definition.mjs';
export { GDD_ROOT };
const read = file => JSON.parse(readFileSync(file, 'utf8'));
const encode = value => JSON.stringify(value, null, 2) + '\n';

export function loadInputs(root = GDD_ROOT) {
  const ui = path.join(root, 'dist/data/ui'), definitionsDir = path.join(root, 'design/ui-components');
  return { screen: read(path.join(ui, 'collection.json')), manifest: read(path.join(ui, 'collection-sprites.json')),
    rules: read(path.join(ui, 'collection-rules.json')), i18n: read(path.join(ui, 'collection-i18n.json')),
    schema: read(path.join(definitionsDir, 'component.schema.json')),
    definitions: readdirSync(definitionsDir).filter(f => f.endsWith('.json') && f !== 'component.schema.json').sort().map(f => {
      const def = read(path.join(definitionsDir, f)); if (f !== `${def.id}.json`) throw Error('Definition filename/id mismatch: ' + f); return def;
    }) };
}
// Export only fields accepted by Proposal add; retain all original fields in tree/spec.
export function proposalEntity(tree, manifest, prefix, omitted = []) {
  const entity = { id: `${prefix}-${tree.id}`, name: tree.name, type: tree.type, children: tree.children.map(n => proposalEntity(n, manifest, prefix, omitted)) };
  const names = entity.children.map(n => n.name);
  for (const child of entity.children) if (names.filter(name => name === child.name).length > 1) child.name += `_${child.id}`;
  const visit = (value, field) => {
    if (PATCH_FIELDS[field]) { put(entity, field, value); return; }
    if (/^(image|button)\.spriteKey$/.test(field)) {
      const sprite = manifest.sprites.find(s => s.key === value);
      if (sprite && !sprite.missing && sprite.output) put(entity, field, value);
      else omitted.push(`${tree.path}: ${field} (thiếu sprite)`);
      return;
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) for (const [key, child] of Object.entries(value)) visit(child, field ? `${field}.${key}` : key);
    else omitted.push(`${tree.path}: ${field}`);
  };
  for (const field of ['active','alpha','transform','image','button','text','layout']) if (tree[field] != null) visit(tree[field], field);
  return entity;
}
export function deriveComponents(inputs, root = GDD_ROOT) {
  const { screen, manifest, rules, definitions, schema, i18n } = inputs;
  validateDefinitions(definitions, inputs);
  // Run the existing geometry helper verbatim; no second geometry implementation.
  const context = vm.createContext({ ResizeObserver: class { observe() {} } });
  vm.runInContext(readFileSync(path.join(root, 'dist/app-ui-renderer.js'), 'utf8') + '\nglobalThis.sourceRect = uiRenderer.rect;', context);
  const rects = new Map();
  function measure(node, parent) { const r = context.sourceRect(node.transform, parent); rects.set(node.id, JSON.parse(JSON.stringify(r))); node.children.forEach(n => measure(n, r)); }
  measure(screen.tree, screen.referenceSize);
  const all = walk(screen.tree);
  return definitions.map(def => {
    const source = all.find(n => n.id === def.sourceId), sourceRect = rects.get(source.id), tree = structuredClone(source);
    const width = sourceRect.width, height = sourceRect.height;
    if (!(width > 0 && height > 0)) throw Error('Nonpositive component frame: ' + def.id);
    tree.transform = { ...tree.transform, anchorMin: { x: .5, y: .5 }, anchorMax: { x: .5, y: .5 }, pivot: { x: .5, y: .5 }, anchoredPosition: { x: 0, y: 0 }, sizeDelta: { x: width, y: height } };
    const spec = { nodes: [], images: [], shapes: [], texts: [] };
    for (const n of walk(tree)) {
      const rect = rects.get(n.id), image = n.image || n.button, sprite = image?.spriteKey ? manifest.sprites.find(s => s.key === image.spriteKey) : null;
      if (image?.spriteKey && !sprite) throw Error('Unmanifested sprite: ' + image.spriteKey);
      if (sprite?.output && !sprite.missing && !existsSync(guard(path.join(root, 'dist'), path.resolve(root, 'dist', sprite.output)))) throw Error('Sprite file missing: ' + sprite.output);
      const row = { id: n.id, path: n.path, type: n.type, rect, active: n.active, alpha: n.alpha };
      spec.nodes.push(row);
      if (image) spec.images.push({ ...row, key: image.spriteKey || null, sprite, image, tint: n.button?.normal || n.image?.color || null });
      // These are entity rectangles/colors, not invented replacement shapes.
      spec.shapes.push({ ...row, color: n.image?.color || n.button?.normal || n.text?.backgroundColor || null, background: n.text?.background ?? null });
      if (n.text) spec.texts.push({ ...row, ...n.text, localization: i18n.entries[n.text.key] || null });
    }
    const omitted = [], entity = proposalEntity(tree, manifest, `uic-${def.id}`, omitted);
    entity.name = `Component_${def.id}`;
    const template = { op: 'add', parent: screen.tree.path, parentId: screen.tree.id, reason: `Template ${def.id}; slot: ${def.slots.map(s => `${s.name} = ${s.path}.${s.field}`).join('; ') || 'chưa có dữ liệu'}`, entity };
    return { ...def, source: screen.source, sourceRect, referenceSize: { width, height }, tree, entityCount: spec.nodes.length, spec, template, templateOmitted: omitted,
      stateEvidence: def.states.map(s => ({ name: s.name, ruleSource: s.ruleSource, rule: get(rules, s.ruleSource) })),
      usedBy: definitions.filter(d => d.composedOf.includes(def.id)).map(d => d.id) };
  });
}
export function syncUiComponents({ root = GDD_ROOT, dryRun = false, inputs = loadInputs(root) } = {}) {
  const components = deriveComponents(inputs, root), outputs = new Map();
  const registry = { source: inputs.screen.source, groups: [...new Set(components.map(c => c.group))], components: components.map(c => ({ id: c.id, name: c.name, group: c.group, status: c.status, sourcePath: c.sourcePath, sourceId: c.sourceId, entityCount: c.entityCount, usedCount: c.usedIn.filter(u => !u.planned).length, plannedCount: c.usedIn.filter(u => u.planned).length, data: `./data/ui/components/${c.id}.json` })) };
  for (const c of components) outputs.set(`${c.id}.json`, encode(c));
  outputs.set('registry.json', encode(registry));
  outputs.set('components-audit.json', encode({ components: components.length, entityInstances: components.reduce((n, c) => n + c.entityCount, 0), validated: true, source: inputs.screen.source, gameReads: false }));
  const dist = path.join(root, 'dist'), out = guard(dist, path.join(dist, 'data/ui/components'));
  // Resolve every destination (including junctions) before the first write.
  const destinations = [...outputs].map(([name, body]) => [guard(dist, path.join(out, name)), body]);
  if (!dryRun) { mkdirSync(out, { recursive: true }); for (const [file, body] of destinations) writeFileSync(file, body); }
  return { components, registry, outputs };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    if (process.argv.length > 2) throw Error('UI Components accepts no arguments; only GDD snapshots are read');
    const result = syncUiComponents(); console.log(`UI Components: ${result.components.length} validated`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}

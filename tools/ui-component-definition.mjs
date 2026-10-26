import { PATCH_FIELDS, validateField } from './ui-proposal-fields.mjs';

export const walk = tree => [tree, ...tree.children.flatMap(walk)];
export const get = (node, field) => field.split('.').reduce((v, k) => v?.[k], node);
export function put(node, field, value) {
  const keys = field.split('.'); let target = node;
  for (const key of keys.slice(0, -1)) target = target[key] ||= {};
  target[keys.at(-1)] = structuredClone(value);
}
// Small JSON Schema subset used by our checked-in definition schema.
export function validateShape(value, schema, at = 'definition') {
  if (schema.type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error(`${at}: expected object`);
    for (const key of schema.required || []) if (!Object.hasOwn(value, key)) throw Error(`${at}: missing ${key}`);
    for (const [key, item] of Object.entries(value)) {
      if (!schema.properties[key] && schema.additionalProperties === false) throw Error(`${at}: unknown ${key}`);
      if (schema.properties[key]) validateShape(item, schema.properties[key], `${at}.${key}`);
    }
  } else if (schema.type === 'array') {
    if (!Array.isArray(value)) throw Error(`${at}: expected array`);
    value.forEach((v, i) => validateShape(v, schema.items, `${at}[${i}]`));
  } else if (schema.type && typeof value !== schema.type) throw Error(`${at}: expected ${schema.type}`);
  if (schema.minLength && value.length < schema.minLength) throw Error(`${at}: empty string`);
  if (schema.pattern && !new RegExp(schema.pattern).test(value)) throw Error(`${at}: invalid format`);
  if (schema.enum && !schema.enum.includes(value)) throw Error(`${at}: invalid enum ${value}`);
}
export function validateDefinitions(definitions, { screen, manifest, rules, schema }) {
  const all = walk(screen.tree), ids = new Set();
  const resolve = (path, id) => {
    const matches = all.filter(n => n.path === path && (id == null || n.id === id));
    if (matches.length !== 1) throw Error(`source path/id missing or ambiguous: ${path} / ${id}`);
    return matches[0];
  };
  const check = (node, field, value, type) => {
    if (/^(image|button)\.spriteKey$/.test(field)) {
      if (type !== 'sprite' || !node[field.split('.')[0]]) throw Error('Invalid sprite field/type');
      if (!manifest.sprites.some(s => s.key === value)) throw Error('Sprite not registered: ' + value);
    } else {
      if (!PATCH_FIELDS[field]) throw Error('Unsupported slot field: ' + field);
      validateField(node, field, value);
      const expected = PATCH_FIELDS[field];
      if (type && !({ text: expected === 'string', tint: expected === 'color', active: expected === 'boolean', count: ['number','integer','positive','unit','alpha'].includes(expected) }[type])) throw Error('Slot type/field mismatch: ' + field);
    }
  };
  for (const def of definitions) {
    validateShape(def, schema);
    if (ids.has(def.id) || ['registry', 'components-audit'].includes(def.id)) throw Error('Duplicate/reserved component id: ' + def.id);
    ids.add(def.id);
    const source = resolve(def.sourcePath, def.sourceId), subtree = walk(source);
    if (def.usedIn.some(use => use.screen !== screen.id && !use.planned)) throw Error('Unregistered screen must be planned: ' + def.id);
    const target = p => { const matches = subtree.filter(n => n.path === p); if (matches.length !== 1) throw Error('Slot/state path missing or ambiguous: ' + p); return matches[0]; };
    const slotNames = new Set(), stateNames = new Set();
    for (const slot of def.slots) {
      if (slotNames.has(slot.name)) throw Error('Duplicate slot: ' + slot.name); slotNames.add(slot.name);
      const node = target(slot.path); check(node, slot.field, slot.default, slot.type);
      if (JSON.stringify(get(node, slot.field)) !== JSON.stringify(slot.default)) throw Error('Slot default differs from .ui: ' + slot.name);
      if (Object.hasOwn(slot, 'sample')) check(node, slot.field, slot.sample, slot.type);
    }
    for (const state of def.states) {
      if (stateNames.has(state.name)) throw Error('Duplicate state: ' + state.name); stateNames.add(state.name);
      // A dotted rule pointer must resolve inside the already-synced rules.
      const evidence = get(rules, state.ruleSource);
      if (evidence == null) throw Error('State ruleSource not found: ' + state.ruleSource);
      for (const override of state.overrides) check(target(override.path), override.field, override.value, /\.spriteKey$/.test(override.field) ? 'sprite' : undefined);
    }
  }
  const visit = (id, stack = []) => {
    if (stack.includes(id)) throw Error('composedOf cycle: ' + [...stack, id].join(' -> '));
    const def = definitions.find(d => d.id === id); if (!def) throw Error('Unknown composedOf component: ' + id);
    def.composedOf.forEach(child => visit(child, [...stack, id]));
  };
  definitions.forEach(d => visit(d.id));
  return definitions;
}

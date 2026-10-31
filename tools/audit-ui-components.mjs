import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { GDD_ROOT, loadInputs, syncUiComponents, componentInputs } from './sync-ui-components.mjs';
import { walk, get } from './ui-component-definition.mjs';
import { applyProposal, guard } from './sync-ui-proposals.mjs';

let cases = 0;
const check = fn => { fn(); cases++; };
const inputs = loadInputs(), result = syncUiComponents(), all = walk(inputs.screen.tree);
const folder = path.join(GDD_ROOT, 'dist/data/ui/components');
const hashes = () => Object.fromEntries(readdirSync(folder).map(name => [name, createHash('sha256').update(readFileSync(path.join(folder,name))).digest('hex')]));
const before = hashes();
syncUiComponents(); check(() => assert.deepEqual(hashes(),before));
for (const component of result.components) {
  const sourceInputs = componentInputs(inputs, component);
  const source = walk(sourceInputs.screen.tree).find(n => n.id === component.sourceId), nodes = walk(component.tree);
  check(() => assert.equal(source.path, component.sourcePath));
  check(() => assert.equal(nodes.length, component.entityCount));
  check(() => assert.deepEqual(component.tree.children,source.children));
  check(() => assert.deepEqual(component.spec.nodes.map(n => n.id),nodes.map(n => n.id)));
  check(() => assert.equal(component.spec.shapes.length,nodes.length));
  check(() => assert.equal(component.spec.images.length,nodes.filter(n => n.image || n.button).length));
  check(() => assert.equal(component.spec.texts.length,nodes.filter(n => n.text).length));
  for (const slot of component.slots) check(() => assert.deepEqual(slot.default,get(walk(source).find(n => n.path === slot.path && (!slot.sourceId || n.id === slot.sourceId)),slot.field)));
  // Actual Proposal semantic validator, not merely a JSON shape assertion.
  check(() => {
    const proposal = { id:'audit-component', screen:'collection', title:'Audit', author:'QA', status:'draft', summary:'Template compatibility', ops:[{ ...component.template, parent: inputs.screen.tree.path, parentId: inputs.screen.tree.id }], newAssets:[] };
    const manifest = { ...inputs.manifest, sprites: [...inputs.manifest.sprites, ...sourceInputs.manifest.sprites.filter(sp => !inputs.manifest.sprites.some(base => base.key === sp.key))] };
    const patched = applyProposal(inputs.screen,manifest,proposal);
    assert.equal(patched.screen.entityCount,inputs.screen.entityCount+component.entityCount);
  });
}
const mutations = [
  d => d[0].sourceId = 'missing', d => d[0].sourcePath = 'missing',
  d => d[0].id = d[1].id, d => d[0].slots[0].path = 'missing',
  d => d[0].slots[0].field = 'propsData.alpha', d => d[0].slots[0].default = 'invalid',
  d => d[0].slots.push({...d[0].slots[0]}),
  d => { const slot=d.flatMap(c => c.slots).find(s => s.type==='sprite'); slot.default='unknown-sprite'; },
  d => { d[0].composedOf = [d[1].id]; d[1].composedOf = [d[0].id]; },
  d => d[0].composedOf = ['missing'], d => d[0].unexpected = 1,
  d => { const st=d.find(c => c.states.length).states[0]; st.ruleSource='unknown.rule'; },
  d => { const st=d.find(c => c.states.length).states[0]; st.overrides[0].field='ecaProps.Widget'; },
  d => d[0].id = '../escape', d => d[0].slots[0].type = 'sprite'
  ,d => d[0].usedIn.push({screen:'unregistered',note:'Audit',planned:false}),
  d => { const slot=d.find(c=>c.id==='activities-mission-row').slots.find(s=>s.name==='firstRewardAmount'); delete slot.sourceId; },
  d => { d.find(c=>c.id==='activities-milestone-bar').previewFallbacks[0].sourceId='missing'; }
];
for (const mutate of mutations) {
  const bad = structuredClone(inputs); mutate(bad.definitions);
  check(() => assert.throws(() => syncUiComponents({ inputs:bad })));
  check(() => assert.deepEqual(hashes(),before));
}
check(() => assert.throws(() => guard(path.join(GDD_ROOT,'dist'),path.join(GDD_ROOT,'outside.json'))));
check(() => assert.doesNotMatch(readFileSync(path.join(GDD_ROOT,'dist/app-uicomponents.js'),'utf8'),/pointerenter|\.title\s*=|:hover/));
let browser = null;
const at = process.argv.indexOf('--browser-url');
if (at >= 0) {
  const { auditComponentsBrowser } = await import('./audit-ui-components-browser.mjs');
  browser = await auditComponentsBrowser(process.argv[at+1],result.components);
}
const report = { cases, components:result.components.length, entityInstances:result.components.reduce((n,c)=>n+c.entityCount,0), idempotent:true, invalidBatchWritesNothing:true, invalidCases:mutations.length, proposalTemplateSemanticValidation:true, gameReads:false, browser };
writeFileSync(guard(path.join(GDD_ROOT,'dist'),path.join(folder,'components-audit.json')),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));

import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { GDD_ROOT, syncUiComponents, loadInputs } from './sync-ui-components.mjs';
import { applyProposal } from './sync-ui-proposals.mjs';
import { auditUnchangedConsumers } from './audit-ui-components-regressions.mjs';

async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    let previous = '', stable = 0;
    for (let i = 0; i < 100; i++) {
      const images = [...document.querySelectorAll('#uic-stage img, #uic-source-fixture img')];
      await Promise.all(images.map(img => img.decode().catch(() => {})));
      const signature = images.map(img => img.src).join('|');
      stable = signature === previous ? stable + 1 : 0; previous = signature;
      if (stable >= 3 && images.every(img => img.complete && img.naturalWidth && (!img.classList.contains('ui-sliced') || img.src.startsWith('data:')))) return;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    throw Error('Sprite render did not settle');
  });
}
export async function auditComponentsBrowser(url, components = syncUiComponents({dryRun:true}).components, { regression = true } = {}) {
  const require = createRequire(import.meta.url), { chromium } = require('playwright');
  const browser = await chromium.launch({channel:process.env.UI_AUDIT_BROWSER || 'msedge'}), reports = [], inputs = loadInputs();
  try {
    for (const viewport of [{width:1440,height:1100},{width:390,height:844}]) {
      const context = await browser.newContext({viewport});
      await context.grantPermissions(['clipboard-read','clipboard-write'],{origin:new URL(url).origin});
      const page = await context.newPage(), errors = [], cases = [];
      page.on('pageerror',e => errors.push(e.message));
      page.on('console',msg => {if(msg.type()==='error' && !msg.location().url.endsWith('/favicon.ico')) errors.push(msg.text());});
      page.on('response',r => {if(r.status()>=400 && !r.url().endsWith('/favicon.ico')) errors.push(`${r.status()} ${r.url()}`);});
      await page.goto(new URL('/#uicomponents',url).href);
      await page.waitForSelector('[data-uic-card]');
      assert.equal(await page.locator('[data-uic-card]').count(),inputs.definitions.length);
      for (const group of [...new Set(inputs.definitions.map(c=>c.group))]) {
        await page.selectOption('#uic-group',group);
        assert.equal(await page.locator('[data-uic-card]:not([hidden])').count(),inputs.definitions.filter(c=>c.group===group).length);
      }
      await page.selectOption('#uic-group','');
      await page.fill('#uic-search','close-button'); assert.equal(await page.locator('[data-uic-card]:not([hidden])').count(),1);
      await page.fill('#uic-search','không-tồn-tại'); assert.equal(await page.locator('[data-uic-card]:not([hidden])').count(),0);
      await page.fill('#uic-search','');
      // Click a real card, then test cold deep-links for every catalog entry.
      await page.locator('[data-uic-card="close-button"]').click(); await page.waitForSelector('#uic-stage [data-ui-path]');
      for (const component of components) {
        await page.goto(new URL(`/#uicomponents/${component.id}`,url).href);
        await page.waitForFunction(id=>s.page==='uicomponents'&&uiComponents.selected?.id===id&&document.getElementById('uic-stage'),component.id);
        await page.waitForSelector('#uic-stage [data-ui-path]',{state:'attached'});
        assert.equal(await page.locator('#uic-stage [data-ui-path]').count(),component.entityCount);
        // A source snapshot mounted with the exact UI Preview renderer, without
        // runtime binder mutations. Full path/id match, not a copied subtree.
        await page.evaluate(async () => {
          const source = await fetchUiResource('./data/ui/collection.json').then(checkUiJson);
          const host = document.createElement('div');host.id='uic-source-fixture';
          Object.assign(host.style,{position:'absolute',left:'-10000px',top:'0',width:source.referenceSize.width+'px',height:source.referenceSize.height+'px',overflow:'hidden'});
          document.body.appendChild(host);
          const rendered=uiRenderer.render({tree:uicTranslatedTree(source.tree)},uiComponents.manifest,source.referenceSize.width,source.referenceSize.height);
          host.appendChild(rendered.canvas); window.uicSourceRendered=rendered;
        });
        await settle(page);
        const parity = await page.evaluate(() => {
          const data=uiComponents.selected, failures=[], nodes=uicWalk(data.tree);
          function pixels(el) {
            return [...el.querySelectorAll(':scope > .ui-visual > img')].map(img=>{
              const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;c.getContext('2d').drawImage(img,0,0);return c.toDataURL();
            });
          }
          for(const node of nodes){
            const a=uiComponents.rendered.byId.get(node.id),b=window.uicSourceRendered.byId.get(node.id);
            const fields=node.id===data.sourceId?['width','height']:['left','top','width','height'];
            for(const f of fields)if(Math.abs(parseFloat(a.style[f])-parseFloat(b.style[f]))>.01)failures.push(`${node.path} ${f}: ${a.style[f]} != ${b.style[f]}`);
            if(a.dataset.uiSpriteKey!==b.dataset.uiSpriteKey)failures.push(node.path+' sprite');
            if(JSON.stringify(pixels(a))!==JSON.stringify(pixels(b)))failures.push(node.path+' sprite raster');
            const ta=a.querySelector(':scope > .ui-text'),tb=b.querySelector(':scope > .ui-text');
            if(ta && tb && (ta.textContent!==tb.textContent || ta.style.color!==tb.style.color || ta.style.webkitTextStroke!==tb.style.webkitTextStroke))failures.push(node.path+' text');
          }
          document.getElementById('uic-source-fixture').remove();
          return {nodes:nodes.length,failures};
        });
        assert.deepEqual(parity.failures,[],component.id+' source parity');
        await page.locator('#uic-outlines').check(); assert.ok(await page.locator('#uic-stage').evaluate(el=>el.classList.contains('ui-debug')));
        await page.locator('#uic-outlines').uncheck();
        const states=[];
        for (const state of component.states) {
          await page.selectOption('#uic-state',state.name); await settle(page);
          const changes=await page.evaluate(() => {
            const state=uiComponents.selected.states.find(st=>st.name===uiComponents.state),tree=uicWalk(uiComponents.instance);
            return state.overrides.map(change=>{
              const n=tree.find(n=>n.path===change.path),el=uiComponents.rendered.byId.get(n.id);
              return {actual:uicGet(n,change.field),expected:change.value,domActive:!el.classList.contains('ui-inactive'),modelActive:n.active,sprite:el.dataset.uiSpriteKey,field:change.field};
            });
          });
          for(const c of changes){assert.deepEqual(c.actual,c.expected);assert.equal(c.domActive,c.modelActive);if(c.field.endsWith('spriteKey'))assert.equal(c.sprite,c.expected);}
          states.push(state.name);
        }
        await page.selectOption('#uic-state',component.states[0]?.name || '');
        // Every slot type is changed through its actual control. Verify model,
        // DOM, exported template and isolation of source + comparison instances.
        const slotCases=[];
        const immutable=await page.evaluate(()=>JSON.stringify({tree:uiComponents.selected.tree,variants:[...document.querySelectorAll('#uic-variants [data-ui-path]')].map(el=>[el.dataset.uiId,el.dataset.uiSpriteKey,el.className])}));
        for(const [index,slot] of component.slots.entries()) {
          const selector=`#uic-slot-${index}`;
          let value;
          if(slot.type==='active'){value=!slot.default;await page.locator(selector).setChecked(value);}
          else if(slot.type==='sprite'){value=inputs.manifest.sprites.find(sp=>sp.output&&!sp.missing&&sp.key!==slot.default).key;await page.selectOption(selector,value);}
          else if(slot.type==='count'){value=.25;await page.fill(selector,String(value));}
          else {value=slot.type==='tint'?'#123456':'Nội dung mẫu QA';await page.fill(selector,value);}
          await settle(page);
          const actual=await page.evaluate(({slot,value})=>{
            const node=uicWalk(uiComponents.instance).find(n=>n.path===slot.path),el=uiComponents.rendered.byId.get(node.id);
            return {value:uicGet(node,slot.field),active:!el.classList.contains('ui-inactive'),sprite:el.dataset.uiSpriteKey,text:el.querySelector(':scope > .ui-text')?.textContent,color:el.querySelector(':scope > .ui-visual > .ui-sprite')?.dataset.uiRenderData,mask:el.style.maskImage||el.style.clipPath};
          },{slot,value});
          assert.deepEqual(actual.value,value,component.id+' '+slot.name);
          if(slot.type==='active')assert.equal(actual.active,value);
          if(slot.type==='sprite')assert.equal(actual.sprite,value);
          if(slot.type==='text')assert.equal(actual.text,value);
          if(slot.type==='tint'&&actual.color)assert.equal(JSON.parse(actual.color).color,value);
          if(slot.field.endsWith('fillAmount'))assert.ok(actual.mask);
          slotCases.push(slot.name);
        }
        assert.equal(await page.evaluate(()=>JSON.stringify({tree:uiComponents.selected.tree,variants:[...document.querySelectorAll('#uic-variants [data-ui-path]')].map(el=>[el.dataset.uiId,el.dataset.uiSpriteKey,el.className])})),immutable);
        // Open all spec sections to detect overflow that collapsed tables hide.
        await page.locator('#uic-detail details').evaluateAll(elements=>elements.forEach(el=>el.open=true));
        await page.locator('#uic-copy').click();await page.waitForFunction(()=>document.getElementById('uic-copy-status').textContent==='Đã sao chép template');
        const op=JSON.parse(await page.evaluate(()=>navigator.clipboard.readText()));
        const patched=applyProposal(inputs.screen,inputs.manifest,{id:'browser-template',screen:'collection',title:'QA',author:'QA',status:'draft',summary:'Clipboard validation',ops:[op],newAssets:[]});
        assert.equal(patched.screen.entityCount,inputs.screen.entityCount+component.entityCount);
        const overflow=await page.evaluate(()=>({page:document.documentElement.scrollWidth,viewport:innerWidth,tables:[...document.querySelectorAll('.uic-table')].map(el=>({scroll:el.scrollWidth,width:el.clientWidth}))}));
        assert.ok(overflow.page<=overflow.viewport,component.id+' page overflow '+JSON.stringify(overflow));
        assert.ok(overflow.tables.every(t=>t.scroll<=t.width+1),component.id+' table overflow');
        cases.push({id:component.id,nodes:parity.nodes,sourceRectsAndSpritePixels:true,states,slots:slotCases,sourceAndVariantsIsolated:true,clipboardProposalValidated:true,horizontalOverflow:false});
      }
      // Clipboard failure, missing route, navigation away and back, mobile view.
      await page.evaluate(()=>{navigator.clipboard.writeText=async()=>{throw Error('audit denied');};});
      await page.locator('#uic-copy').click();await page.waitForFunction(()=>document.getElementById('uic-copy-status').textContent.includes('audit denied'));
      await page.goto(new URL('/#uicomponents/not-found',url).href);await page.waitForFunction(()=>document.getElementById('uic-detail').textContent.includes('không tồn tại'));
      await page.goto(new URL('/#uicomponents/tab-button',url).href);await page.waitForSelector('#uic-stage [data-ui-path]');
      await page.evaluate(()=>window.scrollTo(0,0));
      await page.screenshot({path:path.join(GDD_ROOT,'dist/data/ui/components',`browser-${viewport.width}.png`),fullPage:true});
      await page.evaluate(()=>go('uipreview'));await page.waitForSelector('[data-ui-pet-id]');
      assert.equal(await page.locator('#ui-preview-stage > .ui-canvas > [data-ui-path]').count(),1);
      await page.evaluate(()=>go('uicomponents'));await page.waitForSelector('[data-uic-card]');assert.ok(page.url().endsWith('#uicomponents'));
      assert.deepEqual(errors,[]);
      const regressionReport=regression ? await auditUnchangedConsumers(browser,url,viewport) : null;
      reports.push({viewport,components:cases,clipboardFailureHandled:true,filtersAndDeepLinks:true,previewNavigation:true,consoleErrors:errors,regression:regressionReport});
      await context.close();
    }
  } finally {await browser.close();}
  return reports;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const reports=await auditComponentsBrowser(process.argv[2]||'http://localhost:8080',undefined,{regression:!process.argv.includes('--components-only')});
  writeFileSync(path.join(GDD_ROOT,'dist/data/ui/components/browser-audit.json'),JSON.stringify(reports,null,2)+'\n');console.log('UI Components browser: '+reports.length+' viewports passed');
}

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { GDD_ROOT } from './sync-ui-components.mjs';

// This ref precedes all UI Components implementation commits. Only the three
// existing shell files changed by this feature need HTTP substitution.
export async function auditUnchangedConsumers(browser, url, viewport, baselineRef = '4787ee6') {
  const files = ['index.html','styles.css','app-router.js'];
  const baseline = new Map(files.map(file=>[file,execFileSync('git',['show',`${baselineRef}:dist/${file}`],{cwd:GDD_ROOT,encoding:'utf8'})]));
  const context = await browser.newContext({viewport}), old = await context.newPage(), current = await context.newPage();
  const oldErrors=[], currentErrors=[];
  old.on('pageerror',e=>oldErrors.push(e.message));current.on('pageerror',e=>currentErrors.push(e.message));
  for (const [file,body] of baseline) await old.route(`**/${file}*`,route=>route.fulfill({contentType:file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':'text/javascript',body}));
  await old.route(new URL('/',url).href,route=>route.fulfill({contentType:'text/html',body:baseline.get('index.html')}));
  const registry=JSON.parse(readFileSync(path.join(GDD_ROOT,'dist/data/ui/proposals/registry.json'),'utf8'));
  const screens=[{hash:'#uipreview/collection',modes:[null]},...registry.proposals.map(p=>({hash:`#uiproposal/${p.screen}/${p.id}`,modes:['current','proposed','overlay']}))];
  const captures=[];
  async function capture(page,hash,mode) {
    await page.goto(new URL('/'+hash,url).href);
    await page.waitForFunction(hash=>hash.startsWith('#uiproposal/')?s.page==='uiproposal'&&uiProposal.entry?.id===hash.split('/')[2]&&document.getElementById('ui-proposal-resource-rows')?.children.length:s.page==='uipreview'&&document.getElementById('ui-resource-rows')?.children.length,hash);
    await page.waitForSelector('#ui-resource-rows tr, #ui-proposal-resource-rows tr');
    if(mode)await page.selectOption('#ui-proposal-mode',mode);
    if(mode)await page.waitForFunction(mode=>uiProposal.mode===mode&&document.querySelectorAll('#ui-preview-stage > .ui-canvas').length===(mode==='overlay'?2:1),mode);
    await page.evaluate(async()=>{
      await document.fonts.ready;
      let previous='',stable=0;
      for(let i=0;i<100;i++){
        const imgs=[...document.querySelectorAll('#ui-preview-stage img')];
        await Promise.all(imgs.map(img=>img.decode().catch(()=>{})));
        const signature=imgs.map(img=>img.src).join('|');stable=signature===previous?stable+1:0;previous=signature;
        if(stable>=3&&imgs.every(img=>img.complete&&img.naturalWidth&&(!img.classList.contains('ui-sliced')||img.src.startsWith('data:'))))return;
        await new Promise(r=>setTimeout(r,50));
      }
      throw Error('Consumer sprites did not settle');
    });
    const dom=await page.locator('#ui-preview-stage').evaluate(el=>[...el.querySelectorAll('[data-ui-path]')].map(n=>[n.dataset.uiPath,n.dataset.uiId,n.dataset.uiSpriteKey,n.className,n.style.cssText,n.querySelector(':scope > .ui-text')?.textContent]));
    const pixels=await page.locator('#ui-preview-stage').screenshot();
    return {dom,pixels};
  }
  try {
    for(const screen of screens)for(const mode of screen.modes){
      oldErrors.length=0;currentErrors.length=0;
      const before=await capture(old,screen.hash,mode),after=await capture(current,screen.hash,mode);
      assert.deepEqual(after.dom,before.dom,screen.hash+' '+mode+' DOM changed');
      const hash=buffer=>createHash('sha256').update(buffer).digest('hex');
      if(hash(after.pixels)!==hash(before.pixels)) {
        const name=`regression-${viewport.width}-${screen.hash.split('/').at(-1)}-${mode}`;
        for(const [label,pixels] of [['before',before.pixels],['after',after.pixels]])writeFileSync(path.join(GDD_ROOT,'dist/data/ui/components',`${name}-${label}.png`),pixels);
      }
      assert.equal(hash(after.pixels),hash(before.pixels),screen.hash+' '+mode+' stage crop changed');
      assert.deepEqual(currentErrors,oldErrors,screen.hash+' '+mode+' new JavaScript errors');
      captures.push({route:screen.hash,mode,entities:after.dom.length,domIdentical:true,cropIdentical:true,inheritedPageErrors:[...oldErrors],sha256:createHash('sha256').update(after.pixels).digest('hex')});
    }
    return {baselineRef,viewport,captures};
  } finally {await context.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const require=createRequire(import.meta.url),{chromium}=require('playwright');
  const browser=await chromium.launch({channel:process.env.UI_AUDIT_BROWSER||'msedge'}),reports=[];
  try{for(const viewport of [{width:1440,height:1100},{width:390,height:844}]){reports.push(await auditUnchangedConsumers(browser,process.argv[2]||'http://localhost:8080',viewport));console.log(`Consumer crops: ${viewport.width} passed`);}}
  finally{await browser.close();}
  writeFileSync(path.join(GDD_ROOT,'dist/data/ui/components/regression-audit.json'),JSON.stringify(reports,null,2)+'\n');
}

import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { GDD_ROOT } from './sync-ui-components.mjs';

const require=createRequire(import.meta.url),{chromium}=require('playwright');
const browser=await chromium.launch({channel:process.env.UI_AUDIT_BROWSER||'msedge'}),reports=[];
try {
  for(const viewport of [{width:1440,height:1100},{width:390,height:844}]){
    const page=await browser.newPage({viewport}),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(new URL('/#uicomponents/activities-mission-row',process.argv[2]||'http://localhost:8080').href);
    await page.waitForSelector('#uic-stage [data-ui-path]');
    await page.selectOption('#uic-source','activities');
    assert.equal(await page.locator('[data-uic-card]:not([hidden])').count(),11);
    await page.selectOption('#uic-source','collection');
    assert.equal(await page.locator('[data-uic-card]:not([hidden])').count(),16);
    await page.selectOption('#uic-source','activities');
    const slots=await page.evaluate(()=>uiComponents.selected.slots.map((slot,index)=>({...slot,index})));
    const first=slots.find(s=>s.name==='firstRewardAmount'),second=slots.find(s=>s.name==='secondRewardAmount');
    assert.equal(first.path,second.path);assert.notEqual(first.sourceId,second.sourceId);
    await page.fill(`#uic-slot-${first.index}`,'x111');await page.fill(`#uic-slot-${second.index}`,'x222');
    const values=await page.evaluate(({first,second})=>{
      const op=currentUicTemplate(),nodes=uicWalk(op.entity);
      return [first,second].map(slot=>({text:uiComponents.rendered.byId.get(slot.sourceId).querySelector(':scope > .ui-text').textContent,exported:nodes.find(n=>n.id===`uic-activities-mission-row-${slot.sourceId}`).text.value,original:uicWalk(uiComponents.selected.tree).find(n=>n.id===slot.sourceId).text.value}));
    },{first,second});
    assert.equal(values[0].text,'x111');assert.equal(values[0].exported,'x111');
    assert.equal(values[1].text,'x222');assert.equal(values[1].exported,'x222');
    assert.equal(values[0].original,first.default);assert.equal(values[1].original,second.default);
    await page.goto(new URL('/#uicomponents/activities-milestone-bar',process.argv[2]||'http://localhost:8080').href);
    await page.waitForSelector('#uic-stage [data-uic-fallback]');
    const bar=await page.evaluate(()=>({fallbacks:document.querySelectorAll('#uic-stage [data-uic-fallback]').length,omitted:uiComponents.selected.templateOmitted,op:currentUicTemplate()}));
    assert.equal(bar.fallbacks,2);assert.ok(bar.omitted.some(s=>s.includes('thiếu sprite')));
    assert.ok(!JSON.stringify(bar.op).includes('previewFallbacks'));
    await page.locator('#uic-detail').scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(GDD_ROOT,`dist/data/ui/components/activities-template-${viewport.width}.png`)});
    assert.deepEqual(errors,[]);reports.push({viewport,sourceFilterCounts:{activities:11,collection:16},duplicatePathIds:[first.sourceId,second.sourceId],slotAndExportIsolation:true,declaredBarFallbacks:2,errors});
    await page.close();
  }
} finally {await browser.close();}
writeFileSync(path.join(GDD_ROOT,'dist/data/ui/components/activities-template-audit.json'),JSON.stringify(reports,null,2)+'\n');
console.log('Activities template filters, duplicate identities and fallback/export separation passed');

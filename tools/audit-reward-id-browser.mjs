import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
const require=createRequire(import.meta.url), {chromium}=require('playwright');
const model=require('../dist/reward-id-model.js'), data=JSON.parse(readFileSync(new URL('../dist/data/reward-id.json',import.meta.url),'utf8'));
const browser=await chromium.launch({channel:'msedge',headless:true});
const reports=[];
try {
  for(const width of [1440,390]) {
    const context=await browser.newContext({viewport:{width,height:1000}});
    await context.grantPermissions(['clipboard-read','clipboard-write'],{origin:'http://localhost:8080'});
    const page=await context.newPage(), errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error' && !m.location().url.endsWith('/favicon.ico')) errors.push(m.text());});
    page.on('response',r=>{if(r.status()>=400 && !r.url().endsWith('/favicon.ico')) errors.push(`${r.status()} ${r.url()}`);});
    await page.goto('http://localhost:8080/#rewardid');
    await page.waitForSelector('#rid-type');
    const apply=async draft=>{
      await page.selectOption('#rid-type',String(draft.type));
      for(const [key,value] of Object.entries(draft)) { if(key==='type') continue; const field=page.locator('#rid-'+key); if(await field.count()) { if(await field.evaluate(e=>e.tagName==='SELECT')) await field.selectOption(String(value)); else if(!await field.getAttribute('readonly') && !(await field.evaluate(e=>e.readOnly))) await field.fill(String(value)); } }
    };
    const vectors=[['100010100',{type:1,value:'1',mutationId:'1',weatherId:'0'}],['220250',{type:2,moneyValue:25,moneyUnit:2}],['3999',{type:3,amount:999}],['3012300',{type:3,amount:12300}],['4050100',{type:4,rarity:'MYTHIC',mutationId:'1',weatherId:'0'}],['50015',{type:5,hours:1.5}],['7999',{type:7,amount:999}],['7012300',{type:7,amount:12300}],['8999',{type:8,amount:999}],['9999',{type:9,amount:999}],['10000005',{type:10,value:'0',amount:5}],['16015010',{type:16,value:'15',amount:10}],['17050',{type:17,amount:50}]];
    for(const [id,draft] of vectors) { await apply(draft); assert.equal(await page.inputValue('#rid-id'),id); assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`overflow ${width} type ${draft.type}`); }
    await apply({type:3,amount:0}); assert.equal(await page.inputValue('#rid-id'),''); assert.equal(await page.locator('[data-copy="csvRow"]').isDisabled(),true);
    await apply({type:3,amount:12345}); assert.match(await page.locator('#rid-status').innerText(),/Chưa có/);
    await page.click('[data-copy="csvRow"]'); assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),'3012345,3,12345,1');
    const saved=await page.inputValue('#rid-id'); await page.reload(); await page.waitForSelector('#rid-type'); assert.equal(await page.inputValue('#rid-id'),saved);
    const conflict=data.rewards.map(r=>model.encode(data,model.fromRow(r))).find(r=>r.valid && model.lookup(data,r)==='id-conflict');
    await apply(model.fromRow(conflict.row)); assert.match(await page.locator('#rid-status').innerText(),/Trùng ID khác nội dung/); assert.equal(await page.locator('[data-copy="csvRow"]').isDisabled(),true);
    const equivalent=data.rewards.map(r=>model.encode(data,model.fromRow(r))).find(r=>r.valid && model.lookup(data,r)==='equivalent-other-id');
    await apply(model.fromRow(equivalent.row)); assert.match(await page.locator('#rid-status').innerText(),/tương đương ở ID legacy/);
    // Current catalog has no row under a canonical ID. Synthetic browser-only fixture covers exists without changing JSON.
    await page.route('**/data/reward-id.json',route=>route.fulfill({json:{...data,rewards:[...data.rewards,{ID:'3999',TypeReward:'3',Value:'999',Quantity:'1'}]}}));
    await page.reload(); await page.waitForSelector('#rid-type'); await apply({type:3,amount:999}); assert.match(await page.locator('#rid-status').innerText(),/^Đã có/);
    await page.unroute('**/data/reward-id.json');
    await page.reload(); await page.waitForSelector('#rid-type');
    await apply({type:1,value:'1',mutationId:'1',weatherId:data.weathers[0].ID}); assert.ok((await page.inputValue('#rid-csv')).includes(';'+data.weathers[0].ID));
    await apply({type:4,weatherId:data.weathers[0].ID}); assert.equal(await page.inputValue('#rid-csv'),''); assert.equal(await page.locator('[data-copy="csvRow"]').isDisabled(),true);
    await apply({type:1,value:'1'}); await page.fill('#rid-petSearch','1'); assert.ok(await page.locator('#rid-value option:not([hidden])').count());
    await page.evaluate(async()=>{await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));});
    assert.deepEqual(await page.evaluate(()=>[...document.querySelectorAll('#reward-id img')].filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src)),[]);
    assert.deepEqual(errors,[]);
    await page.screenshot({path:new URL(`../dist/data/reward-id-${width}.png`,import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1'),fullPage:true});
    reports.push({width,vectors:13,overflow:false,consoleErrors:errors,invalidCopyBlocked:true,clipboard:true,draftReload:true,statuses:['exists (synthetic fixture)','id-conflict','equivalent-other-id','new'],brokenImages:0});
    await context.close();
  }
} finally {await browser.close();}
const missingIcons=[];
const visuals=JSON.parse(readFileSync(new URL('../dist/data/ui/mail-composer.json',import.meta.url),'utf8'));
for(const group of ['pets','mutations','weathers']) for(const row of data[group]) { const visual=visuals[group].find(r=>r.ID===row.ID); if(!visual?.icon) missingIcons.push(`${group}:${row.ID}`); }
for(const rarity of Object.keys(data.rarities)) if(!visuals.randomIcons[rarity]) missingIcons.push(`RandomPet:${rarity}`);
missingIcons.push('DMMP');
writeFileSync(new URL('../dist/data/reward-id-browser-audit.json',import.meta.url),JSON.stringify({reports,missingIcons},null,2)+'\n');
console.log(JSON.stringify({reports,missingIcons}));

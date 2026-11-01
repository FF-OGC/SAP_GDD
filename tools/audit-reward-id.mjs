import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
const model = createRequire(import.meta.url)('../dist/reward-id-model.js');
const data = JSON.parse(readFileSync(new URL('../dist/data/reward-id.json',import.meta.url),'utf8'));
const at = process.argv.indexOf('--project-root');
if (at >= 0) for (const source of data.sourceFiles) assert.equal(createHash('sha256').update(readFileSync(`${process.argv[at+1]}/${source.file}`)).digest('hex'),source.sha256,source.file);
const base = {type:1,amount:1,value:'1',mutationId:'1',weatherId:'0',rarity:'MYTHIC',moneyValue:25,moneyUnit:2,hours:1.5};
const vectors = [[100010100,{}],[220250,{type:2}],[3999,{type:3,amount:999}],[3012300,{type:3,amount:12300}],[4050100,{type:4}],[50015,{type:5}],[7999,{type:7,amount:999}],[7012300,{type:7,amount:12300}],[8999,{type:8,amount:999}],[9999,{type:9,amount:999}],[10000005,{type:10,value:'0',amount:5}],[16015010,{type:16,value:'15',amount:10}],[17050,{type:17,amount:50}]];
for (const [id,draft] of vectors) { const r=model.encode(data,{...base,...draft}); assert.equal(r.valid,true,r.errors.join(';')); assert.equal(r.id,String(id)); }
for (const [amount,tail] of [[999,'999'],[1000,'001000'],[999999,'999999']]) assert.equal(model.encode(data,{type:3,amount}).id,'3'+tail);
for (const amount of [1000000,0,-1,1.5,'',null,'bad']) assert.equal(model.encode(data,{type:3,amount}).valid,false);
for (const type of [3,7,8,9,10,16,17]) for (const amount of [0,-1,1.5,1000000]) assert.equal(model.encode(data,{...base,type,amount}).valid,false);
for (const type of [1,2,4,5]) assert.equal(model.encode(data,{...base,type,amount:2}).valid,false);
for (const type of [10,16]) { const r=model.encode(data,{...base,type,value:type===10?'999':'999',amount:5}); assert.ok(r.errors.some(e=>e.includes('chọn ID hợp lệ'))); }
assert.ok(model.encode(data,{...base,type:10,value:'0',amount:1000}).errors.some(e=>e.includes('int32')));
for (const moneyValue of [0,1000,1.23]) assert.equal(model.encode(data,{...base,type:2,moneyValue}).valid,false);
assert.equal(model.encode(data,{...base,type:2,moneyValue:0.1,moneyUnit:1}).valid,false);
for (const hours of [0,1000,1.23]) assert.equal(model.encode(data,{...base,type:5,hours}).valid,false);
const petWeather=model.encode(data,{...base,weatherId:data.weathers[0].ID}); assert.ok(petWeather.csvRow.includes(`;${data.weathers[0].ID},1`));
assert.equal(model.encode(data,{...base,type:4,weatherId:data.weathers[0].ID}).csvRow,null);
assert.equal(model.encode({...data,petWeatherSupported:false},{...base,weatherId:data.weathers[0].ID}).csvRow,null);
const probe=model.encode(data,{type:3,amount:999}), row=probe.row;
assert.equal(model.lookup({rewards:[row]},probe),'exists');
assert.equal(model.lookup({rewards:[{...row,Value:'1'}]},probe),'id-conflict');
assert.equal(model.lookup({rewards:[{...row,ID:'legacy'}]},probe),'equivalent-other-id');
assert.equal(model.lookup({rewards:[]},probe),'new');
const currentCounts={}, canonicalCounts={}, rows=[];
for (const row of data.rewards) {
  const current=model.lookup(data,row); currentCounts[current]=(currentCounts[current]||0)+1;
  const result=model.encode(data,model.fromRow(row));
  const canonical=result.valid?model.lookup(data,result):'unencodable'; canonicalCounts[canonical]=(canonicalCounts[canonical]||0)+1;
  rows.push({sourceId:row.ID,current,canonical,id:result.id,errors:result.errors});
}
const report={vectors:vectors.length,passed:true,sourceRows:data.rewards.length,currentCounts,canonicalCounts,rows};
writeFileSync(new URL('../dist/data/reward-id-audit.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,rows:undefined}));

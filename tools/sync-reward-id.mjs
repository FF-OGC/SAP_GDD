import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
if (args.length !== 2 || args[0] !== '--project-root') throw Error('Use --project-root <game checkout>');
const game = path.resolve(args[1]), output = path.join(root, 'dist/data/reward-id.json');
const inside = (base, target) => { const r = path.relative(base, target); return r === '' || (!r.startsWith('..' + path.sep) && r !== '..' && !path.isAbsolute(r)); };
if (!inside(path.join(root, 'dist'), output) || inside(game, output)) throw Error('Unsafe output');
const sourceFiles = [];
function read(file) { const bytes = readFileSync(path.join(game, file)); sourceFiles.push({ file, sha256: createHash('sha256').update(bytes).digest('hex') }); return bytes.toString('utf8'); }
function csv(name) {
  const raw = read(`Assets/CSV/${name}.csv`).replace(/^\uFEFF/, ''), rows = []; let row = [], cell = '', quoted = false;
  for (let i = 0; i < raw.length; i++) { const c = raw[i]; if (c === '"') { if (quoted && raw[i+1] === '"') { cell += c; i++; } else quoted = !quoted; } else if (c === ',' && !quoted) { row.push(cell); cell = ''; } else if (/[\r\n]/.test(c) && !quoted) { if (c === '\r' && raw[i+1] === '\n') i++; row.push(cell); if (row.some(Boolean)) rows.push(row); row = []; cell = ''; } else cell += c; }
  row.push(cell); if (row.some(Boolean)) rows.push(row);
  return rows.slice(2).filter(r => r[0]).map(r => Object.fromEntries(rows[0].map((key, i) => [key, r[i] || ''])));
}
const rewards = csv('reward');
const project = (name, fields) => csv(name).map(r => Object.fromEntries(fields.map(f => [f, r[f]])));
const pets = project('Pet', ['ID','Name','Rarity']), mutations = project('mutation',['ID','Name']), weathers = project('weatherEffects',['ID','Name']);
const mutagens = project('Mutagen',['ID','Mutation','Rarity']), weatherGens = project('WeatherGen',['ID','WeatherEffect','Rarity']);
const notes = [];
function evidence(file, pattern, text) { const code = read(file), line = code.split(/\r?\n/).findIndex(l => l.includes(pattern)) + 1; if (!line) throw Error('Parser changed: ' + pattern); notes.push({ source: `${file}:${line}`, text }); }
evidence('Assets/Scripts/Configs/MailConfigs.fcg', '_RewardId2Value[rewardId] = Split', 'Value reward.csv được tách theo dấu ;.');
evidence('Assets/Scripts/Manager/MailsManager.fcg', 'var weatherIds List<int> = DataUtils.StringToListIntV2(rewardRawValue[2]', 'Pet đọc weather từ phần thứ ba, ngăn nhiều weather bằng dấu phẩy; phần thứ tư đọc level, ClaimPet hiện không dùng level. RandomPet config chỉ đọc rarity, không đọc mutation/weather.');
evidence('Assets/Scripts/Manager/RewardManager.fcg', 'ClaimPet(player, petId, mutationId, weatherIds, true, "mail")', 'ClaimReward truyền weather vào ClaimPet. Chưa chạy engine; hành vi thiếu phần thứ tư trong Value chưa được kiểm trong engine.');
const mail = JSON.parse(readFileSync(path.join(root,'dist/data/ui/mail-composer.json'),'utf8'));
const types = [[1,'Pet'],[2,'Money'],[3,'Pet Coin'],[4,'RandomPet'],[5,'MoneyTime'],[7,'Dust'],[8,'DMMP'],[9,'Spin'],[10,'Mutagen'],[16,'WeatherGen'],[17,'Duplicate Ticket']].map(([id,label])=>({id,label}));
const result = { sourceCommit:spawnSync('git',['-C',game,'rev-parse','HEAD'],{encoding:'utf8'}).stdout.trim(), sourceFiles, rewards, pets, mutations, weathers, mutagens, weatherGens, rarities: Object.fromEntries(['COMMON','RARE','EPIC','LEGENDARY','MYTHIC','APEX','LIMITED'].map((r,i)=>[r,i+1])), types, suffixes:mail.suffixes, petWeatherSupported:true, randomWeatherSupported:false, notes };
if (!result.sourceCommit) throw Error('Missing source commit');
writeFileSync(output, JSON.stringify(result,null,2)+'\n');
console.log(`Reward ID: ${rewards.length} rewards, ${mutagens.length} Mutagen configs, ${weatherGens.length} WeatherGen configs`);

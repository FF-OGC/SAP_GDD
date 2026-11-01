"use strict";
pages.rewardid = 'Reward ID';
function rewardIdPage() { return head('NỘI DUNG','Reward ID','Chọn quà để sinh ID chuẩn và đối chiếu reward.csv. Công cụ chỉ đọc, không ghi vào game.') + '<section id="reward-id" class="panel rid-panel"><p>Đang tải catalog…</p></section>'; }
async function updateRewardIdPage() {
  const host = document.getElementById('reward-id');
  try {
    const [data, visuals] = await Promise.all(['./data/reward-id.json','./data/ui/mail-composer.json'].map(async url => { const r=await fetch(url); if(!r.ok) throw Error('HTTP '+r.status); return r.json(); }));
    if (s.page !== 'rewardid' || !host.isConnected) return;
    const defaults = type => ({type:String(type),amount:'1',value:type===10?data.mutagens[0]?.ID:type===16?data.weatherGens[0]?.ID:data.pets[0]?.ID,mutationId:'1',weatherId:'0',rarity:'COMMON',moneyValue:'25',moneyUnit:'2',hours:'1.5'});
    let draft = defaults(1), current, status;
    try { const saved=JSON.parse(localStorage.getItem('rewardIdDraft')); if(saved?.version===1 && data.types.some(t=>String(t.id)===saved.type)) draft={...draft,...saved}; } catch {}
    const img = (key,label) => { const sprite=visuals.sprites.find(sp=>sp.key===visuals.spriteKeys[key]); return sprite ? `<img src="./${esc(sprite.output)}" alt="${esc(label)}">` : `<span class="rid-placeholder" title="Chưa có icon trong snapshot GDD">${esc(label)} · chưa có icon</span>`; };
    const opts = (rows,selected,label) => rows.map(r=>`<option value="${esc(r.ID)}" ${String(selected)===r.ID?'selected':''}>${esc(label(r))}</option>`).join('');
    const itemName = (r,type) => `${r.ID} · ${type===10?data.mutations.find(m=>m.ID===r.Mutation)?.Name:data.weathers.find(w=>w.ID===r.WeatherEffect)?.Name} · ${r.Rarity}`;
    const field = (name,label,control) => `<div class="rid-field"><label for="rid-${name}">${label}</label>${control}<small data-error="${name}" class="rid-error"></small></div>`;
    const input = (name,value,extra='') => `<input id="rid-${name}" data-field="${name}" type="number" value="${esc(value)}" ${extra}>`;
    const select = (name,options) => `<select id="rid-${name}" data-field="${name}">${options}</select>`;
    function renderForm() {
      const type=Number(draft.type), fixed=[1,2,4,5].includes(type);
      let fields=field('type','Type',select('type',data.types.map(t=>`<option value="${t.id}" ${t.id===type?'selected':''}>${esc(t.label)} · ${t.id}</option>`).join('')));
      fields+=field('amount','Số lượng / Amount (bắt buộc)',input('amount',draft.amount,`min="1" step="1" required ${fixed?'readonly aria-describedby="rid-fixed"':''}`));
      if(fixed) fields+='<p id="rid-fixed" class="rid-hint">Quantity khóa = 1. Muốn nhiều quà, thêm nhiều mục. Money nhập mantissa + hậu tố; MoneyTime nhập số giờ bên dưới.</p>';
      if(type===1) fields+=field('petSearch','Tìm Pet theo tên / ID','<input id="rid-petSearch" type="search" placeholder="Tên hoặc ID…">')+field('value','Pet',select('value',opts(data.pets,draft.value,r=>`${r.ID} · ${visuals.pets.find(p=>p.ID===r.ID)?.label||r.Name} · ${r.Rarity}`)));
      if(type===4) fields+=field('rarity','Rarity',select('rarity',Object.keys(data.rarities).map(r=>`<option ${r===draft.rarity?'selected':''}>${esc(r)}</option>`).join('')));
      if([1,4].includes(type)) fields+=field('mutationId','Mutation',select('mutationId',opts(data.mutations,draft.mutationId,r=>`${r.ID} · ${r.Name}`))+'<span id="rid-mutation-icon" class="rid-control-icon"></span>')+field('weatherId','Weather',select('weatherId','<option value="0">00 · Không có</option>'+opts(data.weathers,draft.weatherId,r=>`${r.ID} · ${r.Name}`))+'<span id="rid-weather-icon" class="rid-control-icon"></span>');
      if(type===2) fields+=field('moneyValue','Mantissa (Amount tiền)',input('moneyValue',draft.moneyValue,'min="0.1" max="999.9" step="0.1" required'))+field('moneyUnit','Hậu tố',select('moneyUnit',Object.entries(data.suffixes).map(([id,label])=>`<option value="${esc(id)}" ${id===String(draft.moneyUnit)?'selected':''}>${esc(label||'Cơ bản')}</option>`).join('')));
      if(type===5) fields+=field('hours','Số giờ (Amount giờ)',input('hours',draft.hours,'min="0.1" max="999.9" step="0.1" required'));
      if([10,16].includes(type)) fields+=field('value',type===10?'Mutagen · tên + rarity':'WeatherGen · weather + rarity',select('value',opts(type===10?data.mutagens:data.weatherGens,draft.value,r=>itemName(r,type))));
      host.innerHTML=`<div class="rid-columns"><form id="rid-form" class="rid-form" novalidate>${fields}</form><div class="rid-result"><div id="rid-visual" class="rid-visual"></div><h2 id="rid-name"></h2><div id="rid-status" role="status" aria-live="polite"></div><div id="rid-errors" role="alert"></div><label for="rid-id">Reward ID</label><div class="rid-copy"><input id="rid-id" readonly><button data-copy="id" type="button">Copy ID</button></div><label for="rid-csv">CSV · ID,TypeReward,Value,Quantity</label><div class="rid-copy"><textarea id="rid-csv" rows="2" readonly></textarea><button data-copy="csvRow" type="button">Copy CSV</button></div><label for="rid-table">Bảng reward để dán vào Google Sheets · 4 cột, phân cách bằng tab</label><div class="rid-copy"><textarea id="rid-table" rows="1" readonly></textarea><button data-copy="table" type="button">Copy bảng</button></div><label for="rid-details-table">Reward Details · dán vào Google Sheets</label><div class="rid-copy"><textarea id="rid-details-table" rows="3" readonly></textarea><button data-copy="sheetRow" type="button">Copy Reward Details</button></div><p id="rid-copy-status" role="status"></p><div id="rid-warnings"></div><details><summary>Nguồn và giới hạn</summary>${data.notes.map(n=>`<p>${esc(n.text)}<br><small>${esc(n.source)}</small></p>`).join('')}<p>Không ghi config hoặc cấp thưởng trong game.</p></details></div></div>`;
      host.querySelector('form').onsubmit=e=>e.preventDefault();
    }
    function visual(result) {
      const d=result.display, type=Number(draft.type);
      if(type===1 || type===4) return img(type===1?`pet:${draft.value}`:visuals.randomIcons[draft.rarity],d.name)+`<div class="rid-badges">${img(`mutation:${draft.mutationId}`,data.mutations.find(m=>m.ID===draft.mutationId)?.Name||'Mutation')}${draft.weatherId!=='0'?img(`weather:${draft.weatherId}`,data.weathers.find(w=>w.ID===draft.weatherId)?.Name||'Weather'):''}</div>`;
      if([10,16].includes(type)) { const config=(type===10?data.mutagens:data.weatherGens).find(r=>r.ID===draft.value); return img(type===10?`mutation:${config?.Mutation}`:`weather:${config?.WeatherEffect}`,d.name); }
      if(type===8) return '<span class="rid-placeholder">DMMP · chưa có icon</span>';
      const names={2:'MoneyIcon',3:'PetCoinIcon',5:'MoneyIcon',7:'DustIcon',9:'SpinIcon',17:'DuplicateTicket'};
      return gameSpriteIconHtml(names[type],d.name);
    }
    function update() {
      current=rewardIdModel.encode(data,draft); status=current.valid?rewardIdModel.lookup(data,current):null;
      try { localStorage.setItem('rewardIdDraft',JSON.stringify({...draft,version:1})); } catch {}
      host.querySelector('#rid-id').value=current.id||''; host.querySelector('#rid-csv').value=current.csvRow||'';
      host.querySelector('#rid-table').value=current.row?[current.row.ID,current.row.TypeReward,current.row.Value,current.row.Quantity].join('\t'):'';
      host.querySelector('#rid-details-table').value=current.sheetRow||'';
      host.querySelectorAll('[data-copy]').forEach(b=>b.disabled=!current.valid || !(b.dataset.copy==='table'?current.row:current[b.dataset.copy]) || status==='id-conflict');
      for(const el of host.querySelectorAll('[data-error]')) { el.textContent=(current.fieldErrors[el.dataset.error]||[]).join(' '); const control=host.querySelector('#rid-'+el.dataset.error); if(control) control.setAttribute('aria-invalid',el.textContent?'true':'false'); }
      host.querySelector('#rid-errors').textContent=(current.fieldErrors.id||[]).join(' ');
      host.querySelector('#rid-visual').innerHTML=current.valid?visual(current):'';
      host.querySelector('#rid-name').textContent=current.valid?`${Number(draft.type)===1?(visuals.pets.find(p=>p.ID===draft.value)?.label||current.display.name):current.display.name}${current.display.rarity?' · '+current.display.rarity:''} · ×${current.display.amount}`:'Chưa có quà hợp lệ';
      const labels={'exists':'Đã có','id-conflict':'Trùng ID khác nội dung','equivalent-other-id':'Đã có tương đương ở ID legacy','new':'Chưa có'};
      const matches=current.valid?data.rewards.filter(r=>status==='id-conflict'?r.ID===current.id:rewardIdModel.key(r)===rewardIdModel.key(current.row)):[];
      host.querySelector('#rid-status').innerHTML=status?`<span class="tag ${status==='id-conflict'?'rid-error':'mint'}">${labels[status]}</span>${matches.length?`<p>${status==='equivalent-other-id'?'Khuyên tái dùng hoặc đổi ID legacy. ':''}${matches.map(r=>`<code>${esc([r.ID,r.TypeReward,r.Value,r.Quantity].join(','))}</code>`).join('<br>')}</p>`:''}`:'Nhập field hợp lệ để đối chiếu.';
      const warnings=[...current.warnings];
      if(current.valid && (typeMissingIcon())) warnings.push('Icon: chưa có icon trong snapshot GDD; dùng placeholder có nhãn.');
      host.querySelector('#rid-warnings').innerHTML=warnings.map(w=>`<p class="rid-hint">${esc(w)}</p>`).join('');
      const mi=host.querySelector('#rid-mutation-icon'), wi=host.querySelector('#rid-weather-icon');
      if(mi) mi.innerHTML=img(`mutation:${draft.mutationId}`,data.mutations.find(m=>m.ID===draft.mutationId)?.Name||'Mutation');
      if(wi) wi.innerHTML=draft.weatherId==='0'?'<small>Không có weather</small>':img(`weather:${draft.weatherId}`,data.weathers.find(w=>w.ID===draft.weatherId)?.Name||'Weather');
      host.querySelector('#rid-copy-status').textContent='';
    }
    function typeMissingIcon() { return !!host.querySelector('#rid-visual .rid-placeholder'); }
    host.oninput=host.onchange=e=> {
      if(e.type==='change' && e.target.tagName==='INPUT') return;
      if(e.type==='input' && e.target.tagName==='SELECT') return;
      if(e.target.id==='rid-petSearch') { const term=e.target.value.toLowerCase(); const select=host.querySelector('#rid-value'); for(const option of select.options) option.hidden=!option.textContent.toLowerCase().includes(term); return; }
      const name=e.target.dataset.field; if(!name) return;
      if(name==='type') { draft=defaults(Number(e.target.value)); renderForm(); }
      else draft[name]=e.target.value;
      update();
    };
    host.onclick=async e=> { const b=e.target.closest('[data-copy]'); if(!b || b.disabled || !current.valid || status==='id-conflict') return; try { await navigator.clipboard.writeText(b.dataset.copy==='table'?host.querySelector('#rid-table').value:b.dataset.copy==='sheetRow'?current.sheetRow:current[b.dataset.copy]); host.querySelector('#rid-copy-status').textContent=b.dataset.copy==='sheetRow'?'Đã sao chép dòng Reward Details để dán vào Google Sheets.':b.dataset.copy==='table'?'Đã sao chép bảng reward để dán vào Google Sheets.':'Đã sao chép.'; } catch { host.querySelector('#rid-copy-status').textContent='Clipboard chưa khả dụng; chọn và sao chép trực tiếp trong ô.'; } };
    renderForm(); update();
  } catch(error) { if(host.isConnected) host.textContent='Không tải được Reward ID: '+error.message; }
}

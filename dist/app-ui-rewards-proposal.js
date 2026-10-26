"use strict";

// Proposed behavior only. Source UI renderer and Collection controller stay intact.
const rewardDemo = { state: null, claims: new Set(), open: false, page: 0, message: '' };
function isRewardProposal() { return uiProposal.rewardSpec?.proposalIds.includes(uiProposal.entry?.id); }
function rewardRows(type) {
  return t(type === 'Mutations' ? 'mutation.csv' : 'weatherEffects.csv').rows.filter(row => Number(row.ID) >= (type === 'Mutations' ? uiPreview.rules.details.mutationStartId : uiPreview.rules.details.weatherStartId));
}
function rewardProposalState() {
  if (!rewardDemo.state) {
    rewardDemo.state = { ...collectionPreview, rarity:'ALL',page:0,selected:null,detailTab:'Mutations',mode:'custom',customPets:new Set(),customMutations:new Set(),customWeathers:new Set() };
    const filter = uiPreview.rules.petFilter;
    const pets = t('Pet.csv').rows.filter(p=> !(Number(p.ID)>filter.luckyBoxStart && Number(p.ID)<=filter.luckyBoxStart+filter.luckyBoxCount)).sort((a,b)=>Number(a.Rank)-Number(b.Rank));
    pets.slice(0,3).forEach((p,i)=> {
      rewardDemo.state.customPets.add(p.ID);
      const counts = i===0 ? [uiProposal.rewardSpec.demo.mutationCount,uiProposal.rewardSpec.demo.weatherCount] : i===1 ? [4,4] : [0,8];
      ['Mutations','Weathers'].forEach((type,j)=>rewardRows(type).slice(0,counts[j]).forEach(r=>rewardDemo.state['custom'+type].add(`${p.ID}/${r.ID}`)));
    });
  }
  return rewardDemo.state;
}
function rewardCount(pet,type) {
  const state=rewardProposalState();
  if (!pet || state.mode==='none') return 0;
  const hash=(value)=>{let n=state.seed|0;for(const ch of String(value))n=Math.imul(n^ch.charCodeAt(0),16777619);return n>>>0;};
  const owned=state.mode==='all'||state.mode==='random'&&hash(pet.ID)%2===0||state.mode==='custom'&&state.customPets.has(pet.ID);
  if (!owned) return 0;
  return rewardRows(type).filter(r=>state.mode==='all'||state.mode==='random'&&hash(`${pet.ID}/${type==='Mutations'?'mutation':'weather'}/${r.ID}`)%3===0||state.mode==='custom'&&state['custom'+type].has(`${pet.ID}/${r.ID}`)).length;
}
function rewardMilestones(pet,type) {
  const step=uiProposal.rewardSpec.step, count=rewardCount(pet,type);
  return Array.from({length:Math.floor(rewardRows(type).length/step)},(_,i)=>{
    const milestone=(i+1)*step,key=`${pet?.ID}/${type}/${milestone}`;
    return {milestone,key,claimed:rewardDemo.claims.has(key),ready:count>=milestone&&!rewardDemo.claims.has(key)};
  });
}
function rewardProposalComparison(spec) {
  return `<details class="reward-comparison"><summary>So sánh 3 phương án và UI Components tham chiếu</summary><div class="reward-comparison-grid">${spec.proposalIds.map((id,i)=>`<article><h3><a href="#uiproposal/collection/${id}">${['A · Thanh trong tab ★','B · Hai thẻ ở Info','C · Lộ trình riêng'][i]}</a></h3><p>${esc(spec.variants[id].recommendation)}</p><p>${esc(spec.variants[id].pros)}</p><p class="muted">Đánh đổi: ${esc(spec.variants[id].cons)}</p></article>`).join('')}</div><p><strong>Dấu quà:</strong> ô pet → tab rarity / All → tab Mutation hoặc Weather. Chỉ tắt khi nhận thành công; xem tab không xoá dấu.</p><p><strong>Mốc tiếp theo:</strong> nút Quà pet / Mốc sau mở cả hai nhánh, gồm mốc đã nhận, có thể nhận và chưa đạt. Mỗi 4 loại riêng từng nhánh; không cộng chéo.</p><p>${esc(spec.componentNote||'')}</p><ul>${(spec.componentReferences||[]).map(ref=>`<li><a href="#uicomponents/${esc(ref.id)}">${esc(ref.id)}</a> · ${esc(ref.kind)} — ${esc(ref.usage)}</li>`).join('')}</ul></details>`;
}
function mountRewardProposal() {
  document.getElementById('reward-experiment-shell')?.remove();
  if (!isRewardProposal()) return;
  const spec=uiProposal.rewardSpec,variant=spec.variants[uiProposal.entry.id];
  document.getElementById('ui-proposal-summary').insertAdjacentHTML('afterend',`<section id="reward-experiment-shell" class="reward-experiment-shell"><div class="reward-variant-links">${spec.proposalIds.map((id,i)=>`<a class="${id===uiProposal.entry.id?'active':''}" href="#uiproposal/collection/${id}">${['A · Trong tab ★','B · Hai thẻ ở Info','C · Lộ trình riêng'][i]}</a>`).join('')}</div><p><strong>${esc(variant.recommendation)}</strong> ${esc(variant.pros)}</p><p class="muted">Đánh đổi: ${esc(variant.cons)}</p><details><summary>Quy tắc và đối tượng thiết kế</summary><p>${esc(spec.source)}</p><p>${spec.assumptions.map(esc).join('<br>')}</p><p>${Object.values(spec.audience).map(esc).join('<br>')}</p><p>${esc(spec.notifications)}</p><p>${esc(spec.implementation)}</p></details><p>Mô phỏng tương tác · lượng Cash/Dust chưa có dữ liệu. Bấm pet có 🎁, đổi tab, nhận thử hoặc xem mốc sau.</p><div class="reward-scenarios"><button data-reward-scenario="3,3">Sắp đạt · 3 / 3</button><button data-reward-scenario="4,4">Vừa đạt · 4 / 4</button><button data-reward-scenario="8,4">Nhiều mốc · 8 / 4</button><button data-reward-scenario="max">Đủ toàn bộ loại</button><button data-reward-scenario="reset">Khôi phục demo</button></div><p id="reward-demo-status" role="status" aria-live="polite"></p></section>`);
  rewardDemo.open=false;
  document.querySelector('#reward-experiment-shell .reward-scenarios').insertAdjacentHTML('beforebegin',rewardProposalComparison(spec));
  rewardDemo.page=0;
  uiProposal.collectionBinding?.refresh();
  const canvas=uiPreview.rendered.canvas;
  canvas.addEventListener('click',event=>{
    if (uiProposal.mode==='current' || document.getElementById('ui-proposal-inspect')?.checked) return;
    const hit=event.target.closest('button[data-ui-hit-target="true"]');
    if (!hit || hit.disabled) return;
    const name=hit.dataset.uiName;
    if (/^(RewardEntry|InlineMore)$/.test(name)) {rewardDemo.open=true;rewardDemo.page=0;}
    else if (name==='RoadClose') rewardDemo.open=false;
    else if(name==='RoadNext') rewardDemo.page++;
    else if(name==='RoadPrev') rewardDemo.page--;
    else {
      const match=name?.match(/^(Mutations|Weathers)Claim(\d)$/);
      const type=match?.[1] || (name==='InlineClaim'?(rewardProposalState().detailTab==='Weathers'?'Weathers':'Mutations'):name==='MutationsCardClaim'?'Mutations':name==='WeathersCardClaim'?'Weathers':null);
      if(type) {
        const pet=rewardProposalState().selected, all=rewardMilestones(pet,type);
        const milestone=match?all[rewardDemo.page*uiProposal.rewardSpec.milestonesPerPage+Number(match[2])]:all.find(m=>m.ready);
        if(milestone?.ready){rewardDemo.claims.add(milestone.key);rewardDemo.message=`Đã nhận thử mốc ${milestone.milestone} ${type} · ${pet.Name}. Không cấp tiền thật.`;}
      }
    }
    refreshRewardProposal();
  });
  refreshRewardProposal();
}
function refreshRewardProposal() {
  if (!isRewardProposal() || !uiPreview.rendered) return;
  const canvas=uiPreview.rendered.canvas,state=rewardProposalState(),pet=state.selected;
  if (rewardDemo.lastPet !== pet?.ID) {rewardDemo.lastPet=pet?.ID;rewardDemo.message='';rewardDemo.open=false;}
  const modeSelect=document.getElementById('ui-player-mode');if(modeSelect)modeSelect.value=state.mode;
  const named=name=>canvas.querySelector(`[data-ui-name="${name}"]`);
  const show=(el,value)=>{if(el){el.classList.toggle('ui-inactive',!value);el.style.display=value?'':'none';}};
  const text=(name,value)=>{const el=named(name);if(el)uiRenderer.setText(el,String(value));};
  const ready=(p,type)=>rewardMilestones(p,type).some(m=>m.ready);
  const any=p=>ready(p,'Mutations')||ready(p,'Weathers');
  const current=uiProposal.mode==='current',visible=!state.loading&&!current&&!!pet;
  const pets=t('Pet.csv').rows.filter(p=>{const f=uiPreview.rules.petFilter,id=Number(p.ID);return !(id>f.luckyBoxStart&&id<=f.luckyBoxStart+f.luckyBoxCount);});
  canvas.querySelectorAll('[data-ui-pet-id]').forEach(card=>show(card.querySelector('[data-ui-name="PetGift"]'),visible&&any(pets.find(p=>p.ID===card.dataset.uiPetId))));
  for(const rarity of ['All','Common','Rare','Epic','Legendary','Mythic','Apex','Limited'])show(named(rarity+'Gift'),visible&&pets.some(p=>(rarity==='All'||p.Rarity===rarity.toUpperCase())&&any(p)));
  for(const type of ['Mutations','Weathers'])show(named(type+'Gift'),visible&&ready(pet,type));
  const inline=uiProposal.entry.id==='collection-rewards-inline';
  show(named('InlineReward'),visible&&inline&&state.detailTab!=='Info');
  show(named('RewardEntry'),visible);
  text('RewardEntryText',any(pet)?'🎁 Quà pet':'Quà pet');
  const types=['Mutations','Weathers'];
  for(const type of types){
    const count=rewardCount(pet,type),all=rewardMilestones(pet,type);
    const next=all.find(m=>m.ready)||all.find(m=>!m.claimed),title=type==='Mutations'?'Mutation':'Weather';
    const progress=next?`${title} · ${count} / ${next.milestone}`:`${title} · Đã nhận hết mốc`;
    const claimText=next?.ready?`Nhận mốc ${next.milestone}`:next?`Còn ${Math.max(0,next.milestone-count)} loại`:'Đã nhận hết';
    text(type+'CardProgress',next?`${count} / ${next.milestone}`:'Hoàn tất');
    text(type+'CardClaimText',claimText);
    if(named(type+'CardClaim'))named(type+'CardClaim').disabled=!next?.ready;
    if(state.detailTab===type){text('InlineProgress',progress);text('InlineClaimText',claimText);if(named('InlineClaim'))named('InlineClaim').disabled=!next?.ready;}
  }
  if(pet)text('OverviewValue',`Thu nhập: ${big(pet.Value)}/s`);
  show(named('RewardRoadmap'),visible&&rewardDemo.open);
  // A modal's hit surface prevents clicks reaching pet cards behind it.
  if(named('RewardRoadmap'))named('RewardRoadmap').style.pointerEvents='auto';
  text('RoadTitle',`QUÀ COLLECTION · ${pet?.Name||'Chọn pet'}`);
  const slots=uiProposal.rewardSpec.milestonesPerPage;
  const pages=Math.max(1,...types.map(type=>Math.ceil(rewardMilestones(pet,type).length/slots)));
  rewardDemo.page=Math.max(0,Math.min(pages-1,rewardDemo.page));
  text('RoadPage',`Trang mốc ${rewardDemo.page+1} / ${pages} · mỗi nhánh riêng`);
  if(named('RoadPrev'))named('RoadPrev').disabled=rewardDemo.page===0;
  if(named('RoadNext'))named('RoadNext').disabled=rewardDemo.page>=pages-1;
  types.forEach(type=>{
    text(type+'RoadTitle',`${type==='Mutations'?'Mutation':'Weather'} · ${rewardCount(pet,type)} / ${rewardRows(type).length} loại · mốc cuối ${Math.floor(rewardRows(type).length/uiProposal.rewardSpec.step)*uiProposal.rewardSpec.step}`);
    for(let j=0;j<slots;j++){
      const m=rewardMilestones(pet,type)[rewardDemo.page*slots+j];
      show(named(type+'Milestone'+j),!!m);
      if(!m)continue;
      text(type+'MilestoneLabel'+j,`Mốc ${m.milestone}`);
      text(type+'Claim'+j+'Text',m.claimed?'✓ Đã nhận':m.ready?'🎁 Nhận':`Còn ${m.milestone-rewardCount(pet,type)} loại`);
      const claim=named(type+'Claim'+j);if(claim)claim.disabled=!m.ready;
    }
  });
  const status=document.getElementById('reward-demo-status');
  if(status)status.textContent=rewardDemo.message||`Pet đang chọn: ${pet?.Name||'—'} · Mutation ${rewardCount(pet,'Mutations')} · Weather ${rewardCount(pet,'Weathers')} · ${pets.filter(any).length} pet có quà chưa nhận`;
}
document.addEventListener('click',event=>{
  const button=event.target.closest('[data-reward-scenario]');
  if(!button||s.page!=='uiproposal'||!isRewardProposal())return;
  if(button.dataset.rewardScenario==='reset'){
    rewardDemo.state=null;rewardDemo.claims.clear();rewardDemo.message='';mountUiProposal();return;
  }
  const state=rewardProposalState(),pet=state.selected;if(!pet)return;
  state.mode='custom';state.customPets.add(pet.ID);
  ['Mutations','Weathers'].forEach((type,i)=>{
    const rows=rewardRows(type),count=button.dataset.rewardScenario==='max'?rows.length:Number(button.dataset.rewardScenario.split(',')[i]);
    rows.forEach((r,j)=>{const key=`${pet.ID}/${r.ID}`;if(j<count)state['custom'+type].add(key);else state['custom'+type].delete(key);});
    rewardMilestones(pet,type).forEach(m=>rewardDemo.claims.delete(m.key));
  });
  rewardDemo.message='';uiProposal.collectionBinding?.refresh();
});

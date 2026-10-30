// ---------- same place twice: catch it when adding, offer to merge what is already doubled ----------
// "Same place" = within 100 m and a similar name (one contains the other, or most letter pairs match).
// Nothing is merged automatically: a branch of the same chain can sit next door.
function nameSim(a,b){
  const x=norm(a).replace(/[^\p{L}\p{N}]/gu,''), y=norm(b).replace(/[^\p{L}\p{N}]/gu,'');
  if(!x||!y) return 0; if(x===y) return 1; if(x.includes(y)||y.includes(x)) return .9;
  const bi=s=>{const m=new Map();for(let i=0;i<s.length-1;i++){const g=s.slice(i,i+2);m.set(g,(m.get(g)||0)+1)}return m};
  const A=bi(x),B=bi(y); let hit=0; A.forEach((n,g)=>{hit+=Math.min(n,B.get(g)||0)});
  return 2*hit/Math.max(1,(x.length-1)+(y.length-1));
}
function samePlace(p,q){
  if(!p||!q||p.id===q.id) return false;
  if(p.gid&&q.gid) return p.gid===q.gid;
  const near=p.ll&&q.ll&&!p.custom&&!q.custom?km(p.ll,q.ll)<0.1:true; // hand-made blocks sit at the area centre: judge by name only
  return near&&(nameSim(p.name,q.name)>=.6||(p.local&&q.local&&nameSim(p.local,q.local)>=.6));
}
const dupOf=pl=>P.find(p=>!p.shared&&samePlace(p,pl))||null;

// --- already doubled: suggest merging at the top of the 장소 tab ---
const dupNoKey=(a,b)=>[a,b].sort().join('~');
function dupPairs(){
  const no=new Set(store.get('gp.dupNo',[])||[]), mine=P.filter(p=>!p.shared), out=[];
  for(let i=0;i<mine.length&&out.length<3;i++)for(let j=i+1;j<mine.length;j++){
    const a=mine[i],b=mine[j]; if(samePlace(a,b)&&!no.has(dupNoKey(a.id,b.id))){out.push([a,b]);break}}
  return out;
}
function dupHTML(){
  const pairs=dupPairs(); if(!pairs.length) return '';
  const who=p=>p.custom?'직접 추가':p.by?`${p.by} 추천`:p.ai||FRESH.has(p.id)?'AI가 찾음':'장소 목록';
  return pairs.map(([a,b])=>`<div class="dup-card"><div class="dup-h"><b>🔗 같은 곳 같아요</b><span class="hint">${a.custom||b.custom?'이름이 비슷해요':'위치가 가깝고 이름이 비슷해요'}</span></div>
    <div class="dup-row"><span class="tag">${esc(who(a))}</span> ${esc(a.name)}</div><div class="dup-row"><span class="tag">${esc(who(b))}</span> ${esc(b.name)}</div>
    <div class="row"><button class="small-btn primary" type="button" data-dupmerge="${a.id}~${b.id}">하나로 묶기</button><button class="small-btn" type="button" data-dupno="${a.id}~${b.id}">다른 곳이에요</button></div></div>`).join('');
}
function mergePlaces(aId,bId){
  let a=PM[aId], b=PM[bId]; if(!a||!b) return;
  // keep the one already in the schedule, else the one that is not hand-made
  const inUse=id=>placed.some(x=>x.id===id);
  if((inUse(b.id)&&!inUse(a.id))||(a.custom&&!b.custom)){const t=a;a=b;b=t}
  placed.forEach(x=>{if(x.id===b.id)x.id=a.id});
  if(isWish(b.id)&&!isWish(a.id)) toggleWish(a.id); if(isWish(b.id)) toggleWish(b.id);
  if(b.note&&b.note!==a.note&&!/직접 만든 블록이에요/.test(b.note)) a.note=[a.note,b.note].filter(Boolean).join(' · ').slice(0,300);
  if(b.by&&!a.by) a.by=b.by;
  if(b.custom){custom=custom.filter(c=>c.id!==b.id);store.set('gp.custom',custom)}
  const k=PACK.places.findIndex(x=>x.id===b.id); if(k>=0) PACK.places.splice(k,1);
  const ka=PACK.places.find(x=>x.id===a.id); if(ka){ka.note=a.note;if(a.by)ka.by=a.by}
  savePack();
  const i=P.findIndex(x=>x.id===b.id); if(i>=0) P.splice(i,1); delete PM[b.id]; FRESH.delete(b.id);
  save(); renderAll(); showToast(`"${a.name}" 하나로 묶었어요`);
}
document.addEventListener('click',e=>{const t=e.target.closest('button');if(!t)return;
  if(t.dataset.dupmerge){const [a,b]=t.dataset.dupmerge.split('~');mergePlaces(a,b);return}
  if(t.dataset.dupno){const [a,b]=t.dataset.dupno.split('~');const no=store.get('gp.dupNo',[])||[];no.push(dupNoKey(a,b));store.set('gp.dupNo',no.slice(-200));renderTray();return}
  if(t.dataset.dupuse){ // typing a name in "직접 만들기" found a place that is already there → schedule that one instead
    const p=PM[t.dataset.dupuse]; if(!p) return; const st=$('#cfStart')?parse($('#cfStart').value):null;
    placed.push({uid:'u'+(uidN++),id:p.id,day,start:Math.max(dayStart(day),Math.min(1410,st??600)),dur:p.dur});save();closeSheet();renderAll();showToast(`이미 있는 "${p.name}"을(를) 일정에 넣었어요`);return}
});
// --- while typing a new place's name: show places that are already there ---
document.addEventListener('input',e=>{
  if(e.target.id!=='cfName'||$('#customForm')?.dataset.edit) return;
  let box=$('#cfDup'); if(!box){box=document.createElement('div');box.id='cfDup';box.className='dup-suggest';e.target.closest('.fg').after(box)}
  const q=e.target.value.trim(); if(q.length<2){box.innerHTML='';return}
  const hits=P.filter(p=>!p.drop&&(nameSim(p.name,q)>=.5||norm(p.name).includes(norm(q)))).slice(0,4);
  box.innerHTML=hits.length?`<p class="hint" style="margin:6px 0 4px">이미 있는 장소예요. 같은 곳이면 이걸 쓰세요.</p>`+hits.map(p=>`<button type="button" class="dup-pick" data-dupuse="${p.id}"><b>${esc(p.name)}</b><span class="hint">${esc(p.area||'')}${p.shared?' · 여행자 추천':''}${placed.some(x=>x.id===p.id)?' · 이미 일정에 있어요':''}</span></button>`).join(''):'';
});
// local test hooks (tools/checks.js)
if(/^(localhost|127\.0\.0\.1)$/.test(location.hostname)&&window.__jepi) Object.assign(window.__jepi,{
  dupTest(){const a=P.find(p=>!p.custom&&!p.drop&&!placed.some(b=>b.id===p.id));const b=Object.assign({},a,{id:'dupx',name:a.name+' 본점'});PACK.places.push(b);addPackPlace(b);renderTray();return a.name},
  has:id=>!!PM[id], openCustom:()=>openCustom(), openFind:o=>openFind(o)});

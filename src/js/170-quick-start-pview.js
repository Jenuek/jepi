// ---------- quick start (P, and any one-day course): a few taps ----------
const nextSat=()=>{const d=new Date();const add=(6-d.getDay()+7)%7||7;return isoPlus(d.getDay()===6?0:add)};
const SLOTS=[['morning','오전부터',600,1080],['noon','점심부터',720,1200],['after','오후부터',840,1320],['eve','저녁만',1080,1380]];
// drawn by React: app/screens/OnbBody.tsx Quick
function partQuick(p,dayOnly){
  const q=p.q||(p.q={when:'',len:dayOnly?'0':'',slot:'noon'});
  return {f:'quick',dest:p.dest??'',dayOnly:!!dayOnly,when:String(q.when??''),date:p.dateSet!==false?String(p.startDate??''):'',len:String(q.len??''),slot:String(q.slot??''),
    slots:SLOTS.map(s=>[s[0],s[1]]),kws:['맛집','카페','산책','쇼핑','전시','한잔','사진','자연'].map(k=>({k,on:kws.some(x=>norm(x)===norm(k))})),party:p.party.type};
}
async function quickStart(){
  const q=draft.q||{}, dest=String(draft.dest||'').trim();
  if(!dest){setSt('st_pack','어디로 갈지 적어 주세요.');return}
  if(!q.when||(q.when==='pick'&&draft.dateSet===false)){setSt('st_pack','언제 갈지 골라 주세요.');return}
  if(q.len===''||q.len==null){setSt('st_pack','얼마나 갈지 골라 주세요.');return}
  if(q.when!=='pick'){draft.startDate=q.when==='today'?isoPlus(0):q.when==='tomorrow'?isoPlus(1):nextSat();}
  draft.dateSet=true; draft.dateUnknown=false; draft.nightsSet=true;
  if(q.len==='0'){const sl=SLOTS.find(s=>s[0]===q.slot)||SLOTS[1];let st=sl[2];
    if(q.when==='today'){const n=new Date(),now=n.getHours()*60+n.getMinutes();if(now+30>st)st=Math.min(1320,Math.ceil((now+30)/30)*30)}
    draft.kind='day'; draft.meet=Object.assign({},draft.meet||{},{time:fmt(st),end:fmt(Math.max(st+180,sl[3]))});}
  else{draft.kind='trip'; draft.nights=+q.len; draft.bookedFlight=true; draft.bookedStay=true; draft.flightSet=false; draft.staySet=false;}
  if(norm(dest)!==norm(PACK.city)){
    if(sample){if(!(await genPack(dest,'quickStart')))return}
    else{custom=[];store.set('gp.custom',custom);placed=[];save();loadPack(manualPack(dest));savePack()}
  }
  draft.dest=PACK.city; if(draft.kind==='day'&&!AREAS[draft.meet.area]) draft.meet.area=firstArea();
  await finishOnb();
}

// ---------- P view: day as four cards you fill by rolling ----------
const BUCKETS=[['오전',360,720],['오후',720,1020],['저녁',1020,1260],['밤',1260,1440]];
let pRoll={};
function fuzzy(m){const h=Math.floor(m/60)%24,mm=m%60;return `${h<12?'오전':'오후'} ${h%12||12}시${mm>=30?' 반':''}`}
function pGap(nm){const b=BUCKETS.find(x=>x[0]===nm);return diceGaps(day).map(g=>({s:Math.max(g.s,b[1]),e:Math.min(g.e,b[2]),prev:g.prev})).filter(g=>g.e-g.s>=45)[0]}
function renderPView(){
  const box=$('#pview'); if(!box) return;
  const on=jp==='P'; box.hidden=!on; $('.grid-wrap').hidden=on; if(!on) return;
  const {items}=analyze(day), lo=day===0?arrEnd()-60:dayStart(day), hi=profile.kind==='day'?tmin(profile.meet.end,1200)+15:1440;
  let h='';
  for(const [nm,bs,be] of BUCKETS){
    if(be<=lo||bs>=hi) continue;
    const its=items.filter(i=>!i.stay&&i.start<be&&i.start>=bs), g=pGap(nm);
    h+=`<section class="pb"><h3>${nm}</h3>${its.map(pItem).join('')}${g?pTile(nm):''}${!its.length&&!g?'<p class="hint">여유 시간이 없어요.</p>':''}</section>`;
  }
  box.innerHTML=h||'<p class="hint">이 날은 채울 시간이 없어요.</p>';
}
function pItem(i){const crit=i.warns.filter(w=>/휴관|겹쳐|기간|찾아야/.test(w));
  return `<button type="button" class="pi${i.kind==='fixed'?' fx':''}" data-puid="${i.uid}" style="--cc:${i.cc}"><span class="pt">${fuzzy(i.start)}</span><b>${i.marks&&i.marks.length?[...new Set(i.marks.map(m=>MARKS[m][0]))].join('')+' ':''}${esc(i.name)}</b><small>${esc(i.locName||'')}${crit.length?` · <span class="w">⚠ ${esc(crit[0])}</span>`:''}</small></button>`}
function pTile(nm){const k=day+'|'+nm, st=pRoll[k];
  if(st&&st.cand){const c=st.cand;return `<div class="ptile on"><div class="pc" style="--cc:var(--c-${c.p.cat})"><b>${esc(c.p.name)}</b><small>${fuzzy(c.arr)}쯤 · ${esc(c.p.area)}${c.tm?` · ${c.mode} ${c.tm}분`:''}${isWish(c.p.id)?' · ♥':''}</small>${c.p.note?`<p>${esc(c.p.note)}</p>`:''}</div>
    <div class="row"><button type="button" class="small-btn primary" data-pyes="${k}">좋아요</button><button type="button" class="small-btn" data-pnext="${k}">다음 →</button><button type="button" class="t-link" data-pclose="${k}">그만</button></div></div>`}
  if(st&&st.empty) return `<div class="ptile"><p>${nm}에 맞는 곳은 다 봤어요.</p><div class="row">${sample&&!PACK.manual?`<button type="button" class="small-btn" data-pai="${k}">AI에게 더 찾아 달라기</button>`:''}<button type="button" class="t-link" data-pclose="${k}">닫기</button><span class="ai-status" id="st_p_${BUCKETS.findIndex(b=>b[0]===nm)}"></span></div></div>`;
  return `<button type="button" class="ptile" data-proll="${k}"><span class="die-s">🎲</span><span>${nm}, 뭐 할까요?<small>눌러서 굴려 보기</small></span></button>`;
}
function pRollDo(k){
  const nm=k.split('|')[1], g=pGap(nm); if(!g){delete pRoll[k];renderPView();return}
  const st=pRoll[k]||(pRoll[k]={seen:[]}); if(st.cand) st.seen.push(st.cand.p.id);
  const km0=dice.mood, l0=dice.lunch; dice.mood='any'; dice.lunch=false; let cs=diceCands(g); dice.mood=km0; dice.lunch=l0;
  if(nm==='저녁'||nm==='밤') cs.forEach(c=>{if(['food','night'].includes(c.p.cat)||['evening','night','sunset'].includes(c.p.best))c.w+=1.5});
  if(nm==='오전') cs.forEach(c=>{if(c.p.best==='morning')c.w+=1.5});
  cs=cs.filter(c=>!st.seen.includes(c.p.id));
  if(!cs.length){st.cand=null;st.empty=true;renderPView();return}
  const fw=c=>c.w*(dice.fresh&&dice.fresh.includes(c.p.id)?8:1); const tot=cs.reduce((a,c)=>a+fw(c),0); let r=Math.random()*tot, pick=cs[cs.length-1]; for(const c of cs){r-=fw(c);if(r<=0){pick=c;break}}
  st.cand=pick; st.empty=false; renderPView();
}
function learnFrom(p){const t=tagsOf(p.id)[0];if(t&&!kws.some(x=>norm(x)===norm(t))&&kws.length<12){kws.push(t);store.set('gp.kw',kws)}}
function pYes(k){const st=pRoll[k]; if(!st||!st.cand) return; const c=st.cand; learnFrom(c.p);
  const r=repairOps([{op:'add',day,id:c.p.id,start:fmt(c.arr),dur:c.dur}]); applyOpsCore(r.ops); save();
  diceLog.push({n:c.p.name,d:DAYS[day].iso}); diceLog=diceLog.slice(-60); store.set('gp.dice',diceLog); delete pRoll[k]; renderAll();}
async function pAI(k){const nm=k.split('|')[1], id='st_p_'+BUCKETS.findIndex(b=>b[0]===nm);
  const n=await morePlaces(6,id,`${nm} 시간대에 하기 좋은 곳`); if(n){const st=pRoll[k];if(st){st.empty=false;st.cand=null}pRollDo(k)}}


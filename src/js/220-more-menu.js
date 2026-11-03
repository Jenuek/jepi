// ---------- 더보기: trip summary, 준비하기 badge, P-mode short menu ----------
let moreAll=false, meOpen=null, autoT=0;
function tripSummary(){
  const pr=profile, n=nightsOf(pr), D0=DAYS[0]||{}, Dn=DAYS[DAYS.length-1]||{};
  const md=iso=>iso?`${+iso.slice(5,7)}/${+iso.slice(8,10)}`:'';
  const dates=pr.kind==='day'?md(D0.iso):pr.dateUnknown?'날짜 미정':`${md(D0.iso)}(${WD[D0.wd]}) – ${md(Dn.iso)}(${WD[Dn.wd]})`;
  const who=pr.party.type==='solo'?'혼자':pr.party.type==='couple'?'둘이서':`${heads2(pr.party)}명`;
  return {city:PACK.city||'여행지 미정',line:pr.kind==='day'?`${dates} · 하루 코스 · ${who}`:`${dates} · ${n}박 · ${who}`};
}
function prepLeft(){let n=0;document.querySelectorAll('#checks .check-group').forEach(g=>{const h=g.querySelector('h3');if(h&&/예약·준비/.test(h.textContent))n+=g.querySelectorAll('input[data-ck]:not(:checked)').length});return n}
function warnTotal(){let n=0;for(let d=0;d<DAYS.length;d++)n+=analyze(d).items.reduce((a,it)=>a+it.warns.length,0);return n}
// The menu itself is drawn by React: app/screens/MoreMenu.tsx. Here: the numbers it shows.
function renderMore(){
  const box=$('#moreBox'); if(!box) return;
  const s=tripSummary(), pr=profile, b=budgetParts&&budgetParts(pr);
  const tripChips=pr.kind==='day'?[]:[pr.bookedFlight===false?{text:'교통편 미정',tone:'warn'}:{text:'교통편 예약됨',tone:'ok'},pr.bookedStay===false?{text:'숙소 미정',tone:'warn'}:{text:'숙소 예약됨',tone:'ok'}];
  if(b) tripChips.push({text:`예산 1인 ${Math.round(b.total/10000)}만원`});
  const w=warnTotal(), sp=plans.find(x=>x.id===curPlan&&x.shared);
  window.JEPI_UI.mount('more',box,{city:s.city,line:s.line,tripChips,warnCount:w,prepLeft:prepLeft(),
    full:jp!=='P'||moreAll,showToggle:jp==='P',moreAll,plansCount:plans.length,
    friendsChip:sp?'👥 '+(((TRIPS&&TRIPS.members[curPlan])||[]).length||'공유 중'):null,
    notifyOn:!!(NOTIFY&&NOTIFY.on),aiOff:!!(STANDALONE&&!sample)});
  const wc=$('#warnCount'); if(wc) wc.textContent=w?String(w):'';
}
// 이번 여행: one row per topic, opens only that part, saves on change
function meRows(p){
  const md=(k)=>mdOf(p,k), n=nightsOf(p);
  const flightTxt=p.kind==='day'?'':p.bookedFlight===false?'<span class="wtxt">아직 안 정했어요</span>':(p.flightSet?`<span class="mono">가는 편 ${esc(p.out.dep||'')} → ${esc(p.out.arr||'')}</span><small class="mono">오는 편 ${esc(p.back.dep||'')} → ${esc(p.back.arr||'')}</small>`:'시간을 넣어 주세요');
  const stayTxt=p.bookedStay===false?'<span class="wtxt">아직 안 정했어요</span>':esc(p.stays.map(s=>s.name||'숙소').join(', '));
  const b=budgetParts&&budgetParts(p);
  const who=p.party.type==='solo'?'혼자':p.party.type==='couple'?'연인·부부':p.party.type==='family'?`가족 ${heads2(p.party)}명`:`친구 ${heads2(p.party)}명`;
  if(p.kind==='day') return [
    ['day','코스',`${esc(PACK.city)} · ${esc(md(0))}`,()=>[oldPart(fDay(p))]],
    ['who','누구와',who,()=>[partParty(p)]],
    ['bud','예산',b?`1인 ${Math.round(b.total/10000)}만원`:'정하지 않음',()=>[partBudget(p)]]];
  return [
    ['when','언제·어디',`${esc(PACK.city||p.dest||'미정')} · ${p.dateUnknown?'날짜 미정':`${esc(md(0))}–${esc(md(n))}`} (${n}박)`,()=>[oldPart(fDest(p)),partTrip(p)]],
    ['who','누구와',who,()=>[partParty(p)]],
    ['way','오가는 길',flightTxt,()=>[partFlight(p),partHomeBox(p),partHome(p)].filter(Boolean)],
    ['stay','숙소',stayTxt,()=>[partStay(p)]],
    ['bud','예산',b?`1인 ${Math.round(b.total/10000)}만원 <small>· 현지 하루 ${won(b.daily)}</small>`:'정하지 않음',()=>[partBudget(p)]],
    ['ev','예약한 일정',p.events.length?`${p.events.length}개`:'없음',()=>[partEvents(p)]]];
}
// Drawn by React: app/screens/MeRows.tsx. meSetMsg changes only the message (the open form stays as it is).
let meRev=0, meLast=null;
function renderMeRows(){
  if(!draft) draft=clone(profile); fixProfile(draft);
  const rows=meRows(draft), op=rows.find(r=>r[0]===meOpen);
  meLast={rows:rows.map(([id,k,v])=>({id,label:k,valueHTML:v})),open:op?meOpen:null,body:op?op[3]():[],msg:autoMsg||'',dayCourse:profile.kind==='day',rev:++meRev};
  window.JEPI_UI.mount('me',$('#meBox'),meLast);
}
function meSetBudgetHint(h){if(!meLast||!$('#meBox'))return;meLast=Object.assign({},meLast,{body:meLast.body.map(x=>x.f==='budget'?Object.assign({},x,{hint:h}):x)});window.JEPI_UI.mount('me',$('#meBox'),meLast)}
function meSetMsg(m){if(!meLast||!$('#meBox')){return}meLast=Object.assign({},meLast,{msg:m});window.JEPI_UI.mount('me',$('#meBox'),meLast)}
let autoMsg='';
function autoSave(){clearTimeout(autoT);autoT=setTimeout(()=>{if(!draft||!$('#onb').hidden)return;
  const prevDest=profile.dest;commitProfile(draft);if(prevDest!==profile.dest)draft.dest=profile.dest;
  autoMsg='✓ 자동 저장됨 · 일정표에 바로 반영돼요';renderAll();meSetMsg(autoMsg)},500)}
// taste: style rows + keywords + wishes (carried into new plans). The style rows are drawn by React: app/screens/TasteStyle.tsx
const TASTE_KEYS=['pace','social','breakfast','style'];
function carryTaste(from,to){TASTE_KEYS.forEach(k=>{if(from&&from[k]!==undefined)to[k]=clone(from[k])})}
let tasteRev=0;
function renderTasteStyle(){const el=$('#tasteStyle');if(!el)return;if(!draft)draft=clone(profile);fixProfile(draft);const p=draft;
  window.JEPI_UI.mount('tasteStyle',el,{purpose:p.purpose??'',pace:p.pace,solo:p.party.type==='solo',social:p.social,breakfast:p.breakfast,
    rows:STYLE_ROWS,style:clone(p.style||{}),open:styleOpen,msg:autoMsg||'',rev:++tasteRev})}


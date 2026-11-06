// ---------- 더보기: trip summary, 준비하기 badge, P-mode short menu ----------
let moreAll=false, meOpen=null, autoT=0;
const tripSummary=()=>FORMS.tripSummary(DY.days);   // app/view/forms.ts
function prepLeft(){let n=0;document.querySelectorAll('#checks .check-group').forEach(g=>{const h=g.querySelector('h3');if(h&&/예약·준비/.test(h.textContent))n+=g.querySelectorAll('input[data-ck]:not(:checked)').length});return n}
function warnTotal(){let n=0;for(let d=0;d<DY.days.length;d++)n+=analyze(d).items.reduce((a,it)=>a+it.warns.length,0);return n}
// The menu itself is drawn by React: app/screens/MoreMenu.tsx. Here: the numbers it shows.
function renderMore(){
  const box=$('#moreBox'); if(!box) return;
  const s=tripSummary(), pr=CUR.profile, b=budgetParts&&budgetParts(pr);
  const tripChips=pr.kind==='day'?[]:[pr.bookedFlight===false?{text:'교통편 미정',tone:'warn'}:{text:'교통편 예약됨',tone:'ok'},pr.bookedStay===false?{text:'숙소 미정',tone:'warn'}:{text:'숙소 예약됨',tone:'ok'}];
  if(b) tripChips.push({text:`예산 1인 ${Math.round(b.total/10000)}만원`});
  const w=warnTotal(), sp=PL.plans.find(x=>x.id===PL.curPlan&&x.shared);
  window.JEPI_UI.mount('more',box,{city:s.city,line:s.line,tripChips,warnCount:w,prepLeft:prepLeft(),
    full:UI.jp!=='P'||moreAll,showToggle:UI.jp==='P',moreAll,plansCount:PL.plans.length,
    friendsChip:sp?'👥 '+(((TRIPS&&TRIPS.members[PL.curPlan])||[]).length||'공유 중'):null,
    notifyOn:!!(NOTIFY&&NOTIFY.on),aiOff:!!(STANDALONE&&!UI.sample)});
  tabs({warn:w?String(w):''});
}
// 이번 여행: one row per topic, opens only that part, saves on change
const meRows=p=>FORMS.meRows(p,{dest:partDest,day:partsDay,homeBox:partHomeBox,paste:pasteBox});   // app/view/forms.ts
// Drawn by React: app/screens/MeRows.tsx. meSetMsg changes only the message (the open form stays as it is).
let meRev=0, meLast=null;
function renderMeRows(){
  if(!draft) draft=clone(CUR.profile); fixProfile(draft);
  const rows=meRows(draft), op=rows.find(r=>r[0]===meOpen);
  meLast={rows:rows.map(([id,k,v])=>({id,label:k,valueHTML:v})),open:op?meOpen:null,body:op?op[3]():[],msg:autoMsg||'',dayCourse:CUR.profile.kind==='day',rev:++meRev};
  window.JEPI_UI.mount('me',$('#meBox'),meLast);
}
function meSetBudgetHint(h){if(!meLast||!$('#meBox'))return;meLast=Object.assign({},meLast,{body:meLast.body.map(x=>x.f==='budget'?Object.assign({},x,{hint:h}):x)});window.JEPI_UI.mount('me',$('#meBox'),meLast)}
function meSetMsg(m){if(!meLast||!$('#meBox')){return}meLast=Object.assign({},meLast,{msg:m});window.JEPI_UI.mount('me',$('#meBox'),meLast)}
let autoMsg='';
function autoSave(){clearTimeout(autoT);autoT=setTimeout(()=>{if(!draft||!$('#onb').hidden)return;
  const prevDest=CUR.profile.dest;commitProfile(draft);if(prevDest!==CUR.profile.dest)draft.dest=CUR.profile.dest;
  autoMsg='✓ 자동 저장됨 · 일정표에 바로 반영돼요';renderAll();meSetMsg(autoMsg)},500)}
// taste: style rows + keywords + wishes (carried into new plans). The style rows are drawn by React: app/screens/TasteStyle.tsx
const TASTE_KEYS=['pace','social','breakfast','style'];
function carryTaste(from,to){TASTE_KEYS.forEach(k=>{if(from&&from[k]!==undefined)to[k]=clone(from[k])})}
let tasteRev=0;
function renderTasteStyle(){const el=$('#tasteStyle');if(!el)return;if(!draft)draft=clone(CUR.profile);fixProfile(draft);const p=draft;
  window.JEPI_UI.mount('tasteStyle',el,{purpose:p.purpose??'',pace:p.pace,solo:p.party.type==='solo',social:p.social,breakfast:p.breakfast,
    rows:STYLE_ROWS,style:clone(p.style||{}),open:styleOpen,msg:autoMsg||'',rev:++tasteRev})}


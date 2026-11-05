// ---------- events ----------
// open a tab (the bottom tabs, and any button with data-tab: 더보기 rows, back buttons …)
function goTab(name){tab=name;autoMsg='';if(tab==='me'){draft=clone(CUR.profile);meOpen=null;renderMe()}if(tab==='pref'){draft=clone(CUR.profile);renderTasteStyle()}if(tab==='plans'){snapshotCurrent();showText=false;renderPlans()}if(tab==='settings'){keyEdit=null;renderSettings()}if(tab==='more')renderMore();if(PANELS[tab])PANELS[tab].render({opened:true});renderTabs();if(tab==='map')openMap();else mapState.on=false;window.scrollTo({top:0});}
document.addEventListener('click',e=>{
  const t=e.target.closest('button,input,label'); if(!t) return;
  if(t.dataset.tab){if(!t.closest('.tabs'))goTab(t.dataset.tab);return}
  if(t.id==='diceFab'){openDiceTab(mealNow()==='snack'?'do':'eat',null);return}
  if(t.id==='coachAgain'){showCoach(0);return}
  if(t.id==='moreHelper'){openHelper(CUR.wish.length?1:0);return}
  // 닫기 in any sheet (#sheet: block, 🎲, 장소 찾기, 직접 만들기)
  if(t.dataset.close&&t.closest('#sheet')){closeSheet();return}
});
document.addEventListener('change',e=>{
  if(e.target.id==='dateUnknown'&&draft){draft.dateUnknown=e.target.checked;if(draft.dateUnknown){draft.startDate=isoPlus(30);draft.dateSet=true}else draft.dateSet=false;rerenderForm();return}
});
$('#sheetBg').addEventListener('click',e=>{if(e.target.id==='sheetBg')closeSheet()});
document.addEventListener('submit',e=>{const f=e.target;
  if(f.id==='customForm'){e.preventDefault();saveCustomForm(f)}
});
document.addEventListener('input',onPf);
document.addEventListener('change',onPf);
// What was pressed in a block's sheet (BlockSheet.tsx; the sheet's block is #sheet's uid). Only changes that move the
// block redraw the sheet: tapping an input (memo, …) keeps the keyboard.
function blockAct(n,v,o){
  o=o||{}; const uid=$('#sheet').dataset.uid, b=CUR.placed.find(x=>x.uid===uid);
  switch(n){
  case 'fill': place(v,+o.start);closeSheet();renderAll();return;          // an empty time: put this place there
  case 'dicefrom': dice.tab='do';doDefaults(true);openDice(+v);diceRoll(false);return;
  case 'totray': closeSheet();tab='tray';renderTabs();return;
  case 'newcustom': openCustom(null,+v);return;
  case 'editcustom': openCustom(v,null);return;
  case 'swap': if(b){TRIP.blocks.change(uid,{id:v,start:+o.start,dur:+o.dur});renderAll();openSheet(uid)}return;
  case 'mark': toggleMark(uid,v);renderAll();openSheet(uid,{marksOpen:true});return;
  case 'pairblock': makePairBlock(uid,v);return;
  case 'home': CUR.profile.home.min=Math.max(10,Math.min(240,(+CUR.profile.home.min||60)+ +v));TRIP.save('profile',CUR.profile);buildDays();renderAll();openSheet('f0a');return;
  }
  if(!b) return;
  if(n==='mv'){TRIP.blocks.change(uid,{start:Math.max(dayStart(day),Math.min(1410,b.start+ +v))});renderAll();openSheet(uid);return}
  if(n==='du'){TRIP.blocks.change(uid,{dur:Math.max(30,Math.min(720,b.dur+ +v))});renderAll();openSheet(uid);return}
  if(n==='del'){TRIP.blocks.remove(uid);closeSheet();renderAll();return}
}
// 🛠 AI에게 경고 해결 맡기기 (the check list's button and the 경고 chip above the 일정표)
function fixWarns(){const ws=[];DAYS.forEach((_,d)=>analyze(d).items.forEach(it=>it.warns.forEach(w=>ws.push(`Day ${d+1} ${it.name}: ${w}`))));tab='timeline';renderTabs();sendChat('지금 일정의 경고를 모두 해결해 줘. 꼭 필요한 것만 바꾸고, 바꿀 수 없는 고정 일정은 그대로 둬.\n'+ws.slice(0,20).join('\n'));const c=$('#chat');if(c)c.scrollIntoView({block:'start'})}
// 준비하기 (Checks.tsx): a tick, a warning (go to its block), 경고 해결, 시즌 정보, 모두 지우기
function checksAct(n,v,o){
  switch(n){
  case 'ck': TRIP.tick(v,!!o);renderChecks();return;
  case 'goto': {const [d,u]=String(v).split('~');day=+d;tab='timeline';renderAll();openSheet(u);return}
  case 'fix': fixWarns();return;
  case 'season': genSeason('st_season');return;
  case 'reset': if(!resetArm){resetArm=true;renderChecks();return}
    resetArm=false;CUR.fmarks={};TRIP.save('fmarks',CUR.fmarks);CUR.placed=DEFAULT.map(b=>({uid:TRIP.uids.next(),id:b.id,day:b.day,start:b.start,dur:PM[b.id].dur}));save();renderAll();return;
  }
}
// ✨ 빈 시간 채우기 results (AiBox.tsx): stop, close, put one in
function aiboxAct(n,v){
  if(n==='stop'){aiState?.ctl?.abort();return}
  if(n==='close'){aiState=null;renderAI();return}
  if(n==='acc'&&aiState?.items){const x=aiState.items[+v];if(x&&!x.added){place(x.id,x.start);x.added=true;renderAll()}}
}
// What was pressed in the 일정표 and around it (DayGrid.tsx slots and blocks, the Day buttons, 오늘 보기, 간식비 −/+)
function gridAct(n,v){
  switch(n){
  case 'day': day=+v;renderAll();return;
  case 'slot': if(!selected){openFill(+v);return} place(selected,+v); selected=null; renderAll(); return;   // an empty time: fill it, or put the chosen card there
  case 'blk': openSheet(v);return;
  case 'meal': TRIP.setMeal(day,Math.max(0,Math.min((PK.pack.snack||1000)*20,mealOf(day)+ +v)));renderBudget();return;
  }
}
// 취향 키워드 (TasteKeywords.tsx, and the chips in 처음 설정): toggle returns whether the keyword is on now
function kwAct(n,v){
  switch(n){
  case 'toggle': {const on=TRIP.keywords.toggle(v);renderPref();return on}
  case 'del': TRIP.keywords.remove(+v);saveKw();return;
  case 'add': if(TRIP.keywords.add(v))saveKw();return;   // a suggestion, or what was typed
  case 'reset': CUR.kws=DEFAULT_KW.slice();saveKw();return;
  }
}
// 더보기 rows that are not a tab (MoreMenu.tsx): 여행 노트, 여행 꾸미기, 전체 메뉴 보기
function moreAct(id){
  if(id==='nbOpen'){openNotebook();return}
  if(id==='lookOpen'){openLook();return}
  if(id==='moreAll'){moreAll=!moreAll;renderMore();return}
}
// What was pressed on the P모드 판 (PView.tsx tells: its name and value)
function pviewAct(n,v){
  switch(n){
  case 'sq': openSheet(v);return;              // a square with a block on it
  case 'gap': pRollDo(v);return;               // an empty square: roll to fill it
  case 'roll': pRollDo(v,true);return;
  case 'mood': pMood(v);return;
  case 'card': pMood('mine');return;           // one of 내 카드
  case 'next': if(pSt.draw)pRollDo(pSt.draw.gi);return;
  case 'yes': pYes();return;
  case 'keep': pKeep();return;
  case 'close': pClose();return;
  case 'ai': pAI();return;
  case 'ahead': pAhead();return;
  }
}
// What was pressed in the "더 정확한 일정을 위해 알려 주세요" box (ChatLog.tsx Nudges: a button id, or ✕ with its row)
function nudgeAct(n,v){
  switch(n){
  case 'nudgeFlightIn': goMe('가는 길');return;
  case 'nudgeFlightNo': CUR.profile.bookedFlight=false;TRIP.save('profile',CUR.profile);renderAll();openHelper(2);return;
  case 'nudgeStayIn': if(CUR.profile.bookedStay===false){CUR.profile.bookedStay=true}goMe('숙소');return;
  case 'nudgeStayNo': CUR.profile.bookedStay=false;TRIP.save('profile',CUR.profile);renderAll();openHelper(CUR.wish.length?1:0);return;
  case 'nudgeDate': goMe('여행 기간');return;
  case 'nudgeTaste': tab='pref';renderPref();renderTabs();return;
  case 'off': CUR.profile.nudgeOff=Object.assign({},CUR.profile.nudgeOff,{[v]:true});TRIP.save('profile',CUR.profile);renderNudges();return;
  }
}
// What was pressed on a place card or in the 장소 tab (Tray.tsx, also ♥ in the helper and 👍 in a block's sheet)
function placeAct(n,v){
  switch(n){
  case 'wish': toggleWish(v);if(helperOpen())renderHelper();renderTray();renderPView();return;
  case 'vote': toggleRec(v);return;
  case 'pick': selected=selected===v?null:v; if(selected&&!matchMedia('(min-width:900px)').matches){tab='timeline'} renderAll();return;   // 넣기: then a time slot
  case 'ppick': pPlaceNow(v);return;
  case 'pairec': pAIRec();return;
  case 'pfind': openFind({where:'city',into:'list'});return;
  case 'pnewcard': openCustom(null,null,{card:true});return;
  case 'cat': cat=v||'all';renderTray();return;   // a filter chip or the 분류 list
  case 'zone': {const [z,open]=v.split('~');zoneOpen[z]=open==='1';return}   // a 동네 group folded / unfolded
  case 'dupmerge': {const [a,b]=v.split('~');mergePlaces(a,b);return}
  case 'dupno': {const [a,b]=v.split('~');const no=store.get('gp.dupNo',[])||[];no.push(dupNoKey(a,b));store.set('gp.dupNo',no.slice(-200));renderTray();return}
  }
}
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('#sheetBg').hidden)closeSheet();else if(selected){selected=null;renderAll()}}});
// drag & drop (desktop)
let drag=null;
document.addEventListener('dragstart',e=>{
  const c=e.target.closest('.card'); const b=e.target.closest('.blk');
  if(c){drag={type:'new',id:c.dataset.id}} else if(b&&b.dataset.uid){drag={type:'move',uid:b.dataset.uid}} else return;
  try{e.dataTransfer.setData('text/plain','x');e.dataTransfer.effectAllowed='move'}catch(_){}
});
// the slot under a dragged card (React draws the slots: marked through a handle)
const dropMark=(el,on)=>{const L=window.JEPI_UI.live(el);if(L)L.cls('drop',on);else el.classList.toggle('drop',on)};
document.addEventListener('dragend',()=>{drag=null;document.querySelectorAll('.slot.drop').forEach(s=>dropMark(s,false))});
const gridEl=$('#grid');
gridEl.addEventListener('dragover',e=>{if(!drag)return;e.preventDefault();
  const s=document.elementsFromPoint(e.clientX,e.clientY).find(el=>el.classList&&el.classList.contains('slot'));
  document.querySelectorAll('.slot.drop').forEach(x=>{if(x!==s)dropMark(x,false)}); if(s&&!s.classList.contains('drop')) dropMark(s,true)});
gridEl.addEventListener('drop',e=>{if(!drag)return;e.preventDefault();
  const H=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hour'))||60;
  const r=gridEl.getBoundingClientRect(); const m=dayStart(day)+Math.floor(((e.clientY-r.top)/H*60)/30)*30;
  if(drag.type==='new') place(drag.id,m); else {const b=CUR.placed.find(x=>x.uid===drag.uid); if(b){b.start=Math.max(dayStart(day),Math.min(1410,m));save()}}
  drag=null; selected=null; renderAll()});
matchMedia('(min-width:900px)').addEventListener?.('change',renderTabs);


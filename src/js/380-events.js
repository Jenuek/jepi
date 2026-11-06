// ---------- events ----------
// open a tab (the bottom tabs, and any button with data-tab: 더보기 rows, back buttons …)
function goTab(name){UI.tab=name;autoMsg='';if(UI.tab==='me'){draft=clone(CUR.profile);meOpen=null;renderMe()}if(UI.tab==='pref'){draft=clone(CUR.profile);renderTasteStyle()}if(UI.tab==='plans'){snapshotCurrent();showText=false;renderPlans()}if(UI.tab==='settings'){keyEdit=null;renderSettings()}if(UI.tab==='more')renderMore();if(PANELS[UI.tab])PANELS[UI.tab].render({opened:true});renderTabs();if(UI.tab==='map')openMap();else mapState.on=false;window.scrollTo({top:0});}
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
// presses on the 일정표 and around it (block sheet, empty time, Day buttons, 간식비, 준비하기, AI box, 취향 키워드, drag & drop):
// app/flow/schedule.ts. What it still needs from the old code is connected here.
const SCHED=window.JEPI_UI.flow.schedule;
SCHED.connect({hero:p=>hero(p),diceFrom:t=>{dice.tab='do';doDefaults(true);openDice(t);diceRoll(false)},openCustom:(id,st)=>openCustom(id,st),
  makePairBlock:(uid,k)=>makePairBlock(uid,k),genSeason:id=>genSeason(id),fixWarns:()=>fixWarns()});
const blockAct=SCHED.blockAct, checksAct=SCHED.checksAct, aiboxAct=SCHED.aiboxAct, gridAct=SCHED.gridAct, kwAct=SCHED.kwAct, dropped=SCHED.dropped;
// 🛠 AI에게 경고 해결 맡기기 (the check list's button and the 경고 chip above the 일정표)
function fixWarns(){const ws=[];DY.days.forEach((_,d)=>analyze(d).items.forEach(it=>it.warns.forEach(w=>ws.push(`Day ${d+1} ${it.name}: ${w}`))));UI.tab='timeline';renderTabs();sendChat('지금 일정의 경고를 모두 해결해 줘. 꼭 필요한 것만 바꾸고, 바꿀 수 없는 고정 일정은 그대로 둬.\n'+ws.slice(0,20).join('\n'));const c=$('#chat');if(c)c.scrollIntoView({block:'start'})}
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
  case 'nudgeTaste': UI.tab='pref';renderPref();renderTabs();return;
  case 'off': CUR.profile.nudgeOff=Object.assign({},CUR.profile.nudgeOff,{[v]:true});TRIP.save('profile',CUR.profile);renderNudges();return;
  }
}
// What was pressed on a place card or in the 장소 tab (Tray.tsx, also ♥ in the helper and 👍 in a block's sheet)
function placeAct(n,v){
  switch(n){
  case 'wish': toggleWish(v);if(helperOpen())renderHelper();renderTray();renderPView();return;
  case 'vote': toggleRec(v);return;
  case 'pick': UI.selected=UI.selected===v?null:v; if(UI.selected&&!matchMedia('(min-width:900px)').matches){UI.tab='timeline'} renderAll();return;   // 넣기: then a time slot
  case 'ppick': pPlaceNow(v);return;
  case 'pairec': pAIRec();return;
  case 'pfind': openFind({where:'city',into:'list'});return;
  case 'pnewcard': openCustom(null,null,{card:true});return;
  case 'cat': UI.cat=v||'all';renderTray();return;   // a filter chip or the 분류 list
  case 'zone': {const [z,open]=v.split('~');UI.zoneOpen[z]=open==='1';return}   // a 동네 group folded / unfolded
  case 'dupmerge': {const [a,b]=v.split('~');mergePlaces(a,b);return}
  case 'dupno': {const [a,b]=v.split('~');const no=store.get('gp.dupNo',[])||[];no.push(dupNoKey(a,b));store.set('gp.dupNo',no.slice(-200));renderTray();return}
  }
}
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('#sheetBg').hidden)closeSheet();else if(UI.selected){UI.selected=null;renderAll()}}});
// drag & drop (desktop): app/ui/drag.ts marks the slot and works out the time; putting the card / block there: app/flow/schedule.ts dropped
window.JEPI_UI.drag.connectGrid($('#grid'));
matchMedia('(min-width:900px)').addEventListener?.('change',renderTabs);


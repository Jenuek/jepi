
// JEPI — every file in src/js is pasted into ONE function scope, in file-name order.
// A file may use what an earlier file defines. Top-level code runs at load time, so keep
// start-up actions in 390-boot.js (after every file has defined its variables).
(function(){
// ---------- data layer (app/data, TypeScript) ----------
// Saving on this device, the server connection, key encryption and the demo sandbox live in app/data/.
// The old code reaches them through JD (= window.JEPI_DATA), which React sets up before this script runs.
const JD=window.JEPI_DATA;
// The trip's data (profile, blocks, ♥, plans …) is saved only through TRIP: app/data/trip.ts
const TRIP=JD.trip;
// the trip being worked on (profile, placed, custom, fmarks, wish, meals, done, kws) lives in app/data/trip.ts: CUR.placed …
const CUR=TRIP.cur;
// the plan list and which plan is open (app/data/trip.ts): PL.plans, PL.curPlan
const PL=TRIP.planList;
// the trip's days and the places they start from (app/data/days.ts): DY.days, DY.loc, DY.locArea, DY.locZone, DY.gmpBy, DY.homeMin
const DY=JD.days.state;
// how the traveler is described to the AI, and money text (app/data/traveler.ts)
const TV=JD.traveler;

// where the person is in the app (app/ui/state.ts): UI.day, UI.tab, UI.cat, UI.group, UI.zoneOpen, UI.selected, UI.aiState, UI.sample, UI.jp, UI.resetArm
const UI=window.JEPI_UI.ui;
// what the forms are editing (app/flow/forms.ts): FS.draft, FS.onbStep, FS.talk, FS.destRecs, FS.meOpen …
const FS=window.JEPI_UI.flow.forms.fs;
// the AI chat's state (app/flow/chat.ts): CS.chat, CS.busy, CS.undoSnap, CS.ctl, CS.folded
const CS=window.JEPI_UI.flow.chat.cs;
// 예약 도우미's state (app/flow/helper.ts): HS.step, HS.vibe, HS.hotelRecs, HS.routeInfo, HS.slotPicked …
const HS=window.JEPI_UI.flow.helper.hs;
// 내 계획's state (app/flow/plans.ts): PS.msg, PS.delArm, PS.renaming, PS.showText
const PS=window.JEPI_UI.flow.plans.ps;
// ---------- demo sandbox ----------
// The sandbox itself (copy aside on entering, put back on leaving or on the next launch) is in app/data/demo.ts
// and has already run before this script. DEMO.on is true while the demo is open.
const DEMO=JD.demo.DEMO;
// ---------- extra side panels ----------
// A feature adds a panel with: PANELS.name={render(){…}}  plus  <div id="side-name" hidden> in body.html.
// Opening it: any button with data-tab="name". It is shown under the 더보기 tab.
const PANELS={};
// Features that ride on the account sync: run after every push / pull (310-sync.js)
const SYNC_AFTER_PUSH=[], SYNC_AFTER_PULL=[];
// Little extras drawn by features: on a timeline block, a place card, and the block sheet.
// Each function returns a piece (or a list of pieces, or nothing); React draws them: app/screens/Extras.tsx
//   {k:'badge',t,title} {k:'want',pid,on,n,who} {k:'tag',cls,t} {k:'wantRow',want,by} {k:'alert',on,hint} {k:'memo',key,value}
const BLOCK_BADGES=[], CARD_EXTRAS=[], SHEET_EXTRAS=[];
const extras=(list,...a)=>list.flatMap(f=>{try{const r=f(...a);return r?[].concat(r):[]}catch(_){return []}});
const WD=['일','월','화','수','목','금','토'];
DY.loc={};
// the destination's lists (app/data/places.ts — the same objects, filled again when a destination opens; tokyo.ts until then)
const PLC=JD.places, PK=PLC.state;
const AREAS=PLC.AREAS, CATS=PLC.CATS, P=PLC.P, PM=PLC.PM;
DY.locArea={};
DY.locZone={};
const dayStart=JD.days.dayStart;   // app/data/days.ts
DY.gmpBy=360; // when to be at the home airport, from the profile
const durTxt=JD.logic.time.durTxt;   // app/logic/time.ts
DY.days=[];
const costOf=PLC.costOf;
const DEFAULT_KW=[];
const tagsOf=PLC.tagsOf;
const norm=JD.logic.places.norm;   // app/logic/places.ts
const yen=TV.yen;   // app/data/traveler.ts
const DEFAULT=[];
// ---------- profile: trip facts entered by the viewer ----------
const PROFILE_EXAMPLE=JD.plans.PROFILE_EXAMPLE;   // app/data/plans.ts
const clone=o=>JSON.parse(JSON.stringify(o));
// dates, tidying 여행 정보 and making the days with their fixed blocks: app/data/days.ts (the days themselves: DY.days …)
const fixProfile=JD.days.fixProfile, buildDays=JD.days.buildDays;

// ---------- forms shared by onboarding and the "내 정보" tab ----------
// What is typed, 처음 설정's steps, the buttons, saving and reading a pasted booking: app/flow/forms.ts. What it still
// needs from the old code is connected here (each one looked up when it runs).
const FORMS=window.JEPI_UI.view.forms, FFLOW=window.JEPI_UI.flow.forms;
const optsOf=FORMS.optsOf, partParty=FORMS.party;
FFLOW.connect({partJP:()=>partJP(),partTalk:p=>partTalk(p),partDest:p=>partDest(p),setSt:(id,t)=>setSt(id,t),progStart:(id,t,b,l)=>progStart(id,t,b,l),progStop:id=>progStop(id),
  setBusy:on=>setBusy(on),keysChanged:()=>keysChanged(),setJP:(m,q)=>setJP(m,q),quickStart:()=>quickStart(),talkSend:(t,o)=>talkSend(t,o),talkReset:()=>talkReset(),
  recommendDest:m=>recommendDest(m),genPack:(d,b)=>genPack(d,b),morePlaces:(n,id,f,sig)=>morePlaces(n,id,f,sig),genSeason:(id,sig)=>genSeason(id,sig),autoSave:()=>autoSave(),
  renderMeRows:()=>renderMeRows(),renderTasteStyle:()=>renderTasteStyle(),meSetMsg:m=>meSetMsg(m),meSetBudgetHint:h=>meSetBudgetHint(h),openHelper:s=>openHelper(s),
  needBooking:()=>needBooking(),maybeCoach:()=>maybeCoach(),onbAdvance:()=>onbAdvance(),demoEnter:()=>demoEnter(),krAir:()=>KR_AIR});
const pasteBox=FFLOW.pasteBox, isoPlus=FFLOW.isoPlus, openOnb=FFLOW.openOnb, onbFrame=FFLOW.onbFrame, onbFrameAct=FFLOW.onbFrameAct, renderOnb=FFLOW.renderOnb, commitProfile=FFLOW.commitProfile, finishOnb=FFLOW.finishOnb, renderMe=FFLOW.renderMe, rerenderForm=FFLOW.rerenderForm, formAct=FFLOW.formAct, onPf=FFLOW.onPf;
// ---------- blocks the viewer makes by hand ----------
const addCustomToData=PLC.addCustom;   // app/data/places.ts
let customLast=null;
function openCustom(editId,startAt,opts){
  const c=editId?CUR.custom.find(x=>x.id===editId):{id:'',name:'',area:firstArea(),cat:'walk',dur:60,cost:0,memo:'',drop:false,tags:''}; if(!c) return;
  const st=startAt!=null?startAt:Math.max(dayStart(UI.day),600);
  // drawn by React: app/screens/CustomSheet.tsx (the same props again with dup while a new name is typed: 388-dedup.js)
  customLast={edit:editId||'',dayLabel:`Day ${UI.day+1} (${DY.days[UI.day].date})`,name:c.name||'',area:c.area,cat:c.cat,dur:c.dur,cost:c.cost??'',memo:c.memo||'',tags:c.tags||'',drop:!!c.drop,
    share:RS.status==='on'&&!PK.pack.manual?!!c.share:null,start:fmt(st),areas:optsOf(AREAS),cats:Object.entries(CATS),durs:[15,30,45,60,90,120,150,180,240].map(m=>[m,durTxt(m)]),
    currency:String(PK.pack.currency),dup:null,card:!!(opts&&opts.card),rev:RENDER.nextSheetRev()};
  window.JEPI_UI.mount('custom',$('#sheet'),customLast);
  $('#sheet').dataset.uid=''; $('#sheetBg').hidden=false; setTimeout(()=>{const x=$('#cfName');x&&x.focus()},0);
}
function saveCustomForm(f){
  const editId=f.dataset.edit;
  const c={id:editId||('c'+Date.now().toString(36)),name:$('#cfName').value.trim()||'직접 만든 블록',area:$('#cfArea').value,cat:$('#cfCat').value,dur:+$('#cfDur').value||60,cost:Math.max(0,+$('#cfCost').value||0),memo:$('#cfMemo').value.trim(),tags:$('#cfTags').value.trim(),drop:$('#cfDrop').checked,share:!!($('#cfShare')&&$('#cfShare').checked)};
  TRIP.customs.put(c); addCustomToData(c);
  const asCard=f.dataset.card==='1';
  if(asCard){if(!isWish(c.id))toggleWish(c.id);showToast('내 카드에 담았어요')}
  else if(!editId){const st=parse($('#cfStart').value);TRIP.blocks.add({id:c.id,day:UI.day,start:Math.max(dayStart(UI.day),Math.min(1410,st??600)),dur:c.dur})}
  {const prev=editId?(CUR.custom.find(x=>x.id===c.id)||{}):{};if(RS.status==='on'&&(c.share||prev.share!==undefined))shareCustom(c,c.share)}
  closeSheet(); renderAll();
}

// ---------- talk to Claude to change the schedule ----------
// the chat, the dock, the nudges, the header's trip line and ✨ 빈 시간 채우기: app/flow/chat.ts
const CHAT=window.JEPI_UI.flow.chat;
CHAT.connect({openFind:o=>openFind(o),fixWarns:()=>fixWarns(),openHelper:s=>openHelper(s),openCustom:(id,st)=>openCustom(id,st),addCustomToData:c=>addCustomToData(c),
  hero:p=>hero(p),renderMe:()=>renderMe(),needBooking:()=>needBooking(),dupOf:p=>dupOf(p),renderExt:()=>renderExt()});
const dock=CHAT.dock, dockAct=CHAT.dockAct, renderChat=CHAT.renderChat, sendChat=CHAT.sendChat, renderNudges=CHAT.renderNudges, goMe=CHAT.goMe, renderMeta=CHAT.renderMeta,
  chatFoldSync=CHAT.chatFoldSync, chatAct=CHAT.chatAct, askAI=CHAT.askAI;
// ---------- destination pack: everything that depends on where the trip goes ----------
// The destination's places and the lists made from them (AREAS, PM …), loading one (loadPack) and checking what the AI
// sends (cleanPack / cleanPlace) live in app/data/places.ts; the open destination is PK.pack.
PK.pack=null;
const wipe=o=>{for(const k of Object.keys(o)) delete o[k]};
const firstArea=PLC.firstArea, nearestArea=PLC.nearestArea, addPackPlace=PLC.addPackPlace, loadPack=PLC.loadPack, savePack=PLC.savePack, packFrom=PLC.packFrom, manualPack=PLC.manualPack, cleanPack=PLC.cleanPack, cleanPlace=PLC.cleanPlace;
// after a destination is loaded: other travelers' 👍 places of that city (070-shared-recs.js)
PLC.connectPlaces(pk=>{if(RS.status!=='off'){SHARED_IDS.clear();rebuildShared()}});
// status lines ("…하는 중이에요 · 12초 지났어요"), messages and error words: app/ui/status.ts
const STATUS=window.JEPI_UI.status, progStart=STATUS.progStart, progStop=STATUS.progStop, setSt=STATUS.setSt, errText=STATUS.errText;
// getting a destination ready, more places, 처음 설정's 다음, 여행지 찾기, 이야기하면서 정하기: app/flow/destination.ts
const DEST=window.JEPI_UI.flow.destination;
DEST.connect({fresh:()=>FRESH,clearUndo:()=>{CS.undoSnap=null},autoSave:()=>autoSave(),standalone:()=>!!STANDALONE,keyHelp:()=>KEY_HELP,inClaude:()=>inClaude()});
const genPack=DEST.genPack, morePlaces=DEST.morePlaces, setBusy=DEST.setBusy, onbAdvance=DEST.onbAdvance, partDest=DEST.partDest, recommendDest=DEST.recommendDest, talkReset=DEST.talkReset, partJP=DEST.partJP, partTalk=DEST.partTalk, talkSend=DEST.talkSend;
// ---------- demo trip: a generic first-timer's Osaka, 3 nights / 4 days ----------
// Used only by "데모 둘러보기" (see 381-welcome-demo.js). No personal taste in here on purpose.
// hours: [open, close] in minutes from midnight · closed: weekdays (0 = Sunday) · cost: [yen per person, note]
// the demo trip's data: app/data/demo-osaka.ts
const demoOsaka=JD.demoOsaka.demoOsaka;
// ---------- 👍 여행자 추천 (app/data/recs.ts: loading, counting, saving on the server) ----------
// Here: how a place becomes a saved entry, and how other travelers' places join this trip's place list.
const REC=JD.recs, RS=REC.state;
const SHARED_IDS=new Set();
const cityKey=()=>REC.cityKey(PK.pack.city||'');
const placeKey=p=>REC.placeKey(PK.pack.city||'',p.name);
function recHash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(36)}
function entryOf(p){const h=p.always?null:p.hours;
  return {k:placeKey(p),city:cityKey(),name:p.name,local:p.local||'',cat:p.cat,area:p.area,lat:+p.ll[0]||0,lng:+p.ll[1]||0,dur:p.dur,
    open:h?`${fmt(h[0])}-${fmt(h[1])}`:null,closed:p.closed||[],cost:costOf(p.id)[0]||0,note:String(p.note||'').slice(0,160),tags:tagsOf(p.id).slice(0,6),made:!!p.custom,at:Date.now()}}
function keepShared(){
  let ch=false;
  CUR.placed.forEach(b=>{const p=PM[b.id];if(p&&p.shared&&!PK.pack.places.some(x=>x.id===p.id)){const c=Object.assign({},p);delete c.shared;c.fromUsers=true;PK.pack.places.push(c);ch=true}});
  if(ch) savePack();
}
// other travelers' places of this city join the place list (and drop out again when no longer recommended or used)
function rebuildShared(){
  const used=new Set(CUR.placed.map(b=>b.id));
  for(const id of [...SHARED_IDS]){if(used.has(id)||PK.pack.places.some(x=>x.id===id))continue;const i=P.findIndex(p=>p.id===id);if(i>=0)P.splice(i,1);delete PM[id];SHARED_IDS.delete(id)}
  REC.others(PK.pack.city||'',new Set(P.map(placeKey))).forEach((e,k)=>{const id='s'+recHash(k);if(PM[id])return;
    const pl=cleanPlace({name:e.name,local:e.local,cat:e.cat,lat:e.lat,lng:e.lng,dur:e.dur,open:e.open,closed:e.closed,cost:e.cost,tags:e.tags,note:e.note||(e.made?'다른 여행자가 직접 올린 장소예요.':'다른 여행자가 추천한 장소예요.')});
    if(!pl)return; pl.id=id; pl.shared=true; pl.ai=false; pl.userMade=!!e.made; addPackPlace(pl); SHARED_IDS.add(id)});
}
async function recsFetch(){ if(await REC.fetchCity(PK.pack.city||'')){rebuildShared();renderTray()} }
// 👍 on a card or in a block's sheet: counts change right away, then once more when the server has answered
async function toggleRec(id){
  const p=PM[id]; if(!p) return;
  if(RS.status!=='on'){REC.toggle(PK.pack.city||'',entryOf(p));renderTray();return}   // only says "로그인하면 …"
  const pr=REC.toggle(PK.pack.city||'',entryOf(p)); rebuildShared();
  renderTray(); if(!$('#sheetBg').hidden&&$('#sheet').dataset.uid)openSheet($('#sheet').dataset.uid);
  await pr; renderTray();
}
// a place I made: shared with other travelers or not (its 공유 box)
function shareCustom(c,on){
  if(RS.status!=='on') return;
  const p=PM[c.id]; if(!p) return; const k=placeKey(p);
  const rest=RS.mine.filter(e=>e.k!==k), pr=REC.setMine(PK.pack.city||'',on?[...rest,entryOf(p)]:rest);
  rebuildShared(); pr.then(renderTray);
}
function initRecs(){ if(!PK.pack.manual) recsFetch().catch(()=>{}) }

// refresh everyone's 👍 along with the account sync (every minute while open)
SYNC_AFTER_PULL.push(()=>!PK.pack.manual?recsFetch().catch(()=>{}):null);
// (re)load when the trip's city changes, or every few minutes while browsing the 장소 tab
let recCity=null, recAt=0;
function recsMaybe(){
  if(PK.pack.manual||!cityKey()) return;
  if(cityKey()===recCity&&Date.now()-recAt<180000) return;
  recCity=cityKey(); recAt=Date.now(); recsFetch().catch(()=>{recCity=null});
}
// ---------- small to-dos attached to blocks (luggage, waiting lists, pick-ups, rentals, cash, tax refund) ----------
// marks, their pairs and warnings, and the sheet's 할 일 표시 box: app/data/marks.ts
const MK=JD.marks, MARKS=MK.MARKS, PAIRS=MK.PAIRS;
CUR.fmarks=null;
const toggleMark=(uid,m)=>TRIP.toggleMark(uid,m);   // app/data/trip.ts
function makePairBlock(uid,T){
  const it=dayItems(UI.day).find(x=>x.uid===uid); if(!it) return;
  // put the closing block before the next block that needs it (lodging, airport) or late in the day
  const d=UI.day; let start;
  const nx=dayItems(d).find(x=>x.start>it.end&&x.kind==='fixed'&&(x.uid==='f7'||/^ci|^co|^ev/.test(x.uid)));
  if(T==='wait') start=it.end+60;
  else if(nx) start=nx.start-PAIRS[T].dur-30;
  else start=Math.min(1350,Math.max(it.end+60,1230));
  start=Math.max(dayStart(d),Math.min(1410,Math.round(start/15)*15));
  const c={id:'c'+Date.now().toString(36),name:`${PAIRS[T].pair} · ${it.name.replace(/ \(.*\)$/,'')}`.slice(0,40),area:nearestArea(it.ll)||firstArea(),cat:T==='wait'?'food':'trip',dur:PAIRS[T].dur,cost:0,memo:`${it.name}에서 시작한 일을 마무리해요.`,tags:'',drop:false,ll:it.ll};
  TRIP.customs.put(c); addCustomToData(c);
  TRIP.blocks.add({id:c.id,day:d,start,dur:c.dur,mk:[T+'-']});
  UI.day=d; closeSheet(); renderAll();
}

// ---------- check AI changes before showing them: simulate, nudge times, report what is left ----------
// The changes themselves (apply, try out on a copy, nudge times) live in app/data/ops.ts; it asks here for the day's warnings.
const OPS=JD.ops;
OPS.connectOps({dayStart:d=>dayStart(d),days:()=>DY.days.length,items:d=>analyze(d).items,fresh:id=>FRESH.add(id)});
const applyOpsCore=OPS.apply, repairOps=OPS.repair;
// ---------- booking helper: wish list → where to stay → flight times → search links ----------
CUR.wish=[];
const isWish=id=>TRIP.wish.has(id), toggleWish=id=>TRIP.wish.toggle(id);   // app/data/trip.ts
// the 예약 도우미 (frame, steps, AI answers in it): app/flow/helper.ts — its state is HS (app/flow/helper.ts hs)
const HELP=window.JEPI_UI.flow.helper;
HELP.connect({maybeCoach:()=>maybeCoach(),renderMe:()=>renderMe()});
const needBooking=HELP.needBooking, helperAct=HELP.helperAct, helperOpen=HELP.helperOpen, helperFrameAct=HELP.helperFrameAct, openHelper=HELP.openHelper,
  closeHelper=HELP.closeHelper, renderHelper=HELP.renderHelper, genSeason=HELP.genSeason, seasonInfo=HELP.seasonInfo, helperShow=HELP.helperShow, drawHelperFrame=HELP.drawHelperFrame;
// ---------- optional travel style (every item defaults to "doesn't matter") ----------
const STYLE_ROWS=JD.days.STYLE_ROWS;   // app/data/days.ts

// ---------- optional money budget (per person, in 만원) ----------
const budgetParts=TV.budgetParts;   // app/data/traveler.ts

// ---------- J / P modes ----------
function setJP(m,quiet){UI.jp=m==='P'?'P':'J';dock({placeholder:UI.jp==='P'?'뭐 하고 싶어요? 말로 해도 돼요':'AI에게 말로 부탁하기'});document.body.classList.toggle('mode-p',UI.jp==='P');hero({jp:UI.jp});if(!quiet)store.set('gp.jp',UI.jp)}

// ---------- one-day course ----------
// 하루 코스: 여행지 + 언제·어디서 만나요 + 누구와 (drawn by React: TripForms.tsx)
function partsDay(p){const m=p.meet||{};
  return [partDest(p),{f:'day',date:p.dateSet!==false?String(p.startDate??''):'',time:m.time||'11:00',end:m.end||'20:00',area:m.area,areas:optsOf(AREAS)},partParty(p)]}

// ---------- DICE: roll for an empty slot ----------
// what the 🎲 sheet shows and where the dice can land: app/view/dice.ts (the rolls and choices stay here)
const DICEV=window.JEPI_UI.view.dice;
// the 🎲 sheet and the P모드 board (rolling, 이걸로, 코스): app/flow/dice.ts — the rolls and choices live there (DFLOW.st)
const DFLOW=window.JEPI_UI.flow.dice, dice=DFLOW.st.dice, eat=DFLOW.st.eat;
DFLOW.connect({morePlaces:(n,id,f,sig)=>morePlaces(n,id,f,sig),fresh:()=>FRESH,setSt:(id,t)=>setSt(id,t),toast:m=>showToast(m),renderSettings:()=>renderSettings(),
  diceOpenAnim:()=>diceOpenAnim(),saveCourse:()=>saveCourse(),keyBad:()=>keyBad,demoOn:()=>!!DEMO.on});
const openDiceTab=DFLOW.openDiceTab, diceFromUrl=DFLOW.diceFromUrl, diceAct=DFLOW.diceAct, renderPView=DFLOW.renderPView, pPlaceNow=DFLOW.pPlaceNow, pAIRec=DFLOW.pAIRec, pviewAct=DFLOW.pviewAct;
// ---------- quick start (P, and any one-day course): a few taps ----------
const nextSat=()=>{const d=new Date();const add=(6-d.getDay()+7)%7||7;return isoPlus(d.getDay()===6?0:add)};
// what P모드 and the 가볍게 시작 form show: app/view/pview.ts (the drawn card and the chosen die stay here)
const PVIEW=window.JEPI_UI.view.pview, SLOTS=PVIEW.SLOTS;
async function quickStart(){
  const q=FS.draft.q||{}, dest=String(FS.draft.dest||'').trim();
  if(!dest){setSt('st_pack','어디로 갈지 적어 주세요.');return}
  if(!q.when||(q.when==='pick'&&FS.draft.dateSet===false)){setSt('st_pack','언제 갈지 골라 주세요.');return}
  if(q.len===''||q.len==null){setSt('st_pack','얼마나 갈지 골라 주세요.');return}
  if(q.when!=='pick'){FS.draft.startDate=q.when==='today'?isoPlus(0):q.when==='tomorrow'?isoPlus(1):nextSat();}
  FS.draft.dateSet=true; FS.draft.dateUnknown=false; FS.draft.nightsSet=true;
  if(q.len==='0'){const sl=SLOTS.find(s=>s[0]===q.slot)||SLOTS[1];let st=sl[2];
    if(q.when==='today'){const n=new Date(),now=n.getHours()*60+n.getMinutes();if(now+30>st)st=Math.min(1320,Math.ceil((now+30)/30)*30)}
    FS.draft.kind='day'; FS.draft.meet=Object.assign({},FS.draft.meet||{},{time:fmt(st),end:fmt(Math.max(st+180,sl[3]))});}
  else{FS.draft.kind='trip'; FS.draft.nights=+q.len; FS.draft.bookedFlight=true; FS.draft.bookedStay=true; FS.draft.flightSet=false; FS.draft.staySet=false;}
  if(norm(dest)!==norm(PK.pack.city)){
    if(UI.sample){if(!(await genPack(dest,'quickStart')))return}
    else{CUR.custom=[];TRIP.save('custom',CUR.custom);CUR.placed=[];save();loadPack(manualPack(dest));savePack()}
  }
  FS.draft.dest=PK.pack.city; if(FS.draft.kind==='day'&&!AREAS[FS.draft.meet.area]) FS.draft.meet.area=firstArea();
  await finishOnb();
}
// ---------- P view: the day as a board game (drawn by React: app/screens/PView.tsx) ----------
// ---------- my plans: several saved plans, account sync, sharing ----------
const PLANS=JD.plans;   // a plan's name, contents and text: app/data/plans.ts
PL.plans=[]; PL.curPlan='';
const planName=PLANS.planName;   // app/data/plans.ts
// switching, making, copying, deleting, renaming plans; opening one; 카톡용 글, files, backups, share links: app/flow/plans.ts
const PLF=window.JEPI_UI.flow.plans;
PLF.connect({addCustomToData:c=>addCustomToData(c),setJP:(m,q)=>setJP(m,q),carryTaste:(a,b)=>carryTaste(a,b),shareLink:n=>shareLink(n),openShared:()=>openShared(),
  lastLink:()=>SHARE.lastLinkOf(),importAll:v=>importAll(v),standalone:()=>!!STANDALONE,renderPlanBtn:()=>renderPlanBtn()});
const savePlans=PLF.savePlans, snapshotCurrent=PLF.snapshotCurrent, touchPlan=PLF.touchPlan, applyPlanData=PLF.applyPlanData, openPlan=PLF.openPlan, newPlan=PLF.newPlan,
  openCode=PLF.openCode, inClaude=PLF.inClaude, downloadText=PLF.downloadText, importBackup=PLF.importBackup, copyText=PLF.copyText, plansAct=PLF.plansAct, renderPlans=PLF.renderPlans;
// ================= JEPI standalone: AI keys, model router, routes, map, panels =================
const STANDALONE=!(window.claude&&window.claude.use);
const LS=JD.storage; // saved data on this device: app/data/storage.ts
JD.keys.load(); const KEYS=JD.keys.list;   // app/data/keys.ts (the same object, changed in place)
const KEY_DEF={
  anthropic:{name:'Claude',sub:'일정 짜기·대화·여행지 준비 (필수)',ph:'sk-ant-...',re:/^sk-ant-/},
  gemini:{name:'Gemini',sub:'가벼운 작업용 (선택 · 넣으면 비용이 줄어요)',ph:'AIza...',re:/^AIza/},
  gmaps:{name:'Google 지도',sub:'해외 경로 · 영업시간',ph:'AIza...',re:/^AIza/},
  kakao:{name:'카카오 지도',sub:'국내 장소·주소 검색 (REST API 키)',ph:'32자리 영문·숫자',re:/^[0-9a-f]{32}$/i}
};
const MODELS=Object.assign({heavy:'claude-sonnet-5-5',light:'claude-haiku-5-5',gemini:'gemini-3.6-flash'},LS.get('jepi.models',{})||{});
let keyMsg={}, keyBad={};
function saveKeys(quiet){JD.keys.save(quiet);if(!quiet&&typeof syncSoon==='function')syncSoon()}
const maskKey=k=>k?k.slice(0,6)+'••••••'+k.slice(-4):'';
function aiErr(code,msg,text){return JD.appError(code,msg,text)}
// The AI connection (calling Claude / Gemini, retries, switching to the other AI) lives in app/data/ai.ts.
let aiWho='AI';
JD.ai.connectAI({keys:()=>KEYS,models:()=>MODELS,bad:()=>keyBad,who:n=>{aiWho=n}});
const callClaude=JD.ai.callClaude, callGemini=JD.ai.callGemini, makeSample=JD.ai.makeSample;
async function testKey(k){
  keyMsg[k]='확인 중…'; renderSettings();
  try{
    if(k==='anthropic'){await callClaude('Reply with only this JSON: {"ok":true}',MODELS.light);}
    else if(k==='gemini'){await callGemini('Reply with only this JSON: {"ok":true}');}
    else if(k==='gmaps'){const v=await fetchRoute({m:'walk',a:[35.6812,139.7671],b:[35.6852,139.7528],pv:'google'});if(!v)throw aiErr('upstream_error','경로를 받지 못했어요');}
    else if(k==='kakao'){keyMsg[k]=await kakaoDiag();keyBad.kakao=!/^✓/.test(keyMsg[k]);renderSettings();return}
    keyMsg[k]='✓ 연결됐어요';
    if(k==='gmaps')keyBad.google=false; else keyBad[k]=false;
  }catch(e){if(k==='gmaps')keyBad.google=true;else keyBad[k]=true;
    keyMsg[k]=e.code==='not_granted'?'✕ 키가 맞지 않거나 이 API가 꺼져 있어요. 다시 확인해 주세요.':e.code==='network'?'✕ 응답을 받지 못했어요. 키 제한(웹사이트 주소)과 API 사용 설정을 확인해 주세요.':'✕ '+(e.message||'연결하지 못했어요')}
  renderSettings();
}

async function kakaoDiag(){
  // Kakao gives place search to outside apps, not walking / transit routes: check the search
  let r;
  try{r=await fetch('https://dapi.kakao.com/v2/local/search/keyword.json?query='+encodeURIComponent('서울역')+'&size=1',{headers:{Authorization:'KakaoAK '+KEYS.kakao}})}
  catch(_){return `✕ 카카오가 이 주소(${ORIGIN})의 요청을 막았어요. 카카오 디벨로퍼스 → 내 앱 → 플랫폼 → Web에 ${ORIGIN} 를 정확히(끝에 / 없이) 등록했는지 확인해 주세요. 바꾼 뒤 몇 분 지나 다시 "확인"을 눌러 주세요.`}
  let j={};try{j=await r.json()}catch(_){}
  const c=j.code!=null?` (code ${j.code})`:'';
  if(r.status===401)return `✕ 키가 맞지 않아요. JavaScript 키가 아니라 REST API 키를 넣어 주세요.${c}`;
  if(r.status===403)return `✕ 이 키로 장소 검색을 쓸 수 없어요. 내 앱 → 제품 설정에서 카카오맵을 ON으로 바꿔 주세요.${c}`;
  if(!r.ok)return `✕ 카카오 오류 (HTTP ${r.status})${c} ${j.msg||j.message||''}`.trim();
  return '✓ 장소·주소 검색 연결됨 · 국내 이동 시간은 거리로 어림하고, "안내 시작"은 카카오맵으로 열어요';
}
function keysChanged(){saveKeys();keyBad={};if(STANDALONE){UI.sample=makeSample()}renderAll();renderSettings();if(!$('#onb').hidden)renderOnb()}

const blankPack=PLC.blankPack;   // app/data/places.ts
// ---------- routes: Google Routes (abroad), cached on this device ----------
// Asking, the queue and the cache live in app/data/routes.ts; Korea checks and "안내 시작" links in app/logic/geo.ts.
// Here: the names the rest of the old code uses, and when to redraw after routes arrive.
const inKR=JD.logic.geo.inKorea, navLink=JD.logic.geo.navLink;
const routeProvider=(a,b)=>JD.routes.provider(a,b), fetchRoute=j=>JD.routes.fetchRoute(j), routeStats=JD.routes.stats;
JD.routes.connectRoutes({googleKey:()=>KEYS.gmaps||'',googleBad:()=>!!keyBad.gmaps,arrived:()=>routeDirty(),
  keyBroken(){keyBad.google=true;keyMsg.gmaps='✕ 키가 맞지 않거나 이 API가 켜져 있지 않아요'}});
let rdT=0;
function routeDirty(){clearTimeout(rdT);rdT=setTimeout(()=>{
  const ae=document.activeElement; if(ae&&/^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)){routeDirty();return}
  if(!$('#onb').hidden||!$('#sheetBg').hidden){routeDirty();return}
  renderAll(); if(mapState.on) drawMap();
},600)}
// ---------- map: app/ui/map.ts (Leaflet, loaded only when opened) ----------
const MAP=window.JEPI_UI.map, mapState=MAP.state, mapTop=MAP.mapTop, mapTopAct=MAP.mapTopAct, openMap=MAP.openMap, drawMap=MAP.drawMap, renderMapCards=MAP.renderMapCards;
// ---------- 더보기: trip summary, 준비하기 badge, P-mode short menu ----------
let autoT=0;
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
    full:UI.jp!=='P'||FS.moreAll,showToggle:UI.jp==='P',moreAll:FS.moreAll,plansCount:PL.plans.length,
    friendsChip:sp?'👥 '+(((TRIPS&&TRIPS.members[PL.curPlan])||[]).length||'공유 중'):null,
    notifyOn:!!(NOTIFY&&NOTIFY.on),aiOff:!!(STANDALONE&&!UI.sample)});
  tabs({warn:w?String(w):''});
}
// 이번 여행: one row per topic, opens only that part, saves on change
const meRows=p=>FORMS.meRows(p,{dest:partDest,day:partsDay,homeBox:partHomeBox,paste:pasteBox});   // app/view/forms.ts
// Drawn by React: app/screens/MeRows.tsx. meSetMsg changes only the message (the open form stays as it is).
let meRev=0, meLast=null;
function renderMeRows(){
  if(!FS.draft) FS.draft=clone(CUR.profile); fixProfile(FS.draft);
  const rows=meRows(FS.draft), op=rows.find(r=>r[0]===FS.meOpen);
  meLast={rows:rows.map(([id,k,v])=>({id,label:k,valueHTML:v})),open:op?FS.meOpen:null,body:op?op[3]():[],msg:FS.autoMsg||'',dayCourse:CUR.profile.kind==='day',rev:++meRev};
  window.JEPI_UI.mount('me',$('#meBox'),meLast);
}
function meSetBudgetHint(h){if(!meLast||!$('#meBox'))return;meLast=Object.assign({},meLast,{body:meLast.body.map(x=>x.f==='budget'?Object.assign({},x,{hint:h}):x)});window.JEPI_UI.mount('me',$('#meBox'),meLast)}
function meSetMsg(m){if(!meLast||!$('#meBox')){return}meLast=Object.assign({},meLast,{msg:m});window.JEPI_UI.mount('me',$('#meBox'),meLast)}
function autoSave(){clearTimeout(autoT);autoT=setTimeout(()=>{if(!FS.draft||!$('#onb').hidden)return;
  const prevDest=CUR.profile.dest;commitProfile(FS.draft);if(prevDest!==CUR.profile.dest)FS.draft.dest=CUR.profile.dest;
  FS.autoMsg='✓ 자동 저장됨 · 일정표에 바로 반영돼요';renderAll();meSetMsg(FS.autoMsg)},500)}
// taste: style rows + keywords + wishes (carried into new plans). The style rows are drawn by React: app/screens/TasteStyle.tsx
const TASTE_KEYS=['pace','social','breakfast','style'];
function carryTaste(from,to){TASTE_KEYS.forEach(k=>{if(from&&from[k]!==undefined)to[k]=clone(from[k])})}
let tasteRev=0;
function renderTasteStyle(){const el=$('#tasteStyle');if(!el)return;if(!FS.draft)FS.draft=clone(CUR.profile);fixProfile(FS.draft);const p=FS.draft;
  window.JEPI_UI.mount('tasteStyle',el,{purpose:p.purpose??'',pace:p.pace,solo:p.party.type==='solo',social:p.social,breakfast:p.breakfast,
    rows:STYLE_ROWS,style:clone(p.style||{}),open:FS.styleOpen,msg:FS.autoMsg||'',rev:++tasteRev})}

// ---------- settings ----------
let themePref=LS.get('jepi.theme','light');
function applyTheme(){const r=document.documentElement;if(themePref==='system')r.removeAttribute('data-theme');else r.setAttribute('data-theme',themePref);
  const m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',getComputedStyle(document.body).getPropertyValue('--paper').trim()||'#f2f4f1')}
const ORIGIN=String(location.origin||'').replace(/[<>"&']/g,'');
const KEY_HELP={
  anthropic:`<ol><li><a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener">console.anthropic.com</a>에 로그인해요.</li><li>Billing에서 크레딧을 충전해요 (5달러면 개인 여행에 충분해요).</li><li>API Keys → Create Key → 만든 키를 복사해서 여기에 붙여 넣어요.</li></ol>`,
  gemini:`<ol><li><a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">Google AI Studio</a>에서 Create API key를 눌러요.</li><li>만든 키를 붙여 넣어요. 무료 한도 안에서 가벼운 작업을 맡아요.</li></ol>`,
  gmaps:`<ol><li><a href="https://console.cloud.google.com/google/maps-apis/start" target="_blank" rel="noopener">Google Cloud 콘솔</a>에서 결제 계정을 연결해요 (무료 한도 안이면 청구되지 않아요).</li><li>API 및 서비스 → 라이브러리에서 <b>Routes API</b>와 <b>Places API (New)</b>를 사용 설정해요 (Places는 영업시간 확인용).</li><li>사용자 인증 정보 → API 키 만들기 → <b>애플리케이션 제한: 웹사이트</b>에 <code>${ORIGIN}/*</code>를 넣고, API 제한은 Routes API와 Places API (New) 두 개만 골라요.</li><li>할당량에서 하루 요청 수 상한(예: 500)을 걸어 두면 안전해요.</li></ol>`,
  kakao:`<ol><li><a href="https://developers.kakao.com/console/app" target="_blank" rel="noopener">카카오 디벨로퍼스</a>에서 애플리케이션을 추가해요.</li><li>플랫폼 → Web에 <code>${ORIGIN}</code>를 등록해요.</li><li>제품 설정에서 <b>카카오맵</b>을 활성화해요.</li><li>앱 키의 <b>REST API 키</b>를 복사해서 붙여 넣어요.</li></ol>`
};
let keyEdit=null;
const isBad=k=>!!keyBad[k==='gmaps'?'google':k];
// The frame is drawn by React: app/screens/SettingsScreen.tsx. The parts below are still old HTML.
let settingsRev=0;
// AI·지도 연결 is drawn by React: app/screens/AiKeysSection.tsx. Only the masked keys go there.
function settingsAI(){return {standalone:!!STANDALONE,editing:keyEdit,hasGemini:!!KEYS.gemini,routesOk:+routeStats.ok||0,
  models:{heavy:MODELS.heavy,light:MODELS.light,gemini:MODELS.gemini},
  hours:KEYS.gmaps?{use:+hoursUse(),cap:HOURS_CAP,off:JD.hours.state.off||''}:null,
  keys:Object.keys(KEY_DEF).map(k=>{const d=KEY_DEF[k];return {k,name:d.name,sub:d.sub,ph:d.ph,masked:KEYS[k]?maskKey(KEYS[k]):'',bad:isBad(k),msg:keyMsg[k]||'',helpHTML:KEY_HELP[k]}})}}
// What was pressed in 설정 (SettingsScreen.tsx / AiKeysSection.tsx tell: its name and value; a typed key comes as v2)
function settingsAct(n,v,v2){
  switch(n){
  case 'theme': themePref=v;LS.set('jepi.theme',themePref);applyTheme();renderSettings();if(mapState.on)drawMap();return;
  case 'zoom': setZoom(+v);if(UI.tab==='settings')renderSettings();return;
  case 'keyedit': keyEdit=v;keyMsg[keyEdit]='';renderSettings();return;   // its box opens, with the cursor in it
  case 'keycancel': keyEdit=null;renderSettings();return;
  case 'keysave': {const k=v,key=String(v2||'').trim().replace(/\s+/g,'');
    if(!key){keyMsg[k]='키를 붙여 넣어 주세요.';renderSettings();return}
    if(KEY_DEF[k].re&&!KEY_DEF[k].re.test(key)){keyMsg[k]=`${KEY_DEF[k].name} 키 형식이 아닌 것 같아요. 그래도 저장했으니 "확인"을 눌러 보세요.`}
    else keyMsg[k]='';
    KEYS[k]=key;keyEdit=null;keysChanged();testKey(k);return}
  case 'keydel': delete KEYS[v];keyMsg[v]='삭제했어요.';keysChanged();return;
  case 'keytest': testKey(v);return;
  case 'models': {const m=v2||{};MODELS.heavy=String(m.heavy||'').trim()||'claude-sonnet-5-5';MODELS.light=String(m.light||'').trim()||'claude-haiku-5-5';MODELS.gemini=String(m.gemini||'').trim()||'gemini-3.6-flash';LS.set('jepi.models',{heavy:MODELS.heavy,light:MODELS.light,gemini:MODELS.gemini});keysChanged();return}
  case 'backup': backupAll();return;
  case 'wipe': if(!wipeArm){wipeArm=true;renderSettings();return}wipeAll();return;
  case 'wipecancel': wipeArm=false;renderSettings();return;
  }
}
function renderSettings(){
  const el=$('#setBox'); if(!el) return;
  window.JEPI_UI.mount('settings',el,{theme:themePref,zoom:store.get('gp.zoom',60),sync:syncView(),myPlaces:mypView(),ai:settingsAI(),
    wipeArm:!!wipeArm,host:location.host||'로컬',rev:++settingsRev});
}
function backupAll(){
  snapshotCurrent();
  const all={jepi:2,at:new Date().toISOString(),cur:PL.curPlan,kw:CUR.kws,plans:PL.plans.map(p=>({meta:p,data:TRIP.plans.get(p.id)})).filter(x=>x.data)};
  const d=new Date(), nm=`JEPI-백업-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}.json`;
  downloadText(nm,JSON.stringify(all));
}
function importAll(v){
  if(!v||v.jepi!==2||!Array.isArray(v.plans)) return false;
  snapshotCurrent(); let n=0;
  v.plans.forEach(x=>{if(!x||!x.meta||!x.data)return;const ex=PL.plans.find(p=>p.id===x.meta.id);TRIP.plans.put(x.meta.id,x.data);if(ex)Object.assign(ex,x.meta);else PL.plans.push(Object.assign({},x.meta));n++});
  if(Array.isArray(v.kw)&&v.kw.length){CUR.kws=[...new Set([...CUR.kws,...v.kw])];saveKw&&saveKw()}
  PL.plans.sort((a,b)=>(b.updated||0)-(a.updated||0)); savePlans();
  const target=PL.plans.find(p=>p.id===v.cur)||PL.plans[0]; if(target&&target.id!==PL.curPlan){PL.curPlan='';openPlan(target.id)}
  PS.msg=`계획 ${n}개를 불러왔어요.`; renderPlans(); return true;
}

// ---------- share link (no server): the plan travels inside the link ----------
// making and opening share links, and the short message at the bottom (showToast): app/flow/share.ts
const SHARE=window.JEPI_UI.flow.share;
SHARE.connect({openNotebook:()=>openNotebook()});
const shareLink=SHARE.shareLink, openShared=SHARE.openShared, showToast=SHARE.showToast;
// ---------- phase strip: before / during / after the trip ----------
const isoOf=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
function todayIdx(){const t=isoOf(new Date());return DY.days.findIndex(D=>D.iso===t)}
// drawn by React: app/screens/Phase.tsx
function renderPhase(){
  const el=$('#phase'); if(!el) return;
  const pr=CUR.profile, t=isoOf(new Date()), D0=DY.days[0], Dn=DY.days[DY.days.length-1];
  const show=v=>{window.JEPI_UI.mount('phase',el,v);el.hidden=v.s==='none'};
  // AI 꺼짐 now lives on the 더보기 → 설정 row only (tidy day screen)
  if(!D0||!D0.iso||pr.dateUnknown){show({s:'none'});return}
  const ti=todayIdx();
  if(ti>=0){
    const now=new Date(), nm=now.getHours()*60+now.getMinutes();
    const items=analyze(ti).items.filter(i=>!i.stay||i.start>=nm);
    const cur=items.find(i=>i.start<=nm&&nm<i.end), nx=items.find(i=>i.start>nm);
    let next=null;
    if(nx){const from=cur||[...items].reverse().find(i=>i.end<=nm)||null; const tr=from&&from.ll&&nx.ll?travel(from.ll,nx.ll):null;
      next={time:fmt(nx.start),name:String(nx.name),travel:tr?`${tr.real?'':'≈'}${tr.mode} ${tr.min}분`:'',nav:from&&from.ll&&nx.ll?navLink(from.ll,nx.ll,tr?tr.mode:'도보',nx.name):''}}
    show({s:'now',cur:cur?{name:String(cur.name),end:fmt(cur.end)}:null,next,todayDay:UI.day!==ti?ti:null});
  } else if(D0.iso>t){
    const dd=Math.round((new Date(D0.iso+'T00:00:00')-new Date(t+'T00:00:00'))/864e5);
    show({s:'before',dd,warns:warnTotal(),prepLeft:prepLeft(),miss:[pr.kind!=='day'&&pr.bookedFlight===false?'교통편 미정':'',pr.kind!=='day'&&pr.bookedStay===false?'숙소 미정':''].filter(Boolean)});
  } else if(Dn&&Dn.iso<t) show({s:'after'});
  else show({s:'none'});
}
// open the plan whose dates include today, then today's day, scrolled to now
function planCovers(id,t){const d=TRIP.plans.get(id);const p=d&&d.profile;if(!p||!p.startDate||p.dateUnknown)return false;
  const s=new Date(p.startDate+'T00:00:00'),e=new Date(s);e.setDate(e.getDate()+(p.kind==='day'?0:(+p.nights||0)));const x=new Date(t+'T00:00:00');return x>=s&&x<=e}
function startupFocus(){
  const t=isoOf(new Date());
  if(!(DY.days[0]&&DY.days[0].iso&&todayIdx()>=0)){const p=PL.plans.find(p=>p.id!==PL.curPlan&&planCovers(p.id,t));if(p){openPlan(p.id)}}
  const ti=todayIdx(); if(ti>=0){UI.day=ti;renderAll();
    setTimeout(()=>{const H=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hour'))||60;const g=$('#grid');if(!g)return;
      const now=new Date(), nm=now.getHours()*60+now.getMinutes(); const y=g.getBoundingClientRect().top+window.scrollY+Math.max(0,(nm-dayStart(UI.day))/60*H-140);window.scrollTo({top:y})},80)}
}
function renderPlanBtn(){const p=PL.plans.find(x=>x.id===PL.curPlan);hero({planName:(p&&p.name)||planName()})}
const inside=sel=>{const a=document.activeElement;return !!(a&&a.closest&&a.closest(sel))};
function renderExt(){renderPhase();renderMore();renderPlanBtn();
  if(UI.tab==='me'&&$('#onb').hidden&&!inside('#meBox'))renderMeRows();
  if(UI.tab==='pref'&&!inside('#tasteStyle'))renderTasteStyle();
  if(UI.tab==='settings'&&!inside('#setBox'))renderSettings();
  if(mapState.on){if(mapState.lastDay!==UI.day){mapState.lastDay=UI.day;drawMap(true)}else renderMapCards()}}
// events for the new panels (registered before the main handler; returns early only for its own controls)
document.addEventListener('click',e=>{
  const t=e.target.closest('button,a,label,input'); if(!t) return;
  if(t.id==='wishGo'){UI.cat='wish';UI.tab='tray';renderTray();renderTabs();return}
});
// a card under the map (MapCards in Dice.tsx): the map moves to that stop
const mapCardAct=MAP.mapCardAct;   // app/ui/map.ts
// autosave for 이번 여행 / 취향 panels
document.addEventListener('change',e=>{if(e.target.closest&&e.target.closest('#meBox,#tasteStyle')&&!e.target.classList.contains('importFile'))autoSave()});
// onboarding: connect AI right on the first screen


setInterval(()=>{try{const el=document.getElementById('aiSec');if(!el)return;const L=window.JEPI_UI.live(el),put=t=>{if(L)L.text(t);else el.textContent=t};   // AiBox.tsx draws it
  if(!UI.aiState||UI.aiState.status!=='loading'){put('');return}
  if(!UI.aiState.t0)UI.aiState.t0=Date.now();put(`${aiWho} · ${Math.round((Date.now()-UI.aiState.t0)/1000)}초째`)}catch(_){}},1000);

// ---------- AI-found places, chat folding ----------
// the places the AI just found (✨ 방금 찾은 곳), folding the chat, the places a chat message suggests: app/flow/chat.ts
const FRESH=CHAT.fresh;
// ================= 내 장소 (집·회사·…) — on this device and the account, never in share links =================
// The list, saving, location and address search live in app/data/myplaces.ts and app/data/kakao.ts; the section in 설정
// handles its own buttons (app/screens/MyPlacesSection.tsx). Here: the names the rest of the old code uses.
JD.kakao.connectKakao(()=>KEYS.kakao||'');
JD.myplaces.connectMyPlaces({redraw:()=>renderSettings(),syncSoon:()=>syncSoon()});
const MYP=JD.myplaces.list;   // the same array (changed in place)
const mypOf=id=>JD.myplaces.of(id);
// what the section shows
function mypView(){const u=JD.myplaces.ui;return {places:MYP.map(x=>({id:x.id,name:x.name,ll:x.ll||null,addr:x.addr||''})),editing:u.edit,msg:u.msg||'',
  hits:u.hits.map(h=>({name:h.name,addr:h.addr})),hasKakao:!!KEYS.kakao}}
// ---------- 오가는 길 → 출발지 (집, 내 장소). The 🎲 sheet itself: app/flow/dice.ts ----------
// trip departure from 집 (내 장소)
const KR_AIR={gmp:['김포공항 국제선',37.5583,126.7906],icn1:['인천공항 T1',37.4492,126.4510],icn2:['인천공항 T2',37.4602,126.4407]};
// 오가는 길 → 출발지 (drawn by React: TripForms.tsx HomeBox)
function partHomeBox(p){if(p.mode==='car')return null;const h=mypOf('home');
  return {f:'homeBox',hasHome:!!(h&&h.ll),addr:(h&&h.addr)||'',using:!!p.home.ll,kakao:KEYS.kakao?Object.entries(KR_AIR).map(([k,a])=>[k,a[0]]):[],msg:FS.homeMsg}}
// ---------- 🎲 뭐 하지 → 📌 이 코스 저장: a new 하루 코스 plan: app/flow/course.ts (the rolling itself: app/flow/dice.ts) ----------
const COURSE=window.JEPI_UI.flow.course;
COURSE.connect({carryTaste:(a,b)=>carryTaste(a,b)});
const saveCourse=COURSE.saveCourse;
// ================= intro: sky, slogan, gentle motion =================
function introRun(){const el=document.getElementById('intro');if(!el)return;
  const calm=matchMedia('(prefers-reduced-motion:reduce)').matches, hold=calm?1300:2300;
  const end=()=>{if(el.classList.contains('out'))return;el.classList.add('out');setTimeout(()=>el.remove(),700)};
  el.addEventListener('click',end); setTimeout(end,hold);}

// ---------- header plan switcher (drop-down) ----------
// drawn by React: app/screens/PlanMenu.tsx
let planMenuRev=0;
function planMenuInfo(){
  const list=PL.plans.slice().sort((a,b)=>(a.id===PL.curPlan?-1:b.id===PL.curPlan?1:(b.updated||0)-(a.updated||0)));
  return {rev:++planMenuRev,plans:list.map(p=>({id:String(p.id),cur:p.id===PL.curPlan,past:!!pmPast(p),color:String(pmLook(p).color),coverSVG:pmPast(p)?'':coverSVG(pmLook(p).cover,150,90),
    dday:pmDday(p),name:String(p.name||'이름 없는 계획'),sub:`${p.dates||''}${p.blocks?` · 블록 ${p.blocks}개`:''}`}))};
}
function planMenu(open){const m=document.getElementById('planMenu'),b=document.getElementById('planBtn');if(!m||!b)return;
  if(open){snapshotCurrent();window.JEPI_UI.mount('planMenu',m,planMenuInfo());m.style.top=Math.round(b.getBoundingClientRect().bottom+6)+'px';m.hidden=false;hero({planOpen:true});const f=m.querySelector('.pm-item.cur,.pm-item');if(f)f.focus({preventScroll:true})}
  else{m.hidden=true;hero({planOpen:false})}}
document.addEventListener('click',e=>{
  if(e.target.closest('#planBtn'))return;   // the button toggles the menu itself (heroAct)
  const m=document.getElementById('planMenu'); if(!m||m.hidden)return;
  if(!e.target.closest('#planMenu'))planMenu(false);   // a tap outside closes it
},true);
// an item in the plan menu (PlanMenu.tsx tells: open a plan, + 새 계획, 계획 관리·공유)
function planMenuAct(n,v){planMenu(false);
  if(n==='open'){if(v!==PL.curPlan){openPlan(v);showToast('계획을 바꿨어요')}return}
  if(n==='new'){newPlan();return}
  UI.tab='plans';snapshotCurrent();PS.showText=false;renderPlans();renderTabs()}
document.addEventListener('keydown',e=>{if(e.key==='Escape'){const m=document.getElementById('planMenu');if(m&&!m.hidden){planMenu(false);document.getElementById('planBtn').focus()}}});

// ---------- DICE motion: rolls while the page scrolls, opens out of the die ----------
const calmMotion=()=>matchMedia('(prefers-reduced-motion:reduce)').matches;
(function(){let raf=0,stopT=0;const fab=()=>document.getElementById('diceFab');
  addEventListener('scroll',()=>{if(calmMotion())return;const f=fab();if(!f)return;f.classList.add('rolling');
    if(!raf)raf=requestAnimationFrame(()=>{raf=0;const y=scrollY,c=f.querySelector('.cube');if(!c)return;
      c.style.transform=`rotateX(${(-22+y*0.8).toFixed(0)}deg) rotateY(${(32+y*0.55).toFixed(0)}deg) rotateZ(${(y*0.2).toFixed(0)}deg)`});
    clearTimeout(stopT);stopT=setTimeout(()=>f.classList.remove('rolling'),150)},{passive:true});
})();
function diceOpenAnim(){
  const f=document.getElementById('diceFab'),sh=document.getElementById('sheet'),bg=document.getElementById('sheetBg');
  if(!f||!sh||calmMotion()||!f.getClientRects().length)return;
  const a=f.getBoundingClientRect(),b=sh.getBoundingClientRect();
  sh.style.setProperty('--fx',Math.round(a.left+a.width/2-(b.left+b.width/2))+'px');sh.style.setProperty('--fy',Math.round(a.top+a.height/2-(b.top+b.height/2))+'px');
  sh.classList.remove('pop','unpop');bg.classList.remove('bg-out');void sh.offsetWidth;sh.classList.add('pop');bg.classList.add('bg-in');
  f.classList.remove('tap');void f.offsetWidth;f.classList.add('tap');
}
function diceCloseAnim(){
  const f=document.getElementById('diceFab'),sh=document.getElementById('sheet'),bg=document.getElementById('sheetBg');
  if(!sh||sh.dataset.uid!=='dice'||calmMotion()||!f||!f.getClientRects().length||bg.hidden||sh.classList.contains('unpop'))return false;
  const a=f.getBoundingClientRect(),b=sh.getBoundingClientRect();
  sh.style.setProperty('--fx',Math.round(a.left+a.width/2-(b.left+b.width/2))+'px');sh.style.setProperty('--fy',Math.round(a.top+a.height/2-(b.top+b.height/2))+'px');
  sh.classList.remove('pop');sh.classList.add('unpop');bg.classList.remove('bg-in');bg.classList.add('bg-out');
  setTimeout(()=>{bg.hidden=true;sh.classList.remove('unpop');bg.classList.remove('bg-out')},260);return true;
}


// postcard look for each trip in the menu: its own theme colour, cover and D-day
function pmProfile(p){return p.id===PL.curPlan?CUR.profile:((TRIP.plans.get(p.id)||{}).profile||{})}
function pmLook(p){return Object.assign({color:'#2448c9',cover:'city'},pmProfile(p).look||{})}
function pmPast(p){const pr=pmProfile(p);if(!pr.startDate||pr.dateUnknown)return false;const e=new Date(pr.startDate+'T00:00:00');e.setDate(e.getDate()+(pr.kind==='day'?0:(+pr.nights||0)));return e<new Date(new Date().toDateString())}
function pmDday(p){const pr=pmProfile(p);if(!pr.startDate||pr.dateUnknown||pmPast(p))return '';const n=Math.round((new Date(pr.startDate+'T00:00:00')-new Date(new Date().toDateString()))/864e5);return n>0?'D-'+n:n===0?'D-DAY':'여행 중'}   // the D-day label (PlanMenu.tsx)

// ---------- the floating 🎲 is there on every tab; in P 모드 it steps aside while the board's own dice is on screen ----------
// (the board's roll button, the rolling die, 내 카드) — so two dice never compete; scrolled past or on another tab, it comes back.
function fabDodge(){
  // what is really visible: below the folded header bar, above the chat box and the tab bar at the bottom
  let top=0,bot=innerHeight;['#miniBar'].forEach(q=>{const e=document.querySelector(q);if(e&&document.body.classList.contains('mini')){const r=e.getBoundingClientRect();if(r.height)top=Math.max(top,r.bottom)}});
  ['#chat','.tabs'].forEach(q=>{const e=document.querySelector(q);if(e){const r=e.getBoundingClientRect();if(r.height&&r.top>innerHeight/2)bot=Math.min(bot,r.top)}});
  const on=[...document.querySelectorAll('#pview .proll,#pview .pspin,#pview .mcard')].some(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.bottom>top+24&&r.top<bot-24});
  document.body.classList.toggle('fab-dodge',on);
}
(function(){let raf=0;const later=()=>{if(!raf)raf=requestAnimationFrame(()=>{raf=0;fabDodge()})};
  addEventListener('scroll',later,{passive:true}); addEventListener('resize',later);
  const pv=document.getElementById('pview'); if(pv&&window.MutationObserver) new MutationObserver(later).observe(pv,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
})();
// ================= 기기 간 동기화 (Supabase, 본인 계정 데이터만) =================
const SYNC=JD.server.SYNC;
const saveSync=JD.server.saveSync;
// which part of the 동기화 section shows and the last error live in app/data/account.ts (ACC.state)
const ACC=JD.account;
const syncOn=JD.server.syncOn;
function keepSess(j){JD.server.keepSess(j)}
// any table (or rpc/<name>) in the project, as the logged-in person; rows are limited by RLS on the server
function sbTable(table,method,q,body,prefer){return JD.server.sbTable(table,method,q,body,prefer)}
// What to send and how to merge what comes back: app/data/sync.ts. Here: our values, and redrawing after.
const SYNC_STATUS=JD.sync.status; // .busy (sending or receiving), .keysLocked (server keys locked with another password)
function syncSoon(ms){JD.sync.syncSoon(ms)}
function syncNow(){return JD.sync.syncNow()}
JD.sync.connectSync({
  plans:()=>PL.plans, setPlans(p){PL.plans=p}, curPlan:()=>PL.curPlan,
  kws:()=>CUR.kws, setKws(k){CUR.kws=k},
  myPlaces:()=>MYP, setMyPlaces(m){JD.myplaces.setAll(m)},
  keys:()=>KEYS, setKeys(k){JD.keys.replace(k);saveKeys(true)},
  setErr(m){ACC.state.err=m},
  async afterPush(){
    if(UI.tab==='settings') renderSettings();
    for(const f of SYNC_AFTER_PUSH){try{await f()}catch(e){console.warn(e)}}
  },
  async afterPull({changed,curChanged,keysPulled}){
    if(curChanged){const ae=document.activeElement;const editing=(ae&&/^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName))||!$('#sheetBg').hidden||!$('#onb').hidden;
      if(!editing){applyPlanData(curChanged);showToast('다른 기기에서 바꾼 내용을 받아왔어요')} }
    if(keysPulled){keyBad={};if(STANDALONE)UI.sample=makeSample();renderAll();showToast('AI·지도 키도 받아왔어요')}
    if(changed){renderPlans();renderExt()} if(UI.tab==='settings')renderSettings();
    for(const f of SYNC_AFTER_PULL){try{await f()}catch(e){console.warn(e)}}
  }
});
// The section is drawn by React: app/screens/SyncSection.tsx. Here: what it shows.
function syncView(){
  const st=ACC.state.step, mode=(!SYNC.url||!SYNC.key||st==='setup')?'setup':!syncOn()?(st==='reset'?'reset':st==='join'?'join':'login'):st==='newpw'?'newpw':'on';
  return {mode,url:SYNC.url||'',hasKey:!!SYNC.key,email:(mode==='on'&&SYNC.sess.email)||SYNC.email||'',err:ACC.state.err||'',busy:!!SYNC_STATUS.busy,
    lastAt:SYNC.at||0,vkMissing:!LS.get('jepi.vk',null),keysLocked:!!SYNC_STATUS.keysLocked};
}
// the section's buttons and forms work by themselves (app/data/account.ts); they ask the old code to redraw and to sync
ACC.connectAccount({redraw:()=>renderSettings(),toast:m=>showToast(m),syncNow:()=>syncNow()});

// a tapped login link comes back here: ?sb=<config>#access_token=…
async function syncBoot(){
  try{
    const q=new URLSearchParams(location.search), sb=q.get('sb');
    if(sb){try{const c=JSON.parse(atob(sb));if(c.u&&!SYNC.url)SYNC.url=c.u;if(c.k&&!SYNC.key)SYNC.key=c.k;if(c.e)SYNC.email=c.e;saveSync()}catch(_){}}
    const h=new URLSearchParams((location.hash||'').replace(/^#/,''));
    if(h.get('error_description')){ACC.state.err=h.get('error_description').replace(/\+/g,' ');showToast('로그인 링크가 만료됐어요. 다시 받아 주세요.')}
    if(h.get('access_token')&&SYNC.url&&SYNC.key){
      const at=h.get('access_token');let user={};
      try{const r=await fetch(SYNC.url+'/auth/v1/user',{headers:{apikey:SYNC.key,Authorization:'Bearer '+at}});user=await r.json()}catch(_){}
      keepSess({access_token:at,refresh_token:h.get('refresh_token'),expires_in:+h.get('expires_in')||3600,user});SYNC.sent={};SYNC.lastPull=0;saveSync();ACC.state.step=h.get('type')==='recovery'?'newpw':'';if(ACC.state.step==='newpw'){UI.tab='settings';setTimeout(()=>{renderTabs();renderSettings()},300)}
      showToast('로그인했어요 · 동기화를 켰어요');
    }
    if(sb||h.get('access_token')||h.get('error_description')) history.replaceState(null,'',location.pathname);
  }catch(_){}
  setTimeout(syncNow,800);
}

// ---------- state ----------
const store=JD.storage; // same as LS (app/data/storage.ts)
loadPack(packFrom(store.get('gp.pack',null))||blankPack());
CUR.profile=TRIP.load('profile',null); const firstRun=!CUR.profile||typeof CUR.profile!=='object'; if(firstRun){CUR.profile=clone(PROFILE_EXAMPLE);Object.assign(CUR.profile,{dest:'',pace:'normal',social:'some',breakfast:true,purpose:'',party:{type:'solo',adults:1,kids:0},flightSet:false,staySet:false,dateSet:false,nightsSet:false,dateUnknown:false,startDate:isoPlus(30)});CUR.profile.stays[0].name='숙소'}
CUR.custom=TRIP.load('custom',[]); if(!Array.isArray(CUR.custom)) CUR.custom=[]; CUR.custom.forEach(addCustomToData);
CUR.placed=TRIP.load('placed',null);
if(!Array.isArray(CUR.placed)) CUR.placed=DEFAULT.map(b=>({...b}));
CUR.placed=CUR.placed.filter(b=>PM[b.id]).map(b=>({uid:TRIP.uids.next(),id:b.id,day:b.day,start:b.start,dur:b.dur||PM[b.id].dur,mk:Array.isArray(b.mk)?b.mk.filter(m=>MARKS[m]):undefined}));
CUR.fmarks=TRIP.load('fmarks',{}); DFLOW.load(); CUR.wish=TRIP.load('wish',[]); if(!Array.isArray(CUR.wish)) CUR.wish=[]; if(!CUR.fmarks||typeof CUR.fmarks!=='object') CUR.fmarks={};
CUR.done=TRIP.load('done',{});
DY.homeMin=60;
CUR.kws=TRIP.kws.load(); if(!Array.isArray(CUR.kws)) CUR.kws=DEFAULT_KW.slice();
CUR.meals=TRIP.load('meals',{}); if(!CUR.meals||typeof CUR.meals!=='object') CUR.meals={};
// where the person is in the app (the open day, tab, picked place, the AI …): app/ui/state.ts, read as UI.day, UI.tab …
// changes to the trip happen in app/data/trip.ts (TRIP.blocks / wish / toggleMark …); not while an AI check tries them out on a copy,
// and blocks first keep the places other travelers shared that they use
TRIP.connectSaving(part=>{if(OPS.state.dry)return false;if(part==='placed')keepShared();return true});
const save=()=>TRIP.blocks.saved();   // saved without uids

// ---------- helpers ----------
const $=s=>document.querySelector(s);
// time text, distances and the day check live in app/logic (JD.logic)
const fmt=JD.logic.time.fmt, parse=JD.logic.time.parse;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// travel between places, opening hours and the day check: app/data/check.ts
const CK=JD.check, travel=CK.travel;

const dayItems=JD.days.dayItems;   // app/data/days.ts: fixed blocks + my blocks of a day
const analyze=CK.analyze, gapsOf=CK.gapsOf;

// ---------- render ----------
// Drawing the 일정표, the 장소 tab, 준비하기, the bottom tabs, the banner, the AI box, 취향 키워드 and the block sheet:
// app/flow/render.ts. What it still needs from the old code is connected here (each one looked up when it runs).
const RENDER=window.JEPI_UI.flow.render;
RENDER.connect({
  hero:p=>hero(p),
  badges:(it,d)=>extras(BLOCK_BADGES,it,d), cardExtras:p=>extras(CARD_EXTRAS,p), sheetExtras:(it,d)=>extras(SHEET_EXTRAS,it,d),
  renderPView:()=>renderPView(), recsMaybe:()=>recsMaybe(),
  openFind:o=>openFind(o), fresh:()=>FRESH, curShared:()=>curShared(), dupInfo:()=>dupInfo(), dock:p=>dock(p), seasonInfo:()=>seasonInfo(),
  fabDodge:()=>fabDodge(), panels:()=>Object.keys(PANELS), diceCloseAnim:()=>diceCloseAnim(),
  touchPlan:()=>touchPlan(), renderMeta:()=>renderMeta(), renderNudges:()=>renderNudges(), renderChat:()=>renderChat(), renderExt:()=>renderExt(), renderLook:()=>renderLook(),
});
const setZoom=RENDER.setZoom, drawTrayTop=RENDER.drawTrayTop, trayAct=RENDER.trayAct, renderTray=RENDER.renderTray, tabs=RENDER.tabs, renderTabs=RENDER.renderTabs, drawBanner=RENDER.drawBanner, renderAI=RENDER.renderAI, renderPref=RENDER.renderPref, saveKw=RENDER.saveKw, renderAll=RENDER.renderAll;
// ---------- actions ----------
// putting a place in the 일정표, and the block sheet: app/flow/render.ts
const place=RENDER.place, openSheet=RENDER.openSheet, closeSheet=RENDER.closeSheet;
// ---------- start over: wipe everything this browser keeps for the page ----------
let wipeArm=false;
function wipeAll(){
  ['profile','pack','placed3','custom','kw','meal2','done','fmarks','wish','coach','dice','jp'].forEach(k=>JD.storage.del('gp.'+k));
  PL.plans.forEach(p=>TRIP.plans.del(p.id)); PL.plans=[]; PL.curPlan='p'+Date.now().toString(36); savePlans();
  CUR.custom=[]; CUR.placed=[]; CUR.fmarks={}; CUR.wish=[]; CUR.kws=[]; CUR.meals={}; CUR.done={}; CS.chat=[]; CS.undoSnap=null; UI.aiState=null; UI.selected=null; HS.vibe=null; wipeArm=false;
  loadPack(blankPack()); savePack();
  CUR.profile=clone(PROFILE_EXAMPLE); Object.assign(CUR.profile,{stays:[{name:'숙소',area:'center',checkin:'15:00',checkout:'11:00',from:0,to:3}],events:[],dest:'',pace:'normal',social:'some',breakfast:true,purpose:'',party:{type:'solo',adults:1,kids:0},flightSet:false,staySet:false,dateSet:false,nightsSet:false,dateUnknown:false,startDate:isoPlus(30)}); CUR.profile.stays[0].name='숙소';
  buildDays(); UI.day=0; UI.tab='timeline'; helperShow(false); closeSheet(); renderAll(); openOnb();
}
// ---------- first-use guide ----------
// first-use guide: four steps only; everything else is in 더보기 → 사용 안내 (387-help.js)
const COACH=[{sel:'#grid',t:'일정표예요. 빈 시간을 누르면 앞뒤 일정과 가까운 장소를 골라 넣을 수 있어요.'},
  {sel:'#grid .blk',t:'블록을 누르면 시간을 옮기거나, 대안을 보거나, 🔔 알림을 켤 수 있어요.'},
  {sel:'#diceFab',t:'고민될 땐 🎲. 빈 시간에 할 일이나 오늘 메뉴를 무작위로 골라 줘요.'},
  {sel:'#chatForm',t:'말로 부탁해도 돼요. 바꿀 내용을 먼저 보여 주고, 확인한 뒤에 적용해요. 자세한 사용법은 더보기 → 사용 안내에 있어요.'}];
// the bubble is drawn by React (app/screens/Frames.tsx) from coachView
let coachView={open:false,i:undefined,text:'',step:'',last:false};
function drawCoach(){window.JEPI_UI.mount('coach',$('#coachMount'),coachView)}
function coachAct(n){if(n==='next')showCoach(+coachView.i+1);else if(n==='skip')showCoach(COACH.length)}
function showCoach(i){
  document.querySelectorAll('.coach-hl').forEach(e=>e.classList.remove('coach-hl'));
  if(i>=COACH.length){coachView={...coachView,open:false};drawCoach();store.set('gp.coach',1);return}
  if(!matchMedia('(min-width:900px)').matches&&UI.tab!=='timeline'){UI.tab='timeline';renderTabs()}
  let el=document.querySelector(COACH[i].sel); if(COACH[i].sel==='#grid'&&UI.jp==='P') el=document.querySelector('#pview'); if(COACH[i].sel==='#grid .blk'&&UI.jp==='P') el=document.querySelector('#pview .sq'); if(!el||!el.offsetParent){showCoach(i+1);return}
  if(el){el.classList.add('coach-hl');el.scrollIntoView({block:i===0?'start':'center'})}
  coachView={open:true,i,text:COACH[i].t,step:`${i+1} / ${COACH.length}`,last:i===COACH.length-1}; drawCoach();
}
const maybeCoach=()=>{if(!store.get('gp.coach',0)&&$('#onb').hidden&&!helperOpen()) setTimeout(()=>showCoach(0),400)};
// ---------- events ----------
// open a tab (the bottom tabs, and any button with data-tab: 더보기 rows, back buttons …)
function goTab(name){UI.tab=name;FS.autoMsg='';if(UI.tab==='me'){FS.draft=clone(CUR.profile);FS.meOpen=null;renderMe()}if(UI.tab==='pref'){FS.draft=clone(CUR.profile);renderTasteStyle()}if(UI.tab==='plans'){snapshotCurrent();PS.showText=false;renderPlans()}if(UI.tab==='settings'){keyEdit=null;renderSettings()}if(UI.tab==='more')renderMore();if(PANELS[UI.tab])PANELS[UI.tab].render({opened:true});renderTabs();if(UI.tab==='map')openMap();else mapState.on=false;window.scrollTo({top:0});}
document.addEventListener('click',e=>{
  const t=e.target.closest('button,input,label'); if(!t) return;
  if(t.dataset.tab){if(!t.closest('.tabs'))goTab(t.dataset.tab);return}
  if(t.id==='diceFab'){openDiceTab(DICEV.mealNow()==='snack'?'do':'eat',null);return}
  if(t.id==='coachAgain'){showCoach(0);return}
  if(t.id==='moreHelper'){openHelper(CUR.wish.length?1:0);return}
  // 닫기 in any sheet (#sheet: block, 🎲, 장소 찾기, 직접 만들기)
  if(t.dataset.close&&t.closest('#sheet')){closeSheet();return}
});
document.addEventListener('change',e=>{
  if(e.target.id==='dateUnknown'&&FS.draft){FS.draft.dateUnknown=e.target.checked;if(FS.draft.dateUnknown){FS.draft.startDate=isoPlus(30);FS.draft.dateSet=true}else FS.draft.dateSet=false;rerenderForm();return}
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
SCHED.connect({hero:p=>hero(p),diceFrom:t=>DFLOW.diceFrom(t),openCustom:(id,st)=>openCustom(id,st),
  makePairBlock:(uid,k)=>makePairBlock(uid,k),genSeason:id=>genSeason(id),fixWarns:()=>fixWarns()});
const blockAct=SCHED.blockAct, checksAct=SCHED.checksAct, aiboxAct=SCHED.aiboxAct, gridAct=SCHED.gridAct, kwAct=SCHED.kwAct, dropped=SCHED.dropped;
// 🛠 AI에게 경고 해결 맡기기 (the check list's button and the 경고 chip above the 일정표)
function fixWarns(){const ws=[];DY.days.forEach((_,d)=>analyze(d).items.forEach(it=>it.warns.forEach(w=>ws.push(`Day ${d+1} ${it.name}: ${w}`))));UI.tab='timeline';renderTabs();sendChat('지금 일정의 경고를 모두 해결해 줘. 꼭 필요한 것만 바꾸고, 바꿀 수 없는 고정 일정은 그대로 둬.\n'+ws.slice(0,20).join('\n'));const c=$('#chat');if(c)c.scrollIntoView({block:'start'})}
// 더보기 rows that are not a tab (MoreMenu.tsx): 여행 노트, 여행 꾸미기, 전체 메뉴 보기
function moreAct(id){
  if(id==='nbOpen'){openNotebook();return}
  if(id==='lookOpen'){openLook();return}
  if(id==='moreAll'){FS.moreAll=!FS.moreAll;renderMore();return}
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

// ---------- first screen: 새 여행 만들기 / 이미 계정이 있어요 / 데모 둘러보기 ----------
// The screen is React (app/screens/Welcome.tsx): it keeps its own view, logs in, and asks for these (host in 389-titles.js).
// the first screen, after logging in, the demo: app/flow/welcome.ts
const WELC=window.JEPI_UI.flow.welcome;
WELC.connect({joinPending:()=>joinPending(),firstRun:()=>firstRun,startupFocus:()=>startupFocus()});
const openWelcome=WELC.openWelcome, closeWelcome=WELC.closeWelcome, welcomeLoggedIn=WELC.welcomeLoggedIn, demoEnter=WELC.demoEnter, demoExit=WELC.demoExit, renderDemoBar=WELC.renderDemoBar;
document.addEventListener('click',e=>{if(e.target.closest('#demoExit'))demoExit()});
// test hooks (local checks only)
if(/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) window.__jepi={demoEnter,navLink,routeProvider,sync:()=>syncNow(),state:()=>({cur:PL.curPlan,plans:PL.plans.map(p=>({id:p.id,shared:p.shared,role:p.role}))}),demoLikeTrip(){const d=demoOsaka();d.pack.demo=false;applyPlanData({profile:d.profile,pack:d.pack,placed:d.placed});onbFrame({open:false});snapshotCurrent();renderAll()}};
// ---------- tidy day screen: one summary line; details open on tap ----------
// The route strip, today's cost, warnings, free gaps and "tell us more" nudges used to sit above the
// timeline all at once. Now one line of chips shows the numbers and each chip opens its part.
const sumAct=SCHED.sumAct;   // app/flow/schedule.ts
// ---------- 영업시간: real opening hours from Google Places (abroad), AI estimate in Korea ----------
// The lookups, the 30-day cache and the monthly cap live in app/data/hours.ts (rules: app/logic/hours.ts). Here: the trip side.
const HOURS_CAP=JD.hours.CAP, hoursUse=add=>JD.hours.used(add), hoursSweep=()=>JD.hours.sweep();
JD.hours.connectHours({placesOnSchedule:()=>[...new Set(CUR.placed.map(b=>b.id))].map(id=>PM[id]).filter(Boolean),googleKey:()=>KEYS.gmaps||'',keyBad:()=>isBad('gmaps'),
  demo:()=>!!DEMO.on,inKorea:ll=>inKR(ll),city:()=>PK.pack.city||'',changed(){savePack();TRIP.customs.saved();renderAll();touchPlan()}});
// ---------- 친구와 함께: shared trips, invite links, 가고 싶어요 ----------
// A shared trip keeps its plan in jepi_trips (one row, `rev` goes up by one on every save).
// Each device remembers the last server version it saw (`base`). When two people change the
// same trip, the three versions are merged per block / per place / per field, so a change to
// day 1 and a change to day 2 both survive; only the very same block edited twice keeps the later one.
// Server tables + rules: see supabase/schema.sql.
// The server side (push / pull / share / invite / join / leave / stop) and the merge rules live in app/data/trips.ts
// and app/data/merge.ts. Here: the screen side. TRIPS is the same object as JD.trips.state (base, members, marks)
// plus what the friends panel shows (invite, msg, busy, stopArm).
var TRIPS=Object.assign(JD.trips.state,{invite:null,msg:'',busy:false,stopArm:false});
const myName=()=>LS.get('jepi.myName','')||String((SYNC.sess&&SYNC.sess.email)||SYNC.email||'나').split('@')[0];
const planOf=id=>PL.plans.find(p=>p.id===id);
const curShared=()=>{const p=planOf(PL.curPlan);return p&&p.shared?p:null};
// a new version of the open plan: put it in, unless the person is typing or has a sheet open (then the next pull tries again)
function applyIfOpen(id,data,who){
  if(id!==PL.curPlan) return true;
  const ae=document.activeElement, editing=(ae&&/^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName))||!$('#sheetBg').hidden||!$('#onb').hidden||UI.selected;
  if(editing) return false;
  const d0=UI.day; applyPlanData(data); UI.day=Math.min(d0,Math.max(0,DY.days.length-1)); renderAll();
  if(who&&who!==myName()) showToast(`${who}님이 일정을 바꿨어요`);
  return true;
}
JD.trips.connectTrips({plans:()=>PL.plans,curPlan:()=>PL.curPlan,savePlans:()=>savePlans(),applyIfOpen,myName,snapshotCurrent:()=>snapshotCurrent(),toast:m=>showToast(m),
  pulled(listChanged){if(listChanged){renderPlans();renderExt()} if(curShared()) renderAll(); if(UI.tab==='friends') PANELS.friends.render()}});
const tripPush=id=>JD.trips.push(id), tripsPull=()=>JD.trips.pull(), tripShare=()=>JD.trips.share(), tripInvite=role=>JD.trips.invite(role,location.origin+location.pathname);
const tripLeave=uid=>JD.trips.leave(uid), tripStop=()=>JD.trips.stop();
SYNC_AFTER_PUSH.push(async()=>{for(const p of PL.plans.filter(p=>p.shared)) await tripPush(p.id)});
SYNC_AFTER_PULL.push(tripsPull);
async function tripJoin(code){
  const id=await JD.trips.join(code); const p=planOf(id);
  if(p){PL.curPlan=PL.curPlan===id?'':PL.curPlan;openPlan(id);showToast('여행에 참여했어요')}
  return id;
}
// join link: ?join=CODE
function joinFromUrl(){
  const code=new URLSearchParams(location.search).get('join'); if(!code) return false;
  history.replaceState(null,'',location.pathname); LS.set('jepi.joinCode',code);
  if(syncOn()){joinPending();return true}
  WELC.openJoin();return true;
}
async function joinPending(){
  const code=LS.get('jepi.joinCode',''); if(!code||!syncOn()) return false;
  LS.del('jepi.joinCode');
  try{await tripJoin(code);return true}catch(e){showToast(/expired|invite/i.test(e.message)?'초대 링크가 만료됐어요. 새 링크를 받아 주세요.':'참여하지 못했어요: '+e.message);return false}
}
// ----- 가고 싶어요 (the marks live in app/data/trips.ts) -----
const wantsOf=pid=>JD.trips.wantsOf(pid), iWant=pid=>JD.trips.iWant(pid);
const toggleWant=pid=>curShared()?JD.trips.toggleWant(pid,renderTray):Promise.resolve();
// 가고 싶어요 chip, card tag, sheet row, block badge (drawn by React: app/screens/Extras.tsx)
function wantChip(pid){
  const m=wantsOf(pid), on=iWant(pid), who=m.map(x=>x.user_id===SYNC.sess.user?'나':x.name).join(', ');
  return {k:'want',pid:String(pid),on:!!on,n:m.length,who};
}
CARD_EXTRAS.push(p=>curShared()?[wantChip(p.id),...(p.by?[{k:'tag',cls:'tag usr',t:`${p.by===myName()?'내가':p.by+'님'} 추천`}]:[])]:null);
SHEET_EXTRAS.push(it=>curShared()&&it.kind==='place'?{k:'wantRow',want:wantChip(it.id),by:it.p.by||''}:null);
BLOCK_BADGES.push(it=>{if(!curShared()||it.kind!=='place')return null;const n=wantsOf(it.id).length;return n?{k:'badge',t:`👍${n}`,title:`가고 싶어요 ${n}`}:null});
// 👍 가고 싶어요 on a shared trip's place (Extras.tsx)
async function wantAct(pid){try{await toggleWant(pid)}catch(err){showToast('저장하지 못했어요: '+err.message)}
  if(!$('#sheetBg').hidden&&$('#sheet').dataset.uid)openSheet($('#sheet').dataset.uid)}
// 친구와 함께 panel (FriendsPanel.tsx tells: what was pressed, and whose 내보내기 / the typed name)
async function tripAct(a,uid,typed){
  if(TRIPS.busy) return; if(a!=='stop') TRIPS.stopArm=false; TRIPS.busy=true; TRIPS.msg=''; PANELS.friends.render();
  try{
    if(a==='share'){await tripShare();TRIPS.invite={role:'edit',url:await tripInvite('edit')}}
    if(a==='invite-edit'||a==='invite-view'){const role=a.slice(7);TRIPS.invite={role,url:await tripInvite(role)}}
    if(a==='send'&&TRIPS.invite){const txt=`${planOf(PL.curPlan).name} 여행을 같이 짜요 · JEPI`;
      if(navigator.share){try{await navigator.share({title:'JEPI 여행 초대',text:txt,url:TRIPS.invite.url})}catch(_){}}
      else{try{await navigator.clipboard.writeText(TRIPS.invite.url);TRIPS.msg='초대 링크를 복사했어요'}catch(_){TRIPS.msg='아래 링크를 길게 눌러 복사해 주세요'}}}
    if(a==='copy'&&TRIPS.invite){try{await navigator.clipboard.writeText(TRIPS.invite.url);TRIPS.msg='초대 링크를 복사했어요'}catch(_){TRIPS.msg='링크를 길게 눌러 복사해 주세요'}}
    if(a==='leave') await tripLeave();
    if(a==='kick') await tripLeave(uid);
    if(a==='stop'){if(!TRIPS.stopArm){TRIPS.stopArm=true;TRIPS.busy=false;PANELS.friends.render();return}TRIPS.stopArm=false;await tripStop()}
    if(a==='name'){const v=String(typed||'').trim().slice(0,20);LS.set('jepi.myName',v);
      if(curShared())await sbTable('jepi_trip_members','PATCH',`?trip_id=eq.${encodeURIComponent(PL.curPlan)}&user_id=eq.${SYNC.sess.user}`,{name:myName()},'return=minimal');TRIPS.msg='이름을 바꿨어요';await tripsPull()}
  }catch(err){TRIPS.msg='✕ '+err.message}
  TRIPS.busy=false; PANELS.friends.render(); renderMore();
}
// ----- panel -----
// The panel itself is drawn by React: app/screens/FriendsPanel.tsx
PANELS.friends={render(opts){
  const box=$('#friendsBox'); if(!box) return; const p=curShared();
  if(opts&&opts.opened) TRIPS.stopArm=false; // opening the panel again forgets a first press of 공유 끝내기
  const mode=DEMO.on?'demo':!syncOn()?'login':!p?'intro':'shared';
  window.JEPI_UI.mount('friends',box,{mode,planName:(planOf(PL.curPlan)||{}).name||'이 여행',busy:!!TRIPS.busy,msg:TRIPS.msg||'',myName:myName(),
    members:mode==='shared'?(TRIPS.members[PL.curPlan]||[]):[],me:syncOn()?SYNC.sess.user:'',role:p?p.role||'':'',invite:TRIPS.invite||null,stopArm:!!TRIPS.stopArm});
}};
// ---------- one place-finding screen, many doors ----------
// Every "find places" button opens this same sheet with its conditions already picked:
//   어디 (near today's plan / one area / whole city) · 언제 (a free gap / any time) · 넣을 곳 (schedule / list only)
// Results always come back with the same three choices as chat: 일정에 넣기 / 장소에만 / 안 함.
// Chat and 🎲 DICE keep their own way of asking; only how results are kept is shared.
let FIND={where:'near',area:'',when:'any',gap:null,into:'list',q:'',busy:false,res:[],ctl:null,cursor:null};
function findAreaOfDay(){const it=analyze(UI.day).items.find(i=>!i.stay&&i.area);return it?it.area:''}
function openFind(o){
  FIND=Object.assign({where:'near',area:firstArea(),when:'any',gap:null,into:'list',q:'',busy:false,res:[],ctl:null,cursor:null},o||{});
  if(FIND.when==='gap'&&!FIND.gap){const g=gapsOf(UI.day)[0];if(g)FIND.gap=g;else FIND.when='any'}
  renderFind(); $('#sheet').dataset.uid=''; $('#sheetBg').hidden=false;
  if(o&&o.autorun) runFind();
}
// Drawn by React: app/screens/FindSheet.tsx. renderFind = full redraw (boxes and status start fresh, like before);
// findRowsUpdate = only the results change (what was typed and the status line stay).
let findRev=0;
function renderFind(){findRev++;findMount()}
function findRowsUpdate(){findMount()}
function findMount(){
  const F=FIND, gaps=gapsOf(UI.day), gv=g=>({v:`${g[0]}-${g[1]}`,label:`${fmt(g[0])}–${fmt(g[1])}`});
  window.JEPI_UI.mount('find',$('#sheet'),{dayNo:UI.day+1,date:String(DY.days[UI.day].date),city:String(PK.pack.city||''),where:F.where,area:F.area||'',
    areas:Object.entries(AREAS).map(([k,v])=>({k,label:String(v[0])})),when:F.when,gaps:gaps.map(gv),gap:F.gap?gv(F.gap):null,into:F.into,q:F.q||'',busy:!!F.busy,mine:UI.jp==='P',
    rows:F.res.map(r=>{const p=PM[r.id];if(!p)return null;
      const meta=[p.area,CATS[p.cat]||'',p.hours&&!p.always?`${fmt(p.hours[0])}–${fmt(p.hours[1])}`:''].filter(Boolean).join(' · ');
      return {id:r.id,name:String(p.name),meta,note:p.note?String(p.note):'',c:r.c||'',txt:r.txt||''}}).filter(Boolean),rev:findRev});
}
function findFocus(){
  const F=FIND, parts=[];
  if(F.q) parts.push(F.q);
  if(F.where==='near'){const a=findAreaOfDay();if(a)parts.push(`near ${a} (where the traveler is on Day ${UI.day+1})`)}
  else if(F.where==='area'&&AREAS[F.area]) parts.push(`only in the ${AREAS[F.area][0]} area`);
  if(F.when==='gap'&&F.gap) parts.push(`to visit on ${DY.days[UI.day].iso||'Day '+(UI.day+1)} between ${fmt(F.gap[0])} and ${fmt(F.gap[1])}; must be open then and fit within that time`);
  return parts.join('; ');
}
async function runFind(){
  if(FIND.busy) return;
  if(!UI.sample){FIND.res=[];renderFind();setSt('findSt','AI가 연결되어 있지 않아요. 더보기 → 설정에서 연결해 주세요.');return}
  // "fill this gap" with no extra wish keeps the original behaviour: AI picks from the places already on the list
  if(FIND.into==='sched'&&FIND.when==='gap'&&!FIND.q&&FIND.where==='near'&&P.some(p=>!CUR.placed.some(b=>b.id===p.id))){closeSheet();askAI();return}
  FIND.busy=true; FIND.res=[]; FIND.cursor=FIND.gap?FIND.gap[0]+15:null; renderFind();
  const ctl=new AbortController(); FIND.ctl=ctl;
  const n=await morePlaces(FIND.into==='sched'?5:8,'findSt',findFocus(),ctl.signal).catch(()=>0);
  FIND.busy=false; FIND.res=[...FRESH].map(id=>({id}));
  if($('#findForm')){renderFind(); if(!n) setSt('findSt','새로 찾은 곳이 없어요. 찾는 말을 바꿔 보세요.'); else setSt('findSt',`${n}곳을 찾았어요. 장소 탭 "✨ 방금 찾은 곳"에도 모여 있어요.`)}
  renderTray();
}
function findDrop(id){ // 안 함: the place was only just found, so take it off the list again
  const k=PK.pack.places.findIndex(x=>x.id===id); if(k>=0){PK.pack.places.splice(k,1);savePack()}
  const i=P.findIndex(x=>x.id===id); if(i>=0)P.splice(i,1); delete PM[id]; FRESH.delete(id);
}
// 장소 찾기 sheet (FindSheet.tsx tells: a choice chip "key:value" with what is typed, a result "id:sched|list|skip",
// the 동네 / 빈 시간 lists, or 찾기); and "찾기" next to an empty time in the day summary (gap "start-end")
function findAct(n,v,typed){
  if(n==='chip'){const [k,x]=String(v).split(':');FIND[k]=x;FIND.q=typed!=null?typed||FIND.q:FIND.q;
    if(k==='when'&&x==='gap'&&!FIND.gap)FIND.gap=gapsOf(UI.day)[0]||null; renderFind();return}
  if(n==='gap'){const [a,b]=String(v).split('-').map(Number);openFind({when:'gap',gap:[a,b],into:'sched'});return}
  if(n==='area'){FIND.area=v;return}
  if(n==='gapsel'){FIND.gap=String(v).split('-').map(Number);return}
  if(n==='submit'){FIND.q=String(typed||'').trim();runFind();return}
  if(n==='r'){const [id,act]=String(v).split(':'), r=FIND.res.find(x=>x.id===id), p=PM[id]; if(!r||!p) return;
    if(act==='skip'){findDrop(id);r.c='skip';r.txt='넣지 않았어요'}
    else if(act==='list'){r.c='list';if(UI.jp==='P'){if(!isWish(id))toggleWish(id);r.txt='내 카드에 담았어요'}else r.txt='장소 목록에 넣었어요'}
    else if(FIND.when==='gap'&&FIND.gap){
      const st=Math.max(FIND.cursor||FIND.gap[0],FIND.gap[0]), rr=repairOps([{op:'add',day:UI.day,id,start:fmt(st),dur:p.dur}]);
      applyOpsCore(rr.ops); save(); FIND.cursor=parse(rr.ops[0].start)+p.dur+20;
      r.c='sched'; r.txt=`${rr.ops[0].start}에 넣었어요${rr.warns.length?` · 확인할 것 ${rr.warns.length}`:''}`; renderAll();
    } else {UI.selected=id;r.c='pick';r.txt='일정표에서 넣을 시간을 탭하세요';closeSheet();UI.tab='timeline';renderAll();return}
    findRowsUpdate(); renderTray(); return}
}
// ---------- 알림: push notifications while travelling ----------
// The server / device side and the settings live in app/data/alerts.ts, which reminders and time zones in
// app/logic/alerts.ts; the panel and the 🔔 row in a block's sheet handle their own buttons. Here: the trip side.
const AL=JD.alerts;
var NOTIFY=AL.settings;   // the same object (on, all, lead, depart, morning)
const pushSupported=AL.pushSupported, isIOS=AL.isIOS, standaloneApp=AL.standaloneApp;
// which blocks can ring: places and fixed things like check-in / flights, not the night at the hotel
const alertKey=(it,d)=>`${it.kind==='place'?it.id:it.uid}@${d}`;
const alertable=it=>!it.stay&&(it.kind==='place'||it.kind==='fixed');
const alertOn=(it,d)=>AL.isOn(alertKey(it,d));
const tripTZ=()=>JD.logic.alerts.tripTZ(PK.pack);
const alertsSoon=ms=>AL.soon(ms);
AL.connectAlerts({curPlan:()=>PL.curPlan,tz:tripTZ,demo:()=>!!DEMO.on,redraw:()=>{PANELS.notify.render();renderMore();renderAll()},
  days:()=>DY.days.map((D,d)=>({iso:D.iso||'',rows:D.iso?analyze(d).items.filter(alertable).map(it=>({key:alertKey(it,d),name:String(it.name),start:it.start,end:it.end,locName:it.locName||'',travelIn:it.travelIn||null})):[]}))});
BLOCK_BADGES.push((it,d)=>alertable(it)&&alertOn(it,d)&&NOTIFY.on?{k:'badge',t:'🔔',title:'알림 켜짐'}:null);
SHEET_EXTRAS.push((it,d)=>{if(!alertable(it)||DEMO.on)return null;const on=alertOn(it,d);
  return {k:'alert',key:alertKey(it,d),on:!!on,hint:!NOTIFY.on?'더보기 → 알림에서 이 기기 알림을 켜야 와요':on?(NOTIFY.depart&&it.travelIn?`출발 ${NOTIFY.lead}분 전에 알려 드려요`:`시작 ${NOTIFY.lead}분 전에 알려 드려요`):''}});
// The panel itself is drawn by React: app/screens/NotifyPanel.tsx
PANELS.notify={render(){
  const box=$('#notifyBox'); if(!box) return;
  const mode=DEMO.on?'demo':!pushSupported()?(isIOS()&&!standaloneApp()?'ios-home':'unsupported'):!syncOn()?'login':'ready';
  window.JEPI_UI.mount('notify',box,{mode,busy:AL.ui.busy,msg:AL.ui.msg||'',tz:String(tripTZ()),
    settings:{on:!!NOTIFY.on,all:!!NOTIFY.all,lead:+NOTIFY.lead||10,depart:!!NOTIFY.depart,morning:!!NOTIFY.morning}});
}};
// keep the server's list in step with the plan (cheap: only uploads when something changed)
setInterval(()=>{if(NOTIFY.on&&!document.hidden)alertsSoon(100)},30000);
// ---------- 사용 안내 (더보기 → 사용 안내) ----------
// The screen itself is drawn by React: app/screens/HelpPanel.tsx
PANELS.help={render(){
  const box=$('#helpBox'); if(!box) return;
  window.JEPI_UI.mount('help',box,{demoOn:!!DEMO.on,onCoach(){UI.tab='timeline';renderTabs();showCoach(0)},onDemo(){demoEnter()}});
}};
// ---------- same place twice: catch it when adding, offer to merge what is already doubled ----------
// "Same place" = within 100 m and a similar name (one contains the other, or most letter pairs match).
// Nothing is merged automatically: a branch of the same chain can sit next door.
// the rules live in app/logic/places.ts
const nameSim=JD.logic.places.nameSim, samePlace=JD.logic.places.samePlace;
const dupOf=pl=>P.find(p=>!p.shared&&samePlace(p,pl))||null;

// --- already doubled: suggest merging at the top of the 장소 tab ---
const dupNoKey=(a,b)=>[a,b].sort().join('~');
function dupPairs(){
  const no=new Set(store.get('gp.dupNo',[])||[]), mine=P.filter(p=>!p.shared), out=[];
  for(let i=0;i<mine.length&&out.length<3;i++)for(let j=i+1;j<mine.length;j++){
    const a=mine[i],b=mine[j]; if(samePlace(a,b)&&!no.has(dupNoKey(a.id,b.id))){out.push([a,b]);break}}
  return out;
}
// the "같은 곳 같아요" cards at the top of 장소 (drawn by React: Tray.tsx)
function dupInfo(){
  const who=p=>p.custom?'직접 추가':p.by?`${p.by} 추천`:p.ai||FRESH.has(p.id)?'AI가 찾음':'장소 목록';
  return dupPairs().map(([a,b])=>({a:a.id,b:b.id,why:a.custom||b.custom?'이름이 비슷해요':'위치가 가깝고 이름이 비슷해요',aWho:who(a),aName:a.name,bWho:who(b),bName:b.name}));
}
function mergePlaces(aId,bId){
  let a=PM[aId], b=PM[bId]; if(!a||!b) return;
  // keep the one already in the schedule, else the one that is not hand-made
  const inUse=id=>CUR.placed.some(x=>x.id===id);
  if((inUse(b.id)&&!inUse(a.id))||(a.custom&&!b.custom)){const t=a;a=b;b=t}
  CUR.placed.forEach(x=>{if(x.id===b.id)x.id=a.id});
  if(isWish(b.id)&&!isWish(a.id)) toggleWish(a.id); if(isWish(b.id)) toggleWish(b.id);
  if(b.note&&b.note!==a.note&&!/직접 만든 블록이에요/.test(b.note)) a.note=[a.note,b.note].filter(Boolean).join(' · ').slice(0,300);
  if(b.by&&!a.by) a.by=b.by;
  if(b.custom)TRIP.customs.remove(b.id);
  const k=PK.pack.places.findIndex(x=>x.id===b.id); if(k>=0) PK.pack.places.splice(k,1);
  const ka=PK.pack.places.find(x=>x.id===a.id); if(ka){ka.note=a.note;if(a.by)ka.by=a.by}
  savePack();
  const i=P.findIndex(x=>x.id===b.id); if(i>=0) P.splice(i,1); delete PM[b.id]; FRESH.delete(b.id);
  save(); renderAll(); showToast(`"${a.name}" 하나로 묶었어요`);
}
document.addEventListener('click',e=>{const t=e.target.closest('button');if(!t)return;
  if(t.dataset.dupuse){ // typing a name in "직접 만들기" found a place that is already there → schedule that one instead
    const p=PM[t.dataset.dupuse]; if(!p) return; const st=$('#cfStart')?parse($('#cfStart').value):null;
    TRIP.blocks.add({id:p.id,day:UI.day,start:Math.max(dayStart(UI.day),Math.min(1410,st??600)),dur:p.dur});closeSheet();renderAll();showToast(`이미 있는 "${p.name}"을(를) 일정에 넣었어요`);return}
});
// --- while typing a new place's name: show places that are already there ---
document.addEventListener('input',e=>{
  if(e.target.id!=='cfName'||$('#customForm')?.dataset.edit) return;
  if(!customLast||!$('#customForm')) return;
  const q=e.target.value.trim();
  const hits=q.length<2?[]:P.filter(p=>!p.drop&&(nameSim(p.name,q)>=.5||norm(p.name).includes(norm(q)))).slice(0,4);
  customLast=Object.assign({},customLast,{dup:hits.map(p=>({id:String(p.id),name:String(p.name),sub:`${p.area||''}${p.shared?' · 여행자 추천':''}${CUR.placed.some(x=>x.id===p.id)?' · 이미 일정에 있어요':''}`}))});
  window.JEPI_UI.mount('custom',$('#sheet'),customLast);   // same rev: what is typed stays
});
// local test hooks (tools/checks.js)
if(/^(localhost|127\.0\.0\.1)$/.test(location.hostname)&&window.__jepi) Object.assign(window.__jepi,{
  dupTest(){const a=P.find(p=>!p.custom&&!p.drop&&!CUR.placed.some(b=>b.id===p.id));const b=Object.assign({},a,{id:'dupx',name:a.name+' 본점'});PK.pack.places.push(b);addPackPlace(b);renderTray();return a.name},
  has:id=>!!PM[id], openCustom:()=>openCustom(), openFind:o=>openFind(o)});
// ---------- day titles the traveler can rename ----------
// profile.dayTitles[d] overrides the automatic "Day 1 · 도착" title (rules: app/logic/memo.ts). The ✎ form is React
// (app/screens/DayTitleForm.tsx, it saves itself); here: the header around it.
const dayTitleOf=SCHED.dayTitleOf, titleEditing=SCHED.titleEditing;   // app/flow/schedule.ts
// what React screens may ask of the old code (app/ui/host.ts)
window.JEPI_UI.connectHost({renderAll:()=>renderAll(),closeSheet:()=>closeSheet(),reopenSheet:()=>{const u=$('#sheet').dataset.uid;if(u&&u!=='dice'&&!$('#sheetBg').hidden)openSheet(u)},toast:m=>showToast(m),day:()=>UI.day,autoTitle:d=>String((DY.days[d]||{}).title||''),titleEditing,
  closeNotebook:()=>closeNotebook(),renamePlan:nm=>lookRenamePlan(nm),aiDayTitles:n=>lookAiTitles(n),errText:(e,w)=>errText(e,w),welcomeNew:()=>{closeWelcome();openOnb()},welcomeDemo:()=>demoEnter(),welcomeLoggedIn:()=>welcomeLoggedIn(),dice:(n,v,m)=>diceAct(n,v,m),place:(n,v)=>placeAct(n,v),plans:(n,v,v2)=>plansAct(n,v,v2),helper:(n,v,v2)=>helperAct(n,v,v2),helperFrame:n=>helperFrameAct(n),dock:(n,v)=>dockAct(n,v),tray:(n,v)=>trayAct(n,v),tab:n=>goTab(n),onbFrame:n=>onbFrameAct(n),hero:n=>heroAct(n),miniDay:s=>{const n=UI.day+s;if(n>=0&&n<DY.days.length){UI.day=n;renderAll()}},mapTop:n=>mapTopAct(n),coach:n=>coachAct(n),banner:()=>{UI.selected=null;renderAll()},chat:(n,v)=>chatAct(n,v),pview:(n,v)=>pviewAct(n,v),kw:(n,v)=>kwAct(n,v),grid:(n,v)=>gridAct(n,v),block:(n,v,o)=>blockAct(n,v,o),checks:(n,v,o)=>checksAct(n,v,o),aibox:(n,v)=>aiboxAct(n,v),settings:(n,v,v2)=>settingsAct(n,v,v2),form:(n,v,o)=>formAct(n,v,o),sum:(n,v)=>sumAct(n,v),trip:(a,u,t)=>tripAct(a,u,t),want:p=>wantAct(p),find:(n,v,t)=>findAct(n,v,t),planMenu:(n,v)=>planMenuAct(n,v),more:id=>moreAct(id),mapCard:i=>mapCardAct(i),dropped:(k,id,m)=>dropped(k,id,m),nudge:(n,v)=>nudgeAct(n,v),importFile:f=>importBackup(f,ok=>{if(ok){maybeCoach()}}),shareNotebook:async()=>{await shareLink(true);return PS.msg||'링크를 만들었어요'}});
// ---------- how a trip looks: theme colour, cover, style, handwriting; folding hero header ----------
// profile.look = {color, cover:'city'|'sea'|'mountain'|'none'|'photo', photo:dataURL, tagline, style:'color'|'note', hand}
// Lives in the plan's profile, so it syncs across devices and to friends on a shared trip.
const LOOK_COLORS=[['#2448c9','코발트'],['#c23b22','노을'],['#0f7a5c','숲'],['#6b2fb3','보라'],['#0e7490','바다'],['#b45309','호박'],['#be185d','체리'],['#2b2a33','먹']];
const LOOK_HANDS=[['pen','나눔펜','"Nanum Pen Script"'],['gaegu','개구','"Gaegu"'],['melody','하이멜로디','"Hi Melody"']];
const LOOK_COVERS=[['city','도시'],['sea','바다'],['mountain','산'],['none','없음']];
const lookOf=()=>Object.assign({color:'#2448c9',pop:'#ffd23f',cover:'city',tagline:'',style:'color',hand:'pen',photo:''},(CUR.profile&&CUR.profile.look)||{});
function coverSVG(kind,w,h){
  const k=kind||'city';
  if(k==='sea') return `<svg viewBox="0 0 200 120" width="${w}" height="${h}" preserveAspectRatio="xMaxYMax meet"><circle cx="150" cy="38" r="18" fill="var(--pop)"/><path d="M0 92 C40 84,80 100,200 86 V120 H0Z" fill="#fff" fill-opacity=".16"/><path d="M0 104 C50 96,110 114,200 100 V120 H0Z" fill="#000" fill-opacity=".18"/></svg>`;
  if(k==='mountain') return `<svg viewBox="0 0 200 120" width="${w}" height="${h}" preserveAspectRatio="xMaxYMax meet"><circle cx="160" cy="30" r="16" fill="var(--pop)"/><path d="M40 120 L100 50 L130 86 L150 66 L200 120Z" fill="#000" fill-opacity=".2"/><path d="M100 50 L112 64 L88 64Z" fill="#fff" fill-opacity=".7"/></svg>`;
  if(k==='none'||k==='photo') return '';
  return `<svg viewBox="0 0 200 120" width="${w}" height="${h}" preserveAspectRatio="xMaxYMax meet"><circle cx="150" cy="34" r="20" fill="var(--pop)" fill-opacity=".9"/><path d="M0 120 V84 H16 V64 H34 V90 H50 V52 H62 L68 44 L74 52 V92 H96 V70 H116 V96 H134 V60 H150 V88 H170 V74 H200 V120Z" fill="#000" fill-opacity=".18"/></svg>`;
}
// the header is drawn by React (app/screens/Hero.tsx) from heroView; hero({…}) changes some of it and draws again
let heroView={artHtml:'',artBg:'',artPhoto:false,jp:'J',planName:'',planOpen:false,meta:'',tag:'',day:'',title:'',sub:'',memo:'',editing:false,slot:false};
function hero(p){heroView={...heroView,...p};window.JEPI_UI.mount('hero',$('#heroMount'),heroView)}
// pressed in the header
function heroAct(n){
  if(n==='look')openLook();
  else if(n==='J'||n==='P'){setJP(n);renderAll()}
  else if(n==='plan')planMenu(document.getElementById('planMenu').hidden);
  else if(n==='title'){if(!$('#dayTitleIn'))titleEditing(true)}
}
function renderLook(){
  const L=lookOf(), R=document.documentElement.style, note=L.style==='note';
  R.setProperty('--theme',L.color); R.setProperty('--pop',L.pop);
  R.setProperty('--f-hand',(LOOK_HANDS.find(x=>x[0]===L.hand)||LOOK_HANDS[0])[2]+', cursive');
  document.body.classList.toggle('style-note',note);
  {const photo=L.cover==='photo'&&L.photo, p={
    artBg:photo?`linear-gradient(rgba(0,0,0,.35),rgba(0,0,0,.45)),url("${L.photo}")`:'',artPhoto:!!photo,
    artHtml:note?`<div class="stamp"><span>${esc((PK.pack.city||'TRIP').slice(0,8))}</span><b>${esc(((DY.days[0]||{}).date||'').replace(/\s.*/,''))}</b><span>${esc(String(new Date().getFullYear()))}</span></div>`:photo?'':coverSVG(L.cover,190,120),
    tag:L.tagline||''};
  if(DY.days[UI.day]){const D=DY.days[UI.day];p.day=note?`CHAPTER ${UI.day+1} · ${D.date} ${WD[D.wd]}`:`DAY ${String(UI.day+1).padStart(2,'0')} · ${D.date} ${WD[D.wd]}`}
  hero(p)}
  renderDayMemo(); miniUpdate();
}
// --- folding header: the hero scrolls away and a one-line bar takes its place ---
// (drawn by React: app/screens/Bars.tsx, from miniView; miniBar({…}) changes some of it and draws again)
let miniView={on:false,day:'',dayHidden:false,title:'',navHidden:false};
function miniBar(p){miniView={...miniView,...p};window.JEPI_UI.mount('mini',$('#miniMount'),miniView)}
function miniUpdate(){
  const D=DY.days[UI.day]; if(!D) return; const onDay=document.body.dataset.tab==='timeline'||!document.body.dataset.tab;
  miniBar({day:onDay?String(UI.day+1).padStart(2,'0'):'',dayHidden:!onDay,title:onDay?dayTitleOf(UI.day):($('#planName')?$('#planName').textContent:''),navHidden:!onDay||DY.days.length<2});
}
function heroWatch(){
  const hero=$('#hero'); if(!hero) return;
  let raf=0;
  const on=()=>{raf=0;const h=hero.offsetHeight||1, y=window.scrollY, t=Math.max(0,Math.min(1,y/Math.max(1,h-64)));
    hero.style.setProperty('--fold',t.toFixed(3));
    const mini=y>h-64; if(document.body.classList.contains('mini')!==mini){document.body.classList.toggle('mini',mini);miniBar({on:mini})}};
  addEventListener('scroll',()=>{if(!raf)raf=requestAnimationFrame(on)},{passive:true}); on();
}
document.addEventListener('click',e=>{const t=e.target.closest('button');if(!t)return;
});
// --- 여행 꾸미기 sheet: drawn by React (app/screens/LookSheet.tsx), which keeps its own draft and saves itself ---
let lookRev=0;
function openLook(){
  const L=lookOf();
  window.JEPI_UI.mount('look',$('#sheet'),{name:(PL.plans.find(x=>x.id===PL.curPlan)||{}).name||planName(),tagline:L.tagline||'',style:L.style,color:L.color,cover:L.cover,hand:L.hand,photo:L.photo||'',pop:L.pop,
    colors:LOOK_COLORS,covers:LOOK_COVERS.map(([k,n])=>({k,name:n,svg:coverSVG(k,64,40)})),hands:LOOK_HANDS,
    days:DY.days.map((D,i)=>({title:((CUR.profile.dayTitles||[])[i])||'',placeholder:String(D.title)})),ai:!!UI.sample,rev:++lookRev});
  $('#sheet').dataset.uid=''; $('#sheetBg').hidden=false;
}
// the question for AI로 지어 보기 (asked by the sheet through the host)
const lookAiTitles=tripName=>JD.asks.dayTitles(UI.sample,tripName);   // app/data/asks.ts
function lookRenamePlan(nm){const p=PL.plans.find(x=>x.id===PL.curPlan);if(p&&nm&&nm!==p.name){p.name=nm;p.custom_name=true;savePlans()}}
// ---------- handwritten memos: one line per block, one line per day ----------
// The rules live in app/logic/memo.ts; the memo box in a block's sheet saves itself (app/screens/Extras.tsx MemoBox).
const memoKey=SCHED.memoKey, blockMemoOf=SCHED.blockMemoOf, dayMemoOf=SCHED.dayMemoOf, renderDayMemo=SCHED.renderDayMemo;   // app/flow/schedule.ts
SHEET_EXTRAS.push(it=>it&&it.id?{k:'memo',key:memoKey(it,UI.day),value:blockMemoOf(it,UI.day)}:null);   // drawn by React: Extras.tsx
// ---------- 여행 노트 보기: the whole trip as one notebook (cover + a chapter per day) ----------
// Read-only. "PDF로 저장" uses the browser's print (print CSS in 17-look.css keeps only the notebook).
// "링크로 보내기" sends the usual share link with &note=1, so the receiver opens straight into the notebook.
// drawn by React: app/screens/Notebook.tsx
let notebookRev=0;
function notebookInfo(){
  const L=lookOf(), name=(PL.plans.find(x=>x.id===PL.curPlan)||{}).name||planName();
  const D0=DY.days[0]||{}, Dn=DY.days[DY.days.length-1]||{};
  const photo=L.cover==='photo'&&L.photo;
  const cover={photo:photo?String(L.photo):'',svg:photo?'':coverSVG(L.cover,260,156),city:String((PK.pack.city||'TRIP').slice(0,8)),date:String(D0.date||'').replace(/\s.*/,''),name:String(name),
    line:[D0.date&&Dn.date?`${D0.date} — ${Dn.date}`:'',DY.days.length>1?`${DY.days.length-1}박 ${DY.days.length}일`:'하루',L.tagline].filter(Boolean).join(' · ')};
  const days=DY.days.map((D,d)=>{
    const {items,trans}=analyze(d), list=items.filter(i=>!(i.stay&&i!==items[items.length-1]));
    const rows=list.map((it,k)=>{
      const prev=k?list[k-1]:null, t=prev?trans.find(x=>x.from>=prev.end-5&&x.from<=it.start):null;
      return {mv:t?`↓ ${t.mode} ${t.min}분${t.fare?' · '+yen(t.fare):''}`:'',time:fmt(it.start),name:String(it.name),memo:String(blockMemoOf(it,d)||'')}});
    return {ch:`CHAPTER ${d+1} · ${D.date} ${WD[D.wd]}`,title:String(dayTitleOf(d)),memo:String(dayMemoOf(d)||''),rows};
  });
  return {cover,days,rev:++notebookRev};
}
function openNotebook(){
  let nb=$('#notebook'); if(!nb){nb=document.createElement('div');nb.id='notebook';nb.className='notebook';nb.setAttribute('role','dialog');nb.setAttribute('aria-label','여행 노트');document.body.appendChild(nb)}
  window.JEPI_UI.mount('notebook',nb,notebookInfo()); nb.hidden=false; nb.scrollTop=0; document.body.style.overflow='hidden';
}
function closeNotebook(){const nb=$('#notebook');if(nb)nb.hidden=true;document.body.style.overflow=''}

// ---------- start-up: runs after every file above has defined its variables ----------
if(STANDALONE) UI.sample=makeSample();
hero({}); onbFrame({}); tabs({}); miniBar({}); dock({}); drawTrayTop(); mapTop({}); drawHelperFrame(); drawCoach(); drawBanner();   // the fixed frames (React)
PL.plans=TRIP.plans.list()||[]; if(!Array.isArray(PL.plans)) PL.plans=[]; PL.curPlan=TRIP.plans.current()||''; if(!PL.curPlan){PL.curPlan='p'+Date.now().toString(36);savePlans()}
setZoom(store.get('gp.zoom',60),true);
setJP(store.get('gp.jp',CUR.profile.kind==='day'?'P':'J'),true);
buildDays();
renderAll();
applyTheme(); introRun(); syncBoot();
if(/[#&]s=/.test(location.hash)) openShared(); else if(joinFromUrl()){} else if(firstRun&&!syncOn()&&!/access_token/.test(location.hash)) openWelcome(); else if(firstRun) openOnb(); else {startupFocus(); maybeCoach();}
renderDemoBar();
setTimeout(hoursSweep,4000); setInterval(hoursSweep,20000);
diceFromUrl();
// scroll to morning
setTimeout(()=>{const H=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hour'))||60;
  const g=$('#grid'); if(g) window.scrollTo({top:0})},0);
// AI availability
const showErr=m=>{const b=document.getElementById('errbar');if(!b)return;b.textContent='문제가 생겼어요: '+String(m).slice(0,160);b.hidden=false;clearTimeout(showErr.t);showErr.t=setTimeout(()=>{b.hidden=true},8000)};
window.addEventListener('error',e=>showErr(e.message||'알 수 없는 오류'));
window.addEventListener('unhandledrejection',e=>{const r=e.reason;if(r&&r.code==='cancelled')return;showErr((r&&(r.message||r.code))||r)});
initRecs(); heroWatch();
if('serviceWorker' in navigator&&location.protocol==='https:') navigator.serviceWorker.register('sw.js').catch(()=>{});
(async()=>{try{ if(window.claude&&window.claude.use){ const s=await window.claude.use('sample'); if(s){UI.sample=s; renderAI(); renderChat(); renderTray(); if(!$('#onb').hidden) renderOnb(); else if(UI.tab==='me') renderMe()} } }catch(_){} })();
// iOS Safari only shows :active (press feedback) once the page listens for touches
document.addEventListener('touchstart',()=>{},{passive:true});
})();

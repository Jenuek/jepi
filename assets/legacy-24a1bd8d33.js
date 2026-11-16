
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
// 설정's state (app/flow/settings.ts): KS.msg, KS.bad, KS.who, KS.models, KS.theme, KS.edit
const KS=window.JEPI_UI.flow.settings.ks;
// small pieces of the trip screens (J / P, 가볍게 시작, … ): app/flow/pieces.ts
const PIECES=window.JEPI_UI.flow.pieces;
// ---------- demo sandbox ----------
// The sandbox itself (copy aside on entering, put back on leaving or on the next launch) is in app/data/demo.ts
// and has already run before this script. DEMO.on is true while the demo is open.
const DEMO=JD.demo.DEMO;
// ---------- extra side panels ----------
// A feature adds a panel with: PANELS.name={render(){…}}  plus  <div id="side-name" hidden> in body.html.
// Opening it: any button with data-tab="name". It is shown under the 더보기 tab.
// Features that ride on the account sync: run after every push / pull (SYNC_AFTER_PUSH / SYNC_AFTER_PULL).
// Little extras drawn by features: on a timeline block, a place card, and the block sheet. The lists: app/ui/extras.ts
const XT=window.JEPI_UI.extras, PANELS=XT.PANELS, SYNC_AFTER_PUSH=XT.SYNC_AFTER_PUSH, SYNC_AFTER_PULL=XT.SYNC_AFTER_PULL,
  BLOCK_BADGES=XT.BLOCK_BADGES, CARD_EXTRAS=XT.CARD_EXTRAS, SHEET_EXTRAS=XT.SHEET_EXTRAS, extras=XT.extras;

DY.loc={};
// the destination's lists (app/data/places.ts — the same objects, filled again when a destination opens; tokyo.ts until then)
const PLC=JD.places, PK=PLC.state;
const AREAS=PLC.AREAS, P=PLC.P, PM=PLC.PM;
DY.locArea={};
DY.locZone={};
const dayStart=JD.days.dayStart;   // app/data/days.ts
DY.gmpBy=360; // when to be at the home airport, from the profile
DY.days=[];
const DEFAULT_KW=[];
const yen=TV.yen;   // app/data/traveler.ts
const DEFAULT=[];
// ---------- profile: trip facts entered by the viewer ----------
const PROFILE_EXAMPLE=JD.plans.PROFILE_EXAMPLE;   // app/data/plans.ts
const clone=o=>JSON.parse(JSON.stringify(o));
// dates, tidying 여행 정보 and making the days with their fixed blocks: app/data/days.ts (the days themselves: DY.days …)
const buildDays=JD.days.buildDays;

// ---------- forms shared by onboarding and the "내 정보" tab ----------
// What is typed, 처음 설정's steps, the buttons, saving and reading a pasted booking: app/flow/forms.ts. What it still
// needs from the old code is connected here (each one looked up when it runs).
const FFLOW=window.JEPI_UI.flow.forms;
FFLOW.connect({partJP:()=>partJP(),partTalk:p=>partTalk(p),partDest:p=>partDest(p),setSt:(id,t)=>setSt(id,t),progStart:(id,t,b,l)=>progStart(id,t,b,l),progStop:id=>progStop(id),
  setBusy:on=>setBusy(on),keysChanged:()=>keysChanged(),setJP:(m,q)=>setJP(m,q),quickStart:()=>quickStart(),talkSend:(t,o)=>talkSend(t,o),talkReset:()=>talkReset(),
  recommendDest:m=>recommendDest(m),genPack:(d,b)=>genPack(d,b),morePlaces:(n,id,f,sig)=>morePlaces(n,id,f,sig),genSeason:(id,sig)=>genSeason(id,sig),autoSave:()=>autoSave(),
  renderMeRows:()=>renderMeRows(),renderTasteStyle:()=>renderTasteStyle(),meSetMsg:m=>meSetMsg(m),meSetBudgetHint:h=>meSetBudgetHint(h),openHelper:s=>openHelper(s),
  needBooking:()=>needBooking(),maybeCoach:()=>maybeCoach(),onbAdvance:()=>onbAdvance(),demoEnter:()=>demoEnter(),krAir:()=>KR_AIR});
const isoPlus=FFLOW.isoPlus, openOnb=FFLOW.openOnb, onbFrame=FFLOW.onbFrame, onbFrameAct=FFLOW.onbFrameAct, renderOnb=FFLOW.renderOnb, renderMe=FFLOW.renderMe, formAct=FFLOW.formAct;
// ---------- blocks the viewer makes by hand ----------
const addCustomToData=PLC.addCustom;   // app/data/places.ts
// the 직접 만들기 sheet and saving it: app/flow/find.ts
const openCustom=window.JEPI_UI.flow.find.openCustom;
// ---------- talk to Claude to change the schedule ----------
// the chat, the dock, the nudges, the header's trip line and ✨ 빈 시간 채우기: app/flow/chat.ts
const CHAT=window.JEPI_UI.flow.chat;
CHAT.connect({openFind:o=>openFind(o),fixWarns:()=>fixWarns(),openHelper:s=>openHelper(s),openCustom:(id,st)=>openCustom(id,st),addCustomToData:c=>addCustomToData(c),
  hero:p=>hero(p),renderMe:()=>renderMe(),needBooking:()=>needBooking(),dupOf:p=>dupOf(p),renderExt:()=>renderExt()});
const dock=CHAT.dock, dockAct=CHAT.dockAct, renderChat=CHAT.renderChat, renderNudges=CHAT.renderNudges, renderMeta=CHAT.renderMeta, chatAct=CHAT.chatAct;
// ---------- destination pack: everything that depends on where the trip goes ----------
// The destination's places and the lists made from them (AREAS, PM …), loading one (loadPack) and checking what the AI
// sends (cleanPack / cleanPlace) live in app/data/places.ts; the open destination is PK.pack.
PK.pack=null;
const wipe=o=>{for(const k of Object.keys(o)) delete o[k]};
const addPackPlace=PLC.addPackPlace, loadPack=PLC.loadPack, savePack=PLC.savePack, packFrom=PLC.packFrom, cleanPack=PLC.cleanPack, cleanPlace=PLC.cleanPlace;
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
// how a place becomes a saved entry, other travelers' places joining the list, 👍, sharing a place I made: app/flow/recs.ts
const RECF=window.JEPI_UI.flow.recs;
RECF.init();   // refresh everyone's 👍 along with the account sync (at this point, so it runs in the same order as before)
const SHARED_IDS=RECF.SHARED_IDS, keepShared=RECF.keepShared, rebuildShared=RECF.rebuildShared, initRecs=RECF.initRecs, recsMaybe=RECF.recsMaybe;
// ---------- small to-dos attached to blocks (luggage, waiting lists, pick-ups, rentals, cash, tax refund) ----------
// marks, their pairs and warnings, and the sheet's 할 일 표시 box: app/data/marks.ts
const MK=JD.marks, MARKS=MK.MARKS;
CUR.fmarks=null;
const toggleMark=(uid,m)=>TRIP.toggleMark(uid,m);   // app/data/trip.ts
const makePairBlock=PIECES.makePairBlock;   // the block that closes a 할 일 표시: app/flow/pieces.ts
// ---------- check AI changes before showing them: simulate, nudge times, report what is left ----------
// The changes themselves (apply, try out on a copy, nudge times) live in app/data/ops.ts; it asks here for the day's warnings.
const OPS=JD.ops;
OPS.connectOps({dayStart:d=>dayStart(d),days:()=>DY.days.length,items:d=>analyze(d).items,fresh:id=>FRESH.add(id)});
// ---------- booking helper: wish list → where to stay → flight times → search links ----------
CUR.wish=[];
// the 예약 도우미 (frame, steps, AI answers in it): app/flow/helper.ts — its state is HS (app/flow/helper.ts hs)
const HELP=window.JEPI_UI.flow.helper;
HELP.connect({maybeCoach:()=>maybeCoach(),renderMe:()=>renderMe()});
const needBooking=HELP.needBooking, helperAct=HELP.helperAct, helperFrameAct=HELP.helperFrameAct, openHelper=HELP.openHelper, genSeason=HELP.genSeason, seasonInfo=HELP.seasonInfo, drawHelperFrame=HELP.drawHelperFrame;
// ---------- optional travel style (every item defaults to "doesn't matter") ----------
// ---------- optional money budget (per person, in 만원) ----------

// ---------- J / P modes ----------
const setJP=PIECES.setJP, partsDay=PIECES.partsDay;   // J / P, the 하루 코스 form parts
// ---------- DICE: roll for an empty slot ----------
// the 🎲 sheet and the P모드 board (rolling, 이걸로, 코스): app/flow/dice.ts — the rolls and choices live there (DFLOW.st)
const DFLOW=window.JEPI_UI.flow.dice, dice=DFLOW.st.dice;
DFLOW.connect({morePlaces:(n,id,f,sig)=>morePlaces(n,id,f,sig),fresh:()=>FRESH,setSt:(id,t)=>setSt(id,t),toast:m=>showToast(m),renderSettings:()=>renderSettings(),
  diceOpenAnim:()=>diceOpenAnim(),saveCourse:()=>saveCourse(),keyBad:()=>KS.bad,demoOn:()=>!!DEMO.on});
const diceFromUrl=DFLOW.diceFromUrl, diceAct=DFLOW.diceAct, renderPView=DFLOW.renderPView, pviewAct=DFLOW.pviewAct;
// ---------- quick start (P, and any one-day course): a few taps ----------
const quickStart=PIECES.quickStart;   // 가볍게 시작: app/flow/pieces.ts
// ---------- P view: the day as a board game (drawn by React: app/screens/PView.tsx) ----------
// ---------- my plans: several saved plans, account sync, sharing ----------
PL.plans=[]; PL.curPlan='';
// switching, making, copying, deleting, renaming plans; opening one; 카톡용 글, files, backups, share links: app/flow/plans.ts
const PLF=window.JEPI_UI.flow.plans;
PLF.connect({addCustomToData:c=>addCustomToData(c),setJP:(m,q)=>setJP(m,q),carryTaste:(a,b)=>carryTaste(a,b),shareLink:n=>shareLink(n),openShared:()=>openShared(),
  lastLink:()=>SHARE.lastLinkOf(),importAll:v=>importAll(v),standalone:()=>!!STANDALONE,renderPlanBtn:()=>renderPlanBtn()});
const savePlans=PLF.savePlans, snapshotCurrent=PLF.snapshotCurrent, touchPlan=PLF.touchPlan, applyPlanData=PLF.applyPlanData, inClaude=PLF.inClaude, importBackup=PLF.importBackup, plansAct=PLF.plansAct, renderPlans=PLF.renderPlans;
// ================= JEPI standalone: AI keys, model router, routes, map, panels =================
const STANDALONE=!(window.claude&&window.claude.use);
const LS=JD.storage; // saved data on this device: app/data/storage.ts
JD.keys.load(); const KEYS=JD.keys.list;   // app/data/keys.ts (the same object, changed in place)
// the models used (saved on this device); the key list, testing and saving keys: app/flow/settings.ts
KS.models=Object.assign({heavy:'claude-sonnet-5-5',light:'claude-haiku-5-5',gemini:'gemini-3.6-flash'},LS.get('jepi.models',{})||{});
const SETF=window.JEPI_UI.flow.settings;
const saveKeys=SETF.saveKeys, keysChanged=SETF.keysChanged;
// The AI connection (calling Claude / Gemini, retries, switching to the other AI) lives in app/data/ai.ts.
JD.ai.connectAI({keys:()=>KEYS,models:()=>KS.models,bad:()=>KS.bad,who:n=>{KS.who=n}});
const makeSample=JD.ai.makeSample;
const blankPack=PLC.blankPack;   // app/data/places.ts
// ---------- routes: Google Routes (abroad), cached on this device ----------
// Asking, the queue and the cache live in app/data/routes.ts; Korea checks and "안내 시작" links in app/logic/geo.ts.
// Here: the names the rest of the old code uses, and when to redraw after routes arrive.
const inKR=JD.logic.geo.inKorea, navLink=JD.logic.geo.navLink;
const routeProvider=(a,b)=>JD.routes.provider(a,b);
JD.routes.connectRoutes({googleKey:()=>KEYS.gmaps||'',googleBad:()=>!!KS.bad.gmaps,arrived:()=>routeDirty(),
  keyBroken(){KS.bad.google=true;KS.msg.gmaps='✕ 키가 맞지 않거나 이 API가 켜져 있지 않아요'}});
const routeDirty=PIECES.routeDirty;   // redraw once routes arrive (not while typing or a sheet is open): app/flow/pieces.ts
// ---------- map: app/ui/map.ts (Leaflet, loaded only when opened) ----------
const MAP=window.JEPI_UI.map, mapTop=MAP.mapTop, mapTopAct=MAP.mapTopAct;
// ---------- 더보기: trip summary, 준비하기 badge, P-mode short menu ----------
// the menu's numbers, 이번 여행's rows and auto-save, 취향's style rows: app/flow/more.ts
const MORE=window.JEPI_UI.flow.more;
MORE.connect({partsDay:p=>partsDay(p),partHomeBox:p=>partHomeBox(p)});
const prepLeft=MORE.prepLeft, warnTotal=MORE.warnTotal, renderMore=MORE.renderMore, renderMeRows=MORE.renderMeRows, meSetBudgetHint=MORE.meSetBudgetHint,
  meSetMsg=MORE.meSetMsg, autoSave=MORE.autoSave, carryTaste=MORE.carryTaste, renderTasteStyle=MORE.renderTasteStyle;
// ---------- settings ----------
// the theme (saved on this device); 설정 itself (theme, time spacing, keys, models, backup, 모두 초기화): app/flow/settings.ts
KS.theme=LS.get('jepi.theme','light');
SETF.connect({wipeAll:()=>wipeAll(),mypView:()=>mypView()});
const applyTheme=SETF.applyTheme, KEY_HELP=SETF.KEY_HELP, isBad=SETF.isBad, settingsAct=SETF.settingsAct, renderSettings=SETF.renderSettings, importAll=SETF.importAll;
// ---------- share link (no server): the plan travels inside the link ----------
// making and opening share links, and the short message at the bottom (showToast): app/flow/share.ts
const SHARE=window.JEPI_UI.flow.share;
SHARE.connect({openNotebook:()=>openNotebook()});
const shareLink=SHARE.shareLink, openShared=SHARE.openShared, showToast=SHARE.showToast;
// ---------- phase strip: before / during / after the trip ----------
// the strip, opening today's plan at start-up, redrawing around the schedule, the 여행 노트: app/flow/phase.ts
const PHASE=window.JEPI_UI.flow.phase;
PHASE.connect({warnTotal:()=>warnTotal(),prepLeft:()=>prepLeft(),renderMore:()=>renderMore(),renderMeRows:()=>renderMeRows(),renderTasteStyle:()=>renderTasteStyle(),autoSave:()=>autoSave()});
PHASE.init();   // the ♥ 담은 곳 button, 이번 여행 / 취향 auto-save and the AI box's seconds start here, as before
const startupFocus=PHASE.startupFocus, renderPlanBtn=PHASE.renderPlanBtn, renderExt=PHASE.renderExt, mapCardAct=PHASE.mapCardAct;
// ---------- AI-found places, chat folding ----------
// the places the AI just found (✨ 방금 찾은 곳), folding the chat, the places a chat message suggests: app/flow/chat.ts
const FRESH=CHAT.fresh;
// ================= 내 장소 (집·회사·…) — on this device and the account, never in share links =================
// The list, saving, location and address search live in app/data/myplaces.ts and app/data/kakao.ts; the section in 설정
// handles its own buttons (app/screens/MyPlacesSection.tsx). Here: the names the rest of the old code uses.
JD.kakao.connectKakao(()=>KEYS.kakao||'');
JD.myplaces.connectMyPlaces({redraw:()=>renderSettings(),syncSoon:()=>syncSoon()});
const MYP=JD.myplaces.list;   // the same array (changed in place)
const mypView=PIECES.mypView;   // what the section shows: app/flow/pieces.ts
// ---------- 오가는 길 → 출발지 (집, 내 장소). The 🎲 sheet itself: app/flow/dice.ts ----------
// trip departure from 집 (내 장소)
const KR_AIR=PIECES.KR_AIR, partHomeBox=PIECES.partHomeBox;   // 오가는 길 → 출발지: app/flow/pieces.ts
// ---------- 🎲 뭐 하지 → 📌 이 코스 저장: a new 하루 코스 plan: app/flow/course.ts (the rolling itself: app/flow/dice.ts) ----------
const COURSE=window.JEPI_UI.flow.course;
COURSE.connect({carryTaste:(a,b)=>carryTaste(a,b)});
const saveCourse=COURSE.saveCourse;
// ================= intro: sky, slogan, gentle motion =================
// the intro, the header's plan menu, the 🎲 button's motion and keeping it out of the P board's way: app/flow/header.ts
const HEAD=window.JEPI_UI.flow.header;
HEAD.init();   // the menu's tap-outside / Esc listeners and the scroll watchers start here, as before
const introRun=HEAD.introRun, planMenu=HEAD.planMenu, planMenuAct=HEAD.planMenuAct, diceOpenAnim=HEAD.diceOpenAnim, diceCloseAnim=HEAD.diceCloseAnim, fabDodge=HEAD.fabDodge;
// ================= 기기 간 동기화 (Supabase, 본인 계정 데이터만) =================
// which part of the 동기화 section shows and the last error live in app/data/account.ts (ACC.state)
const ACC=JD.account;
const syncOn=JD.server.syncOn;
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
    if(keysPulled){KS.bad={};if(STANDALONE)UI.sample=makeSample();renderAll();showToast('AI·지도 키도 받아왔어요')}
    if(changed){renderPlans();renderExt()} if(UI.tab==='settings')renderSettings();
    for(const f of SYNC_AFTER_PULL){try{await f()}catch(e){console.warn(e)}}
  }
});
// what the 동기화 section shows, and a tapped login link coming back: app/flow/settings.ts (syncView, syncBoot)
const syncView=SETF.syncView, syncBoot=SETF.syncBoot;
// the section's buttons and forms work by themselves (app/data/account.ts); they ask the old code to redraw and to sync
ACC.connectAccount({redraw:()=>renderSettings(),toast:m=>showToast(m),syncNow:()=>syncNow()});

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
// travel between places, opening hours and the day check: app/data/check.ts
const CK=JD.check, travel=CK.travel;
const analyze=CK.analyze;

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
const setZoom=RENDER.setZoom, drawTrayTop=RENDER.drawTrayTop, trayAct=RENDER.trayAct, renderTray=RENDER.renderTray, tabs=RENDER.tabs, renderTabs=RENDER.renderTabs, drawBanner=RENDER.drawBanner, renderAI=RENDER.renderAI, renderAll=RENDER.renderAll;
// ---------- actions ----------
// putting a place in the 일정표, and the block sheet: app/flow/render.ts
const place=RENDER.place, openSheet=RENDER.openSheet, closeSheet=RENDER.closeSheet;
// ---------- start over: wipe everything this browser keeps for the page; the first-use guide: app/flow/guide.ts ----------
const GUIDE=window.JEPI_UI.flow.guide;
const wipeAll=GUIDE.wipeAll, drawCoach=GUIDE.drawCoach, coachAct=GUIDE.coachAct, showCoach=GUIDE.showCoach, maybeCoach=GUIDE.maybeCoach;
// ---------- events ----------
// tabs, the clicks that work anywhere, 경고 해결, 더보기 rows, 알려 주세요, place cards: app/flow/events.ts
const EVT=window.JEPI_UI.flow.events;
EVT.init();   // the page-wide listeners start here, in the same order as before
const goTab=EVT.goTab, fixWarns=EVT.fixWarns, moreAct=EVT.moreAct, nudgeAct=EVT.nudgeAct, placeAct=EVT.placeAct;
// presses on the 일정표 and around it (block sheet, empty time, Day buttons, 간식비, 준비하기, AI box, 취향 키워드, drag & drop):
// app/flow/schedule.ts. What it still needs from the old code is connected here.
const SCHED=window.JEPI_UI.flow.schedule;
SCHED.connect({hero:p=>hero(p),diceFrom:t=>DFLOW.diceFrom(t),openCustom:(id,st)=>openCustom(id,st),
  makePairBlock:(uid,k)=>makePairBlock(uid,k),genSeason:id=>genSeason(id),fixWarns:()=>fixWarns()});
const blockAct=SCHED.blockAct, checksAct=SCHED.checksAct, aiboxAct=SCHED.aiboxAct, gridAct=SCHED.gridAct, kwAct=SCHED.kwAct, dropped=SCHED.dropped;
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
const hoursSweep=()=>JD.hours.sweep();
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
// the screen side (invites, joining, 가고 싶어요, the panel, a friend's new version): app/flow/friends.ts
const FRND=window.JEPI_UI.flow.friends;
FRND.connect({renderExt:()=>renderExt(),renderMore:()=>renderMore()});
FRND.init();   // joins the sync work, the card / sheet / block extras and the panels here, in the same order as before
var TRIPS=FRND.TRIPS;
const curShared=FRND.curShared, joinFromUrl=FRND.joinFromUrl, joinPending=FRND.joinPending, wantAct=FRND.wantAct, tripAct=FRND.tripAct;
// ---------- one place-finding screen, many doors ----------
// Every "find places" button opens this same sheet with its conditions already picked:
//   어디 (near today's plan / one area / whole city) · 언제 (a free gap / any time) · 넣을 곳 (schedule / list only)
// Results always come back with the same three choices as chat: 일정에 넣기 / 장소에만 / 안 함.
// Chat and 🎲 DICE keep their own way of asking; only how results are kept is shared.
// the sheet, the AI asking and what happens to each result: app/flow/find.ts
const FINDF=window.JEPI_UI.flow.find;
const openFind=FINDF.openFind, findAct=FINDF.findAct;
// ---------- 알림: push notifications while travelling ----------
// The server / device side and the settings live in app/data/alerts.ts, which reminders and time zones in
// app/logic/alerts.ts; the trip side (which blocks ring, 🔔 badge and sheet row, the panel): app/flow/notify.ts
const NOTF=window.JEPI_UI.flow.notify;
NOTF.connect({renderMore:()=>renderMore()});
NOTF.init();   // the 🔔 badge, the sheet row and the panel join the lists here, in the same order as before
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
// catching it while typing a name, the "같은 곳 같아요" cards and merging: app/flow/find.ts
FINDF.init();   // the two listeners (use the place already there / places with a similar name), at this point as before
const dupOf=FINDF.dupOf, dupInfo=FINDF.dupInfo;
// local test hooks (tools/checks.js)
if(/^(localhost|127\.0\.0\.1)$/.test(location.hostname)&&window.__jepi) Object.assign(window.__jepi,{
  dupTest(){const a=P.find(p=>!p.custom&&!p.drop&&!CUR.placed.some(b=>b.id===p.id));const b=Object.assign({},a,{id:'dupx',name:a.name+' 본점'});PK.pack.places.push(b);addPackPlace(b);renderTray();return a.name},
  has:id=>!!PM[id], openCustom:()=>openCustom(), openFind:o=>openFind(o)});
// ---------- day titles the traveler can rename ----------
// profile.dayTitles[d] overrides the automatic "Day 1 · 도착" title (rules: app/logic/memo.ts). The ✎ form is React
// (app/screens/DayTitleForm.tsx, it saves itself); here: the header around it.
const titleEditing=SCHED.titleEditing;   // app/flow/schedule.ts
// what React screens may ask of the old code (app/ui/host.ts)
window.JEPI_UI.connectHost({renderAll:()=>renderAll(),closeSheet:()=>closeSheet(),reopenSheet:()=>{const u=$('#sheet').dataset.uid;if(u&&u!=='dice'&&!$('#sheetBg').hidden)openSheet(u)},toast:m=>showToast(m),day:()=>UI.day,autoTitle:d=>String((DY.days[d]||{}).title||''),titleEditing,
  closeNotebook:()=>closeNotebook(),renamePlan:nm=>lookRenamePlan(nm),aiDayTitles:n=>lookAiTitles(n),errText:(e,w)=>errText(e,w),welcomeNew:()=>{closeWelcome();openOnb()},welcomeDemo:()=>demoEnter(),welcomeLoggedIn:()=>welcomeLoggedIn(),dice:(n,v,m)=>diceAct(n,v,m),place:(n,v)=>placeAct(n,v),plans:(n,v,v2)=>plansAct(n,v,v2),helper:(n,v,v2)=>helperAct(n,v,v2),helperFrame:n=>helperFrameAct(n),dock:(n,v)=>dockAct(n,v),tray:(n,v)=>trayAct(n,v),tab:n=>goTab(n),onbFrame:n=>onbFrameAct(n),hero:n=>heroAct(n),miniDay:s=>{const n=UI.day+s;if(n>=0&&n<DY.days.length){UI.day=n;renderAll()}},mapTop:n=>mapTopAct(n),coach:n=>coachAct(n),banner:()=>{UI.selected=null;renderAll()},chat:(n,v)=>chatAct(n,v),pview:(n,v)=>pviewAct(n,v),kw:(n,v)=>kwAct(n,v),grid:(n,v)=>gridAct(n,v),block:(n,v,o)=>blockAct(n,v,o),checks:(n,v,o)=>checksAct(n,v,o),aibox:(n,v)=>aiboxAct(n,v),settings:(n,v,v2)=>settingsAct(n,v,v2),form:(n,v,o)=>formAct(n,v,o),sum:(n,v)=>sumAct(n,v),trip:(a,u,t)=>tripAct(a,u,t),want:p=>wantAct(p),find:(n,v,t)=>findAct(n,v,t),planMenu:(n,v)=>planMenuAct(n,v),more:id=>moreAct(id),mapCard:i=>mapCardAct(i),dropped:(k,id,m)=>dropped(k,id,m),nudge:(n,v)=>nudgeAct(n,v),importFile:f=>importBackup(f,ok=>{if(ok){maybeCoach()}}),shareNotebook:async()=>{await shareLink(true);return PS.msg||'링크를 만들었어요'}});
// ---------- how a trip looks: theme colour, cover, style, handwriting; folding hero header ----------
// the look, the header and its one-line bar, the 여행 꾸미기 sheet: app/flow/look.ts
const LOOKF=window.JEPI_UI.flow.look;
LOOKF.connect({setJP:m=>setJP(m),planMenu:o=>planMenu(o)});
const hero=LOOKF.hero, heroAct=LOOKF.heroAct, renderLook=LOOKF.renderLook, miniBar=LOOKF.miniBar, heroWatch=LOOKF.heroWatch, lookAiTitles=LOOKF.lookAiTitles, lookRenamePlan=LOOKF.lookRenamePlan;
// ---------- handwritten memos: one line per block, one line per day ----------
// The rules live in app/logic/memo.ts; the memo box in a block's sheet saves itself (app/screens/Extras.tsx MemoBox).
const memoKey=SCHED.memoKey, blockMemoOf=SCHED.blockMemoOf;   // app/flow/schedule.ts
SHEET_EXTRAS.push(it=>it&&it.id?{k:'memo',key:memoKey(it,UI.day),value:blockMemoOf(it,UI.day)}:null);   // drawn by React: Extras.tsx
// ---------- 여행 노트 보기: the whole trip as one notebook (cover + a chapter per day): app/flow/phase.ts ----------
const openNotebook=PHASE.openNotebook, closeNotebook=PHASE.closeNotebook;
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

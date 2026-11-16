// JEPI start-up: what the old script (src/js, one function scope) did when the page loaded, in the same order — the
// names the rest of the start-up uses, connecting the app/flow files to each other, loading the saved trip, and
// starting the app. (It used to be every file in src/js, joined in file-name order.)
import * as D_account from '../data/account';
import * as D_ai from '../data/ai';
import * as D_check from '../data/check';
import * as D_days from '../data/days';
import * as D_demo from '../data/demo';
import * as D_demoOsaka from '../data/demo-osaka';
import * as D_hours from '../data/hours';
import * as D_gplaces from '../data/gplaces';
import * as D_kakao from '../data/kakao';
import * as D_keys from '../data/keys';
import * as D_marks from '../data/marks';
import * as D_myplaces from '../data/myplaces';
import * as D_ops from '../data/ops';
import * as D_places from '../data/places';
import * as D_plans from '../data/plans';
import * as D_recs from '../data/recs';
import * as D_routes from '../data/routes';
import * as D_server from '../data/server';
import * as D_storage from '../data/storage';
import * as D_sync from '../data/sync';
import * as D_trip from '../data/trip';
import * as L_geo from '../logic/geo';
import * as U_extras from '../ui/extras';
import * as U_map from '../ui/map';
import { ui as U_ui } from '../ui/state';
import * as U_status from '../ui/status';
import * as F_chat from './chat';
import * as F_dice from './dice';
import * as F_events from './events';
import * as F_find from './find';
import * as F_forms from './forms';
import * as F_friends from './friends';
import * as F_guide from './guide';
import * as F_header from './header';
import * as F_helper from './helper';
import * as F_look from './look';
import * as F_notify from './notify';
import * as F_phase from './phase';
import * as F_pieces from './pieces';
import * as F_plans from './plans';
import * as F_recs from './recs';
import * as F_render from './render';
import * as F_schedule from './schedule';
import * as F_settings from './settings';
import * as F_share from './share';
import * as F_welcome from './welcome';

/* eslint-disable */
export function boot(): void {
  // ===== 001-data =====
// ---------- data layer (app/data, TypeScript) ----------
// Saving on this device, the server connection, key encryption and the demo sandbox live in app/data/.
// The trip's data (profile, blocks, ♥, plans …) is saved only through TRIP: app/data/trip.ts
const TRIP=D_trip;
// the trip being worked on (profile, placed, custom, fmarks, wish, meals, done, kws) lives in app/data/trip.ts: CUR.placed …
const CUR: any=TRIP.cur;
// the plan list and which plan is open (app/data/trip.ts): PL.plans, PL.curPlan
const PL: any=TRIP.planList;
// the trip's days and the places they start from (app/data/days.ts): DY.days, DY.loc, DY.locArea, DY.locZone, DY.gmpBy, DY.homeMin
const DY=D_days.state;
// how the traveler is described to the AI, and money text (app/data/traveler.ts)


// where the person is in the app (app/ui/state.ts): UI.day, UI.tab, UI.cat, UI.group, UI.zoneOpen, UI.selected, UI.aiState, UI.sample, UI.jp, UI.resetArm
const UI=U_ui;
// what the forms are editing (app/flow/forms.ts): FS.draft, FS.onbStep, FS.talk, FS.destRecs, FS.meOpen …

// the AI chat's state (app/flow/chat.ts): CS.chat, CS.busy, CS.undoSnap, CS.ctl, CS.folded

// 예약 도우미's state (app/flow/helper.ts): HS.step, HS.vibe, HS.hotelRecs, HS.routeInfo, HS.slotPicked …

// 내 계획's state (app/flow/plans.ts): PS.msg, PS.delArm, PS.renaming, PS.showText
const PS=F_plans.ps;
// 설정's state (app/flow/settings.ts): KS.msg, KS.bad, KS.who, KS.models, KS.theme, KS.edit
const KS=F_settings.ks;
// small pieces of the trip screens (J / P, 가볍게 시작, … ): app/flow/pieces.ts
const PIECES=F_pieces;

  // ===== 005-demo-guard =====
// ---------- demo sandbox ----------
// The sandbox itself (copy aside on entering, put back on leaving or on the next launch) is in app/data/demo.ts
// and has already run before this script. DEMO.on is true while the demo is open.
const DEMO=D_demo.DEMO;

  // ===== 007-panels =====
// ---------- extra side panels ----------
// A feature adds a panel with: PANELS.name={render(){…}}  plus  <div id="side-name" hidden> in body.html.
// Opening it: any button with data-tab="name". It is shown under the 더보기 tab.
// Features that ride on the account sync: run after every push / pull (SYNC_AFTER_PUSH / SYNC_AFTER_PULL).
// Little extras drawn by features: on a timeline block, a place card, and the block sheet. The lists: app/ui/extras.ts
const XT=U_extras, PANELS=XT.PANELS, SYNC_AFTER_PUSH=XT.SYNC_AFTER_PUSH, SYNC_AFTER_PULL=XT.SYNC_AFTER_PULL, SHEET_EXTRAS=XT.SHEET_EXTRAS;

  // ===== 010-trip-basics =====

DY.loc={};
// the destination's lists (app/data/places.ts — the same objects, filled again when a destination opens; tokyo.ts until then)
const PLC=D_places, PK: any=PLC.state;
const P=PLC.P, PM=PLC.PM;
DY.locArea={};
DY.locZone={};
const dayStart=D_days.dayStart;   // app/data/days.ts
DY.gmpBy=360; // when to be at the home airport, from the profile
DY.days=[];
const DEFAULT_KW: any[]=[];
   // app/data/traveler.ts
const DEFAULT: any[]=[];

  // ===== 020-profile =====
// ---------- profile: trip facts entered by the viewer ----------
const PROFILE_EXAMPLE=D_plans.PROFILE_EXAMPLE;   // app/data/plans.ts
const clone=(o: any)=>JSON.parse(JSON.stringify(o));
// dates, tidying 여행 정보 and making the days with their fixed blocks: app/data/days.ts (the days themselves: DY.days …)
const buildDays=D_days.buildDays;

  // ===== 030-forms =====
// ---------- forms shared by onboarding and the "내 정보" tab ----------
// What is typed, 처음 설정's steps, the buttons, saving and reading a pasted booking: app/flow/forms.ts. What it still
// needs from the old code is connected here (each one looked up when it runs).
const FFLOW=F_forms;
const isoPlus=FFLOW.isoPlus, openOnb=FFLOW.openOnb, onbFrame=FFLOW.onbFrame, onbFrameAct=FFLOW.onbFrameAct, renderOnb=FFLOW.renderOnb, renderMe=FFLOW.renderMe, formAct=FFLOW.formAct;

  // ===== 040-manual-blocks =====
// ---------- blocks the viewer makes by hand ----------
const addCustomToData=PLC.addCustom;   // app/data/places.ts
// the 직접 만들기 sheet and saving it: app/flow/find.ts
const openCustom=F_find.openCustom;

  // ===== 050-chat =====
// ---------- talk to Claude to change the schedule ----------
// the chat, the dock, the nudges, the header's trip line and ✨ 빈 시간 채우기: app/flow/chat.ts
const CHAT=F_chat;
const dock=CHAT.dock, dockAct=CHAT.dockAct, renderChat=CHAT.renderChat, chatAct=CHAT.chatAct;

  // ===== 060-destination-pack =====
// ---------- destination pack: everything that depends on where the trip goes ----------
// The destination's places and the lists made from them (AREAS, PM …), loading one (loadPack) and checking what the AI
// sends (cleanPack / cleanPlace) live in app/data/places.ts; the open destination is PK.pack.
PK.pack=null;

const addPackPlace=PLC.addPackPlace, loadPack=PLC.loadPack, savePack=PLC.savePack, packFrom=PLC.packFrom;
// after a destination is loaded: other travelers' 👍 places of that city (070-shared-recs.js)
PLC.connectPlaces(()=>{if(RS.status!=='off'){SHARED_IDS.clear();rebuildShared()}});
// status lines ("…하는 중이에요 · 12초 지났어요"), messages and error words: app/ui/status.ts
const STATUS=U_status, errText=STATUS.errText;
// getting a destination ready, more places, 처음 설정's 다음, 여행지 찾기, 이야기하면서 정하기: app/flow/destination.ts



  // ===== 066-demo-osaka =====
// ---------- demo trip: a generic first-timer's Osaka, 3 nights / 4 days ----------
// Used only by "데모 둘러보기" (see 381-welcome-demo.js). No personal taste in here on purpose.
// hours: [open, close] in minutes from midnight · closed: weekdays (0 = Sunday) · cost: [yen per person, note]
// the demo trip's data: app/data/demo-osaka.ts
const demoOsaka=D_demoOsaka.demoOsaka;

  // ===== 070-shared-recs =====
// ---------- 👍 여행자 추천 (app/data/recs.ts: loading, counting, saving on the server) ----------
// Here: how a place becomes a saved entry, and how other travelers' places join this trip's place list.
const REC=D_recs, RS=REC.state;
// how a place becomes a saved entry, other travelers' places joining the list, 👍, sharing a place I made: app/flow/recs.ts
const RECF=F_recs;
RECF.init();   // refresh everyone's 👍 along with the account sync (at this point, so it runs in the same order as before)
const SHARED_IDS=RECF.SHARED_IDS, keepShared=RECF.keepShared, rebuildShared=RECF.rebuildShared, initRecs=RECF.initRecs;

  // ===== 080-todos =====
// ---------- small to-dos attached to blocks (luggage, waiting lists, pick-ups, rentals, cash, tax refund) ----------
// marks, their pairs and warnings, and the sheet's 할 일 표시 box: app/data/marks.ts
const MK=D_marks, MARKS=MK.MARKS;
CUR.fmarks=null;
   // app/data/trip.ts
   // the block that closes a 할 일 표시: app/flow/pieces.ts

  // ===== 090-ai-check =====
// ---------- check AI changes before showing them: simulate, nudge times, report what is left ----------
// The changes themselves (apply, try out on a copy, nudge times) live in app/data/ops.ts; it asks here for the day's warnings.
const OPS=D_ops;
OPS.connectOps({dayStart:(d: any)=>dayStart(d),days:()=>DY.days.length,items:(d: any)=>analyze(d).items,fresh:(id: any)=>FRESH.add(id)});

  // ===== 100-booking =====
// ---------- booking helper: wish list → where to stay → flight times → search links ----------
CUR.wish=[];
// the 예약 도우미 (frame, steps, AI answers in it): app/flow/helper.ts — its state is HS (app/flow/helper.ts hs)
const HELP=F_helper;
const helperAct=HELP.helperAct, helperFrameAct=HELP.helperFrameAct, drawHelperFrame=HELP.drawHelperFrame;

  // ===== 130-style-budget =====
// ---------- optional travel style (every item defaults to "doesn't matter") ----------
// ---------- optional money budget (per person, in 만원) ----------

  // ===== 160-modes-roll =====
// ---------- J / P modes ----------
const setJP=PIECES.setJP;   // J / P, the 하루 코스 form parts
// ---------- DICE: roll for an empty slot ----------
// the 🎲 sheet and the P모드 board (rolling, 이걸로, 코스): app/flow/dice.ts — the rolls and choices live there (DFLOW.st)
const DFLOW=F_dice;
const diceFromUrl=DFLOW.diceFromUrl, diceAct=DFLOW.diceAct, pviewAct=DFLOW.pviewAct;

  // ===== 170-quick-start-pview =====
// ---------- quick start (P, and any one-day course): a few taps ----------
   // 가볍게 시작: app/flow/pieces.ts
// ---------- P view: the day as a board game (drawn by React: app/screens/PView.tsx) ----------

  // ===== 180-plans =====
// ---------- my plans: several saved plans, account sync, sharing ----------
PL.plans=[]; PL.curPlan='';
// switching, making, copying, deleting, renaming plans; opening one; 카톡용 글, files, backups, share links: app/flow/plans.ts
const PLF=F_plans;
const savePlans=PLF.savePlans, snapshotCurrent=PLF.snapshotCurrent, touchPlan=PLF.touchPlan, applyPlanData=PLF.applyPlanData, importBackup=PLF.importBackup, plansAct=PLF.plansAct, renderPlans=PLF.renderPlans;

  // ===== 190-keys-ai-router =====
// ================= JEPI standalone: AI keys, model router, routes, map, panels =================
const STANDALONE=!((window as any).claude&&(window as any).claude.use);
const LS=D_storage; // saved data on this device: app/data/storage.ts
D_keys.load(); const KEYS=D_keys.list;   // app/data/keys.ts (the same object, changed in place)
// the models used (saved on this device); the key list, testing and saving keys: app/flow/settings.ts
KS.models=Object.assign({heavy:'claude-sonnet-5-5',light:'claude-haiku-5-5',gemini:'gemini-3.6-flash'},LS.get('jepi.models',{})||{});
const SETF=F_settings;
const saveKeys=SETF.saveKeys;
// The AI connection (calling Claude / Gemini, retries, switching to the other AI) lives in app/data/ai.ts.
D_ai.connectAI({keys:()=>KEYS,models:()=>KS.models as any,bad:()=>KS.bad,who:(n: any)=>{KS.who=n}});
const makeSample=D_ai.makeSample;
const blankPack=PLC.blankPack;   // app/data/places.ts

  // ===== 200-routes =====
// ---------- routes: Google Routes (abroad), cached on this device ----------
// Asking, the queue and the cache live in app/data/routes.ts; Korea checks and "안내 시작" links in app/logic/geo.ts.
// Here: the names the rest of the old code uses, and when to redraw after routes arrive.
const inKR=L_geo.inKorea, navLink=L_geo.navLink;
const routeProvider=(a: any,b: any)=>D_routes.provider(a,b);
D_routes.connectRoutes({googleKey:()=>KEYS.gmaps||'',googleBad:()=>!!KS.bad.gmaps,arrived:()=>routeDirty(),
  keyBroken(){KS.bad.google=true;KS.msg.gmaps='✕ 키가 맞지 않거나 이 API가 켜져 있지 않아요'}});
const routeDirty=PIECES.routeDirty;   // redraw once routes arrive (not while typing or a sheet is open): app/flow/pieces.ts

  // ===== 210-map =====
// ---------- map: app/ui/map.ts (Leaflet, loaded only when opened) ----------
const MAP=U_map, mapTop=MAP.mapTop, mapTopAct=MAP.mapTopAct;

  // ===== 220-more-menu =====
// ---------- 더보기: trip summary, 준비하기 badge, P-mode short menu ----------
// the menu's numbers, 이번 여행's rows and auto-save, 취향's style rows: app/flow/more.ts



  // ===== 230-settings =====
// ---------- settings ----------
// the theme (saved on this device); 설정 itself (theme, time spacing, keys, models, backup, 모두 초기화): app/flow/settings.ts
KS.theme=LS.get('jepi.theme','light');
const applyTheme=SETF.applyTheme, isBad=SETF.isBad, settingsAct=SETF.settingsAct, renderSettings=SETF.renderSettings;

  // ===== 240-share-link =====
// ---------- share link (no server): the plan travels inside the link ----------
// making and opening share links, and the short message at the bottom (showToast): app/flow/share.ts
const SHARE=F_share;
const shareLink=SHARE.shareLink, openShared=SHARE.openShared, showToast=SHARE.showToast;

  // ===== 250-phase-strip =====
// ---------- phase strip: before / during / after the trip ----------
// the strip, opening today's plan at start-up, redrawing around the schedule, the 여행 노트: app/flow/phase.ts
const PHASE=F_phase;
PHASE.init();   // the ♥ 담은 곳 button, 이번 여행 / 취향 auto-save and the AI box's seconds start here, as before
const startupFocus=PHASE.startupFocus, renderExt=PHASE.renderExt, mapCardAct=PHASE.mapCardAct;

  // ===== 260-chat-places =====
// ---------- AI-found places, chat folding ----------
// the places the AI just found (✨ 방금 찾은 곳), folding the chat, the places a chat message suggests: app/flow/chat.ts
const FRESH=CHAT.fresh;

  // ===== 270-my-places =====
// ================= 내 장소 (집·회사·…) — on this device and the account, never in share links =================
// The list, saving, location and address search live in app/data/myplaces.ts and app/data/kakao.ts; the section in 설정
// handles its own buttons (app/screens/MyPlacesSection.tsx). Here: the names the rest of the old code uses.
D_kakao.connectKakao(()=>KEYS.kakao||'');
D_myplaces.connectMyPlaces({redraw:()=>renderSettings(),syncSoon:()=>syncSoon()});
const MYP=D_myplaces.list;   // the same array (changed in place)
   // what the section shows: app/flow/pieces.ts

  // ===== 280-dice-eat =====
// ---------- 오가는 길 → 출발지 (집, 내 장소). The 🎲 sheet itself: app/flow/dice.ts ----------
// trip departure from 집 (내 장소)
   // 오가는 길 → 출발지: app/flow/pieces.ts

  // ===== 290-dice-do =====
// ---------- 🎲 뭐 하지 → 📌 이 코스 저장: a new 하루 코스 plan: app/flow/course.ts (the rolling itself: app/flow/dice.ts) ----------



  // ===== 300-intro-header =====
// ================= intro: sky, slogan, gentle motion =================
// the intro, the header's plan menu, the 🎲 button's motion and keeping it out of the P board's way: app/flow/header.ts
const HEAD=F_header;
HEAD.init();   // the menu's tap-outside / Esc listeners and the scroll watchers start here, as before
const introRun=HEAD.introRun, planMenuAct=HEAD.planMenuAct;

  // ===== 310-sync =====
// ================= 기기 간 동기화 (Supabase, 본인 계정 데이터만) =================
// which part of the 동기화 section shows and the last error live in app/data/account.ts (ACC.state)
const ACC=D_account;
const syncOn=D_server.syncOn;
function syncSoon(ms?: any){D_sync.syncSoon(ms)}
function syncNow(){return D_sync.syncNow()}
D_sync.connectSync({
  plans:()=>PL.plans, setPlans(p: any){PL.plans=p}, curPlan:()=>PL.curPlan,
  kws:()=>CUR.kws, setKws(k: any){CUR.kws=k},
  myPlaces:()=>MYP, setMyPlaces(m: any){D_myplaces.setAll(m)},
  keys:()=>KEYS, setKeys(k: any){D_keys.replace(k);saveKeys(true)},
  setErr(m: any){ACC.state.err=m},
  async afterPush(){
    if(UI.tab==='settings') renderSettings();
    for(const f of SYNC_AFTER_PUSH){try{await f()}catch(e: any){console.warn(e)}}
  },
  async afterPull({changed,curChanged,keysPulled}: any){
    if(curChanged){const ae=document.activeElement;const editing=(ae&&/^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName))||!$('#sheetBg').hidden||!$('#onb').hidden;
      if(!editing){applyPlanData(curChanged);showToast('다른 기기에서 바꾼 내용을 받아왔어요')} }
    if(keysPulled){KS.bad={};if(STANDALONE)UI.sample=makeSample();renderAll();showToast('AI·지도 키도 받아왔어요')}
    if(changed){renderPlans();renderExt()} if(UI.tab==='settings')renderSettings();
    for(const f of SYNC_AFTER_PULL){try{await f()}catch(e: any){console.warn(e)}}
  }
});
// what the 동기화 section shows, and a tapped login link coming back: app/flow/settings.ts (syncView, syncBoot)
const syncBoot=SETF.syncBoot;
// the section's buttons and forms work by themselves (app/data/account.ts); they ask the old code to redraw and to sync
ACC.connectAccount({redraw:()=>renderSettings(),toast:(m: any)=>showToast(m),syncNow:()=>syncNow()});

  // ===== 320-state =====
// ---------- state ----------
const store=D_storage; // same as LS (app/data/storage.ts)
loadPack(packFrom(store.get('gp.pack',null))||blankPack());
CUR.profile=TRIP.load('profile',null); const firstRun=!CUR.profile||typeof CUR.profile!=='object'; UI.firstRun=firstRun; if(firstRun){CUR.profile=clone(PROFILE_EXAMPLE);Object.assign(CUR.profile,{dest:'',pace:'normal',social:'some',breakfast:true,purpose:'',party:{type:'solo',adults:1,kids:0},flightSet:false,staySet:false,dateSet:false,nightsSet:false,dateUnknown:false,startDate:isoPlus(30)});CUR.profile.stays[0].name='숙소'}
CUR.custom=TRIP.load('custom',[]); if(!Array.isArray(CUR.custom)) CUR.custom=[]; CUR.custom.forEach(addCustomToData);
CUR.placed=TRIP.load('placed',null);
if(!Array.isArray(CUR.placed)) CUR.placed=DEFAULT.map((b: any)=>({...b}));
CUR.placed=CUR.placed.filter((b: any)=>PM[b.id]).map((b: any)=>({uid:TRIP.uids.next(),id:b.id,day:b.day,start:b.start,dur:b.dur||PM[b.id].dur,mk:Array.isArray(b.mk)?b.mk.filter((m: any)=>MARKS[m]):undefined}));
CUR.fmarks=TRIP.load('fmarks',{}); DFLOW.load(); CUR.wish=TRIP.load('wish',[]); if(!Array.isArray(CUR.wish)) CUR.wish=[]; if(!CUR.fmarks||typeof CUR.fmarks!=='object') CUR.fmarks={};
CUR.done=TRIP.load('done',{});
DY.homeMin=60;
CUR.kws=TRIP.kws.load(); if(!Array.isArray(CUR.kws)) CUR.kws=DEFAULT_KW.slice();
CUR.meals=TRIP.load('meals',{}); if(!CUR.meals||typeof CUR.meals!=='object') CUR.meals={};
// where the person is in the app (the open day, tab, picked place, the AI …): app/ui/state.ts, read as UI.day, UI.tab …
// changes to the trip happen in app/data/trip.ts (TRIP.blocks / wish / toggleMark …); not while an AI check tries them out on a copy,
// and blocks first keep the places other travelers shared that they use
TRIP.connectSaving((part: any)=>{if(OPS.state.dry)return false;if(part==='placed')keepShared();return true});
   // saved without uids

  // ===== 330-helpers =====
// ---------- helpers ----------
const $=(s: any)=>document.querySelector(s);
// travel between places, opening hours and the day check: app/data/check.ts
const CK=D_check;
const analyze=CK.analyze;

  // ===== 340-render =====
// ---------- render ----------
// Drawing the 일정표, the 장소 tab, 준비하기, the bottom tabs, the banner, the AI box, 취향 키워드 and the block sheet:
// app/flow/render.ts. What it still needs from the old code is connected here (each one looked up when it runs).
const RENDER=F_render;
const setZoom=RENDER.setZoom, drawTrayTop=RENDER.drawTrayTop, trayAct=RENDER.trayAct, renderTray=RENDER.renderTray, tabs=RENDER.tabs, renderTabs=RENDER.renderTabs, drawBanner=RENDER.drawBanner, renderAI=RENDER.renderAI, renderAll=RENDER.renderAll;

  // ===== 350-actions =====
// ---------- actions ----------
// putting a place in the 일정표, and the block sheet: app/flow/render.ts
const openSheet=RENDER.openSheet, closeSheet=RENDER.closeSheet;

  // ===== 370-reset-guide =====
// ---------- start over: wipe everything this browser keeps for the page; the first-use guide: app/flow/guide.ts ----------
const GUIDE=F_guide;
const drawCoach=GUIDE.drawCoach, coachAct=GUIDE.coachAct, showCoach=GUIDE.showCoach, maybeCoach=GUIDE.maybeCoach;

  // ===== 380-events =====
// ---------- events ----------
// tabs, the clicks that work anywhere, 경고 해결, 더보기 rows, 알려 주세요, place cards: app/flow/events.ts
const EVT=F_events;
EVT.init();   // the page-wide listeners start here, in the same order as before
const goTab=EVT.goTab, moreAct=EVT.moreAct, nudgeAct=EVT.nudgeAct, placeAct=EVT.placeAct;
// presses on the 일정표 and around it (block sheet, empty time, Day buttons, 간식비, 준비하기, AI box, 취향 키워드, drag & drop):
// app/flow/schedule.ts. What it still needs from the old code is connected here.
const SCHED=F_schedule;
const blockAct=SCHED.blockAct, checksAct=SCHED.checksAct, aiboxAct=SCHED.aiboxAct, gridAct=SCHED.gridAct, kwAct=SCHED.kwAct, dropped=SCHED.dropped;

  // ===== 381-welcome-demo =====
// ---------- first screen: 새 여행 만들기 / 이미 계정이 있어요 / 데모 둘러보기 ----------
// The screen is React (app/screens/Welcome.tsx): it keeps its own view, logs in, and asks for these (host in 389-titles.js).
// the first screen, after logging in, the demo: app/flow/welcome.ts
const WELC=F_welcome;
const openWelcome=WELC.openWelcome, closeWelcome=WELC.closeWelcome, welcomeLoggedIn=WELC.welcomeLoggedIn, demoEnter=WELC.demoEnter, demoExit=WELC.demoExit, renderDemoBar=WELC.renderDemoBar;
document.addEventListener('click',(e: any)=>{if(e.target.closest('#demoExit'))demoExit()});
// test hooks (local checks only)
if(/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) (window as any).__jepi={demoEnter,navLink,routeProvider,sync:()=>syncNow(),state:()=>({cur:PL.curPlan,plans:PL.plans.map((p: any)=>({id:p.id,shared:p.shared,role:p.role}))}),demoLikeTrip(){const d=demoOsaka();d.pack.demo=false;applyPlanData({profile:d.profile,pack:d.pack,placed:d.placed});onbFrame({open:false});snapshotCurrent();renderAll()}};

  // ===== 382-tidy =====
// ---------- tidy day screen: one summary line; details open on tap ----------
// The route strip, today's cost, warnings, free gaps and "tell us more" nudges used to sit above the
// timeline all at once. Now one line of chips shows the numbers and each chip opens its part.
const sumAct=SCHED.sumAct;   // app/flow/schedule.ts

  // ===== 383-hours =====
// ---------- 영업시간: real opening hours from Google Places (abroad), AI estimate in Korea ----------
// The lookups, the 30-day cache and the monthly cap live in app/data/hours.ts (rules: app/logic/hours.ts). Here: the trip side.
const hoursSweep=()=>D_hours.sweep();
D_hours.connectHours({placesOnSchedule:()=>[...new Set(CUR.placed.map((b: any)=>b.id))].map((id: any)=>PM[id]).filter(Boolean),googleKey:()=>KEYS.gmaps||'',keyBad:()=>isBad('gmaps'),
  demo:()=>!!DEMO.on,inKorea:(ll: any)=>inKR(ll),city:()=>PK.pack.city||'',changed(){savePack();TRIP.customs.saved();renderAll();touchPlan()}});
// 장소 검색 (app/data/gplaces.ts): 어느 키로 찾을지만 여기서 알려 줘요
D_gplaces.connectGPlaces({googleKey:()=>KEYS.gmaps||'',googleBad:()=>isBad('gmaps'),kakaoKey:()=>KEYS.kakao||'',kakaoBad:()=>isBad('kakao')});

  // ===== 384-trips =====
// ---------- 친구와 함께: shared trips, invite links, 가고 싶어요 ----------
// A shared trip keeps its plan in jepi_trips (one row, `rev` goes up by one on every save).
// Each device remembers the last server version it saw (`base`). When two people change the
// same trip, the three versions are merged per block / per place / per field, so a change to
// day 1 and a change to day 2 both survive; only the very same block edited twice keeps the later one.
// Server tables + rules: see supabase/schema.sql.
// The server side (push / pull / share / invite / join / leave / stop) and the merge rules live in app/data/trips.ts
// and app/data/merge.ts. Here: the screen side. TRIPS is the same object as app/data/trips.ts state (base, members, marks)
// plus what the friends panel shows (invite, msg, busy, stopArm).
// the screen side (invites, joining, 가고 싶어요, the panel, a friend's new version): app/flow/friends.ts
const FRND=F_friends;
FRND.init();   // joins the sync work, the card / sheet / block extras and the panels here, in the same order as before

const joinFromUrl=FRND.joinFromUrl, wantAct=FRND.wantAct, tripAct=FRND.tripAct;

  // ===== 385-find =====
// ---------- one place-finding screen, many doors ----------
// Every "find places" button opens this same sheet with its conditions already picked:
//   어디 (near today's plan / one area / whole city) · 언제 (a free gap / any time) · 넣을 곳 (schedule / list only)
// Results always come back with the same three choices as chat: 일정에 넣기 / 장소에만 / 안 함.
// Chat and 🎲 DICE keep their own way of asking; only how results are kept is shared.
// the sheet, the AI asking and what happens to each result: app/flow/find.ts
const FINDF=F_find;
const openFind=FINDF.openFind, findAct=FINDF.findAct;

  // ===== 386-notify =====
// ---------- 알림: push notifications while travelling ----------
// The server / device side and the settings live in app/data/alerts.ts, which reminders and time zones in
// app/logic/alerts.ts; the trip side (which blocks ring, 🔔 badge and sheet row, the panel): app/flow/notify.ts
const NOTF=F_notify;
NOTF.init();   // the 🔔 badge, the sheet row and the panel join the lists here, in the same order as before

  // ===== 387-help =====
// ---------- 사용 안내 (더보기 → 사용 안내) ----------
// The screen itself is drawn by React: app/screens/HelpPanel.tsx
PANELS.help={render(){
  const box=$('#helpBox'); if(!box) return;
  window.JEPI_UI.mount('help',box,{demoOn:!!DEMO.on,onCoach(){UI.tab='timeline';renderTabs();showCoach(0)},onDemo(){demoEnter()}});
}};

  // ===== 388-dedup =====
// ---------- same place twice: catch it when adding, offer to merge what is already doubled ----------
// "Same place" = within 100 m and a similar name (one contains the other, or most letter pairs match).
// Nothing is merged automatically: a branch of the same chain can sit next door.
// the rules live in app/logic/places.ts
// catching it while typing a name, the "같은 곳 같아요" cards and merging: app/flow/find.ts
FINDF.init();   // the two listeners (use the place already there / places with a similar name), at this point as before

// local test hooks (tools/checks.js)
if(/^(localhost|127\.0\.0\.1)$/.test(location.hostname)&&(window as any).__jepi) Object.assign((window as any).__jepi,{
  dupTest(){const a: any=P.find((p: any)=>!p.custom&&!p.drop&&!CUR.placed.some((b: any)=>b.id===p.id));const b=Object.assign({},a,{id:'dupx',name:a.name+' 본점'});PK.pack.places.push(b);addPackPlace(b);renderTray();return a.name},
  has:(id: any)=>!!PM[id], openCustom:()=>openCustom(), openFind:(o: any)=>openFind(o)});

  // ===== 389-titles =====
// ---------- day titles the traveler can rename ----------
// profile.dayTitles[d] overrides the automatic "Day 1 · 도착" title (rules: app/logic/memo.ts). The ✎ form is React
// (app/screens/DayTitleForm.tsx, it saves itself); here: the header around it.
const titleEditing=SCHED.titleEditing;   // app/flow/schedule.ts
// what React screens may ask of the old code (app/ui/host.ts)
window.JEPI_UI.connectHost({renderAll:()=>renderAll(),closeSheet:()=>closeSheet(),reopenSheet:()=>{const u=$('#sheet').dataset.uid;if(u&&u!=='dice'&&!$('#sheetBg').hidden)openSheet(u)},toast:(m: any)=>showToast(m),day:()=>UI.day,autoTitle:(d: any)=>String((DY.days[d]||{}).title||''),titleEditing,
  closeNotebook:()=>closeNotebook(),renamePlan:(nm: any)=>lookRenamePlan(nm),aiDayTitles:(n: any)=>lookAiTitles(n),errText:(e: any,w: any)=>errText(e,w),welcomeNew:()=>{closeWelcome();openOnb()},welcomeDemo:()=>demoEnter(),welcomeLoggedIn:()=>welcomeLoggedIn(),dice:(n: any,v: any,m: any)=>diceAct(n,v,m),place:(n: any,v: any)=>placeAct(n,v),plans:(n: any,v: any,v2: any)=>plansAct(n,v,v2),helper:(n: any,v: any,v2: any)=>helperAct(n,v,v2),helperFrame:(n: any)=>helperFrameAct(n),dock:(n: any,v: any)=>dockAct(n,v),tray:(n: any,v: any)=>trayAct(n,v),tab:(n: any)=>goTab(n),onbFrame:(n: any)=>onbFrameAct(n),hero:(n: any)=>heroAct(n),miniDay:(s: any)=>{const n=UI.day+s;if(n>=0&&n<DY.days.length){UI.day=n;renderAll()}},mapTop:(n: any)=>mapTopAct(n),coach:(n: any)=>coachAct(n),banner:()=>{UI.selected=null;renderAll()},chat:(n: any,v: any)=>chatAct(n,v),pview:(n: any,v: any)=>pviewAct(n,v),kw:(n: any,v: any)=>kwAct(n,v),grid:(n: any,v: any)=>gridAct(n,v),block:(n: any,v: any,o: any)=>blockAct(n,v,o),checks:(n: any,v: any,o: any)=>checksAct(n,v,o),aibox:(n: any,v: any)=>aiboxAct(n,v),settings:(n: any,v: any,v2: any)=>settingsAct(n,v,v2),form:(n: any,v: any,o: any)=>formAct(n,v,o),sum:(n: any,v: any)=>sumAct(n,v),trip:(a: any,u: any,t: any)=>tripAct(a,u,t),want:(p: any)=>wantAct(p),find:(n: any,v: any,t: any)=>findAct(n,v,t),planMenu:(n: any,v: any)=>planMenuAct(n,v),more:(id: any)=>moreAct(id),mapCard:(i: any)=>mapCardAct(i),dropped:(k: any,id: any,m: any)=>dropped(k,id,m),nudge:(n: any,v: any)=>nudgeAct(n,v),importFile:(f: any)=>importBackup(f,(ok: any)=>{if(ok){maybeCoach()}}),shareNotebook:async()=>{await shareLink(true);return PS.msg||'링크를 만들었어요'}});

  // ===== 389a-look =====
// ---------- how a trip looks: theme colour, cover, style, handwriting; folding hero header ----------
// the look, the header and its one-line bar, the 여행 꾸미기 sheet: app/flow/look.ts
const LOOKF=F_look;
const hero=LOOKF.hero, heroAct=LOOKF.heroAct, miniBar=LOOKF.miniBar, heroWatch=LOOKF.heroWatch, lookAiTitles=LOOKF.lookAiTitles, lookRenamePlan=LOOKF.lookRenamePlan;

  // ===== 389b-memo =====
// ---------- handwritten memos: one line per block, one line per day ----------
// The rules live in app/logic/memo.ts; the memo box in a block's sheet saves itself (app/screens/Extras.tsx MemoBox).
const memoKey=SCHED.memoKey, blockMemoOf=SCHED.blockMemoOf;   // app/flow/schedule.ts
SHEET_EXTRAS.push((it: any)=>it&&it.id?{k:'memo',key:memoKey(it,UI.day),value:blockMemoOf(it,UI.day)}:null);   // drawn by React: Extras.tsx

  // ===== 389c-notebook =====
// ---------- 여행 노트 보기: the whole trip as one notebook (cover + a chapter per day): app/flow/phase.ts ----------
const closeNotebook=PHASE.closeNotebook;

  // ===== 390-boot =====
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
setTimeout(()=>{
  const g=$('#grid'); if(g) window.scrollTo({top:0})},0);
// AI availability
let errT: any=0;
const showErr=(m: any)=>{const b=document.getElementById('errbar');if(!b)return;b.textContent='문제가 생겼어요: '+String(m).slice(0,160);b.hidden=false;clearTimeout(errT);errT=setTimeout(()=>{b.hidden=true},8000)};
window.addEventListener('error',(e: any)=>showErr(e.message||'알 수 없는 오류'));
window.addEventListener('unhandledrejection',(e: any)=>{const r=e.reason;if(r&&r.code==='cancelled')return;showErr((r&&(r.message||r.code))||r)});
initRecs(); heroWatch();
if('serviceWorker' in navigator&&location.protocol==='https:') navigator.serviceWorker.register('sw.js').catch(()=>{});
(async()=>{try{ if((window as any).claude&&(window as any).claude.use){ const s=await (window as any).claude.use('sample'); if(s){UI.sample=s; renderAI(); renderChat(); renderTray(); if(!$('#onb').hidden) renderOnb(); else if(UI.tab==='me') renderMe()} } }catch(_: any){} })();
// iOS Safari only shows :active (press feedback) once the page listens for touches
document.addEventListener('touchstart',()=>{},{passive:true});
}

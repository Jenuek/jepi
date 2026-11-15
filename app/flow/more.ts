// 더보기 (the trip card, its chips, the 준비하기 badge, the P모드 short menu), 이번 여행 (one row per topic, opening only that
// part, saving a moment after a change), and 취향 (the style rows; taste carried into new plans). (It used to be
// src/js/220-more-menu.js.) What the old code still does is passed in once with connect() (Legacy).
import * as trip from '../data/trip';
import * as check from '../data/check';
import { budgetParts } from '../data/traveler';
import { state as DYs, fixProfile, STYLE_ROWS } from '../data/days';
import { ui } from '../ui/state';
import * as FORMS from '../view/forms';
import { fs, pasteBox, commitProfile } from './forms';
import { partDest } from './destination';
import { TRIPS } from './friends';
import { NOTIFY } from './notify';
import * as RND from './render';

/** what the old code still does */
export interface Legacy { partsDay(p: any): any[]; partHomeBox(p: any): any }
let LG: Legacy;
export function connect(l: Legacy): void { LG = l }

const $ = (s: string) => document.querySelector(s) as any;
const mount = (name: string, el: Element, props: any) => (window.JEPI_UI.mount as any)(name, el, props);
const CUR = trip.cur as any, PL = trip.planList as any, DY = DYs as any;
const clone = (o: any) => JSON.parse(JSON.stringify(o));
const STANDALONE = !((window as any).claude && (window as any).claude.use);

let autoT: any=0;
export const tripSummary=()=>FORMS.tripSummary(DY.days);   // app/view/forms.ts
export function prepLeft(){let n=0;document.querySelectorAll('#checks .check-group').forEach((g: any)=>{const h=g.querySelector('h3');if(h&&/예약·준비/.test(h.textContent))n+=g.querySelectorAll('input[data-ck]:not(:checked)').length});return n}
export function warnTotal(){let n=0;for(let d=0;d<DY.days.length;d++)n+=check.analyze(d).items.reduce((a: any,it: any)=>a+it.warns.length,0);return n}
// The menu itself is drawn by React: app/screens/MoreMenu.tsx. Here: the numbers it shows.
export function renderMore(){
  const box=$('#moreBox'); if(!box) return;
  const s=tripSummary(), pr=CUR.profile, b=budgetParts&&budgetParts(pr);
  const tripChips: any[]=pr.kind==='day'?[]:[pr.bookedFlight===false?{text:'교통편 미정',tone:'warn'}:{text:'교통편 예약됨',tone:'ok'},pr.bookedStay===false?{text:'숙소 미정',tone:'warn'}:{text:'숙소 예약됨',tone:'ok'}];
  if(b) tripChips.push({text:`예산 1인 ${Math.round(b.total/10000)}만원`});
  const w=warnTotal(), sp=PL.plans.find((x: any)=>x.id===PL.curPlan&&x.shared);
  mount('more',box,{city:s.city,line:s.line,tripChips,warnCount:w,prepLeft:prepLeft(),
    full:ui.jp!=='P'||fs.moreAll,showToggle:ui.jp==='P',moreAll:fs.moreAll,plansCount:PL.plans.length,
    friendsChip:sp?'👥 '+(((TRIPS&&TRIPS.members[PL.curPlan])||[]).length||'공유 중'):null,
    notifyOn:!!(NOTIFY&&NOTIFY.on),aiOff:!!(STANDALONE&&!ui.sample)});
  RND.tabs({warn:w?String(w):''});
}
// 이번 여행: one row per topic, opens only that part, saves on change
export const meRows=(p: any)=>FORMS.meRows(p,{dest:partDest,day:LG.partsDay,homeBox:LG.partHomeBox,paste:pasteBox});   // app/view/forms.ts
// Drawn by React: app/screens/MeRows.tsx. meSetMsg changes only the message (the open form stays as it is).
let meRev=0, meLast: any=null;
export function renderMeRows(){
  if(!fs.draft) fs.draft=clone(CUR.profile); fixProfile(fs.draft);
  const rows=meRows(fs.draft), op=rows.find((r: any)=>r[0]===fs.meOpen);
  meLast={rows:rows.map(([id,k,v]: any)=>({id,label:k,valueHTML:v})),open:op?fs.meOpen:null,body:op?op[3]():[],msg:fs.autoMsg||'',dayCourse:CUR.profile.kind==='day',rev:++meRev};
  mount('me',$('#meBox'),meLast);
}
export function meSetBudgetHint(h?: any){if(!meLast||!$('#meBox'))return;meLast=Object.assign({},meLast,{body:meLast.body.map((x: any)=>x.f==='budget'?Object.assign({},x,{hint:h}):x)});mount('me',$('#meBox'),meLast)}
export function meSetMsg(m?: any){if(!meLast||!$('#meBox')){return}meLast=Object.assign({},meLast,{msg:m});mount('me',$('#meBox'),meLast)}
export function autoSave(){clearTimeout(autoT);autoT=setTimeout(()=>{if(!fs.draft||!$('#onb').hidden)return;
  const prevDest=CUR.profile.dest;commitProfile(fs.draft);if(prevDest!==CUR.profile.dest)fs.draft.dest=CUR.profile.dest;
  fs.autoMsg='✓ 자동 저장됨 · 일정표에 바로 반영돼요';RND.renderAll();meSetMsg(fs.autoMsg)},500)}
// taste: style rows + keywords + wishes (carried into new plans). The style rows are drawn by React: app/screens/TasteStyle.tsx
export const TASTE_KEYS=['pace','social','breakfast','style'];
export function carryTaste(from?: any, to?: any){TASTE_KEYS.forEach((k: any)=>{if(from&&from[k]!==undefined)to[k]=clone(from[k])})}
let tasteRev=0;
export function renderTasteStyle(){const el=$('#tasteStyle');if(!el)return;if(!fs.draft)fs.draft=clone(CUR.profile);fixProfile(fs.draft);const p=fs.draft;
  mount('tasteStyle',el,{purpose:p.purpose??'',pace:p.pace,solo:p.party.type==='solo',social:p.social,breakfast:p.breakfast,
    rows:STYLE_ROWS,style:clone(p.style||{}),open:fs.styleOpen,msg:fs.autoMsg||'',rev:++tasteRev})}


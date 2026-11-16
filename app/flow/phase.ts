// The strip under the header (before the trip: D-day and what is left to prepare; during: now / next / 안내 시작; after),
// opening today's plan and day at start-up, redrawing what sits around the schedule (renderExt), and the 여행 노트 (the
// whole trip as one read-only notebook: a cover and a chapter per day). (It used to be src/js/250-phase-strip.js and
// 389c-notebook.js.)
import * as trip from '../data/trip';
import * as places from '../data/places';
import * as check from '../data/check';
import { planName } from '../data/plans';
import { state as DYs, dayStart } from '../data/days';
import { yen } from '../data/traveler';
import { navLink } from '../logic/geo';
import { fmt } from '../logic/time';
import { ui } from '../ui/state';
import * as MAP from '../ui/map';
import { lookOf, coverSVG, hero } from './look';
import { blockMemoOf, dayTitleOf, dayMemoOf } from './schedule';
import { ks } from './settings';
import * as SETF from './settings';
import * as PLF from './plans';
import * as RND from './render';
import * as X_more from './more';


const $ = (s: string) => document.querySelector(s) as any;
const mount = (name: string, el: Element, props: any) => (window.JEPI_UI.mount as any)(name, el, props);
const WD = ['일', '월', '화', '수', '목', '금', '토'];
const CUR = trip.cur as any, PK = places.state as any, PL = trip.planList as any, DY = DYs as any;

export const isoOf=(d: any)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export function todayIdx(){const t=isoOf(new Date());return DY.days.findIndex((D: any)=>D.iso===t)}
// drawn by React: app/screens/Phase.tsx
export function renderPhase(){
  const el=$('#phase'); if(!el) return;
  const pr=CUR.profile, t=isoOf(new Date()), D0=DY.days[0], Dn=DY.days[DY.days.length-1];
  const show=(v: any)=>{mount('phase',el,v);el.hidden=v.s==='none'};
  // AI 꺼짐 now lives on the 더보기 → 설정 row only (tidy day screen)
  if(!D0||!D0.iso||pr.dateUnknown){show({s:'none'});return}
  const ti=todayIdx();
  if(ti>=0){
    const now=new Date(), nm=now.getHours()*60+now.getMinutes();
    const items=check.analyze(ti).items.filter((i: any)=>!i.stay||i.start>=nm);
    const cur=items.find((i: any)=>i.start<=nm&&nm<i.end), nx=items.find((i: any)=>i.start>nm);
    let next=null;
    if(nx){const from=cur||[...items].reverse().find((i: any)=>i.end<=nm)||null; const tr=from&&from.ll&&nx.ll?check.travel(from.ll,nx.ll):null;
      next={time:fmt(nx.start),name:String(nx.name),travel:tr?`${tr.real?'':'≈'}${tr.mode} ${tr.min}분`:'',nav:from&&from.ll&&nx.ll?navLink(from.ll,nx.ll,tr?tr.mode:'도보',nx.name):''}}
    show({s:'now',cur:cur?{name:String(cur.name),end:fmt(cur.end)}:null,next,todayDay:ui.day!==ti?ti:null});
  } else if(D0.iso>t){
    const dd=Math.round((+new Date(D0.iso+'T00:00:00')-+new Date(t+'T00:00:00'))/864e5);
    show({s:'before',dd,warns:X_more.warnTotal(),prepLeft:X_more.prepLeft(),miss:[pr.kind!=='day'&&pr.bookedFlight===false?'교통편 미정':'',pr.kind!=='day'&&pr.bookedStay===false?'숙소 미정':''].filter(Boolean)});
  } else if(Dn&&Dn.iso<t) show({s:'after'});
  else show({s:'none'});
}
// open the plan whose dates include today, then today's day, scrolled to now
export function planCovers(id?: any, t?: any){const d=trip.plans.get(id);const p: any=d&&d.profile;if(!p||!p.startDate||p.dateUnknown)return false;
  const s=new Date(p.startDate+'T00:00:00'),e=new Date(s);e.setDate(e.getDate()+(p.kind==='day'?0:(+p.nights||0)));const x=new Date(t+'T00:00:00');return x>=s&&x<=e}
export function startupFocus(){
  const t=isoOf(new Date());
  if(!(DY.days[0]&&DY.days[0].iso&&todayIdx()>=0)){const p=PL.plans.find((p: any)=>p.id!==PL.curPlan&&planCovers(p.id,t));if(p){PLF.openPlan(p.id)}}
  const ti=todayIdx(); if(ti>=0){ui.day=ti;RND.renderAll();
    setTimeout(()=>{const H=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hour'))||60;const g=$('#grid');if(!g)return;
      const now=new Date(), nm=now.getHours()*60+now.getMinutes(); const y=g.getBoundingClientRect().top+window.scrollY+Math.max(0,(nm-dayStart(ui.day))/60*H-140);window.scrollTo({top:y})},80)}
}
export function renderPlanBtn(){const p=PL.plans.find((x: any)=>x.id===PL.curPlan);hero({planName:(p&&p.name)||planName()})}
const inside=(sel: any)=>{const a=document.activeElement;return !!(a&&a.closest&&a.closest(sel))};
export function renderExt(){renderPhase();X_more.renderMore();renderPlanBtn();
  if(ui.tab==='me'&&$('#onb').hidden&&!inside('#meBox'))X_more.renderMeRows();
  if(ui.tab==='pref'&&!inside('#tasteStyle'))X_more.renderTasteStyle();
  if(ui.tab==='settings'&&!inside('#setBox'))SETF.renderSettings();
  if(MAP.state.on){if(MAP.state.lastDay!==ui.day){MAP.state.lastDay=ui.day;MAP.drawMap(true)}else MAP.renderMapCards()}}
// events for the new panels (registered before the main handler; returns early only for its own controls)

// a card under the map (MapCards in Dice.tsx): the map moves to that stop
export const mapCardAct=(...a: any[])=>(MAP.mapCardAct as any)(...a);   // app/ui/map.ts
// autosave for 이번 여행 / 취향 panels

// onboarding: connect AI right on the first screen




let notebookRev=0;
export function notebookInfo(){
  const L=lookOf(), name=(PL.plans.find((x: any)=>x.id===PL.curPlan)||{}).name||planName();
  const D0=DY.days[0]||{}, Dn=DY.days[DY.days.length-1]||{};
  const photo=L.cover==='photo'&&L.photo;
  const cover={photo:photo?String(L.photo):'',svg:photo?'':coverSVG(L.cover,260,156),city:String((PK.pack.city||'TRIP').slice(0,8)),date:String(D0.date||'').replace(/\s.*/,''),name:String(name),
    line:[D0.date&&Dn.date?`${D0.date} — ${Dn.date}`:'',DY.days.length>1?`${DY.days.length-1}박 ${DY.days.length}일`:'하루',L.tagline].filter(Boolean).join(' · ')};
  const days=DY.days.map((D: any,d: any)=>{
    const {items,trans}=check.analyze(d), list=items.filter((i: any)=>!(i.stay&&i!==items[items.length-1]));
    const rows=list.map((it: any,k: any)=>{
      const prev=k?list[k-1]:null, t=prev?trans.find((x: any)=>x.from>=prev.end-5&&x.from<=it.start):null;
      return {mv:t?`↓ ${t.mode} ${t.min}분${t.fare?' · '+yen(t.fare):''}`:'',time:fmt(it.start),name:String(it.name),memo:String(blockMemoOf(it,d)||'')}});
    return {ch:`CHAPTER ${d+1} · ${D.date} ${WD[D.wd]}`,title:String(dayTitleOf(d)),memo:String(dayMemoOf(d)||''),rows};
  });
  return {cover,days,rev:++notebookRev};
}
export function openNotebook(){
  let nb=$('#notebook'); if(!nb){nb=document.createElement('div');nb.id='notebook';nb.className='notebook';nb.setAttribute('role','dialog');nb.setAttribute('aria-label','여행 노트');document.body.appendChild(nb)}
  mount('notebook',nb,notebookInfo()); nb.hidden=false; nb.scrollTop=0; document.body.style.overflow='hidden';
}
export function closeNotebook(){const nb=$('#notebook');if(nb)nb.hidden=true;document.body.style.overflow=''}


/** what the old file did when it loaded (it calls this at the same moment, so the order stays) */
export function init(){
document.addEventListener('click',(e: any)=>{
  const t=e.target.closest('button,a,label,input'); if(!t) return;
  if(t.id==='wishGo'){ui.cat='wish';ui.tab='tray';RND.renderTray();RND.renderTabs();return}
});
document.addEventListener('change',(e: any)=>{if(e.target.closest&&e.target.closest('#meBox,#tasteStyle')&&!e.target.classList.contains('importFile'))X_more.autoSave()});
setInterval(()=>{try{const el=document.getElementById('aiSec');if(!el)return;const L=window.JEPI_UI.live(el),put=(t: any)=>{if(L)L.text(t);else el.textContent=t};   // AiBox.tsx draws it
  if(!ui.aiState||ui.aiState.status!=='loading'){put('');return}
  if(!ui.aiState.t0)ui.aiState.t0=Date.now();put(`${ks.who} · ${Math.round((Date.now()-ui.aiState.t0)/1000)}초째`)}catch(_: any){}},1000);
}

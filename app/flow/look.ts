// How a trip looks: theme colour, cover, style (컬러 블록 / 여행 수첩), handwriting; the folding header (Hero.tsx) and the
// one-line bar that replaces it (Bars.tsx); and the 여행 꾸미기 sheet (LookSheet.tsx keeps its own draft and saves itself).
// profile.look = {color, cover:'city'|'sea'|'mountain'|'none'|'photo', photo:dataURL, tagline, style:'color'|'note', hand}
// lives in the plan's profile, so it syncs and goes to friends on a shared trip. (It used to be src/js/389a-look.js.)
import * as trip from '../data/trip';
import * as places from '../data/places';
import * as asks from '../data/asks';
import { planName } from '../data/plans';
import { state as DYs } from '../data/days';
import { ui } from '../ui/state';
import { dayTitleOf, titleEditing, renderDayMemo } from './schedule';
import * as PLF from './plans';
import * as RND from './render';

/** what the old code still does */
export interface Legacy { setJP(m: string): void; planMenu(open: boolean): void }
let LG: Legacy;
export function connect(l: Legacy): void { LG = l }

const $ = (s: string) => document.querySelector(s) as any;
const mount = (name: string, el: Element, props: any) => (window.JEPI_UI.mount as any)(name, el, props);
const esc = (s: unknown) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as any)[c]);
const WD = ['일', '월', '화', '수', '목', '금', '토'];
const CUR = trip.cur as any, PK = places.state as any, PL = trip.planList as any, DY = DYs as any;

export const LOOK_COLORS=[['#2448c9','코발트'],['#c23b22','노을'],['#0f7a5c','숲'],['#6b2fb3','보라'],['#0e7490','바다'],['#b45309','호박'],['#be185d','체리'],['#2b2a33','먹']];
export const LOOK_HANDS=[['pen','나눔펜','"Nanum Pen Script"'],['gaegu','개구','"Gaegu"'],['melody','하이멜로디','"Hi Melody"']];
export const LOOK_COVERS=[['city','도시'],['sea','바다'],['mountain','산'],['none','없음']];
export const lookOf=()=>Object.assign({color:'#2448c9',pop:'#ffd23f',cover:'city',tagline:'',style:'color',hand:'pen',photo:''},(CUR.profile&&CUR.profile.look)||{});
export function coverSVG(kind?: any, w?: any, h?: any){
  const k=kind||'city';
  if(k==='sea') return `<svg viewBox="0 0 200 120" width="${w}" height="${h}" preserveAspectRatio="xMaxYMax meet"><circle cx="150" cy="38" r="18" fill="var(--pop)"/><path d="M0 92 C40 84,80 100,200 86 V120 H0Z" fill="#fff" fill-opacity=".16"/><path d="M0 104 C50 96,110 114,200 100 V120 H0Z" fill="#000" fill-opacity=".18"/></svg>`;
  if(k==='mountain') return `<svg viewBox="0 0 200 120" width="${w}" height="${h}" preserveAspectRatio="xMaxYMax meet"><circle cx="160" cy="30" r="16" fill="var(--pop)"/><path d="M40 120 L100 50 L130 86 L150 66 L200 120Z" fill="#000" fill-opacity=".2"/><path d="M100 50 L112 64 L88 64Z" fill="#fff" fill-opacity=".7"/></svg>`;
  if(k==='none'||k==='photo') return '';
  return `<svg viewBox="0 0 200 120" width="${w}" height="${h}" preserveAspectRatio="xMaxYMax meet"><circle cx="150" cy="34" r="20" fill="var(--pop)" fill-opacity=".9"/><path d="M0 120 V84 H16 V64 H34 V90 H50 V52 H62 L68 44 L74 52 V92 H96 V70 H116 V96 H134 V60 H150 V88 H170 V74 H200 V120Z" fill="#000" fill-opacity=".18"/></svg>`;
}
// the header is drawn by React (app/screens/Hero.tsx) from heroView; hero({…}) changes some of it and draws again
let heroView: any={artHtml:'',artBg:'',artPhoto:false,jp:'J',planName:'',planOpen:false,meta:'',tag:'',day:'',title:'',sub:'',memo:'',editing:false,slot:false};
export function hero(p?: any){heroView={...heroView,...p};mount('hero',$('#heroMount'),heroView)}
// pressed in the header
export function heroAct(n?: any){
  if(n==='look')openLook();
  else if(n==='J'||n==='P'){LG.setJP(n);RND.renderAll()}
  else if(n==='plan')LG.planMenu((document.getElementById('planMenu') as any).hidden);
  else if(n==='title'){if(!$('#dayTitleIn'))titleEditing(true)}
}
export function renderLook(){
  const L=lookOf(), R=document.documentElement.style, note=L.style==='note';
  R.setProperty('--theme',L.color); R.setProperty('--pop',L.pop);
  R.setProperty('--f-hand',(LOOK_HANDS.find((x: any)=>x[0]===L.hand)||LOOK_HANDS[0])[2]+', cursive');
  document.body.classList.toggle('style-note',note);
  {const photo=L.cover==='photo'&&L.photo, p: any={
    artBg:photo?`linear-gradient(rgba(0,0,0,.35),rgba(0,0,0,.45)),url("${L.photo}")`:'',artPhoto:!!photo,
    artHtml:note?`<div class="stamp"><span>${esc((PK.pack.city||'TRIP').slice(0,8))}</span><b>${esc(((DY.days[0]||{}).date||'').replace(/\s.*/,''))}</b><span>${esc(String(new Date().getFullYear()))}</span></div>`:photo?'':coverSVG(L.cover,190,120),
    tag:L.tagline||''};
  if(DY.days[ui.day]){const D=DY.days[ui.day];p.day=note?`CHAPTER ${ui.day+1} · ${D.date} ${WD[D.wd]}`:`DAY ${String(ui.day+1).padStart(2,'0')} · ${D.date} ${WD[D.wd]}`}
  hero(p)}
  renderDayMemo(); miniUpdate();
}
// --- folding header: the hero scrolls away and a one-line bar takes its place ---
// (drawn by React: app/screens/Bars.tsx, from miniView; miniBar({…}) changes some of it and draws again)
let miniView: any={on:false,day:'',dayHidden:false,title:'',navHidden:false};
export function miniBar(p?: any){miniView={...miniView,...p};mount('mini',$('#miniMount'),miniView)}
export function miniUpdate(){
  const D=DY.days[ui.day]; if(!D) return; const onDay=document.body.dataset.tab==='timeline'||!document.body.dataset.tab;
  miniBar({day:onDay?String(ui.day+1).padStart(2,'0'):'',dayHidden:!onDay,title:onDay?dayTitleOf(ui.day):($('#planName')?$('#planName').textContent:''),navHidden:!onDay||DY.days.length<2});
}
export function heroWatch(){
  const hero=$('#hero'); if(!hero) return;
  let raf=0;
  const on=()=>{raf=0;const h=hero.offsetHeight||1, y=window.scrollY, t=Math.max(0,Math.min(1,y/Math.max(1,h-64)));
    hero.style.setProperty('--fold',t.toFixed(3));
    const mini=y>h-64; if(document.body.classList.contains('mini')!==mini){document.body.classList.toggle('mini',mini);miniBar({on:mini})}};
  addEventListener('scroll',()=>{if(!raf)raf=requestAnimationFrame(on)},{passive:true}); on();
}
// --- 여행 꾸미기 sheet: drawn by React (app/screens/LookSheet.tsx), which keeps its own draft and saves itself ---
let lookRev=0;
export function openLook(){
  const L=lookOf();
  mount('look',$('#sheet'),{name:(PL.plans.find((x: any)=>x.id===PL.curPlan)||{}).name||planName(),tagline:L.tagline||'',style:L.style,color:L.color,cover:L.cover,hand:L.hand,photo:L.photo||'',pop:L.pop,
    colors:LOOK_COLORS,covers:LOOK_COVERS.map(([k,n]: any)=>({k,name:n,svg:coverSVG(k,64,40)})),hands:LOOK_HANDS,
    days:DY.days.map((D: any,i: any)=>({title:((CUR.profile.dayTitles||[])[i])||'',placeholder:String(D.title)})),ai:!!ui.sample,rev:++lookRev});
  $('#sheet').dataset.uid=''; $('#sheetBg').hidden=false;
}
// the question for AI로 지어 보기 (asked by the sheet through the host)
export const lookAiTitles=(tripName: any)=>asks.dayTitles(ui.sample,tripName);   // app/data/asks.ts
export function lookRenamePlan(nm?: any){const p=PL.plans.find((x: any)=>x.id===PL.curPlan);if(p&&nm&&nm!==p.name){p.name=nm;p.custom_name=true;PLF.savePlans()}}

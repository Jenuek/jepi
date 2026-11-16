// The opening sky (intro), the header's plan switcher (PlanMenu.tsx: a postcard per plan with its colour, cover and D-day),
// the 🎲 button's motion (rolls while the page scrolls, the sheet opens out of it and closes back into it), and keeping the
// 🎲 button out of the way of the P board's own dice. (It used to be src/js/300-intro-header.js.)
import * as trip from '../data/trip';
import { ui } from '../ui/state';
import { coverSVG, hero } from './look';
import * as PLF from './plans';
import { ps } from './plans';
import { showToast } from './share';
import * as RND from './render';

const CUR = trip.cur as any, PL = trip.planList as any;
const byId = (id: string) => document.getElementById(id) as any;
const mount = (name: string, el: Element, props: any) => (window.JEPI_UI.mount as any)(name, el, props);

export function introRun(){const el=byId('intro');if(!el)return;
  const calm=matchMedia('(prefers-reduced-motion:reduce)').matches, hold=calm?1300:2300;
  const end=()=>{if(el.classList.contains('out'))return;el.classList.add('out');setTimeout(()=>el.remove(),700)};
  el.addEventListener('click',end); setTimeout(end,hold);}

// ---------- header plan switcher (drop-down) ----------
// drawn by React: app/screens/PlanMenu.tsx
let planMenuRev=0;
export function planMenuInfo(){
  const list=PL.plans.slice().sort((a: any,b: any)=>(a.id===PL.curPlan?-1:b.id===PL.curPlan?1:(b.updated||0)-(a.updated||0)));
  return {rev:++planMenuRev,plans:list.map((p: any)=>({id:String(p.id),cur:p.id===PL.curPlan,past:!!pmPast(p),color:String(pmLook(p).color),coverSVG:pmPast(p)?'':coverSVG(pmLook(p).cover,150,90),
    dday:pmDday(p),name:String(p.name||'이름 없는 계획'),sub:`${p.dates||''}${p.blocks?` · 블록 ${p.blocks}개`:''}`}))};
}
export function planMenu(open?: any){const m=byId('planMenu'),b=byId('planBtn');if(!m||!b)return;
  if(open){PLF.snapshotCurrent();mount('planMenu',m,planMenuInfo());m.style.top=Math.round(b.getBoundingClientRect().bottom+6)+'px';m.hidden=false;hero({planOpen:true});const f=m.querySelector('.pm-item.cur,.pm-item');if(f)f.focus({preventScroll:true})}
  else{m.hidden=true;hero({planOpen:false})}}

// an item in the plan menu (PlanMenu.tsx tells: open a plan, + 새 계획, 계획 관리·공유)
export function planMenuAct(n?: any, v?: any){planMenu(false);
  if(n==='open'){if(v!==PL.curPlan){PLF.openPlan(v);showToast('계획을 바꿨어요')}return}
  if(n==='new'){PLF.newPlan();return}
  ui.tab='plans';PLF.snapshotCurrent();ps.showText=false;PLF.renderPlans();RND.renderTabs()}


// ---------- DICE motion: rolls while the page scrolls, opens out of the die ----------
export const calmMotion=()=>matchMedia('(prefers-reduced-motion:reduce)').matches;

export function diceOpenAnim(){
  const f=byId('diceFab'),sh=byId('sheet'),bg=byId('sheetBg');
  if(!f||!sh||calmMotion()||!f.getClientRects().length)return;
  const a=f.getBoundingClientRect(),b=sh.getBoundingClientRect();
  sh.style.setProperty('--fx',Math.round(a.left+a.width/2-(b.left+b.width/2))+'px');sh.style.setProperty('--fy',Math.round(a.top+a.height/2-(b.top+b.height/2))+'px');
  sh.classList.remove('pop','unpop');bg.classList.remove('bg-out');void sh.offsetWidth;sh.classList.add('pop');bg.classList.add('bg-in');
  f.classList.remove('tap');void f.offsetWidth;f.classList.add('tap');
}
export function diceCloseAnim(){
  const f=byId('diceFab'),sh=byId('sheet'),bg=byId('sheetBg');
  if(!sh||sh.dataset.uid!=='dice'||calmMotion()||!f||!f.getClientRects().length||bg.hidden||sh.classList.contains('unpop'))return false;
  const a=f.getBoundingClientRect(),b=sh.getBoundingClientRect();
  sh.style.setProperty('--fx',Math.round(a.left+a.width/2-(b.left+b.width/2))+'px');sh.style.setProperty('--fy',Math.round(a.top+a.height/2-(b.top+b.height/2))+'px');
  sh.classList.remove('pop');sh.classList.add('unpop');bg.classList.remove('bg-in');bg.classList.add('bg-out');
  setTimeout(()=>{bg.hidden=true;sh.classList.remove('unpop');bg.classList.remove('bg-out')},260);return true;
}


// postcard look for each trip in the menu: its own theme colour, cover and D-day
export function pmProfile(p?: any){return p.id===PL.curPlan?CUR.profile:((trip.plans.get(p.id)||{}).profile||{})}
export function pmLook(p?: any){return Object.assign({color:'#2448c9',cover:'city'},pmProfile(p).look||{})}
export function pmPast(p?: any){const pr=pmProfile(p);if(!pr.startDate||pr.dateUnknown)return false;const e=new Date(pr.startDate+'T00:00:00');e.setDate(e.getDate()+(pr.kind==='day'?0:(+pr.nights||0)));return e<new Date(new Date().toDateString())}
export function pmDday(p?: any){const pr=pmProfile(p);if(!pr.startDate||pr.dateUnknown||pmPast(p))return '';const n=Math.round((+new Date(pr.startDate+'T00:00:00')-+new Date(new Date().toDateString()))/864e5);return n>0?'D-'+n:n===0?'D-DAY':'여행 중'}   // the D-day label (PlanMenu.tsx)

// ---------- the floating 🎲 is there on every tab; in P 모드 it steps aside while the board's own dice is on screen ----------
// (the board's roll button, the rolling die, 내 카드) — so two dice never compete; scrolled past or on another tab, it comes back.
export function fabDodge(){
  // what is really visible: below the folded header bar, above the chat box and the tab bar at the bottom
  let top=0,bot=innerHeight;['#miniBar'].forEach((q: any)=>{const e=document.querySelector(q) as any;if(e&&document.body.classList.contains('mini')){const r=e.getBoundingClientRect();if(r.height)top=Math.max(top,r.bottom)}});
  ['#chat','.tabs'].forEach((q: any)=>{const e=document.querySelector(q);if(e){const r=e.getBoundingClientRect();if(r.height&&r.top>innerHeight/2)bot=Math.min(bot,r.top)}});
  const on=[...document.querySelectorAll('#pview .proll,#pview .pspin,#pview .mcard')].some((el: any)=>{const r=el.getBoundingClientRect();return r.width>0&&r.bottom>top+24&&r.top<bot-24});
  document.body.classList.toggle('fab-dodge',on);
}


/** what the old file did when it loaded (it calls this at the same moment, so the order stays) */
export function init(){
document.addEventListener('click',(e: any)=>{
  if(e.target.closest('#planBtn'))return;   // the button toggles the menu itself (heroAct)
  const m=byId('planMenu'); if(!m||m.hidden)return;
  if(!e.target.closest('#planMenu'))planMenu(false);   // a tap outside closes it
},true);
document.addEventListener('keydown',(e: any)=>{if(e.key==='Escape'){const m=byId('planMenu');if(m&&!m.hidden){planMenu(false);byId('planBtn').focus()}}});
(function(){let raf=0,stopT=0;const fab=()=>byId('diceFab');
  addEventListener('scroll',()=>{if(calmMotion())return;const f=fab();if(!f)return;f.classList.add('rolling');
    if(!raf)raf=requestAnimationFrame(()=>{raf=0;const y=scrollY,c=f.querySelector('.cube');if(!c)return;
      c.style.transform=`rotateX(${(-22+y*0.8).toFixed(0)}deg) rotateY(${(32+y*0.55).toFixed(0)}deg) rotateZ(${(y*0.2).toFixed(0)}deg)`});
    clearTimeout(stopT);stopT=setTimeout(()=>f.classList.remove('rolling'),150)},{passive:true});
})();
(function(){let raf=0;const later=()=>{if(!raf)raf=requestAnimationFrame(()=>{raf=0;fabDodge()})};
  addEventListener('scroll',later,{passive:true}); addEventListener('resize',later);
  const pv=byId('pview'); if(pv&&window.MutationObserver) new MutationObserver(later).observe(pv,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
})();
}

// ================= intro: sky, slogan, gentle motion =================
function introRun(){const el=document.getElementById('intro');if(!el)return;
  const calm=matchMedia('(prefers-reduced-motion:reduce)').matches, hold=calm?1300:2300;
  const end=()=>{if(el.classList.contains('out'))return;el.classList.add('out');setTimeout(()=>el.remove(),700)};
  el.addEventListener('click',end); setTimeout(end,hold);}

// ---------- header plan switcher (drop-down) ----------
// drawn by React: app/screens/PlanMenu.tsx
let planMenuRev=0;
function planMenuInfo(){
  const list=plans.slice().sort((a,b)=>(a.id===curPlan?-1:b.id===curPlan?1:(b.updated||0)-(a.updated||0)));
  return {rev:++planMenuRev,plans:list.map(p=>({id:String(p.id),cur:p.id===curPlan,past:!!pmPast(p),color:String(pmLook(p).color),coverSVG:pmPast(p)?'':coverSVG(pmLook(p).cover,150,90),
    dday:pmDday(p),name:String(p.name||'이름 없는 계획'),sub:`${p.dates||''}${p.blocks?` · 블록 ${p.blocks}개`:''}`}))};
}
function planMenu(open){const m=document.getElementById('planMenu'),b=document.getElementById('planBtn');if(!m||!b)return;
  if(open){snapshotCurrent();window.JEPI_UI.mount('planMenu',m,planMenuInfo());m.style.top=Math.round(b.getBoundingClientRect().bottom+6)+'px';m.hidden=false;b.setAttribute('aria-expanded','true');const f=m.querySelector('.pm-item.cur,.pm-item');if(f)f.focus({preventScroll:true})}
  else{m.hidden=true;b.setAttribute('aria-expanded','false')}}
document.addEventListener('click',e=>{
  const b=e.target.closest('#planBtn'); if(b){planMenu(document.getElementById('planMenu').hidden);return}
  const m=document.getElementById('planMenu'); if(!m||m.hidden)return;
  if(!e.target.closest('#planMenu'))planMenu(false);   // a tap outside closes it
},true);
// an item in the plan menu (PlanMenu.tsx tells: open a plan, + 새 계획, 계획 관리·공유)
function planMenuAct(n,v){planMenu(false);
  if(n==='open'){if(v!==curPlan){openPlan(v);showToast('계획을 바꿨어요')}return}
  if(n==='new'){newPlan();return}
  tab='plans';snapshotCurrent();showText=false;renderPlans();renderTabs()}
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
function pmProfile(p){return p.id===curPlan?profile:((TRIP.plans.get(p.id)||{}).profile||{})}
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

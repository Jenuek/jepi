// ================= intro: sky, slogan, gentle motion =================
function introRun(){const el=document.getElementById('intro');if(!el)return;
  const calm=matchMedia('(prefers-reduced-motion:reduce)').matches, hold=calm?1300:2300;
  const end=()=>{if(el.classList.contains('out'))return;el.classList.add('out');setTimeout(()=>el.remove(),700)};
  el.addEventListener('click',end); setTimeout(end,hold);}

// ---------- header plan switcher (drop-down) ----------
function planMenuHTML(){
  const list=plans.slice().sort((a,b)=>(a.id===curPlan?-1:b.id===curPlan?1:(b.updated||0)-(a.updated||0)));
  return `<div class="pm-list">${list.map(p=>`<button type="button" class="pm-item pm-card${p.id===curPlan?' cur':''}${pmPast(p)?' past':''}" style="--theme:${pmLook(p).color}" role="menuitemradio" aria-checked="${p.id===curPlan}" data-pmopen="${p.id}"><span class="pm-art" aria-hidden="true">${pmPast(p)?'':coverSVG(pmLook(p).cover,150,90)}</span>${pmDday(p)}<span class="pm-t"><b>${esc(p.name||'이름 없는 계획')}</b><small>${esc(p.dates||'')}${p.blocks?` · 블록 ${p.blocks}개`:''}</small></span>${p.id===curPlan?'<span class="pm-ck" aria-hidden="true">✓</span>':''}</button>`).join('')||'<p class="hint">저장된 계획이 없어요.</p>'}</div>
  <div class="pm-acts"><button type="button" class="small-btn primary" data-pmact="new">+ 새 계획</button><button type="button" class="small-btn" data-pmact="manage">계획 관리·공유</button></div>`}
function planMenu(open){const m=document.getElementById('planMenu'),b=document.getElementById('planBtn');if(!m||!b)return;
  if(open){snapshotCurrent();m.innerHTML=planMenuHTML();m.style.top=Math.round(b.getBoundingClientRect().bottom+6)+'px';m.hidden=false;b.setAttribute('aria-expanded','true');const f=m.querySelector('.pm-item.cur,.pm-item');if(f)f.focus({preventScroll:true})}
  else{m.hidden=true;b.setAttribute('aria-expanded','false')}}
document.addEventListener('click',e=>{
  const b=e.target.closest('#planBtn'); if(b){planMenu(document.getElementById('planMenu').hidden);return}
  const m=document.getElementById('planMenu'); if(!m||m.hidden)return;
  const it=e.target.closest('[data-pmopen],[data-pmact]');
  if(it){planMenu(false); if(it.dataset.pmopen){if(it.dataset.pmopen!==curPlan){openPlan(it.dataset.pmopen);showToast('계획을 바꿨어요')}}
    else if(it.dataset.pmact==='new'){newPlan()} else {tab='plans';snapshotCurrent();showText=false;renderPlans();renderTabs()} return}
  if(!e.target.closest('#planMenu'))planMenu(false);
},true);
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
function pmProfile(p){return p.id===curPlan?profile:((store.get('gp.plan.'+p.id,null)||{}).profile||{})}
function pmLook(p){return Object.assign({color:'#2448c9',cover:'city'},pmProfile(p).look||{})}
function pmPast(p){const pr=pmProfile(p);if(!pr.startDate||pr.dateUnknown)return false;const e=new Date(pr.startDate+'T00:00:00');e.setDate(e.getDate()+(pr.kind==='day'?0:(+pr.nights||0)));return e<new Date(new Date().toDateString())}
function pmDday(p){const pr=pmProfile(p);if(!pr.startDate||pr.dateUnknown||pmPast(p))return '';const n=Math.round((new Date(pr.startDate+'T00:00:00')-new Date(new Date().toDateString()))/864e5);return `<span class="pm-dday mono">${n>0?'D-'+n:n===0?'D-DAY':'여행 중'}</span>`}

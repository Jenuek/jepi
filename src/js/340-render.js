// ---------- render ----------
// The day buttons, the budget and the route line are drawn by React: app/screens/DayTop.tsx
const VIEW=window.JEPI_UI.view;   // what each screen shows, worked out in app/view/*.ts
function renderDays(){window.JEPI_UI.mount('days',$('#days'),VIEW.day.dayButtons(UI.day))}
function setZoom(h,quiet){h=h===100?100:60;document.documentElement.style.setProperty('--hour',h+'px');document.querySelectorAll('[data-zoom]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.zoom===h)));if(!quiet){store.set('gp.zoom',h);renderTimeline()}}
let gridRev=0;
function renderTimeline(){
  const D=DY.days[UI.day]; hero({title:dayTitleOf(UI.day)});
  const H=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hour'))||60;
  // drawn by React: app/screens/DayGrid.tsx (its props: app/view/day.ts); badges and memos come from the features that add them
  const T=VIEW.day.timeline(UI.day,H,{badges:it=>extras(BLOCK_BADGES,it,UI.day),memo:it=>blockMemoOf(it,UI.day)});
  {hero({sub:`${D.date} (${WD[D.wd]})`});renderDaySum(T.items,T.trans,gapsOf(UI.day))}
  const grid=$('#grid');
  window.JEPI_UI.mount('grid',grid,{...T.grid,rev:++gridRev});
  grid.style.height=T.height+'px';
  window.JEPI_UI.mount('route',$('#route'),VIEW.day.route(UI.day,T.items,T.trans));
  renderBudget();
  renderPView();
}
const dayCost=JD.check.dayCost;   // app/data/check.ts
function renderBudget(){const B=VIEW.day.budget(UI.day);window.JEPI_UI.mount('budgetSum',$('#budgetSum'),B.sum);window.JEPI_UI.mount('budget',$('#budget'),B.box)}
// the top of the 장소 tab is drawn by React (app/screens/Tops.tsx); #filters and #cards inside it get their own screens
function drawTrayTop(){window.JEPI_UI.mount('trayTop',$('#trayTopMount'),{moreHidden:!UI.sample||!!PK.pack.manual,rec:REC.statusText(PK.pack.city||''),group:UI.group})}
// pressed in the 장소 tab's top
function trayAct(n,v){
  if(n==='group'){UI.group=v;renderTray()}
  else if(n==='open')renderTray();
  else if(n==='more')openFind({where:'city',into:'list',q:v,autorun:true})
}
function renderTray(){
  recsMaybe(); drawTrayTop();
  // drawn by React: app/screens/Tray.tsx (its props: app/view/tray.ts)
  const V=VIEW.tray.tray({day:UI.day,cat:UI.cat,group:UI.group,zoneOpen:UI.zoneOpen,openOnly:$('#openOnly').checked,selected:UI.selected,pmode:UI.jp==='P',ai:!!UI.sample,manual:!!PK.pack.manual,
    fresh:FRESH,shared:!!curShared(),dups:dupInfo(),extras:p=>extras(CARD_EXTRAS,p)});
  window.JEPI_UI.mount('trayFilters',$('#filters'),{...V.filters,rev:++trayRev});
  window.JEPI_UI.mount('trayCards',$('#cards'),{...V.cards,rev:++trayRev});
}
let trayRev=0;
// an empty time in the 일정표 was tapped: places that fit there (drawn by React: BlockSheet.tsx FillSheet; props: app/view/tray.ts)
function openFill(t){
  window.JEPI_UI.mount('fill',$('#sheet'),{rev:++sheetRev,...VIEW.tray.fill(UI.day,t)});
  $('#sheet').dataset.uid=''; $('#sheetBg').hidden=false;
  setTimeout(()=>{const b=$('#sheet button');b&&b.focus()},0);
}
function renderChecks(){
  const groups=[];
  const warnRows=[], prepRows=[];
  DY.days.forEach((D,i)=>{const {items}=analyze(i);
    items.forEach(it=>{ it.warns.forEach(w=>warnRows.push({d:i,uid:it.uid,t:`${it.name}: ${w}`}));
      if(it.kind==='place'&&it.p.check) prepRows.push({id:'p-'+it.id,d:i,t:it.p.check,s:it.name});
      if(it.kind==='place'&&it.p.verify) prepRows.push({id:'v-'+it.id,d:i,t:`${it.p.verify} 확인`,s:it.name}); });
  });
  if(markWarnings().needTax) prepRows.push({id:'tax-'+cityKey(),d:DY.days.length-1,t:'쇼핑 일정이 있어요 · 면세 환급을 어디서 할지 🧾 표시를 붙여 두세요',s:'매장 또는 출국 공항'});
  tabs({warn:warnRows.length?String(warnRows.length):''}); $('#warnCount2').textContent=warnRows.length?' '+warnRows.length:'';
  dock({fixHidden:!(warnRows.length&&UI.sample),fixText:`🛠 경고 ${warnRows.length}개 해결`});
  // drawn by React: app/screens/Checks.tsx
  window.JEPI_UI.mount('checks',$('#checks'),{ai:!!UI.sample,warns:warnRows.map(r=>({d:r.d,uid:String(r.uid),t:r.t})),prep:prepRows.map(r=>ckInfo(r.id,r.t,`Day ${r.d+1} · ${r.s}`)),
    season:seasonInfo(),all:STATIC_CHECKS.map(s=>ckInfo(s.id,s.t)),resetArm:!!UI.resetArm,rev:++checksRev});
}
let checksRev=0;
function ckInfo(id,t,sub){return {id,t:String(t),sub,on:!!CUR.done[id]}}
// the bottom tabs are drawn by React (app/screens/Bars.tsx); tabs({…}) changes some of it and draws again
let tabsView={shown:'timeline',warn:''};
function tabs(p){tabsView={...tabsView,...p};window.JEPI_UI.mount('tabs',$('#tabsMount'),tabsView)}
function renderTabs(){setTimeout(fabDodge,0);   // the 🎲 button shows on every tab (300-intro-header.js fabDodge)
  const wide=matchMedia('(min-width:900px)').matches;
  const grp={check:'more',pref:'more',me:'more',plans:'more',settings:'more'}; Object.keys(PANELS).forEach(k=>grp[k]='more');
  const shown=wide&&UI.tab==='timeline'?'tray':(grp[UI.tab]||UI.tab);
  tabs({shown});
  document.body.dataset.tab=grp[UI.tab]||UI.tab;
  $('#panel-timeline').hidden=!wide&&UI.tab!=='timeline';
  $('#panel-side').hidden=!wide&&UI.tab==='timeline';
  const sides=['tray','check','pref','me','more','plans','settings','map',...Object.keys(PANELS)];
  const sideTab=sides.includes(UI.tab)&&UI.tab!=='tray'?UI.tab:'tray';
  sides.forEach(k=>{const el=$('#side-'+k);if(el)el.hidden=sideTab!==k});
}
function renderBanner(){
  document.body.classList.toggle('placing',!!UI.selected);
  if(UI.selected){const p=PM[UI.selected];bannerView={open:true,text:`${p.name} (${p.dur}분) · 넣을 시간을 탭하세요`}}else bannerView={...bannerView,open:false};
  drawBanner();
}
// the banner is drawn by React (app/screens/Frames.tsx); it keeps its last text while hidden
let bannerView={open:false,text:''};
function drawBanner(){window.JEPI_UI.mount('banner',$('#bannerMount'),bannerView)}
function renderAI(){
  const box=$('#aiBox'); dock({aiHidden:!UI.sample});
  if(!UI.aiState||UI.aiState.day!==UI.day){box.hidden=true;return}
  box.hidden=false;
  // drawn by React: app/screens/AiBox.tsx
  const st=UI.aiState.status==='loading'?{s:'loading'}:UI.aiState.status==='error'?{s:'error',msg:String(UI.aiState.msg||'')}
    :{s:'done',date:String(DY.days[UI.day].date),dropped:UI.aiState.dropped||0,items:UI.aiState.items.map(x=>({time:`${fmt(x.start)}–${fmt(x.start+PM[x.id].dur)}`,name:String(PM[x.id].name),why:String(x.reason||''),added:!!x.added}))};
  window.JEPI_UI.mount('aiBox',box,{state:st,rev:++aiBoxRev});
}
let aiBoxRev=0;
// Drawn by React: app/screens/TasteKeywords.tsx
function renderPref(){
  const box=$('#prefBox'); if(!box) return;
  const counts=k=>P.filter(p=>tagsOf(p.id).some(t=>norm(t)===norm(k))).length;
  const known=[...new Set([...GENERIC_KW,...Object.values(TAGS).flat()])].filter(t=>!CUR.kws.some(k=>norm(k)===norm(t)));
  window.JEPI_UI.mount('keywords',box,{kws:CUR.kws.map(k=>({k:String(k),n:counts(k)})),known:known.map(String)});
}
const saveKw=()=>{TRIP.kws.save(CUR.kws);LS.set('jepi.kwAt',Date.now());syncSoon();renderPref();renderTray()};
function renderAll(){touchPlan();renderMeta();renderNudges();renderDays();renderTimeline();renderTray();renderChecks();renderPref();renderTabs();renderBanner();renderAI();renderChat();renderExt();renderLook()}


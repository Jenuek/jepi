// ---------- tidy day screen: one summary line; details open on tap ----------
// The route strip, today's cost, warnings, free gaps and "tell us more" nudges used to sit above the
// timeline all at once. Now one line of chips shows the numbers and each chip opens its part.
let sumOpen=null;
function renderDaySum(items,trans,gaps){
  const box=$('#daySum'); if(!box) return;
  const total=trans.reduce((a,t)=>a+t.min,0), c=dayCost(day), warns=items.filter(i=>i.warns.length);
  const nudge=($('#nudges')&&$('#nudges').textContent.trim())?1:0;
  // drawn by React: app/screens/DayTop.tsx
  const chip=(k,t,warn)=>({k,t,warn:!!warn,open:sumOpen===k});
  window.JEPI_UI.mount('daySum',box,{chips:[chip('route',`이동 ${durTxt(total)}`),chip('budget',`${heads()>1?'1인 ':''}${yen(c.yen)}`),
    ...(warns.length?[chip('warn',`확인할 것 ${warns.reduce((a,i)=>a+i.warns.length,0)}`,true)]:[]),...(gaps.length?[chip('gap',`빈 시간 ${gaps.length}`)]:[]),...(nudge?[chip('nudge','💡 더 정확하게')]:[])]});
  if(sumOpen==='warn'&&!warns.length||sumOpen==='gap'&&!gaps.length||sumOpen==='nudge'&&!nudge) sumOpen=null;
  const P0=$('#panel-timeline'); ['route','budget','nudge'].forEach(k=>P0.classList.toggle('sum-'+k,sumOpen===k));
  if(sumOpen==='budget'&&$('#budgetBox')) $('#budgetBox').open=true;
  const body=$('#sumBody');
  const sw=sumOpen==='warn'?warns.map(i=>({uid:String(i.uid),time:fmt(i.start),name:String(i.name),warn:String(i.warns[0])})):[];
  const sg=sumOpen==='gap'?gaps.map(g=>({range:`${fmt(g[0])}–${fmt(g[1])}`,find:sample&&!PK.pack.manual?`${g[0]}-${g[1]}`:null})):[];
  window.JEPI_UI.mount('sumBody',body,{warns:sw,gaps:sg});
  body.hidden=!(sw.length||sg.length);
}
// the day's summary chips (DayTop.tsx DaySum / SumBody tell: a chip opens its list, a warning row opens its block)
function sumAct(n,v){
  if(n==='uid'){openSheet(v);return}
  if(n==='chip'){sumOpen=sumOpen===v?null:v;renderTimeline()}
}

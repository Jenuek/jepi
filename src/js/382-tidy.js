// ---------- tidy day screen: one summary line; details open on tap ----------
// The route strip, today's cost, warnings, free gaps and "tell us more" nudges used to sit above the
// timeline all at once. Now one line of chips shows the numbers and each chip opens its part.
let sumOpen=null;
function renderDaySum(items,trans,gaps){
  const box=$('#daySum'); if(!box) return;
  const total=trans.reduce((a,t)=>a+t.min,0), c=dayCost(day), warns=items.filter(i=>i.warns.length);
  const nudge=($('#nudges')&&$('#nudges').textContent.trim())?1:0;
  const chip=(k,txt,cls)=>`<button type="button" class="sum-chip${cls?' '+cls:''}" data-sum="${k}" aria-expanded="${sumOpen===k}">${txt}</button>`;
  box.innerHTML=[
    chip('route',`이동 ${durTxt(total)}`),
    chip('budget',`${heads()>1?'1인 ':''}${yen(c.yen)}`),
    warns.length?chip('warn',`확인할 것 ${warns.reduce((a,i)=>a+i.warns.length,0)}`,'warn'):'',
    gaps.length?chip('gap',`빈 시간 ${gaps.length}`):'',
    nudge?chip('nudge','💡 더 정확하게'):''].join('');
  if(sumOpen==='warn'&&!warns.length||sumOpen==='gap'&&!gaps.length||sumOpen==='nudge'&&!nudge) sumOpen=null;
  const P0=$('#panel-timeline'); ['route','budget','nudge'].forEach(k=>P0.classList.toggle('sum-'+k,sumOpen===k));
  if(sumOpen==='budget'&&$('#budgetBox')) $('#budgetBox').open=true;
  const body=$('#sumBody');
  if(sumOpen==='warn') body.innerHTML=warns.map(i=>`<button type="button" class="sum-row warn" data-sumuid="${i.uid}"><b class="mono">${fmt(i.start)}</b> ${esc(i.name)}<span>${esc(i.warns[0])}</span></button>`).join('');
  else if(sumOpen==='gap') body.innerHTML=gaps.map(g=>`<div class="sum-row"><b class="mono">${fmt(g[0])}–${fmt(g[1])}</b> 비어 있어요${sample&&!PACK.manual?`<button type="button" class="small-btn" data-findgap="${g[0]}-${g[1]}">채울 곳 찾기</button>`:''}</div>`).join('');
  else body.innerHTML='';
  body.hidden=!body.innerHTML;
}
document.addEventListener('click',e=>{
  const t=e.target.closest('[data-sum],[data-sumuid]'); if(!t) return;
  if(t.dataset.sumuid){openSheet(t.dataset.sumuid);return}
  sumOpen=sumOpen===t.dataset.sum?null:t.dataset.sum; renderTimeline();
});

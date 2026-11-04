// ---------- render ----------
// The day buttons, the budget and the route line are drawn by React: app/screens/DayTop.tsx
function renderDays(){
  window.JEPI_UI.mount('days',$('#days'),{days:DAYS.map((D,i)=>{const n=analyze(i).items.reduce((a,it)=>a+it.warns.length,0);
    return {date:`${D.date} ${WD[D.wd]}`,label:`Day ${i+1}${n?` · 경고 ${n}`:''}`,on:i===day}})});
}
function setZoom(h,quiet){h=h===100?100:60;document.documentElement.style.setProperty('--hour',h+'px');document.querySelectorAll('[data-zoom]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.zoom===h)));if(!quiet){store.set('gp.zoom',h);renderTimeline()}}
let gridRev=0;
function renderTimeline(){
  const DAY_START=dayStart(day);
  const D=DAYS[day]; $('#dayTitle').textContent=dayTitleOf(day);
  const {items,trans}=analyze(day);
  const nPlaced=items.filter(i=>i.kind==='place').length;
  const g=gapsOf(day);
  {$('#daySub').textContent=`${D.date} (${WD[D.wd]})`;renderDaySum(items,trans,g)}
  const H=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hour'))||60;
  const y=m=>(m-DAY_START)/60*H;
  // drawn by React: app/screens/DayGrid.tsx
  const hours=[]; for(let h=DAY_START/60;h<DAY_END/60;h++) hours.push(h);
  const tr=trans.map(t=>({top:y(Math.max(DAY_START,t.from)),h:Math.max(16,t.min/60*H),bad:!!t.bad,text:`${t.real?'':'≈'}${t.mode} ${t.min}분${t.lines?` · ${t.lines}`:''}${t.fare?` · ${yen(t.fare)}`:''}`}));
  const blocks=items.map(it=>{
    const top=y(Math.max(DAY_START,it.start)), hgt=Math.max(30,(it.end-Math.max(DAY_START,it.start))/60*H-2);
    const cls=['blk',it.kind==='fixed'?'fixed':'',it.warns.length?'bad':'',hgt<48?'compact':hgt<72?'short':''].join(' ');
    const full=`${fmt(it.start)}–${fmt(it.end)} ${it.name}${it.marks&&it.marks.length?' · '+it.marks.map(m=>MARKS[m][1]).join(', '):''}${it.warns.length?' · '+it.warns[0]:''}`;
    return {uid:String(it.uid),cls,top,h:hgt,cc:String(it.cc),full,drag:it.kind==='place',time:hgt<48?`${fmt(it.start)} · ${durTxt(it.end-it.start)}`:`${fmt(it.start)}–${fmt(it.end)}`,
      bang:!!it.warns.length,badges:extras(BLOCK_BADGES,it,day),marks:it.marks&&it.marks.length?[...new Set(it.marks.map(m=>MARKS[m][0]))].join(''):'',name:String(it.name),
      memo:blockMemoOf(it,day)||'',loc:hgt>=72?String(it.locName??''):null}});
  // area bands: consecutive blocks (not lodging) in the same area group
  const bands=[], seq=items.filter(i=>!i.stay);
  for(let i=0;i<seq.length;){let j=i;while(j+1<seq.length&&seq[j+1].zone===seq[i].zone)j++;
    if(j>i){const top=y(Math.max(DAY_START,seq[i].start)),bot=y(seq[j].end),zn=ZONES[seq[i].zone];
      bands.push({top,h:Math.max(20,bot-top),title:`${zn} 권역 ${fmt(seq[i].start)}–${fmt(seq[j].end)}`,label:bot-top>90?`${zn.split('·')[0]} 권역`:null})}
    i=j+1}
  const ss=sunsetMin();
  const grid=$('#grid');
  window.JEPI_UI.mount('grid',grid,{hours,trans:tr,blocks,bands,sunset:ss&&ss>DAY_START?{top:y(ss),text:`🌇 일몰 ${fmt(ss)}`}:null,rev:++gridRev});
  grid.style.height=((DAY_END-DAY_START)/60*H)+'px';
  renderRoute(items,trans);
  renderBudget();
  renderPView();
}
function dayCost(d){
  const {items,trans}=analyze(d);
  const act=items.reduce((a,i)=>a+(i.yen||0),0), tr=trans.reduce((a,t)=>a+(t.fare||0),0), meal=mealOf(d), krw=items.reduce((a,i)=>a+(i.krw||0),0);
  return {act,tr,meal,krw,yen:act+tr+meal};
}
function renderBudget(){
  const c=dayCost(day); let tY=0,tK=0; DAYS.forEach((_,i)=>{const x=dayCost(i);tY+=x.yen;tK+=x.krw});
  const bp=budgetParts(), dl=bp?bp.daily/(KRW_PER_JPY||1):0, pct=bp&&dl?Math.round(c.yen/dl*100):0;
  const KRW=PACK.currency==='KRW', h=heads(), one=h>1?' (1인)':'', B=(t,cls)=>({t,tag:'b',cls});
  window.JEPI_UI.mount('budgetSum',$('#budgetSum'),{segs:segs(`💰 오늘 예상${one} `,B(yen(c.yen)),KRW?'':` · 약 ${won(c.yen*KRW_PER_JPY+c.krw)}`,
    ...(bp?[' · ',{t:`예산의 ${pct}%`,tag:'span',cls:pct>100?'over':''}]:[]))});
  const local=bp?bp.local/(KRW_PER_JPY||1):0;
  window.JEPI_UI.mount('budget',$('#budget'),{act:yen(c.act),tr:yen(c.tr),meal:yen(c.meal),step:PACK.step,home:c.krw?won(c.krw):'',
    bar:bp?{pct,over:pct>100,line:segs('하루 현지 예산 ',B(yen(dl),'mono'),` 중 ${pct}% 사용`,...(pct>100?[' · ',{t:`${yen(c.yen-dl)} 넘어요`,tag:'span',color:'#c27a00'}]:[]),
      ' · 여행 전체 현지 예산 ',B(yen(local),'mono'),` 중 ${Math.round(tY/local*100)}%`)}:null,
    totalLabel:`오늘 예상${one}`,total:yen(c.yen),totalSub:KRW?'집 오가는 교통 포함 '+won(c.yen+c.krw):'약 '+won(c.yen*KRW_PER_JPY+c.krw),
    group:h>1?segs(`${h}명 합계 오늘 `,B(yen(c.yen*h),'mono'),KRW?'':` (약 ${won((c.yen*KRW_PER_JPY+c.krw)*h)})`,' · 여행 전체 ',B(yen(tY*h),'mono'),KRW?'':` (약 ${won((tY*KRW_PER_JPY+tK)*h)})`):null,
    trip:segs(`여행 전체 현지 예상${one} `,B(yen(tY),'mono'),` ${KRW?'':`(약 ${won(tY*KRW_PER_JPY+tK)}) `}· 쇼핑 제외 · 미리 결제한 교통편·숙소·예약은 제외${rateTxt()}`)});
}
// a line of text and bold/colored parts for React (DayTop.tsx Line): neighbouring text is merged, empty text dropped
function segs(...xs){const out=[];xs.forEach(x=>{if(x==null||x==='')return;if(typeof x==='string'&&typeof out[out.length-1]==='string')out[out.length-1]+=x;else out.push(x)});return out}
function renderRoute(items,trans){
  const stops=[];
  if(day>0) stops.push({area:LOC_AREA[DAYS[day].startLoc]});
  items.forEach((i,k)=>{ if(i.stay&&k!==items.length-1) return; stops.push({area:i.area}) });
  const seq=stops.filter((s,i)=>i===0||s.area!==stops[i-1].area);
  const total=trans.reduce((a,t)=>a+t.min,0);
  const zs=items.filter(i=>!i.stay&&!i.drop).map(i=>i.zone).filter((z,i,a)=>i===0||z!==a[i-1]);
  const seen=new Set(), back=new Set(); zs.forEach(z=>{if(seen.has(z))back.add(z);seen.add(z)});
  window.JEPI_UI.mount('route',$('#route'),{stops:seq.map(x=>String(x.area)),total:durTxt(total),back:back.size?[...back].map(z=>ZONES[z].split('·')[0]).join(', '):''});
}
function dayRefs(){
  const refs=dayItems(day).map(i=>({id:i.id,name:i.stay?`${i.area} 숙소`:i.name,ll:i.ll}));
  if(day>0) refs.push({name:`${LOC_AREA[DAYS[day].startLoc]} 숙소`,ll:LOC[DAYS[day].startLoc].ll});
  return refs;
}
function nearestRef(p,refs){let best=null;for(const r of refs){if(r.id===p.id)continue;const d=km(p.ll,r.ll);if(!best||d<best.d)best={d,r}}return best}
function renderTray(){
  recsMaybe();
  const wd=DAYS[day].wd, openOnly=$('#openOnly').checked; $('#moreForm').hidden=!sample||PACK.manual;
  {const rs=$('#recSt'),h=recStatusHTML();rs.hidden=!h;rs.innerHTML=h}
  document.querySelectorAll('[data-group]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.group===group)));
  const cats=Object.entries(CATS);
  window.JEPI_UI.mount('trayFilters',$('#filters'),{chips:[['all','전체'],['wish','♥'],...(P.some(p=>p.season)?[['season','🗓 시즌']]:[]),...(recState!=='off'?[['users','👍']]:[]),['must','★']],cats,cat,rev:++trayRev});
  const used=new Set(placed.map(b=>b.id));
  const inCat=P.filter(p=>!(cat==='all'&&p.drop)&&(cat==='all'||(cat==='wish'?isWish(p.id):cat==='season'?!!p.season:cat==='must'?!!MUST[p.id]:cat==='users'?(recOf(p)>0||p.shared):p.cat===cat))&&(!openOnly||(!closedOn(p,wd)&&!outOfSeason(p,DAYS[day].iso))));
  const list=inCat.filter(p=>!used.has(p.id));
  const nHidden=inCat.length-list.length;
  // drawn by React: app/screens/Tray.tsx
  const show=(empty,groups)=>window.JEPI_UI.mount('trayCards',$('#cards'),{dups:dupInfo(),hidden:nHidden,empty,groups,rev:++trayRev});
  if(!list.length){show(P.length?'이 조건에서 남은 후보지가 없어요.':sample&&!PACK.manual?'아직 장소 후보가 없어요. 위에서 AI로 찾아보세요.':'장소 후보가 없어요. 타임라인의 "+ 직접 만들기"로 블록을 만들어 쓰세요.',[]);return}
  const refs=dayRefs();
  let rows=list.map(p=>({p,near:nearestRef(p,refs)}));
  const card=x=>cardInfo(x.p,wd,used,x.near);
  const fresh=rows.filter(x=>FRESH.has(x.p.id)); rows=rows.filter(x=>!FRESH.has(x.p.id));
  const freshG=fresh.length?[{kind:'fresh',name:'✨ 방금 찾은 곳',near:true,note:'AI가 새로 찾았어요',cards:fresh.map(card)}]:[];
  if(group==='pop'){ // people's 👍 first (all travelers), then friends' 가고 싶어요, then my ♥
    const fw=p=>curShared()?wantsOf(p.id).length:0;
    rows.sort((a,b)=>recOf(b.p)-recOf(a.p)||fw(b.p)-fw(a.p)||isWish(b.p.id)-isWish(a.p.id)||a.near.d-b.near.d);
    show(null,[...freshG,{kind:'list',cards:rows.map(card)}]);return}
  if(group==='list'){
    rows.sort((a,b)=>isWish(b.p.id)-isWish(a.p.id)||(!!b.p.season)-(!!a.p.season)||(!!MUST[b.p.id])-(!!MUST[a.p.id])||recOf(b.p)-recOf(a.p)||matchKw(b.p.id).length-matchKw(a.p.id).length||a.near.d-b.near.d);
    show(null,[...freshG,{kind:'list',cards:rows.map(card)}]);return}
  const zones={}; rows.forEach(x=>{const z=ZONE_OF[x.p.id]||'outer';(zones[z]=zones[z]||[]).push(x)});
  const order=Object.entries(zones).map(([z,arr])=>{arr.sort((a,b)=>a.near.d-b.near.d);return {z,arr,d:arr[0].near.d}}).sort((a,b)=>a.d-b.d);
  show(null,[...freshG,...order.map((g,i)=>{
    const open=zoneOpen[g.z]??(i<2); const n=g.arr[0].near, t=travel(n.r.ll,g.arr[0].p.ll);
    return {kind:'zone',zone:g.z,name:ZONES[g.z],open,near:i===0,note:i===0?'오늘 일정과 가장 가까워요':`가장 가까운 일정에서 ${t?`${t.mode} 약 ${t.min}분`:'바로'}`,cards:g.arr.map(card)}})]);
}
let trayRev=0;
// one place card (drawn by React: Tray.tsx Card)
function cardInfo(p,wd,used,near){
    const h=hoursFor(p,wd), off=closedOn(p,wd), oos=outOfSeason(p,DAYS[day].iso), mk=matchKw(p.id), T=(c,t)=>({c,t});
    let dist=''; if(near){const t=travel(near.r.ll,p.ll);dist=`${near.r.name}에서 ${t?`${t.mode} 약 ${t.min}분`:'바로 옆'}`}
    const key=off?T('tag w',`${WD[wd]} 휴관`):oos?T('tag w','이 날은 기간 아님'):p.season?T('tag r',`🗓 ${p.season}`):mustOf(p.id)?T('tag r','★ 추천'):mk.length?T('tag kwt',`#${mk[0]}`):null;
    const det=[p.shared||p.fromUsers?T('tag usr',p.userMade?'여행자가 올린 곳':'여행자 추천'):null,
      mustOf(p.id)?T('tag r',`★ ${mustOf(p.id)}`):null,...mk.map(k=>T('tag kwt',`#${k}`)),
      T('tag mono',costOf(p.id)[0]?yen(costOf(p.id)[0]):'무료'),
      h?T('tag mono',`${fmt(h[0])}–${fmt(h[1])}`):T('tag','언제든'),
      p.closed&&p.closed.length?T('tag',`${p.closed.map(w=>WD[w]).join('·')} 휴관`):null,
      p.season&&p.dates?T('tag r',`🗓 ${mdTxt(p.dates[0])||''}~${mdTxt(p.dates[1])||''}`):null,
      p.best&&p.best!=='any'?T('tag',`${BEST_KO[p.best]}에 좋아요`):null,
      p.check?T('tag',`준비: ${p.check}`):null,
      p.gone?T('tag r','폐업했을 수 있어요'):p.hsrc==='google'?T('tag ok','영업시간 확인됨'):p.verify==='영업시간'&&p.ll&&inKR(p.ll)?T('tag','영업시간 추정'):p.verify?T('tag',`확인 필요: ${p.verify}`):null].filter(Boolean);
    return {id:String(p.id),name:String(p.name),sub:`${p.area} · ${p.note}`,cat:String(p.cat),sel:selected===p.id,off:!!(off||oos),dist,wish:!!isWish(p.id),
      vote:recState!=='off'?{on:!!iRec(p),n:recOf(p),locked:recState==='readonly'&&!recPublic()}:null,extras:extras(CARD_EXTRAS,p),dur:p.dur,key,det};
}
function openFill(t){
  const D=DAYS[day], wd=D.wd, {items}=analyze(day);
  const prev=items.filter(i=>i.end<=t).pop()||null;
  const next=items.find(i=>i.start>t)||null;
  const pLl=prev?prev.ll:LOC[D.startLoc].ll, pName=prev?(prev.stay?`${prev.area} 숙소`:prev.name):`${LOC_AREA[D.startLoc]} 숙소`;
  const gS=prev?prev.end:(day===0?arrEnd():480), gE=next?next.start:1440, len=Math.max(0,gE-gS);
  const tm=(a,b)=>(travel(a,b)||{min:0}).min;
  const base=next?tm(pLl,next.ll):0;
  const used=new Set(placed.map(b=>b.id));
  const carrying=prev?!!prev.carryAfter:false;
  const rows=P.filter(p=>!used.has(p.id)).map(p=>{
    const tin=tm(pLl,p.ll), tout=next?tm(p.ll,next.ll):0, h=hoursFor(p,wd);
    let start=Math.ceil(Math.max(t,gS+tin)/15)*15; if(h&&start<h[0]) start=Math.ceil(h[0]/15)*15;
    const end=start+p.dur; let why='';
    if(carrying&&!p.drop&&!['walk','trip'].includes(p.cat)) why='짐을 맡긴 뒤에 가능';
    else if(!carrying&&p.drop) why='들고 있는 짐이 없어요';
    else if(closedOn(p,wd)) why=`${WD[wd]}요일 휴관`;
    else if(h&&end>h[1]) why=`영업 ${fmt(h[0])}–${fmt(h[1])}`;
    else if(end+tout>gE) why='시간이 모자라요';
    return {p,tin,tout,start,extra:tin+tout-base-(carrying&&p.drop?1000:0),why};
  });
  rows.forEach(r=>{r.mk=matchKw(r.p.id);r.score=Math.min(r.mk.length,4)*10+(MUST[r.p.id]?15:0)-r.extra*0.6});
  const fitAll=rows.filter(r=>!r.why).sort((a,b)=>b.score-a.score||a.start-b.start);
  const fit=fitAll.slice(0,7); const rest=fitAll.slice(7);
  if(rest.length){const r=rest[Math.floor(Math.random()*rest.length)];r.random=true;fit.push(r)}
  const dim=rows.filter(r=>r.why).sort((a,b)=>a.extra-b.extra).slice(0,4);
  // drawn by React: app/screens/BlockSheet.tsx FillSheet
  const row=r=>({id:String(r.p.id),cat:String(r.p.cat),name:String(r.p.name),random:!!r.random,star:!!MUST[r.p.id],kws:(r.mk||[]).map(String),mustNote:'',
    line:[`${r.p.area} · ${r.p.dur}분 · ${costOf(r.p.id)[0]?yen(costOf(r.p.id)[0]):'무료'} · 앞 일정에서 ${r.tin?`약 ${r.tin}분`:'바로'}${next?` · 다음 일정까지 ${r.tout?`약 ${r.tout}분`:'바로'}`:''}`],
    act:r.why?{k:'why',t:r.why}:{k:'fill',start:r.start,time:fmt(r.start)}});
  window.JEPI_UI.mount('fill',$('#sheet'),{rev:++sheetRev,title:`${fmt(gS)}–${fmt(gE)} 비어 있음`,when:`${durTxt(len)} · 앞: ${pName}${next?` · 뒤: ${next.stay?`${next.area} 숙소`:next.name}`:''}`,
    carrying,t,tapped:fmt(t),fit:fit.map(row),dim:dim.map(row)});
  $('#sheet').dataset.uid=''; $('#sheetBg').hidden=false;
  setTimeout(()=>{const b=$('#sheet button');b&&b.focus()},0);
}
function renderChecks(){
  const groups=[];
  const warnRows=[], prepRows=[];
  DAYS.forEach((D,i)=>{const {items}=analyze(i);
    items.forEach(it=>{ it.warns.forEach(w=>warnRows.push({d:i,uid:it.uid,t:`${it.name}: ${w}`}));
      if(it.kind==='place'&&it.p.check) prepRows.push({id:'p-'+it.id,d:i,t:it.p.check,s:it.name});
      if(it.kind==='place'&&it.p.verify) prepRows.push({id:'v-'+it.id,d:i,t:`${it.p.verify} 확인`,s:it.name}); });
  });
  if(markWarnings().needTax) prepRows.push({id:'tax-'+cityKey(),d:DAYS.length-1,t:'쇼핑 일정이 있어요 · 면세 환급을 어디서 할지 🧾 표시를 붙여 두세요',s:'매장 또는 출국 공항'});
  $('#warnCount').textContent=warnRows.length?String(warnRows.length):''; $('#warnCount2').textContent=warnRows.length?' '+warnRows.length:'';
  {const fc=$('#fixWarnChip');fc.hidden=!(warnRows.length&&sample);fc.textContent=`🛠 경고 ${warnRows.length}개 해결`}
  // drawn by React: app/screens/Checks.tsx
  window.JEPI_UI.mount('checks',$('#checks'),{ai:!!sample,warns:warnRows.map(r=>({d:r.d,uid:String(r.uid),t:r.t})),prep:prepRows.map(r=>ckInfo(r.id,r.t,`Day ${r.d+1} · ${r.s}`)),
    season:seasonInfo(),all:STATIC_CHECKS.map(s=>ckInfo(s.id,s.t)),resetArm:!!resetArm,rev:++checksRev});
}
let checksRev=0;
function ckInfo(id,t,sub){return {id,t:String(t),sub,on:!!done[id]}}
function renderTabs(){document.body.classList.toggle('no-fab',!['timeline','tray'].includes(tab));
  const wide=matchMedia('(min-width:900px)').matches;
  const grp={check:'more',pref:'more',me:'more',plans:'more',settings:'more'}; Object.keys(PANELS).forEach(k=>grp[k]='more');
  const shown=wide&&tab==='timeline'?'tray':(grp[tab]||tab);
  document.querySelectorAll('.tabs button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tab===shown)));
  document.body.dataset.tab=grp[tab]||tab;
  $('#panel-timeline').hidden=!wide&&tab!=='timeline';
  $('#panel-side').hidden=!wide&&tab==='timeline';
  const sides=['tray','check','pref','me','more','plans','settings','map',...Object.keys(PANELS)];
  const sideTab=sides.includes(tab)&&tab!=='tray'?tab:'tray';
  sides.forEach(k=>{const el=$('#side-'+k);if(el)el.hidden=sideTab!==k});
}
function renderBanner(){
  document.body.classList.toggle('placing',!!selected);
  $('#banner').hidden=!selected;
  if(selected){const p=PM[selected];$('#bannerText').textContent=`${p.name} (${p.dur}분) · 넣을 시간을 탭하세요`}
}
function renderAI(){
  const box=$('#aiBox'); $('#aiBtn').hidden=!sample;
  if(!aiState||aiState.day!==day){box.hidden=true;return}
  box.hidden=false;
  // drawn by React: app/screens/AiBox.tsx
  const st=aiState.status==='loading'?{s:'loading'}:aiState.status==='error'?{s:'error',msg:String(aiState.msg||'')}
    :{s:'done',date:String(DAYS[day].date),dropped:aiState.dropped||0,items:aiState.items.map(x=>({time:`${fmt(x.start)}–${fmt(x.start+PM[x.id].dur)}`,name:String(PM[x.id].name),why:String(x.reason||''),added:!!x.added}))};
  window.JEPI_UI.mount('aiBox',box,{state:st,rev:++aiBoxRev});
}
let aiBoxRev=0;
// Drawn by React: app/screens/TasteKeywords.tsx
function renderPref(){
  const box=$('#prefBox'); if(!box) return;
  const counts=k=>P.filter(p=>tagsOf(p.id).some(t=>norm(t)===norm(k))).length;
  const known=[...new Set([...GENERIC_KW,...Object.values(TAGS).flat()])].filter(t=>!kws.some(k=>norm(k)===norm(t)));
  window.JEPI_UI.mount('keywords',box,{kws:kws.map(k=>({k:String(k),n:counts(k)})),known:known.map(String)});
}
const saveKw=()=>{TRIP.kws.save(kws);LS.set('jepi.kwAt',Date.now());syncSoon();renderPref();renderTray()};
function renderAll(){touchPlan();renderMeta();renderNudges();renderDays();renderTimeline();renderTray();renderChecks();renderPref();renderTabs();renderBanner();renderAI();renderChat();renderExt();renderLook()}


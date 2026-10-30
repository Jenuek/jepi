// ---------- render ----------
function renderDays(){
  $('#days').innerHTML=DAYS.map((D,i)=>{const n=analyze(i).items.reduce((a,it)=>a+it.warns.length,0);
    return `<button class="day-btn" data-day="${i}" aria-pressed="${i===day}"><b>${D.date} ${WD[D.wd]}</b><span>Day ${i+1}${n?` · 경고 ${n}`:''}</span></button>`}).join('');
}
function setZoom(h,quiet){h=h===100?100:60;document.documentElement.style.setProperty('--hour',h+'px');document.querySelectorAll('[data-zoom]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.zoom===h)));if(!quiet){store.set('gp.zoom',h);renderTimeline()}}
function renderTimeline(){
  const DAY_START=dayStart(day);
  const D=DAYS[day]; $('#dayTitle').textContent=dayTitleOf(day);
  const {items,trans}=analyze(day);
  const nPlaced=items.filter(i=>i.kind==='place').length;
  const g=gapsOf(day);
  {$('#daySub').textContent=`${D.date} (${WD[D.wd]})`;renderDaySum(items,trans,g)}
  const H=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hour'))||60;
  const y=m=>(m-DAY_START)/60*H;
  let html='';
  for(let h=DAY_START/60;h<DAY_END/60;h++){
    html+=`<div class="hour"><span class="lbl">${String(h).padStart(2,'0')}:00</span>`+
      `<button class="slot" style="top:0" data-t="${h*60}" aria-label="${h}시 00분에 넣기"></button>`+
      `<button class="slot half" style="top:calc(var(--hour)/2)" data-t="${h*60+30}" aria-label="${h}시 30분에 넣기"></button></div>`;
  }
  for(const t of trans){
    const top=y(Math.max(DAY_START,t.from)), hgt=Math.max(16,t.min/60*H);
    html+=`<div class="trn${t.bad?' bad':''}" style="top:${top}px;height:${hgt}px"><span class="chip mono">${t.real?'':'≈'}${t.mode} ${t.min}분${t.lines?` · ${esc(t.lines)}`:''}${t.fare?` · ${yen(t.fare)}`:''}</span></div>`;
  }
  for(const it of items){
    const top=y(Math.max(DAY_START,it.start)), hgt=Math.max(30,(it.end-Math.max(DAY_START,it.start))/60*H-2);
    const cls=['blk',it.kind==='fixed'?'fixed':'',it.warns.length?'bad':'',hgt<48?'compact':hgt<72?'short':''].join(' ');
    const full=`${fmt(it.start)}–${fmt(it.end)} ${it.name}${it.marks&&it.marks.length?' · '+it.marks.map(m=>MARKS[m][1]).join(', '):''}${it.warns.length?' · '+it.warns[0]:''}`;
    html+=`<button class="${cls}" style="top:${top}px;height:${hgt}px;--cc:${it.cc}" data-uid="${it.uid}" title="${esc(full)}" aria-label="${esc(full)}" ${it.kind==='place'?'draggable="true"':''}>
      <span class="bt">${hgt<48?`${fmt(it.start)} · ${durTxt(it.end-it.start)}`:`${fmt(it.start)}–${fmt(it.end)}`}</span><span class="bn">${it.warns.length?'<span class="bang" aria-hidden="true">!</span>':''}${extras(BLOCK_BADGES,it,day)}${it.marks&&it.marks.length?`<span class="mks">${[...new Set(it.marks.map(m=>MARKS[m][0]))].join('')}</span> `:''}${esc(it.name)}</span>${blockMemoHTML(it,day)}
      ${hgt>=72?`<span class="ba">${esc(it.locName)}</span>`:''}</button>`;
  }
  // area bands: consecutive blocks (not lodging) in the same area group
  const seq=items.filter(i=>!i.stay);
  for(let i=0;i<seq.length;){let j=i;while(j+1<seq.length&&seq[j+1].zone===seq[i].zone)j++;
    if(j>i){const top=y(Math.max(DAY_START,seq[i].start)),bot=y(seq[j].end),zn=ZONES[seq[i].zone];
      html+=`<div class="zband" style="top:${top}px;height:${Math.max(20,bot-top)}px" title="${esc(zn)} 권역 ${fmt(seq[i].start)}–${fmt(seq[j].end)}">${bot-top>90?`<span>${esc(zn.split('·')[0])} 권역</span>`:''}</div>`}
    i=j+1}
  {const ss=sunsetMin();if(ss&&ss>DAY_START)html+=`<div class="sunline" style="top:${y(ss)}px"><span>🌇 일몰 ${fmt(ss)}</span></div>`}
  const grid=$('#grid'); grid.innerHTML=html; grid.style.height=((DAY_END-DAY_START)/60*H)+'px';
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
  $('#budgetSum').innerHTML=`💰 오늘 예상${heads()>1?' (1인)':''} <b>${yen(c.yen)}</b>${PACK.currency==='KRW'?'':` · 약 ${won(c.yen*KRW_PER_JPY+c.krw)}`}${bp?` · <span class="${pct>100?'over':''}">예산의 ${pct}%</span>`:''}<span class="more">자세히</span>`;
  $('#budget').innerHTML=`<div class="bud-grid">
      <div><span>입장·식사·활동</span><b class="mono">${yen(c.act)}</b></div>
      <div><span>현지 교통</span><b class="mono">${yen(c.tr)}</b></div>
      <div><span>간식·기타</span><b class="mono">${yen(c.meal)}</b><span class="adj"><button class="small-btn" data-meal="-${PACK.step}" aria-label="간식비 줄이기">−</button><button class="small-btn" data-meal="${PACK.step}" aria-label="간식비 늘리기">+</button></span></div>
      ${c.krw?`<div><span>집 오가는 교통</span><b class="mono">${won(c.krw)}</b></div>`:''}
    </div>
    ${bp?`<div class="bud-bar${pct>100?' over':''}"><i style="width:${Math.min(100,pct)}%"></i></div><div class="bud-trip">하루 현지 예산 <b class="mono">${yen(dl)}</b> 중 ${pct}% 사용${pct>100?` · <span style="color:#c27a00">${yen(c.yen-dl)} 넘어요</span>`:''} · 여행 전체 현지 예산 <b class="mono">${yen(bp.local/(KRW_PER_JPY||1))}</b> 중 ${Math.round(tY/(bp.local/(KRW_PER_JPY||1))*100)}%</div>`:''}
    <div class="bud-total"><span>오늘 예상${heads()>1?' (1인)':''}</span><b class="mono">${yen(c.yen)}</b><span class="mono">${PACK.currency==='KRW'?'집 오가는 교통 포함 '+won(c.yen+c.krw):'약 '+won(c.yen*KRW_PER_JPY+c.krw)}</span></div>
    ${heads()>1?`<div class="bud-trip">${heads()}명 합계 오늘 <b class="mono">${yen(c.yen*heads())}</b>${PACK.currency==='KRW'?'':` (약 ${won((c.yen*KRW_PER_JPY+c.krw)*heads())})`} · 여행 전체 <b class="mono">${yen(tY*heads())}</b>${PACK.currency==='KRW'?'':` (약 ${won((tY*KRW_PER_JPY+tK)*heads())})`}</div>`:''}
    <div class="bud-trip">여행 전체 현지 예상${heads()>1?' (1인)':''} <b class="mono">${yen(tY)}</b> ${PACK.currency==='KRW'?'':`(약 ${won(tY*KRW_PER_JPY+tK)}) `}· 쇼핑 제외 · 미리 결제한 교통편·숙소·예약은 제외${rateTxt()}</div>`;
}
function renderRoute(items,trans){
  const stops=[];
  if(day>0) stops.push({area:LOC_AREA[DAYS[day].startLoc]});
  items.forEach((i,k)=>{ if(i.stay&&k!==items.length-1) return; stops.push({area:i.area}) });
  const seq=stops.filter((s,i)=>i===0||s.area!==stops[i-1].area);
  const total=trans.reduce((a,t)=>a+t.min,0);
  const zs=items.filter(i=>!i.stay&&!i.drop).map(i=>i.zone).filter((z,i,a)=>i===0||z!==a[i-1]);
  const seen=new Set(), back=new Set(); zs.forEach(z=>{if(seen.has(z))back.add(z);seen.add(z)});
  $('#route').innerHTML=seq.map((s,i)=>`${i?'<span class="ln" aria-hidden="true"></span>':''}<span class="st"><i aria-hidden="true"></i>${esc(s.area)}</span>`).join('')+
    `<div class="sum mono">이동 합계 약 ${durTxt(total)}${back.size?` · <b>${[...back].map(z=>ZONES[z].split('·')[0]).join(', ')} 쪽을 두 번 오가요</b>`:''}</div>`;
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
  $('#filters').innerHTML=[['all','전체'],['wish','♥'],...(P.some(p=>p.season)?[['season','🗓 시즌']]:[]),...(recState!=='off'?[['users','👍']]:[]),['must','★']].map(([k,v])=>`<button class="fchip" data-cat="${k}" aria-pressed="${cat===k}">${v}</button>`).join('')+`<select id="catSel" class="fsel" aria-label="분류"><option value="">분류 ▾</option>${Object.entries(CATS).map(([k,v])=>`<option value="${k}"${cat===k?' selected':''}>${v}</option>`).join('')}</select>`;
  const used=new Set(placed.map(b=>b.id));
  const inCat=P.filter(p=>!(cat==='all'&&p.drop)&&(cat==='all'||(cat==='wish'?isWish(p.id):cat==='season'?!!p.season:cat==='must'?!!MUST[p.id]:cat==='users'?(recOf(p)>0||p.shared):p.cat===cat))&&(!openOnly||(!closedOn(p,wd)&&!outOfSeason(p,DAYS[day].iso))));
  const list=inCat.filter(p=>!used.has(p.id));
  const nHidden=inCat.length-list.length;
  const hiddenNote=dupHTML()+(nHidden?`<p class="now-hint" style="margin:0 0 4px">일정에 넣은 ${nHidden}곳은 목록에서 숨겼어요.</p>`:'');
  if(!list.length){$('#cards').innerHTML=hiddenNote+`<p class="now-hint">${P.length?'이 조건에서 남은 후보지가 없어요.':sample&&!PACK.manual?'아직 장소 후보가 없어요. 위에서 AI로 찾아보세요.':'장소 후보가 없어요. 타임라인의 "+ 직접 만들기"로 블록을 만들어 쓰세요.'}</p>`;return}
  const refs=dayRefs();
  let rows=list.map(p=>({p,near:nearestRef(p,refs)}));
  const fresh=rows.filter(x=>FRESH.has(x.p.id)); rows=rows.filter(x=>!FRESH.has(x.p.id));
  const freshHTML=fresh.length?`<details class="zone fresh" open><summary><b>✨ 방금 찾은 곳<span class="mono">${fresh.length}</span></b><span class="d near">AI가 새로 찾았어요</span></summary><div class="cards">${fresh.map(x=>cardHTML(x.p,wd,used,x.near)).join('')}</div></details>`:'';
  if(group==='pop'){ // people's 👍 first (all travelers), then friends' 가고 싶어요, then my ♥
    const fw=p=>curShared()?wantsOf(p.id).length:0;
    rows.sort((a,b)=>recOf(b.p)-recOf(a.p)||fw(b.p)-fw(a.p)||isWish(b.p.id)-isWish(a.p.id)||a.near.d-b.near.d);
    $('#cards').innerHTML=hiddenNote+freshHTML+rows.map(x=>cardHTML(x.p,wd,used,x.near)).join('');return}
  if(group==='list'){
    rows.sort((a,b)=>isWish(b.p.id)-isWish(a.p.id)||(!!b.p.season)-(!!a.p.season)||(!!MUST[b.p.id])-(!!MUST[a.p.id])||recOf(b.p)-recOf(a.p)||matchKw(b.p.id).length-matchKw(a.p.id).length||a.near.d-b.near.d);
    $('#cards').innerHTML=hiddenNote+freshHTML+rows.map(x=>cardHTML(x.p,wd,used,x.near)).join('');return}
  const zones={}; rows.forEach(x=>{const z=ZONE_OF[x.p.id]||'outer';(zones[z]=zones[z]||[]).push(x)});
  const order=Object.entries(zones).map(([z,arr])=>{arr.sort((a,b)=>a.near.d-b.near.d);return {z,arr,d:arr[0].near.d}}).sort((a,b)=>a.d-b.d);
  $('#cards').innerHTML=hiddenNote+freshHTML+order.map((g,i)=>{
    const open=zoneOpen[g.z]??(i<2); const n=g.arr[0].near, t=travel(n.r.ll,g.arr[0].p.ll);
    const dtxt=i===0?'오늘 일정과 가장 가까워요':`가장 가까운 일정에서 ${t?`${t.mode} 약 ${t.min}분`:'바로'}`;
    return `<details class="zone" data-zone="${g.z}"${open?' open':''}><summary><b>${esc(ZONES[g.z])}<span class="mono">${g.arr.length}</span></b><span class="d${i===0?' near':''}">${dtxt}</span></summary>
      <div class="cards">${g.arr.map(x=>cardHTML(x.p,wd,used,x.near)).join('')}</div></details>`}).join('');
}
function cardHTML(p,wd,used,near){
    const h=hoursFor(p,wd), off=closedOn(p,wd), oos=outOfSeason(p,DAYS[day].iso), mk=matchKw(p.id);
    let dist=''; if(near){const t=travel(near.r.ll,p.ll);dist=`<div class="dist">${esc(near.r.name)}에서 ${t?`${t.mode} 약 ${t.min}분`:'바로 옆'}</div>`}
    const key=off?`<span class="tag w">${WD[wd]} 휴관</span>`:oos?`<span class="tag w">이 날은 기간 아님</span>`:p.season?`<span class="tag r">🗓 ${esc(p.season)}</span>`:mustOf(p.id)?`<span class="tag r">★ 추천</span>`:mk.length?`<span class="tag kwt">#${esc(mk[0])}</span>`:'';
    const row=[`<button class="vote" data-wish="${p.id}" aria-pressed="${isWish(p.id)}" aria-label="가고 싶어요">${isWish(p.id)?'♥':'♡'}</button>`,
      recState!=='off'?`<button class="vote" data-vote="${p.id}" aria-pressed="${iRec(p)}" aria-label="추천하기"${recState==='readonly'&&!recPublic()?' disabled':''}>👍 ${recOf(p)}</button>`:'',
      extras(CARD_EXTRAS,p),`<span class="tag mono">${p.dur}분</span>`,key].join('');
    const det=[p.shared||p.fromUsers?`<span class="tag usr">${p.userMade?'여행자가 올린 곳':'여행자 추천'}</span>`:'',
      mustOf(p.id)?`<span class="tag r">★ ${esc(mustOf(p.id))}</span>`:'',...mk.map(k=>`<span class="tag kwt">#${esc(k)}</span>`),
      `<span class="tag mono">${costOf(p.id)[0]?yen(costOf(p.id)[0]):'무료'}</span>`,
      h?`<span class="tag mono">${fmt(h[0])}–${fmt(h[1])}</span>`:`<span class="tag">언제든</span>`,
      p.closed&&p.closed.length?`<span class="tag">${p.closed.map(w=>WD[w]).join('·')} 휴관</span>`:'',
      p.season&&p.dates?`<span class="tag r">🗓 ${mdTxt(p.dates[0])||''}~${mdTxt(p.dates[1])||''}</span>`:'',
      p.best&&p.best!=='any'?`<span class="tag">${BEST_KO[p.best]}에 좋아요</span>`:'',
      p.check?`<span class="tag">준비: ${esc(p.check)}</span>`:'',
      p.gone?`<span class="tag r">폐업했을 수 있어요</span>`:p.hsrc==='google'?`<span class="tag ok">영업시간 확인됨</span>`:p.verify==='영업시간'&&p.ll&&inKR(p.ll)?`<span class="tag">영업시간 추정</span>`:p.verify?`<span class="tag">확인 필요: ${esc(p.verify)}</span>`:''].join('');
    return `<div class="card${selected===p.id?' sel':''}${off||oos?' off':''}" style="--cc:var(--c-${p.cat})" draggable="true" data-id="${p.id}">
      <div class="nm">${esc(p.name)}</div><button class="small-btn primary" data-pick="${p.id}">${selected===p.id?'선택됨':'넣기'}</button>
      <div class="sub">${esc(p.area)} · ${esc(p.note)}</div>${dist}<div class="tags">${row}</div>
      <details class="cmore"><summary>자세히</summary><div class="tags">${det}</div></details></div>`;
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
  const row=(r,ok)=>`<div class="fill-row${ok?'':' dim'}" style="--cc:var(--c-${r.p.cat})"><div><b>${esc(r.p.name)}</b>${r.random?'<span class="rnd">랜덤</span>':''}${MUST[r.p.id]?'<span class="rnd" style="border-style:solid;color:var(--accent);border-color:var(--accent)">★ 꼭 추천</span>':''}
    ${r.mk&&r.mk.length?`<div>${r.mk.map(k=>`<span class="kwm">#${esc(k)}</span>`).join('')}</div>`:''}
    <div class="m">${esc(r.p.area)} · ${r.p.dur}분 · ${costOf(r.p.id)[0]?yen(costOf(r.p.id)[0]):'무료'} · 앞 일정에서 ${r.tin?`약 ${r.tin}분`:'바로'}${next?` · 다음 일정까지 ${r.tout?`약 ${r.tout}분`:'바로'}`:''}</div></div>
    ${ok?`<button class="small-btn primary" data-fill="${r.p.id}" data-start="${r.start}"><span class="t">${fmt(r.start)}</span> 넣기</button>`:`<span class="m">${esc(r.why)}</span>`}</div>`;
  $('#sheet').innerHTML=`<h3>${fmt(gS)}–${fmt(gE)} 비어 있음</h3>
    <div class="when">${durTxt(len)} · 앞: ${esc(pName)}${next?` · 뒤: ${esc(next.stay?`${next.area} 숙소`:next.name)}`:''}</div>
    ${carrying?`<p style="color:var(--warn);font-size:12.5px;font-weight:600">이 시간에는 캐리어를 들고 있어요. 짐 맡길 곳을 먼저 넣고, 미술관이나 매장은 그 뒤에 넣으세요.</p>`:''}
    <p style="color:var(--muted);font-size:12.5px">취향 키워드가 많이 겹치고 이동이 적게 늘어나는 순서예요. 마지막 하나는 랜덤 추천이에요. 시작 시간은 탭한 ${fmt(t)} 이후, 이동 시간을 뺀 뒤로 잡았어요.</p>
    <div class="fill-list">${fit.map(r=>row(r,true)).join('')||'<p class="now-hint">이 빈 시간에 들어가는 장소가 없어요. 앞뒤 블록을 옮겨 보세요.</p>'}${dim.map(r=>row(r,false)).join('')}</div>
    <div class="row"><button class="small-btn primary" data-dicefrom="${t}">🎲 굴리기</button><button class="small-btn" data-totray="1">다른 장소 고르기</button><button class="small-btn" data-newcustom="${t}">직접 만들기</button><button class="small-btn" data-close="1">닫기</button></div>`;
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
  let html='';
  html+=`<div class="check-group"><h3>일정 경고</h3>`+(warnRows.length&&sample?`<div class="row" style="margin:0 0 8px"><button class="small-btn primary" id="fixWarnBtn">AI에게 경고 해결 맡기기</button></div>`:'')+(warnRows.length?warnRows.map(r=>`<button class="ck warn" style="width:100%;text-align:left" data-goto="${r.d}" data-uid="${r.uid}"><span class="mono">D${r.d+1}</span><span>${esc(r.t)}<small>탭해서 블록 고치기</small></span></button>`).join(''):`<p class="now-hint">겹치거나 휴관인 블록이 없어요.</p>`)+`</div>`;
  html+=`<div class="check-group"><h3>예약·준비</h3>`+(prepRows.length?prepRows.map(r=>ckRow(r.id,`${r.t}`,`Day ${r.d+1} · ${r.s}`)).join(''):`<p class="now-hint">일정에 넣은 블록 중 준비할 게 없어요.</p>`)+`</div>`;
  html+=seasonChecksHTML();
  html+=`<div class="check-group"><h3>여행 전체</h3>`+STATIC_CHECKS.map(s=>ckRow(s.id,s.t)).join('')+`</div>`;
  html+=`<div class="check-group"><h3>일정 초기화</h3><p class="now-hint" style="margin:0 0 6px">넣어 둔 블록을 모두 지워요. 항공편, 숙소 같은 고정 블록은 남아요.</p><button class="small-btn danger" id="resetBtn">${resetArm?'한 번 더 누르면 모두 지워요':'넣은 블록 모두 지우기'}</button></div>`;
  $('#checks').innerHTML=html;
}
function ckRow(id,t,sub){const on=!!done[id];return `<label class="ck${on?' done':''}"><input type="checkbox" data-ck="${id}" ${on?'checked':''}><span>${esc(t)}${sub?`<small>${esc(sub)}</small>`:''}</span></label>`}
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
  if(aiState.status==='loading'){box.innerHTML=`<h3>빈 시간에 맞는 블록을 고르는 중</h3><div class="status">AI가 이 날의 일정, 이동 거리, 영업시간을 보고 있어요. 보통 10~40초 걸려요. <span class="mono" id="aiSec"></span></div><div class="sugg"><button class="small-btn" id="aiStop">멈추기</button></div>`;return}
  if(aiState.status==='error'){box.innerHTML=`<h3>추천을 받지 못했어요</h3><div class="status">${esc(aiState.msg)}</div><div class="sugg"><button class="small-btn" id="aiClose">닫기</button></div>`;return}
  const s=aiState.items;
  box.innerHTML=`<h3>AI 추천 · ${DAYS[day].date}</h3>`+(s.length?`<div class="status">✓ 넣어도 경고가 생기지 않는지 확인한 블록만 보여 줘요.${aiState.dropped?` 경고가 생기는 추천 ${aiState.dropped}개는 뺐어요.`:''}</div>`:`<div class="status">지금 일정에 경고 없이 넣을 만한 블록을 찾지 못했어요.${aiState.dropped?` (경고가 생기는 추천 ${aiState.dropped}개를 뺐어요)`:''}</div>`)+
    `<div class="sugg">`+s.map((x,i)=>`<div class="sugg-item"><div><div class="t">${fmt(x.start)}–${fmt(x.start+PM[x.id].dur)}</div><b>${esc(PM[x.id].name)}</b><div class="why">${esc(x.reason)}</div></div>
      <button class="small-btn primary" data-acc="${i}" ${x.added?'disabled':''}>${x.added?'넣음':'넣기'}</button></div>`).join('')+
    `<button class="small-btn" id="aiClose">닫기</button></div>`;
}
function renderPref(){
  const counts=k=>P.filter(p=>tagsOf(p.id).some(t=>norm(t)===norm(k))).length;
  const known=[...new Set([...GENERIC_KW,...Object.values(TAGS).flat()])].filter(t=>!kws.some(k=>norm(k)===norm(t)));
  $('#prefBox').innerHTML=`<div class="kw-list">${kws.map((k,i)=>`<span class="kw">#${esc(k)} <span class="n">${counts(k)}</span><button data-kwdel="${i}" aria-label="${esc(k)} 빼기">×</button></span>`).join('')||'<p class="now-hint">등록한 키워드가 없어요.</p>'}</div>
    <form class="kw-add" id="kwForm"><input id="kwInput" placeholder="키워드 추가 (예: 레코드)" maxlength="20" autocomplete="off"><button class="small-btn primary" type="submit">추가</button></form>
    ${known.length?`<p class="now-hint" style="margin:0 0 6px">장소에 붙어 있는 다른 키워드</p><div class="kw-sugg">${known.map(k=>`<button data-kwadd="${esc(k)}">+ ${esc(k)}</button>`).join('')}</div>`:''}
    <p class="now-hint" style="margin:0 0 6px">숫자는 그 키워드가 붙은 장소 수예요. 장소에 없는 키워드는 0으로 나오고, 장소 데이터가 늘어나면 반영돼요.</p>
    <button class="small-btn" id="kwReset">처음 키워드로 되돌리기</button>`;
}
const saveKw=()=>{store.set('gp.kw',kws);LS.set('jepi.kwAt',Date.now());syncSoon();renderPref();renderTray()};
function renderAll(){touchPlan();renderMeta();renderNudges();renderDays();renderTimeline();renderTray();renderChecks();renderPref();renderTabs();renderBanner();renderAI();renderChat();renderExt();renderLook()}


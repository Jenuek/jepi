// ---------- actions ----------
function place(id,start,d=day){
  const p=PM[id]; start=Math.max(dayStart(d),Math.min(1410,start));
  placed.push({uid:'u'+(uidN++),id,day:d,start,dur:p.dur}); save();
}
function openSheet(uid){
  const {items}=analyze(day); const it=items.find(i=>i.uid===uid); if(!it) return;
  const isP=it.kind==='place';
  const ti=it.travelIn;
  const h=isP?hoursFor(it.p,DAYS[day].wd):null;
  $('#sheet').innerHTML=`<h3>${esc(it.name)}</h3><div class="when">${DAYS[day].date} (${WD[DAYS[day].wd]}) ${fmt(it.start)}–${fmt(it.end)} · ${esc(it.locName)}</div>
    ${it.note?`<p>${esc(it.note)}</p>`:''}
    ${isP&&!it.p.custom?`<p><a href="${placeLink(it.p)}" target="_blank" rel="noopener">지도에서 위치·영업시간 확인</a></p>`:''}
    ${isP&&recState!=='off'?`<div class="row"><button class="vote" data-vote="${it.id}" aria-pressed="${iRec(it.p)}"${recState==='readonly'&&!recPublic()?' disabled':''}>👍 추천 ${recOf(it.p)}</button><span class="hint">${iRec(it.p)?'추천했어요. 다시 누르면 취소돼요.':'좋았던 곳이면 다른 여행자에게 추천해 주세요.'}</span></div>`:''}
    ${isP&&h?`<p class="mono" style="color:var(--muted);font-size:12px">영업 ${fmt(h[0])}–${fmt(h[1])}${it.p.closed?` · 휴관 ${it.p.closed.map(w=>WD[w]).join('·')}`:''}</p>`:''}
    ${isP?`<p>예상 비용 <b class="mono">${yen(it.yen)}</b>${it.costNote?` · ${esc(it.costNote)}`:''}</p>`:''}
    ${it.krw?`<p>예상 비용 <b class="mono">${won(it.krw)}</b> · 원화 기준</p>`:''}
    ${isP&&it.p.check?`<p><b>준비:</b> ${esc(it.p.check)}</p>`:''}
    ${it.tips&&it.tips.length?`<div class="tips">💡 ${it.tips.map(esc).join(' · ')}</div>`:''}
    ${isP&&it.p.season?`<p>🗓 <b>${esc(it.p.season)}</b>${it.p.dates?` · ${mdTxt(it.p.dates[0])||'?'}~${mdTxt(it.p.dates[1])||'?'}`:''}${it.p.conf!=='high'?` · <a href="https://www.google.com/search?q=${encodeURIComponent((it.p.local||it.p.name)+' '+(DAYS[0].iso||'').slice(0,4))}" target="_blank" rel="noopener">올해 날짜 확인</a>`:''}</p>`:''}
    ${extras(SHEET_EXTRAS,it,day)}
    ${it.warns.length?`<div class="warns">${it.warns.map(w=>`<div>${esc(w)}</div>`).join('')}</div>`:''}
    ${ti?`<p>이동: ${esc(ti.fromName)}에서 ${ti.real?'':'약 '}${ti.mode} ${ti.min}분${ti.lines?` (${esc(ti.lines)}${ti.tf?` · 환승 ${ti.tf}회`:''})`:''}${ti.fare?` · ${yen(ti.fare)}`:''} · <a href="${ti.link}" target="_blank" rel="noopener">안내 시작</a></p>`:''}
    ${!it.stay&&!['f0a','f0b','f0c','f8','f9'].includes(it.uid)?marksHTML(it):''}
    ${isP?`<div class="row"><span class="lbl">시간</span><button class="small-btn" data-mv="-30">30분 앞으로</button><button class="small-btn" data-mv="30">30분 뒤로</button></div>
    <div class="row"><span class="lbl">길이</span><button class="small-btn" data-du="-30">30분 줄이기</button><button class="small-btn" data-du="30">30분 늘리기</button></div>
    <div class="row"><button class="small-btn danger" data-del="1">일정에서 빼기</button>${it.p.custom?`<button class="small-btn" data-editcustom="${it.id}">블록 정보 수정</button>`:''}<button class="small-btn primary" data-close="1">완료</button></div>${altsHTML(it)}`
    :(uid==='f0a'?`<div class="row"><span class="lbl" style="width:auto">집 → ${MODE_WORD[profile.mode]} <b class="mono">${homeMin}분</b></span></div>
      <div class="row"><button class="small-btn" data-home="-10">10분 줄이기</button><button class="small-btn" data-home="10">10분 늘리기</button></div>`:'')+
     `<div class="row"><button class="small-btn primary" data-close="1">닫기</button></div>`}`;
  $('#sheet').dataset.uid=uid; $('#sheetBg').hidden=false;
  setTimeout(()=>{const b=$('#sheet button');b&&b.focus()},0);
}
const closeSheet=()=>{if(diceCloseAnim())return;$('#sheetBg').hidden=true};
function altsFor(it){
  const D=DAYS[day], wd=D.wd, {items}=analyze(day);
  const others=items.filter(i=>i.uid!==it.uid);
  const prev=others.filter(i=>i.start<it.start||(i.start===it.start&&i.kind==='fixed')).pop()||null;
  const next=others.find(i=>i.start>=it.start&&i!==prev&&!(i.start===it.start&&i.kind==='fixed'))||null;
  const pLl=prev?prev.ll:LOC[D.startLoc].ll, gS=prev?prev.end:dayStart(day), gE=next?next.start:1440;
  const carrying=prev?!!prev.carryAfter:false;
  const tm=(a,b)=>(travel(a,b)||{min:0}).min;
  const used=new Set(placed.map(b=>b.id));
  const origT=tm(pLl,it.ll)+(next?tm(it.ll,next.ll):0);
  const food=it.p.cat==='food'||(it.p.cat==='night'&&!['shelter','zen'].includes(it.id));
  const out=[];
  for(const p of P){
    if(used.has(p.id)||p.drop) continue;
    if(food?!(p.cat==='food'||(p.cat==='night'&&it.start>=1020)):(p.cat==='food'||p.cat==='trip'||(p.cat==='night'&&it.start<1020))) continue;
    if(carrying&&!['walk'].includes(p.cat)) continue;
    if(closedOn(p,wd)) continue;
    const h=hoursFor(p,wd), tin=tm(pLl,p.ll), tout=next?tm(p.ll,next.ll):0;
    let start=Math.ceil(Math.max(it.start,gS+tin)/5)*5; if(h&&start<h[0]) start=Math.ceil(h[0]/5)*5;
    let dur=Math.min(p.dur,gE-tout-start); if(h) dur=Math.min(dur,h[1]-start);
    if(dur<Math.min(30,p.dur)) continue;
    dur=Math.floor(dur/5)*5;
    const mk=matchKw(p.id);
    out.push({p,start,dur,tin,tout,mk,extra:tin+tout-origT,score:Math.min(mk.length,4)*10+(MUST[p.id]?15:0)-(tin+tout)*0.6});
  }
  out.sort((a,b)=>b.score-a.score);
  // nearby: swapping costs at most 10 extra minutes of travel -> show them all
  const near=out.filter(r=>r.extra<=10);
  const farAll=out.filter(r=>r.extra>10);
  const far=farAll.slice(0,3), rest=farAll.slice(3);
  if(rest.length){const r=rest[Math.floor(Math.random()*rest.length)];r.random=true;far.push(r)}
  // worth-the-detour places that do not fit the current window: show how much later the rest of the day gets
  const shown=new Set(out.map(r=>r.p.id)), must=[];
  if(!food) for(const p of P){
    if(!MUST[p.id]||used.has(p.id)||shown.has(p.id)||p.drop||p.dur>240) continue;
    if(carrying&&p.cat!=='walk') continue;
    if(closedOn(p,wd)) continue;
    const h=hoursFor(p,wd), tin=tm(pLl,p.ll), tout=next?tm(p.ll,next.ll):0;
    let start=Math.ceil(Math.max(it.start,gS+tin)/5)*5; if(h&&start<h[0]) start=Math.ceil(h[0]/5)*5;
    if(h&&start+30>h[1]) continue;
    const dur=h?Math.min(p.dur,h[1]-start):p.dur;
    const over=Math.max(0,start+dur+tout-gE); if(over>120) continue;
    must.push({p,start,dur,tin,tout,mk:matchKw(p.id),extra:tin+tout-origT,over,must:true});
  }
  must.sort((a,b)=>a.over-b.over);
  return {near,far,must};
}
function altsHTML(it){
  const {near,far,must}=altsFor(it);
  const mine=matchKw(it.id);
  const ex=r=>r.extra<=0?'이동 그대로':`이동 +${r.extra}분`;
  const row=r=>`<div class="fill-row" style="--cc:var(--c-${r.p.cat})"><div><b>${esc(r.p.name)}</b>${r.random?'<span class="rnd">랜덤</span>':''}${MUST[r.p.id]&&!r.must?'<span class="rnd" style="border-style:solid;color:var(--accent);border-color:var(--accent)">★ 꼭 추천</span>':''}
    ${r.mk.length?`<div>${r.mk.map(k=>`<span class="kwm">#${esc(k)}</span>`).join('')}</div>`:''}
    ${r.must?`<div class="m" style="color:var(--ink)">${esc(MUST[r.p.id])}</div>`:''}
    <div class="m">${esc(r.p.area)} · ${fmt(r.start)}–${fmt(r.start+r.dur)} · ${costOf(r.p.id)[0]?yen(costOf(r.p.id)[0]):'무료'} · ${r.must?`앞에서 약 ${r.tin}분${r.over?` · <b style="color:var(--warn)">뒤 일정이 ${durTxt(r.over)} 밀려요</b>`:''}`:ex(r)}</div></div>
    <button class="small-btn primary" data-swap="${r.p.id}" data-start="${r.start}" data-dur="${r.dur}">바꾸기</button></div>`;
  return `<div class="alt"><h4>같은 시간 대안</h4><p class="sub">지금 블록: ${mine.length?mine.map(k=>'#'+esc(k)).join(' '):'겹치는 취향 키워드 없음'} · 앞뒤 일정, 영업시간, 짐 상태에 맞는 곳만 골랐어요.</p>
    <h4 style="font-size:12.5px;margin-top:8px">가까워서 바로 바꿀 수 있는 곳 <span class="mono" style="color:var(--muted);font-weight:400">${near.length}</span></h4>
    <p class="sub">이동이 10분 이상 늘지 않는 곳을 모두 보여 줘요. 취향 키워드가 많이 겹치는 순서예요.</p>
    <div class="fill-list" style="margin-top:0">${near.length?near.map(row).join(''):'<p class="now-hint">가까운 대안이 없어요.</p>'}</div>
    ${must.length?`<h4 style="font-size:12.5px;margin-top:12px">★ 멀어도 꼭 추천하는 곳</h4><p class="sub">지금 시간 안에는 다 들어가지 않지만 특히 추천하는 곳이에요. 바꾸면 뒤 일정과 겹치는 블록이 빨갛게 표시되니, 그 블록을 빼거나 옮겨서 맞추세요.</p><div class="fill-list" style="margin-top:0">${must.map(row).join('')}</div>`:''}
    ${far.length?`<h4 style="font-size:12.5px;margin-top:12px">조금 멀지만 취향에 맞는 곳</h4><p class="sub">이동이 더 걸리지만 키워드가 잘 맞는 곳 3개와 랜덤 1개예요.</p><div class="fill-list" style="margin-top:0">${far.map(row).join('')}</div>`:''}
    </div>`;
}


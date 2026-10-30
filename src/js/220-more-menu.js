// ---------- 더보기: trip summary, 준비하기 badge, P-mode short menu ----------
let moreAll=false, meOpen=null, autoT=0;
function tripSummary(){
  const pr=profile, n=nightsOf(pr), D0=DAYS[0]||{}, Dn=DAYS[DAYS.length-1]||{};
  const md=iso=>iso?`${+iso.slice(5,7)}/${+iso.slice(8,10)}`:'';
  const dates=pr.kind==='day'?md(D0.iso):pr.dateUnknown?'날짜 미정':`${md(D0.iso)}(${WD[D0.wd]}) – ${md(Dn.iso)}(${WD[Dn.wd]})`;
  const who=pr.party.type==='solo'?'혼자':pr.party.type==='couple'?'둘이서':`${heads2(pr.party)}명`;
  return {city:PACK.city||'여행지 미정',line:pr.kind==='day'?`${dates} · 하루 코스 · ${who}`:`${dates} · ${n}박 · ${who}`};
}
function prepLeft(){let n=0;document.querySelectorAll('#checks .check-group').forEach(g=>{const h=g.querySelector('h3');if(h&&/예약·준비/.test(h.textContent))n+=g.querySelectorAll('input[data-ck]:not(:checked)').length});return n}
function warnTotal(){let n=0;for(let d=0;d<DAYS.length;d++)n+=analyze(d).items.reduce((a,it)=>a+it.warns.length,0);return n}
function renderMore(){
  const box=$('#moreBox'); if(!box) return;
  const s=tripSummary(), pr=profile, b=budgetParts&&budgetParts(pr);
  const chip=(t,c)=>`<span class="mchip ${c||''}">${t}</span>`;
  const chips=pr.kind==='day'?[]:[pr.bookedFlight===false?chip('교통편 미정','warn'):chip('교통편 예약됨','ok'),pr.bookedStay===false?chip('숙소 미정','warn'):chip('숙소 예약됨','ok')];
  if(b) chips.push(chip(`예산 1인 ${Math.round(b.total/10000)}만원`));
  const w=warnTotal(), pl=prepLeft(), full=jp!=='P'||moreAll;
  const arrow='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
  box.innerHTML=`<button class="trip-card" data-tab="me"><span class="tc-top"><span class="tc-k">이번 여행</span><span class="tc-more">자세히${arrow}</span></span><b class="tc-city">${esc(s.city)}</b><span class="tc-line mono">${esc(s.line)}</span>${chips.length?`<span class="tc-chips">${chips.join('')}</span>`:''}</button>
  <div class="mgroup">
    <button class="mrow" type="button" id="nbOpen"><span class="mt"><b>📖 여행 노트로 보기</b><small>날짜별 제목 · 손글씨 메모 · PDF 저장 · 링크로 보내기</small></span>${arrow}</button>
    <button class="mrow" type="button" id="lookOpen"><span class="mt"><b>🎨 여행 꾸미기</b><small>제목 · 테마 색 · 커버 · 스타일 · 날짜별 제목</small></span>${arrow}</button>
    <button class="mrow" data-tab="check"><span class="mt"><b>준비하기</b><small>일정 경고 · 남은 예약 · 이 시기 팁</small></span>${w?chip('경고 '+w,'warn'):''}${pl?chip('남은 준비 '+pl,'acc'):''}${!w&&!pl?arrow:''}</button>
    ${full?`<button class="mrow" data-tab="pref"><span class="mt"><b>나의 여행 취향</b><small>여행 스타일 · 취향 키워드 · ♥ 장소 — 모든 계획에 공통</small></span>${arrow}</button>
    <button class="mrow" data-tab="plans"><span class="mt"><b>내 계획</b><small>${plans.length}개 저장됨 · 새 계획 · 공유</small></span>${arrow}</button>`:''}
  </div>
  <div class="mgroup">
    <button class="mrow" data-tab="friends"><span class="mt"><b>친구와 함께</b><small>초대 링크 · 같이 고치기 · 👍 가고 싶어요</small></span>${(()=>{const sp=plans.find(x=>x.id===curPlan&&x.shared);return sp?chip('👥 '+(((TRIPS&&TRIPS.members[curPlan])||[]).length||'공유 중'),'ok'):arrow})()}</button>
    <button class="mrow" data-tab="notify"><span class="mt"><b>알림</b><small>출발 시간 · 아침 일정 · 알림 받을 기기</small></span>${NOTIFY&&NOTIFY.on?chip('켜짐','ok'):arrow}</button>
    <button class="mrow" data-tab="help"><span class="mt"><b>사용 안내</b><small>처음 쓰는 기능을 짧게 설명해요</small></span>${arrow}</button>
  </div>
  ${full?`<div class="mgroup"><button class="mrow" data-tab="settings"><span class="mt"><b>설정</b><small>화면 · AI·지도 연결 · 백업 · 초기화</small></span>${STANDALONE&&!sample?chip('AI 꺼짐','warn'):''}${arrow}</button></div>`:''}
  ${jp==='P'?`<button class="linkbtn" id="moreAll">${moreAll?'간단히 보기':'전체 메뉴 보기'}</button>`:''}`;
  const wc=$('#warnCount'); if(wc) wc.textContent=w?String(w):'';
}
// 이번 여행: one row per topic, opens only that part, saves on change
function meRows(p){
  const md=(k)=>mdOf(p,k), n=nightsOf(p);
  const flightTxt=p.kind==='day'?'':p.bookedFlight===false?'<span class="wtxt">아직 안 정했어요</span>':(p.flightSet?`<span class="mono">가는 편 ${esc(p.out.dep||'')} → ${esc(p.out.arr||'')}</span><small class="mono">오는 편 ${esc(p.back.dep||'')} → ${esc(p.back.arr||'')}</small>`:'시간을 넣어 주세요');
  const stayTxt=p.bookedStay===false?'<span class="wtxt">아직 안 정했어요</span>':esc(p.stays.map(s=>s.name||'숙소').join(', '));
  const b=budgetParts&&budgetParts(p);
  const who=p.party.type==='solo'?'혼자':p.party.type==='couple'?'연인·부부':p.party.type==='family'?`가족 ${heads2(p.party)}명`:`친구 ${heads2(p.party)}명`;
  if(p.kind==='day') return [
    ['day','코스',`${esc(PACK.city)} · ${esc(md(0))}`,()=>fDay(p)],
    ['who','누구와',who,()=>fParty(p)],
    ['bud','예산',b?`1인 ${Math.round(b.total/10000)}만원`:'정하지 않음',()=>fBudget(p)]];
  return [
    ['when','언제·어디',`${esc(PACK.city||p.dest||'미정')} · ${p.dateUnknown?'날짜 미정':`${esc(md(0))}–${esc(md(n))}`} (${n}박)`,()=>fDest(p)+fTrip(p)],
    ['who','누구와',who,()=>fParty(p)],
    ['way','오가는 길',flightTxt,()=>fFlight(p)+homeBoxHTML(p)+fHome(p)],
    ['stay','숙소',stayTxt,()=>(p.bookedStay===false?`<div class="row"><button class="small-btn primary" type="button" id="meHelper2">예약 도우미로 동네·숙소 찾기</button></div>`:'')+fStay(p)],
    ['bud','예산',b?`1인 ${Math.round(b.total/10000)}만원 <small>· 현지 하루 ${won(b.daily)}</small>`:'정하지 않음',()=>fBudget(p)],
    ['ev','예약한 일정',p.events.length?`${p.events.length}개`:'없음',()=>fEvents(p)]];
}
function renderMeRows(){
  if(!draft) draft=clone(profile); fixProfile(draft);
  const chev='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
  $('#meBox').innerHTML=`<div class="mgroup merows">${meRows(draft).map(([id,k,v,f])=>`<button class="merow" data-meopen="${id}" aria-expanded="${meOpen===id}"><span class="mk">${k}</span><span class="mv">${v}</span>${chev}</button>${meOpen===id?`<div class="mebody">${f()}</div>`:''}`).join('')}</div>
  <p class="saved" id="meMsg">${autoMsg}</p>
  <div class="row" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px"><button class="small-btn" type="button" id="meOnb">처음 설정 다시 하기</button>${profile.kind==='day'?'':'<button class="small-btn" type="button" id="meHelper">예약 도우미</button>'}</div>`;
}
let autoMsg='';
function autoSave(){clearTimeout(autoT);autoT=setTimeout(()=>{if(!draft||!$('#onb').hidden)return;
  const prevDest=profile.dest;commitProfile(draft);if(prevDest!==profile.dest)draft.dest=profile.dest;
  autoMsg='✓ 자동 저장됨 · 일정표에 바로 반영돼요';renderAll();const m=$('#meMsg');if(m)m.textContent=autoMsg},500)}
// taste: style rows + keywords + wishes (carried into new plans)
function styleOnly(p){return fStyle(p).replace(/^\s*<div class="fsec"><h3>누구와 가나요\?<\/h3>[\s\S]*?<\/div>\s*(?=<div class="fsec">)/,'')}
const TASTE_KEYS=['pace','social','breakfast','style'];
function carryTaste(from,to){TASTE_KEYS.forEach(k=>{if(from&&from[k]!==undefined)to[k]=clone(from[k])})}
function renderTasteStyle(){const el=$('#tasteStyle');if(!el)return;if(!draft)draft=clone(profile);fixProfile(draft);el.innerHTML=styleOnly(draft)+`<p class="saved">${autoMsg}</p>`}


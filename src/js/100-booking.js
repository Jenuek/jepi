// ---------- booking helper: wish list → where to stay → flight times → search links ----------
let wish=[], hStep=0, hVibe=null, hBusy=false;
const isWish=id=>wish.includes(id);
function toggleWish(id){const i=wish.indexOf(id);if(i>=0)wish.splice(i,1);else wish.push(id);store.set('gp.wish',wish)}
const needBooking=()=>profile.kind!=='day'&&(profile.bookedFlight===false||profile.bookedStay===false);
const ymd=i=>{const d=dateOf(profile,i);return d?`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`:''};
const guests=()=>({a:profile.party.adults||1,k:profile.party.kids||0});
function hotelLinks(areaName){
  const q=encodeURIComponent(`${areaName}, ${PACK.city}`), ci=ymd(0), co=ymd(nightsOf(profile)), g=guests(), cap=roomCap();
  return [['부킹닷컴',`https://www.booking.com/searchresults.ko.html?ss=${q}&checkin=${ci}&checkout=${co}&group_adults=${g.a}&group_children=${g.k}&no_rooms=1${cap?`&selected_currency=KRW&nflt=${encodeURIComponent(`price=KRW-min-${cap}-1`)}`:''}`],
    ['에어비앤비',`https://www.airbnb.co.kr/s/${q}/homes?checkin=${ci}&checkout=${co}&adults=${g.a}&children=${g.k}${cap?`&currency=KRW&price_max=${cap}`:''}`],
    ['아고다',`https://www.agoda.com/ko-kr/search?textToSearch=${q}&checkIn=${ci}&checkOut=${co}&rooms=1&adults=${g.a}&children=${g.k}`],
    ['구글 지도에서 숙소 보기',`https://www.google.com/maps/search/${encodeURIComponent('숙소 '+areaName+' '+PACK.city)}`]];
}
function flightLinks(){
  const g=guests(), gw=AIRPORTS[profile.out.airport]||{}, M=profile.mode, out=ymd(0), back=ymd(nightsOf(profile));
  if(M==='car') return [];
  if(M==='train'||M==='bus') return [[M==='train'?'코레일':'버스타고',M==='train'?'https://www.letskorail.com/':'https://www.bustago.or.kr/'],['구글에서 교통편 찾기',`https://www.google.com/search?q=${encodeURIComponent(`서울에서 ${PACK.city} ${M==='train'?'기차':'버스'} ${out}`)}`]];
  const L=[['구글 항공편',`https://www.google.com/travel/flights?hl=ko&q=${encodeURIComponent(`Flights from Seoul to ${gw.iata||PACK.city} on ${out} through ${back} ${g.a} adults${g.k?` ${g.k} children`:''}`)}`]];
  if(gw.iata) L.push(['스카이스캐너',`https://www.skyscanner.co.kr/transport/flights/sela/${gw.iata.toLowerCase()}/${out.slice(2).replace(/-/g,'')}/${back.slice(2).replace(/-/g,'')}/?adultsv2=${g.a}${g.k?`&childrenv2=${Array(g.k).fill(8).join('|')}`:''}`]);
  L.push(['네이버 항공권',`https://flight.naver.com/`]);
  return L;
}
const linkRow=L=>L.length?`<div class="links">${L.map(([n,u])=>`<a class="small-btn" href="${u}" target="_blank" rel="noopener">${esc(n)} ↗</a>`).join('')}</div>`:'';
function areaScores(){
  const tg=[...wish.filter(id=>PM[id]).map(id=>({ll:PM[id].ll,w:MUST[id]?1.5:1})),...(profile.events||[]).filter(e=>AREAS[e.area]).map(e=>({ll:[AREAS[e.area][1],AREAS[e.area][2]],w:3}))];
  const gw=AIRPORTS[profile.out.airport];
  return Object.keys(AREAS).map(k=>{const ll=[AREAS[k][1],AREAS[k][2]];let tot=0,ws=0,near=0;
    tg.forEach(t=>{const tr=travel(ll,t.ll),m=tr?tr.min:5;tot+=m*t.w;ws+=t.w;if(m<=15)near++});
    const air=gw?((travel(ll,gw.ll)||{min:0}).min):0, avg=ws?tot/ws:0;
    return {k,name:AREAS[k][0],avg,air,near,score:avg+air*0.15}}).sort((a,b)=>a.score-b.score);
}
function flightSlots(){
  const intl=!!PACK.intl, M=profile.mode, gw=AIRPORTS[profile.out.airport], st=AREAS[(profile.stays[0]||{}).area]||AREAS[firstArea()];
  const toCity=gw?((travel(gw.ll,[st[1],st[2]])||{min:30}).min):30;
  const proc=M==='flight'?(intl?60:30):15, lead=M==='flight'?(intl?180:90):20;
  const A=[['아침 도착',540],['낮 도착',780],['저녁 도착',1140]], D=[['아침 출발',600],['낮 출발',900],['저녁 출발',1200]];
  const res=[]; A.forEach(([an,a])=>D.forEach(([dn,d])=>{
    const first=Math.max(0,1320-(a+proc+toCity)), last=Math.max(0,(d-lead-toCity)-540);
    const notes=[]; if(a+proc+toCity<900) notes.push('체크인 전이라 짐 보관이 필요해요'); if(a<=540) notes.push('출발이 이른 새벽이에요');
    if(last<120) notes.push('마지막 날은 거의 이동만 해요'); if(d>=1200) notes.push('늦게 돌아와요');
    res.push({an,dn,a,d,h:(first+last)/60,notes})}));
  return res.sort((x,y)=>y.h-x.h);
}
async function resolveWishes(text,stId){
  if(!sample||!text.trim()) return;
  progStart(stId,'목록의 장소를 찾는 중이에요 (보통 30초~1분)',['wishPasteBtn'],'찾는 중…');
  const areaList=Object.entries(AREAS).map(([k,v])=>`${k}=${v[0]}`).join(', ');
  try{
    const r=await sample.json(`The traveler pasted places they want to visit in ${PACK.city}. Identify each real place in the list (skip lines you cannot identify, and skip anything outside ${PACK.city}).
List:
${text.slice(0,4000)}
Area keys: ${areaList}
Reply with only JSON: {"places":[{"name":"Korean name","local":"name in local language","area":"area key","cat":"food|music|art|walk|shop|night|trip","lat":0.0000,"lng":0.0000,"dur":minutes,"open":"HH:MM-HH:MM or null","closed":[0-6],"cost":typical spend in ${PACK.currency},"tags":["short Korean"],"note":"one Korean sentence","cash":false}]}`,{cache:false});
    let n=0,added=0;
    (Array.isArray(r&&r.places)?r.places:[]).slice(0,40).forEach(x=>{const ex=P.find(p=>norm(p.name)===norm(x&&x.name||''));
      if(ex){if(!isWish(ex.id))wish.push(ex.id);n++;return}
      const pl=cleanPlace(x);if(pl){PACK.places.push(pl);addPackPlace(pl);wish.push(pl.id);n++;added++}});
    store.set('gp.wish',wish); savePack(); progStop(stId); renderHelper(); renderTray(); setSt(stId,n?`${n}곳에 ♥를 붙였어요${added?` (새로 찾은 곳 ${added}곳)`:''}.`:'목록에서 장소를 찾지 못했어요.');
  }catch(e){setSt(stId,errText(e,'장소를 찾지 못했어요'))}
}
async function askVibes(){
  if(!sample||hBusy) return; hBusy=true; const top=areaScores().slice(0,3);
  progStart('st_vibe','동네 분위기를 정리하는 중이에요 (보통 15~30초)',['vibeBtn'],'정리하는 중…');
  try{const r=await sample.json(`Describe these neighbourhoods of ${PACK.city} as places to stay, for this traveler.
${partyEn(profile.party)} Pace: ${profile.pace}. Interests: ${kws.join(', ')||'(none)'}.
Areas: ${top.map(a=>`${a.k}=${a.name}`).join(', ')}
Reply with only JSON: {"areas":[{"key":"area key","vibe":"one Korean sentence on atmosphere and lodging price level","good":"short Korean: who it suits","caution":"short Korean caution or empty"}]}`,{cache:false});
    hVibe={}; (Array.isArray(r&&r.areas)?r.areas:[]).forEach(a=>{if(AREAS[a.key])hVibe[a.key]=a}); progStop('st_vibe');
  }catch(e){setSt('st_vibe',errText(e,'정리하지 못했어요'))} finally{hBusy=false;renderHelper()}
}
function openHelper(step){hStep=step||0;$('#meBox').innerHTML='';$('#helper').hidden=false;renderHelper()}
function closeHelper(){$('#helper').hidden=true;renderAll();maybeCoach();if(tab==='me'){draft=clone(profile);renderMe()}}
const H_STEPS=['가고 싶은 곳 고르기','숙소 동네 정하기','교통편 시간대 정하기','예약하고 일정에 넣기'];
function renderHelper(){
  const el=$('#helperBody'); if(!el||$('#helper').hidden) return;
  $('#helperStep').textContent=`${hStep+1} / ${H_STEPS.length}`; $('#helperTitle').textContent=H_STEPS[hStep];
  $('#helperPrev').disabled=hStep===0; $('#helperNext').textContent=hStep===H_STEPS.length-1?'일정표로 가기':'다음';
  let h='';
  if(hStep===0){
    const list=P.filter(p=>!p.drop).sort((a,b)=>isWish(b.id)-isWish(a.id)||(!!MUST[b.id])-(!!MUST[a.id])||matchKw(b.id).length-matchKw(a.id).length);
    h=`<p class="onb-sub">끌리는 곳에 ♥만 누르세요. 고른 곳을 기준으로 숙소 동네를 추천해요. 3곳 이상 고르면 정확해져요. <b>지금 ♥ ${wish.filter(id=>PM[id]).length}곳</b></p>
    ${sample?`<div class="fsec"><h3>미리 찾아 둔 곳이 있다면</h3><textarea id="wishPaste" rows="3" placeholder="가고 싶은 곳 이름을 줄마다 하나씩 붙여 넣으세요 (지도 저장 목록, 메모 등)"></textarea><div class="row"><button class="small-btn primary" type="button" id="wishPasteBtn">목록에서 ♥ 붙이기</button><span class="ai-status" id="st_wish"></span></div></div>`:''}
    <div class="wish-list">${list.length?list.map(p=>`<button type="button" class="wish-item" data-wish="${p.id}" aria-pressed="${isWish(p.id)}"><span class="hrt">${isWish(p.id)?'♥':'♡'}</span><span><b>${esc(p.name)}</b><small>${esc(p.area)} · ${esc(CATS[p.cat]||'')}${MUST[p.id]?' · ★':''}${recOf(p)?` · 👍${recOf(p)}`:''}</small><small>${esc(p.note||'')}</small></span></button>`).join(''):'<p class="hint">아직 장소 후보가 없어요. 위 칸에 붙여 넣거나 장소 블록 탭에서 AI로 찾아 주세요.</p>'}</div>`;
  }else if(hStep===1){
    const sc=areaScores().slice(0,3), cur=profile.bookedStay===false?profile.stayPicked:(profile.stays[0]||{}).area, nW=wish.filter(id=>PM[id]).length;
    h=`<p class="onb-sub">${nW?`♥ ${nW}곳${(profile.events||[]).length?'과 예약한 일정':''}까지 이동 시간이 가장 짧은 동네예요.`:'♥를 고르지 않아서 공항 접근성 위주로 계산했어요. 1단계에서 ♥를 고르면 더 정확해져요.'} 이동 시간은 직선거리 기준 추정이에요.</p>
    ${sc.map((a,i)=>{const v=hVibe&&hVibe[a.k];return `<div class="fsec area-card${cur===a.k?' sel':''}"><h3>${i+1}. ${esc(a.name)}${cur===a.k?' · 선택함':''}</h3>
      <p class="mono hint">♥ 장소까지 평균 ${Math.round(a.avg)}분 · 15분 안에 ${a.near}곳 · ${esc(apName(profile.out.airport))}까지 약 ${a.air}분</p>
      ${v?`<p>${esc(v.vibe||'')}</p><p class="hint">${v.good?'추천: '+esc(v.good):''}${v.caution?' · 주의: '+esc(v.caution):''}</p>`:''}
      <div class="row"><button class="small-btn${cur===a.k?'':' primary'}" type="button" data-setarea="${a.k}">${cur===a.k?'선택한 동네예요':'이 동네로 정하기'}</button></div>
      ${roomCap()?`<p class="hint">🏷 예산 기준 1박 약 ${won(roomCap())} 이하${heads()>1?` (${heads()}명 객실)`:''} · 부킹닷컴·에어비앤비 링크에 가격 상한을 넣었어요</p>`:''}${linkRow(hotelLinks(a.name))}
      ${sample?`<div class="row" style="margin-top:8px"><button class="small-btn" type="button" id="hotelBtn_${a.k}" data-hotels="${a.k}">${hotelRecs[a.k]?'숙소 후보 다시 받기':'이 동네 숙소 후보 보기'}</button><span class="ai-status" id="st_hotel_${a.k}"></span></div>`:''}${hotelRecHTML(a.k)}</div>`}).join('')}
    ${sample?`<div class="row"><button class="small-btn" type="button" id="vibeBtn">AI에게 동네 분위기 물어보기</button><span class="ai-status" id="st_vibe"></span></div>`:''}
    <p class="hint">링크를 누르면 날짜·인원·동네가 채워진 검색 결과가 새 창으로 열려요. 사이트에 따라 일부 조건은 다시 골라야 할 수 있어요.</p>`;
  }else if(hStep===2){
    const sl=flightSlots().slice(0,4), M=profile.mode;
    h=`<p class="onb-sub">${M==='car'?'자동차 여행이라 출발 시간만 정하면 돼요.':'시간대별로 여행지에서 실제로 쓸 수 있는 시간을 비교했어요. 첫날과 마지막 날만 달라지고, 가운데 날은 같아요.'}</p>
    ${M==='car'?'':sl.map((s,i)=>`<div class="fsec"><h3>${i+1}. ${s.an} · ${s.dn}</h3><p class="mono hint">첫날·마지막 날 합쳐 약 ${Math.round(s.h*10)/10}시간 자유 시간</p>${s.notes.length?`<p class="hint">${s.notes.map(esc).join(' · ')}</p>`:''}
      <div class="row"><button class="small-btn" type="button" data-slot="${s.a},${s.d}">이 시간대로 가정하기</button></div></div>`).join('')}
    <p class="hint">보통 인기 시간대가 더 비싸요. 가격 차이와 자유 시간을 같이 보고 고르세요.</p>
    ${M!=='car'&&sample?`<div class="row"><button class="small-btn primary" type="button" id="routeBtn">어떤 ${M==='flight'?'항공편':'교통편'}이 있는지 알아보기</button><span class="ai-status" id="st_route"></span></div>`:''}${routeHTML()}
    ${linkRow(flightLinks())}`;
  }else{
    h=`<p class="onb-sub">예약을 마쳤다면 확인 메일이나 e티켓 내용을 붙여 넣어 주세요. 정확한 시간과 숙소가 일정표에 들어가요.</p>
    <div class="fsec"><h3>예약 상태</h3>${radioRow('bookedFlight',profile.bookedFlight!==false,[[true,'교통편 예약함'],[false,'아직']])}${radioRow('bookedStay',profile.bookedStay!==false,[[true,'숙소 예약함'],[false,'아직']])}</div>
    <div class="row"><button class="small-btn primary" type="button" id="helperToMe">"내 정보"에서 예약 내용 붙여 넣기</button></div>`;
  }
  el.innerHTML=h;
}
function setSlot(a,d){
  const M=profile.mode, dur=PACK.intl?150:70;
  profile.out.arr=fmt(a); profile.out.dep=fmt(Math.max(0,a-dur)); profile.back.dep=fmt(d); profile.back.arr=fmt(Math.min(1439,d+dur));
  store.set('gp.profile',profile); buildDays(); renderHelper(); const b=document.querySelector(`[data-slot="${a},${d}"]`); if(b){b.textContent='이 시간대로 가정했어요';b.classList.add('primary')}
}


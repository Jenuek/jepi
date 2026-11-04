// ---------- booking helper: wish list → where to stay → flight times → search links ----------
let wish=[], hStep=0, hVibe=null, hBusy=false;
const isWish=id=>wish.includes(id);
function toggleWish(id){const i=wish.indexOf(id);if(i>=0)wish.splice(i,1);else wish.push(id);TRIP.save('wish',wish)}
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
    TRIP.save('wish',wish); savePack(); progStop(stId); renderHelper(); renderTray(); setSt(stId,n?`${n}곳에 ♥를 붙였어요${added?` (새로 찾은 곳 ${added}곳)`:''}.`:'목록에서 장소를 찾지 못했어요.');
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
// What was pressed inside the 예약 도우미 (HelperBody.tsx tells: its name and value)
function helperAct(n,v,v2){
  switch(n){
  case 'paste': resolveWishes(v||'','st_wish');return;   // ① the pasted list of names
  case 'vibe': askVibes();return;
  case 'hotels': askHotels(v);return;
  case 'route': askRoutes();return;
  case 'setarea': {const k=v;profile.stayPicked=k;profile.stays.forEach((st,i)=>{if(i===0||profile.bookedStay===false){st.area=k;if(profile.bookedStay===false)st.name=`숙소 (미정 · ${AREAS[k][0]})`}});TRIP.save('profile',profile);buildDays();renderHelper();return}
  case 'slot': {const [a,d]=String(v).split(',').map(Number);setSlot(a,d);return}
  case 'radio': profile[v]=v2==='true';TRIP.save('profile',profile);renderHelper();return;   // ④ 예약 상태
  case 'toMe': closeHelper();tab='me';draft=clone(profile);renderMe();renderTabs();return;
  }
}
function openHelper(step){hStep=step||0;slotPicked=null;$('#meBox').innerHTML='';$('#helper').hidden=false;renderHelper()}
function closeHelper(){$('#helper').hidden=true;renderAll();maybeCoach();if(tab==='me'){draft=clone(profile);renderMe()}}
const H_STEPS=['가고 싶은 곳 고르기','숙소 동네 정하기','교통편 시간대 정하기','예약하고 일정에 넣기'];
function renderHelper(){
  const el=$('#helperBody'); if(!el||$('#helper').hidden) return;
  $('#helperStep').textContent=`${hStep+1} / ${H_STEPS.length}`; $('#helperTitle').textContent=H_STEPS[hStep];
  $('#helperPrev').disabled=hStep===0; $('#helperNext').textContent=hStep===H_STEPS.length-1?'일정표로 가기':'다음';
  // drawn by React: app/screens/HelperBody.tsx
  let st;
  if(hStep===0){
    const list=P.filter(p=>!p.drop).sort((a,b)=>isWish(b.id)-isWish(a.id)||(!!MUST[b.id])-(!!MUST[a.id])||matchKw(b.id).length-matchKw(a.id).length);
    st={s:0,count:wish.filter(id=>PM[id]).length,list:list.map(p=>({id:String(p.id),on:!!isWish(p.id),name:String(p.name),sub:`${p.area} · ${CATS[p.cat]||''}${MUST[p.id]?' · ★':''}${recOf(p)?` · 👍${recOf(p)}`:''}`,note:p.note||''}))};
  }else if(hStep===1){
    const sc=areaScores().slice(0,3), cur=profile.bookedStay===false?profile.stayPicked:(profile.stays[0]||{}).area, nW=wish.filter(id=>PM[id]).length, cap=roomCap();
    st={s:1,intro:`${nW?`♥ ${nW}곳${(profile.events||[]).length?'과 예약한 일정':''}까지 이동 시간이 가장 짧은 동네예요.`:'♥를 고르지 않아서 공항 접근성 위주로 계산했어요. 1단계에서 ♥를 고르면 더 정확해져요.'} 이동 시간은 직선거리 기준 추정이에요.`,
      cards:sc.map(a=>{const v=hVibe&&hVibe[a.k];return {k:a.k,name:String(a.name),sel:cur===a.k,line:`♥ 장소까지 평균 ${Math.round(a.avg)}분 · 15분 안에 ${a.near}곳 · ${apName(profile.out.airport)}까지 약 ${a.air}분`,
        vibe:v?{vibe:v.vibe||'',good:`${v.good?'추천: '+v.good:''}${v.caution?' · 주의: '+v.caution:''}`}:null,
        cap:cap?`🏷 예산 기준 1박 약 ${won(cap)} 이하${heads()>1?` (${heads()}명 객실)`:''} · 부킹닷컴·에어비앤비 링크에 가격 상한을 넣었어요`:'',links:hotelLinks(a.name),
        hotelLabel:hotelRecs[a.k]?'숙소 후보 다시 받기':'이 동네 숙소 후보 보기',hotels:hotelInfo(a.k)}})};
  }else if(hStep===2){
    const sl=flightSlots().slice(0,4), M=profile.mode;
    st={s:2,intro:M==='car'?'자동차 여행이라 출발 시간만 정하면 돼요.':'시간대별로 여행지에서 실제로 쓸 수 있는 시간을 비교했어요. 첫날과 마지막 날만 달라지고, 가운데 날은 같아요.',car:M==='car',
      slots:sl.map((x,i)=>({title:`${i+1}. ${x.an} · ${x.dn}`,line:`첫날·마지막 날 합쳐 약 ${Math.round(x.h*10)/10}시간 자유 시간`,notes:x.notes.join(' · '),key:`${x.a},${x.d}`,picked:slotPicked===`${x.a},${x.d}`})),
      routeLabel:M!=='car'&&sample?`어떤 ${M==='flight'?'항공편':'교통편'}이 있는지 알아보기`:null,route:routeInfoView(),links:flightLinks()};
  }else st={s:3,bookedFlight:profile.bookedFlight!==false,bookedStay:profile.bookedStay!==false};
  window.JEPI_UI.mount('helper',el,{step:st,ai:!!sample,rev:++helperRev});
}
let helperRev=0, slotPicked=null;
function setSlot(a,d){
  const M=profile.mode, dur=PACK.intl?150:70;
  profile.out.arr=fmt(a); profile.out.dep=fmt(Math.max(0,a-dur)); profile.back.dep=fmt(d); profile.back.arr=fmt(Math.min(1439,d+dur));
  TRIP.save('profile',profile); buildDays(); slotPicked=`${a},${d}`; renderHelper();
}


// ---------- named lodging candidates and route advice (AI knowledge, verify prices via links) ----------
let hotelRecs={}, routeInfo=null, hrBusy=false;
async function askHotels(k){
  if(!sample||hrBusy||!AREAS[k]) return; hrBusy=true; const area=AREAS[k][0], st='st_hotel_'+k;
  progStart(st,`${area} 숙소 후보를 고르는 중이에요 (보통 20~40초)`,['hotelBtn_'+k],'고르는 중…');
  const cap=roomCap();
  try{
    hotelRecs[k]=await JD.asks.hotels(sample,k,cap);
    progStop(st); renderHelper(); setSt(st,hotelRecs[k].length?'가격과 빈방은 링크에서 꼭 확인하세요.':'후보를 찾지 못했어요.');
  }catch(e){setSt(st,errText(e,'숙소 후보를 받지 못했어요'))} finally{hrBusy=false}
}
// named stays for one area (drawn by React: HelperBody.tsx)
function hotelInfo(k){const L=hotelRecs[k];if(!L)return null;const ci=ymd(0),co=ymd(nightsOf(CUR.profile)),g=guests();
  return L.map(h=>{const q=encodeURIComponent((h.local||h.name)+' '+PK.pack.city);
    return {name:h.name,type:h.type||'',why:h.why||'',price:`${h.price}${h.caution?' · '+h.caution:''}`,
      links:[['지도',`https://www.google.com/maps/search/?api=1&query=${q}`],['부킹닷컴',`https://www.booking.com/searchresults.ko.html?ss=${q}&checkin=${ci}&checkout=${co}&group_adults=${g.a}&group_children=${g.k}&no_rooms=1`],['예약 검색',`https://www.google.com/search?q=${q}+%EC%98%88%EC%95%BD`]]}})}
async function askRoutes(){
  if(!sample||hrBusy) return; hrBusy=true;
  progStart('st_route','다니는 노선과 항공사를 정리하는 중이에요 (보통 20~40초)',['routeBtn'],'정리하는 중…');
  try{
    routeInfo=await JD.asks.routes(sample);
    progStop('st_route'); renderHelper(); setSt('st_route','시간표와 가격은 아래 검색 링크에서 확인하세요.');
  }catch(e){setSt('st_route',errText(e,'노선 정보를 받지 못했어요'))} finally{hrBusy=false}
}
function routeInfoView(){const R=routeInfo;if(!R||R.key!==PK.pack.city+'|'+CUR.profile.mode)return null;
  return {routes:R.routes.map(x=>({title:`${x.from} → ${x.to}`,type:x.type||'',duration:x.duration||'',carriers:`${x.carriers.join(', ')}${x.lcc?' · 저비용 항공사 있음':''}`,note:x.note||''})),tips:R.tips.slice()}}


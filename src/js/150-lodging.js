// ---------- named lodging candidates and route advice (AI knowledge, verify prices via links) ----------
let hotelRecs={}, routeInfo=null, hrBusy=false;
async function askHotels(k){
  if(!UI.sample||hrBusy||!AREAS[k]) return; hrBusy=true; const area=AREAS[k][0], st='st_hotel_'+k;
  progStart(st,`${area} 숙소 후보를 고르는 중이에요 (보통 20~40초)`,['hotelBtn_'+k],'고르는 중…');
  const cap=roomCap();
  try{
    hotelRecs[k]=await JD.asks.hotels(UI.sample,k,cap);
    progStop(st); renderHelper(); setSt(st,hotelRecs[k].length?'가격과 빈방은 링크에서 꼭 확인하세요.':'후보를 찾지 못했어요.');
  }catch(e){setSt(st,errText(e,'숙소 후보를 받지 못했어요'))} finally{hrBusy=false}
}
// named stays for one area (drawn by React: HelperBody.tsx)
async function askRoutes(){
  if(!UI.sample||hrBusy) return; hrBusy=true;
  progStart('st_route','다니는 노선과 항공사를 정리하는 중이에요 (보통 20~40초)',['routeBtn'],'정리하는 중…');
  try{
    routeInfo=await JD.asks.routes(UI.sample);
    progStop('st_route'); renderHelper(); setSt('st_route','시간표와 가격은 아래 검색 링크에서 확인하세요.');
  }catch(e){setSt('st_route',errText(e,'노선 정보를 받지 못했어요'))} finally{hrBusy=false}
}

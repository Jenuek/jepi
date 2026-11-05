// ---------- named lodging candidates and route advice (AI knowledge, verify prices via links) ----------
let hotelRecs={}, routeInfo=null, hrBusy=false;
async function askHotels(k){
  if(!sample||hrBusy||!AREAS[k]) return; hrBusy=true; const area=AREAS[k][0], st='st_hotel_'+k;
  progStart(st,`${area} 숙소 후보를 고르는 중이에요 (보통 20~40초)`,['hotelBtn_'+k],'고르는 중…');
  const cap=roomCap();
  try{
    const r=await sample.json(`Suggest 3 to 5 places to stay in or right next to ${area}, ${PACK.city}${PACK.country?', '+PACK.country:''} for this trip.
${profileSummary()}
Guests: ${heads()} (${partyEn(CUR.profile.party)}). Nights: ${nightsOf(CUR.profile)}.${cap?` Room budget: about KRW ${cap} per night or less.`:''}
Prefer long-established, well-known places that are very likely still operating. Do not invent places; if unsure, give fewer. Mix types when it suits them (hotel, ryokan or local inn, guesthouse, serviced apartment).
Reply with only JSON: {"stays":[{"name":"Korean name","local":"name in local language or English for search","type":"Korean type label","why":"one Korean sentence: why it fits this traveler","price":"Korean rough nightly price band from past years, e.g. 1박 10~15만원 (예년 기준)","caution":"short Korean caution or empty"}]}`,{cache:false});
    hotelRecs[k]=(Array.isArray(r&&r.stays)?r.stays:[]).filter(x=>x&&x.name).slice(0,5).map(x=>({name:String(x.name).slice(0,40),local:String(x.local||'').slice(0,60),type:String(x.type||'').slice(0,16),why:String(x.why||'').slice(0,140),price:String(x.price||'').slice(0,40),caution:String(x.caution||'').slice(0,80)}));
    progStop(st); renderHelper(); setSt(st,hotelRecs[k].length?'가격과 빈방은 링크에서 꼭 확인하세요.':'후보를 찾지 못했어요.');
  }catch(e){setSt(st,errText(e,'숙소 후보를 받지 못했어요'))} finally{hrBusy=false}
}
// named stays for one area (drawn by React: HelperBody.tsx)
function hotelInfo(k){const L=hotelRecs[k];if(!L)return null;const ci=ymd(0),co=ymd(nightsOf(CUR.profile)),g=guests();
  return L.map(h=>{const q=encodeURIComponent((h.local||h.name)+' '+PACK.city);
    return {name:h.name,type:h.type||'',why:h.why||'',price:`${h.price}${h.caution?' · '+h.caution:''}`,
      links:[['지도',`https://www.google.com/maps/search/?api=1&query=${q}`],['부킹닷컴',`https://www.booking.com/searchresults.ko.html?ss=${q}&checkin=${ci}&checkout=${co}&group_adults=${g.a}&group_children=${g.k}&no_rooms=1`],['예약 검색',`https://www.google.com/search?q=${q}+%EC%98%88%EC%95%BD`]]}})}
async function askRoutes(){
  if(!sample||hrBusy) return; hrBusy=true; const gw=AIRPORTS[CUR.profile.out.airport]||{}, M=CUR.profile.mode;
  progStart('st_route','다니는 노선과 항공사를 정리하는 중이에요 (보통 20~40초)',['routeBtn'],'정리하는 중…');
  try{
    const r=await sample.json(`A traveler from Seoul, South Korea is going to ${PACK.city}${PACK.country?', '+PACK.country:''} by ${M==='flight'?'plane':M==='train'?'train':'bus'}${gw.name?` (arriving at ${gw.name}${gw.iata?' '+gw.iata:''})`:''}. ${heads()} people, ${nightsOf(CUR.profile)} nights.${budgetParts()?` Transport and lodging budget about KRW ${budgetParts().trip} per person.`:''}
Describe the usual ways to get there: departure airport or station in Seoul (Incheon/Gimpo or Seoul/Yongsan/Express Bus Terminal), direct or connecting, which carriers usually operate (full-service vs low-cost), typical travel time. Do not invent flight numbers or exact times; describe what generally operates and note that schedules change.
Reply with only JSON: {"routes":[{"from":"Korean","to":"Korean","type":"직항|경유|기차|버스","carriers":["Korean names"],"lcc":true,"duration":"Korean e.g. 약 2시간","note":"short Korean"}],"tips":["2-4 short Korean tips for choosing and booking, e.g. baggage on low-cost carriers, best booking timing"]}`,{cache:false});
    routeInfo={key:PACK.city+'|'+M,routes:(Array.isArray(r&&r.routes)?r.routes:[]).slice(0,5).map(x=>({from:String(x.from||'').slice(0,20),to:String(x.to||'').slice(0,20),type:String(x.type||'').slice(0,8),carriers:(Array.isArray(x.carriers)?x.carriers:[]).map(c=>String(c).slice(0,16)).slice(0,6),lcc:!!x.lcc,duration:String(x.duration||'').slice(0,20),note:String(x.note||'').slice(0,100)})),tips:(Array.isArray(r&&r.tips)?r.tips:[]).map(t=>String(t).slice(0,120)).slice(0,4)};
    progStop('st_route'); renderHelper(); setSt('st_route','시간표와 가격은 아래 검색 링크에서 확인하세요.');
  }catch(e){setSt('st_route',errText(e,'노선 정보를 받지 못했어요'))} finally{hrBusy=false}
}
function routeInfoView(){const R=routeInfo;if(!R||R.key!==PACK.city+'|'+CUR.profile.mode)return null;
  return {routes:R.routes.map(x=>({title:`${x.from} → ${x.to}`,type:x.type||'',duration:x.duration||'',carriers:`${x.carriers.join(', ')}${x.lcc?' · 저비용 항공사 있음':''}`,note:x.note||''})),tips:R.tips.slice()}}


// What the 예약 도우미 shows at each step (HelperBody.tsx): ① places to ♥, ② the best areas to stay (with their vibe, a
// room budget, search links and named stays), ③ flight / train time slots and links, ④ booking status. This only makes
// the props. (It used to be renderHelper / areaScores / flightSlots / hotelLinks … in src/js/100-booking.js and
// 150-lodging.js.) What the AI answered (vibes, stays, routes) and the open step are the old code's (HelperState).
import * as trip from '../data/trip';
import * as places from '../data/places';
import * as check from '../data/check';
import * as recs from '../data/recs';
import { nightsOf } from '../data/days';
import { ymd, guests, roomCap, heads, won } from '../data/traveler';
import { matchKw } from './tray';

// names as the old code used them (loosely shaped trip values)
const CUR = trip.cur as any, PK = places.state as any;
const { AREAS, AIRPORTS, MUST, PM, P, CATS, firstArea } = places as any;
const travel = (a: any, b: any) => check.travel(a, b);
const isWish = (id: string) => trip.wish.has(id);
const recOf = (p: any) => recs.countOf(recs.placeKey(PK.pack.city || '', p.name));
const apName = (k: string) => (AIRPORTS[k] || AIRPORTS[places.firstGw()]).name;

/** what the old code keeps for the helper */
export interface HelperState { vibe: Record<string, any> | null; hotelRecs: Record<string, any[]>; routeInfo: any; slotPicked: string | null; ai: boolean }

function hotelLinks(areaName: string){
  const q=encodeURIComponent(`${areaName}, ${PK.pack.city}`), ci=ymd(0), co=ymd(nightsOf(CUR.profile)), g=guests(), cap=roomCap();
  return [['부킹닷컴',`https://www.booking.com/searchresults.ko.html?ss=${q}&checkin=${ci}&checkout=${co}&group_adults=${g.a}&group_children=${g.k}&no_rooms=1${cap?`&selected_currency=KRW&nflt=${encodeURIComponent(`price=KRW-min-${cap}-1`)}`:''}`],
    ['에어비앤비',`https://www.airbnb.co.kr/s/${q}/homes?checkin=${ci}&checkout=${co}&adults=${g.a}&children=${g.k}${cap?`&currency=KRW&price_max=${cap}`:''}`],
    ['아고다',`https://www.agoda.com/ko-kr/search?textToSearch=${q}&checkIn=${ci}&checkOut=${co}&rooms=1&adults=${g.a}&children=${g.k}`],
    ['구글 지도에서 숙소 보기',`https://www.google.com/maps/search/${encodeURIComponent('숙소 '+areaName+' '+PK.pack.city)}`]];
}
function flightLinks(){
  const g=guests(), gw=AIRPORTS[CUR.profile.out.airport]||{}, M=CUR.profile.mode, out=ymd(0), back=ymd(nightsOf(CUR.profile));
  if(M==='car') return [];
  if(M==='train'||M==='bus') return [[M==='train'?'코레일':'버스타고',M==='train'?'https://www.letskorail.com/':'https://www.bustago.or.kr/'],['구글에서 교통편 찾기',`https://www.google.com/search?q=${encodeURIComponent(`서울에서 ${PK.pack.city} ${M==='train'?'기차':'버스'} ${out}`)}`]];
  const L=[['구글 항공편',`https://www.google.com/travel/flights?hl=ko&q=${encodeURIComponent(`Flights from Seoul to ${gw.iata||PK.pack.city} on ${out} through ${back} ${g.a} adults${g.k?` ${g.k} children`:''}`)}`]];
  if(gw.iata) L.push(['스카이스캐너',`https://www.skyscanner.co.kr/transport/flights/sela/${gw.iata.toLowerCase()}/${out.slice(2).replace(/-/g,'')}/${back.slice(2).replace(/-/g,'')}/?adultsv2=${g.a}${g.k?`&childrenv2=${Array(g.k).fill(8).join('|')}`:''}`]);
  L.push(['네이버 항공권',`https://flight.naver.com/`]);
  return L;
}
/** the areas ranked as places to stay: near the ♥ places and booked events, not too far from the airport */
export function areaScores(){
  const tg=[...CUR.wish.filter((id: any)=>PM[id]).map((id: any)=>({ll:PM[id].ll,w:MUST[id]?1.5:1})),...(CUR.profile.events||[]).filter((e: any)=>AREAS[e.area]).map((e: any)=>({ll:[AREAS[e.area][1],AREAS[e.area][2]],w:3}))];
  const gw=AIRPORTS[CUR.profile.out.airport];
  return Object.keys(AREAS).map((k: any)=>{const ll=[AREAS[k][1],AREAS[k][2]];let tot=0,ws=0,near=0;
    tg.forEach((t: any)=>{const tr=travel(ll,t.ll),m=tr?tr.min:5;tot+=m*t.w;ws+=t.w;if(m<=15)near++});
    const air=gw?((travel(ll,gw.ll)||{min:0}).min):0, avg=ws?tot/ws:0;
    return {k,name:AREAS[k][0],avg,air,near,score:avg+air*0.15}}).sort((a: any,b: any)=>a.score-b.score);
}
function flightSlots(){
  const intl=!!PK.pack.intl, M=CUR.profile.mode, gw=AIRPORTS[CUR.profile.out.airport], st=AREAS[(CUR.profile.stays[0]||{}).area]||AREAS[firstArea()];
  const toCity=gw?((travel(gw.ll,[st[1],st[2]])||{min:30}).min):30;
  const proc=M==='flight'?(intl?60:30):15, lead=M==='flight'?(intl?180:90):20;
  const A=[['아침 도착',540],['낮 도착',780],['저녁 도착',1140]], D=[['아침 출발',600],['낮 출발',900],['저녁 출발',1200]];
  const res: any[]=[]; A.forEach(([an,a]: any)=>D.forEach(([dn,d]: any)=>{
    const first=Math.max(0,1320-(a+proc+toCity)), last=Math.max(0,(d-lead-toCity)-540);
    const notes=[]; if(a+proc+toCity<900) notes.push('체크인 전이라 짐 보관이 필요해요'); if(a<=540) notes.push('출발이 이른 새벽이에요');
    if(last<120) notes.push('마지막 날은 거의 이동만 해요'); if(d>=1200) notes.push('늦게 돌아와요');
    res.push({an,dn,a,d,h:(first+last)/60,notes})}));
  return res.sort((x: any,y: any)=>y.h-x.h);
}
function hotelInfo(k: string, hotelRecs: Record<string, any[]>){const L=hotelRecs[k];if(!L)return null;const ci=ymd(0),co=ymd(nightsOf(CUR.profile)),g=guests();
  return L.map((h: any)=>{const q=encodeURIComponent((h.local||h.name)+' '+PK.pack.city);
    return {name:h.name,type:h.type||'',why:h.why||'',price:`${h.price}${h.caution?' · '+h.caution:''}`,
      links:[['지도',`https://www.google.com/maps/search/?api=1&query=${q}`],['부킹닷컴',`https://www.booking.com/searchresults.ko.html?ss=${q}&checkin=${ci}&checkout=${co}&group_adults=${g.a}&group_children=${g.k}&no_rooms=1`],['예약 검색',`https://www.google.com/search?q=${q}+%EC%98%88%EC%95%BD`]]}})}
function routeInfoView(routeInfo: any){const R=routeInfo;if(!R||R.key!==PK.pack.city+'|'+CUR.profile.mode)return null;
  return {routes:R.routes.map((x: any)=>({title:`${x.from} → ${x.to}`,type:x.type||'',duration:x.duration||'',carriers:`${x.carriers.join(', ')}${x.lcc?' · 저비용 항공사 있음':''}`,note:x.note||''})),tips:R.tips.slice()}}
/** the props of step hStep (0 … 3) */
export function step(hStep: number, S: HelperState): any {
  const { vibe: hVibe, hotelRecs, routeInfo, slotPicked } = S, sample = S.ai;
  let st;
  if(hStep===0){
    const list=P.filter((p: any)=>!p.drop).sort((a: any,b: any)=>(+isWish(b.id))-(+isWish(a.id))||(+!!MUST[b.id])-(+!!MUST[a.id])||matchKw(b.id).length-matchKw(a.id).length);
    st={s:0,count:CUR.wish.filter((id: any)=>PM[id]).length,list:list.map((p: any)=>({id:String(p.id),on:!!isWish(p.id),name:String(p.name),sub:`${p.area} · ${CATS[p.cat]||''}${MUST[p.id]?' · ★':''}${recOf(p)?` · 👍${recOf(p)}`:''}`,note:p.note||''}))};
  }else if(hStep===1){
    const sc=areaScores().slice(0,3), cur=CUR.profile.bookedStay===false?CUR.profile.stayPicked:(CUR.profile.stays[0]||{}).area, nW=CUR.wish.filter((id: any)=>PM[id]).length, cap=roomCap();
    st={s:1,intro:`${nW?`♥ ${nW}곳${(CUR.profile.events||[]).length?'과 예약한 일정':''}까지 이동 시간이 가장 짧은 동네예요.`:'♥를 고르지 않아서 공항 접근성 위주로 계산했어요. 1단계에서 ♥를 고르면 더 정확해져요.'} 이동 시간은 직선거리 기준 추정이에요.`,
      cards:sc.map((a: any)=>{const v=hVibe&&hVibe[a.k];return {k:a.k,name:String(a.name),sel:cur===a.k,line:`♥ 장소까지 평균 ${Math.round(a.avg)}분 · 15분 안에 ${a.near}곳 · ${apName(CUR.profile.out.airport)}까지 약 ${a.air}분`,
        vibe:v?{vibe:v.vibe||'',good:`${v.good?'추천: '+v.good:''}${v.caution?' · 주의: '+v.caution:''}`}:null,
        cap:cap?`🏷 예산 기준 1박 약 ${won(cap)} 이하${heads()>1?` (${heads()}명 객실)`:''} · 부킹닷컴·에어비앤비 링크에 가격 상한을 넣었어요`:'',links:hotelLinks(a.name),
        hotelLabel:hotelRecs[a.k]?'숙소 후보 다시 받기':'이 동네 숙소 후보 보기',hotels:hotelInfo(a.k,hotelRecs)}})};
  }else if(hStep===2){
    const sl=flightSlots().slice(0,4), M=CUR.profile.mode;
    st={s:2,intro:M==='car'?'자동차 여행이라 출발 시간만 정하면 돼요.':'시간대별로 여행지에서 실제로 쓸 수 있는 시간을 비교했어요. 첫날과 마지막 날만 달라지고, 가운데 날은 같아요.',car:M==='car',
      slots:sl.map((x: any,i: any)=>({title:`${i+1}. ${x.an} · ${x.dn}`,line:`첫날·마지막 날 합쳐 약 ${Math.round(x.h*10)/10}시간 자유 시간`,notes:x.notes.join(' · '),key:`${x.a},${x.d}`,picked:slotPicked===`${x.a},${x.d}`})),
      routeLabel:M!=='car'&&sample?`어떤 ${M==='flight'?'항공편':'교통편'}이 있는지 알아보기`:null,route:routeInfoView(routeInfo),links:flightLinks()};
  }else st={s:3,bookedFlight:CUR.profile.bookedFlight!==false,bookedStay:CUR.profile.bookedStay!==false};
  return st;
}

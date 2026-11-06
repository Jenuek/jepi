// 예약 도우미 (① ♥ places → ② where to stay → ③ flight / train times → ④ booking status), the AI answers in it (동네 분위기,
// named stays, routes, a pasted list of places), and 시즌 정보 (what is special on these dates). (It used to be
// src/js/100-booking.js, 110-season.js and 150-lodging.js.) The old code reads its state as HS.step, HS.vibe …
// What the old code still does is passed in once with connect() (Legacy).
import * as trip from '../data/trip';
import * as places from '../data/places';
import * as asks from '../data/asks';
import * as season from '../data/season';
import { buildDays } from '../data/days';
import { roomCap } from '../data/traveler';
import { fmt } from '../logic/time';
import { ui } from '../ui/state';
import { progStart, progStop, setSt, errText } from '../ui/status';
import * as HV from '../view/helper';
import { fs } from './forms';
import * as R from './render';
export const hs = {
  /** the open step (0 … 3) */
  step: 0,
  /** the AI's 동네 분위기 answer, named stays by area, route advice */
  vibe: null as any,
  hotelRecs: {} as Record<string, any[]>,
  routeInfo: null as any,
  /** an AI question is running (분위기 / 숙소·노선) */
  busy: false,
  hrBusy: false,
  /** ③ the time slot picked ("arrive,depart" in minutes) */
  slotPicked: null as string | null,
};

/** what the old code still does */
export interface Legacy { maybeCoach(): void; renderMe(): void }
let L: Legacy;
export function connect(l: Legacy): void { L = l }

const $ = (s: string) => document.querySelector(s) as any;
const mount = (name: string, el: Element, props: any) => (window.JEPI_UI.mount as any)(name, el, props);
const CUR = trip.cur as any, PK = places.state as any;
const clone = (o: any) => JSON.parse(JSON.stringify(o));
const seasonOf = season.seasonOf, tripKey = season.tripKey;

export const needBooking=()=>CUR.profile.kind!=='day'&&(CUR.profile.bookedFlight===false||CUR.profile.bookedStay===false);
// the helper's steps (areas to stay, time slots, links): app/view/helper.ts
const areaScores=()=>HV.areaScores();
export async function resolveWishes(text?: any, stId?: any){
  if(!ui.sample||!text.trim()) return;
  progStart(stId,'목록의 장소를 찾는 중이에요 (보통 30초~1분)',['wishPasteBtn'],'찾는 중…');
  try{
    const {n,added}=await asks.wishesFromList(ui.sample,text); progStop(stId); renderHelper(); R.renderTray(); setSt(stId,n?`${n}곳에 ♥를 붙였어요${added?` (새로 찾은 곳 ${added}곳)`:''}.`:'목록에서 장소를 찾지 못했어요.');
  }catch(e: any){setSt(stId,errText(e,'장소를 찾지 못했어요'))}
}
export async function askVibes(){
  if(!ui.sample||hs.busy) return; hs.busy=true; const top=areaScores().slice(0,3);
  progStart('st_vibe','동네 분위기를 정리하는 중이에요 (보통 15~30초)',['vibeBtn'],'정리하는 중…');
  try{hs.vibe=await asks.vibes(ui.sample,top); progStop('st_vibe');
  }catch(e: any){setSt('st_vibe',errText(e,'정리하지 못했어요'))} finally{hs.busy=false;renderHelper()}
}
// What was pressed inside the 예약 도우미 (HelperBody.tsx tells: its name and value)
export function helperAct(n?: any, v?: any, v2?: any){
  switch(n){
  case 'paste': resolveWishes(v||'','st_wish');return;   // ① the pasted list of names
  case 'vibe': askVibes();return;
  case 'hotels': askHotels(v);return;
  case 'route': askRoutes();return;
  case 'setarea': {const k=v;CUR.profile.stayPicked=k;CUR.profile.stays.forEach((st: any,i: any)=>{if(i===0||CUR.profile.bookedStay===false){st.area=k;if(CUR.profile.bookedStay===false)st.name=`숙소 (미정 · ${places.AREAS[k][0]})`}});trip.save('profile',CUR.profile);buildDays();renderHelper();return}
  case 'slot': {const [a,d]=String(v).split(',').map(Number);setSlot(a,d);return}
  case 'radio': CUR.profile[v]=v2==='true';trip.save('profile',CUR.profile);renderHelper();return;   // ④ 예약 상태
  case 'toMe': closeHelper();ui.tab='me';fs.draft=clone(CUR.profile);L.renderMe();R.renderTabs();return;
  }
}
// the frame (drawn by React: app/screens/Frames.tsx) shows what helperView says; the step itself goes into #helperBody
let helperView: any={open:false,step:'',title:'',prevOff:false,nextLabel:'다음'};
export function drawHelperFrame(){mount('helperFrame',$('#helperMount'),helperView)}
export function helperOpen(){return helperView.open}
export function helperShow(on?: any){helperView={...helperView,open:on};drawHelperFrame()}
// prev / next / close were pressed in the frame
export function helperFrameAct(n?: any){
  if(n==='prev'){if(hs.step>0){hs.step--;renderHelper();$('#helper').scrollTop=0}return}
  if(n==='next'){if(hs.step<H_STEPS.length-1){hs.step++;renderHelper();$('#helper').scrollTop=0}else closeHelper();return}
  if(n==='close')closeHelper()
}
export function openHelper(step?: any){hs.step=step||0;hs.slotPicked=null;$('#meBox').innerHTML='';helperShow(true);renderHelper()}
export function closeHelper(){helperShow(false);R.renderAll();L.maybeCoach();if(ui.tab==='me'){fs.draft=clone(CUR.profile);L.renderMe()}}
export const H_STEPS=['가고 싶은 곳 고르기','숙소 동네 정하기','교통편 시간대 정하기','예약하고 일정에 넣기'];
export function renderHelper(){
  if(!helperView.open) return;
  helperView={...helperView,step:`${hs.step+1} / ${H_STEPS.length}`,title:H_STEPS[hs.step],prevOff:hs.step===0,nextLabel:hs.step===H_STEPS.length-1?'일정표로 가기':'다음'}; drawHelperFrame();
  const el=$('#helperBody'); if(!el) return;
  // drawn by React: app/screens/HelperBody.tsx
  const st=HV.step(hs.step,{vibe:hs.vibe,hotelRecs:hs.hotelRecs,routeInfo:hs.routeInfo,slotPicked:hs.slotPicked,ai:!!ui.sample});
  mount('helper',el,{step:st,ai:!!ui.sample,rev:++helperRev});
}
let helperRev=0;
export function setSlot(a?: any, d?: any){
  const dur=PK.pack.intl?150:70;
  CUR.profile.out.arr=fmt(a); CUR.profile.out.dep=fmt(Math.max(0,a-dur)); CUR.profile.back.dep=fmt(d); CUR.profile.back.arr=fmt(Math.min(1439,d+dur));
  trip.save('profile',CUR.profile); buildDays(); hs.slotPicked=`${a},${d}`; renderHelper();
}

export async function genSeason(stId?: any, signal?: any){
  if(!ui.sample) return false;
  progStart(stId,'이 시기만의 특징과 행사를 찾는 중이에요 (보통 30초~1분)',['seasonBtn'],'찾는 중…');
  try{
    const n=await asks.seasonInfo(ui.sample,signal);   // app/data/asks.ts
    progStop(stId); R.renderAll(); setSt(stId,`이 시기 정보를 받았어요${n?` · 시즌 장소 ${n}곳 추가`:''}.`); return true;
  }catch(e: any){setSt(stId,e&&e.code==='cancelled'?'멈췄어요. "확인할 것" 탭에서 다시 받을 수 있어요.':errText(e,'시즌 정보를 받지 못했어요'));return false}
}
// 준비하기 → 이 시기 여행 팁 (drawn by React: Checks.tsx)
export function seasonInfo(){
  const s=seasonOf(), stale=!!(PK.pack.season&&!s);
  return {got:s?{sun:`${s.sunrise?`🌅 일출 약 ${s.sunrise} · `:''}${s.sunset?`🌇 일몰 약 ${s.sunset}`:''}`,weather:s.weather||'',notes:(s.notes||[]).map((t: any,i: any)=>R.ckInfo('sn'+i+'_'+tripKey(),t))}:null,
    stale,canAsk:!!(ui.sample&&!PK.pack.manual)};
}

export async function askHotels(k?: any){
  if(!ui.sample||hs.hrBusy||!places.AREAS[k]) return; hs.hrBusy=true; const area=places.AREAS[k][0], st='st_hotel_'+k;
  progStart(st,`${area} 숙소 후보를 고르는 중이에요 (보통 20~40초)`,['hotelBtn_'+k],'고르는 중…');
  const cap=roomCap();
  try{
    hs.hotelRecs[k]=await asks.hotels(ui.sample,k,cap);
    progStop(st); renderHelper(); setSt(st,hs.hotelRecs[k].length?'가격과 빈방은 링크에서 꼭 확인하세요.':'후보를 찾지 못했어요.');
  }catch(e: any){setSt(st,errText(e,'숙소 후보를 받지 못했어요'))} finally{hs.hrBusy=false}
}
// named stays for one area (drawn by React: HelperBody.tsx)
export async function askRoutes(){
  if(!ui.sample||hs.hrBusy) return; hs.hrBusy=true;
  progStart('st_route','다니는 노선과 항공사를 정리하는 중이에요 (보통 20~40초)',['routeBtn'],'정리하는 중…');
  try{
    hs.routeInfo=await asks.routes(ui.sample);
    progStop('st_route'); renderHelper(); setSt('st_route','시간표와 가격은 아래 검색 링크에서 확인하세요.');
  }catch(e: any){setSt('st_route',errText(e,'노선 정보를 받지 못했어요'))} finally{hs.hrBusy=false}
}

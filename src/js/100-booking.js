// ---------- booking helper: wish list → where to stay → flight times → search links ----------
CUR.wish=[]; let hStep=0, hVibe=null, hBusy=false;
const isWish=id=>TRIP.wish.has(id), toggleWish=id=>TRIP.wish.toggle(id);   // app/data/trip.ts
const needBooking=()=>CUR.profile.kind!=='day'&&(CUR.profile.bookedFlight===false||CUR.profile.bookedStay===false);
const ymd=TV.ymd;   // app/data/traveler.ts
const guests=TV.guests;   // app/data/traveler.ts
// the helper's steps (areas to stay, time slots, links): app/view/helper.ts
const areaScores=()=>window.JEPI_UI.view.helper.areaScores();
async function resolveWishes(text,stId){
  if(!sample||!text.trim()) return;
  progStart(stId,'목록의 장소를 찾는 중이에요 (보통 30초~1분)',['wishPasteBtn'],'찾는 중…');
  try{
    const {n,added}=await JD.asks.wishesFromList(sample,text); progStop(stId); renderHelper(); renderTray(); setSt(stId,n?`${n}곳에 ♥를 붙였어요${added?` (새로 찾은 곳 ${added}곳)`:''}.`:'목록에서 장소를 찾지 못했어요.');
  }catch(e){setSt(stId,errText(e,'장소를 찾지 못했어요'))}
}
async function askVibes(){
  if(!sample||hBusy) return; hBusy=true; const top=areaScores().slice(0,3);
  progStart('st_vibe','동네 분위기를 정리하는 중이에요 (보통 15~30초)',['vibeBtn'],'정리하는 중…');
  try{hVibe=await JD.asks.vibes(sample,top); progStop('st_vibe');
  }catch(e){setSt('st_vibe',errText(e,'정리하지 못했어요'))} finally{hBusy=false;renderHelper()}
}
// What was pressed inside the 예약 도우미 (HelperBody.tsx tells: its name and value)
function helperAct(n,v,v2){
  switch(n){
  case 'paste': resolveWishes(v||'','st_wish');return;   // ① the pasted list of names
  case 'vibe': askVibes();return;
  case 'hotels': askHotels(v);return;
  case 'route': askRoutes();return;
  case 'setarea': {const k=v;CUR.profile.stayPicked=k;CUR.profile.stays.forEach((st,i)=>{if(i===0||CUR.profile.bookedStay===false){st.area=k;if(CUR.profile.bookedStay===false)st.name=`숙소 (미정 · ${AREAS[k][0]})`}});TRIP.save('profile',CUR.profile);buildDays();renderHelper();return}
  case 'slot': {const [a,d]=String(v).split(',').map(Number);setSlot(a,d);return}
  case 'radio': CUR.profile[v]=v2==='true';TRIP.save('profile',CUR.profile);renderHelper();return;   // ④ 예약 상태
  case 'toMe': closeHelper();tab='me';draft=clone(CUR.profile);renderMe();renderTabs();return;
  }
}
// the frame (drawn by React: app/screens/Frames.tsx) shows what helperView says; the step itself goes into #helperBody
let helperView={open:false,step:'',title:'',prevOff:false,nextLabel:'다음'};
function drawHelperFrame(){window.JEPI_UI.mount('helperFrame',$('#helperMount'),helperView)}
function helperOpen(){return helperView.open}
function helperShow(on){helperView={...helperView,open:on};drawHelperFrame()}
// prev / next / close were pressed in the frame
function helperFrameAct(n){
  if(n==='prev'){if(hStep>0){hStep--;renderHelper();$('#helper').scrollTop=0}return}
  if(n==='next'){if(hStep<H_STEPS.length-1){hStep++;renderHelper();$('#helper').scrollTop=0}else closeHelper();return}
  if(n==='close')closeHelper()
}
function openHelper(step){hStep=step||0;slotPicked=null;$('#meBox').innerHTML='';helperShow(true);renderHelper()}
function closeHelper(){helperShow(false);renderAll();maybeCoach();if(tab==='me'){draft=clone(CUR.profile);renderMe()}}
const H_STEPS=['가고 싶은 곳 고르기','숙소 동네 정하기','교통편 시간대 정하기','예약하고 일정에 넣기'];
function renderHelper(){
  if(!helperView.open) return;
  helperView={...helperView,step:`${hStep+1} / ${H_STEPS.length}`,title:H_STEPS[hStep],prevOff:hStep===0,nextLabel:hStep===H_STEPS.length-1?'일정표로 가기':'다음'}; drawHelperFrame();
  const el=$('#helperBody'); if(!el) return;
  // drawn by React: app/screens/HelperBody.tsx
  const st=window.JEPI_UI.view.helper.step(hStep,{vibe:hVibe,hotelRecs,routeInfo,slotPicked,ai:!!sample});
  window.JEPI_UI.mount('helper',el,{step:st,ai:!!sample,rev:++helperRev});
}
let helperRev=0, slotPicked=null;
function setSlot(a,d){
  const M=CUR.profile.mode, dur=PK.pack.intl?150:70;
  CUR.profile.out.arr=fmt(a); CUR.profile.out.dep=fmt(Math.max(0,a-dur)); CUR.profile.back.dep=fmt(d); CUR.profile.back.arr=fmt(Math.min(1439,d+dur));
  TRIP.save('profile',CUR.profile); buildDays(); slotPicked=`${a},${d}`; renderHelper();
}


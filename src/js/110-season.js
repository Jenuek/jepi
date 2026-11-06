// ---------- season & time-of-day: what is special on these dates, and when each place is best ----------
// season facts of this trip and what they mean for places: app/data/season.ts
const SN=JD.season, tripKey=SN.tripKey, seasonOf=SN.seasonOf;
async function genSeason(stId,signal){
  if(!UI.sample) return false;
  progStart(stId,'이 시기만의 특징과 행사를 찾는 중이에요 (보통 30초~1분)',['seasonBtn'],'찾는 중…');
  try{
    const n=await JD.asks.seasonInfo(UI.sample,signal);   // app/data/asks.ts
    progStop(stId); renderAll(); setSt(stId,`이 시기 정보를 받았어요${n?` · 시즌 장소 ${n}곳 추가`:''}.`); return true;
  }catch(e){setSt(stId,e&&e.code==='cancelled'?'멈췄어요. "확인할 것" 탭에서 다시 받을 수 있어요.':errText(e,'시즌 정보를 받지 못했어요'));return false}
}
// 준비하기 → 이 시기 여행 팁 (drawn by React: Checks.tsx)
function seasonInfo(){
  const s=seasonOf(), stale=!!(PK.pack.season&&!s);
  return {got:s?{sun:`${s.sunrise?`🌅 일출 약 ${s.sunrise} · `:''}${s.sunset?`🌇 일몰 약 ${s.sunset}`:''}`,weather:s.weather||'',notes:(s.notes||[]).map((t,i)=>ckInfo('sn'+i+'_'+tripKey(),t))}:null,
    stale,canAsk:!!(UI.sample&&!PK.pack.manual)};
}


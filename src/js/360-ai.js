// ---------- AI ----------
async function askAI(){
  if(!UI.sample) return;
  const gaps=gapsOf(UI.day);
  if(!gaps.length){UI.aiState={day:UI.day,status:'error',msg:'이 날은 90분 이상 빈 시간이 없어요. 블록을 조금 빼거나 옮겨 보세요.'};renderAI();return}
  const ctl=new AbortController();
  UI.aiState={day:UI.day,status:'loading',ctl}; renderAI(); dock({aiOff:true});
  try{
    const {items:kept,dropped}=await JD.asks.fillDay(UI.sample,UI.day,ctl.signal);   // the question and its checks: app/data/asks.ts
    UI.aiState={day:UI.day,status:'done',items:kept,dropped};
  }catch(e){
    if(e&&e.code==='cancelled'){UI.aiState=null}
    else if(e&&(e.code==='not_granted'||e.code==='sampling_disabled'||e.code==='not_declared'||e.code==='capability_disabled')){UI.sample=null;UI.aiState={day:UI.day,status:'error',msg:'이 화면에서는 AI 추천을 쓸 수 없어요. 블록은 직접 넣을 수 있어요.'}}
    else if(e&&e.code==='rate_limited'){UI.aiState={day:UI.day,status:'error',msg:'요청이 많아 잠시 쉬어야 해요. 조금 뒤에 다시 눌러 주세요.'}}
    else if(e&&e.code==='invalid_json'){UI.aiState={day:UI.day,status:'error',msg:'추천 형식을 읽지 못했어요. 한 번 더 눌러 주세요.'}}
    else {UI.aiState={day:UI.day,status:'error',msg:(e&&e.message&&e.code!=='upstream_error'||e&&e.code==='upstream_error'&&e.message?e.message+' · ':'연결이 잠시 끊겼어요. ')+'다시 눌러 주세요.'}}
  }finally{dock({aiOff:false}); renderAll()}
}


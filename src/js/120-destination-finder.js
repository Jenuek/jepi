// ---------- destination finder: for travelers who have not picked a place yet ----------
let destRecs=null, destAsked=[], destBusy=false;
const BUDGET_EN=TV.BUDGET_EN;   // app/data/traveler.ts
const REACH_EN=JD.asks.REACH_EN;   // app/data/asks.ts
// drawn by React: app/screens/OnbFinder.tsx
function partFinder(p){
  return {f:'finder',ai:!!sample,party:p.party.type,reach:p.reach,budget:p.budget,budgetMan:p.budgetMan||'',nights:nightsOf(p),
    chips:[...new Set([...GENERIC_KW,...CUR.kws])].map(k=>({k,on:CUR.kws.some(x=>norm(x)===norm(k))})),
    styleRows:STYLE_ROWS,style:clone(p.style||{}),styleOpen,want:p.want||'',recs:destRecs?clone(destRecs):null,asked:clone(destAsked)};
}
async function recommendDest(mode){
  if(!sample||destBusy) return; destBusy=true; mode=mode||{};
  const prev=(destRecs||[]).map(d=>d.city);
  const want=(($('#destWant')||{}).value||'').trim(); draft.want=want; if(want&&!draft.purpose) draft.purpose=want.slice(0,80);
  const stId=mode.ask?'st_ask':mode.more?'st_more':'st_dest';
  progStart(stId,mode.ask?`${mode.ask}이(가) 맞는지 살펴보는 중이에요 (보통 15~30초)`:'이 조건에 맞는 여행지를 고르는 중이에요 (보통 20~40초)',['destRecBtn','destMoreBtn','destAskBtn'],'고르는 중…');
  const q=fixProfile(draft);
  try{
    const got=await JD.asks.destinations(sample,q,mode,prev,want);   // the question and tidying the answer: app/data/asks.ts
    if(mode.ask) destAsked=[...got.slice(0,1),...destAsked.filter(d=>!got.some(g=>g.city===d.city))].slice(0,3);
    else destRecs=mode.more?[...(destRecs||[]),...got.filter(g=>!prev.includes(g.city))].slice(0,15):got;
    progStop(stId); TRIP.kws.save(CUR.kws); rerenderForm();
    if(mode.ask){setSt('st_ask',got.length?'아래에 정리했어요.':'정보를 찾지 못했어요. 이름을 조금 더 정확히 적어 주세요.');const c=document.getElementById('asked-0');if(c)c.scrollIntoView({block:'nearest'})}
    else setSt(stId,(destRecs||[]).length?(mode.more?'아래에 더 추가했어요.':'아래에서 마음에 드는 곳을 골라 주세요.'):'추천을 받지 못했어요. 조건을 바꿔 다시 해 보세요.');
  }catch(e){setSt(stId,errText(e,'추천을 받지 못했어요'))} finally{destBusy=false}
}


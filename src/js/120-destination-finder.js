// ---------- destination finder: for travelers who have not picked a place yet ----------
let destRecs=null, destAsked=[], destBusy=false;
const BUDGET_EN={low:'Tight budget.',mid:'Moderate budget.',high:'Comfortable budget, happy to spend for good experiences.'};
const REACH_EN={domestic:'Domestic only: places inside South Korea.',near:'Short trip abroad: about 3 hours or less by plane from Seoul (Japan, Taiwan, Hong Kong, eastern China and similar).',far:'Anywhere in the world is fine, including long-haul.'};
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
    const r=await sample.json(`${mode.ask?`A traveler starting from Seoul, South Korea is considering "${String(mode.ask).slice(0,60)}". Evaluate only that destination for them (return exactly 1 item, honest about downsides).`:'Recommend 5 travel destinations for a traveler starting from Seoul, South Korea.'}${mode.more&&prev.length?` Do not repeat these: ${prev.join(', ')}.`:''}
Dates: ${q.dateUnknown?`not fixed yet, roughly from ${q.startDate} (about a month from now)`:`from ${q.startDate}`} for ${nightsOf(q)} nights.
Who: ${partyEn(q.party)} ${styleEn(q)}
${BUDGET_EN[q.budget]} ${REACH_EN[q.reach]}${+q.budgetMan>0?`\nMoney budget: about ${q.budgetMan}만원 (KRW ${q.budgetMan*10000}) per person in total, covering transport, lodging and local spending. Only recommend places where this is realistic for the trip length, and give the estimate in budget.`:''}
Interests: ${CUR.kws.join(', ')||'(none given)'}${want?`\nWhat they want, in their own words: "${want.slice(0,300)}"`:''}
Judge the season by what this traveler wants: off-season, cold or dark months can be ideal for quiet, solitude, contemplation, aurora or empty landscapes, while festivals and mild weather suit others. Avoid only conditions that would clearly spoil their wishes (typhoons, monsoon floods, closures). Give a varied set (different countries or regions where the reach allows).${q.reach==='far'?' The traveler explicitly asked for far-away places: at least 3 of the 5 must be outside East and Southeast Asia (for example Europe, Oceania, the Americas, the Middle East, Central Asia or Africa). If the trip is short for such a place, still include it and say so in caution, suggesting how many nights would suit it.':' If the trip is short for the travel time, say so in caution.'}
Reply with only JSON: {"destinations":[{"city":"Korean name of the city or region","country":"Korean country name","why":"one Korean sentence linking it to their interests and companions","season":"one Korean sentence about these dates there","highlights":["3 short Korean highlights"],"flight":"Korean travel time from Seoul, e.g. 비행 약 2시간 or KTX 약 2시간 30분","budget":"Korean rough per-person cost of transport and lodging for this trip length, in 만원","caution":"short Korean caution or empty","fit":"one Korean sentence on how well it matches this traveler"}]}`,{cache:false});
    const got=(Array.isArray(r&&r.destinations)?r.destinations:[]).filter(d=>d&&d.city).slice(0,5).map(d=>({fit:String(d.fit||'').slice(0,160),asked:!!mode.ask,city:String(d.city).slice(0,30),country:String(d.country||'').slice(0,20),why:String(d.why||'').slice(0,200),season:String(d.season||'').slice(0,200),
      highlights:(Array.isArray(d.highlights)?d.highlights:[]).map(x=>String(x).slice(0,40)).slice(0,4),flight:String(d.flight||'').slice(0,40),budget:String(d.budget||'').slice(0,40),caution:String(d.caution||'').slice(0,100)}));
    if(mode.ask) destAsked=[...got.slice(0,1),...destAsked.filter(d=>!got.some(g=>g.city===d.city))].slice(0,3);
    else destRecs=mode.more?[...(destRecs||[]),...got.filter(g=>!prev.includes(g.city))].slice(0,15):got;
    progStop(stId); TRIP.kws.save(CUR.kws); rerenderForm();
    if(mode.ask){setSt('st_ask',got.length?'아래에 정리했어요.':'정보를 찾지 못했어요. 이름을 조금 더 정확히 적어 주세요.');const c=document.getElementById('asked-0');if(c)c.scrollIntoView({block:'nearest'})}
    else setSt(stId,(destRecs||[]).length?(mode.more?'아래에 더 추가했어요.':'아래에서 마음에 드는 곳을 골라 주세요.'):'추천을 받지 못했어요. 조건을 바꿔 다시 해 보세요.');
  }catch(e){setSt(stId,errText(e,'추천을 받지 못했어요'))} finally{destBusy=false}
}


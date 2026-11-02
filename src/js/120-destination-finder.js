// ---------- destination finder: for travelers who have not picked a place yet ----------
let destRecs=null, destAsked=[], destBusy=false;
const BUDGET_EN={low:'Tight budget.',mid:'Moderate budget.',high:'Comfortable budget, happy to spend for good experiences.'};
const REACH_EN={domestic:'Domestic only: places inside South Korea.',near:'Short trip abroad: about 3 hours or less by plane from Seoul (Japan, Taiwan, Hong Kong, eastern China and similar).',far:'Anywhere in the world is fine, including long-haul.'};
function fDestFinder(p){
  const all=[...new Set([...GENERIC_KW,...kws])];
  return `<div class="fsec"><h3>여행지 추천받기</h3><p class="hint">조건과 취향을 고르면 AI가 이 날짜에 가기 좋은 여행지 5곳을 추천해요.</p>
  <span class="hint">누구와</span>${radioRow('party.type',p.party.type,[['solo','혼자'],['couple','연인·부부'],['friends','친구'],['family','가족']])}
  <span class="hint">어디까지</span>${radioRow('reach',p.reach,[['domestic','국내'],['near','가까운 해외 (3시간 안쪽)'],['far','먼 곳도 좋아요']])}
  ${p.reach==='far'&&nightsOf(p)<=4?`<p class="hint" style="margin:0 0 6px">${nightsOf(p)}박 ${nightsOf(p)+1}일이면 유럽·미주는 오가는 데만 하루씩 걸려요. 먼 곳 추천에는 적당한 기간도 같이 알려 줘요.</p>`:''}
  <span class="hint">예산</span>${radioRow('budget',p.budget,[['low','알뜰하게'],['mid','보통'],['high','여유 있게']])}
  <div class="fg"><label>1인 총예산 (만원, 선택)${inp('budgetMan',p.budgetMan||'','number','min="0" step="10" data-type="num" placeholder="예: 100"')}</label></div>
  <span class="hint">끌리는 것 (여러 개)</span><div class="chips">${all.map(k=>`<button type="button" data-kwtoggle="${esc(k)}" aria-pressed="${kws.some(x=>norm(x)===norm(k))}">${esc(k)}</button>`).join('')}</div>
  ${styleMoreHTML(p)}
  <label class="fg" style="display:block"><span class="hint">원하는 여행을 자유롭게 (선택)</span><textarea id="destWant" rows="2" maxlength="300" style="margin-top:4px" placeholder="예: 혼자 사색하며 걷고 싶어요, 바다 보며 쉬기, 맛집 많은 도시">${esc(p.want||'')}</textarea></label>
  <div class="row">${sample?`<button class="small-btn primary" type="button" id="destRecBtn">AI로 여행지 추천받기</button>`:''}<button class="small-btn" type="button" data-destmode="">직접 입력할게요</button><span class="ai-status" id="st_dest"></span></div>
  ${sample?'':'<p class="hint">여행지 추천은 AI를 연결하면 쓸 수 있어요 (더보기 → 설정).</p>'}</div>
  ${destRecs?destRecs.map((d,i)=>destCard(d,`${i+1}. `,`data-pickdest="${i}"`)).join('')+`<div class="row" style="margin-bottom:10px"><button class="small-btn" type="button" id="destMoreBtn">다른 곳 더 보기</button><span class="ai-status" id="st_more"></span></div>`:''}
  ${sample?`<div class="fsec"><h3>궁금한 곳이 따로 있다면</h3><div class="kw-add"><input id="destAsk" maxlength="40" placeholder="예: 아이슬란드" autocomplete="off"><button class="small-btn primary" type="button" id="destAskBtn">나한테 맞는지 보기</button></div><p class="hint">추천 목록과 별개로, 조건과 취향에 비춰 좋은 점과 아쉬운 점을 알려 줘요.</p><p class="ai-status" id="st_ask"></p></div>${destAsked.map((d,i)=>destCard(d,'🔍 물어본 곳 · ',`data-pickask="${i}"`,'asked-'+i)).join('')}`:''}`;
}
function destCard(d,label,attr,id){return `<div class="fsec area-card"${id?` id="${id}"`:''}><h3>${label}${esc(d.city)}${d.country?` <span class="hint">· ${esc(d.country)}</span>`:''}</h3>
    <p>${esc(d.why)}</p>${d.fit?`<p class="hint">🎯 ${esc(d.fit)}</p>`:''}${d.season?`<p class="hint">🗓 ${esc(d.season)}</p>`:''}
    ${d.highlights.length?`<p class="hint">${d.highlights.map(esc).join(' · ')}</p>`:''}
    <p class="mono hint">${esc(d.flight||'')}${d.budget?` · ${esc(d.budget)}`:''}</p>${d.caution?`<p class="hint">주의: ${esc(d.caution)}</p>`:''}
    <div class="row"><button class="small-btn primary" type="button" ${attr}>이 여행지로 정하기</button></div></div>`}
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
Interests: ${kws.join(', ')||'(none given)'}${want?`\nWhat they want, in their own words: "${want.slice(0,300)}"`:''}
Judge the season by what this traveler wants: off-season, cold or dark months can be ideal for quiet, solitude, contemplation, aurora or empty landscapes, while festivals and mild weather suit others. Avoid only conditions that would clearly spoil their wishes (typhoons, monsoon floods, closures). Give a varied set (different countries or regions where the reach allows).${q.reach==='far'?' The traveler explicitly asked for far-away places: at least 3 of the 5 must be outside East and Southeast Asia (for example Europe, Oceania, the Americas, the Middle East, Central Asia or Africa). If the trip is short for such a place, still include it and say so in caution, suggesting how many nights would suit it.':' If the trip is short for the travel time, say so in caution.'}
Reply with only JSON: {"destinations":[{"city":"Korean name of the city or region","country":"Korean country name","why":"one Korean sentence linking it to their interests and companions","season":"one Korean sentence about these dates there","highlights":["3 short Korean highlights"],"flight":"Korean travel time from Seoul, e.g. 비행 약 2시간 or KTX 약 2시간 30분","budget":"Korean rough per-person cost of transport and lodging for this trip length, in 만원","caution":"short Korean caution or empty","fit":"one Korean sentence on how well it matches this traveler"}]}`,{cache:false});
    const got=(Array.isArray(r&&r.destinations)?r.destinations:[]).filter(d=>d&&d.city).slice(0,5).map(d=>({fit:String(d.fit||'').slice(0,160),asked:!!mode.ask,city:String(d.city).slice(0,30),country:String(d.country||'').slice(0,20),why:String(d.why||'').slice(0,200),season:String(d.season||'').slice(0,200),
      highlights:(Array.isArray(d.highlights)?d.highlights:[]).map(x=>String(x).slice(0,40)).slice(0,4),flight:String(d.flight||'').slice(0,40),budget:String(d.budget||'').slice(0,40),caution:String(d.caution||'').slice(0,100)}));
    if(mode.ask) destAsked=[...got.slice(0,1),...destAsked.filter(d=>!got.some(g=>g.city===d.city))].slice(0,3);
    else destRecs=mode.more?[...(destRecs||[]),...got.filter(g=>!prev.includes(g.city))].slice(0,15):got;
    progStop(stId); store.set('gp.kw',kws); rerenderForm();
    if(mode.ask){setSt('st_ask',got.length?'아래에 정리했어요.':'정보를 찾지 못했어요. 이름을 조금 더 정확히 적어 주세요.');const c=document.getElementById('asked-0');if(c)c.scrollIntoView({block:'nearest'})}
    else setSt(stId,(destRecs||[]).length?(mode.more?'아래에 더 추가했어요.':'아래에서 마음에 드는 곳을 골라 주세요.'):'추천을 받지 못했어요. 조건을 바꿔 다시 해 보세요.');
  }catch(e){setSt(stId,errText(e,'추천을 받지 못했어요'))} finally{destBusy=false}
}


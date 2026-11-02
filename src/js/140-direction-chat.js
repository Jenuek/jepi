// ---------- finding the trip's direction through a short conversation (only the summary is kept) ----------
const TALK_MAX=5;
const TALK_OPEN={q:'요즘 어떤 마음이 들어서 여행을 떠올리게 됐어요? 막연해도 괜찮아요.',o:['그냥 답답해서 벗어나고 싶어요','지쳐서 푹 쉬고 싶어요','새로운 자극이 필요해요','생각을 정리하고 싶어요']};
let talk=null;
function talkReset(){talk={msgs:[{role:'a',text:TALK_OPEN.q}],options:TALK_OPEN.o.slice(),n:0,busy:false,summary:null}}
function talkBanner(p,next){return `<div class="t-banner"><span>🧭 ${esc(p.purpose||'이번 여행의 방향')}</span><small>${next}</small></div>`}
function fJP(){return `${onbKeyBox()}${inClaude()?'':`<div class="fsec import-box"><h3>Claude에서 만든 계획이 있나요?</h3><p class="hint">Claude에서 "내 계획 → 백업 파일 받기"로 저장한 파일을 불러오면 그대로 이어서 쓸 수 있어요.</p><input type="file" accept=".json,application/json" class="importFile"><p class="ai-status" id="st_import"></p></div>`}<div class="choose jpc">
    <button type="button" class="choose-btn jbtn" data-pickjp="J"><span class="big">J</span><b>계획파예요</b><small>미리 짜 두면 마음이 편해요. 시간·동선·예산까지 꼼꼼하게.</small></button>
    <button type="button" class="choose-btn pbtn" data-pickjp="P"><span class="big">P</span><b>즉흥파예요</b><small>일단 가 보고 정해요. 어디·언제·누구랑만 고르면 끝.</small></button></div><p class="hint" style="text-align:center">언제든 위의 J ⇄ P 스위치로 바꿀 수 있어요.</p>`}
function fChooser(){
  return `<div class="choose">
    <button type="button" class="choose-btn" data-startmode="quick"><b>가고 싶은 곳이 있어요</b><small>여행지·날짜·동행만 정하고 바로 시작해요</small></button>
    <button type="button" class="choose-btn" data-startmode="talk"${sample?'':' disabled'}><b>아직 막연해요 · 이야기하면서 정할래요</b><small>${sample?'질문 몇 개로 이번 여행의 방향을 함께 찾아요':'AI를 연결하면 쓸 수 있어요'}</small></button>
    <button type="button" class="choose-btn" data-startmode="quick" data-destmode="find"><b>여행지만 못 정했어요</b><small>취향과 조건으로 여행지를 추천받아요</small></button>
    <button type="button" class="choose-btn" data-startmode="day"><b>☀️ 하루 코스 짜기</b><small>친구랑 혹은 혼자, 하루 놀 동네 코스를 가볍게 짜요</small></button></div>`;
}
function fTalk(p){
  if(!talk) talkReset();
  const t=talk, S=t.summary, last=[...t.msgs].reverse().find(m=>m.role==='a'), hist=[];
  const ok=t.msgs.filter(m=>!m.err);for(let k=0;k<ok.length;k++){const m=ok[k];if(m.role==='u')hist.push([ok[k-1]?ok[k-1].text:'',m.text])}
  const dots=Array.from({length:TALK_MAX},(_,k)=>`<i class="${k<t.n?'on':''}"></i>`).join('');
  let h=`<div class="talk2${S?' done':''}">
    <div class="t-dots" aria-label="${Math.min(t.n,TALK_MAX)} / ${TALK_MAX}">${dots}</div>
    ${hist.length?`<details class="t-hist"><summary>지금까지 나눈 이야기</summary>${hist.map(([q,a])=>`<p class="t-hq">${esc(q)}</p><p class="t-ha">${esc(a)}</p>`).join('')}</details>`:''}`;
  if(!S){
    h+=t.busy?`<p class="t-q t-wait">잠시 생각을 정리하고 있어요<span class="t-ell"></span></p>`
      :`<p class="t-q" id="talkQ">${esc(last?last.text:'')}</p>
      ${t.options.length?`<div class="t-opts">${t.options.map((o,i)=>`<button type="button" class="t-opt" data-talkopt="${i}">${esc(o)}</button>`).join('')}</div>`:''}
      <div class="t-write"><textarea id="talkInput" rows="2" maxlength="300" placeholder="떠오르는 대로 적어 보세요"></textarea><button type="button" class="t-send" id="talkSend" aria-label="보내기">→</button></div>
      ${t.failed?'<div class="row"><button type="button" class="small-btn primary" id="talkRetry">다시 시도하기</button></div>':''}
      <div class="t-links">${t.n>=2?'<button type="button" class="t-link" id="talkFinish">이 정도로 정리해 줘</button>':''}<button type="button" class="t-link" data-startmode="quick">건너뛰고 직접 고를게요</button></div>`;
    h+=`<p class="ai-status" id="st_talk"></p></div>`;
  }else{
    const d=p.direction||{};
    h+=`${last?`<p class="t-close">${esc(last.text)}</p>`:''}
    <div class="t-letter"><span class="t-label">이번 여행의 방향</span><p class="t-note">${esc(S.note||p.purpose||'')}</p>
    <label class="t-field"><span>한 줄로 말하면</span>${inp('purpose',p.purpose,'text','maxlength="80"')}</label>
    <div class="t-field"><span>마음에 담아 둘 단어</span><div class="chips">${[...new Set([...S.keywords,...kws])].map(k=>`<button type="button" data-kwtoggle="${esc(k)}" aria-pressed="${kws.some(x=>norm(x)===norm(k))}">${esc(k)}</button>`).join('')}</div></div>
    <div class="t-field"><span>여행의 속도</span>${radioRow('pace',p.pace,[['slow','느긋하게'],['normal','보통'],['full','꽉 채워서']])}</div>
    ${p.party.type==='solo'?`<div class="t-field"><span>사람과의 거리</span>${radioRow('social',p.social,[['alone','혼자가 좋아요'],['some','가끔은 대화도'],['social','많이 만나고 싶어요']])}</div>`:''}
    <label class="t-field"><span>피하고 싶은 것</span>${inp('direction.avoid',d.avoid||'','text','maxlength="80" placeholder="예: 사람 많은 관광지"')}</label>
    <div class="row"><button type="button" class="small-btn primary" id="talkApply">${S.dest?`${esc(S.dest)}(으)로 이어 가기`:'이 방향으로 여행지 찾으러 가기'}</button><button type="button" class="t-link" id="talkRedo">다시 이야기하기</button></div>
    <p class="hint">대화 내용은 저장하지 않고, 이 방향만 남겨요.</p></div></div>`;
  }
  return h;
}
async function talkSend(text,opt){
  opt=opt||{};
  if(!sample||!talk||talk.busy) return;
  if(opt.retry){ if(talk.failed&&talk.msgs.length&&talk.msgs[talk.msgs.length-1].err) talk.msgs.pop(); text=talk.lastText; }
  if(!text) return;
  const finish=text==='__finish__';
  if(!opt.retry&&!finish){talk.msgs.push({role:'u',text:String(text).slice(0,300)}); talk.n++;}
  talk.lastText=text; talk.failed=null; talk.options=[]; talk.busy=true; rerenderForm(); scrollTalk();
  const force=talk.n>=TALK_MAX||finish;
  const conv=talk.msgs.filter(m=>!m.err).map(m=>(m.role==='u'?'User: ':'AI: ')+m.text).join('\n');
  const dates=datesReady(draft)?(draft.dateUnknown?`Dates: not fixed (roughly a month from now), ${nightsOf(draft)} nights.`:`Dates: from ${draft.startDate}, ${nightsOf(draft)} nights.`):'Dates and trip length: not decided yet. Do not assume any; ask about timing and length in the practical question if the user has not said.';
  const prompt=`You are a warm travel companion helping a Korean user who feels vague about traveling find the direction of their trip through a short conversation. Write natural, gentle Korean (해요체): at most two short sentences of acknowledgement, then one question.
Rules: one question at a time. Move through: why travel now and how they feel → what they hope to feel or gain → alone time or meeting people, quiet or lively → what to avoid → practical limits (when, how long, budget, domestic or abroad) only if still unknown. Do not counsel like a therapist; acknowledge briefly and keep moving toward the trip. If they mention a specific destination, remember it. If they express serious distress or thoughts of self-harm, respond with care and gently suggest talking to someone they trust or a professional line (in Korea, 109), and do not push the trip.
Known so far: ${partyEn(draft.party)} ${dates}
Conversation:
${conv}
${force?'This is the final turn: write a short warm closing as reply and fill summary (done true).':'Finish (done true with a summary) only once you have enough, usually after 3-5 answers.'}
Output exactly one JSON object and nothing else, in one of these two shapes.
While still asking: {"reply":"Korean text","options":["3-4 short Korean answers the user might tap"],"done":false,"summary":null}
When finishing: {"reply":"Korean text","options":[],"done":true,"summary":{"purpose":"one Korean line in the user's own voice","keywords":["3-5 short Korean keywords"],"pace":"slow","social":"alone","party":"solo","reach":"far","avoid":"short Korean or empty","dest":"a destination they named, or empty","nights":null,"startDate":null,"note":"one warm Korean sentence describing this trip's direction"}}
In the summary, pace is slow|normal|full, social is alone|some|social, party is solo|couple|friends|family|unknown, reach is domestic|near|far|unknown, nights is a number only if the user said a trip length (else null), startDate is YYYY-MM-DD only if the user gave a specific date (else null).`;
  let r=null;
  try{ r=await sample.json(prompt,{cache:false}); }
  catch(e){
    if(e&&e.code==='invalid_json'&&e.text){const m=/"reply"\s*:\s*"((?:[^"\\]|\\.)*)"/.exec(e.text);if(m){try{r={reply:JSON.parse('"'+m[1]+'"'),options:[]}}catch(_){}}}
    if(!r){
      talk.busy=false; talk.failed={code:e&&e.code};
      const msg={not_granted:'AI 키가 맞지 않아서 이어 갈 수 없어요. "건너뛰고 직접 고를게요"를 눌러 주세요.',rate_limited:'지금 요청이 많아요. 1분쯤 뒤에 "다시 시도하기"를 눌러 주세요.',refused:'이 내용으로는 이어 가기 어려워요. 표현을 조금 바꿔서 다시 적어 주세요.',session_expired:'로그인이 만료됐어요. 다시 로그인한 뒤 시도해 주세요.'}[e&&e.code]||'답을 정리하다가 끊겼어요. "다시 시도하기"를 눌러 주세요.';
      talk.msgs.push({role:'a',text:msg,err:true}); rerenderForm(); scrollTalk(); return;
    }
  }
  talk.busy=false;
  talk.msgs.push({role:'a',text:String((r&&r.reply)||'좋아요, 조금 더 들려주세요.').slice(0,400)});
  talk.options=(Array.isArray(r&&r.options)?r.options:[]).map(x=>String(x).slice(0,40)).slice(0,4);
  if(r&&r.done&&r.summary&&typeof r.summary==='object'){const S=r.summary;
    talk.summary={purpose:String(S.purpose||'').slice(0,80),keywords:(Array.isArray(S.keywords)?S.keywords:[]).map(x=>String(x).slice(0,16)).slice(0,6),note:String(S.note||'').slice(0,160),dest:String(S.dest||'').slice(0,30)};
    if(talk.summary.purpose) draft.purpose=talk.summary.purpose;
    if(['slow','normal','full'].includes(S.pace)) draft.pace=S.pace;
    if(['alone','some','social'].includes(S.social)) draft.social=S.social;
    if(['solo','couple','friends','family'].includes(S.party)) draft.party.type=S.party;
    if(['domestic','near','far'].includes(S.reach)) draft.reach=S.reach;
    if(Number.isInteger(+S.nights)&&+S.nights>=1&&+S.nights<=MAX_N&&S.nights!==null){draft.nights=+S.nights;draft.nightsSet=true}
    if(/^\d{4}-\d{2}-\d{2}$/.test(String(S.startDate||''))&&String(S.startDate)>=isoPlus(0)){draft.startDate=S.startDate;draft.dateSet=true;draft.dateUnknown=false}
    draft.direction={purpose:talk.summary.purpose,avoid:String(S.avoid||'').slice(0,80),note:talk.summary.note};
    talk.summary.keywords.forEach(k=>{if(!kws.some(x=>norm(x)===norm(k)))kws.push(k)}); store.set('gp.kw',kws);
  }
  rerenderForm(); scrollTalk();
}
function scrollTalk(){const c=document.querySelector('.talk2');if(c)c.scrollIntoView({block:'start'});const q=document.getElementById('talkInput');if(q&&!(talk&&talk.busy)&&matchMedia('(min-width:700px)').matches)q.focus({preventScroll:true})}


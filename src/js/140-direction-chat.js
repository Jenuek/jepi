// ---------- finding the trip's direction through a short conversation (only the summary is kept) ----------
const TALK_MAX=5;
const TALK_OPEN={q:'요즘 어떤 마음이 들어서 여행을 떠올리게 됐어요? 막연해도 괜찮아요.',o:['그냥 답답해서 벗어나고 싶어요','지쳐서 푹 쉬고 싶어요','새로운 자극이 필요해요','생각을 정리하고 싶어요']};
let talk=null;
function talkReset(){talk={msgs:[{role:'a',text:TALK_OPEN.q}],options:TALK_OPEN.o.slice(),n:0,busy:false,summary:null}}
// 처음 설정 parts drawn by React (app/screens/OnbBody.tsx)
const partBanner=(p,next)=>({f:'banner',purpose:p.purpose||'',next});
function partJP(){return {f:'jp',keyBox:!!(STANDALONE&&!sample),keyHelpHTML:KEY_HELP.anthropic,importBox:!inClaude()}}
// drawn by React: app/screens/OnbTalk.tsx
function partTalk(p){
  if(!talk) talkReset();
  const t=talk, S=t.summary, last=[...t.msgs].reverse().find(m=>m.role==='a'), hist=[];
  const ok=t.msgs.filter(m=>!m.err);for(let k=0;k<ok.length;k++){const m=ok[k];if(m.role==='u')hist.push([ok[k-1]?ok[k-1].text:'',m.text])}
  const d=p.direction||{};
  return {f:'talk',n:t.n,max:TALK_MAX,hist,last:last?last.text:'',busy:!!t.busy,options:t.options.slice(),failed:!!t.failed,
    done:S?{note:S.note||p.purpose||'',purpose:p.purpose??'',chips:[...new Set([...S.keywords,...kws])].map(k=>({k,on:kws.some(x=>norm(x)===norm(k))})),
      pace:p.pace,solo:p.party.type==='solo',social:p.social,avoid:d.avoid||'',applyLabel:S.dest?`${S.dest}(으)로 이어 가기`:'이 방향으로 여행지 찾으러 가기'}:null};
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


// ================= JEPI standalone: AI keys, model router, routes, map, panels =================
const STANDALONE=!(window.claude&&window.claude.use);
const LS={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(_){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(_){}},del(k){try{localStorage.removeItem(k)}catch(_){}}};
let KEYS=LS.get('jepi.keys',{})||{};
const KEY_DEF={
  anthropic:{name:'Claude',sub:'일정 짜기·대화·여행지 준비 (필수)',ph:'sk-ant-...',re:/^sk-ant-/},
  gemini:{name:'Gemini',sub:'가벼운 작업용 (선택 · 넣으면 비용이 줄어요)',ph:'AIza...',re:/^AIza/},
  gmaps:{name:'Google 지도',sub:'해외 경로 · 영업시간',ph:'AIza...',re:/^AIza/},
  kakao:{name:'카카오 지도',sub:'국내 경로 자동 연결 (REST API 키)',ph:'32자리 영문·숫자',re:/^[0-9a-f]{32}$/i}
};
const MODELS=Object.assign({heavy:'claude-sonnet-5-5',light:'claude-haiku-5-5',gemini:'gemini-3.6-flash'},LS.get('jepi.models',{})||{});
let keyMsg={}, keyBad={};
function saveKeys(quiet){LS.set('jepi.keys',KEYS);if(!quiet){LS.set('jepi.keysAt',Date.now());if(typeof syncSoon==='function')syncSoon()}}
const maskKey=k=>k?k.slice(0,6)+'••••••'+k.slice(-4):'';
function aiErr(code,msg,text){const e=new Error(msg||code);e.code=code;if(text!=null)e.text=text;return e}
function pickJSON(text){
  const s=String(text||'').trim().replace(/^```(?:json)?\s*/i,'').replace(/```\s*$/,'');
  try{return JSON.parse(s)}catch(_){}
  const a=s.indexOf('{'),b=s.lastIndexOf('}');
  if(a>=0&&b>a){try{return JSON.parse(s.slice(a,b+1))}catch(_){}}
  throw aiErr('invalid_json','JSON이 아니에요',text);
}
async function callClaude(prompt,model,signal){
  let r;
  try{r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',signal,headers:{'content-type':'application/json','x-api-key':KEYS.anthropic,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
    body:JSON.stringify({model,max_tokens:8000,system:'You are the planning engine of a travel planner app. Follow the format instructions exactly. When JSON is requested, reply with only the JSON object and nothing else.',messages:[{role:'user',content:prompt}]})})}
  catch(e){if(signal&&signal.aborted)throw aiErr(signal.reason==='timeout'?'timeout':'cancelled');throw aiErr('upstream_error','인터넷 연결을 확인해 주세요')}
  if(r.status===400){let m='';try{m=(await r.json()).error.message}catch(_){}throw aiErr(/credit|balance/i.test(m)?'not_granted':'upstream_error',/credit|balance/i.test(m)?'Claude 크레딧이 부족해요':m.slice(0,120))}
  if(r.status===401||r.status===403){keyBad.anthropic=true;throw aiErr('not_granted','Claude 키가 맞지 않아요')}
  if(r.status===429)throw aiErr('rate_limited');
  if(!r.ok){let m='';try{m=(await r.json()).error.message}catch(_){}throw aiErr('upstream_error',m||('HTTP '+r.status))}
  const j=await r.json(); keyBad.anthropic=false;
  return (j.content||[]).filter(c=>c.type==='text').map(c=>c.text).join('');
}
let geminiNoThink=false;
async function callGemini(prompt,signal,plain){
  const gc={responseMimeType:'application/json',temperature:0.6,maxOutputTokens:8192};
  if(!plain&&!geminiNoThink) gc.thinkingConfig={thinkingLevel:'low'};
  let r;
  try{r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODELS.gemini)}:generateContent`,{method:'POST',signal,headers:{'content-type':'application/json','x-goog-api-key':KEYS.gemini},
    body:JSON.stringify({contents:[{role:'user',parts:[{text:prompt}]}],generationConfig:gc})})}
  catch(e){if(signal&&signal.aborted)throw aiErr(signal.reason==='timeout'?'timeout':'cancelled','AI가 오래 답하지 않아 멈췄어요');throw aiErr('upstream_error','인터넷 연결을 확인해 주세요')}
  if(r.status===400||r.status===401||r.status===403){let m='';try{m=(await r.json()).error.message}catch(_){}
    if(r.status===400&&!plain&&/thinking/i.test(m)){geminiNoThink=true;return callGemini(prompt,signal,true)}
    if(/API key|permission|PERMISSION/i.test(m)||r.status!==400){keyBad.gemini=true;throw aiErr('not_granted','Gemini 키가 맞지 않아요')}
    if(/model/i.test(m))throw aiErr('upstream_error','Gemini 모델 이름을 확인해 주세요 ('+MODELS.gemini+')');
    throw aiErr('upstream_error',m.slice(0,120))}
  if(r.status===404){if(MODELS.gemini!=='gemini-flash-latest'&&!callGemini.fb){callGemini.fb=1;const was=MODELS.gemini;MODELS.gemini='gemini-flash-latest';try{return await callGemini(prompt,signal,plain)}catch(e){MODELS.gemini=was;throw e}}
    throw aiErr('upstream_error','Gemini 모델을 찾지 못했어요 ('+MODELS.gemini+') · 설정 → 고급에서 바꿔 주세요')}
  if(r.status===429)throw aiErr('rate_limited');
  if(!r.ok)throw aiErr('upstream_error','Gemini 서버 오류 (HTTP '+r.status+')');
  const j=await r.json(); keyBad.gemini=false;
  const c=(j.candidates||[])[0]||{}, text=((c.content||{}).parts||[]).filter(p=>!p.thought).map(p=>p.text||'').join('');
  if(!text) throw aiErr('upstream_error',c.finishReason==='SAFETY'?'Gemini가 답을 거절했어요':c.finishReason==='MAX_TOKENS'?'답이 너무 길어 잘렸어요':'Gemini가 빈 답을 보냈어요');
  return text;
}
// light jobs (quick tier) → Gemini Flash if connected, else Claude Haiku; everything else → Claude Sonnet
let aiWho='AI';
function makeSample(){
  const hasC=!!KEYS.anthropic, hasG=!!KEYS.gemini; if(!hasC&&!hasG) return null;
  return {json:async(prompt,opts={})=>{
    const light=opts.modelTier==='quick';
    const ctl=new AbortController(), outer=opts.signal, limit=light?60000:100000;
    if(outer){if(outer.aborted)ctl.abort();else outer.addEventListener('abort',()=>ctl.abort(),{once:true})}
    const tm=setTimeout(()=>ctl.abort('timeout'),limit), signal=ctl.signal;
    try{
    const order=light?(hasG?['g','c']:['c']):(hasC?['c','g']:['g']);
    let last=null;
    for(const w of order){
      if(w==='c'&&!hasC||w==='g'&&!hasG) continue;
      aiWho=w==='g'?'Gemini':'Claude';
      try{const text=w==='g'?await callGemini(prompt,signal):await callClaude(prompt,light?MODELS.light:MODELS.heavy,signal);return pickJSON(text)}
      catch(e){if(signal.aborted&&signal.reason==='timeout'&&!(outer&&outer.aborted))throw aiErr('timeout',`${aiWho}가 ${limit/1000}초 안에 답하지 않았어요`);
        if(e.code==='cancelled'||e.code==='invalid_json')throw e;last=e}
    }
    throw last||aiErr('upstream_error');
    }finally{clearTimeout(tm)}
  }};
}
async function testKey(k){
  keyMsg[k]='확인 중…'; renderSettings();
  try{
    if(k==='anthropic'){await callClaude('Reply with only this JSON: {"ok":true}',MODELS.light);}
    else if(k==='gemini'){await callGemini('Reply with only this JSON: {"ok":true}');}
    else if(k==='gmaps'){const v=await fetchRoute({m:'walk',a:[35.6812,139.7671],b:[35.6852,139.7528],pv:'google'});if(!v)throw aiErr('upstream_error','경로를 받지 못했어요');}
    else if(k==='kakao'){keyMsg[k]=await kakaoDiag();keyBad.kakao=!/^✓/.test(keyMsg[k]);renderSettings();return}
    keyMsg[k]='✓ 연결됐어요';
    if(k==='gmaps')keyBad.google=false; else keyBad[k]=false;
  }catch(e){if(k==='gmaps')keyBad.google=true;else keyBad[k]=true;
    keyMsg[k]=e.code==='not_granted'?'✕ 키가 맞지 않거나 이 API가 꺼져 있어요. 다시 확인해 주세요.':e.code==='network'?'✕ 응답을 받지 못했어요. 키 제한(웹사이트 주소)과 API 사용 설정을 확인해 주세요.':'✕ '+(e.message||'연결하지 못했어요')}
  renderSettings();
}

async function kakaoDiag(){
  const q='start_x=126.9779&start_y=37.5663&end_x=126.9769&end_y=37.5700', H={Authorization:'KakaoAK '+KEYS.kakao}, out=[];
  for(const [ep,name] of [['walk','도보 경로'],['publictraffic','대중교통 경로']]){
    let r;
    try{r=await fetch(`https://dapi.kakao.com/v2/routing/${ep}?${q}`,{headers:H})}
    catch(_){return `✕ ${name}: 카카오가 이 주소(${ORIGIN})의 요청을 막았어요. 카카오 디벨로퍼스 → 내 앱 → 플랫폼 → Web에 ${ORIGIN} 를 정확히(끝에 / 없이) 등록했는지, 카카오맵 사용 설정이 ON인지 확인해 주세요. 바꾼 뒤 몇 분 지나 다시 "확인"을 눌러 주세요.`}
    let j={};try{j=await r.json()}catch(_){}
    if(!r.ok){const m=j.msg||j.message||'';const c=j.code!=null?` (code ${j.code})`:'';
      if(r.status===401)return `✕ ${name}: 키가 맞지 않아요. JavaScript 키가 아니라 REST API 키를 넣어 주세요.${c}`;
      if(r.status===403)return `✕ ${name}: 카카오맵 사용 설정이 꺼져 있거나 권한이 없어요. 내 앱 → 카카오맵에서 ON으로 바꿔 주세요.${c}`;
      out.push(`✕ ${name}: HTTP ${r.status}${c} ${m}`.trim());continue}
    out.push(`✓ ${name}`);
  }
  return out.every(x=>x.startsWith('✓'))?'✓ 연결됐어요 (도보·대중교통 경로 모두 정상)':out.join(' · ');
}
function keysChanged(){saveKeys();keyBad={};if(STANDALONE){sample=makeSample()}renderAll();renderSettings();if(!$('#onb').hidden)renderOnb()}

function blankPack(){return Object.assign(manualPack('새 여행'),{areas:[{key:'center',name:'시내',lat:37.5665,lng:126.978,zone:'center'}]})}

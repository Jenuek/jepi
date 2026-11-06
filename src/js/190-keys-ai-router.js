// ================= JEPI standalone: AI keys, model router, routes, map, panels =================
const STANDALONE=!(window.claude&&window.claude.use);
const LS=JD.storage; // saved data on this device: app/data/storage.ts
JD.keys.load(); const KEYS=JD.keys.list;   // app/data/keys.ts (the same object, changed in place)
const KEY_DEF={
  anthropic:{name:'Claude',sub:'일정 짜기·대화·여행지 준비 (필수)',ph:'sk-ant-...',re:/^sk-ant-/},
  gemini:{name:'Gemini',sub:'가벼운 작업용 (선택 · 넣으면 비용이 줄어요)',ph:'AIza...',re:/^AIza/},
  gmaps:{name:'Google 지도',sub:'해외 경로 · 영업시간',ph:'AIza...',re:/^AIza/},
  kakao:{name:'카카오 지도',sub:'국내 장소·주소 검색 (REST API 키)',ph:'32자리 영문·숫자',re:/^[0-9a-f]{32}$/i}
};
const MODELS=Object.assign({heavy:'claude-sonnet-5-5',light:'claude-haiku-5-5',gemini:'gemini-3.6-flash'},LS.get('jepi.models',{})||{});
let keyMsg={}, keyBad={};
function saveKeys(quiet){JD.keys.save(quiet);if(!quiet&&typeof syncSoon==='function')syncSoon()}
const maskKey=k=>k?k.slice(0,6)+'••••••'+k.slice(-4):'';
function aiErr(code,msg,text){return JD.appError(code,msg,text)}
// The AI connection (calling Claude / Gemini, retries, switching to the other AI) lives in app/data/ai.ts.
let aiWho='AI';
JD.ai.connectAI({keys:()=>KEYS,models:()=>MODELS,bad:()=>keyBad,who:n=>{aiWho=n}});
const callClaude=JD.ai.callClaude, callGemini=JD.ai.callGemini, makeSample=JD.ai.makeSample;
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
  // Kakao gives place search to outside apps, not walking / transit routes: check the search
  let r;
  try{r=await fetch('https://dapi.kakao.com/v2/local/search/keyword.json?query='+encodeURIComponent('서울역')+'&size=1',{headers:{Authorization:'KakaoAK '+KEYS.kakao}})}
  catch(_){return `✕ 카카오가 이 주소(${ORIGIN})의 요청을 막았어요. 카카오 디벨로퍼스 → 내 앱 → 플랫폼 → Web에 ${ORIGIN} 를 정확히(끝에 / 없이) 등록했는지 확인해 주세요. 바꾼 뒤 몇 분 지나 다시 "확인"을 눌러 주세요.`}
  let j={};try{j=await r.json()}catch(_){}
  const c=j.code!=null?` (code ${j.code})`:'';
  if(r.status===401)return `✕ 키가 맞지 않아요. JavaScript 키가 아니라 REST API 키를 넣어 주세요.${c}`;
  if(r.status===403)return `✕ 이 키로 장소 검색을 쓸 수 없어요. 내 앱 → 제품 설정에서 카카오맵을 ON으로 바꿔 주세요.${c}`;
  if(!r.ok)return `✕ 카카오 오류 (HTTP ${r.status})${c} ${j.msg||j.message||''}`.trim();
  return '✓ 장소·주소 검색 연결됨 · 국내 이동 시간은 거리로 어림하고, "안내 시작"은 카카오맵으로 열어요';
}
function keysChanged(){saveKeys();keyBad={};if(STANDALONE){UI.sample=makeSample()}renderAll();renderSettings();if(!$('#onb').hidden)renderOnb()}

const blankPack=PLC.blankPack;   // app/data/places.ts

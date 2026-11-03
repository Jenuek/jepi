// ---------- settings ----------
let themePref=LS.get('jepi.theme','light');
function applyTheme(){const r=document.documentElement;if(themePref==='system')r.removeAttribute('data-theme');else r.setAttribute('data-theme',themePref);
  const m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',getComputedStyle(document.body).getPropertyValue('--paper').trim()||'#f2f4f1')}
const ORIGIN=String(location.origin||'').replace(/[<>"&']/g,'');
const KEY_HELP={
  anthropic:`<ol><li><a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener">console.anthropic.com</a>에 로그인해요.</li><li>Billing에서 크레딧을 충전해요 (5달러면 개인 여행에 충분해요).</li><li>API Keys → Create Key → 만든 키를 복사해서 여기에 붙여 넣어요.</li></ol>`,
  gemini:`<ol><li><a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">Google AI Studio</a>에서 Create API key를 눌러요.</li><li>만든 키를 붙여 넣어요. 무료 한도 안에서 가벼운 작업을 맡아요.</li></ol>`,
  gmaps:`<ol><li><a href="https://console.cloud.google.com/google/maps-apis/start" target="_blank" rel="noopener">Google Cloud 콘솔</a>에서 결제 계정을 연결해요 (무료 한도 안이면 청구되지 않아요).</li><li>API 및 서비스 → 라이브러리에서 <b>Routes API</b>와 <b>Places API (New)</b>를 사용 설정해요 (Places는 영업시간 확인용).</li><li>사용자 인증 정보 → API 키 만들기 → <b>애플리케이션 제한: 웹사이트</b>에 <code>${ORIGIN}/*</code>를 넣고, API 제한은 Routes API와 Places API (New) 두 개만 골라요.</li><li>할당량에서 하루 요청 수 상한(예: 500)을 걸어 두면 안전해요.</li></ol>`,
  kakao:`<ol><li><a href="https://developers.kakao.com/console/app" target="_blank" rel="noopener">카카오 디벨로퍼스</a>에서 애플리케이션을 추가해요.</li><li>플랫폼 → Web에 <code>${ORIGIN}</code>를 등록해요.</li><li>제품 설정에서 <b>카카오맵</b>을 활성화해요.</li><li>앱 키의 <b>REST API 키</b>를 복사해서 붙여 넣어요.</li></ol>`
};
let keyEdit=null, keyShow=false;
const isBad=k=>!!keyBad[k==='gmaps'?'google':k];
function keyRow(k){const d=KEY_DEF[k], v=KEYS[k];
  const st=keyMsg[k]?`<small class="kmsg">${esc(keyMsg[k])}</small>`:'';
  if(keyEdit===k) return `<div class="krow open"><div class="kh"><b>${d.name}</b><small>${d.sub}</small></div>
    <div class="kin"><input id="keyIn" type="${keyShow?'text':'password'}" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${d.ph}" value=""><button class="small-btn" type="button" id="keyShow">${keyShow?'숨기기':'보기'}</button></div>
    <div class="row"><button class="small-btn primary" type="button" data-keysave="${k}">저장</button><button class="small-btn" type="button" id="keyCancel">취소</button></div>
    <details class="khelp"><summary>키 받는 법</summary>${KEY_HELP[k]}</details>${st}</div>`;
  return `<div class="krow"><div class="kh"><b>${d.name}</b><small>${v?`<span class="mono">${esc(maskKey(v))}</span>`:d.sub}</small>${st}</div>
    ${v?`<span class="mchip ${isBad(k)?'warn':'ok'}">${isBad(k)?'확인 필요':'연결됨'}</span><button class="small-btn" type="button" data-keytest="${k}">확인</button><button class="small-btn" type="button" data-keyedit="${k}">바꾸기</button><button class="small-btn danger" type="button" data-keydel="${k}">삭제</button>`
     :`<button class="small-btn primary" type="button" data-keyedit="${k}">연결</button>`}</div>`}
// The frame is drawn by React: app/screens/SettingsScreen.tsx. The parts below are still old HTML.
let settingsRev=0;
function settingsAI(){return STANDALONE?`<div class="mgroup">${Object.keys(KEY_DEF).map(keyRow).join('')}</div>
    <p class="hint">무거운 작업(일정 짜기, 여행지 준비)은 Claude ${esc(MODELS.heavy)}, 가벼운 작업(키워드, 예약 내용 읽기)은 ${KEYS.gemini?'Gemini Flash':'Claude '+esc(MODELS.light)}가 맡아요. 경로는 국내는 카카오, 해외는 Google로 계산하고 한 번 계산한 구간은 이 기기에 저장해 다시 부르지 않아요${routeStats.ok?` (이번에 ${routeStats.ok}구간 계산)`:''}.</p>
    ${hoursHint()}<details class="khelp"><summary>고급: 모델 이름</summary><div class="fg"><label>무거운 작업<input id="mHeavy" value="${esc(MODELS.heavy)}"></label><label>가벼운 작업 (Claude)<input id="mLight" value="${esc(MODELS.light)}"></label><label>Gemini<input id="mGem" value="${esc(MODELS.gemini)}"></label></div><div class="row"><button class="small-btn" type="button" id="mSave">모델 저장</button></div></details>`
    :`<p class="hint">Claude 안에서는 AI가 자동으로 연결돼요. 지도 키는 깃허브 앱 버전에서 넣을 수 있어요.</p>`}
function renderSettings(){
  const el=$('#setBox'); if(!el) return;
  window.JEPI_UI.mount('settings',el,{theme:themePref,zoom:store.get('gp.zoom',60),sync:syncView(),myPlacesHTML:mypHTML(),aiHTML:settingsAI(),
    extrasHTML:SETTINGS_EXTRA.map(f=>f()).join(''),wipeArm:!!wipeArm,host:location.host||'로컬',rev:++settingsRev});
}
function backupAll(){
  snapshotCurrent();
  const all={jepi:2,at:new Date().toISOString(),cur:curPlan,kw:kws,plans:plans.map(p=>({meta:p,data:store.get('gp.plan.'+p.id,null)})).filter(x=>x.data)};
  const d=new Date(), nm=`JEPI-백업-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}.json`;
  downloadText(nm,JSON.stringify(all));
}
function importAll(v){
  if(!v||v.jepi!==2||!Array.isArray(v.plans)) return false;
  snapshotCurrent(); let n=0;
  v.plans.forEach(x=>{if(!x||!x.meta||!x.data)return;const ex=plans.find(p=>p.id===x.meta.id);store.set('gp.plan.'+x.meta.id,x.data);if(ex)Object.assign(ex,x.meta);else plans.push(Object.assign({},x.meta));n++});
  if(Array.isArray(v.kw)&&v.kw.length){kws=[...new Set([...kws,...v.kw])];saveKw&&saveKw()}
  plans.sort((a,b)=>(b.updated||0)-(a.updated||0)); savePlans();
  const target=plans.find(p=>p.id===v.cur)||plans[0]; if(target&&target.id!==curPlan){curPlan='';openPlan(target.id)}
  planMsg=`계획 ${n}개를 불러왔어요.`; renderPlans(); return true;
}


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
let keyEdit=null;
const isBad=k=>!!keyBad[k==='gmaps'?'google':k];
// The frame is drawn by React: app/screens/SettingsScreen.tsx. The parts below are still old HTML.
let settingsRev=0;
// AI·지도 연결 is drawn by React: app/screens/AiKeysSection.tsx. Only the masked keys go there.
function settingsAI(){return {standalone:!!STANDALONE,editing:keyEdit,hasGemini:!!KEYS.gemini,routesOk:+routeStats.ok||0,
  models:{heavy:MODELS.heavy,light:MODELS.light,gemini:MODELS.gemini},
  hours:KEYS.gmaps?{use:+hoursUse(),cap:HOURS_CAP,off:JD.hours.state.off||''}:null,
  keys:Object.keys(KEY_DEF).map(k=>{const d=KEY_DEF[k];return {k,name:d.name,sub:d.sub,ph:d.ph,masked:KEYS[k]?maskKey(KEYS[k]):'',bad:isBad(k),msg:keyMsg[k]||'',helpHTML:KEY_HELP[k]}})}}
// What was pressed in 설정 (SettingsScreen.tsx / AiKeysSection.tsx tell: its name and value; a typed key comes as v2)
function settingsAct(n,v,v2){
  switch(n){
  case 'theme': themePref=v;LS.set('jepi.theme',themePref);applyTheme();renderSettings();if(mapState.on)drawMap();return;
  case 'zoom': setZoom(+v);if(tab==='settings')renderSettings();return;
  case 'keyedit': keyEdit=v;keyMsg[keyEdit]='';renderSettings();return;   // its box opens, with the cursor in it
  case 'keycancel': keyEdit=null;renderSettings();return;
  case 'keysave': {const k=v,key=String(v2||'').trim().replace(/\s+/g,'');
    if(!key){keyMsg[k]='키를 붙여 넣어 주세요.';renderSettings();return}
    if(KEY_DEF[k].re&&!KEY_DEF[k].re.test(key)){keyMsg[k]=`${KEY_DEF[k].name} 키 형식이 아닌 것 같아요. 그래도 저장했으니 "확인"을 눌러 보세요.`}
    else keyMsg[k]='';
    KEYS[k]=key;keyEdit=null;keysChanged();testKey(k);return}
  case 'keydel': delete KEYS[v];keyMsg[v]='삭제했어요.';keysChanged();return;
  case 'keytest': testKey(v);return;
  case 'models': {const m=v2||{};MODELS.heavy=String(m.heavy||'').trim()||'claude-sonnet-5-5';MODELS.light=String(m.light||'').trim()||'claude-haiku-5-5';MODELS.gemini=String(m.gemini||'').trim()||'gemini-3.6-flash';LS.set('jepi.models',{heavy:MODELS.heavy,light:MODELS.light,gemini:MODELS.gemini});keysChanged();return}
  case 'backup': backupAll();return;
  case 'wipe': if(!wipeArm){wipeArm=true;renderSettings();return}wipeAll();return;
  case 'wipecancel': wipeArm=false;renderSettings();return;
  }
}
function renderSettings(){
  const el=$('#setBox'); if(!el) return;
  window.JEPI_UI.mount('settings',el,{theme:themePref,zoom:store.get('gp.zoom',60),sync:syncView(),myPlaces:mypView(),ai:settingsAI(),
    wipeArm:!!wipeArm,host:location.host||'로컬',rev:++settingsRev});
}
function backupAll(){
  snapshotCurrent();
  const all={jepi:2,at:new Date().toISOString(),cur:curPlan,kw:kws,plans:plans.map(p=>({meta:p,data:TRIP.plans.get(p.id)})).filter(x=>x.data)};
  const d=new Date(), nm=`JEPI-백업-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}.json`;
  downloadText(nm,JSON.stringify(all));
}
function importAll(v){
  if(!v||v.jepi!==2||!Array.isArray(v.plans)) return false;
  snapshotCurrent(); let n=0;
  v.plans.forEach(x=>{if(!x||!x.meta||!x.data)return;const ex=plans.find(p=>p.id===x.meta.id);TRIP.plans.put(x.meta.id,x.data);if(ex)Object.assign(ex,x.meta);else plans.push(Object.assign({},x.meta));n++});
  if(Array.isArray(v.kw)&&v.kw.length){kws=[...new Set([...kws,...v.kw])];saveKw&&saveKw()}
  plans.sort((a,b)=>(b.updated||0)-(a.updated||0)); savePlans();
  const target=plans.find(p=>p.id===v.cur)||plans[0]; if(target&&target.id!==curPlan){curPlan='';openPlan(target.id)}
  planMsg=`계획 ${n}개를 불러왔어요.`; renderPlans(); return true;
}


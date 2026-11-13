// 설정: the theme, time spacing, AI·지도 keys (saving, testing, deleting, the models), a backup of every plan and loading
// one back, and what the 동기화 section shows; and a tapped login link coming back (syncBoot). (It used to be
// src/js/190-keys-ai-router.js, 230-settings.js and 310-sync.js.) The old code reads its state as KS.msg, KS.bad …
// What the old code still does is passed in once with connect() (Legacy).
import * as trip from '../data/trip';
import * as storage from '../data/storage';
import * as keysData from '../data/keys';
import * as ai from '../data/ai';
import * as routes from '../data/routes';
import * as hours from '../data/hours';
import * as server from '../data/server';
import * as sync from '../data/sync';
import * as account from '../data/account';
import { appError } from '../data/errors';
import { ui } from '../ui/state';
import * as MAP from '../ui/map';
import * as FF from './forms';
import * as PLF from './plans';
import { ps } from './plans';
import { showToast } from './share';
import * as R from './render';
export const ks = {
  /** a message under each key (확인 중…, ✓ 연결됐어요 …) */
  msg: {} as Record<string, string>,
  /** keys that did not work (anthropic, gemini, google, kakao) */
  bad: {} as Record<string, boolean>,
  /** which AI answered last */
  who: 'AI',
  /** the Claude / Gemini models used */
  models: { heavy: 'claude-sonnet-5-5', light: 'claude-haiku-5-5', gemini: 'gemini-3.6-flash' } as Record<string, string>,
  /** light / dark / system */
  theme: 'light',
  /** the key whose box is open */
  edit: null as string | null,
  /** 모두 초기화 pressed once (asks once more) */
  wipeArm: false,
};

/** what the old code still does */
export interface Legacy { wipeAll(): void; mypView(): any }
let L: Legacy;
export function connect(l: Legacy): void { L = l }

const $ = (s: string) => document.querySelector(s) as any;
const mount = (name: string, el: Element, props: any) => (window.JEPI_UI.mount as any)(name, el, props);
const CUR = trip.cur as any, PL = trip.planList as any, KEYS = keysData.list as any;
const STANDALONE = !((window as any).claude && (window as any).claude.use);
const SYNC = server.SYNC as any, ACC = account as any, SYNC_STATUS = sync.status;

export const KEY_DEF: Record<string, any>={
  anthropic:{name:'Claude',sub:'일정 짜기·대화·여행지 준비 (필수)',ph:'sk-ant-...',re:/^sk-ant-/},
  gemini:{name:'Gemini',sub:'가벼운 작업용 (선택 · 넣으면 비용이 줄어요)',ph:'AIza...',re:/^AIza/},
  gmaps:{name:'Google 지도',sub:'해외 경로 · 영업시간',ph:'AIza...',re:/^AIza/},
  kakao:{name:'카카오 지도',sub:'국내 장소·주소 검색 (REST API 키)',ph:'32자리 영문·숫자',re:/^[0-9a-f]{32}$/i}
};
export function saveKeys(quiet?: any){keysData.save(quiet);if(!quiet)sync.syncSoon()}
export const maskKey=(k: any)=>k?k.slice(0,6)+'••••••'+k.slice(-4):'';
export async function testKey(k?: any){
  ks.msg[k]='확인 중…'; renderSettings();
  try{
    if(k==='anthropic'){await ai.callClaude('Reply with only this JSON: {"ok":true}',ks.models.light);}
    else if(k==='gemini'){await ai.callGemini('Reply with only this JSON: {"ok":true}');}
    else if(k==='gmaps'){const v=await routes.fetchRoute({m:'walk',a:[35.6812,139.7671],b:[35.6852,139.7528],pv:'google'});if(!v)throw appError('upstream_error','경로를 받지 못했어요');}
    else if(k==='kakao'){ks.msg[k]=await kakaoDiag();ks.bad.kakao=!/^✓/.test(ks.msg[k]);renderSettings();return}
    ks.msg[k]='✓ 연결됐어요';
    if(k==='gmaps')ks.bad.google=false; else ks.bad[k]=false;
  }catch(e: any){if(k==='gmaps')ks.bad.google=true;else ks.bad[k]=true;
    ks.msg[k]=e.code==='not_granted'?'✕ 키가 맞지 않거나 이 API가 꺼져 있어요. 다시 확인해 주세요.':e.code==='network'?'✕ 응답을 받지 못했어요. 키 제한(웹사이트 주소)과 API 사용 설정을 확인해 주세요.':'✕ '+(e.message||'연결하지 못했어요')}
  renderSettings();
}

export async function kakaoDiag(){
  // Kakao gives place search to outside apps, not walking / transit routes: check the search
  let r;
  try{r=await fetch('https://dapi.kakao.com/v2/local/search/keyword.json?query='+encodeURIComponent('서울역')+'&size=1',{headers:{Authorization:'KakaoAK '+KEYS.kakao}})}
  catch(_: any){return `✕ 카카오가 이 주소(${ORIGIN})의 요청을 막았어요. 카카오 디벨로퍼스 → 내 앱 → 플랫폼 → Web에 ${ORIGIN} 를 정확히(끝에 / 없이) 등록했는지 확인해 주세요. 바꾼 뒤 몇 분 지나 다시 "확인"을 눌러 주세요.`}
  let j: any={};try{j=await r.json()}catch(_: any){}
  const c=j.code!=null?` (code ${j.code})`:'';
  if(r.status===401)return `✕ 키가 맞지 않아요. JavaScript 키가 아니라 REST API 키를 넣어 주세요.${c}`;
  if(r.status===403)return `✕ 이 키로 장소 검색을 쓸 수 없어요. 내 앱 → 제품 설정에서 카카오맵을 ON으로 바꿔 주세요.${c}`;
  if(!r.ok)return `✕ 카카오 오류 (HTTP ${r.status})${c} ${j.msg||j.message||''}`.trim();
  return '✓ 장소·주소 검색 연결됨 · 국내 이동 시간은 거리로 어림하고, "안내 시작"은 카카오맵으로 열어요';
}
export function keysChanged(){saveKeys();ks.bad={};if(STANDALONE){ui.sample=ai.makeSample()}R.renderAll();renderSettings();if(!$('#onb').hidden)FF.renderOnb()}

export function applyTheme(){const r=document.documentElement;if(ks.theme==='system')r.removeAttribute('data-theme');else r.setAttribute('data-theme',ks.theme);
  const m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',getComputedStyle(document.body).getPropertyValue('--paper').trim()||'#f2f4f1')}
export const ORIGIN=String(location.origin||'').replace(/[<>"&']/g,'');
export const KEY_HELP={
  anthropic:`<ol><li><a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener">console.anthropic.com</a>에 로그인해요.</li><li>Billing에서 크레딧을 충전해요 (5달러면 개인 여행에 충분해요).</li><li>API Keys → Create Key → 만든 키를 복사해서 여기에 붙여 넣어요.</li></ol>`,
  gemini:`<ol><li><a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">Google AI Studio</a>에서 Create API key를 눌러요.</li><li>만든 키를 붙여 넣어요. 무료 한도 안에서 가벼운 작업을 맡아요.</li></ol>`,
  gmaps:`<ol><li><a href="https://console.cloud.google.com/google/maps-apis/start" target="_blank" rel="noopener">Google Cloud 콘솔</a>에서 결제 계정을 연결해요 (무료 한도 안이면 청구되지 않아요).</li><li>API 및 서비스 → 라이브러리에서 <b>Routes API</b>와 <b>Places API (New)</b>를 사용 설정해요 (Places는 영업시간 확인용).</li><li>사용자 인증 정보 → API 키 만들기 → <b>애플리케이션 제한: 웹사이트</b>에 <code>${ORIGIN}/*</code>를 넣고, API 제한은 Routes API와 Places API (New) 두 개만 골라요.</li><li>할당량에서 하루 요청 수 상한(예: 500)을 걸어 두면 안전해요.</li></ol>`,
  kakao:`<ol><li><a href="https://developers.kakao.com/console/app" target="_blank" rel="noopener">카카오 디벨로퍼스</a>에서 애플리케이션을 추가해요.</li><li>플랫폼 → Web에 <code>${ORIGIN}</code>를 등록해요.</li><li>제품 설정에서 <b>카카오맵</b>을 활성화해요.</li><li>앱 키의 <b>REST API 키</b>를 복사해서 붙여 넣어요.</li></ol>`
};
export const isBad=(k: any)=>!!ks.bad[k==='gmaps'?'google':k];
// The frame is drawn by React: app/screens/SettingsScreen.tsx. The parts below are still old HTML.
let settingsRev=0;
// AI·지도 연결 is drawn by React: app/screens/AiKeysSection.tsx. Only the masked keys go there.
export function settingsAI(){return {standalone:!!STANDALONE,editing:ks.edit,hasGemini:!!KEYS.gemini,routesOk:+routes.stats.ok||0,
  models:{heavy:ks.models.heavy,light:ks.models.light,gemini:ks.models.gemini},
  hours:KEYS.gmaps?{use:+hours.used(),cap:hours.CAP,off:hours.state.off||''}:null,
  keys:Object.keys(KEY_DEF).map((k: any)=>{const d=KEY_DEF[k];return {k,name:d.name,sub:d.sub,ph:d.ph,masked:KEYS[k]?maskKey(KEYS[k]):'',bad:isBad(k),msg:ks.msg[k]||'',helpHTML:(KEY_HELP as any)[k]}})}}
// What was pressed in 설정 (SettingsScreen.tsx / AiKeysSection.tsx tell: its name and value; a typed key comes as v2)
export function settingsAct(n?: any, v?: any, v2?: any){
  switch(n){
  case 'theme': ks.theme=v;storage.set('jepi.theme',ks.theme);applyTheme();renderSettings();if(MAP.state.on)MAP.drawMap();return;
  case 'zoom': R.setZoom(+v);if(ui.tab==='settings')renderSettings();return;
  case 'keyedit': ks.edit=v;ks.msg[ks.edit as string]='';renderSettings();return;   // its box opens, with the cursor in it
  case 'keycancel': ks.edit=null;renderSettings();return;
  case 'keysave': {const k=v,key=String(v2||'').trim().replace(/\s+/g,'');
    if(!key){ks.msg[k]='키를 붙여 넣어 주세요.';renderSettings();return}
    if(KEY_DEF[k].re&&!KEY_DEF[k].re.test(key)){ks.msg[k]=`${KEY_DEF[k].name} 키 형식이 아닌 것 같아요. 그래도 저장했으니 "확인"을 눌러 보세요.`}
    else ks.msg[k]='';
    KEYS[k]=key;ks.edit=null;keysChanged();testKey(k);return}
  case 'keydel': delete KEYS[v];ks.msg[v]='삭제했어요.';keysChanged();return;
  case 'keytest': testKey(v);return;
  case 'models': {const m=v2||{};ks.models.heavy=String(m.heavy||'').trim()||'claude-sonnet-5-5';ks.models.light=String(m.light||'').trim()||'claude-haiku-5-5';ks.models.gemini=String(m.gemini||'').trim()||'gemini-3.6-flash';storage.set('jepi.models',{heavy:ks.models.heavy,light:ks.models.light,gemini:ks.models.gemini});keysChanged();return}
  case 'backup': backupAll();return;
  case 'wipe': if(!ks.wipeArm){ks.wipeArm=true;renderSettings();return}L.wipeAll();return;
  case 'wipecancel': ks.wipeArm=false;renderSettings();return;
  }
}
export function renderSettings(){
  const el=$('#setBox'); if(!el) return;
  mount('settings',el,{theme:ks.theme,zoom:storage.get('gp.zoom',60),sync:syncView(),myPlaces:L.mypView(),ai:settingsAI(),
    wipeArm:!!ks.wipeArm,host:location.host||'로컬',rev:++settingsRev});
}
export function backupAll(){
  PLF.snapshotCurrent();
  const all={jepi:2,at:new Date().toISOString(),cur:PL.curPlan,kw:CUR.kws,plans:PL.plans.map((p: any)=>({meta:p,data:trip.plans.get(p.id)})).filter((x: any)=>x.data)};
  const d=new Date(), nm=`JEPI-백업-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}.json`;
  PLF.downloadText(nm,JSON.stringify(all));
}
export function importAll(v?: any){
  if(!v||v.jepi!==2||!Array.isArray(v.plans)) return false;
  PLF.snapshotCurrent(); let n=0;
  v.plans.forEach((x: any)=>{if(!x||!x.meta||!x.data)return;const ex=PL.plans.find((p: any)=>p.id===x.meta.id);trip.plans.put(x.meta.id,x.data);if(ex)Object.assign(ex,x.meta);else PL.plans.push(Object.assign({},x.meta));n++});
  if(Array.isArray(v.kw)&&v.kw.length){CUR.kws=[...new Set([...CUR.kws,...v.kw])];R.saveKw()}
  PL.plans.sort((a: any,b: any)=>(b.updated||0)-(a.updated||0)); PLF.savePlans();
  const target=PL.plans.find((p: any)=>p.id===v.cur)||PL.plans[0]; if(target&&target.id!==PL.curPlan){PL.curPlan='';PLF.openPlan(target.id)}
  ps.msg=`계획 ${n}개를 불러왔어요.`; PLF.renderPlans(); return true;
}

// The section is drawn by React: app/screens/SyncSection.tsx. Here: what it shows.
export function syncView(){
  const st=ACC.state.step, mode=(!SYNC.url||!SYNC.key||st==='setup')?'setup':!server.syncOn()?(st==='reset'?'reset':st==='join'?'join':'login'):st==='newpw'?'newpw':'on';
  return {mode,url:SYNC.url||'',hasKey:!!SYNC.key,email:(mode==='on'&&SYNC.sess.email)||SYNC.email||'',err:ACC.state.err||'',busy:!!SYNC_STATUS.busy,
    lastAt:SYNC.at||0,vkMissing:!storage.get('jepi.vk',null),keysLocked:!!SYNC_STATUS.keysLocked};
}
// a tapped login link comes back here: ?sb=<config>#access_token=…
export async function syncBoot(){
  try{
    const q=new URLSearchParams(location.search), sb=q.get('sb');
    if(sb){try{const c=JSON.parse(atob(sb));if(c.u&&!SYNC.url)SYNC.url=c.u;if(c.k&&!SYNC.key)SYNC.key=c.k;if(c.e)SYNC.email=c.e;server.saveSync()}catch(_: any){}}
    const h=new URLSearchParams((location.hash||'').replace(/^#/,''));
    if(h.get('error_description')){ACC.state.err=(h.get('error_description') as string).replace(/\+/g,' ');showToast('로그인 링크가 만료됐어요. 다시 받아 주세요.')}
    if(h.get('access_token')&&SYNC.url&&SYNC.key){
      const at=h.get('access_token');let user={};
      try{const r=await fetch(SYNC.url+'/auth/v1/user',{headers:{apikey:SYNC.key,Authorization:'Bearer '+at}});user=await r.json()}catch(_: any){}
      server.keepSess({access_token:at,refresh_token:h.get('refresh_token'),expires_in:+(h.get('expires_in') as any)||3600,user});SYNC.sent={};SYNC.lastPull=0;server.saveSync();ACC.state.step=h.get('type')==='recovery'?'newpw':'';if(ACC.state.step==='newpw'){ui.tab='settings';setTimeout(()=>{R.renderTabs();renderSettings()},300)}
      showToast('로그인했어요 · 동기화를 켰어요');
    }
    if(sb||h.get('access_token')||h.get('error_description')) history.replaceState(null,'',location.pathname);
  }catch(_: any){}
  setTimeout(sync.syncNow,800);
}


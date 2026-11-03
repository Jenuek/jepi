// ================= 기기 간 동기화 (Supabase, 본인 계정 데이터만) =================
// The server conversation (login, session, tables) is in app/data/server.ts, key encryption in app/data/vault.ts.
// SYNC is the same object as JD.server.SYNC: the sync settings, saved as jepi.sync.
const SB_DEFAULT=JD.server.SB_DEFAULT;
const SYNC=JD.server.SYNC;
const saveSync=JD.server.saveSync;
let syncStep='', syncErr='';
const syncOn=JD.server.syncOn;
function hashStr(s){return JD.hashStr(s)}
function sbAuth(path,body){return JD.server.sbAuth(path,body)}
function keepSess(j){JD.server.keepSess(j)}
function sbToken(){return JD.server.sbToken()}
function sbRest(method,q,body,prefer){return JD.server.sbRest(method,q,body,prefer)}
// any table (or rpc/<name>) in the project, as the logged-in person; rows are limited by RLS on the server
function sbTable(table,method,q,body,prefer){return JD.server.sbTable(table,method,q,body,prefer)}
// AI·지도 키: 비밀번호에서 만든 열쇠로 암호화해서만 서버에 올려요 (열쇠는 이 기기에만)
const b64e=JD.vault.b64e, b64d=JD.vault.b64d;
function vaultMake(email,pw){return JD.vault.vaultMake(email,pw)}
function vaultKey(){return JD.vault.vaultKey()}
function vaultSeal(obj){return JD.vault.vaultSeal(obj)}
function vaultOpen(d){return JD.vault.vaultOpen(d)}
// What to send and how to merge what comes back: app/data/sync.ts. Here: our values, and redrawing after.
const SYNC_STATUS=JD.sync.status; // .busy (sending or receiving), .keysLocked (server keys locked with another password)
function syncSoon(ms){JD.sync.syncSoon(ms)}
function syncPush(){return JD.sync.syncPush()}
function syncPull(){return JD.sync.syncPull()}
function syncNow(){return JD.sync.syncNow()}
JD.sync.connectSync({
  plans:()=>plans, setPlans(p){plans=p}, curPlan:()=>curPlan,
  kws:()=>kws, setKws(k){kws=k},
  myPlaces:()=>MYP, setMyPlaces(m){MYP=m},
  keys:()=>KEYS, setKeys(k){KEYS=k;saveKeys(true)},
  setErr(m){syncErr=m},
  async afterPush(){
    if(tab==='settings') renderSettings();
    for(const f of SYNC_AFTER_PUSH){try{await f()}catch(e){console.warn(e)}}
  },
  async afterPull({changed,curChanged,keysPulled}){
    if(curChanged){const ae=document.activeElement;const editing=(ae&&/^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName))||!$('#sheetBg').hidden||!$('#onb').hidden;
      if(!editing){applyPlanData(curChanged);showToast('다른 기기에서 바꾼 내용을 받아왔어요')} }
    if(keysPulled){keyBad={};if(STANDALONE)sample=makeSample();renderAll();showToast('AI·지도 키도 받아왔어요')}
    if(changed){renderPlans();renderExt()} if(tab==='settings')renderSettings();
    for(const f of SYNC_AFTER_PULL){try{await f()}catch(e){console.warn(e)}}
  }
});
function syncHTML(){
  if(!SYNC.url||!SYNC.key||syncStep==='setup') return `<div class="mgroup pad"><p class="hint" style="margin-top:0">Supabase 프로젝트의 <b>Project URL</b>과 <b>anon(또는 publishable) 키</b>를 넣어 주세요. 대시보드 → Project Settings → API에 있어요.</p>
    <label class="fg" style="display:block"><span class="hint">Project URL</span><input id="sbUrl" value="${esc(SYNC.url)}" placeholder="https://xxxx.supabase.co" autocomplete="off" autocapitalize="off" spellcheck="false"></label>
    <label class="fg" style="display:block;margin-top:6px"><span class="hint">anon / publishable 키</span><input id="sbKey" type="password" value="" placeholder="${SYNC.key?'저장됨 · 바꿀 때만 입력':'eyJ… 또는 sb_publishable_…'}" autocomplete="off" autocapitalize="off" spellcheck="false"></label>
    <div class="row" style="margin-top:8px"><button class="small-btn primary" type="button" id="sbSave">저장</button>${SYNC.url&&SYNC.key?'<button class="small-btn" type="button" id="sbCancel">취소</button>':''}</div>${syncErr?`<small class="kmsg">✕ ${esc(syncErr)}</small>`:''}</div>`;
  if(!syncOn()){
    if(syncStep==='reset') return `<div class="mgroup pad"><p class="hint" style="margin-top:0"><b>${esc(SYNC.email)}</b>로 비밀번호 재설정 메일을 보냈어요. 메일의 링크를 이 기기에서 누르거나, 길게 눌러 복사해서 아래에 붙여 넣어 주세요.</p>
      <div class="kin"><input id="sbCode" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="https://…supabase.co/auth/v1/verify?token=…"><button class="small-btn primary" type="button" id="sbVerify">확인</button></div>
      ${syncErr?`<small class="kmsg">✕ ${esc(syncErr)}</small>`:''}<div class="row"><button class="small-btn" type="button" id="sbBack">로그인으로</button></div></div>`;
    const join=syncStep==='join';
    return `<div class="mgroup pad"><div class="radio" role="tablist" style="margin:0 0 8px"><button type="button" data-sbmode="login" aria-pressed="${!join}">로그인</button><button type="button" data-sbmode="join" aria-pressed="${join}">처음이에요 (가입)</button></div>
      <p class="hint" style="margin-top:0">${join?'처음 한 번만 가입해요. 폰과 아이패드에서 같은 이메일·비밀번호로 로그인하면 계획이 맞춰져요.':'가입한 이메일과 비밀번호로 로그인해요. 한 번 로그인하면 이 기기에서는 계속 유지돼요.'}</p>
      <form id="sbForm" class="sb-form"><input id="sbEmail" type="email" value="${esc(SYNC.email)}" placeholder="이메일" autocomplete="email" required>
      <input id="sbPw" type="password" placeholder="${join?'비밀번호 (6자 이상)':'비밀번호'}" autocomplete="${join?'new-password':'current-password'}" minlength="6" required>
      ${join?'<input id="sbPw2" type="password" placeholder="비밀번호 한 번 더" autocomplete="new-password" minlength="6" required>':''}
      <button class="small-btn primary" type="submit" id="sbGo">${join?'가입하고 동기화 켜기':'로그인'}</button></form>
      ${syncErr?`<small class="kmsg">✕ ${esc(syncErr)}</small>`:''}
      <div class="row">${join?'':'<button class="small-btn" type="button" id="sbForgot">비밀번호를 잊었어요</button>'}<button class="small-btn" type="button" id="sbSetup">서버 주소 바꾸기</button></div></div>`;
  }
  if(syncStep==='newpw') return `<div class="mgroup pad"><p class="hint" style="margin-top:0">새 비밀번호를 정해 주세요.</p><form id="sbPwForm" class="sb-form"><input id="sbNew" type="password" placeholder="새 비밀번호 (6자 이상)" autocomplete="new-password" minlength="6" required><button class="small-btn primary" type="submit">저장</button></form>${syncErr?`<small class="kmsg">✕ ${esc(syncErr)}</small>`:''}</div>`;
  const t=SYNC.at?new Date(SYNC.at):null;
  return `<div class="mgroup pad"><div class="srow" style="margin:0"><span><b>☁️ ${esc(SYNC.sess.email||SYNC.email)}</b><br><small class="hint">${SYNC_STATUS.busy?'맞추는 중…':syncErr?'✕ '+esc(syncErr):t?`마지막 동기화 ${t.getHours()}:${String(t.getMinutes()).padStart(2,'0')}`:'아직 동기화 전'}</small></span><span class="mchip ${syncErr?'warn':'ok'}">${syncErr?'확인 필요':'켜짐'}</span></div>
    <div class="row" style="margin-top:8px"><button class="small-btn primary" type="button" id="sbNow">지금 동기화</button><button class="small-btn" type="button" id="sbOut">로그아웃</button></div>
    <p class="hint">계획, 취향 키워드, 내 장소, AI·지도 키가 맞춰져요. 키는 비밀번호로 암호화해서 올라가서 서버에서도 알아볼 수 없어요.</p>${!LS.get('jepi.vk',null)?'<p class="hint" style="color:var(--warn,#b45309)">키까지 맞추려면 로그아웃했다가 다시 로그인해 주세요.</p>':SYNC_STATUS.keysLocked?'<p class="hint" style="color:var(--warn,#b45309)">서버의 키가 다른 비밀번호로 잠겨 있어요. 비밀번호를 바꿨다면 키가 있는 기기에서 다시 로그인해 주세요.</p>':''}</div>`;
}
document.addEventListener('click',async e=>{const t=e.target.closest('button');if(!t)return;
  if(t.id==='sbSetup'){syncStep='setup';renderSettings();return}
  if(t.id==='sbCancel'){syncStep='';renderSettings();return}
  if(t.id==='sbSave'){const u=(($('#sbUrl')||{}).value||'').trim().replace(/\/+$/,''),k=(($('#sbKey')||{}).value||'').trim();
    if(!/^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/i.test(u)){syncErr='주소는 https://xxxx.supabase.co 모양이에요.';renderSettings();return}
    if(!k&&!SYNC.key){syncErr='키를 넣어 주세요.';renderSettings();return}
    if(u!==SYNC.url){SYNC.sess=null;SYNC.sent={};SYNC.lastPull=0} SYNC.url=u; if(k)SYNC.key=k; syncErr='';syncStep='';saveSync();renderSettings();return}
  if(t.id==='sbSend'){const em=(($('#sbEmail')||{}).value||'').trim();if(!/^\S+@\S+\.\S+$/.test(em)){syncErr='이메일을 확인해 주세요.';renderSettings();return}
    SYNC.email=em;saveSync();t.disabled=true;try{const back=location.origin+location.pathname+'?sb='+encodeURIComponent(btoa(JSON.stringify({u:SYNC.url,k:SYNC.key,e:em})));await sbAuth('/auth/v1/otp?redirect_to='+encodeURIComponent(back),{email:em,create_user:true});syncStep='code';syncErr=''}catch(err){syncErr=err.message}renderSettings();return}
  if(t.id==='sbBack'){syncStep='';renderSettings();return}
  if(t.id==='sbVerify'){const code=(($('#sbCode')||{}).value||'').trim();if(!code)return;t.disabled=true;
    try{const wasReset=syncStep==='reset';keepSess(await sbVerifyInput(code));syncStep=wasReset?'newpw':'';syncErr='';SYNC.sent={};SYNC.lastPull=0;saveSync();renderSettings();await syncNow();showToast('동기화를 켰어요')}catch(err){syncErr=err.message;renderSettings()}return}
  if(t.id==='sbNow'){syncNow();renderSettings();return}
  if(t.id==='sbOut'){LS.del('jepi.vk');SYNC_STATUS.keysLocked=false;SYNC.sess=null;SYNC.sent={};SYNC.lastPull=0;saveSync();syncStep='';renderSettings();return}
});

async function sbVerifyInput(v){
  let th=null, ty='email';
  try{const u=new URL(v);th=u.searchParams.get('token')||u.searchParams.get('token_hash');ty=u.searchParams.get('type')||'magiclink'}catch(_){}
  if(th){if(/^pkce_/.test(th))throw aiErr('auth','이 링크는 이 방식으로 쓸 수 없어요. 링크를 이 기기에서 직접 눌러 주세요.');
    return sbAuth('/auth/v1/verify',{type:ty==='signup'?'signup':ty==='recovery'?'recovery':'magiclink',token_hash:th})}
  const code=v.replace(/\s/g,''); if(!/^\d{6,10}$/.test(code)) throw aiErr('auth','메일의 Sign in 링크 주소를 통째로 붙여 넣어 주세요.');
  return sbAuth('/auth/v1/verify',{type:'email',email:SYNC.email,token:code});
}
// a tapped login link comes back here: ?sb=<config>#access_token=…
async function syncBoot(){
  try{
    const q=new URLSearchParams(location.search), sb=q.get('sb');
    if(sb){try{const c=JSON.parse(atob(sb));if(c.u&&!SYNC.url)SYNC.url=c.u;if(c.k&&!SYNC.key)SYNC.key=c.k;if(c.e)SYNC.email=c.e;saveSync()}catch(_){}}
    const h=new URLSearchParams((location.hash||'').replace(/^#/,''));
    if(h.get('error_description')){syncErr=h.get('error_description').replace(/\+/g,' ');showToast('로그인 링크가 만료됐어요. 다시 받아 주세요.')}
    if(h.get('access_token')&&SYNC.url&&SYNC.key){
      const at=h.get('access_token');let user={};
      try{const r=await fetch(SYNC.url+'/auth/v1/user',{headers:{apikey:SYNC.key,Authorization:'Bearer '+at}});user=await r.json()}catch(_){}
      keepSess({access_token:at,refresh_token:h.get('refresh_token'),expires_in:+h.get('expires_in')||3600,user});SYNC.sent={};SYNC.lastPull=0;saveSync();syncStep=h.get('type')==='recovery'?'newpw':'';if(syncStep==='newpw'){tab='settings';setTimeout(()=>{renderTabs();renderSettings()},300)}
      showToast('로그인했어요 · 동기화를 켰어요');
    }
    if(sb||h.get('access_token')||h.get('error_description')) history.replaceState(null,'',location.pathname);
  }catch(_){}
  setTimeout(syncNow,800);
}

// email + password
function sbErrText(m){return /already registered|already exists/i.test(m)?'이미 가입된 이메일이에요. "로그인"으로 들어가 주세요.':/invalid login|invalid_credentials|Invalid login/i.test(m)?'이메일이나 비밀번호가 맞지 않아요.':/Email not confirmed/i.test(m)?'메일 확인이 켜져 있어요. Supabase에서 Confirm email을 꺼 주세요.':/Password should|weak/i.test(m)?'비밀번호는 6자 이상으로 해 주세요.':/signups not allowed/i.test(m)?'가입이 꺼져 있어요 (Supabase 설정).':m}
document.addEventListener('submit',async e=>{const f=e.target;if(!f||(f.id!=='sbForm'&&f.id!=='sbPwForm'))return;e.preventDefault();
  if(f.id==='sbPwForm'){const pw=($('#sbNew')||{}).value||'';try{const tk=await sbToken();const r=await fetch(SYNC.url+'/auth/v1/user',{method:'PUT',headers:{apikey:SYNC.key,Authorization:'Bearer '+tk,'content-type':'application/json'},body:JSON.stringify({password:pw})});
      if(!r.ok){let m='';try{const j=await r.json();m=j.msg||j.message||''}catch(_){}throw aiErr('auth',sbErrText(m||'HTTP '+r.status))}try{await vaultMake(SYNC.sess.email||SYNC.email,pw);SYNC_STATUS.keysLocked=false;SYNC.sent.keys='';LS.set('jepi.keysAt',Date.now());syncSoon(500)}catch(_){}syncStep='';syncErr='';showToast('새 비밀번호를 저장했어요')}catch(err){syncErr=err.message}renderSettings();return}
  const em=(($('#sbEmail')||{}).value||'').trim(), pw=($('#sbPw')||{}).value||'', join=syncStep==='join';
  if(em){SYNC.email=em;saveSync()}
  if(join&&pw!==(($('#sbPw2')||{}).value||'')){syncErr='두 비밀번호가 달라요.';renderSettings();return}
  const btn=$('#sbGo'); if(btn){btn.disabled=true;btn.textContent='잠시만요…'}
  try{syncStep='';await sbSignIn(em,pw,join);renderSettings();await syncNow();showToast(join?'가입했어요 · 동기화를 켰어요':'로그인했어요 · 동기화를 켰어요')}
  catch(err){if(join)syncStep='join';syncErr=sbErrText(err.message);renderSettings()}
});
// sign up or log in with email + password; also makes this device's key-unlocking key
async function sbSignIn(em,pw,join){
  SYNC.email=em; saveSync();
  const j=join?await sbAuth('/auth/v1/signup',{email:em,password:pw}):await sbAuth('/auth/v1/token?grant_type=password',{email:em,password:pw});
  const sess=j.access_token?j:(j.session||null);
  if(!sess||!sess.access_token) throw aiErr('auth','메일 확인이 켜져 있어서 바로 로그인되지 않았어요. Supabase에서 Confirm email을 꺼 주세요.');
  try{await vaultMake(em,pw)}catch(_){}
  keepSess(Object.assign({},sess,{user:sess.user||j.user}));syncErr='';SYNC.sent={};SYNC.lastPull=0;saveSync();
}
document.addEventListener('click',async e=>{const t=e.target.closest('button');if(!t)return;
  if(t.dataset.sbmode){syncStep=t.dataset.sbmode==='join'?'join':'';syncErr='';renderSettings();return}
  if(t.id==='sbForgot'){const em=(($('#sbEmail')||{}).value||SYNC.email||'').trim();if(!/^\S+@\S+\.\S+$/.test(em)){syncErr='이메일을 먼저 넣어 주세요.';renderSettings();return}
    SYNC.email=em;saveSync();try{await sbAuth('/auth/v1/recover?redirect_to='+encodeURIComponent(location.origin+location.pathname+'?sb='+encodeURIComponent(btoa(JSON.stringify({u:SYNC.url,k:SYNC.key,e:em})))),{email:em});syncStep='reset';syncErr=''}catch(err){syncErr=err.message}renderSettings();return}
});


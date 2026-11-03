// ---------- first screen: 새 여행 만들기 / 이미 계정이 있어요 / 데모 둘러보기 ----------
var welcomeView='pick', welcomeErr='', welcomeBusy=false, welcomeJoin=false;
function openWelcome(){welcomeView='pick';welcomeErr='';renderWelcome();$('#welcome').hidden=false}
function closeWelcome(){$('#welcome').hidden=true}
function renderWelcome(){
  const box=$('#welcomeBox'); if(!box) return;
  if(welcomeView==='login'||welcomeView==='join'){
    const inv=welcomeView==='join';
    box.innerHTML=`${inv?'':'<button class="linkbtn w-back" data-w="back">← 처음으로</button>'}
      <h2 class="w-h">${inv?'친구가 여행에 초대했어요':'로그인'}</h2><p class="w-sub">${inv?'로그인하거나 처음이면 가입하면 바로 같은 일정에 참여해요.':'다른 기기에서 만든 계획과 AI·지도 연결을 그대로 가져와요.'}</p>
      ${inv?`<div class="radio" style="margin:0 0 8px"><button type="button" data-w="mode-login" aria-pressed="${!welcomeJoin}">로그인</button><button type="button" data-w="mode-join" aria-pressed="${welcomeJoin}">처음이에요 (가입)</button></div>`:''}
      <form id="wForm" class="sb-form"><input id="wEmail" type="email" placeholder="이메일" autocomplete="email" value="${esc(SYNC.email||'')}" required>
      <input id="wPw" type="password" placeholder="${welcomeJoin?'비밀번호 (6자 이상)':'비밀번호'}" autocomplete="${welcomeJoin?'new-password':'current-password'}" minlength="6" required>
      <button class="w-go" type="submit" id="wGo" ${welcomeBusy?'disabled':''}>${welcomeBusy?'잠시만요…':welcomeJoin?'가입하고 참여하기':inv?'로그인하고 참여하기':'로그인'}</button></form>
      ${welcomeErr?`<p class="w-err">✕ ${esc(welcomeErr)}</p>`:''}
      <div class="w-links"><button class="linkbtn" data-w="forgot">비밀번호를 잊었어요</button><button class="linkbtn" data-w="new">계정 없이 시작하기</button></div>`;
    return;
  }
  if(welcomeView==='sent'){
    box.innerHTML=`<button class="linkbtn w-back" data-w="login">← 로그인으로</button><h2 class="w-h">메일을 보냈어요</h2>
      <p class="w-sub"><b>${esc(SYNC.email)}</b>로 비밀번호 재설정 링크를 보냈어요. 이 기기에서 링크를 누르면 새 비밀번호를 정할 수 있어요.</p>`;
    return;
  }
  box.innerHTML=`<div class="w-logo"><b>JEPI</b><span>우리의 삶은 계획과 우연의 연속</span></div>
    <div class="w-choices">
      <button class="w-card primary" data-w="new"><b>새 여행 만들기</b><small>어디로 갈지 아직 몰라도 괜찮아요</small></button>
      <button class="w-card" data-w="login"><b>이미 계정이 있어요</b><small>로그인하면 다른 기기의 계획을 가져와요</small></button>
      <button class="w-card" data-w="demo"><b>데모 둘러보기</b><small>오사카 3박 4일 예시 · 끝내면 아무것도 남지 않아요</small></button>
    </div>`;
}
async function welcomeLogin(em,pw){
  welcomeBusy=true; welcomeErr=''; renderWelcome();
  try{
    await sbSignIn(em,pw,welcomeJoin); await syncNow();
    if(LS.get('jepi.joinCode','')){welcomeBusy=false;closeWelcome();if(!(await joinPending())&&firstRun)openOnb();return}
    const mine=plans.filter(p=>p.id!==curPlan&&store.get('gp.plan.'+p.id,null)).sort((a,b)=>(b.updated||0)-(a.updated||0));
    welcomeBusy=false; closeWelcome();
    if(mine.length){curPlan='';openPlan(mine[0].id);startupFocus();showToast(`로그인했어요 · 계획 ${mine.length}개를 가져왔어요`)}
    else{openOnb();showToast('로그인했어요 · 아직 저장된 여행이 없어서 새로 만들어요')}
  }catch(err){welcomeBusy=false;welcomeErr=sbErrText(err.message);renderWelcome()}
}
// ---------- demo: enter / leave (the sandbox itself is in app/data/demo.ts) ----------
function demoEnter(){
  if(!JD.demo.demoSaveCopy()){showToast('저장 공간이 부족해서 데모를 열 수 없어요');return}
  JD.demo.demoClearTrips();
  const d=demoOsaka(), set=JD.storage.set;
  set('gp.pack',d.pack); set('gp.profile',d.profile); set('gp.placed3',d.placed); set('gp.custom',[]); set('gp.kw',[]); set('gp.jp','J');
  set('gp.plan.demo',{profile:d.profile,pack:d.pack,placed:d.placed});
  set('gp.plans',[{id:'demo',name:d.name,custom_name:true,updated:Date.now(),kind:'trip',dates:'',blocks:d.placed.length}]); set('gp.cur','demo');
  try{sessionStorage.setItem(DEMO_LIVE,'1')}catch(_){}
  location.replace(location.pathname);
}
function demoExit(){demoRestore();location.replace(location.pathname)}
function renderDemoBar(){
  const bar=$('#demoBar'); if(!bar) return; bar.hidden=!DEMO.on; document.body.classList.toggle('demo-on',DEMO.on);
}
document.addEventListener('click',e=>{
  const t=e.target.closest('[data-w],#demoExit'); if(!t) return;
  if(t.id==='demoExit'){demoExit();return}
  const w=t.dataset.w;
  if(w==='new'){closeWelcome();openOnb();return}
  if(w==='mode-login'||w==='mode-join'){welcomeJoin=w==='mode-join';welcomeErr='';renderWelcome();return}
  if(w==='demo'){demoEnter();return}
  if(w==='login'||w==='back'){welcomeView=w==='login'?'login':'pick';welcomeErr='';renderWelcome();if(w==='login')setTimeout(()=>{const i=$('#wEmail');if(i&&!i.value)i.focus()},50);return}
  if(w==='forgot'){const em=(($('#wEmail')||{}).value||'').trim();if(!/^\S+@\S+\.\S+$/.test(em)){welcomeErr='이메일을 먼저 넣어 주세요.';renderWelcome();return}
    SYNC.email=em;saveSync();sbAuth('/auth/v1/recover?redirect_to='+encodeURIComponent(location.origin+location.pathname),{email:em}).then(()=>{welcomeView='sent';renderWelcome()}).catch(err=>{welcomeErr=err.message;renderWelcome()});return}
});
document.addEventListener('submit',e=>{if(!e.target||e.target.id!=='wForm')return;e.preventDefault();
  welcomeLogin((($('#wEmail')||{}).value||'').trim(),($('#wPw')||{}).value||'')});
// test hooks (local checks only)
if(/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) window.__jepi={demoEnter,navLink,routeProvider,sync:()=>syncNow(),state:()=>({cur:curPlan,plans:plans.map(p=>({id:p.id,shared:p.shared,role:p.role}))}),demoLikeTrip(){const d=demoOsaka();d.pack.demo=false;applyPlanData({profile:d.profile,pack:d.pack,placed:d.placed});$('#onb').hidden=true;snapshotCurrent();renderAll()}};

// ---------- first screen: 새 여행 만들기 / 이미 계정이 있어요 / 데모 둘러보기 ----------
var welcomeView='pick', welcomeErr='', welcomeBusy=false, welcomeJoin=false;
function openWelcome(){welcomeView='pick';welcomeErr='';renderWelcome();$('#welcome').hidden=false}
function closeWelcome(){$('#welcome').hidden=true}
// drawn by React: app/screens/Welcome.tsx
let welcomeRev=0;
function renderWelcome(){
  const box=$('#welcomeBox'); if(!box) return;
  window.JEPI_UI.mount('welcome',box,{view:['login','join','sent'].includes(welcomeView)?welcomeView:'pick',joinMode:!!welcomeJoin,email:String(SYNC.email||''),busy:!!welcomeBusy,err:String(welcomeErr||''),rev:++welcomeRev});
}
async function welcomeLogin(em,pw){
  welcomeBusy=true; welcomeErr=''; renderWelcome();
  try{
    await sbSignIn(em,pw,welcomeJoin); await syncNow();
    if(LS.get('jepi.joinCode','')){welcomeBusy=false;closeWelcome();if(!(await joinPending())&&firstRun)openOnb();return}
    const mine=plans.filter(p=>p.id!==curPlan&&TRIP.plans.get(p.id)).sort((a,b)=>(b.updated||0)-(a.updated||0));
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
  set('gp.pack',d.pack); TRIP.save('profile',d.profile); TRIP.save('placed',d.placed); TRIP.save('custom',[]); TRIP.kws.save([]); set('gp.jp','J');
  TRIP.plans.put('demo',{profile:d.profile,pack:d.pack,placed:d.placed});
  TRIP.plans.saveList([{id:'demo',name:d.name,custom_name:true,updated:Date.now(),kind:'trip',dates:'',blocks:d.placed.length}],'demo');
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

// ---------- first screen: 새 여행 만들기 / 이미 계정이 있어요 / 데모 둘러보기 ----------
// The screen is React (app/screens/Welcome.tsx): it keeps its own view, logs in, and asks for these (host in 389-titles.js).
var welcomeView='pick';   // where it opens: 'pick' or 'join' (an invite link)
function openWelcome(){welcomeView='pick';renderWelcome();$('#welcome').hidden=false}
function closeWelcome(){$('#welcome').hidden=true}
let welcomeRev=0;
function renderWelcome(){
  const box=$('#welcomeBox'); if(!box) return;
  window.JEPI_UI.mount('welcome',box,{view:welcomeView==='join'?'join':'pick',email:String(SYNC.email||''),rev:++welcomeRev});
}
// after logging in on the first screen: a pending invite, else the newest plan that came with the account, else a new trip
async function welcomeLoggedIn(){
  if(LS.get('jepi.joinCode','')){closeWelcome();if(!(await joinPending())&&firstRun)openOnb();return}
  const mine=plans.filter(p=>p.id!==curPlan&&TRIP.plans.get(p.id)).sort((a,b)=>(b.updated||0)-(a.updated||0));
  closeWelcome();
  if(mine.length){curPlan='';openPlan(mine[0].id);startupFocus();showToast(`로그인했어요 · 계획 ${mine.length}개를 가져왔어요`)}
  else{openOnb();showToast('로그인했어요 · 아직 저장된 여행이 없어서 새로 만들어요')}
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
document.addEventListener('click',e=>{if(e.target.closest('#demoExit'))demoExit()});
// test hooks (local checks only)
if(/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) window.__jepi={demoEnter,navLink,routeProvider,sync:()=>syncNow(),state:()=>({cur:curPlan,plans:plans.map(p=>({id:p.id,shared:p.shared,role:p.role}))}),demoLikeTrip(){const d=demoOsaka();d.pack.demo=false;applyPlanData({profile:d.profile,pack:d.pack,placed:d.placed});$('#onb').hidden=true;snapshotCurrent();renderAll()}};

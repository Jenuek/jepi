// ---------- first screen: 새 여행 만들기 / 이미 계정이 있어요 / 데모 둘러보기 ----------
// The screen is React (app/screens/Welcome.tsx): it keeps its own view, logs in, and asks for these (host in 389-titles.js).
// the first screen, after logging in, the demo: app/flow/welcome.ts
const WELC=window.JEPI_UI.flow.welcome;
WELC.connect({joinPending:()=>joinPending(),firstRun:()=>firstRun,startupFocus:()=>startupFocus()});
const openWelcome=WELC.openWelcome, closeWelcome=WELC.closeWelcome, welcomeLoggedIn=WELC.welcomeLoggedIn, demoEnter=WELC.demoEnter, demoExit=WELC.demoExit, renderDemoBar=WELC.renderDemoBar;
document.addEventListener('click',e=>{if(e.target.closest('#demoExit'))demoExit()});
// test hooks (local checks only)
if(/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) window.__jepi={demoEnter,navLink,routeProvider,sync:()=>syncNow(),state:()=>({cur:PL.curPlan,plans:PL.plans.map(p=>({id:p.id,shared:p.shared,role:p.role}))}),demoLikeTrip(){const d=demoOsaka();d.pack.demo=false;applyPlanData({profile:d.profile,pack:d.pack,placed:d.placed});onbFrame({open:false});snapshotCurrent();renderAll()}};

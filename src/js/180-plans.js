// ---------- my plans: several saved plans, account sync, sharing ----------
const PLANS=JD.plans;   // a plan's name, contents and text: app/data/plans.ts
PL.plans=[]; PL.curPlan='';
const planName=PLANS.planName;   // app/data/plans.ts
// switching, making, copying, deleting, renaming plans; opening one; 카톡용 글, files, backups, share links: app/flow/plans.ts
const PLF=window.JEPI_UI.flow.plans;
PLF.connect({addCustomToData:c=>addCustomToData(c),setJP:(m,q)=>setJP(m,q),carryTaste:(a,b)=>carryTaste(a,b),shareLink:n=>shareLink(n),openShared:()=>openShared(),
  lastLink:()=>SHARE.lastLinkOf(),importAll:v=>importAll(v),standalone:()=>!!STANDALONE,renderPlanBtn:()=>renderPlanBtn()});
const savePlans=PLF.savePlans, snapshotCurrent=PLF.snapshotCurrent, touchPlan=PLF.touchPlan, applyPlanData=PLF.applyPlanData, openPlan=PLF.openPlan, newPlan=PLF.newPlan,
  openCode=PLF.openCode, inClaude=PLF.inClaude, downloadText=PLF.downloadText, importBackup=PLF.importBackup, copyText=PLF.copyText, plansAct=PLF.plansAct, renderPlans=PLF.renderPlans;

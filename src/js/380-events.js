// ---------- events ----------
// tabs, the clicks that work anywhere, 경고 해결, 더보기 rows, 알려 주세요, place cards: app/flow/events.ts
const EVT=window.JEPI_UI.flow.events;
EVT.init();   // the page-wide listeners start here, in the same order as before
const goTab=EVT.goTab, fixWarns=EVT.fixWarns, moreAct=EVT.moreAct, nudgeAct=EVT.nudgeAct, placeAct=EVT.placeAct;
// presses on the 일정표 and around it (block sheet, empty time, Day buttons, 간식비, 준비하기, AI box, 취향 키워드, drag & drop):
// app/flow/schedule.ts. What it still needs from the old code is connected here.
const SCHED=window.JEPI_UI.flow.schedule;
SCHED.connect({hero:p=>hero(p),diceFrom:t=>DFLOW.diceFrom(t),openCustom:(id,st)=>openCustom(id,st),
  makePairBlock:(uid,k)=>makePairBlock(uid,k),genSeason:id=>genSeason(id),fixWarns:()=>fixWarns()});
const blockAct=SCHED.blockAct, checksAct=SCHED.checksAct, aiboxAct=SCHED.aiboxAct, gridAct=SCHED.gridAct, kwAct=SCHED.kwAct, dropped=SCHED.dropped;

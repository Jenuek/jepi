// ---------- 알림: push notifications while travelling ----------
// The server / device side and the settings live in app/data/alerts.ts, which reminders and time zones in
// app/logic/alerts.ts; the panel and the 🔔 row in a block's sheet handle their own buttons. Here: the trip side.
const AL=JD.alerts;
var NOTIFY=AL.settings;   // the same object (on, all, lead, depart, morning)
const pushSupported=AL.pushSupported, isIOS=AL.isIOS, standaloneApp=AL.standaloneApp;
// which blocks can ring: places and fixed things like check-in / flights, not the night at the hotel
const alertKey=(it,d)=>`${it.kind==='place'?it.id:it.uid}@${d}`;
const alertable=it=>!it.stay&&(it.kind==='place'||it.kind==='fixed');
const alertOn=(it,d)=>AL.isOn(alertKey(it,d));
const tripTZ=()=>JD.logic.alerts.tripTZ(PACK);
const alertsSoon=ms=>AL.soon(ms);
AL.connectAlerts({curPlan:()=>PL.curPlan,tz:tripTZ,demo:()=>!!DEMO.on,redraw:()=>{PANELS.notify.render();renderMore();renderAll()},
  days:()=>DAYS.map((D,d)=>({iso:D.iso||'',rows:D.iso?analyze(d).items.filter(alertable).map(it=>({key:alertKey(it,d),name:String(it.name),start:it.start,end:it.end,locName:it.locName||'',travelIn:it.travelIn||null})):[]}))});
BLOCK_BADGES.push((it,d)=>alertable(it)&&alertOn(it,d)&&NOTIFY.on?{k:'badge',t:'🔔',title:'알림 켜짐'}:null);
SHEET_EXTRAS.push((it,d)=>{if(!alertable(it)||DEMO.on)return null;const on=alertOn(it,d);
  return {k:'alert',key:alertKey(it,d),on:!!on,hint:!NOTIFY.on?'더보기 → 알림에서 이 기기 알림을 켜야 와요':on?(NOTIFY.depart&&it.travelIn?`출발 ${NOTIFY.lead}분 전에 알려 드려요`:`시작 ${NOTIFY.lead}분 전에 알려 드려요`):''}});
// The panel itself is drawn by React: app/screens/NotifyPanel.tsx
PANELS.notify={render(){
  const box=$('#notifyBox'); if(!box) return;
  const mode=DEMO.on?'demo':!pushSupported()?(isIOS()&&!standaloneApp()?'ios-home':'unsupported'):!syncOn()?'login':'ready';
  window.JEPI_UI.mount('notify',box,{mode,busy:AL.ui.busy,msg:AL.ui.msg||'',tz:String(tripTZ()),
    settings:{on:!!NOTIFY.on,all:!!NOTIFY.all,lead:+NOTIFY.lead||10,depart:!!NOTIFY.depart,morning:!!NOTIFY.morning}});
}};
// keep the server's list in step with the plan (cheap: only uploads when something changed)
setInterval(()=>{if(NOTIFY.on&&!document.hidden)alertsSoon(100)},30000);

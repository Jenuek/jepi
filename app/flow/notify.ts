// 알림 on the trip's side: which blocks can ring, the 🔔 badge on a block and the 🔔 row in its sheet, the 알림 panel, and
// keeping the server's list in step with the plan. The server / device side and the settings live in app/data/alerts.ts,
// which reminders and time zones in app/logic/alerts.ts. (It used to be src/js/386-notify.js.)
import * as trip from '../data/trip';
import * as places from '../data/places';
import * as AL from '../data/alerts';
import * as check from '../data/check';
import { DEMO } from '../data/demo';
import { syncOn } from '../data/server';
import { state as DYs } from '../data/days';
import * as alertLogic from '../logic/alerts';
import { PANELS, BLOCK_BADGES, SHEET_EXTRAS } from '../ui/extras';
import * as R from './render';

/** what the old code still does */
export interface Legacy { renderMore(): void }
let L: Legacy;
export function connect(l: Legacy): void { L = l }

const $ = (s: string) => document.querySelector(s) as any;
const mount = (name: string, el: Element, props: any) => (window.JEPI_UI.mount as any)(name, el, props);
const PL = trip.planList as any, PK = places.state as any, DY = DYs as any;

export const NOTIFY=AL.settings as any;   // the same object (on, all, lead, depart, morning)
export const pushSupported=AL.pushSupported, isIOS=AL.isIOS, standaloneApp=AL.standaloneApp;
// which blocks can ring: places and fixed things like check-in / flights, not the night at the hotel
export const alertKey=(it: any,d: any)=>`${it.kind==='place'?it.id:it.uid}@${d}`;
export const alertable=(it: any)=>!it.stay&&(it.kind==='place'||it.kind==='fixed');
export const alertOn=(it: any,d: any)=>AL.isOn(alertKey(it,d));
export const tripTZ=()=>alertLogic.tripTZ(PK.pack);
export const alertsSoon=(ms: any)=>AL.soon(ms);



// The panel itself is drawn by React: app/screens/NotifyPanel.tsx

// keep the server's list in step with the plan (cheap: only uploads when something changed)


/** what the old file did when it loaded (it calls this at the same moment, so the order stays) */
export function init(){
AL.connectAlerts({curPlan:()=>PL.curPlan,tz:tripTZ,demo:()=>!!DEMO.on,redraw:()=>{PANELS.notify.render();L.renderMore();R.renderAll()},
  days:()=>DY.days.map((D: any,d: any)=>({iso:D.iso||'',rows:D.iso?check.analyze(d).items.filter(alertable).map((it: any)=>({key:alertKey(it,d),name:String(it.name),start:it.start,end:it.end,locName:it.locName||'',travelIn:it.travelIn||null})):[]}))});
BLOCK_BADGES.push((it: any,d: any)=>alertable(it)&&alertOn(it,d)&&NOTIFY.on?{k:'badge',t:'🔔',title:'알림 켜짐'}:null);
SHEET_EXTRAS.push((it: any,d: any)=>{if(!alertable(it)||DEMO.on)return null;const on=alertOn(it,d);
  return {k:'alert',key:alertKey(it,d),on:!!on,hint:!NOTIFY.on?'더보기 → 알림에서 이 기기 알림을 켜야 와요':on?(NOTIFY.depart&&it.travelIn?`출발 ${NOTIFY.lead}분 전에 알려 드려요`:`시작 ${NOTIFY.lead}분 전에 알려 드려요`):''}});
PANELS.notify={render(){
  const box=$('#notifyBox'); if(!box) return;
  const mode=DEMO.on?'demo':!pushSupported()?(isIOS()&&!standaloneApp()?'ios-home':'unsupported'):!syncOn()?'login':'ready';
  mount('notify',box,{mode,busy:AL.ui.busy,msg:AL.ui.msg||'',tz:String(tripTZ()),
    settings:{on:!!NOTIFY.on,all:!!NOTIFY.all,lead:+NOTIFY.lead||10,depart:!!NOTIFY.depart,morning:!!NOTIFY.morning}});
}};
setInterval(()=>{if(NOTIFY.on&&!document.hidden)alertsSoon(100)},30000);
}

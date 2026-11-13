// The first screen (새 여행 만들기 / 이미 계정이 있어요 / 데모 둘러보기: Welcome.tsx draws it and logs in itself), what opens
// after logging in, and the demo (enter: the sandbox copy, the Osaka trip, reload; leave: put everything back). The demo
// sandbox itself is app/data/demo.ts. (It used to be src/js/381-welcome-demo.js.)
import * as trip from '../data/trip';
import * as storage from '../data/storage';
import * as demo from '../data/demo';
import { demoOsaka } from '../data/demo-osaka';
import { SYNC } from '../data/server';
import * as FF from './forms';
import * as PLF from './plans';
import { showToast } from './share';

/** what the old code still does */
export interface Legacy { joinPending(): Promise<boolean>; firstRun(): boolean; startupFocus(): void }
let L: Legacy;
export function connect(l: Legacy): void { L = l }

const $ = (s: string) => document.querySelector(s) as any;
const mount = (name: string, el: Element, props: any) => (window.JEPI_UI.mount as any)(name, el, props);
const PL = trip.planList as any;

/** the first screen on its invite view (a friend's invite link while logged out) */
export function openJoin(): void { welcomeView = 'join'; renderWelcome(); $('#welcome').hidden = false }

let welcomeView='pick';   // where it opens: 'pick' or 'join' (an invite link)
export function openWelcome(){welcomeView='pick';renderWelcome();$('#welcome').hidden=false}
export function closeWelcome(){$('#welcome').hidden=true}
let welcomeRev=0;
export function renderWelcome(){
  const box=$('#welcomeBox'); if(!box) return;
  mount('welcome',box,{view:welcomeView==='join'?'join':'pick',email:String(SYNC.email||''),rev:++welcomeRev});
}
// after logging in on the first screen: a pending invite, else the newest plan that came with the account, else a new trip
export async function welcomeLoggedIn(){
  if(storage.get('jepi.joinCode','')){closeWelcome();if(!(await L.joinPending())&&L.firstRun())FF.openOnb();return}
  const mine=PL.plans.filter((p: any)=>p.id!==PL.curPlan&&trip.plans.get(p.id)).sort((a: any,b: any)=>(b.updated||0)-(a.updated||0));
  closeWelcome();
  if(mine.length){PL.curPlan='';PLF.openPlan(mine[0].id);L.startupFocus();showToast(`로그인했어요 · 계획 ${mine.length}개를 가져왔어요`)}
  else{FF.openOnb();showToast('로그인했어요 · 아직 저장된 여행이 없어서 새로 만들어요')}
}
// ---------- demo: enter / leave (the sandbox itself is in app/data/demo.ts) ----------
export function demoEnter(){
  if(!demo.demoSaveCopy()){showToast('저장 공간이 부족해서 데모를 열 수 없어요');return}
  demo.demoClearTrips();
  const d=demoOsaka(), set=storage.set;
  set('gp.pack',d.pack); trip.save('profile',d.profile); trip.save('placed',d.placed); trip.save('custom',[]); trip.kws.save([]); set('gp.jp','J');
  trip.plans.put('demo',{profile:d.profile,pack:d.pack,placed:d.placed});
  trip.plans.saveList([{id:'demo',name:d.name,custom_name:true,updated:Date.now(),kind:'trip',dates:'',blocks:d.placed.length}],'demo');
  try{sessionStorage.setItem(demo.DEMO_LIVE,'1')}catch(_: any){}
  location.replace(location.pathname);
}
export function demoExit(){demo.demoRestore();location.replace(location.pathname)}
export function renderDemoBar(){
  const bar=$('#demoBar'); if(!bar) return; bar.hidden=!demo.DEMO.on; document.body.classList.toggle('demo-on',demo.DEMO.on);
}

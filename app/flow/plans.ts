// 내 계획: switching, making, copying, deleting and renaming plans, opening a plan's data, 카톡용 글 / 파일, a backup file,
// and a friend's share link. (It used to be src/js/180-plans.js.) The old code reads its state as PS.msg, PS.delArm …
// What the old code still does is passed in once with connect() (Legacy).
import * as trip from '../data/trip';
import * as places from '../data/places';
import * as PLANS from '../data/plans';
import { MARKS } from '../data/marks';
import { syncSoon } from '../data/sync';
import { fixProfile, buildDays } from '../data/days';
import { ui } from '../ui/state';
import { setSt } from '../ui/status';
import { fs } from './forms';
import * as FF from './forms';
import { cs } from './chat';
import { hs } from './helper';
import { st as diceSt } from './dice';
import * as R from './render';
export const ps = {
  /** the message under the list */
  msg: '',
  /** 삭제 pressed once on this plan (asks once more) */
  delArm: '',
  /** the plan whose name box is open */
  renaming: '',
  /** 카톡용 글 shown */
  showText: false,
  /** saving the open plan a moment after a change */
  timer: 0 as any,
};

/** what the old code still does */
export interface Legacy {
  /** a hand-made place into the lists */
  addCustomToData(c: any): void;
  setJP(m: string, quiet?: boolean): void;
  /** taste (keywords, style …) carried from one profile to another */
  carryTaste(from: any, to: any): void;
  shareLink(asNote?: boolean): void; openShared(): void; lastLink(): string;
  /** a whole backup (jepi: 2): true when it worked */
  importAll(v: any): boolean;
  standalone(): boolean; renderPlanBtn(): void;
}
let L: Legacy;
export function connect(l: Legacy): void { L = l }

const $ = (s: string) => document.querySelector(s) as any;
const mount = (name: string, el: Element, props: any) => (window.JEPI_UI.mount as any)(name, el, props);
const CUR = trip.cur as any, PL = trip.planList as any, PMx = places.PM as any;
const clone = (o: any) => JSON.parse(JSON.stringify(o));
const planName = PLANS.planName, planData = PLANS.planData, planMeta = PLANS.planMeta, planText = PLANS.planText, PROFILE_EXAMPLE = PLANS.PROFILE_EXAMPLE;

export function savePlans(){trip.plans.saveList(PL.plans,PL.curPlan);syncSoon()}
export function snapshotCurrent(){
  if(!PL.curPlan) return; let p=PL.plans.find((x: any)=>x.id===PL.curPlan);
  if(!p){p={id:PL.curPlan,name:''};PL.plans.unshift(p)}
  const m=planMeta(); Object.assign(p,{dates:m.dates,blocks:m.blocks,kind:m.kind,updated:Date.now()}); if(!p.custom_name) p.name=planName();
  trip.plans.put(PL.curPlan,planData()); savePlans();
}
export function touchPlan(){clearTimeout(ps.timer);ps.timer=setTimeout(()=>{if($('#onb').hidden)snapshotCurrent()},1200)}
export function applyPlanData(d?: any){
  d=d||{}; places.loadPack(places.packFrom(d.pack)||places.blankPack());
  CUR.custom=Array.isArray(d.custom)?d.custom:[]; CUR.custom.forEach(L.addCustomToData);
  CUR.profile=d.profile&&typeof d.profile==='object'?d.profile:clone(PROFILE_EXAMPLE); fixProfile(CUR.profile);
  CUR.placed=(Array.isArray(d.placed)?d.placed:[]).filter((b: any)=>PMx[b.id]).map((b: any)=>({uid:trip.uids.next(),id:b.id,day:b.day,start:b.start,dur:b.dur||PMx[b.id].dur,mk:Array.isArray(b.mk)?b.mk.filter((m: any)=>MARKS[m]):undefined}));
  CUR.fmarks=d.fmarks&&typeof d.fmarks==='object'?d.fmarks:{}; CUR.wish=Array.isArray(d.wish)?d.wish:[]; CUR.meals=d.meals&&typeof d.meals==='object'?d.meals:{}; CUR.done=d.done&&typeof d.done==='object'?d.done:{};
  trip.save('profile',CUR.profile); places.savePack(); trip.save('custom',CUR.custom); trip.save('fmarks',CUR.fmarks); trip.save('wish',CUR.wish); trip.save('meals',CUR.meals); trip.save('done',CUR.done);
  cs.chat=[]; cs.undoSnap=null; ui.aiState=null; ui.selected=null; diceSt.pSt.draw=null; hs.vibe=null; hs.hotelRecs={}; hs.routeInfo=null; fs.destRecs=null; fs.destAsked=[];
  buildDays(); ui.day=0; trip.blocks.saved(); R.renderAll();
}
export function openPlan(id?: any){
  if(id===PL.curPlan) return; snapshotCurrent();
  const d=trip.plans.get(id); if(!d){ps.msg='이 계획을 불러오지 못했어요.';renderPlans();return}
  PL.curPlan=id; savePlans(); applyPlanData(d); if(CUR.profile.kind==='day'&&ui.jp!=='P') L.setJP('P'); ui.tab='timeline'; R.renderTabs(); ps.msg='';
}
export function newPlan(){
  const prevP=CUR.profile; snapshotCurrent(); PL.curPlan='p'+Date.now().toString(36); savePlans();
  CUR.custom=[];CUR.placed=[];CUR.fmarks={};CUR.wish=[];CUR.meals={};CUR.done={};
  places.loadPack(places.blankPack()); places.savePack();
  CUR.profile=clone(PROFILE_EXAMPLE); Object.assign(CUR.profile,{stays:[{name:'숙소',area:'center',checkin:'15:00',checkout:'11:00',from:0,to:3}],events:[],dest:'',pace:'normal',social:'some',breakfast:true,purpose:'',party:{type:'solo',adults:1,kids:0},flightSet:false,staySet:false,dateSet:false,nightsSet:false,dateUnknown:false,startDate:FF.isoPlus(30)});
  L.carryTaste(prevP,CUR.profile); applyPlanData({profile:CUR.profile,pack:places.blankPack()}); ui.tab='timeline'; R.renderTabs(); FF.openOnb();
}
export function dupPlan(id?: any){snapshotCurrent();const d=trip.plans.get(id),src=PL.plans.find((x: any)=>x.id===id);if(!d||!src)return;
  const nid='p'+Date.now().toString(36);trip.plans.put(nid,d);const p=Object.assign({},src,{id:nid,name:src.name+' (복사본)',custom_name:true,updated:Date.now()});PL.plans.unshift(p);savePlans();ps.msg='복사본을 만들었어요.';renderPlans()}
export function delPlan(id?: any){if(ps.delArm!==id){ps.delArm=id;renderPlans();return}ps.delArm='';
  PL.plans=PL.plans.filter((x: any)=>x.id!==id);trip.plans.del(id);
  if(id===PL.curPlan){if(PL.plans[0]){PL.curPlan='';openPlan(PL.plans[0].id)}else{PL.curPlan='';newPlan()}}savePlans();renderPlans()}
export function renamePlan(id?: any, name?: any){const p=PL.plans.find((x: any)=>x.id===id);if(!p||!name)return;p.name=name.slice(0,40);p.custom_name=true;p.updated=Date.now();savePlans();renderPlans();L.renderPlanBtn()}
// sharing
export const shareCode=()=>L.shareLink();   // a share link (240-share-link.js)
const lastCode='';
export function openCode(raw?: any){
  const m=/[#&]s=([A-Za-z0-9_-]+)/.exec(String(raw||''));if(m){location.hash='s='+m[1];L.openShared();return}
  ps.msg='친구에게 받은 공유 링크를 통째로 붙여 넣어 주세요.';renderPlans();
}
export const inClaude=()=>!!((window as any).claude&&(window as any).claude.use);
export function downloadText(name?: any, text?: any){
  try{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:name.endsWith('.json')?'application/json':'text/plain'}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000)}catch(_: any){ps.msg='파일을 받지 못했어요.';renderPlans()}
}
// restore a backup file (.json made by "백업 파일 받기")
export function importBackup(file?: any, after?: any){
  if(!file) return; const rd=new FileReader();
  rd.onload=()=>{try{const v=JSON.parse(String(rd.result||''));if(v&&v.jepi===2){FF.onbFrame({open:false});if(!L.importAll(v))throw 0;ui.tab='timeline';R.renderTabs();if(after)after(true);return}if(!v||!v.data||!v.data.profile)throw 0;
      snapshotCurrent(); const nid='p'+Date.now().toString(36); trip.plans.put(nid,v.data);
      PL.plans.unshift({id:nid,name:String(v.name||'불러온 계획').slice(0,40),custom_name:true,updated:Date.now()}); PL.curPlan=nid; savePlans();
      FF.onbFrame({open:false}); applyPlanData(v.data); snapshotCurrent(); ui.tab='timeline'; R.renderTabs(); ps.msg='백업을 불러왔어요.'; if(after) after(true);
    }catch(_: any){ps.msg='JEPI 백업 파일이 아니거나 손상됐어요.';renderPlans();setSt('st_import','JEPI 백업 파일이 아니거나 손상됐어요.');if(after)after(false)}};
  rd.readAsText(file);
}
export async function copyText(text?: any){try{await navigator.clipboard.writeText(text);ps.msg='복사했어요. 카톡에 붙여 넣으면 돼요.'}catch(_: any){ps.msg='자동 복사가 막혀 있어요. 아래 글을 길게 눌러 복사해 주세요.'}renderPlans()}
// The screen itself is drawn by React: app/screens/PlansScreen.tsx
// What was pressed in 내 계획 (PlansScreen.tsx tells: its name and value — a plan id, a typed name or code)
export function plansAct(n?: any, v?: any, v2?: any){
  switch(n){
  case 'new': newPlan();return;
  case 'open': openPlan(v);return;
  case 'dup': dupPlan(v);return;
  case 'del': delPlan(v);return;
  case 'rename': if(PL.plans.some((x: any)=>x.id===v)){ps.renaming=v;renderPlans()}return;   // its name box opens (with the cursor in it)
  case 'name': ps.renaming='';renamePlan(v,String(v2||'').trim());renderPlans();return;
  case 'share': shareCode();return;
  case 'text': ps.showText=!ps.showText;renderPlans();if(ps.showText)copyText(planText());return;
  case 'txt': downloadText(`${planName()}.txt`,planText());return;
  case 'json': snapshotCurrent();downloadText(`JEPI-${planName()}.json`,JSON.stringify({jepi:1,name:planName(),data:planData()}));return;
  case 'code': openCode(v);return;
  }
}
export function renderPlans(){
  const box=$('#plansBox'); if(!box) return;
  mount('plans',box,{plans:PL.plans.map((p: any)=>({id:p.id,name:p.name,kind:p.kind,dates:p.dates,blocks:p.blocks,updated:p.updated})),
    curPlan:PL.curPlan,delArm:ps.delArm,planMsg:ps.msg,renaming:ps.renaming,standalone:!!L.standalone(),lastLink:L.lastLink()||'',lastCode:lastCode||'',shareText:ps.showText?planText():null,
    savedInAccount:false});
}


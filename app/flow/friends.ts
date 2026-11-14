// 친구와 함께 on the screen side: shared trips, invite links, joining from a link, 가고 싶어요 (chip, card tag, sheet row,
// block badge), the 친구와 함께 panel, and putting a friend's new version into the open plan (not while typing). The server
// side (push / pull / share / invite / join / leave / stop) and the merge rules live in app/data/trips.ts and
// app/data/merge.ts. (It used to be src/js/384-trips.js.) TRIPS is JD.trips.state plus what the panel shows.
import * as trip from '../data/trip';
import * as storage from '../data/storage';
import * as tripsData from '../data/trips';
import * as server from '../data/server';
import { DEMO } from '../data/demo';
import { state as DYs } from '../data/days';
import { ui } from '../ui/state';
import { PANELS, SYNC_AFTER_PUSH, SYNC_AFTER_PULL, CARD_EXTRAS, SHEET_EXTRAS, BLOCK_BADGES } from '../ui/extras';
import * as PLF from './plans';
import { showToast } from './share';
import * as WELC from './welcome';
import * as R from './render';

/** what the old code still does */
export interface Legacy { renderExt(): void; renderMore(): void }
let L: Legacy;
export function connect(l: Legacy): void { L = l }

const $ = (s: string) => document.querySelector(s) as any;
const mount = (name: string, el: Element, props: any) => (window.JEPI_UI.mount as any)(name, el, props);
const PL = trip.planList as any, DY = DYs as any, SYNC = server.SYNC as any;
const syncOn = server.syncOn, sbTable = server.sbTable;

export const TRIPS: any=Object.assign(tripsData.state,{invite:null,msg:'',busy:false,stopArm:false});
export const myName=()=>storage.get('jepi.myName','')||String((SYNC.sess&&SYNC.sess.email)||SYNC.email||'나').split('@')[0];
export const planOf=(id: any)=>PL.plans.find((p: any)=>p.id===id);
export const curShared=()=>{const p=planOf(PL.curPlan);return p&&p.shared?p:null};
// a new version of the open plan: put it in, unless the person is typing or has a sheet open (then the next pull tries again)
export function applyIfOpen(id?: any, data?: any, who?: any){
  if(id!==PL.curPlan) return true;
  const ae=document.activeElement, editing=(ae&&/^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName))||!$('#sheetBg').hidden||!$('#onb').hidden||ui.selected;
  if(editing) return false;
  const d0=ui.day; PLF.applyPlanData(data); ui.day=Math.min(d0,Math.max(0,DY.days.length-1)); R.renderAll();
  if(who&&who!==myName()) showToast(`${who}님이 일정을 바꿨어요`);
  return true;
}

const tripPush=(id: any)=>tripsData.push(id), tripsPull=()=>tripsData.pull(), tripShare=()=>tripsData.share(), tripInvite=(role: any)=>tripsData.invite(role,location.origin+location.pathname);
const tripLeave=(uid?: any)=>tripsData.leave(uid), tripStop=()=>tripsData.stop();


export async function tripJoin(code?: any){
  const id=await tripsData.join(code); const p=planOf(id);
  if(p){PL.curPlan=PL.curPlan===id?'':PL.curPlan;PLF.openPlan(id);showToast('여행에 참여했어요')}
  return id;
}
// join link: ?join=CODE
export function joinFromUrl(){
  const code=new URLSearchParams(location.search).get('join'); if(!code) return false;
  history.replaceState(null,'',location.pathname); storage.set('jepi.joinCode',code);
  if(syncOn()){joinPending();return true}
  WELC.openJoin();return true;
}
export async function joinPending(){
  const code=storage.get('jepi.joinCode',''); if(!code||!syncOn()) return false;
  storage.del('jepi.joinCode');
  try{await tripJoin(code);return true}catch(e: any){showToast(/expired|invite/i.test(e.message)?'초대 링크가 만료됐어요. 새 링크를 받아 주세요.':'참여하지 못했어요: '+e.message);return false}
}
// ----- 가고 싶어요 (the marks live in app/data/trips.ts) -----
const wantsOf=(pid: any)=>tripsData.wantsOf(pid), iWant=(pid: any)=>tripsData.iWant(pid);
const toggleWant=(pid: any)=>curShared()?tripsData.toggleWant(pid,R.renderTray):Promise.resolve();
// 가고 싶어요 chip, card tag, sheet row, block badge (drawn by React: app/screens/Extras.tsx)
export function wantChip(pid?: any){
  const m=wantsOf(pid), on=iWant(pid), who=m.map((x: any)=>x.user_id===SYNC.sess.user?'나':x.name).join(', ');
  return {k:'want',pid:String(pid),on:!!on,n:m.length,who};
}



// 👍 가고 싶어요 on a shared trip's place (Extras.tsx)
export async function wantAct(pid?: any){try{await toggleWant(pid)}catch(err: any){showToast('저장하지 못했어요: '+err.message)}
  if(!$('#sheetBg').hidden&&$('#sheet').dataset.uid)R.openSheet($('#sheet').dataset.uid)}
// 친구와 함께 panel (FriendsPanel.tsx tells: what was pressed, and whose 내보내기 / the typed name)
export async function tripAct(a?: any, uid?: any, typed?: any){
  if(TRIPS.busy) return; if(a!=='stop') TRIPS.stopArm=false; TRIPS.busy=true; TRIPS.msg=''; PANELS.friends.render();
  try{
    if(a==='share'){await tripShare();TRIPS.invite={role:'edit',url:await tripInvite('edit')}}
    if(a==='invite-edit'||a==='invite-view'){const role=a.slice(7);TRIPS.invite={role,url:await tripInvite(role)}}
    if(a==='send'&&TRIPS.invite){const txt=`${planOf(PL.curPlan).name} 여행을 같이 짜요 · JEPI`;
      if(navigator.share){try{await navigator.share({title:'JEPI 여행 초대',text:txt,url:TRIPS.invite.url})}catch(_: any){}}
      else{try{await navigator.clipboard.writeText(TRIPS.invite.url);TRIPS.msg='초대 링크를 복사했어요'}catch(_: any){TRIPS.msg='아래 링크를 길게 눌러 복사해 주세요'}}}
    if(a==='copy'&&TRIPS.invite){try{await navigator.clipboard.writeText(TRIPS.invite.url);TRIPS.msg='초대 링크를 복사했어요'}catch(_: any){TRIPS.msg='링크를 길게 눌러 복사해 주세요'}}
    if(a==='leave') await tripLeave();
    if(a==='kick') await tripLeave(uid);
    if(a==='stop'){if(!TRIPS.stopArm){TRIPS.stopArm=true;TRIPS.busy=false;PANELS.friends.render();return}TRIPS.stopArm=false;await tripStop()}
    if(a==='name'){const v=String(typed||'').trim().slice(0,20);storage.set('jepi.myName',v);
      if(curShared())await sbTable('jepi_trip_members','PATCH',`?trip_id=eq.${encodeURIComponent(PL.curPlan)}&user_id=eq.${SYNC.sess.user}`,{name:myName()},'return=minimal');TRIPS.msg='이름을 바꿨어요';await tripsPull()}
  }catch(err: any){TRIPS.msg='✕ '+err.message}
  TRIPS.busy=false; PANELS.friends.render(); L.renderMore();
}
// ----- panel -----
// The panel itself is drawn by React: app/screens/FriendsPanel.tsx


/** what the old file did when it loaded (it calls this at the same moment, so the order stays) */
export function init(){
tripsData.connectTrips({plans:()=>PL.plans,curPlan:()=>PL.curPlan,savePlans:()=>PLF.savePlans(),applyIfOpen,myName,snapshotCurrent:()=>PLF.snapshotCurrent(),toast:(m: any)=>showToast(m),
  pulled(listChanged){if(listChanged){PLF.renderPlans();L.renderExt()} if(curShared()) R.renderAll(); if(ui.tab==='friends') PANELS.friends.render()}});
SYNC_AFTER_PUSH.push(async()=>{for(const p of PL.plans.filter((p: any)=>p.shared)) await tripPush(p.id)});
SYNC_AFTER_PULL.push(tripsPull);
CARD_EXTRAS.push((p: any)=>curShared()?[wantChip(p.id),...(p.by?[{k:'tag',cls:'tag usr',t:`${p.by===myName()?'내가':p.by+'님'} 추천`}]:[])]:null);
SHEET_EXTRAS.push((it: any)=>curShared()&&it.kind==='place'?{k:'wantRow',want:wantChip(it.id),by:it.p.by||''}:null);
BLOCK_BADGES.push((it: any)=>{if(!curShared()||it.kind!=='place')return null;const n=wantsOf(it.id).length;return n?{k:'badge',t:`👍${n}`,title:`가고 싶어요 ${n}`}:null});
PANELS.friends={render(opts){
  const box=$('#friendsBox'); if(!box) return; const p=curShared();
  if(opts&&opts.opened) TRIPS.stopArm=false; // opening the panel again forgets a first press of 공유 끝내기
  const mode=DEMO.on?'demo':!syncOn()?'login':!p?'intro':'shared';
  mount('friends',box,{mode,planName:(planOf(PL.curPlan)||{}).name||'이 여행',busy:!!TRIPS.busy,msg:TRIPS.msg||'',myName:myName(),
    members:mode==='shared'?(TRIPS.members[PL.curPlan]||[]):[],me:syncOn()?SYNC.sess.user:'',role:p?p.role||'':'',invite:TRIPS.invite||null,stopArm:!!TRIPS.stopArm});
}};
}

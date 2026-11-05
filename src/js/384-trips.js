// ---------- 친구와 함께: shared trips, invite links, 가고 싶어요 ----------
// A shared trip keeps its plan in jepi_trips (one row, `rev` goes up by one on every save).
// Each device remembers the last server version it saw (`base`). When two people change the
// same trip, the three versions are merged per block / per place / per field, so a change to
// day 1 and a change to day 2 both survive; only the very same block edited twice keeps the later one.
// Server tables + rules: see supabase/schema.sql.
// The server side (push / pull / share / invite / join / leave / stop) and the merge rules live in app/data/trips.ts
// and app/data/merge.ts. Here: the screen side. TRIPS is the same object as JD.trips.state (base, members, marks)
// plus what the friends panel shows (invite, msg, busy, stopArm).
var TRIPS=Object.assign(JD.trips.state,{invite:null,msg:'',busy:false,stopArm:false});
const saveTripBase=()=>JD.trips.saveBase();
const myName=()=>LS.get('jepi.myName','')||String((SYNC.sess&&SYNC.sess.email)||SYNC.email||'나').split('@')[0];
const planOf=id=>plans.find(p=>p.id===id);
const curShared=()=>{const p=planOf(curPlan);return p&&p.shared?p:null};
const JS=x=>x===undefined?'∅':JSON.stringify(x);
// a new version of the open plan: put it in, unless the person is typing or has a sheet open (then the next pull tries again)
function applyIfOpen(id,data,who){
  if(id!==curPlan) return true;
  const ae=document.activeElement, editing=(ae&&/^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName))||!$('#sheetBg').hidden||!$('#onb').hidden||selected;
  if(editing) return false;
  const d0=day; applyPlanData(data); day=Math.min(d0,Math.max(0,DAYS.length-1)); renderAll();
  if(who&&who!==myName()) showToast(`${who}님이 일정을 바꿨어요`);
  return true;
}
JD.trips.connectTrips({plans:()=>plans,curPlan:()=>curPlan,savePlans:()=>savePlans(),applyIfOpen,myName,snapshotCurrent:()=>snapshotCurrent(),toast:m=>showToast(m),
  pulled(listChanged){if(listChanged){renderPlans();renderExt()} if(curShared()) renderAll(); if(tab==='friends') PANELS.friends.render()}});
const tripPush=id=>JD.trips.push(id), tripsPull=()=>JD.trips.pull(), tripShare=()=>JD.trips.share(), tripInvite=role=>JD.trips.invite(role,location.origin+location.pathname);
const tripLeave=uid=>JD.trips.leave(uid), tripStop=()=>JD.trips.stop();
SYNC_AFTER_PUSH.push(async()=>{for(const p of plans.filter(p=>p.shared)) await tripPush(p.id)});
SYNC_AFTER_PULL.push(tripsPull);
async function tripJoin(code){
  const id=await JD.trips.join(code); const p=planOf(id);
  if(p){curPlan=curPlan===id?'':curPlan;openPlan(id);showToast('여행에 참여했어요')}
  return id;
}
// join link: ?join=CODE
function joinFromUrl(){
  const code=new URLSearchParams(location.search).get('join'); if(!code) return false;
  history.replaceState(null,'',location.pathname); LS.set('jepi.joinCode',code);
  if(syncOn()){joinPending();return true}
  welcomeView='join';renderWelcome();$('#welcome').hidden=false;return true;
}
async function joinPending(){
  const code=LS.get('jepi.joinCode',''); if(!code||!syncOn()) return false;
  LS.del('jepi.joinCode');
  try{await tripJoin(code);return true}catch(e){showToast(/expired|invite/i.test(e.message)?'초대 링크가 만료됐어요. 새 링크를 받아 주세요.':'참여하지 못했어요: '+e.message);return false}
}
// ----- 가고 싶어요 (the marks live in app/data/trips.ts) -----
const wantsOf=pid=>JD.trips.wantsOf(pid), iWant=pid=>JD.trips.iWant(pid);
const toggleWant=pid=>curShared()?JD.trips.toggleWant(pid,renderTray):Promise.resolve();
// 가고 싶어요 chip, card tag, sheet row, block badge (drawn by React: app/screens/Extras.tsx)
function wantChip(pid){
  const m=wantsOf(pid), on=iWant(pid), who=m.map(x=>x.user_id===SYNC.sess.user?'나':x.name).join(', ');
  return {k:'want',pid:String(pid),on:!!on,n:m.length,who};
}
CARD_EXTRAS.push(p=>curShared()?[wantChip(p.id),...(p.by?[{k:'tag',cls:'tag usr',t:`${p.by===myName()?'내가':p.by+'님'} 추천`}]:[])]:null);
SHEET_EXTRAS.push(it=>curShared()&&it.kind==='place'?{k:'wantRow',want:wantChip(it.id),by:it.p.by||''}:null);
BLOCK_BADGES.push(it=>{if(!curShared()||it.kind!=='place')return null;const n=wantsOf(it.id).length;return n?{k:'badge',t:`👍${n}`,title:`가고 싶어요 ${n}`}:null});
// 👍 가고 싶어요 on a shared trip's place (Extras.tsx)
async function wantAct(pid){try{await toggleWant(pid)}catch(err){showToast('저장하지 못했어요: '+err.message)}
  if(!$('#sheetBg').hidden&&$('#sheet').dataset.uid)openSheet($('#sheet').dataset.uid)}
// 친구와 함께 panel (FriendsPanel.tsx tells: what was pressed, and whose 내보내기 / the typed name)
async function tripAct(a,uid,typed){
  if(TRIPS.busy) return; if(a!=='stop') TRIPS.stopArm=false; TRIPS.busy=true; TRIPS.msg=''; PANELS.friends.render();
  try{
    if(a==='share'){await tripShare();TRIPS.invite={role:'edit',url:await tripInvite('edit')}}
    if(a==='invite-edit'||a==='invite-view'){const role=a.slice(7);TRIPS.invite={role,url:await tripInvite(role)}}
    if(a==='send'&&TRIPS.invite){const txt=`${planOf(curPlan).name} 여행을 같이 짜요 · JEPI`;
      if(navigator.share){try{await navigator.share({title:'JEPI 여행 초대',text:txt,url:TRIPS.invite.url})}catch(_){}}
      else{try{await navigator.clipboard.writeText(TRIPS.invite.url);TRIPS.msg='초대 링크를 복사했어요'}catch(_){TRIPS.msg='아래 링크를 길게 눌러 복사해 주세요'}}}
    if(a==='copy'&&TRIPS.invite){try{await navigator.clipboard.writeText(TRIPS.invite.url);TRIPS.msg='초대 링크를 복사했어요'}catch(_){TRIPS.msg='링크를 길게 눌러 복사해 주세요'}}
    if(a==='leave') await tripLeave();
    if(a==='kick') await tripLeave(uid);
    if(a==='stop'){if(!TRIPS.stopArm){TRIPS.stopArm=true;TRIPS.busy=false;PANELS.friends.render();return}TRIPS.stopArm=false;await tripStop()}
    if(a==='name'){const v=String(typed||'').trim().slice(0,20);LS.set('jepi.myName',v);
      if(curShared())await sbTable('jepi_trip_members','PATCH',`?trip_id=eq.${encodeURIComponent(curPlan)}&user_id=eq.${SYNC.sess.user}`,{name:myName()},'return=minimal');TRIPS.msg='이름을 바꿨어요';await tripsPull()}
  }catch(err){TRIPS.msg='✕ '+err.message}
  TRIPS.busy=false; PANELS.friends.render(); renderMore();
}
// ----- panel -----
// The panel itself is drawn by React: app/screens/FriendsPanel.tsx
PANELS.friends={render(opts){
  const box=$('#friendsBox'); if(!box) return; const p=curShared();
  if(opts&&opts.opened) TRIPS.stopArm=false; // opening the panel again forgets a first press of 공유 끝내기
  const mode=DEMO.on?'demo':!syncOn()?'login':!p?'intro':'shared';
  window.JEPI_UI.mount('friends',box,{mode,planName:(planOf(curPlan)||{}).name||'이 여행',busy:!!TRIPS.busy,msg:TRIPS.msg||'',myName:myName(),
    members:mode==='shared'?(TRIPS.members[curPlan]||[]):[],me:syncOn()?SYNC.sess.user:'',role:p?p.role||'':'',invite:TRIPS.invite||null,stopArm:!!TRIPS.stopArm});
}};

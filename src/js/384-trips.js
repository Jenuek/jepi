// ---------- 친구와 함께: shared trips, invite links, 가고 싶어요 ----------
// A shared trip keeps its plan in jepi_trips (one row, `rev` goes up by one on every save).
// Each device remembers the last server version it saw (`base`). When two people change the
// same trip, the three versions are merged per block / per place / per field, so a change to
// day 1 and a change to day 2 both survive; only the very same block edited twice keeps the later one.
// Server tables + rules: see supabase/schema.sql.
var TRIPS={base:LS.get('jepi.tripBase',{}),members:{},marks:{},invite:null,msg:'',busy:false,stopArm:false};
const saveTripBase=()=>LS.set('jepi.tripBase',TRIPS.base);
const myName=()=>LS.get('jepi.myName','')||String((SYNC.sess&&SYNC.sess.email)||SYNC.email||'나').split('@')[0];
const planOf=id=>plans.find(p=>p.id===id);
const curShared=()=>{const p=planOf(curPlan);return p&&p.shared?p:null};
const JS=x=>x===undefined?'∅':JSON.stringify(x);
// ----- merge -----
function merge3(base,mine,theirs){
  base=base||{};mine=mine||{};theirs=theirs||{};const out={};
  new Set([...Object.keys(base),...Object.keys(mine),...Object.keys(theirs)]).forEach(k=>{
    const b=JS(base[k]),m=JS(mine[k]),t=JS(theirs[k]);
    const v=m===b?theirs[k]:mine[k]; // I didn't touch it → take theirs; otherwise my change is the newest here
    if(v!==undefined) out[k]=v});
  return out;
}
function blockMap(a){const n={};return Object.fromEntries((a||[]).map(b=>{const k=b.id+'@'+b.day;n[k]=(n[k]||0)+1;return [k+'#'+n[k],b]}))}
const idMap=a=>Object.fromEntries((a||[]).map(x=>[x.id,x]));
function mergePlan(base,mine,theirs){
  base=base||{};
  const pk=x=>x&&typeof x==='object'?x:{};
  const pack=Object.assign({},pk(theirs.pack),{places:Object.values(merge3(idMap(pk(base.pack).places),idMap(pk(mine.pack).places),idMap(pk(theirs.pack).places)))});
  return Object.assign({},theirs,{
    profile:merge3(base.profile,mine.profile,theirs.profile),pack,
    placed:Object.values(merge3(blockMap(base.placed),blockMap(mine.placed),blockMap(theirs.placed))),
    custom:Object.values(merge3(idMap(base.custom),idMap(mine.custom),idMap(theirs.custom))),
    fmarks:merge3(base.fmarks,mine.fmarks,theirs.fmarks),meals:merge3(base.meals,mine.meals,theirs.meals),done:merge3(base.done,mine.done,theirs.done),
    wish:mine.wish||[]});
}
// places I add to a shared trip carry my name ("민지 추천")
function stampMine(id,data){
  const known=new Set((((TRIPS.base[id]||{}).data||{}).pack||{}).places?.map(p=>p.id)||[]);
  ((data.pack||{}).places||[]).forEach(p=>{if(!p.by&&!known.has(p.id))p.by=myName()});
  (data.custom||[]).forEach(c=>{if(!c.by)c.by=myName()});
}
// ----- server -----
function applyIfOpen(id,data,who){
  if(id!==curPlan) return true;
  const ae=document.activeElement, editing=(ae&&/^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName))||!$('#sheetBg').hidden||!$('#onb').hidden||selected;
  if(editing) return false; // try again on the next pull, so nothing I type gets lost
  const d0=day; applyPlanData(data); day=Math.min(d0,Math.max(0,DAYS.length-1)); renderAll();
  if(who&&who!==myName()) showToast(`${who}님이 일정을 바꿨어요`);
  return true;
}
async function tripPush(id){
  const p=planOf(id); if(!p||!p.shared||p.role==='view') return;
  const mine=store.get('gp.plan.'+id,null), b=TRIPS.base[id]; if(!mine||(b&&JS(b.data)===JS(mine))) return;
  stampMine(id,mine);
  for(let i=0;i<3;i++){
    const srv=(await sbTable('jepi_trips','GET',`?id=eq.${encodeURIComponent(id)}&select=rev,data`))[0];
    if(!srv){p.shared=false;p.role='';savePlans();showToast('공유가 끝난 여행이라 내 계획으로 남겼어요');return}
    const next=b&&srv.rev!==b.rev?mergePlan(b.data,mine,srv.data):mine;
    const res=await sbTable('jepi_trips','PATCH',`?id=eq.${encodeURIComponent(id)}&rev=eq.${srv.rev}`,{data:next,rev:srv.rev+1,updated:Date.now(),last_by:myName(),name:p.name},'return=representation');
    if(res&&res.length){TRIPS.base[id]={rev:srv.rev+1,data:next};saveTripBase();
      if(JS(next)!==JS(mine)){store.set('gp.plan.'+id,next);applyIfOpen(id,next)}return}
  }
}
async function tripsPull(){
  const me=SYNC.sess.user;
  const mem=await sbTable('jepi_trip_members','GET','?select=trip_id,user_id,role,name')||[];
  TRIPS.members={}; mem.forEach(m=>(TRIPS.members[m.trip_id]=TRIPS.members[m.trip_id]||[]).push(m));
  const mine=mem.filter(m=>m.user_id===me), ids=mine.map(m=>m.trip_id);
  let listChanged=false;
  plans.filter(p=>p.shared&&!ids.includes(p.id)).forEach(p=>{p.shared=false;p.role='';listChanged=true;delete TRIPS.base[p.id]});
  if(ids.length){
    const rows=await sbTable('jepi_trips','GET',`?id=in.(${ids.map(encodeURIComponent).join(',')})&select=id,name,rev,data,updated,last_by,owner`)||[];
    for(const r of rows){
      const role=(mine.find(m=>m.trip_id===r.id)||{}).role||'view', b=TRIPS.base[r.id]; let p=planOf(r.id);
      if(!p){p={id:r.id,name:r.name||'함께하는 여행',custom_name:true};plans.push(p);listChanged=true}
      if(!p.shared||p.role!==role){p.shared=true;p.role=role;listChanged=true}
      if(b&&b.rev===r.rev) continue;
      const local=store.get('gp.plan.'+r.id,null);
      const next=!local||!b||role==='view'||JS(local)===JS(b.data)?r.data:mergePlan(b.data,local,r.data);
      if(!applyIfOpen(r.id,next,r.last_by)) continue;
      store.set('gp.plan.'+r.id,next); Object.assign(p,{updated:+r.updated||Date.now()}); TRIPS.base[r.id]={rev:r.rev,data:r.data}; listChanged=true;
      if(JS(next)!==JS(r.data)) setTimeout(()=>tripPush(r.id).catch(()=>{}),300);
    }
    const mk=await sbTable('jepi_trip_marks','GET',`?trip_id=in.(${ids.map(encodeURIComponent).join(',')})&select=trip_id,place_id,user_id,name`)||[];
    TRIPS.marks={}; mk.forEach(m=>{const t=TRIPS.marks[m.trip_id]=TRIPS.marks[m.trip_id]||{};(t[m.place_id]=t[m.place_id]||[]).push(m)});
  }
  saveTripBase();
  if(listChanged){store.set('gp.plans',plans);renderPlans();renderExt()}
  if(curShared()) renderAll();
  if(tab==='friends') PANELS.friends.render();
}
SYNC_AFTER_PUSH.push(async()=>{for(const p of plans.filter(p=>p.shared)) await tripPush(p.id)});
SYNC_AFTER_PULL.push(tripsPull);
async function tripShare(){
  snapshotCurrent(); const p=planOf(curPlan), data=store.get('gp.plan.'+curPlan,null); if(!p||!data) return;
  stampMine(curPlan,data);
  await sbTable('jepi_trips','POST','',{id:curPlan,owner:SYNC.sess.user,name:p.name,data,rev:1,updated:Date.now(),last_by:myName()},'return=minimal');
  await sbTable('jepi_trip_members','POST','',{trip_id:curPlan,user_id:SYNC.sess.user,role:'owner',name:myName()},'return=minimal');
  p.shared=true;p.role='owner';TRIPS.base[curPlan]={rev:1,data};saveTripBase();savePlans();
  TRIPS.members[curPlan]=[{trip_id:curPlan,user_id:SYNC.sess.user,role:'owner',name:myName()}];
}
async function tripInvite(role){
  const ab='abcdefghjkmnpqrstuvwxyz23456789', code=Array.from(crypto.getRandomValues(new Uint8Array(12)),x=>ab[x%ab.length]).join('');
  await sbTable('jepi_trip_invites','POST','',{code,trip_id:curPlan,role,created_by:SYNC.sess.user},'return=minimal');
  return location.origin+location.pathname+'?join='+code;
}
async function tripJoin(code){
  const id=await sbTable('rpc/jepi_join','POST','',{p_code:code,p_name:myName()});
  await tripsPull(); const p=planOf(id);
  if(p){curPlan=curPlan===id?'':curPlan;openPlan(id);showToast('여행에 참여했어요')}
  return id;
}
async function tripLeave(uid){
  const id=curPlan, p=planOf(id);
  await sbTable('jepi_trip_members','DELETE',`?trip_id=eq.${encodeURIComponent(id)}&user_id=eq.${uid||SYNC.sess.user}`,null,'return=minimal');
  if(!uid||uid===SYNC.sess.user){p.shared=false;p.role='';delete TRIPS.base[id];saveTripBase();savePlans();showToast('여행에서 나왔어요 · 계획은 내 것으로 남아요')}
  await tripsPull();
}
async function tripStop(){
  const id=curPlan,p=planOf(id);
  await sbTable('jepi_trips','DELETE',`?id=eq.${encodeURIComponent(id)}`,null,'return=minimal');
  p.shared=false;p.role='';delete TRIPS.base[id];saveTripBase();savePlans();showToast('공유를 끝냈어요 · 친구들 기기에는 마지막 내용이 남아요');
}
// join link: ?join=CODE
function joinFromUrl(){
  const code=new URLSearchParams(location.search).get('join'); if(!code) return false;
  history.replaceState(null,'',location.pathname); LS.set('jepi.joinCode',code);
  if(syncOn()){joinPending();return true}
  welcomeView='join';welcomeErr='';renderWelcome();$('#welcome').hidden=false;return true;
}
async function joinPending(){
  const code=LS.get('jepi.joinCode',''); if(!code||!syncOn()) return false;
  LS.del('jepi.joinCode');
  try{await tripJoin(code);return true}catch(e){showToast(/expired|invite/i.test(e.message)?'초대 링크가 만료됐어요. 새 링크를 받아 주세요.':'참여하지 못했어요: '+e.message);return false}
}
// ----- 가고 싶어요 -----
const wantsOf=pid=>((TRIPS.marks[curPlan]||{})[pid])||[];
const iWant=pid=>wantsOf(pid).some(m=>m.user_id===(SYNC.sess&&SYNC.sess.user));
async function toggleWant(pid){
  if(!curShared()) return; const me=SYNC.sess.user, t=TRIPS.marks[curPlan]=TRIPS.marks[curPlan]||{};
  if(iWant(pid)){t[pid]=wantsOf(pid).filter(m=>m.user_id!==me);renderTray();
    await sbTable('jepi_trip_marks','DELETE',`?trip_id=eq.${encodeURIComponent(curPlan)}&place_id=eq.${encodeURIComponent(pid)}&user_id=eq.${me}`,null,'return=minimal')}
  else{(t[pid]=t[pid]||[]).push({trip_id:curPlan,place_id:pid,user_id:me,name:myName()});renderTray();
    await sbTable('jepi_trip_marks','POST','',{trip_id:curPlan,place_id:pid,user_id:me,name:myName()},'return=minimal')}
}
function wantChip(pid){
  const m=wantsOf(pid), on=iWant(pid), who=m.map(x=>x.user_id===SYNC.sess.user?'나':x.name).join(', ');
  return `<button class="want" type="button" data-want="${esc(pid)}" aria-pressed="${on}" title="${esc(who||'가고 싶어요')}">👍 가고 싶어요${m.length?` ${m.length}`:''}</button>${m.length?`<span class="want-who">${esc(who)}</span>`:''}`;
}
CARD_EXTRAS.push(p=>curShared()?wantChip(p.id)+(p.by?`<span class="tag usr">${esc(p.by===myName()?'내가':p.by+'님')} 추천</span>`:''):'');
SHEET_EXTRAS.push(it=>curShared()&&it.kind==='place'?`<div class="row">${wantChip(it.id)}${it.p.by?`<span class="hint">${esc(it.p.by)} 추천</span>`:''}</div>`:'');
BLOCK_BADGES.push(it=>{if(!curShared()||it.kind!=='place')return '';const n=wantsOf(it.id).length;return n?`<span class="mks" title="가고 싶어요 ${n}">👍${n}</span> `:''});
document.addEventListener('click',async e=>{
  const w=e.target.closest('[data-want]'); if(w){e.preventDefault();e.stopPropagation();try{await toggleWant(w.dataset.want)}catch(err){showToast('저장하지 못했어요: '+err.message)}
    if(!$('#sheetBg').hidden&&$('#sheet').dataset.uid)openSheet($('#sheet').dataset.uid);return}
  const t=e.target.closest('[data-trip]'); if(!t) return; const a=t.dataset.trip;
  if(TRIPS.busy) return; if(a!=='stop') TRIPS.stopArm=false; TRIPS.busy=true; TRIPS.msg=''; PANELS.friends.render();
  try{
    if(a==='share'){await tripShare();TRIPS.invite={role:'edit',url:await tripInvite('edit')}}
    if(a==='invite-edit'||a==='invite-view'){const role=a.slice(7);TRIPS.invite={role,url:await tripInvite(role)}}
    if(a==='send'&&TRIPS.invite){const txt=`${planOf(curPlan).name} 여행을 같이 짜요 · JEPI`;
      if(navigator.share){try{await navigator.share({title:'JEPI 여행 초대',text:txt,url:TRIPS.invite.url})}catch(_){}}
      else{try{await navigator.clipboard.writeText(TRIPS.invite.url);TRIPS.msg='초대 링크를 복사했어요'}catch(_){TRIPS.msg='아래 링크를 길게 눌러 복사해 주세요'}}}
    if(a==='copy'&&TRIPS.invite){try{await navigator.clipboard.writeText(TRIPS.invite.url);TRIPS.msg='초대 링크를 복사했어요'}catch(_){TRIPS.msg='링크를 길게 눌러 복사해 주세요'}}
    if(a==='leave') await tripLeave();
    if(a==='kick') await tripLeave(t.dataset.uid);
    if(a==='stop'){if(!TRIPS.stopArm){TRIPS.stopArm=true;TRIPS.busy=false;PANELS.friends.render();return}TRIPS.stopArm=false;await tripStop()}
    if(a==='name'){const v=(($('#myNameIn')||{}).value||'').trim().slice(0,20);LS.set('jepi.myName',v);
      if(curShared())await sbTable('jepi_trip_members','PATCH',`?trip_id=eq.${encodeURIComponent(curPlan)}&user_id=eq.${SYNC.sess.user}`,{name:myName()},'return=minimal');TRIPS.msg='이름을 바꿨어요';await tripsPull()}
  }catch(err){TRIPS.msg='✕ '+err.message}
  TRIPS.busy=false; PANELS.friends.render(); renderMore();
});
// ----- panel -----
// The panel itself is drawn by React: app/screens/FriendsPanel.tsx
PANELS.friends={render(opts){
  const box=$('#friendsBox'); if(!box) return; const p=curShared();
  if(opts&&opts.opened) TRIPS.stopArm=false; // opening the panel again forgets a first press of 공유 끝내기
  const mode=DEMO.on?'demo':!syncOn()?'login':!p?'intro':'shared';
  window.JEPI_UI.mount('friends',box,{mode,planName:(planOf(curPlan)||{}).name||'이 여행',busy:!!TRIPS.busy,msg:TRIPS.msg||'',myName:myName(),
    members:mode==='shared'?(TRIPS.members[curPlan]||[]):[],me:syncOn()?SYNC.sess.user:'',role:p?p.role||'':'',invite:TRIPS.invite||null,stopArm:!!TRIPS.stopArm});
}};

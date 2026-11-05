// ---------- my plans: several saved plans, account sync, sharing ----------
// rdb/myId: the plan copies kept inside Claude (when JEPI ran as a Claude page); always empty in the app
let rdb=null, myId=null;
let plans=[], curPlan='', planTimer=null, cloudTimer=null, planMsg='', delArm='';
const PLAN_KEYS=['profile','pack','placed3','custom','meal2','done','fmarks','wish'];
function planName(){const pr=CUR.profile;if(pr.kind==='day')return `${PACK.city} 하루 코스`;const n=nightsOf(pr);return `${PACK.city} ${n}박 ${n+1}일`}
function planData(){return {profile:clone(CUR.profile),pack:PACK,placed:TRIP.slimBlocks(CUR.placed),custom:clone(CUR.custom),fmarks:clone(CUR.fmarks),wish:CUR.wish.slice(),meals:clone(CUR.meals),done:clone(CUR.done)}}
function planMeta(){const D0=DAYS[0]||{},Dn=DAYS[DAYS.length-1]||{};return {name:'',dates:D0.iso?`${D0.iso.slice(5).replace('-','/')}${DAYS.length>1?'~'+(Dn.iso||'').slice(5).replace('-','/'):''}`:'',blocks:CUR.placed.length,kind:CUR.profile.kind||'trip'}}
function savePlans(){TRIP.plans.saveList(plans,curPlan);syncSoon()}
function snapshotCurrent(){
  if(!curPlan) return; let p=plans.find(x=>x.id===curPlan);
  if(!p){p={id:curPlan,name:''};plans.unshift(p)}
  const m=planMeta(); Object.assign(p,{dates:m.dates,blocks:m.blocks,kind:m.kind,updated:Date.now()}); if(!p.custom_name) p.name=planName();
  TRIP.plans.put(curPlan,planData()); savePlans(); cloudSave(p);
}
function touchPlan(){clearTimeout(planTimer);planTimer=setTimeout(()=>{if($('#onb').hidden)snapshotCurrent()},1200)}
const cloudTimers={};
function cloudSave(p){if(!rdb||!myId||RS.status!=='on')return;clearTimeout(cloudTimers[p.id]);cloudTimers[p.id]=setTimeout(()=>{
  try{rdb.doc(`data/users/${myId}/plan_${p.id}`).set({meta:{id:p.id,name:p.name,custom_name:!!p.custom_name,dates:p.dates||'',blocks:p.blocks||0,kind:p.kind||'trip',updated:p.updated||Date.now()},data:TRIP.plans.get(p.id)}).catch(()=>{})}catch(_){}},3000)}
async function cloudPull(){
  if(!rdb||!myId) return;
  try{const snap=await rdb.collection(`data/users/${myId}`).get();let ch=false;
    snap.docs.forEach(d=>{if(!d.exists||!d.id.startsWith('plan_'))return;const v=d.data()||{},m=v.meta;if(!m||!m.id||!v.data)return;
      const loc=plans.find(x=>x.id===m.id);
      if(!loc||(m.updated||0)>(loc.updated||0)){if(m.id===curPlan&&loc)return;TRIP.plans.put(m.id,v.data);if(loc)Object.assign(loc,m);else plans.push(Object.assign({},m));ch=true}});
    if(ch){plans.sort((a,b)=>(b.updated||0)-(a.updated||0));savePlans();renderPlans()}
  }catch(_){}
}
function cloudDelete(id){if(!rdb||!myId)return;try{rdb.doc(`data/users/${myId}/plan_${id}`).delete().catch(()=>{})}catch(_){}}
function applyPlanData(d){
  d=d||{}; loadPack(packFrom(d.pack)||blankPack());
  CUR.custom=Array.isArray(d.custom)?d.custom:[]; CUR.custom.forEach(addCustomToData);
  CUR.profile=d.profile&&typeof d.profile==='object'?d.profile:clone(PROFILE_EXAMPLE); fixProfile(CUR.profile);
  CUR.placed=(Array.isArray(d.placed)?d.placed:[]).filter(b=>PM[b.id]).map(b=>({uid:TRIP.uids.next(),id:b.id,day:b.day,start:b.start,dur:b.dur||PM[b.id].dur,mk:Array.isArray(b.mk)?b.mk.filter(m=>MARKS[m]):undefined}));
  CUR.fmarks=d.fmarks&&typeof d.fmarks==='object'?d.fmarks:{}; CUR.wish=Array.isArray(d.wish)?d.wish:[]; CUR.meals=d.meals&&typeof d.meals==='object'?d.meals:{}; CUR.done=d.done&&typeof d.done==='object'?d.done:{};
  TRIP.save('profile',CUR.profile); savePack(); TRIP.save('custom',CUR.custom); TRIP.save('fmarks',CUR.fmarks); TRIP.save('wish',CUR.wish); TRIP.save('meals',CUR.meals); TRIP.save('done',CUR.done);
  chat=[]; undoSnap=null; aiState=null; selected=null; pSt.draw=null; hVibe=null; hotelRecs={}; routeInfo=null; destRecs=null; destAsked=[];
  buildDays(); day=0; save(); renderAll();
}
function openPlan(id){
  if(id===curPlan) return; snapshotCurrent();
  const d=TRIP.plans.get(id); if(!d){planMsg='이 계획을 불러오지 못했어요.';renderPlans();return}
  curPlan=id; savePlans(); applyPlanData(d); if(CUR.profile.kind==='day'&&jp!=='P') setJP('P'); tab='timeline'; renderTabs(); planMsg='';
}
function newPlan(){
  const prevP=CUR.profile; snapshotCurrent(); curPlan='p'+Date.now().toString(36); savePlans();
  CUR.custom=[];CUR.placed=[];CUR.fmarks={};CUR.wish=[];CUR.meals={};CUR.done={};
  loadPack(blankPack()); savePack();
  CUR.profile=clone(PROFILE_EXAMPLE); Object.assign(CUR.profile,{stays:[{name:'숙소',area:'center',checkin:'15:00',checkout:'11:00',from:0,to:3}],events:[],dest:'',pace:'normal',social:'some',breakfast:true,purpose:'',party:{type:'solo',adults:1,kids:0},flightSet:false,staySet:false,dateSet:false,nightsSet:false,dateUnknown:false,startDate:isoPlus(30)});
  carryTaste(prevP,CUR.profile); applyPlanData({profile:CUR.profile,pack:blankPack()}); tab='timeline'; renderTabs(); openOnb();
}
function dupPlan(id){snapshotCurrent();const d=TRIP.plans.get(id),src=plans.find(x=>x.id===id);if(!d||!src)return;
  const nid='p'+Date.now().toString(36);TRIP.plans.put(nid,d);const p=Object.assign({},src,{id:nid,name:src.name+' (복사본)',custom_name:true,updated:Date.now()});plans.unshift(p);savePlans();cloudSave(p);planMsg='복사본을 만들었어요.';renderPlans()}
function delPlan(id){if(delArm!==id){delArm=id;renderPlans();return}delArm='';
  plans=plans.filter(x=>x.id!==id);TRIP.plans.del(id);clearTimeout(cloudTimers[id]);cloudDelete(id);
  if(id===curPlan){if(plans[0]){curPlan='';openPlan(plans[0].id)}else{curPlan='';newPlan()}}savePlans();renderPlans()}
function renamePlan(id,name){const p=plans.find(x=>x.id===id);if(!p||!name)return;p.name=name.slice(0,40);p.custom_name=true;p.updated=Date.now();savePlans();cloudSave(p);renderPlans();renderPlanBtn()}
// sharing
const CODE_AB='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
async function shareCode(){
  if(STANDALONE) return shareLink();
  if(!rdb||RS.status!=='on'){planMsg='공유 코드는 Claude 안에서, 이 페이지를 편집할 수 있는 권한이 있을 때 만들 수 있어요.';renderPlans();return}
  snapshotCurrent(); const code='JP-'+Array.from({length:5},()=>CODE_AB[Math.floor(Math.random()*CODE_AB.length)]).join('');
  try{await rdb.doc('shares/'+code).set({name:(plans.find(x=>x.id===curPlan)||{}).name||planName(),by:myId,at:Date.now(),data:planData()});
    lastCode=code; planMsg=''; renderPlans();
  }catch(e){planMsg=e&&e.code==='quota_exceeded'?'공유 저장 공간이 가득 찼어요.':'공유 코드를 만들지 못했어요. 잠시 뒤 다시 시도해 주세요.';renderPlans()}
}
let lastCode='';
async function openCode(raw){
  if(STANDALONE){const m=/[#&]s=([A-Za-z0-9_-]+)/.exec(String(raw||''));if(m){location.hash='s='+m[1];openShared();return}planMsg='친구에게 받은 공유 링크를 통째로 붙여 넣어 주세요.';renderPlans();return}
  const code=String(raw||'').trim().toUpperCase().replace(/^JP-?/,'JP-');
  if(!/^JP-[A-Z0-9]{5}$/.test(code)){planMsg='코드는 JP-로 시작하는 8자리예요. 예: JP-7K2QX';renderPlans();return}
  if(!rdb){planMsg='공유받은 계획은 Claude 안에서 열 수 있어요.';renderPlans();return}
  try{const d=await rdb.doc('shares/'+code).get();if(!d.exists){planMsg='이 코드의 계획을 찾지 못했어요.';renderPlans();return}
    const v=d.data()||{}; snapshotCurrent(); const nid='p'+Date.now().toString(36);
    TRIP.plans.put(nid,v.data||{}); plans.unshift({id:nid,name:String(v.name||'공유받은 계획').slice(0,30)+' (공유받음)',custom_name:true,updated:Date.now()}); savePlans();
    curPlan=nid; savePlans(); applyPlanData(v.data||{}); snapshotCurrent(); tab='timeline'; renderTabs(); planMsg='';
  }catch(e){planMsg='계획을 열지 못했어요. 잠시 뒤 다시 시도해 주세요.';renderPlans()}
}
function planText(){
  const L=[`[JEPI] ${(plans.find(x=>x.id===curPlan)||{}).name||planName()}`];
  if(CUR.profile.purpose) L.push(`🧭 ${CUR.profile.purpose}`);
  DAYS.forEach((D,d)=>{L.push('',`📅 ${D.title.replace(/^Day \d+ · /,'')||''} ${D.date} (${WD[D.wd]})`.replace('  ',' '));
    analyze(d).items.filter(i=>!i.stay).forEach(i=>L.push(`${fmt(i.start)} ${i.name}${i.kind==='place'&&i.area?` · ${i.area}`:''}`))});
  L.push('','JEPI로 만든 일정이에요.'); return L.join('\n');
}
const inClaude=()=>!!(window.claude&&window.claude.use);
async function downloadText(name,text){
  if(!inClaude()){try{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:name.endsWith('.json')?'application/json':'text/plain'}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000)}catch(_){planMsg='파일을 받지 못했어요.';renderPlans()}return}
  try{const dl=await window.claude.use('downloads');if(!dl){planMsg='이 화면에서는 파일로 받을 수 없어요. 글을 복사해 주세요.';renderPlans();return}await dl.save({filename:name,data:text})}catch(e){if(!(e&&e.code==='declined')){planMsg='파일을 받지 못했어요.';renderPlans()}}}
// restore a backup file (.json made by "백업 파일 받기")
function importBackup(file,after){
  if(!file) return; const rd=new FileReader();
  rd.onload=()=>{try{const v=JSON.parse(String(rd.result||''));if(v&&v.jepi===2){onbFrame({open:false});if(!importAll(v))throw 0;tab='timeline';renderTabs();if(after)after(true);return}if(!v||!v.data||!v.data.profile)throw 0;
      snapshotCurrent(); const nid='p'+Date.now().toString(36); TRIP.plans.put(nid,v.data);
      plans.unshift({id:nid,name:String(v.name||'불러온 계획').slice(0,40),custom_name:true,updated:Date.now()}); curPlan=nid; savePlans();
      onbFrame({open:false}); applyPlanData(v.data); snapshotCurrent(); tab='timeline'; renderTabs(); planMsg='백업을 불러왔어요.'; if(after) after(true);
    }catch(_){planMsg='JEPI 백업 파일이 아니거나 손상됐어요.';renderPlans();setSt('st_import','JEPI 백업 파일이 아니거나 손상됐어요.');if(after)after(false)}};
  rd.readAsText(file);
}
async function copyText(text){try{await navigator.clipboard.writeText(text);planMsg='복사했어요. 카톡에 붙여 넣으면 돼요.'}catch(_){planMsg='자동 복사가 막혀 있어요. 아래 글을 길게 눌러 복사해 주세요.'}renderPlans()}
let showText=false;
// The screen itself is drawn by React: app/screens/PlansScreen.tsx
let planRenaming=''; // the plan whose name box is open
// What was pressed in 내 계획 (PlansScreen.tsx tells: its name and value — a plan id, a typed name or code)
function plansAct(n,v,v2){
  switch(n){
  case 'new': newPlan();return;
  case 'open': openPlan(v);return;
  case 'dup': dupPlan(v);return;
  case 'del': delPlan(v);return;
  case 'rename': if(plans.some(x=>x.id===v)){planRenaming=v;renderPlans()}return;   // its name box opens (with the cursor in it)
  case 'name': planRenaming='';renamePlan(v,String(v2||'').trim());renderPlans();return;
  case 'share': shareCode();return;
  case 'text': showText=!showText;renderPlans();if(showText)copyText(planText());return;
  case 'txt': downloadText(`${planName()}.txt`,planText());return;
  case 'json': snapshotCurrent();downloadText(`JEPI-${planName()}.json`,JSON.stringify({jepi:1,name:planName(),data:planData()}));return;
  case 'code': openCode(v);return;
  }
}
function renderPlans(){
  const box=$('#plansBox'); if(!box) return;
  window.JEPI_UI.mount('plans',box,{plans:plans.map(p=>({id:p.id,name:p.name,kind:p.kind,dates:p.dates,blocks:p.blocks,updated:p.updated})),
    curPlan,delArm,planMsg,renaming:planRenaming,standalone:!!STANDALONE,lastLink:lastLink||'',lastCode:lastCode||'',shareText:showText?planText():null,
    savedInAccount:!!(rdb&&RS.status==='on')});
}


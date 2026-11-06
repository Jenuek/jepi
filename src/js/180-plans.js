// ---------- my plans: several saved plans, account sync, sharing ----------
const PLANS=JD.plans;   // a plan's name, contents and text: app/data/plans.ts
PL.plans=[]; PL.curPlan=''; let planTimer=null, planMsg='', delArm='';
const PLAN_KEYS=['profile','pack','placed3','custom','meal2','done','fmarks','wish'];
const planName=PLANS.planName, planData=PLANS.planData, planMeta=PLANS.planMeta;   // app/data/plans.ts
function savePlans(){TRIP.plans.saveList(PL.plans,PL.curPlan);syncSoon()}
function snapshotCurrent(){
  if(!PL.curPlan) return; let p=PL.plans.find(x=>x.id===PL.curPlan);
  if(!p){p={id:PL.curPlan,name:''};PL.plans.unshift(p)}
  const m=planMeta(); Object.assign(p,{dates:m.dates,blocks:m.blocks,kind:m.kind,updated:Date.now()}); if(!p.custom_name) p.name=planName();
  TRIP.plans.put(PL.curPlan,planData()); savePlans();
}
function touchPlan(){clearTimeout(planTimer);planTimer=setTimeout(()=>{if($('#onb').hidden)snapshotCurrent()},1200)}
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
  if(id===PL.curPlan) return; snapshotCurrent();
  const d=TRIP.plans.get(id); if(!d){planMsg='이 계획을 불러오지 못했어요.';renderPlans();return}
  PL.curPlan=id; savePlans(); applyPlanData(d); if(CUR.profile.kind==='day'&&jp!=='P') setJP('P'); tab='timeline'; renderTabs(); planMsg='';
}
function newPlan(){
  const prevP=CUR.profile; snapshotCurrent(); PL.curPlan='p'+Date.now().toString(36); savePlans();
  CUR.custom=[];CUR.placed=[];CUR.fmarks={};CUR.wish=[];CUR.meals={};CUR.done={};
  loadPack(blankPack()); savePack();
  CUR.profile=clone(PROFILE_EXAMPLE); Object.assign(CUR.profile,{stays:[{name:'숙소',area:'center',checkin:'15:00',checkout:'11:00',from:0,to:3}],events:[],dest:'',pace:'normal',social:'some',breakfast:true,purpose:'',party:{type:'solo',adults:1,kids:0},flightSet:false,staySet:false,dateSet:false,nightsSet:false,dateUnknown:false,startDate:isoPlus(30)});
  carryTaste(prevP,CUR.profile); applyPlanData({profile:CUR.profile,pack:blankPack()}); tab='timeline'; renderTabs(); openOnb();
}
function dupPlan(id){snapshotCurrent();const d=TRIP.plans.get(id),src=PL.plans.find(x=>x.id===id);if(!d||!src)return;
  const nid='p'+Date.now().toString(36);TRIP.plans.put(nid,d);const p=Object.assign({},src,{id:nid,name:src.name+' (복사본)',custom_name:true,updated:Date.now()});PL.plans.unshift(p);savePlans();planMsg='복사본을 만들었어요.';renderPlans()}
function delPlan(id){if(delArm!==id){delArm=id;renderPlans();return}delArm='';
  PL.plans=PL.plans.filter(x=>x.id!==id);TRIP.plans.del(id);
  if(id===PL.curPlan){if(PL.plans[0]){PL.curPlan='';openPlan(PL.plans[0].id)}else{PL.curPlan='';newPlan()}}savePlans();renderPlans()}
function renamePlan(id,name){const p=PL.plans.find(x=>x.id===id);if(!p||!name)return;p.name=name.slice(0,40);p.custom_name=true;p.updated=Date.now();savePlans();renderPlans();renderPlanBtn()}
// sharing
const shareCode=()=>shareLink();   // a share link (240-share-link.js)
const lastCode='';
function openCode(raw){
  const m=/[#&]s=([A-Za-z0-9_-]+)/.exec(String(raw||''));if(m){location.hash='s='+m[1];openShared();return}
  planMsg='친구에게 받은 공유 링크를 통째로 붙여 넣어 주세요.';renderPlans();
}
const planText=PLANS.planText;   // 카톡용 글: app/data/plans.ts
const inClaude=()=>!!(window.claude&&window.claude.use);
function downloadText(name,text){
  try{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:name.endsWith('.json')?'application/json':'text/plain'}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000)}catch(_){planMsg='파일을 받지 못했어요.';renderPlans()}
}
// restore a backup file (.json made by "백업 파일 받기")
function importBackup(file,after){
  if(!file) return; const rd=new FileReader();
  rd.onload=()=>{try{const v=JSON.parse(String(rd.result||''));if(v&&v.jepi===2){onbFrame({open:false});if(!importAll(v))throw 0;tab='timeline';renderTabs();if(after)after(true);return}if(!v||!v.data||!v.data.profile)throw 0;
      snapshotCurrent(); const nid='p'+Date.now().toString(36); TRIP.plans.put(nid,v.data);
      PL.plans.unshift({id:nid,name:String(v.name||'불러온 계획').slice(0,40),custom_name:true,updated:Date.now()}); PL.curPlan=nid; savePlans();
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
  case 'rename': if(PL.plans.some(x=>x.id===v)){planRenaming=v;renderPlans()}return;   // its name box opens (with the cursor in it)
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
  window.JEPI_UI.mount('plans',box,{plans:PL.plans.map(p=>({id:p.id,name:p.name,kind:p.kind,dates:p.dates,blocks:p.blocks,updated:p.updated})),
    curPlan:PL.curPlan,delArm,planMsg,renaming:planRenaming,standalone:!!STANDALONE,lastLink:lastLink||'',lastCode:lastCode||'',shareText:showText?planText():null,
    savedInAccount:false});
}


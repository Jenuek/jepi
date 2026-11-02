// ---------- my plans: several saved plans, account sync, sharing ----------
let plans=[], curPlan='', planTimer=null, cloudTimer=null, planMsg='', delArm='';
const PLAN_KEYS=['profile','pack','placed3','custom','meal2','done','fmarks','wish'];
function planName(){const pr=profile;if(pr.kind==='day')return `${PACK.city} 하루 코스`;const n=nightsOf(pr);return `${PACK.city} ${n}박 ${n+1}일`}
function planData(){return {profile:clone(profile),pack:PACK,placed:placed.map(({id,day,start,dur,mk})=>mk&&mk.length?{id,day,start,dur,mk}:{id,day,start,dur}),custom:clone(custom),fmarks:clone(fmarks),wish:wish.slice(),meals:clone(meals),done:clone(done)}}
function planMeta(){const D0=DAYS[0]||{},Dn=DAYS[DAYS.length-1]||{};return {name:'',dates:D0.iso?`${D0.iso.slice(5).replace('-','/')}${DAYS.length>1?'~'+(Dn.iso||'').slice(5).replace('-','/'):''}`:'',blocks:placed.length,kind:profile.kind||'trip'}}
function savePlans(){store.set('gp.plans',plans);store.set('gp.cur',curPlan);syncSoon()}
function snapshotCurrent(){
  if(!curPlan) return; let p=plans.find(x=>x.id===curPlan);
  if(!p){p={id:curPlan,name:''};plans.unshift(p)}
  const m=planMeta(); Object.assign(p,{dates:m.dates,blocks:m.blocks,kind:m.kind,updated:Date.now()}); if(!p.custom_name) p.name=planName();
  store.set('gp.plan.'+curPlan,planData()); savePlans(); cloudSave(p);
}
function touchPlan(){clearTimeout(planTimer);planTimer=setTimeout(()=>{if($('#onb').hidden)snapshotCurrent()},1200)}
const cloudTimers={};
function cloudSave(p){if(!rdb||!myId||recState!=='on')return;clearTimeout(cloudTimers[p.id]);cloudTimers[p.id]=setTimeout(()=>{
  try{rdb.doc(`data/users/${myId}/plan_${p.id}`).set({meta:{id:p.id,name:p.name,custom_name:!!p.custom_name,dates:p.dates||'',blocks:p.blocks||0,kind:p.kind||'trip',updated:p.updated||Date.now()},data:store.get('gp.plan.'+p.id,null)}).catch(()=>{})}catch(_){}},3000)}
async function cloudPull(){
  if(!rdb||!myId) return;
  try{const snap=await rdb.collection(`data/users/${myId}`).get();let ch=false;
    snap.docs.forEach(d=>{if(!d.exists||!d.id.startsWith('plan_'))return;const v=d.data()||{},m=v.meta;if(!m||!m.id||!v.data)return;
      const loc=plans.find(x=>x.id===m.id);
      if(!loc||(m.updated||0)>(loc.updated||0)){if(m.id===curPlan&&loc)return;store.set('gp.plan.'+m.id,v.data);if(loc)Object.assign(loc,m);else plans.push(Object.assign({},m));ch=true}});
    if(ch){plans.sort((a,b)=>(b.updated||0)-(a.updated||0));savePlans();renderPlans()}
  }catch(_){}
}
function cloudDelete(id){if(!rdb||!myId)return;try{rdb.doc(`data/users/${myId}/plan_${id}`).delete().catch(()=>{})}catch(_){}}
function applyPlanData(d){
  d=d||{}; loadPack(packFrom(d.pack)||blankPack());
  custom=Array.isArray(d.custom)?d.custom:[]; custom.forEach(addCustomToData);
  profile=d.profile&&typeof d.profile==='object'?d.profile:clone(PROFILE_EXAMPLE); fixProfile(profile);
  placed=(Array.isArray(d.placed)?d.placed:[]).filter(b=>PM[b.id]).map(b=>({uid:'u'+(uidN++),id:b.id,day:b.day,start:b.start,dur:b.dur||PM[b.id].dur,mk:Array.isArray(b.mk)?b.mk.filter(m=>MARKS[m]):undefined}));
  fmarks=d.fmarks&&typeof d.fmarks==='object'?d.fmarks:{}; wish=Array.isArray(d.wish)?d.wish:[]; meals=d.meals&&typeof d.meals==='object'?d.meals:{}; done=d.done&&typeof d.done==='object'?d.done:{};
  store.set('gp.profile',profile); savePack(); store.set('gp.custom',custom); store.set('gp.fmarks',fmarks); store.set('gp.wish',wish); store.set('gp.meal2',meals); store.set('gp.done',done);
  chat=[]; undoSnap=null; aiState=null; selected=null; pRoll={}; hVibe=null; hotelRecs={}; routeInfo=null; destRecs=null; destAsked=[];
  buildDays(); day=0; save(); renderAll();
}
function openPlan(id){
  if(id===curPlan) return; snapshotCurrent();
  const d=store.get('gp.plan.'+id,null); if(!d){planMsg='이 계획을 불러오지 못했어요.';renderPlans();return}
  curPlan=id; savePlans(); applyPlanData(d); if(profile.kind==='day'&&jp!=='P') setJP('P'); tab='timeline'; renderTabs(); planMsg='';
}
function newPlan(){
  const prevP=profile; snapshotCurrent(); curPlan='p'+Date.now().toString(36); savePlans();
  custom=[];placed=[];fmarks={};wish=[];meals={};done={};
  loadPack(blankPack()); savePack();
  profile=clone(PROFILE_EXAMPLE); Object.assign(profile,{stays:[{name:'숙소',area:'center',checkin:'15:00',checkout:'11:00',from:0,to:3}],events:[],dest:'',pace:'normal',social:'some',breakfast:true,purpose:'',party:{type:'solo',adults:1,kids:0},flightSet:false,staySet:false,dateSet:false,nightsSet:false,dateUnknown:false,startDate:isoPlus(30)});
  carryTaste(prevP,profile); applyPlanData({profile,pack:blankPack()}); tab='timeline'; renderTabs(); openOnb();
}
function dupPlan(id){snapshotCurrent();const d=store.get('gp.plan.'+id,null),src=plans.find(x=>x.id===id);if(!d||!src)return;
  const nid='p'+Date.now().toString(36);store.set('gp.plan.'+nid,d);const p=Object.assign({},src,{id:nid,name:src.name+' (복사본)',custom_name:true,updated:Date.now()});plans.unshift(p);savePlans();cloudSave(p);planMsg='복사본을 만들었어요.';renderPlans()}
function delPlan(id){if(delArm!==id){delArm=id;renderPlans();return}delArm='';
  plans=plans.filter(x=>x.id!==id);try{localStorage.removeItem('gp.plan.'+id)}catch(_){}clearTimeout(cloudTimers[id]);cloudDelete(id);
  if(id===curPlan){if(plans[0]){curPlan='';openPlan(plans[0].id)}else{curPlan='';newPlan()}}savePlans();renderPlans()}
function renamePlan(id,name){const p=plans.find(x=>x.id===id);if(!p||!name)return;p.name=name.slice(0,40);p.custom_name=true;p.updated=Date.now();savePlans();cloudSave(p);renderPlans()}
// sharing
const CODE_AB='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
async function shareCode(){
  if(STANDALONE) return shareLink();
  if(!rdb||recState!=='on'){planMsg='공유 코드는 Claude 안에서, 이 페이지를 편집할 수 있는 권한이 있을 때 만들 수 있어요.';renderPlans();return}
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
    store.set('gp.plan.'+nid,v.data||{}); plans.unshift({id:nid,name:String(v.name||'공유받은 계획').slice(0,30)+' (공유받음)',custom_name:true,updated:Date.now()}); savePlans();
    curPlan=nid; savePlans(); applyPlanData(v.data||{}); snapshotCurrent(); tab='timeline'; renderTabs(); planMsg='';
  }catch(e){planMsg='계획을 열지 못했어요. 잠시 뒤 다시 시도해 주세요.';renderPlans()}
}
function planText(){
  const L=[`[JEPI] ${(plans.find(x=>x.id===curPlan)||{}).name||planName()}`];
  if(profile.purpose) L.push(`🧭 ${profile.purpose}`);
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
  rd.onload=()=>{try{const v=JSON.parse(String(rd.result||''));if(v&&v.jepi===2){$('#onb').hidden=true;if(!importAll(v))throw 0;tab='timeline';renderTabs();if(after)after(true);return}if(!v||!v.data||!v.data.profile)throw 0;
      snapshotCurrent(); const nid='p'+Date.now().toString(36); store.set('gp.plan.'+nid,v.data);
      plans.unshift({id:nid,name:String(v.name||'불러온 계획').slice(0,40),custom_name:true,updated:Date.now()}); curPlan=nid; savePlans();
      $('#onb').hidden=true; applyPlanData(v.data); snapshotCurrent(); tab='timeline'; renderTabs(); planMsg='백업을 불러왔어요.'; if(after) after(true);
    }catch(_){planMsg='JEPI 백업 파일이 아니거나 손상됐어요.';renderPlans();setSt('st_import','JEPI 백업 파일이 아니거나 손상됐어요.');if(after)after(false)}};
  rd.readAsText(file);
}
async function copyText(text){try{await navigator.clipboard.writeText(text);planMsg='복사했어요. 카톡에 붙여 넣으면 돼요.'}catch(_){planMsg='자동 복사가 막혀 있어요. 아래 글을 길게 눌러 복사해 주세요.'}renderPlans()}
let showText=false;
function renderPlans(){
  const box=$('#plansBox'); if(!box) return;
  const cur=plans.find(x=>x.id===curPlan);
  box.innerHTML=`<div class="row" style="margin-bottom:10px"><button class="small-btn primary" id="planNew">+ 새 계획</button></div>
  ${planMsg?`<p class="ai-status" style="margin:0 0 8px">${esc(planMsg)}</p>`:''}
  <div class="plan-list">${plans.map(p=>`<div class="plan${p.id===curPlan?' cur':''}">
    <div class="pl-top"><b>${esc(p.name||'이름 없는 계획')}</b>${p.id===curPlan?'<span class="tag r">지금 보는 계획</span>':''}</div>
    <small>${p.kind==='day'?'☀️ 하루 코스':'✈️ 여행'}${p.dates?' · '+esc(p.dates):''} · 블록 ${p.blocks||0}개${p.updated?' · '+new Date(p.updated).toLocaleDateString('ko-KR',{month:'numeric',day:'numeric'})+' 저장':''}</small>
    <div class="row">${p.id===curPlan?'':`<button class="small-btn primary" data-planopen="${p.id}">열기</button>`}<button class="small-btn" data-planrename="${p.id}">이름 바꾸기</button><button class="small-btn" data-plandup="${p.id}">복제</button><button class="small-btn danger" data-plandel="${p.id}">${delArm===p.id?'한 번 더 누르면 삭제':'삭제'}</button></div></div>`).join('')||'<p class="hint">저장된 계획이 없어요.</p>'}</div>
  <div class="fsec" style="margin-top:14px"><h3>지금 계획 공유하기</h3>
    <div class="row"><button class="small-btn primary" id="planShare">${STANDALONE?'공유 링크 보내기':'공유 코드 만들기'}</button><button class="small-btn" id="planText">카톡용 글</button><button class="small-btn" id="planTxt">글 파일 받기</button><button class="small-btn" id="planJson">백업 파일 받기</button></div>
    ${STANDALONE&&lastLink?`<textarea class="share-text" rows="3" readonly>${esc(lastLink)}</textarea><p class="hint">링크 안에 계획이 통째로 들어 있어요. 받은 사람이 열면 자기 계획으로 복사돼요.</p>`:''}${lastCode?`<p class="share-code">${lastCode}</p><p class="hint">이 코드를 친구에게 알려 주세요. 친구는 "공유받은 계획 열기"에 넣으면 이 순간의 계획을 자기 계획으로 복사해 열 수 있어요. 친구도 이 페이지를 열 수 있어야 해요.</p>`:''}
    ${showText?`<textarea class="share-text" rows="10" readonly>${esc(planText())}</textarea>`:''}</div>
  <div class="fsec"><h3>백업 파일 불러오기</h3><p class="hint">"백업 파일 받기"로 저장한 .json 파일을 고르면 새 계획으로 열려요.</p><input type="file" accept=".json,application/json" class="importFile"></div>
  <div class="fsec"><h3>공유받은 계획 열기</h3><div class="kw-add"><input id="codeIn" ${STANDALONE?'placeholder="받은 링크 붙여 넣기"':'maxlength="10" placeholder="JP-7K2QX"'} autocomplete="off"><button class="small-btn primary" id="codeOpen">열기</button></div></div>
  <p class="hint">${rdb&&recState==='on'?'계획은 이 Claude 계정에 저장돼서 다른 기기에서 열어도 보여요.':'계획은 이 기기에만 저장돼요. 다른 기기로 옮기려면 공유 링크나 더보기 → 설정 → 전체 백업을 쓰세요.'}</p>`;
}


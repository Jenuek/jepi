// ---------- start over: wipe everything this browser keeps for the page ----------
let wipeArm=false;
function wipeAll(){
  ['profile','pack','placed3','custom','kw','meal2','done','fmarks','wish','coach','dice','jp'].forEach(k=>JD.storage.del('gp.'+k));
  plans.forEach(p=>{JD.storage.del('gp.plan.'+p.id);cloudDelete(p.id)}); plans=[]; curPlan='p'+Date.now().toString(36); savePlans();
  custom=[]; placed=[]; fmarks={}; wish=[]; kws=[]; meals={}; done={}; chat=[]; undoSnap=null; aiState=null; selected=null; hVibe=null; wipeArm=false;
  loadPack(blankPack()); savePack();
  profile=clone(PROFILE_EXAMPLE); Object.assign(profile,{stays:[{name:'숙소',area:'center',checkin:'15:00',checkout:'11:00',from:0,to:3}],events:[],dest:'',pace:'normal',social:'some',breakfast:true,purpose:'',party:{type:'solo',adults:1,kids:0},flightSet:false,staySet:false,dateSet:false,nightsSet:false,dateUnknown:false,startDate:isoPlus(30)}); profile.stays[0].name='숙소';
  buildDays(); day=0; tab='timeline'; $('#helper').hidden=true; closeSheet(); renderAll(); openOnb();
}
// ---------- first-use guide ----------
// first-use guide: four steps only; everything else is in 더보기 → 사용 안내 (387-help.js)
const COACH=[{sel:'#grid',t:'일정표예요. 빈 시간을 누르면 앞뒤 일정과 가까운 장소를 골라 넣을 수 있어요.'},
  {sel:'#grid .blk',t:'블록을 누르면 시간을 옮기거나, 대안을 보거나, 🔔 알림을 켤 수 있어요.'},
  {sel:'#diceFab',t:'고민될 땐 🎲. 빈 시간에 할 일이나 오늘 메뉴를 무작위로 골라 줘요.'},
  {sel:'#chatForm',t:'말로 부탁해도 돼요. 바꿀 내용을 먼저 보여 주고, 확인한 뒤에 적용해요. 자세한 사용법은 더보기 → 사용 안내에 있어요.'}];
function showCoach(i){
  document.querySelectorAll('.coach-hl').forEach(e=>e.classList.remove('coach-hl'));
  if(i>=COACH.length){$('#coach').hidden=true;store.set('gp.coach',1);return}
  if(!matchMedia('(min-width:900px)').matches&&tab!=='timeline'){tab='timeline';renderTabs()}
  let el=document.querySelector(COACH[i].sel); if(COACH[i].sel==='#grid'&&jp==='P') el=document.querySelector('#pview'); if(COACH[i].sel==='#grid .blk'&&jp==='P') el=document.querySelector('#pview .pi'); if(!el||!el.offsetParent){showCoach(i+1);return}
  if(el){el.classList.add('coach-hl');el.scrollIntoView({block:i===0?'start':'center'})}
  $('#coachText').textContent=COACH[i].t; $('#coachStep').textContent=`${i+1} / ${COACH.length}`; $('#coachNext').textContent=i===COACH.length-1?'시작하기':'다음';
  $('#coach').dataset.i=i; $('#coach').hidden=false;
}
const maybeCoach=()=>{if(!store.get('gp.coach',0)&&$('#onb').hidden&&$('#helper').hidden) setTimeout(()=>showCoach(0),400)};

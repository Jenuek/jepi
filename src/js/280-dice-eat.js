// ================= DICE: 뭐 하지? / 뭐 먹지? =================
const NB=JD.nearby, EAT_MOODS=NB.EAT_MOODS, MEAL_TXT=NB.MEAL_TXT;   // app/data/nearby.ts: finding and rolling places nearby
let eat=Object.assign({walk:10,mood:'any'},LS.get('jepi.eat',{}),{base:null,org:null,pick:null,rolls:0,msg:'',busy:false,ll:null,where:'',meal:null,src:''});
const saveEat=()=>LS.set('jepi.eat',{walk:eat.walk,mood:eat.mood});
const nowMin=()=>{const n=new Date();return n.getHours()*60+n.getMinutes()};
const mealNow=()=>{const m=nowMin();return m>=630&&m<930?'lunch':m>=990&&m<1290?'dinner':'snack'};
const planUsable=()=>DAYS.length&&PACK&&PACK.city&&PACK.city!=='새 여행';
function eatDefaults(){
  const ti=todayIdx(); eat.base=ti>=0&&planUsable()?'plan':'near';
  if(eat.base==='plan') day=ti;
  const n=new Date(), wkLunch=n.getDay()>0&&n.getDay()<6&&nowMin()>=630&&nowMin()<900;
  eat.org=wkLunch&&mypOf('work')&&mypOf('work').ll?'work':'gps';
  eat.meal=mealNow()==='dinner'?'dinner':'lunch'; eat.pick=null; eat.rolls=0; eat.msg='';
}
// The DICE sheet is drawn by React: app/screens/Dice.tsx. These build its pieces.
let diceRev=0;
const dPills=(attr,cur,opts)=>({r:'pills',p:{attr,cur,opts}}), dHint=t=>({r:'hint',t});
const dBtn=(cls,label,o)=>Object.assign({a:'btn',cls,label},o||{}), dLink=(cls,label,href)=>({a:'link',cls,label,href:String(href||'')});
const dSpin=()=>({s:'die',spin:true,face:FACES[Math.floor(Math.random()*6)]});
function diceMount(pr){window.JEPI_UI.mount('dice',$('#sheet'),Object.assign({eat:false,head:null,tabs:null,bases:null,picker:null,rows:[],cond:null,msg:'',acts:[],ai:null,foot:null},pr,{rev:++diceRev}))}
function renderDice(){
  if($('#sheet').dataset.uid!=='dice') return;
  if(dice.tab==='eat') return renderEat();
  if(!doS.base) doDefaults(false);
  if(doS.base!=='plan') return renderDoNear();
  dice.lunch=false; renderDiceDo({tabs:'do',bases:doBases()});
}
function eatRecent(){const t=isoOf(new Date()),from=isoShift(t,-5);return new Set(diceLog.filter(x=>x.d&&x.d>=from&&x.d<=t).map(x=>norm(x.n)))}
async function eatOrigin(){
  if(eat.org==='gps'){const ll=await getPos(120000);eat.where='지금 위치';return ll}
  const x=mypOf(eat.org); if(!x||!x.ll) throw aiErr('noplace',`${x?x.name:'이 장소'}를 아직 등록하지 않았어요. 더보기 → 설정 → 내 장소에서 등록해 주세요.`);
  eat.where=x.name; return x.ll;
}
const nbLook=()=>({kakao:!!KEYS.kakao,ai:sample});
async function eatRoll(again){
  if(eat.busy) return;
  if(eat.base==='plan'){
    dice.lunch=true; dice.meal=eat.meal; dice.walk=eat.walk; dice.mood='any';
    const gs=diceGaps(day), mw=eat.meal==='dinner'?[1050,1260]:[690,840];
    const gi=gs.findIndex(g=>g.e>mw[0]&&g.s<mw[1]); if(gi>=0) dice.gapI=gi;
    if(again&&dice.rolls>=3) return; diceRoll(!!again); return;
  }
  if(again&&eat.rolls>=3) return;
  eat.busy=true; eat.msg=''; if(!again){eat.rolls=0} renderEat();
  try{
    const ll=await eatOrigin(); eat.ll=ll;
    const got=await NB.eatList(ll,eat.walk,eat.mood,mealNow(),nbLook()); eat.src=got.src;
    const pk=NB.eatRoll(got.list,eat.walk,eat.mood,eatRecent(),new Set(diceLog.map(x=>norm(x.n))),eat.pick?eat.pick.name:null);
    if(!pk){eat.pick=null;eat.msg=`걸어서 ${eat.walk}분 안에 ${eat.mood==='any'?'':'이 조건에 맞는 '}후보가 없어요. 거리를 늘리거나 기분을 바꿔 보세요.`}
    else{eat.pick=pk; eat.rolls++; dice.rolling=!matchMedia('(prefers-reduced-motion:reduce)').matches; if(dice.rolling)setTimeout(()=>{dice.rolling=false;renderEat()},650)}
  }catch(err){eat.pick=null;eat.msg=err.message||'후보를 가져오지 못했어요.'}
  eat.busy=false; renderEat();
}
function renderEat(){
  if($('#sheet').dataset.uid!=='dice') return;
  const meal=eat.base==='plan'?eat.meal:mealNow(), mt=MEAL_TXT[meal]||'점심', D=DAYS[day]||{};
  const orgs=[['gps','지금 위치'],...MYP.filter(x=>x.ll).map(x=>[x.id,x.name])];
  const nearLbl=eat.org==='gps'?'지금 위치':(mypOf(eat.org)||{}).name||'지금 위치';
  let stage, acts;
  if(eat.base==='plan'){
    const c=dice.pick, left=Math.max(0,3-dice.rolls);
    stage=dice.rolling?dSpin():c?{s:'planCard',cat:c.p.cat,name:c.p.name,line:`${fmt(c.arr)}–${fmt(c.arr+c.dur)} · ${c.p.area}${c.tm?` · ${c.mode} ${c.tm}분`:''}`,note:c.p.note||'',tags:null}:{s:'die',face:'🍚'};
    acts=c&&!dice.rolling?[dBtn('small-btn primary','이걸로! 일정에 넣기',{id:'diceFix'}),...(dice.force?[dBtn('small-btn','그래도 넣기',{id:'diceForce'})]:[]),dBtn('small-btn',`다시 굴리기 (${left})`,{data:{eatroll:'again'},disabled:!left})]
      :dice.rolling?[]:[dBtn('dice-go',`🍚 ${MEAL_TXT[eat.meal]} 굴리기`,{data:{eatroll:'go'}})];
  } else {
    const c=eat.pick, left=Math.max(0,3-eat.rolls);
    stage=eat.busy?{s:'die',spin:true,face:'🍚',hint:'주변 식당을 찾는 중…'}:dice.rolling?dSpin():c?{s:'placeCard',title:c.name,line:`걸어서 약 ${Math.max(1,Math.round(c.dist/80))}분 · ${c.cat}`,addr:c.addr||'',foot:`${eat.where} 기준 · ${eat.src}`}:{s:'die',face:'🍚'};
    acts=c&&!eat.busy&&!dice.rolling?(eat.chosen===c.name?[{a:'status',t:'맛있게 드세요! 🍚'},dLink('small-btn primary','지도 열기',c.url)]
      :[dBtn('small-btn primary','이걸로!',{id:'eatPick'}),dLink('small-btn','지도',c.url),dBtn('small-btn',`다시 굴리기 (${left})`,{data:{eatroll:'again'},disabled:!left})])
      :(eat.busy||dice.rolling?[]:[dBtn('dice-go',`🍚 ${mt} 굴리기`,{data:{eatroll:'go'}})]);
  }
  diceMount({eat:true,tabs:dice.tab==='eat'?'eat':'do',
    bases:[{attr:'eatbase',v:'near',on:eat.base==='near',label:`📍 ${nearLbl} 주변`,small:`걸어서 ${eat.walk}분`},
      ...(planUsable()?[{attr:'eatbase',v:'plan',on:eat.base==='plan',label:`🗓 ${PACK.city} Day ${day+1}`,small:`${D.date||''} ${MEAL_TXT[eat.meal]}`}]:[])],
    cond:{open:!!eat.cond,txt:eatCondTxt(),rows:[...(eat.base==='near'?[dHint('기준'),dPills('eatorg',eat.org,orgs),...(MYP.some(x=>x.ll)?[]:[{r:'setPlaces'}])]:[dHint('언제'),dPills('eatmeal',eat.meal,[['lunch','점심'],['dinner','저녁']])]),
      dHint('걸어서'),dPills('eatwalk',eat.walk,[[5,'5분'],[10,'10분'],[15,'15분'],[20,'20분']]),dHint('기분'),dPills('eatmood',eat.mood,EAT_MOODS.map(m=>[m[0],m[1]]))]},
    stage,msg:eat.base==='near'?(eat.msg||''):(dice.msg||''),acts,ai:eat.base==='plan'&&sample&&!PACK.manual?{primary:false}:null,foot:'최근 5일 동안 고른 곳은 빼고 굴려요.'});
}
function openDiceTab(tab,fromT){
  dice.tab=tab; if(tab==='eat'){eatDefaults(); eat.chosen=null} else doDefaults(fromT!=null);
  openDice(fromT); if(fromT==null) diceOpenAnim();
}
// home-screen shortcut: ./?dice=eat
function diceFromUrl(){try{const q=new URLSearchParams(location.search).get('dice');if(q==='eat'||q==='do'){history.replaceState(null,'',location.pathname+location.hash);setTimeout(()=>openDiceTab(q),300)}}catch(_){}}

// plan-based meal mood filter
function eatMoodOk(p){const m=EAT_MOODS.find(x=>x[0]===eat.mood);if(!m||!m[2].length)return true;const tx=p.name+' '+tagsOf(p.id).join(' ')+' '+(p.note||'');return m[2].some(k=>tx.includes(k))}
// trip departure from 집 (내 장소)
const KR_AIR={gmp:['김포공항 국제선',37.5583,126.7906],icn1:['인천공항 T1',37.4492,126.4510],icn2:['인천공항 T2',37.4602,126.4407]};
let homeMsg='';
// 오가는 길 → 출발지 (drawn by React: TripForms.tsx HomeBox)
function partHomeBox(p){if(p.mode==='car')return null;const h=mypOf('home');
  return {f:'homeBox',hasHome:!!(h&&h.ll),addr:(h&&h.addr)||'',using:!!p.home.ll,kakao:KEYS.kakao?Object.entries(KR_AIR).map(([k,a])=>[k,a[0]]):[],msg:homeMsg}}
document.addEventListener('click',async e=>{const t=e.target.closest('button');if(!t||!draft)return;
  if(t.id==='homeUse'){const h=mypOf('home');if(!h||!h.ll)return;draft.home.ll=h.ll;draft.home.area='집';homeMsg='출발지를 집으로 바꿨어요.';autoSave();renderMeRows();return}
  if(t.dataset.homeair){const h=mypOf('home'),a=KR_AIR[t.dataset.homeair];if(!h||!h.ll)return;homeMsg='경로를 계산하는 중…';renderMeRows();
    try{const v=await fetchRoute({m:'transit',a:h.ll,b:[a[1],a[2]],pv:'kakao'});if(!v)throw new Error('경로를 찾지 못했어요');
      draft.home.ll=h.ll;draft.home.area='집';draft.home.min=Math.min(240,Math.max(10,Math.ceil(v.min/5)*5));homeMsg=`집 → ${a[0]}: ${v.label} 약 ${v.min}분${v.lines?` (${v.lines})`:''}으로 넣었어요.`;autoSave()}
    catch(err){homeMsg=(err&&err.message)||'계산하지 못했어요'}renderMeRows();return}
});

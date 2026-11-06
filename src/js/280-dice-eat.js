// ================= DICE: 뭐 하지? / 뭐 먹지? =================
const NB=JD.nearby, EAT_MOODS=NB.EAT_MOODS, MEAL_TXT=NB.MEAL_TXT;   // app/data/nearby.ts: finding and rolling places nearby
let eat=Object.assign({walk:10,mood:'any'},LS.get('jepi.eat',{}),{base:null,org:null,pick:null,rolls:0,msg:'',busy:false,ll:null,where:'',meal:null,src:''});
const saveEat=()=>LS.set('jepi.eat',{walk:eat.walk,mood:eat.mood});
const nowMin=DICEV.nowMin, mealNow=DICEV.mealNow, planUsable=DICEV.planUsable;   // app/view/dice.ts
function eatDefaults(){
  const ti=todayIdx(); eat.base=ti>=0&&planUsable()?'plan':'near';
  if(eat.base==='plan') day=ti;
  const n=new Date(), wkLunch=n.getDay()>0&&n.getDay()<6&&nowMin()>=630&&nowMin()<900;
  eat.org=wkLunch&&mypOf('work')&&mypOf('work').ll?'work':'gps';
  eat.meal=mealNow()==='dinner'?'dinner':'lunch'; eat.pick=null; eat.rolls=0; eat.msg='';
}
// The DICE sheet is drawn by React: app/screens/Dice.tsx. These build its pieces.
let diceRev=0;
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
function renderEat(){if($('#sheet').dataset.uid!=='dice')return;diceMount(DICEV.eatTab(diceState()))}
function openDiceTab(tab,fromT){
  dice.tab=tab; if(tab==='eat'){eatDefaults(); eat.chosen=null} else doDefaults(fromT!=null);
  openDice(fromT); if(fromT==null) diceOpenAnim();
}
// home-screen shortcut: ./?dice=eat
function diceFromUrl(){try{const q=new URLSearchParams(location.search).get('dice');if(q==='eat'||q==='do'){history.replaceState(null,'',location.pathname+location.hash);setTimeout(()=>openDiceTab(q),300)}}catch(_){}}

// plan-based meal mood filter
const eatMoodOk=p=>DICEV.eatMoodOk(p,eat.mood);
// trip departure from 집 (내 장소)
const KR_AIR={gmp:['김포공항 국제선',37.5583,126.7906],icn1:['인천공항 T1',37.4492,126.4510],icn2:['인천공항 T2',37.4602,126.4407]};
let homeMsg='';
// 오가는 길 → 출발지 (drawn by React: TripForms.tsx HomeBox)
function partHomeBox(p){if(p.mode==='car')return null;const h=mypOf('home');
  return {f:'homeBox',hasHome:!!(h&&h.ll),addr:(h&&h.addr)||'',using:!!p.home.ll,kakao:KEYS.kakao?Object.entries(KR_AIR).map(([k,a])=>[k,a[0]]):[],msg:homeMsg}}

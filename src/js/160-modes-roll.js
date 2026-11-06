// ---------- J / P modes ----------
let jp='J';
function setJP(m,quiet){jp=m==='P'?'P':'J';dock({placeholder:jp==='P'?'뭐 하고 싶어요? 말로 해도 돼요':'AI에게 말로 부탁하기'});document.body.classList.toggle('mode-p',jp==='P');hero({jp});if(!quiet)store.set('gp.jp',jp)}

// ---------- one-day course ----------
// 하루 코스: 여행지 + 언제·어디서 만나요 + 누구와 (drawn by React: TripForms.tsx)
function partsDay(p){const m=p.meet||{};
  return [partDest(p),{f:'day',date:p.dateSet!==false?String(p.startDate??''):'',time:m.time||'11:00',end:m.end||'20:00',area:m.area,areas:optsOf(AREAS)},partParty(p)]}

// ---------- DICE: roll for an empty slot ----------
// what the 🎲 sheet shows and where the dice can land: app/view/dice.ts (the rolls and choices stay here)
const DICEV=window.JEPI_UI.view.dice, DICE_MOODS=DICEV.DICE_MOODS;
const diceState=()=>({dice,eat,doS,diceLog,recentAreas:RECENT_AREAS,day,ai:!!sample});
let dice={mood:'any',lunch:false,walk:10,gapI:0,rolls:0,pick:null,rolling:false,msg:'',force:null};
let diceLog=[];
const isoShift=(iso,n)=>{const d=new Date(iso+'T00:00:00');d.setDate(d.getDate()+n);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const diceGaps=DICEV.diceGaps, diceCands=g=>DICEV.diceCands(g,diceState());
function openDice(fromT){
  const gs=diceGaps(day); dice.pick=null; dice.rolls=0; dice.msg=''; dice.force=null;
  if(fromT!=null){const i=gs.findIndex(g=>fromT>=g.s&&fromT<g.e);dice.gapI=i>=0?i:0} else if(dice.gapI>=gs.length) dice.gapI=0;
  $('#sheet').dataset.uid='dice'; $('#sheetBg').hidden=false; renderDice();
}
function diceRoll(re){
  const gs=diceGaps(day), g=gs[dice.gapI]||gs[0];
  if(!g){dice.pick=null;dice.msg='이 날은 45분 이상 빈 시간이 없어요.';renderDice();return}
  if(re&&dice.rolls>=3) return; if(!re) dice.rolls=0;
  const prev=dice.pick, cs=diceCands(g).filter(c=>!prev||c.p.id!==prev.p.id);
  if(!cs.length){dice.pick=null;dice.msg=dice.lunch?`걸어서 ${dice.walk}분 안에 ${dice.meal==='dinner'?'저녁':'점심'} 후보가 없어요. 시간을 늘리거나 AI에게 새 후보를 받아 보세요.`:'이 조건에 맞는 곳이 없어요. 기분이나 시간을 바꾸거나 AI에게 새 후보를 받아 보세요.';renderDice();return}
  dice.rolls++;
  const fw=c=>c.w*(dice.fresh&&dice.fresh.includes(c.p.id)?8:1); const tot=cs.reduce((a,c)=>a+fw(c),0); let r=Math.random()*tot, pick=cs[cs.length-1]; for(const c of cs){r-=fw(c);if(r<=0){pick=c;break}}
  dice.pick=pick; dice.gap=g; dice.msg=''; dice.force=null; dice.rolling=!matchMedia('(prefers-reduced-motion:reduce)').matches; renderDice();
  if(dice.rolling) setTimeout(()=>{dice.rolling=false;renderDice()},700);
}
function diceFix(force){
  const c=dice.pick; if(!c) return;
  const ops=[{op:'add',day,id:c.p.id,start:fmt(c.arr),dur:c.dur}], r=force?{ops:dice.force||ops,warns:[]}:repairOps(ops);
  if(r.warns.length){dice.force=r.ops;dice.msg='넣으면 경고가 생겨요: '+r.warns[0];renderDice();return}
  applyOpsCore(r.ops); save(); learnFrom(c.p); diceLog.push({n:c.p.name,d:DY.days[day].iso}); diceLog=diceLog.slice(-60); store.set('gp.dice',diceLog);
  closeSheet(); renderAll();
}
function renderDiceDo(top){if($('#sheet').dataset.uid!=='dice')return;diceMount(DICEV.plan(diceState(),top))}
async function diceAI(){
  const mood=(DICE_MOODS.find(m=>m[0]===dice.mood)||[])[1]||'';
  const focus=dice.lunch?`${dice.meal==='dinner'?'저녁':'점심'} 식사 (걸어서 ${dice.walk}분 안${eat.mood!=='any'?', '+((EAT_MOODS.find(m=>m[0]===eat.mood)||[])[1]||''):''})`:dice.mood==='any'?'지금 빈 시간에 하기 좋은 곳':`지금 기분: ${mood}`;
  const n=await morePlaces(8,'st_dice',focus); if(n){dice.fresh=[...FRESH]; diceRoll(false)}
}


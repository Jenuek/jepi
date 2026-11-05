// ---------- J / P modes ----------
let jp='J';
function setJP(m,quiet){jp=m==='P'?'P':'J';dock({placeholder:jp==='P'?'뭐 하고 싶어요? 말로 해도 돼요':'AI에게 말로 부탁하기'});document.body.classList.toggle('mode-p',jp==='P');document.querySelectorAll('[data-jp]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.jp===jp)));if(!quiet)store.set('gp.jp',jp)}

// ---------- one-day course ----------
// 하루 코스: 여행지 + 언제·어디서 만나요 + 누구와 (drawn by React: TripForms.tsx)
function partsDay(p){const m=p.meet||{};
  return [partDest(p),{f:'day',date:p.dateSet!==false?String(p.startDate??''):'',time:m.time||'11:00',end:m.end||'20:00',area:m.area,areas:optsOf(AREAS)},partParty(p)]}

// ---------- DICE: roll for an empty slot ----------
const DICE_MOODS=[['any','아무거나'],['hungry','배고파'],['calm','차분히'],['dopa','도파민'],['mine','내 카드'],['legs','다리 아파']];
const FACES='⚀⚁⚂⚃⚄⚅';
let dice={mood:'any',lunch:false,walk:10,gapI:0,rolls:0,pick:null,rolling:false,msg:'',force:null};
let diceLog=[];
const isoShift=(iso,n)=>{const d=new Date(iso+'T00:00:00');d.setDate(d.getDate()+n);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
function diceGaps(d){
  const its=analyze(d).items.filter(i=>!i.stay), out=[]; let cur=d===0?arrEnd():dayStart(d), prev=null;
  const end=profile.kind==='day'?tmin(profile.meet.end,1200):1380;
  for(const it of its){ if(it.start>=end) break; if(it.start-cur>=45) out.push({s:cur,e:it.start,prev}); if(it.end>cur){cur=it.end;prev=it} }
  if(end-cur>=45) out.push({s:cur,e:end,prev}); return out;
}
// the six dice (P모드 주사위 판 and the 🎲 sheet): 비 와요·한잔 are handled by time of day (and weather, later)
function moodOk(p,from){const tg=tagsOf(p.id).join(' ')+' '+p.name+' '+(p.note||'');
  switch(dice.mood){case 'hungry':return p.cat==='food';
    case 'calm':return ['art','walk'].includes(p.cat)||/카페|정원|서점|사색|공원|조용/.test(tg);
    case 'dopa':return ['shop','music'].includes(p.cat)||(p.cat==='night'&&from>=1020)||/액티비티|체험|놀이|전망|쇼핑|게임/.test(tg);
    case 'mine':return isWish(p.id);
    default:return true}}
function diceCands(g){
  const D=DAYS[day],wd=D.wd,used=new Set(placed.map(b=>b.id)),from=g.prev?g.prev.ll:LOC[D.startLoc].ll;
  const recent=new Set(diceLog.filter(x=>x.d&&D.iso&&x.d<D.iso&&x.d>=isoShift(D.iso,-5)).map(x=>norm(x.n)));
  let s0=g.s,e0=g.e; if(dice.lunch){const mw=dice.meal==='dinner'?[1050,1260]:[690,840];s0=Math.max(s0,mw[0]);e0=Math.min(e0,mw[1]);if(e0-s0<30)return []}
  const out=[];
  for(const p of P){
    if(used.has(p.id)||p.drop||closedOn(p,wd)||outOfSeason(p,D.iso)) continue;
    if(dice.lunch?(p.cat!=='food'||recent.has(norm(p.name))||!eatMoodOk(p)):!moodOk(p,g.s)) continue;
    const t=travel(from,p.ll), tm=t?t.min:0;
    if(dice.lunch&&t&&(t.mode!=='도보'||tm>dice.walk)) continue;
    if(!dice.lunch&&dice.mood==='legs'&&t&&(t.mode!=='도보'||tm>10)) continue;
    const h=hoursFor(p,wd), ss=sunsetMin()||1050;
    let pref={morning:540,day:720,sunset:ss-45,evening:1080,night:ss+30}[p.best]||(p.cat==='food'?(s0<=720?720:s0):p.cat==='night'?1140:600);
    if(dice.lunch) pref=dice.meal==='dinner'?1110:720; if(h) pref=Math.max(pref,h[0]);
    let arr=Math.ceil(Math.max(s0+tm,Math.min(pref,e0-Math.min(p.dur,90)))/15)*15;
    if(h&&arr<h[0]) arr=Math.ceil(h[0]/15)*15;
    const dur=Math.min(p.dur,e0-arr); if(dur<30) continue;
    if(h&&(arr<h[0]||arr+30>h[1])) continue;
    let w=1+matchKw(p.id).length+(isWish(p.id)?3:0)+(MUST[p.id]?1.5:0)+(p.season?1.5:0)+recOf(p)*0.5-tm/30;
    if(bestTips(p,arr,arr+dur).length) w-=0.7;
    if(!dice.lunch&&dice.mood==='legs'&&(p.dur<=60||/카페|공원|정원|벤치/.test(tagsOf(p.id).join(' ')+' '+p.name))) w+=1.5;
    out.push({p,arr,dur,tm,mode:t?t.mode:'',w:Math.max(0.2,w)});
  }
  return out;
}
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
  applyOpsCore(r.ops); save(); learnFrom(c.p); diceLog.push({n:c.p.name,d:DAYS[day].iso}); diceLog=diceLog.slice(-60); store.set('gp.dice',diceLog);
  closeSheet(); renderAll();
}
function renderDiceDo(top){
  if($('#sheet').dataset.uid!=='dice') return;
  const D=DAYS[day], gs=diceGaps(day), c=dice.pick, left=Math.max(0,3-dice.rolls);
  const reasons=c?[isWish(c.p.id)?'♥ 가고 싶은 곳':'',...matchKw(c.p.id).slice(0,2).map(k=>'#'+k),c.p.season?'🗓 '+c.p.season:'',recOf(c.p)?`👍 ${recOf(c.p)}`:'',c.tm?`${c.mode} ${c.tm}분`:'바로 옆'].filter(Boolean):[];
  diceMount({...top,head:D.date||'',rows:[...(gs.length?[dHint('언제'),dPills('dicegap',dice.gapI,gs.map((g,i)=>[i,`${fmt(g.s)}–${fmt(g.e)}`]))]:[]),
      ...(dice.lunch?[]:[dHint('지금 기분'),dPills('dicemood',dice.mood,DICE_MOODS.map(([k,l])=>[k,l]))])],
    stage:dice.rolling?dSpin():c?{s:'planCard',cat:c.p.cat,name:c.p.name,line:`${fmt(c.arr)}–${fmt(c.arr+c.dur)} · ${c.p.area}`,note:c.p.note||'',tags:reasons}:{s:'die',face:'⚄'},
    msg:dice.msg||'',acts:c&&!dice.rolling?[dBtn('small-btn primary','이걸로 할래요',{id:'diceFix'}),...(dice.force?[dBtn('small-btn','그래도 넣기',{id:'diceForce'})]:[]),dBtn('small-btn',`다시 굴리기 (${left}번)`,{id:'diceAgain',disabled:!left})]
      :dice.rolling?[]:[dBtn('dice-go','🎲 굴리기',{id:'diceGo'})],
    ai:sample&&!PACK.manual?{primary:true}:null});
}
async function diceAI(){
  const mood=(DICE_MOODS.find(m=>m[0]===dice.mood)||[])[1]||'';
  const focus=dice.lunch?`${dice.meal==='dinner'?'저녁':'점심'} 식사 (걸어서 ${dice.walk}분 안${eat.mood!=='any'?', '+((EAT_MOODS.find(m=>m[0]===eat.mood)||[])[1]||''):''})`:dice.mood==='any'?'지금 빈 시간에 하기 좋은 곳':`지금 기분: ${mood}`;
  const n=await morePlaces(8,'st_dice',focus); if(n){dice.fresh=[...FRESH]; diceRoll(false)}
}


// ---------- quick start (P, and any one-day course): a few taps ----------
const nextSat=()=>{const d=new Date();const add=(6-d.getDay()+7)%7||7;return isoPlus(d.getDay()===6?0:add)};
const SLOTS=[['morning','오전부터',600,1080],['noon','점심부터',720,1200],['after','오후부터',840,1320],['eve','저녁만',1080,1380]];
// drawn by React: app/screens/OnbBody.tsx Quick
function partQuick(p,dayOnly){
  const q=p.q||(p.q={when:'',len:dayOnly?'0':'',slot:'noon'});
  return {f:'quick',dest:p.dest??'',dayOnly:!!dayOnly,when:String(q.when??''),date:p.dateSet!==false?String(p.startDate??''):'',len:String(q.len??''),slot:String(q.slot??''),
    slots:SLOTS.map(s=>[s[0],s[1]]),kws:['맛집','카페','산책','쇼핑','전시','한잔','사진','자연'].map(k=>({k,on:kws.some(x=>norm(x)===norm(k))})),party:p.party.type};
}
async function quickStart(){
  const q=draft.q||{}, dest=String(draft.dest||'').trim();
  if(!dest){setSt('st_pack','어디로 갈지 적어 주세요.');return}
  if(!q.when||(q.when==='pick'&&draft.dateSet===false)){setSt('st_pack','언제 갈지 골라 주세요.');return}
  if(q.len===''||q.len==null){setSt('st_pack','얼마나 갈지 골라 주세요.');return}
  if(q.when!=='pick'){draft.startDate=q.when==='today'?isoPlus(0):q.when==='tomorrow'?isoPlus(1):nextSat();}
  draft.dateSet=true; draft.dateUnknown=false; draft.nightsSet=true;
  if(q.len==='0'){const sl=SLOTS.find(s=>s[0]===q.slot)||SLOTS[1];let st=sl[2];
    if(q.when==='today'){const n=new Date(),now=n.getHours()*60+n.getMinutes();if(now+30>st)st=Math.min(1320,Math.ceil((now+30)/30)*30)}
    draft.kind='day'; draft.meet=Object.assign({},draft.meet||{},{time:fmt(st),end:fmt(Math.max(st+180,sl[3]))});}
  else{draft.kind='trip'; draft.nights=+q.len; draft.bookedFlight=true; draft.bookedStay=true; draft.flightSet=false; draft.staySet=false;}
  if(norm(dest)!==norm(PACK.city)){
    if(sample){if(!(await genPack(dest,'quickStart')))return}
    else{custom=[];TRIP.save('custom',custom);placed=[];save();loadPack(manualPack(dest));savePack()}
  }
  draft.dest=PACK.city; if(draft.kind==='day'&&!AREAS[draft.meet.area]) draft.meet.area=firstArea();
  await finishOnb();
}

// ---------- P view: the day as a board game (drawn by React: app/screens/PView.tsx) ----------
// Squares follow the day: start → places (stamped "다녀옴" once done) → ? squares for free time → flag squares for fixed times → end.
// A future day stays closed until its morning, unless "미리 열어서 계획하기" is on. Rolling a die spins a 3D die, then shows a card.
function fuzzy(m){const h=Math.floor(m/60)%24,mm=m%60;return `${h<12?'오전':'오후'} ${h%12||12}시${mm>=30?' 반':''}`}
const shortFuzzy=m=>{const h=Math.floor(m/60)%24;return `${h%12||12}시${m%60>=30?' 반':''}쯤`};
const partOfDay=m=>m<720?'오전':m<1020?'오후':m<1260?'저녁':'밤';
const P_DICE=[['any','아무거나',1],['hungry','배고파',2],['calm','차분히',3],['dopa','도파민',4],['mine','내 카드',5],['legs','다리 아파',6]];
let pSt={mood:'any',draw:null}, pviewRev=0, pSpinT=0;
const pAheadOn=()=>!!store.get('gp.pAhead',false);
// where "now" is on this day: past day → everything done, today → the clock, future → nothing yet
function pClock(){const dIso=DAYS[day]&&DAYS[day].iso, t=isoOf(new Date());
  if(!dIso) return {past:false,today:false,future:false,nm:-1};
  return {past:dIso<t,today:dIso===t,future:dIso>t,nm:dIso===t?nowMin():-1};
}
// free time you can still roll for (from now on, when it's today)
function pGaps(){const c=pClock(); if(c.past) return [];
  return diceGaps(day).map(g=>c.today?{s:Math.max(g.s,Math.ceil(c.nm/15)*15),e:g.e,prev:g.prev}:g).filter(g=>g.e-g.s>=45);
}
function pSquares(){
  const c=pClock(), items=analyze(day).items.filter(i=>!i.stay), gaps=pGaps(), out=[];
  const start=LOC[DAYS[day].startLoc], firstT=items.length?items[0].start:dayStart(day);
  // day 1 begins with its fixed trip from home, so it needs no start square
  if(day>0) out.push({k:'start',t:-1,top:'출발',name:start?String(start.name):'',stamp:c.past||(c.today&&c.nm>=firstT)});
  const seq=[];
  items.forEach(i=>{const done=c.past||(c.today&&i.end<=c.nm), here=c.today&&i.start<=c.nm&&c.nm<i.end;
    seq.push(i.kind==='fixed'
      ?{k:here?'now':'flag',t:i.start,top:fmt(i.start),name:String(i.name),uid:String(i.uid),stamp:done,flag:true}
      :{k:here?'now':done?'done':'place',t:i.start,top:shortFuzzy(i.start),name:String(i.name),uid:String(i.uid),cat:i.p?String(i.p.cat):'',stamp:done})});
  gaps.forEach((g,gi)=>seq.push({k:'q',t:g.s,top:'?',name:partOfDay(g.s),gap:gi}));
  if(c.today&&!seq.some(s=>s.k==='now')) seq.push({k:'now',t:c.nm,top:'지금 '+fmt(c.nm).replace(/^0/,''),name:''});
  seq.sort((a,b)=>a.t-b.t||(a.k==='now'?-1:b.k==='now'?1:0)).forEach(s=>out.push(s));
  const next=DAYS[day+1]&&LOC[DAYS[day+1].startLoc];
  out.push({k:'end',t:1e4,top:'하루 끝',name:next?String(next.name):'집으로',stamp:c.past});
  return out.map(({t,...s})=>({name:'',uid:'',cat:'',stamp:false,flag:false,gap:-1,...s}));
}
function pDiceProps(){return P_DICE.map(([k,label,n])=>({k,label,n,on:pSt.mood===k}))}
function pMyCards(){const ids=wish.filter(id=>PM[id]&&!placed.some(b=>b.id===id));
  return {count:ids.length,list:ids.slice(0,3).map(id=>({id:String(id),name:String(PM[id].name),cat:String(PM[id].cat)}))}}
function renderPView(){
  const box=$('#pview'); if(!box) return;
  const on=jp==='P'; box.hidden=!on; $('.grid-wrap').hidden=on; if(!on) return;
  const c=pClock(), cards=pMyCards(), base={day,dice:pDiceProps(),cards,rev:++pviewRev};
  if(c.future&&!pAheadOn()&&!DEMO.on){
    const until=Math.round((new Date(DAYS[day].iso+'T00:00:00')-new Date(isoOf(new Date())+'T00:00:00'))/864e5);
    const flags=analyze(day).items.filter(i=>i.kind==='fixed').map(i=>({t:fmt(i.start),name:String(i.name)}));
    window.JEPI_UI.mount('pview',box,{...base,mode:'closed',closed:{until,date:mdTxt(DAYS[day].iso)||'',started:!!(DAYS[0].iso&&DAYS[0].iso<=isoOf(new Date())),flags}});
    return;
  }
  const d=pSt.draw;
  if(d&&d.day===day){
    const x=d.cand;
    window.JEPI_UI.mount('pview',box,{...base,mode:'draw',draw:{rolling:!!d.rolling,n:(P_DICE.find(v=>v[0]===d.mood)||P_DICE[0])[2],mood:(P_DICE.find(v=>v[0]===d.mood)||P_DICE[0])[1],
      part:partOfDay(d.g.s),left:d.left,empty:d.mood==='mine'&&!wish.some(id=>PM[id])?'내 카드가 비어 있어요. 장소 탭에서 ♥ 해 봐요.':'이 주사위로 나올 곳은 다 봤어요.',ai:!!(sample&&!PACK.manual),
      card:x?{id:String(x.p.id),cat:String(x.p.cat),catName:String(CATS[x.p.cat]||''),name:String(x.p.name),dist:x.tm?`${x.mode} ${x.tm}분`:'바로 옆',note:String(x.p.note||''),
        when:`${shortFuzzy(x.arr)} 도착${isWish(x.p.id)?' · 내 카드':''}`,mine:isWish(x.p.id)}:null}});
    return;
  }
  const sq=pSquares(), gaps=pGaps(), nextQ=sq.find(s=>s.k==='q');
  window.JEPI_UI.mount('pview',box,{...base,mode:'board',squares:sq,ahead:c.future,canRoll:!!nextQ,qLeft:sq.filter(s=>s.k==='q').length,rollGap:nextQ?nextQ.gap:-1});
}
function pPick(cs){const fw=c=>c.w*(dice.fresh&&dice.fresh.includes(c.p.id)?8:1); const tot=cs.reduce((a,c)=>a+fw(c),0); let r=Math.random()*tot, pick=cs[cs.length-1]; for(const c of cs){r-=fw(c);if(r<=0){pick=c;break}} return pick}
// roll the chosen die for one free time: spin, then show a card
function pRollDo(gi,auto){
  const gs=pGaps(), g=gs[+gi]; if(!g){pSt.draw=null;renderPView();return}
  const old=pSt.draw, same=old&&old.day===day&&old.gi===+gi&&old.mood===pSt.mood, seen=same?old.seen.slice():[];
  if(same&&old.cand) seen.push(old.cand.p.id);
  const m0=dice.mood, l0=dice.lunch; dice.mood=pSt.mood; dice.lunch=false; let cs=diceCands(g); dice.mood=m0; dice.lunch=l0;
  const pt=partOfDay(g.s);
  if(pt==='저녁'||pt==='밤') cs.forEach(c=>{if(['food','night'].includes(c.p.cat)||['evening','night','sunset'].includes(c.p.best))c.w+=1.5});
  if(pt==='오전') cs.forEach(c=>{if(c.p.best==='morning')c.w+=1.5});
  cs=cs.filter(c=>!seen.includes(c.p.id));
  // the roll button looks for the next ? square this die can fill
  if(auto&&!cs.length&&!seen.length&&+gi+1<gs.length) return pRollDo(+gi+1,true);
  const cand=cs.length?pPick(cs):null, spin=!matchMedia('(prefers-reduced-motion:reduce)').matches;
  pSt.draw={day,gi:+gi,g,mood:pSt.mood,seen,cand,left:Math.max(0,cs.length-1),rolling:spin};
  clearTimeout(pSpinT); renderPView();
  if(spin) pSpinT=setTimeout(()=>{if(pSt.draw){pSt.draw.rolling=false;renderPView()}},1100);
}
function learnFrom(p){const t=tagsOf(p.id)[0];if(t&&!kws.some(x=>norm(x)===norm(t))&&kws.length<12){kws.push(t);TRIP.kws.save(kws)}}
function pYes(){const d=pSt.draw; if(!d||!d.cand) return; const c=d.cand; learnFrom(c.p);
  const r=repairOps([{op:'add',day,id:c.p.id,start:fmt(c.arr),dur:c.dur}]); applyOpsCore(r.ops); save();
  diceLog.push({n:c.p.name,d:DAYS[day].iso}); diceLog=diceLog.slice(-60); store.set('gp.dice',diceLog); pSt.draw=null; renderAll();}
function pKeep(){const d=pSt.draw; if(!d||!d.cand) return; if(!isWish(d.cand.p.id)) toggleWish(d.cand.p.id); showToast('내 카드에 넣었어요'); pRollDo(d.gi)}
function pClose(){clearTimeout(pSpinT); pSt.draw=null; renderPView()}
function pMood(k){if(P_DICE.some(v=>v[0]===k)){pSt.mood=k;renderPView()}}
function pAhead(){store.set('gp.pAhead',!pAheadOn()); renderPView()}
async function pAI(){const d=pSt.draw; if(!d) return; const n=await morePlaces(6,'st_pai',`${partOfDay(d.g.s)} 시간대에 하기 좋은 곳`); if(n){d.seen=[];d.cand=null;pRollDo(d.gi)}}

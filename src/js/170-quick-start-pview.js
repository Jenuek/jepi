// ---------- quick start (P, and any one-day course): a few taps ----------
const nextSat=()=>{const d=new Date();const add=(6-d.getDay()+7)%7||7;return isoPlus(d.getDay()===6?0:add)};
// what P모드 and the 가볍게 시작 form show: app/view/pview.ts (the drawn card and the chosen die stay here)
const PVIEW=window.JEPI_UI.view.pview, SLOTS=PVIEW.SLOTS, partQuick=PVIEW.partQuick;
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
  if(norm(dest)!==norm(PK.pack.city)){
    if(sample){if(!(await genPack(dest,'quickStart')))return}
    else{CUR.custom=[];TRIP.save('custom',CUR.custom);CUR.placed=[];save();loadPack(manualPack(dest));savePack()}
  }
  draft.dest=PK.pack.city; if(draft.kind==='day'&&!AREAS[draft.meet.area]) draft.meet.area=firstArea();
  await finishOnb();
}

// ---------- P view: the day as a board game (drawn by React: app/screens/PView.tsx) ----------
// Squares follow the day: start → places (stamped "다녀옴" once done) → ? squares for free time → flag squares for fixed times → end.
// A future day stays closed until its morning, unless "미리 열어서 계획하기" is on. Rolling a die spins a 3D die, then shows a card.
const shortFuzzy=PVIEW.shortFuzzy, partOfDay=PVIEW.partOfDay, P_DICE=PVIEW.P_DICE;
let pSt={mood:'any',draw:null}, pviewRev=0, pSpinT=0;
const pAheadOn=()=>!!store.get('gp.pAhead',false);
const pGaps=()=>PVIEW.pGaps(day);
function renderPView(){
  const box=$('#pview'); if(!box) return;
  const on=jp==='P'; box.hidden=!on; $('.grid-wrap').hidden=on; if(!on) return;
  window.JEPI_UI.mount('pview',box,{...PVIEW.board(day,pSt,{ahead:pAheadOn(),demo:!!DEMO.on,ai:!!sample}),rev:++pviewRev});
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
function learnFrom(p){const t=tagsOf(p.id)[0];if(t)TRIP.keywords.add(t,12)}
function pYes(){const d=pSt.draw; if(!d||!d.cand) return; const c=d.cand; learnFrom(c.p);
  const r=repairOps([{op:'add',day,id:c.p.id,start:fmt(c.arr),dur:c.dur}]); applyOpsCore(r.ops); save();
  diceLog.push({n:c.p.name,d:DY.days[day].iso}); diceLog=diceLog.slice(-60); store.set('gp.dice',diceLog); pSt.draw=null; renderAll();}
function pKeep(){const d=pSt.draw; if(!d||!d.cand) return; if(!isWish(d.cand.p.id)) toggleWish(d.cand.p.id); showToast('내 카드에 넣었어요'); pRollDo(d.gi)}
function pClose(){clearTimeout(pSpinT); pSt.draw=null; renderPView()}
function pMood(k){if(P_DICE.some(v=>v[0]===k)){pSt.mood=k;renderPView()}}
function pAhead(){store.set('gp.pAhead',!pAheadOn()); renderPView()}
async function pAI(){const d=pSt.draw; if(!d) return; const n=await morePlaces(6,'st_pai',`${partOfDay(d.g.s)} 시간대에 하기 좋은 곳`); if(n){d.seen=[];d.cand=null;pRollDo(d.gi)}}
// P모드 장소 탭 (카드 모으기): ask the AI for places to collect, or put one place straight onto the board's next ? square that fits it
async function pAIRec(){const n=await morePlaces(8,'st_pairec','');if(n){renderTray();setSt('st_pairec',`${n}곳을 찾았어요. 아래 "✨ 방금 찾은 곳"에서 ♥ 담기로 모아요.`)}}
function pPlaceNow(id){
  const p=PM[id]; if(!p) return;
  const m0=dice.mood,l0=dice.lunch; dice.mood='any'; dice.lunch=false;
  let hit=null; for(const g of pGaps()){const c=diceCands(g).find(x=>x.p.id===id);if(c){hit=c;break}}
  dice.mood=m0; dice.lunch=l0;
  if(!hit){showToast('이 날 빈 칸에는 맞지 않아요. 내 카드로 담아 두세요.');return}
  const r=repairOps([{op:'add',day,id,start:fmt(hit.arr),dur:hit.dur}]); applyOpsCore(r.ops); save();
  showToast(`${DY.days[day].date||'이 날'} ${shortFuzzy(hit.arr)}에 넣었어요`); renderAll();
}

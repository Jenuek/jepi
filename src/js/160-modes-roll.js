// ---------- J / P modes ----------
function setJP(m,quiet){UI.jp=m==='P'?'P':'J';dock({placeholder:UI.jp==='P'?'뭐 하고 싶어요? 말로 해도 돼요':'AI에게 말로 부탁하기'});document.body.classList.toggle('mode-p',UI.jp==='P');hero({jp:UI.jp});if(!quiet)store.set('gp.jp',UI.jp)}

// ---------- one-day course ----------
// 하루 코스: 여행지 + 언제·어디서 만나요 + 누구와 (drawn by React: TripForms.tsx)
function partsDay(p){const m=p.meet||{};
  return [partDest(p),{f:'day',date:p.dateSet!==false?String(p.startDate??''):'',time:m.time||'11:00',end:m.end||'20:00',area:m.area,areas:optsOf(AREAS)},partParty(p)]}

// ---------- DICE: roll for an empty slot ----------
// what the 🎲 sheet shows and where the dice can land: app/view/dice.ts (the rolls and choices stay here)
const DICEV=window.JEPI_UI.view.dice;
// the 🎲 sheet and the P모드 board (rolling, 이걸로, 코스): app/flow/dice.ts — the rolls and choices live there (DFLOW.st)
const DFLOW=window.JEPI_UI.flow.dice, dice=DFLOW.st.dice, eat=DFLOW.st.eat;
DFLOW.connect({morePlaces:(n,id,f,sig)=>morePlaces(n,id,f,sig),fresh:()=>FRESH,setSt:(id,t)=>setSt(id,t),toast:m=>showToast(m),renderSettings:()=>renderSettings(),
  diceOpenAnim:()=>diceOpenAnim(),saveCourse:()=>saveCourse(),keyBad:()=>KS.bad,demoOn:()=>!!DEMO.on});
const openDiceTab=DFLOW.openDiceTab, diceFromUrl=DFLOW.diceFromUrl, diceAct=DFLOW.diceAct, renderPView=DFLOW.renderPView, pPlaceNow=DFLOW.pPlaceNow, pAIRec=DFLOW.pAIRec, pviewAct=DFLOW.pviewAct;

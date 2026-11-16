// ---------- J / P modes ----------
const setJP=PIECES.setJP, partsDay=PIECES.partsDay;   // J / P, the 하루 코스 form parts
// ---------- DICE: roll for an empty slot ----------
// the 🎲 sheet and the P모드 board (rolling, 이걸로, 코스): app/flow/dice.ts — the rolls and choices live there (DFLOW.st)
const DFLOW=window.JEPI_UI.flow.dice, dice=DFLOW.st.dice;
DFLOW.connect({morePlaces:(n,id,f,sig)=>morePlaces(n,id,f,sig),fresh:()=>FRESH,setSt:(id,t)=>setSt(id,t),toast:m=>showToast(m),renderSettings:()=>renderSettings(),
  diceOpenAnim:()=>diceOpenAnim(),saveCourse:()=>saveCourse(),keyBad:()=>KS.bad,demoOn:()=>!!DEMO.on});
const diceFromUrl=DFLOW.diceFromUrl, diceAct=DFLOW.diceAct, renderPView=DFLOW.renderPView, pviewAct=DFLOW.pviewAct;

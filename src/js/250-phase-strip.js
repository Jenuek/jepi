// ---------- phase strip: before / during / after the trip ----------
// the strip, opening today's plan at start-up, redrawing around the schedule, the 여행 노트: app/flow/phase.ts
const PHASE=window.JEPI_UI.flow.phase;
PHASE.connect({warnTotal:()=>warnTotal(),prepLeft:()=>prepLeft(),renderMore:()=>renderMore(),renderMeRows:()=>renderMeRows(),renderTasteStyle:()=>renderTasteStyle(),autoSave:()=>autoSave()});
PHASE.init();   // the ♥ 담은 곳 button, 이번 여행 / 취향 auto-save and the AI box's seconds start here, as before
const startupFocus=PHASE.startupFocus, renderPlanBtn=PHASE.renderPlanBtn, renderExt=PHASE.renderExt, mapCardAct=PHASE.mapCardAct;

// ---------- 더보기: trip summary, 준비하기 badge, P-mode short menu ----------
// the menu's numbers, 이번 여행's rows and auto-save, 취향's style rows: app/flow/more.ts
const MORE=window.JEPI_UI.flow.more;
MORE.connect({partsDay:p=>partsDay(p),partHomeBox:p=>partHomeBox(p)});
const prepLeft=MORE.prepLeft, warnTotal=MORE.warnTotal, renderMore=MORE.renderMore, renderMeRows=MORE.renderMeRows, meSetBudgetHint=MORE.meSetBudgetHint,
  meSetMsg=MORE.meSetMsg, autoSave=MORE.autoSave, carryTaste=MORE.carryTaste, renderTasteStyle=MORE.renderTasteStyle;

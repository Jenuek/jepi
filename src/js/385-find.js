// ---------- one place-finding screen, many doors ----------
// Every "find places" button opens this same sheet with its conditions already picked:
//   어디 (near today's plan / one area / whole city) · 언제 (a free gap / any time) · 넣을 곳 (schedule / list only)
// Results always come back with the same three choices as chat: 일정에 넣기 / 장소에만 / 안 함.
// Chat and 🎲 DICE keep their own way of asking; only how results are kept is shared.
// the sheet, the AI asking and what happens to each result: app/flow/find.ts
const FINDF=window.JEPI_UI.flow.find;
const openFind=FINDF.openFind, findAct=FINDF.findAct;

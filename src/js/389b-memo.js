// ---------- handwritten memos: one line per block, one line per day ----------
// The rules live in app/logic/memo.ts; the memo box in a block's sheet saves itself (app/screens/Extras.tsx MemoBox).
const memoKey=(it,d)=>JD.logic.memo.blockKey(it.id,d);
const blockMemoOf=(it,d)=>JD.logic.memo.blockMemo(CUR.profile,memoKey(it,d));
const dayMemoOf=d=>JD.logic.memo.dayMemo(CUR.profile,d);
function renderDayMemo(){const m=dayMemoOf(UI.day);hero({memo:m?`“${m}”`:''})}
SHEET_EXTRAS.push(it=>it&&it.id?{k:'memo',key:memoKey(it,UI.day),value:blockMemoOf(it,UI.day)}:null);   // drawn by React: Extras.tsx

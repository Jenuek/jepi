// ---------- optional travel style (every item defaults to "doesn't matter") ----------
const STYLE_ROWS=JD.days.STYLE_ROWS;   // app/data/days.ts
const STY=TV.STY;   // app/data/traveler.ts
const styleEn=TV.styleEn;   // app/data/traveler.ts
let styleOpen=false;
const walkKm=()=>JD.check.walkKm();   // app/data/check.ts

// ---------- optional money budget (per person, in 만원) ----------
const budgetParts=TV.budgetParts;   // app/data/traveler.ts
const roomCap=TV.roomCap;   // app/data/traveler.ts
// 이번 여행 → 예산 (drawn by React: TripForms.tsx Budget). The hint under it follows what is typed (meSetBudgetHint).
function partBudget(p){return {f:'budget',man:p.budgetMan||'',trip:p.tripMan||'',local:p.localMan||'',hint:budgetHintTxt(p)}}
function budgetHintTxt(p){const b=budgetParts(p);return b?`교통·숙박 약 ${won(b.trip)} · 현지 경비 하루 약 ${won(b.daily)}로 계산해요.`:'총예산만 넣으면 교통·숙박 60%, 현지 경비 40%로 나눠요.'}
const budgetEn=TV.budgetEn;   // app/data/traveler.ts


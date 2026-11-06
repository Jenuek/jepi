// ---------- optional travel style (every item defaults to "doesn't matter") ----------
const STYLE_ROWS=JD.days.STYLE_ROWS;   // app/data/days.ts
let styleOpen=false;

// ---------- optional money budget (per person, in 만원) ----------
const budgetParts=TV.budgetParts;   // app/data/traveler.ts
const roomCap=TV.roomCap;   // app/data/traveler.ts
// 이번 여행 → 예산 (drawn by React: TripForms.tsx Budget). The hint under it follows what is typed (meSetBudgetHint).
const budgetHintTxt=FORMS.budgetHint;   // app/view/forms.ts


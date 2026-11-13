// ---------- 🎲 뭐 하지 → 📌 이 코스 저장: a new 하루 코스 plan: app/flow/course.ts (the rolling itself: app/flow/dice.ts) ----------
const COURSE=window.JEPI_UI.flow.course;
COURSE.connect({carryTaste:(a,b)=>carryTaste(a,b)});
const saveCourse=COURSE.saveCourse;

// ---------- helpers ----------
const $=s=>document.querySelector(s);
// time text, distances and the day check live in app/logic (JD.logic)
const fmt=JD.logic.time.fmt;
// travel between places, opening hours and the day check: app/data/check.ts
const CK=JD.check, travel=CK.travel;

const dayItems=JD.days.dayItems;   // app/data/days.ts: fixed blocks + my blocks of a day
const analyze=CK.analyze;


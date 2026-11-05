// ---------- helpers ----------
const $=s=>document.querySelector(s);
// time text, distances and the day check live in app/logic (JD.logic)
const fmt=JD.logic.time.fmt, parse=JD.logic.time.parse;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const km=JD.logic.geo.km;
// travel between places, opening hours and the day check: app/data/check.ts
const CK=JD.check, travelEst=CK.travelEst, travel=CK.travel, hoursFor=CK.hoursFor, closedOn=CK.closedOn;

const dayItems=JD.days.dayItems;   // app/data/days.ts: fixed blocks + my blocks of a day
const analyze=CK.analyze, gapsOf=CK.gapsOf;


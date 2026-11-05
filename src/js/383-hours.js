// ---------- 영업시간: real opening hours from Google Places (abroad), AI estimate in Korea ----------
// The lookups, the 30-day cache and the monthly cap live in app/data/hours.ts (rules: app/logic/hours.ts). Here: the trip side.
const HOURS_CAP=JD.hours.CAP, hoursUse=add=>JD.hours.used(add), hoursSweep=()=>JD.hours.sweep();
JD.hours.connectHours({placesOnSchedule:()=>[...new Set(placed.map(b=>b.id))].map(id=>PM[id]).filter(Boolean),googleKey:()=>KEYS.gmaps||'',keyBad:()=>isBad('gmaps'),
  demo:()=>!!DEMO.on,inKorea:ll=>inKR(ll),city:()=>PACK.city||'',changed(){savePack();TRIP.customs.saved();renderAll();touchPlan()}});

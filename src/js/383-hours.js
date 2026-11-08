// ---------- 영업시간: real opening hours from Google Places (abroad), AI estimate in Korea ----------
// The lookups, the 30-day cache and the monthly cap live in app/data/hours.ts (rules: app/logic/hours.ts). Here: the trip side.
const HOURS_CAP=JD.hours.CAP, hoursUse=add=>JD.hours.used(add), hoursSweep=()=>JD.hours.sweep();
JD.hours.connectHours({placesOnSchedule:()=>[...new Set(CUR.placed.map(b=>b.id))].map(id=>PM[id]).filter(Boolean),googleKey:()=>KEYS.gmaps||'',keyBad:()=>isBad('gmaps'),
  demo:()=>!!DEMO.on,inKorea:ll=>inKR(ll),city:()=>PK.pack.city||'',changed(){savePack();TRIP.customs.saved();renderAll();touchPlan()}});
// 장소 검색 (app/data/gplaces.ts): 어느 키로 찾을지만 여기서 알려 줘요
JD.gplaces.connectGPlaces({googleKey:()=>KEYS.gmaps||'',googleBad:()=>isBad('gmaps'),kakaoKey:()=>KEYS.kakao||'',kakaoBad:()=>isBad('kakao')});

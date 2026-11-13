// ---------- profile: trip facts entered by the viewer ----------
const PROFILE_EXAMPLE=JD.plans.PROFILE_EXAMPLE;   // app/data/plans.ts
const clone=o=>JSON.parse(JSON.stringify(o));
// dates, tidying 여행 정보 and making the days with their fixed blocks: app/data/days.ts (the days themselves: DY.days …)
const fixProfile=JD.days.fixProfile, buildDays=JD.days.buildDays;


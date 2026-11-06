// ---------- profile: trip facts entered by the viewer ----------
const PROFILE_EXAMPLE={dest:'도쿄',mode:'flight',local:'transit',startDate:'2026-11-07',nights:3,out:{airport:'hnd',dep:'08:15',arr:'10:20',flight:''},back:{airport:'hnd',dep:'19:30',arr:'22:05',flight:''},home:{area:'',min:60,fare:1550,byMin:120},stays:[{name:'시부야 숙소',area:'shibuya',checkin:'15:00',checkout:'11:00',from:0,to:3}],events:[],purpose:'',pace:'slow',social:'some',breakfast:false};
const clone=o=>JSON.parse(JSON.stringify(o));
const apName=k=>(AIRPORTS[k]||AIRPORTS[firstGw()]).name;
// dates, tidying 여행 정보 and making the days with their fixed blocks: app/data/days.ts (the days themselves: DY.days …)
const fixProfile=JD.days.fixProfile, buildDays=JD.days.buildDays;


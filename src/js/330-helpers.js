// ---------- helpers ----------
const $=s=>document.querySelector(s);
// time text, distances and the day check live in app/logic (JD.logic)
const fmt=JD.logic.time.fmt, parse=JD.logic.time.parse;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const km=JD.logic.geo.km;
function travelEst(a,b){ if(!a||!b) return null;
  return JD.logic.geo.travelGuess(a,b,{car:!!(CUR.profile&&CUR.profile.local==='car'),transitName:(PK.pack&&PK.pack.transit)||'대중교통',walkKm:walkKm(),gateway:gwNear(a)||gwNear(b)}); }
function travel(a,b){const e=travelEst(a,b); if(!e) return e;
  const m=e.mode==='도보'?'walk':e.mode==='차'?'car':'transit'; const r=routeGet(m,a,b);
  if(!r) return Object.assign({},e,{est:routeProvider(a,b)?true:false,guess:true});
  return {mode:r.label||e.mode,min:r.min,real:true,lines:r.lines||'',tf:r.tf||0,fare:r.fare,cur:r.cur||'',poly:r.poly}}
const hoursFor=(p,wd)=>p.always?null:((p.hoursBy&&p.hoursBy[wd])||p.hours);
const closedOn=(p,wd)=>!!(p.closed&&p.closed.includes(wd));

const dayItems=JD.days.dayItems;   // app/data/days.ts: fixed blocks + my blocks of a day
// the day check (app/logic/schedule.ts): this builds the day's items and says what the check needs to know
function analyze(d){
  const items=dayItems(d), wd=DY.days[d].wd, MW=markWarnings().W, L=DY.loc[DY.days[d].startLoc];
  const trans=JD.logic.schedule.checkDay(items,{firstDay:d===0,start:{ll:L.ll,name:L.name},dayStart:DAY_START,wdName:WD[wd],iso:DY.days[d].iso,
    kidsInParty:CUR.profile.party.kids>0,currency:PK.pack.currency||'',marksOf,hasMark,markWarnings:uid=>MW.get(d+':'+uid)||[],
    closed:p=>closedOn(p,wd),outOfSeason:p=>outOfSeason(p,DY.days[d].iso)?`${mdTxt(p.dates[0])||'?'}~${mdTxt(p.dates[1])||'?'}`:null,
    tips:bestTips,hours:p=>hoursFor(p,wd),travel,fare:fareOf,nav:navLink,fmt});
  return {items,trans};
}
function gapsOf(d){return JD.logic.schedule.gaps(dayItems(d),d===0?arrEnd():480)}


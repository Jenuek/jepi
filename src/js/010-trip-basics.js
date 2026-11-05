const WD=['일','월','화','수','목','금','토'];
const DAY_START=7*60, DAY_END=24*60;
let LOC={};
// the destination's lists (app/data/places.ts — the same objects, filled again when a destination opens; tokyo.ts until then)
const PLC=JD.places, PK=PLC.state;
const AIRPORTS=PLC.AIRPORTS, AREAS=PLC.AREAS, AREA_ZONE=PLC.AREA_ZONE, CATS=PLC.CATS, ZONES=PLC.ZONES, ZONE_OF=PLC.ZONE_OF,
  P=PLC.P, PM=PLC.PM, COST=PLC.COST, TAGS=PLC.TAGS, MUST=PLC.MUST, STATIC_CHECKS=PLC.STATIC_CHECKS;
let LOC_AREA={};
let LOC_ZONE={};
const dayStart=d=>d===0?((typeof CUR.profile!=='undefined'&&CUR.profile&&CUR.profile.kind==='day')?Math.max(360,tmin(CUR.profile.meet.time,660)-60):240):((typeof CUR.profile!=='undefined'&&CUR.profile&&CUR.profile.style&&CUR.profile.style.rhythm==='late')?600:420);
let GMP_BY=360; // when to be at the home airport, from the profile
const durTxt=JD.logic.time.durTxt;   // app/logic/time.ts
let DAYS=[];
const costOf=PLC.costOf;
const DEFAULT_KW=[];
const tagsOf=PLC.tagsOf;
const mustOf=PLC.mustOf;
const norm=JD.logic.places.norm;   // app/logic/places.ts
let KRW_PER_JPY=8.4; // 100엔 = 약 840원 (2026-10-28 기준)
const yen=n=>((PK.pack&&PK.pack.symbol)||'¥')+Math.round(n).toLocaleString('ko-KR');
const won=n=>'₩'+(Math.round(n/10)*10).toLocaleString('ko-KR');
// IC card fare estimate: walking free, Haneda links ~650 yen, city trains 180–360 yen by distance
function gwNear(x){for(const k in AIRPORTS){const g=AIRPORTS[k];if(km(x,g.ll)<2)return g}return null}
function fareOf(a,b,mode){
  if(mode==='도보'||mode==='차') return 0;
  const g=gwNear(a)||gwNear(b); if(g&&g.fare!=null&&km(a,b)>3) return g.fare;
  const f=(PK.pack&&PK.pack.fare)||{base:0,perKm:0,max:0}; let v=f.base+Math.max(0,km(a,b)-4)*f.perKm; if(f.max>0) v=Math.min(f.max,v);
  return f.base>=50?Math.round(v/10)*10:Math.round(v*10)/10;
}
const DEFAULT=[];

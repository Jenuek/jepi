const WD=['일','월','화','수','목','금','토'];
const DAY_START=7*60, DAY_END=24*60;
DY.loc={};
// the destination's lists (app/data/places.ts — the same objects, filled again when a destination opens; tokyo.ts until then)
const PLC=JD.places, PK=PLC.state;
const AIRPORTS=PLC.AIRPORTS, AREAS=PLC.AREAS, AREA_ZONE=PLC.AREA_ZONE, CATS=PLC.CATS, ZONES=PLC.ZONES, ZONE_OF=PLC.ZONE_OF,
  P=PLC.P, PM=PLC.PM, COST=PLC.COST, TAGS=PLC.TAGS, MUST=PLC.MUST, STATIC_CHECKS=PLC.STATIC_CHECKS;
DY.locArea={};
DY.locZone={};
const dayStart=JD.days.dayStart;   // app/data/days.ts
DY.gmpBy=360; // when to be at the home airport, from the profile
const durTxt=JD.logic.time.durTxt;   // app/logic/time.ts
DY.days=[];
const costOf=PLC.costOf;
const DEFAULT_KW=[];
const tagsOf=PLC.tagsOf;
const mustOf=PLC.mustOf;
const norm=JD.logic.places.norm;   // app/logic/places.ts
const yen=TV.yen;   // app/data/traveler.ts
const won=TV.won;   // app/data/traveler.ts
// the fare of a trip, and an airport / station nearby: app/data/check.ts
const gwNear=x=>JD.check.gwNear(x), fareOf=(a,b,mode)=>JD.check.fareOf(a,b,mode);
const DEFAULT=[];

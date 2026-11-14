const WD=['일','월','화','수','목','금','토'];
DY.loc={};
// the destination's lists (app/data/places.ts — the same objects, filled again when a destination opens; tokyo.ts until then)
const PLC=JD.places, PK=PLC.state;
const AREAS=PLC.AREAS, CATS=PLC.CATS, P=PLC.P, PM=PLC.PM;
DY.locArea={};
DY.locZone={};
const dayStart=JD.days.dayStart;   // app/data/days.ts
DY.gmpBy=360; // when to be at the home airport, from the profile
const durTxt=JD.logic.time.durTxt;   // app/logic/time.ts
DY.days=[];
const DEFAULT_KW=[];
const norm=JD.logic.places.norm;   // app/logic/places.ts
const yen=TV.yen;   // app/data/traveler.ts
const DEFAULT=[];

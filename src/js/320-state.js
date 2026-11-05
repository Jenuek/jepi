// ---------- state ----------
const store=JD.storage; // same as LS (app/data/storage.ts)
loadPack(packFrom(store.get('gp.pack',null))||blankPack());
CUR.profile=TRIP.load('profile',null); const firstRun=!CUR.profile||typeof CUR.profile!=='object'; if(firstRun){CUR.profile=clone(PROFILE_EXAMPLE);Object.assign(CUR.profile,{dest:'',pace:'normal',social:'some',breakfast:true,purpose:'',party:{type:'solo',adults:1,kids:0},flightSet:false,staySet:false,dateSet:false,nightsSet:false,dateUnknown:false,startDate:isoPlus(30)});CUR.profile.stays[0].name='숙소'}
CUR.custom=TRIP.load('custom',[]); if(!Array.isArray(CUR.custom)) CUR.custom=[]; CUR.custom.forEach(addCustomToData);
CUR.placed=TRIP.load('placed',null);
if(!Array.isArray(CUR.placed)) CUR.placed=DEFAULT.map(b=>({...b}));
CUR.placed=CUR.placed.filter(b=>PM[b.id]).map(b=>({uid:TRIP.uids.next(),id:b.id,day:b.day,start:b.start,dur:b.dur||PM[b.id].dur,mk:Array.isArray(b.mk)?b.mk.filter(m=>MARKS[m]):undefined}));
CUR.fmarks=TRIP.load('fmarks',{}); diceLog=store.get('gp.dice',[]); if(!Array.isArray(diceLog)) diceLog=[]; CUR.wish=TRIP.load('wish',[]); if(!Array.isArray(CUR.wish)) CUR.wish=[]; if(!CUR.fmarks||typeof CUR.fmarks!=='object') CUR.fmarks={};
CUR.done=TRIP.load('done',{});
DY.homeMin=60;
CUR.kws=TRIP.kws.load(); if(!Array.isArray(CUR.kws)) CUR.kws=DEFAULT_KW.slice();
const matchKw=id=>{const set=new Set(CUR.kws.map(norm));return tagsOf(id).filter(t=>set.has(norm(t)))};
CUR.meals=TRIP.load('meals',{}); if(!CUR.meals||typeof CUR.meals!=='object') CUR.meals={};
const mealOf=d=>CUR.meals[d]!=null?+CUR.meals[d]:(PK.pack.snack||1000);
let day=0, tab='timeline', cat='all', selected=null, aiState=null, sample=null, group='zone', zoneOpen={}, resetArm=false;
// changes to the trip happen in app/data/trip.ts (TRIP.blocks / wish / toggleMark …); not while an AI check tries them out on a copy,
// and blocks first keep the places other travelers shared that they use
TRIP.connectSaving(part=>{if(OPS.state.dry)return false;if(part==='placed')keepShared();return true});
const save=()=>TRIP.blocks.saved();   // saved without uids


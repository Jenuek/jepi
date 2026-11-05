// ---------- state ----------
const store=JD.storage; // same as LS (app/data/storage.ts)
loadPack(packFrom(store.get('gp.pack',null))||blankPack());
let profile=TRIP.load('profile',null); const firstRun=!profile||typeof profile!=='object'; if(firstRun){profile=clone(PROFILE_EXAMPLE);Object.assign(profile,{dest:'',pace:'normal',social:'some',breakfast:true,purpose:'',party:{type:'solo',adults:1,kids:0},flightSet:false,staySet:false,dateSet:false,nightsSet:false,dateUnknown:false,startDate:isoPlus(30)});profile.stays[0].name='숙소'}
let custom=TRIP.load('custom',[]); if(!Array.isArray(custom)) custom=[]; custom.forEach(addCustomToData);
let placed=TRIP.load('placed',null);
if(!Array.isArray(placed)) placed=DEFAULT.map(b=>({...b}));
placed=placed.filter(b=>PM[b.id]).map(b=>({uid:TRIP.uids.next(),id:b.id,day:b.day,start:b.start,dur:b.dur||PM[b.id].dur,mk:Array.isArray(b.mk)?b.mk.filter(m=>MARKS[m]):undefined}));
fmarks=TRIP.load('fmarks',{}); diceLog=store.get('gp.dice',[]); if(!Array.isArray(diceLog)) diceLog=[]; wish=TRIP.load('wish',[]); if(!Array.isArray(wish)) wish=[]; if(!fmarks||typeof fmarks!=='object') fmarks={};
let done=TRIP.load('done',{});
let homeMin=60;
let kws=TRIP.kws.load(); if(!Array.isArray(kws)) kws=DEFAULT_KW.slice();
const matchKw=id=>{const set=new Set(kws.map(norm));return tagsOf(id).filter(t=>set.has(norm(t)))};
let meals=TRIP.load('meals',{}); if(!meals||typeof meals!=='object') meals={};
const mealOf=d=>meals[d]!=null?+meals[d]:(PACK.snack||1000);
// React reads the live copies through TRIP.get(part) (app/data/trip.ts)
TRIP.connect({profile:()=>profile,placed:()=>placed,custom:()=>custom,fmarks:()=>fmarks,wish:()=>wish,meals:()=>meals,done:()=>done,kws:()=>kws});
let day=0, tab='timeline', cat='all', selected=null, aiState=null, sample=null, group='zone', zoneOpen={}, resetArm=false;
// changes to the trip happen in app/data/trip.ts (TRIP.blocks / wish / toggleMark …); not while an AI check tries them out on a copy,
// and blocks first keep the places other travelers shared that they use
TRIP.connectSaving(part=>{if(DRY)return false;if(part==='placed')keepShared();return true});
const save=()=>TRIP.blocks.saved();   // saved without uids


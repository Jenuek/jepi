// ---------- state ----------
const store=JD.storage; // same as LS (app/data/storage.ts)
let uidN=1;
loadPack(packFrom(store.get('gp.pack',null))||blankPack());
let profile=store.get('gp.profile',null); const firstRun=!profile||typeof profile!=='object'; if(firstRun){profile=clone(PROFILE_EXAMPLE);Object.assign(profile,{dest:'',pace:'normal',social:'some',breakfast:true,purpose:'',party:{type:'solo',adults:1,kids:0},flightSet:false,staySet:false,dateSet:false,nightsSet:false,dateUnknown:false,startDate:isoPlus(30)});profile.stays[0].name='숙소'}
let custom=store.get('gp.custom',[]); if(!Array.isArray(custom)) custom=[]; custom.forEach(addCustomToData);
let placed=store.get('gp.placed3',null);
if(!Array.isArray(placed)) placed=DEFAULT.map(b=>({...b}));
placed=placed.filter(b=>PM[b.id]).map(b=>({uid:'u'+(uidN++),id:b.id,day:b.day,start:b.start,dur:b.dur||PM[b.id].dur,mk:Array.isArray(b.mk)?b.mk.filter(m=>MARKS[m]):undefined}));
fmarks=store.get('gp.fmarks',{}); diceLog=store.get('gp.dice',[]); if(!Array.isArray(diceLog)) diceLog=[]; wish=store.get('gp.wish',[]); if(!Array.isArray(wish)) wish=[]; if(!fmarks||typeof fmarks!=='object') fmarks={};
let done=store.get('gp.done',{});
let homeMin=60;
let kws=store.get('gp.kw',null); if(!Array.isArray(kws)) kws=DEFAULT_KW.slice();
const matchKw=id=>{const set=new Set(kws.map(norm));return tagsOf(id).filter(t=>set.has(norm(t)))};
let meals=store.get('gp.meal2',{}); if(!meals||typeof meals!=='object') meals={};
const mealOf=d=>meals[d]!=null?+meals[d]:(PACK.snack||1000);
let day=0, tab='timeline', cat='all', selected=null, aiState=null, sample=null, group='zone', zoneOpen={}, resetArm=false;
const save=()=>{if(DRY)return;keepShared();return store.set('gp.placed3',placed.map(({id,day,start,dur,mk})=>mk&&mk.length?{id,day,start,dur,mk}:{id,day,start,dur}))};


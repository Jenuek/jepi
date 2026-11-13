// 📌 이 코스 저장 (🎲 뭐 하지 → a course): the course becomes a new 하루 코스 plan with its own small destination, then opens.
// (It used to be saveCourse in src/js/290-dice-do.js.)
import * as trip from '../data/trip';
import * as PLC from '../data/places';
import * as PLANS from '../data/plans';
import { inKorea } from '../logic/geo';
import { fmt } from '../logic/time';
import { ui } from '../ui/state';
import { st } from './dice';
import * as R from './render';
import * as PLF from './plans';
import { showToast } from './share';

/** what the old code still does */
export interface Legacy { carryTaste(from: any, to: any): void }
let L: Legacy;
export function connect(l: Legacy): void { L = l }

const CUR = trip.cur as any, PL = trip.planList as any, doS = st.doS;
const clone = (o: any) => JSON.parse(JSON.stringify(o));
const isoOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const PROFILE_EXAMPLE = PLANS.PROFILE_EXAMPLE;

export function catOfItem(x?: any){if(x.type==='meal'||x.type==='cafe')return 'food';if(x.type==='night')return 'night';const f=x.full+' '+x.name;
  return /미술|갤러리|전시|박물관/.test(f)?'art':/서점|쇼핑|상가|백화점|시장/.test(f)?'shop':/공연|콘서트|라이브|영화/.test(f)?'music':'walk'}
export function saveCourse(){
  const c=doS.course; if(!c||!c.length) return;
  const areaName=doS.base==='area'&&doS.area?doS.area.name:(doS.where==='지금 위치'?'내 주변':doS.where+' 주변'), ll=doS.origin, stamp=Date.now().toString(36);
  const places=c.map((x: any,i: any)=>({id:'g'+stamp+i,name:x.name,local:'',cat:catOfItem(x),area:areaName,ll:x.ll,dur:x.dur,always:true,closed:[],note:[x.cat,x.addr].filter(Boolean).join(' · '),verify:'영업시간',check:'',drop:false,cost:[0,''],tags:[],zone:'center',must:'',cash:false,best:'any',ai:true}));
  const pack=Object.assign(PLC.manualPack(areaName),{manual:false,intl:!inKorea(ll),areas:[{key:'center',name:areaName,lat:ll[0],lng:ll[1],zone:'center'}],places});
  const last=c[c.length-1], today=isoOf(new Date());
  const prof=clone(PROFILE_EXAMPLE);
  Object.assign(prof,{kind:'day',dest:areaName,startDate:today,nights:1,meet:{time:fmt(Math.max(0,c[0].start-c[0].walk)),end:fmt(Math.min(1439,last.start+last.dur+15)),area:'center'},
    dateSet:true,nightsSet:true,dateUnknown:false,bookedFlight:true,bookedStay:true,flightSet:true,staySet:true,jpPicked:true,startMode:'day',purpose:'',
    party:{type:'solo',adults:1,kids:0},stays:[{name:'숙소',area:'center',checkin:'15:00',checkout:'11:00',from:0,to:1}],events:[]});
  L.carryTaste(CUR.profile,prof); if(CUR.profile&&CUR.profile.party) prof.party=clone(CUR.profile.party);
  const data={profile:prof,pack,placed:places.map((p: any,i: any)=>({id:p.id,day:0,start:c[i].start,dur:c[i].dur})),custom:[],fmarks:{},wish:[],meals:{},done:{}};
  PLF.snapshotCurrent(); const nid='p'+Date.now().toString(36);
  trip.plans.put(nid,data); PL.plans.unshift({id:nid,name:`${areaName} · ${+today.slice(5,7)}/${+today.slice(8,10)} ${fmt(c[0].start)} 코스`,custom_name:true,updated:Date.now(),kind:'day',dates:today.slice(5).replace('-','/'),blocks:places.length});
  PL.curPlan=nid; PLF.savePlans(); R.closeSheet(); PLF.applyPlanData(data); PLF.snapshotCurrent(); ui.day=0; ui.tab='timeline'; R.renderTabs(); R.renderAll();
  showToast('내 계획에 저장했어요 · 일정과 지도에서 볼 수 있어요');
}

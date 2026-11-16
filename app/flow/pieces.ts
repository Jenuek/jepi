// Small pieces of the trip screens: switching J / P, the 하루 코스 form parts, 가볍게 시작 (a few taps → a trip or a day),
// the block that closes a 할 일 표시 (짐 찾기, 반납 …), redrawing once routes arrive, what 내 장소 shows, and 오가는 길 →
// 출발지 (집). (They used to be in src/js/160, 170, 080, 200, 270 and 280.)
import * as trip from '../data/trip';
import * as places from '../data/places';
import * as storage from '../data/storage';
import * as keysData from '../data/keys';
import * as myplaces from '../data/myplaces';
import { PAIRS } from '../data/marks';
import { dayItems, dayStart } from '../data/days';
import { fmt } from '../logic/time';
import { norm } from '../logic/places';
import { ui } from '../ui/state';
import { setSt } from '../ui/status';
import * as MAP from '../ui/map';
import * as FORMS from '../view/forms';
import * as PVIEW from '../view/pview';
import { fs, isoPlus, finishOnb } from './forms';
import { partDest, genPack } from './destination';
import { dock } from './chat';
import { hero } from './look';
import * as RND from './render';

const $ = (s: string) => document.querySelector(s) as any;
const CUR = trip.cur as any, PK = places.state as any, AREAS = places.AREAS as any, KEYS = keysData.list as any, MYP = myplaces.list as any[];
const mypOf = (id: string): any => myplaces.of(id);
const SLOTS = PVIEW.SLOTS;

export function setJP(m?: any, quiet?: any){ui.jp=m==='P'?'P':'J';dock({placeholder:ui.jp==='P'?'뭐 하고 싶어요? 말로 해도 돼요':'AI에게 말로 부탁하기'});document.body.classList.toggle('mode-p',ui.jp==='P');hero({jp:ui.jp});if(!quiet)storage.set('gp.jp',ui.jp)}

// ---------- one-day course ----------
// 하루 코스: 여행지 + 언제·어디서 만나요 + 누구와 (drawn by React: TripForms.tsx)
export function partsDay(p?: any){const m=p.meet||{};
  return [partDest(p),{f:'day',date:p.dateSet!==false?String(p.startDate??''):'',time:m.time||'11:00',end:m.end||'20:00',area:m.area,areas:FORMS.optsOf(AREAS)},FORMS.party(p)]}

const nextSat=()=>{const d=new Date();const add=(6-d.getDay()+7)%7||7;return isoPlus(d.getDay()===6?0:add)};
export async function quickStart(){
  const q=fs.draft.q||{}, dest=String(fs.draft.dest||'').trim();
  if(!dest){setSt('st_pack','어디로 갈지 적어 주세요.');return}
  if(!q.when||(q.when==='pick'&&fs.draft.dateSet===false)){setSt('st_pack','언제 갈지 골라 주세요.');return}
  if(q.len===''||q.len==null){setSt('st_pack','얼마나 갈지 골라 주세요.');return}
  if(q.when!=='pick'){fs.draft.startDate=q.when==='today'?isoPlus(0):q.when==='tomorrow'?isoPlus(1):nextSat();}
  fs.draft.dateSet=true; fs.draft.dateUnknown=false; fs.draft.nightsSet=true;
  if(q.len==='0'){const sl=SLOTS.find((s: any)=>s[0]===q.slot)||SLOTS[1];let st=sl[2];
    if(q.when==='today'){const n=new Date(),now=n.getHours()*60+n.getMinutes();if(now+30>st)st=Math.min(1320,Math.ceil((now+30)/30)*30)}
    fs.draft.kind='day'; fs.draft.meet=Object.assign({},fs.draft.meet||{},{time:fmt(st),end:fmt(Math.max(st+180,sl[3]))});}
  else{fs.draft.kind='trip'; fs.draft.nights=+q.len; fs.draft.bookedFlight=true; fs.draft.bookedStay=true; fs.draft.flightSet=false; fs.draft.staySet=false;}
  if(norm(dest)!==norm(PK.pack.city)){
    if(ui.sample){if(!(await genPack(dest,'quickStart')))return}
    else{CUR.custom=[];trip.save('custom',CUR.custom);CUR.placed=[];trip.blocks.saved();places.loadPack(places.manualPack(dest));places.savePack()}
  }
  fs.draft.dest=PK.pack.city; if(fs.draft.kind==='day'&&!AREAS[fs.draft.meet.area]) fs.draft.meet.area=places.firstArea();
  await finishOnb();
}
export function makePairBlock(uid?: any, T?: any){
  const it=dayItems(ui.day).find((x: any)=>x.uid===uid); if(!it) return;
  // put the closing block before the next block that needs it (lodging, airport) or late in the day
  const d=ui.day; let start;
  const nx=dayItems(d).find((x: any)=>x.start>it.end&&x.kind==='fixed'&&(x.uid==='f7'||/^ci|^co|^ev/.test(x.uid)));
  if(T==='wait') start=it.end+60;
  else if(nx) start=nx.start-PAIRS[T].dur-30;
  else start=Math.min(1350,Math.max(it.end+60,1230));
  start=Math.max(dayStart(d),Math.min(1410,Math.round(start/15)*15));
  const c={id:'c'+Date.now().toString(36),name:`${PAIRS[T].pair} · ${it.name.replace(/ \(.*\)$/,'')}`.slice(0,40),area:places.nearestArea(it.ll)||places.firstArea(),cat:T==='wait'?'food':'trip',dur:PAIRS[T].dur,cost:0,memo:`${it.name}에서 시작한 일을 마무리해요.`,tags:'',drop:false,ll:it.ll};
  trip.customs.put(c); places.addCustom(c);
  trip.blocks.add({id:c.id,day:d,start,dur:c.dur,mk:[T+'-']});
  ui.day=d; RND.closeSheet(); RND.renderAll();
}

let rdT=0;
export function routeDirty(){clearTimeout(rdT);rdT=setTimeout(()=>{
  const ae=document.activeElement; if(ae&&/^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)){routeDirty();return}
  if(!$('#onb').hidden||!$('#sheetBg').hidden){routeDirty();return}
  RND.renderAll(); if(MAP.state.on) MAP.drawMap();
},600)}
// what the section shows
export function mypView(){const u=myplaces.ui;return {places:MYP.map((x: any)=>({id:x.id,name:x.name,ll:x.ll||null,addr:x.addr||''})),editing:u.edit,msg:u.msg||'',
  hits:u.hits.map((h: any)=>({name:h.name,addr:h.addr})),hasKakao:!!KEYS.kakao}}
export const KR_AIR={gmp:['김포공항 국제선',37.5583,126.7906],icn1:['인천공항 T1',37.4492,126.4510],icn2:['인천공항 T2',37.4602,126.4407]};
// 오가는 길 → 출발지 (drawn by React: TripForms.tsx HomeBox)
export function partHomeBox(p?: any){if(p.mode==='car')return null;const h=mypOf('home');
  return {f:'homeBox',hasHome:!!(h&&h.ll),addr:(h&&h.addr)||'',using:!!p.home.ll,kakao:KEYS.kakao?Object.entries(KR_AIR).map(([k,a]: any)=>[k,a[0]]):[],msg:fs.homeMsg}}

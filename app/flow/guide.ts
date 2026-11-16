// 모두 초기화 (wipe everything this browser keeps for JEPI, then a fresh start) and the four-step first-use guide (the
// bubble is Frames.tsx Coach; the rest of the help is 더보기 → 사용 안내). (It used to be src/js/370-reset-guide.js.)
import * as trip from '../data/trip';
import * as places from '../data/places';
import * as storage from '../data/storage';
import { PROFILE_EXAMPLE } from '../data/plans';
import { buildDays } from '../data/days';
import { ui } from '../ui/state';
import { cs } from './chat';
import { hs, helperShow, helperOpen } from './helper';
import { ks } from './settings';
import * as FF from './forms';
import * as PLF from './plans';
import * as RND from './render';

const $ = (s: string) => document.querySelector(s) as any;
const mount = (name: string, el: Element, props: any) => (window.JEPI_UI.mount as any)(name, el, props);
const CUR = trip.cur as any, PL = trip.planList as any;
const clone = (o: any) => JSON.parse(JSON.stringify(o));

export function wipeAll(){
  ['profile','pack','placed3','custom','kw','meal2','done','fmarks','wish','coach','dice','jp'].forEach((k: any)=>storage.del('gp.'+k));
  PL.plans.forEach((p: any)=>trip.plans.del(p.id)); PL.plans=[]; PL.curPlan='p'+Date.now().toString(36); PLF.savePlans();
  CUR.custom=[]; CUR.placed=[]; CUR.fmarks={}; CUR.wish=[]; CUR.kws=[]; CUR.meals={}; CUR.done={}; cs.chat=[]; cs.undoSnap=null; ui.aiState=null; ui.selected=null; hs.vibe=null; ks.wipeArm=false;
  places.loadPack(places.blankPack()); places.savePack();
  CUR.profile=clone(PROFILE_EXAMPLE); Object.assign(CUR.profile,{stays:[{name:'숙소',area:'center',checkin:'15:00',checkout:'11:00',from:0,to:3}],events:[],dest:'',pace:'normal',social:'some',breakfast:true,purpose:'',party:{type:'solo',adults:1,kids:0},flightSet:false,staySet:false,dateSet:false,nightsSet:false,dateUnknown:false,startDate:FF.isoPlus(30)}); CUR.profile.stays[0].name='숙소';
  buildDays(); ui.day=0; ui.tab='timeline'; helperShow(false); RND.closeSheet(); RND.renderAll(); FF.openOnb();
}
// ---------- first-use guide ----------
// first-use guide: four steps only; everything else is in 더보기 → 사용 안내 (387-help.js)
export const COACH=[{sel:'#grid',t:'일정표예요. 빈 시간을 누르면 앞뒤 일정과 가까운 장소를 골라 넣을 수 있어요.'},
  {sel:'#grid .blk',t:'블록을 누르면 시간을 옮기거나, 대안을 보거나, 🔔 알림을 켤 수 있어요.'},
  {sel:'#diceFab',t:'고민될 땐 🎲. 빈 시간에 할 일이나 오늘 메뉴를 무작위로 골라 줘요.'},
  {sel:'#chatForm',t:'말로 부탁해도 돼요. 바꿀 내용을 먼저 보여 주고, 확인한 뒤에 적용해요. 자세한 사용법은 더보기 → 사용 안내에 있어요.'}];
// the bubble is drawn by React (app/screens/Frames.tsx) from coachView
let coachView: any={open:false,i:undefined,text:'',step:'',last:false};
export function drawCoach(){mount('coach',$('#coachMount'),coachView)}
export function coachAct(n?: any){if(n==='next')showCoach(+coachView.i+1);else if(n==='skip')showCoach(COACH.length)}
export function showCoach(i?: any){
  document.querySelectorAll('.coach-hl').forEach((e: any)=>e.classList.remove('coach-hl'));
  if(i>=COACH.length){coachView={...coachView,open:false};drawCoach();storage.set('gp.coach',1);return}
  if(!matchMedia('(min-width:900px)').matches&&ui.tab!=='timeline'){ui.tab='timeline';RND.renderTabs()}
  let el: any=document.querySelector(COACH[i].sel); if(COACH[i].sel==='#grid'&&ui.jp==='P') el=document.querySelector('#pview'); if(COACH[i].sel==='#grid .blk'&&ui.jp==='P') el=document.querySelector('#pview .sq'); if(!el||!el.offsetParent){showCoach(i+1);return}
  if(el){el.classList.add('coach-hl');el.scrollIntoView({block:i===0?'start':'center'})}
  coachView={open:true,i,text:COACH[i].t,step:`${i+1} / ${COACH.length}`,last:i===COACH.length-1}; drawCoach();
}
export const maybeCoach=()=>{if(!storage.get('gp.coach',0)&&$('#onb').hidden&&!helperOpen()) setTimeout(()=>showCoach(0),400)};

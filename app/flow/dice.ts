// What happens in the 🎲 sheet and on the P모드 board: 뭐 먹지 (around me, or a meal in the trip), 뭐 하지 (around me, in a
// 동네, or the trip's free time; one place or a whole course), rolling, 이걸로 (into the schedule / remembered), and the
// board's dice and cards. The rolls and choices live here (st). (It used to be src/js/160-modes-roll.js, 280-dice-eat.js,
// 290-dice-do.js, 170-quick-start-pview.js and pviewAct in 380-events.js.) What the old code still does: connect() (Legacy).
import * as trip from '../data/trip';
import * as places from '../data/places';
import * as storage from '../data/storage';
import * as keys from '../data/keys';
import * as myplaces from '../data/myplaces';
import * as kakao from '../data/kakao';
import * as NB from '../data/nearby';
import * as OPS from '../data/ops';
import { appError } from '../data/errors';
import { state as DYs } from '../data/days';
import { fmt, parse } from '../logic/time';
import { norm } from '../logic/places';
import { ui } from '../ui/state';
import * as DICEV from '../view/dice';
import * as PVIEW from '../view/pview';
import * as R from './render';

/** what the old code still does */
export interface Legacy {
  /** ask the AI for n more places (focus: what kind); resolves with how many came */
  morePlaces(n: number, statusId: string, focus: string, signal?: AbortSignal): Promise<number>;
  /** the places the AI just found (✨) */
  fresh(): Set<string>;
  setSt(id: string, text: string): void;
  toast(msg: string): void;
  renderSettings(): void;
  diceOpenAnim(): void;
  /** 📌 이 코스 저장: a new 하루 코스 plan from st.doS.course */
  saveCourse(): void;
  /** a map key that did not work */
  keyBad(): Record<string, any>;
  demoOn(): boolean;
}
let L: Legacy;
export function connect(l: Legacy): void { L = l }

const $ = (s: string) => document.querySelector(s) as HTMLElement;
const mount = (name: string, el: Element, props: any) => (window.JEPI_UI.mount as any)(name, el, props);
const D_ = DYs as any, PMx = places.PM as any;
const mypOf = (id: string): any => myplaces.of(id);
const aerr = (code: string, msg: string) => appError(code as any, msg);
const isoOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const todayIdx = () => { const t = isoOf(new Date()); return D_.days.findIndex((D: any) => D.iso === t) };
let diceRev = 0, pviewRev = 0, pSpinT: any = 0;

/** the rolls and choices: dice (the trip's free time), eat (뭐 먹지), doS (뭐 하지), pSt (the P board), log (what was
 *  picked, kept for 5 days so it is not rolled again), recentAreas (동네 picked lately) */
export const st = {
  dice: { mood: 'any', lunch: false, walk: 10, gapI: 0, rolls: 0, pick: null, rolling: false, msg: '', force: null } as any,
  eat: { walk: 10, mood: 'any', base: null, org: null, pick: null, rolls: 0, msg: '', busy: false, ll: null, where: '', meal: null, src: '' } as any,
  doS: { base: null, org: 'gps', area: null, when: 'now', at: '18:00', clen: 'short', mood: 'any', pick: null, rolls: 0, course: null, busy: false, msg: '', origin: null, where: '', src: '', hits: [], chosen: null, cond: false } as any,
  pSt: { mood: 'any', draw: null } as any,
  log: [] as any[],
  recentAreas: [] as any[],
};
const dice = st.dice, eat = st.eat, doS = st.doS, pSt = st.pSt;
/** what was saved on this device (at start-up) */
export function load(): void {
  Object.assign(eat, storage.get('jepi.eat', {}) || {}, { base: null, org: null, pick: null, rolls: 0, msg: '', busy: false, ll: null, where: '', meal: null, src: '' });
  Object.assign(doS, storage.get('jepi.do', {}) || {}, { base: null, pick: null, course: null, busy: false, msg: '', hits: [], chosen: null, cond: false });
  st.recentAreas = storage.get('jepi.areas', []) || [];
  const l = storage.get('gp.dice', []); st.log = Array.isArray(l) ? l : [];
}
const diceState = () => ({ dice, eat, doS, diceLog: st.log, recentAreas: st.recentAreas, day: ui.day, ai: !!ui.sample });
const diceCands = (g: any) => DICEV.diceCands(g, diceState());

const isoShift=(iso: any,n: any)=>{const d=new Date(iso+'T00:00:00');d.setDate(d.getDate()+n);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};

export function openDice(fromT?: any){
  const gs=DICEV.diceGaps(ui.day); dice.pick=null; dice.rolls=0; dice.msg=''; dice.force=null;
  if(fromT!=null){const i=gs.findIndex((g: any)=>fromT>=g.s&&fromT<g.e);dice.gapI=i>=0?i:0} else if(dice.gapI>=gs.length) dice.gapI=0;
  $('#sheet').dataset.uid='dice'; $('#sheetBg').hidden=false; renderDice();
}
export function diceRoll(re?: any){
  const gs=DICEV.diceGaps(ui.day), g=gs[dice.gapI]||gs[0];
  if(!g){dice.pick=null;dice.msg='이 날은 45분 이상 빈 시간이 없어요.';renderDice();return}
  if(re&&dice.rolls>=3) return; if(!re) dice.rolls=0;
  const prev=dice.pick, cs=diceCands(g).filter((c: any)=>!prev||c.p.id!==prev.p.id);
  if(!cs.length){dice.pick=null;dice.msg=dice.lunch?`걸어서 ${dice.walk}분 안에 ${dice.meal==='dinner'?'저녁':'점심'} 후보가 없어요. 시간을 늘리거나 AI에게 새 후보를 받아 보세요.`:'이 조건에 맞는 곳이 없어요. 기분이나 시간을 바꾸거나 AI에게 새 후보를 받아 보세요.';renderDice();return}
  dice.rolls++;
  const fw=(c: any)=>c.w*(dice.fresh&&dice.fresh.includes(c.p.id)?8:1); const tot=cs.reduce((a: any,c: any)=>a+fw(c),0); let r=Math.random()*tot, pick=cs[cs.length-1]; for(const c of cs){r-=fw(c);if(r<=0){pick=c;break}}
  dice.pick=pick; dice.gap=g; dice.msg=''; dice.force=null; dice.rolling=!matchMedia('(prefers-reduced-motion:reduce)').matches; renderDice();
  if(dice.rolling) setTimeout(()=>{dice.rolling=false;renderDice()},700);
}
export function diceFix(force?: any){
  const c=dice.pick; if(!c) return;
  const ops=[{op:'add',day:ui.day,id:c.p.id,start:fmt(c.arr),dur:c.dur}], r=force?{ops:dice.force||ops,warns:[]}:OPS.repair(ops);
  if(r.warns.length){dice.force=r.ops;dice.msg='넣으면 경고가 생겨요: '+r.warns[0];renderDice();return}
  OPS.apply(r.ops); trip.blocks.saved(); learnFrom(c.p); st.log.push({n:c.p.name,d:D_.days[ui.day].iso}); st.log=st.log.slice(-60); storage.set('gp.dice',st.log);
  R.closeSheet(); R.renderAll();
}
function renderDiceDo(top?: any){if($('#sheet').dataset.uid!=='dice')return;diceMount(DICEV.plan(diceState(),top))}
async function diceAI(){
  const mood=(DICEV.DICE_MOODS.find((m: any)=>m[0]===dice.mood)||[])[1]||'';
  const focus=dice.lunch?`${dice.meal==='dinner'?'저녁':'점심'} 식사 (걸어서 ${dice.walk}분 안${eat.mood!=='any'?', '+((NB.EAT_MOODS.find((m: any)=>m[0]===eat.mood)||[])[1]||''):''})`:dice.mood==='any'?'지금 빈 시간에 하기 좋은 곳':`지금 기분: ${mood}`;
  const n=await L.morePlaces(8,'st_dice',focus); if(n){dice.fresh=[...L.fresh()]; diceRoll(false)}
}


const saveEat=()=>storage.set('jepi.eat',{walk:eat.walk,mood:eat.mood});

export function eatDefaults(){
  const ti=todayIdx(); eat.base=ti>=0&&DICEV.planUsable()?'plan':'near';
  if(eat.base==='plan') ui.day=ti;
  const n=new Date(), wkLunch=n.getDay()>0&&n.getDay()<6&&DICEV.nowMin()>=630&&DICEV.nowMin()<900;
  eat.org=wkLunch&&mypOf('work')&&mypOf('work').ll?'work':'gps';
  eat.meal=DICEV.mealNow()==='dinner'?'dinner':'lunch'; eat.pick=null; eat.rolls=0; eat.msg='';
}

function diceMount(pr?: any){mount('dice',$('#sheet'),Object.assign({eat:false,head:null,tabs:null,bases:null,picker:null,rows:[],cond:null,msg:'',acts:[],ai:null,foot:null},pr,{rev:++diceRev}))}
export function renderDice(){
  if($('#sheet').dataset.uid!=='dice') return;
  if(dice.tab==='eat') return renderEat();
  if(!doS.base) doDefaults(false);
  if(doS.base!=='plan') return renderDoNear();
  dice.lunch=false; renderDiceDo({tabs:'do',bases:doBases()});
}
export function eatRecent(){const t=isoOf(new Date()),from=isoShift(t,-5);return new Set(st.log.filter((x: any)=>x.d&&x.d>=from&&x.d<=t).map((x: any)=>norm(x.n)))}
async function eatOrigin(){
  if(eat.org==='gps'){const ll=await kakao.here(120000);eat.where='지금 위치';return ll}
  const x=mypOf(eat.org); if(!x||!x.ll) throw aerr('noplace',`${x?x.name:'이 장소'}를 아직 등록하지 않았어요. 더보기 → 설정 → 내 장소에서 등록해 주세요.`);
  eat.where=x.name; return x.ll;
}
const nbLook=()=>({kakao:!!keys.list.kakao,ai:ui.sample});
async function eatRoll(again?: any){
  if(eat.busy) return;
  if(eat.base==='plan'){
    dice.lunch=true; dice.meal=eat.meal; dice.walk=eat.walk; dice.mood='any';
    const gs=DICEV.diceGaps(ui.day), mw=eat.meal==='dinner'?[1050,1260]:[690,840];
    const gi=gs.findIndex((g: any)=>g.e>mw[0]&&g.s<mw[1]); if(gi>=0) dice.gapI=gi;
    if(again&&dice.rolls>=3) return; diceRoll(!!again); return;
  }
  if(again&&eat.rolls>=3) return;
  eat.busy=true; eat.msg=''; if(!again){eat.rolls=0} renderEat();
  try{
    const ll=await eatOrigin(); eat.ll=ll;
    const got=await NB.eatList(ll,eat.walk,eat.mood,DICEV.mealNow(),nbLook()); eat.src=got.src;
    const pk=NB.eatRoll(got.list,eat.walk,eat.mood,eatRecent(),new Set(st.log.map((x: any)=>norm(x.n))),eat.pick?eat.pick.name:null);
    if(!pk){eat.pick=null;eat.msg=`걸어서 ${eat.walk}분 안에 ${eat.mood==='any'?'':'이 조건에 맞는 '}후보가 없어요. 거리를 늘리거나 기분을 바꿔 보세요.`}
    else{eat.pick=pk; eat.rolls++; dice.rolling=!matchMedia('(prefers-reduced-motion:reduce)').matches; if(dice.rolling)setTimeout(()=>{dice.rolling=false;renderEat()},650)}
  }catch(err: any){eat.pick=null;eat.msg=err.message||'후보를 가져오지 못했어요.'}
  eat.busy=false; renderEat();
}
export function renderEat(){if($('#sheet').dataset.uid!=='dice')return;diceMount(DICEV.eatTab(diceState()))}
export function openDiceTab(tab?: any, fromT?: any){
  dice.tab=tab; if(tab==='eat'){eatDefaults(); eat.chosen=null} else doDefaults(fromT!=null);
  openDice(fromT); if(fromT==null) L.diceOpenAnim();
}
// home-screen shortcut: ./?dice=eat
export function diceFromUrl(){try{const q=new URLSearchParams(location.search).get('dice');if(q==='eat'||q==='do'){history.replaceState(null,'',location.pathname+location.hash);setTimeout(()=>openDiceTab(q),300)}}catch(_){}}

const saveDo=()=>storage.set('jepi.do',{mood:doS.mood,clen:doS.clen,area:doS.area,at:doS.at});

export function doDefaults(fromSlot?: any){
  const t=isoOf(new Date()), last=D_.days.length?D_.days[D_.days.length-1].iso:'';
  doS.base=fromSlot||(DICEV.planUsable()&&(!last||last>=t))?'plan':'near';
  doS.pick=null;doS.course=null;doS.rolls=0;doS.msg='';doS.chosen=null;doS.when='now';
}
function doStart(){return doS.when==='now'?Math.ceil((DICEV.nowMin()+10)/10)*10:(parse(doS.at)??1080)}
async function doOrigin(){
  if(doS.base==='area'){if(!doS.area)throw aerr('noarea','동네를 먼저 골라 주세요.');doS.where=doS.area.name;return doS.area.ll||null}
  if(doS.org==='gps'){const ll=await kakao.here(120000);doS.where='지금 위치';return ll}
  const x=mypOf(doS.org);if(!x||!x.ll)throw aerr('noplace','이 장소를 아직 등록하지 않았어요.');doS.where=x.name;return x.ll;
}
const doLook=()=>({kakao:!!keys.list.kakao&&!L.keyBad().kakao,ai:ui.sample,mood:doS.mood,areaName:doS.base==='area'&&doS.area?doS.area.name:''});
async function poolFor(type?: any, ll?: any, t?: any){const r=await NB.poolFor(type,ll,t,doLook());doS.src=r.src;return r.list}
async function doGo(kind?: any, again?: any){
  if(doS.busy) return;
  if(kind==='one'&&again&&doS.rolls>=3) return;
  doS.busy=true; doS.msg=''; if(!again){doS.rolls=0;doS.chosen=null} if(kind==='course'){doS.pick=null}else{doS.course=null}
  renderDice();
  try{
    let ll=await doOrigin(); if(!ll){const pl=await NB.aiPool(null,doS.area?doS.area.name:'',doS.mood,ui.sample);if(!pl.length)throw aerr('none','이 동네를 찾지 못했어요. 다르게 적어 보세요.');ll=pl[0].ll}
    doS.origin=ll; const t0=doStart();
    if(kind==='one'){
      const type=doS.mood==='hungry'?'meal':'act';
      const pool=(await poolFor(type,ll,t0)).filter((x: any)=>!doS.pick||x.id!==doS.pick.id), c=NB.pickNear(pool,ll,1100,eatRecent());
      if(!c){doS.pick=null;doS.msg='이 근처에서 조건에 맞는 곳을 찾지 못했어요. 기분을 바꾸거나 코스로 짜 보세요.'}
      else{doS.pick=Object.assign({},c,{type,walk:NB.walkMin(ll as any,c.ll as any)});doS.rolls++;dice.rolling=!matchMedia('(prefers-reduced-motion:reduce)').matches;if(dice.rolling)setTimeout(()=>{dice.rolling=false;renderDice()},650)}
    }else{
      const tEnd=doS.clen==='rest'?Math.min(1410,Math.max(t0+150,1380)):doS.clen==='half'?Math.min(1410,t0+300):Math.min(1410,t0+180);
      const r=await NB.buildCourse(ll,t0,tEnd,doLook(),eatRecent()); doS.course=r.items; if(r.src) doS.src=r.src;
      if(!doS.course.length){doS.course=null;doS.msg='지금 시간에는 코스를 짜기 어려워요. 시간을 바꿔 보세요.'}
    }
  }catch(err: any){doS.msg=err.message||'장소를 가져오지 못했어요.';doS.course=null;doS.pick=null}
  doS.busy=false; renderDice();
}
async function doReroll(i?: any){
  const c=doS.course; if(!c||!c[i]||doS.busy) return; doS.busy=true; renderDice();
  try{const it=c[i], used=new Set(c.map((x: any)=>x.id)), from=i?c[i-1].ll:doS.origin;
    const pool=(await poolFor(it.type,doS.origin,it.start)).filter((x: any)=>!used.has(x.id)), n=NB.pickNear(pool,from,900,eatRecent());
    if(n){c[i]=Object.assign({},n,{type:it.type,meal:it.meal,start:it.start,dur:it.dur,walk:NB.walkMin(from as any,n.ll as any)});NB.reflow(c,doS.origin,i+1)} else doS.msg='이 칸은 바꿀 다른 후보가 없어요.';
  }catch(err: any){doS.msg=err.message}
  doS.busy=false; renderDice();
}

const doBases=()=>DICEV.doBases(diceState());
function renderDoNear(){diceMount(DICEV.doNear(diceState()))}
function pushRecentArea(a?: any){st.recentAreas=[a,...st.recentAreas.filter((x: any)=>x.name!==a.name)].slice(0,6);storage.set('jepi.areas',st.recentAreas)}
// What was pressed in the 🎲 sheet (app/screens/Dice.tsx tells: the button's name, its value, and its other data-…)
export async function diceAct(n?: any, v?: any, more?: any){
  more=more||{};
  switch(n){
  // both tabs
  case 'dicetab': if(v==='eat'){dice.tab='eat';eatDefaults();eat.chosen=null}else{dice.tab='do';dice.pick=null;dice.rolls=0;dice.msg='';doDefaults(false)}renderDice();return;
  case 'cond': if(dice.tab==='eat')eat.cond=!!v;else doS.cond=!!v;return;   // the 조건 box opened / closed
  case 'eatSetPlaces': R.closeSheet();ui.tab='settings';myplaces.ui.edit=null;L.renderSettings();R.renderTabs();return;
  // 일정 빈 시간에서 굴리기 (160-modes-roll.js)
  case 'dicegap': dice.gapI=+v;dice.pick=null;dice.msg='';renderDice();return;
  case 'dicemood': dice.mood=v;dice.pick=null;dice.msg='';renderDice();return;
  case 'dicewalk': dice.walk=+v;dice.pick=null;renderDice();return;
  case 'diceGo': diceRoll(false);return;
  case 'diceAgain': diceRoll(true);return;
  case 'diceFix': diceFix(false);return;
  case 'diceForce': diceFix(true);return;
  case 'diceAI': diceAI();return;
  // 뭐 먹지 (280-dice-eat.js)
  case 'eatbase': eat.base=v;eat.pick=null;eat.rolls=0;eat.msg='';dice.pick=null;dice.rolls=0;dice.msg='';if(eat.base==='plan'){const ti=todayIdx();if(ti>=0)ui.day=ti}renderEat();return;
  case 'eatorg': eat.org=v;eat.pick=null;eat.rolls=0;NB.forgetEat();renderEat();return;
  case 'eatmeal': eat.meal=v;dice.pick=null;dice.rolls=0;renderEat();return;
  case 'eatwalk': eat.walk=+v;eat.pick=null;eat.rolls=0;saveEat();renderEat();return;
  case 'eatmood': eat.mood=v;eat.pick=null;eat.rolls=0;dice.pick=null;dice.rolls=0;saveEat();renderEat();return;
  case 'eatroll': eatRoll(v==='again');return;
  case 'eatPick': if(eat.pick){st.log.push({n:eat.pick.name,d:isoOf(new Date())});st.log=st.log.slice(-60);storage.set('gp.dice',st.log);eat.chosen=eat.pick.name;renderEat()}return;
  // 뭐 하지 (here)
  case 'dobase': doS.base=v;doS.pick=null;doS.course=null;doS.msg='';doS.picking=doS.base==='area'&&!doS.area;
    if(doS.base==='area'&&doS.area&&doS.prevBase==='area')doS.picking=true; doS.prevBase=doS.base; dice.pick=null;dice.rolls=0;doS.focus=doS.picking;renderDice();doS.focus=false;return;
  case 'doAreaFind': {const q=String(v||'').trim();if(!q)return;
    if(!keys.list.kakao){const a={name:q,ll:null};doS.area=a;doS.picking=false;doS.msg=ui.sample?'':'동네를 찾으려면 설정에서 카카오 지도 키나 AI를 연결해 주세요.';renderDice();return}
    try{const j=await kakao.get('/v2/local/search/keyword.json',{query:q,size:6});doS.hits=(j.documents||[]).map((d: any)=>({name:d.place_name,addr:d.road_address_name||d.address_name||'',ll:[+d.y,+d.x]}));doS.msg=doS.hits.length?'':'찾지 못했어요. 역 이름으로 적어 보세요.'}catch(err: any){doS.msg=err.message}renderDice();return}
  case 'doareapick': {const h=doS.hits[+v];if(h){doS.area={name:h.name,ll:h.ll};pushRecentArea(doS.area);saveDo();doS.hits=[];doS.picking=false;doS.msg=''}renderDice();return}
  case 'doarecent': {const a=st.recentAreas[+v];if(a){doS.area=a;pushRecentArea(a);saveDo();doS.picking=false;doS.msg=''}renderDice();return}
  case 'doorg': doS.org=v;doS.pick=null;doS.course=null;renderDice();return;
  case 'dowhen': doS.when=v;doS.course=null;doS.pick=null;renderDice();return;
  case 'doAt': doS.at=v||'18:00';saveDo();renderDice();return;
  case 'doclen': doS.clen=v;saveDo();if(doS.course)doGo('course');else renderDice();return;
  case 'domood': doS.mood=v;NB.forgetAi();doS.pick=null;doS.course=null;saveDo();renderDice();return;
  case 'dogo': doGo(v,!!more.again);return;
  case 'doreroll': doReroll(+v);return;
  case 'doPick': if(doS.pick){st.log.push({n:doS.pick.name,d:isoOf(new Date())});st.log=st.log.slice(-60);storage.set('gp.dice',st.log);doS.chosen=doS.pick.name;renderDice()}return;
  case 'doSave': L.saveCourse();return;
  }
}


const pAheadOn=()=>!!storage.get('gp.pAhead',false);
const pGaps=()=>PVIEW.pGaps(ui.day);
export function renderPView(){
  const box=$('#pview'); if(!box) return;
  const on=ui.jp==='P'; box.hidden=!on; $('.grid-wrap').hidden=on; if(!on) return;
  mount('pview',box,{...PVIEW.board(ui.day,pSt,{ahead:pAheadOn(),demo:L.demoOn(),ai:!!ui.sample}),rev:++pviewRev});
}
function pPick(cs?: any){const fw=(c: any)=>c.w*(dice.fresh&&dice.fresh.includes(c.p.id)?8:1); const tot=cs.reduce((a: any,c: any)=>a+fw(c),0); let r=Math.random()*tot, pick=cs[cs.length-1]; for(const c of cs){r-=fw(c);if(r<=0){pick=c;break}} return pick}
// roll the chosen die for one free time: spin, then show a card
export function pRollDo(gi?: any, auto?: any){
  const gs=pGaps(), g=gs[+gi]; if(!g){pSt.draw=null;renderPView();return}
  const old=pSt.draw, same=old&&old.day===ui.day&&old.gi===+gi&&old.mood===pSt.mood, seen=same?old.seen.slice():[];
  if(same&&old.cand) seen.push(old.cand.p.id);
  const m0=dice.mood, l0=dice.lunch; dice.mood=pSt.mood; dice.lunch=false; let cs=diceCands(g); dice.mood=m0; dice.lunch=l0;
  const pt=PVIEW.partOfDay(g.s);
  if(pt==='저녁'||pt==='밤') cs.forEach((c: any)=>{if(['food','night'].includes(c.p.cat)||['evening','night','sunset'].includes(c.p.best))c.w+=1.5});
  if(pt==='오전') cs.forEach((c: any)=>{if(c.p.best==='morning')c.w+=1.5});
  cs=cs.filter((c: any)=>!seen.includes(c.p.id));
  // the roll button looks for the next ? square this die can fill
  if(auto&&!cs.length&&!seen.length&&+gi+1<gs.length) return pRollDo(+gi+1,true);
  const cand=cs.length?pPick(cs):null, spin=!matchMedia('(prefers-reduced-motion:reduce)').matches;
  pSt.draw={day:ui.day,gi:+gi,g,mood:pSt.mood,seen,cand,left:Math.max(0,cs.length-1),rolling:spin};
  clearTimeout(pSpinT); renderPView();
  if(spin) pSpinT=setTimeout(()=>{if(pSt.draw){pSt.draw.rolling=false;renderPView()}},1100);
}
export function learnFrom(p?: any){const t=places.tagsOf(p.id)[0];if(t)trip.keywords.add(t,12)}
export function pYes(){const d=pSt.draw; if(!d||!d.cand) return; const c=d.cand; learnFrom(c.p);
  const r=OPS.repair([{op:'add',day:ui.day,id:c.p.id,start:fmt(c.arr),dur:c.dur}]); OPS.apply(r.ops); trip.blocks.saved();
  st.log.push({n:c.p.name,d:D_.days[ui.day].iso}); st.log=st.log.slice(-60); storage.set('gp.dice',st.log); pSt.draw=null; R.renderAll();}
export function pKeep(){const d=pSt.draw; if(!d||!d.cand) return; if(!trip.wish.has(d.cand.p.id)) trip.wish.toggle(d.cand.p.id); L.toast('내 카드에 넣었어요'); pRollDo(d.gi)}
export function pClose(){clearTimeout(pSpinT); pSt.draw=null; renderPView()}
export function pMood(k?: any){if(PVIEW.P_DICE.some((v: any)=>v[0]===k)){pSt.mood=k;renderPView()}}
export function pAhead(){storage.set('gp.pAhead',!pAheadOn()); renderPView()}
export async function pAI(){const d=pSt.draw; if(!d) return; const n=await L.morePlaces(6,'st_pai',`${PVIEW.partOfDay(d.g.s)} 시간대에 하기 좋은 곳`); if(n){d.seen=[];d.cand=null;pRollDo(d.gi)}}
// P모드 장소 탭 (카드 모으기): ask the AI for places to collect, or put one place straight onto the board's next ? square that fits it
export async function pAIRec(){const n=await L.morePlaces(8,'st_pairec','');if(n){R.renderTray();L.setSt('st_pairec',`${n}곳을 찾았어요. 아래 "✨ 방금 찾은 곳"에서 ♥ 담기로 모아요.`)}}
export function pPlaceNow(id?: any){
  const p=PMx[id]; if(!p) return;
  const m0=dice.mood,l0=dice.lunch; dice.mood='any'; dice.lunch=false;
  let hit=null; for(const g of pGaps()){const c=diceCands(g).find((x: any)=>x.p.id===id);if(c){hit=c;break}}
  dice.mood=m0; dice.lunch=l0;
  if(!hit){L.toast('이 날 빈 칸에는 맞지 않아요. 내 카드로 담아 두세요.');return}
  const r=OPS.repair([{op:'add',day:ui.day,id,start:fmt(hit.arr),dur:hit.dur}]); OPS.apply(r.ops); trip.blocks.saved();
  L.toast(`${D_.days[ui.day].date||'이 날'} ${PVIEW.shortFuzzy(hit.arr)}에 넣었어요`); R.renderAll();
}

// What was pressed on the P모드 판 (PView.tsx tells: its name and value)
export function pviewAct(n?: any, v?: any){
  switch(n){
  case 'sq': R.openSheet(v);return;              // a square with a block on it
  case 'gap': pRollDo(v);return;               // an empty square: roll to fill it
  case 'roll': pRollDo(v,true);return;
  case 'mood': pMood(v);return;
  case 'card': pMood('mine');return;           // one of 내 카드
  case 'next': if(pSt.draw)pRollDo(pSt.draw.gi);return;
  case 'yes': pYes();return;
  case 'keep': pKeep();return;
  case 'close': pClose();return;
  case 'ai': pAI();return;
  case 'ahead': pAhead();return;
  }
}
/** 🎲 from an empty time in the 일정표 (a block sheet's button) */
export function diceFrom(t: number): void { dice.tab = 'do'; doDefaults(true); openDice(t); diceRoll(false) }

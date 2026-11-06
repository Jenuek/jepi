// What the 🎲 sheet shows (DiceSheet.tsx): 뭐 먹지 (around me or the trip's meal), 뭐 하지 (around me, a 동네, or the
// trip's free time), the condition rows, the die / card / course and the buttons; and the places the trip dice can land
// on. This only makes the props. (It used to be renderEat / renderDoNear / renderDiceDo / diceCands … in src/js/160, 280
// and 290.) What was rolled, the open tab and the choices are the old code's (DiceState).
import * as trip from '../data/trip';
import * as places from '../data/places';
import * as check from '../data/check';
import * as recs from '../data/recs';
import * as myplaces from '../data/myplaces';
import { state as DY, arrEnd, dayStart, tmin } from '../data/days';
import { outOfSeason, sunsetMin, bestTips } from '../data/season';
import { EAT_MOODS, MEAL_TXT as MT, DO_MOODS, TYPE_ICON } from '../data/nearby';
const MEAL_TXT = MT as any;
import { fmt, durTxt } from '../logic/time';
import { norm } from '../logic/places';
import { matchKw } from './tray';

const CUR = trip.cur as any, PK = places.state as any, DYa = DY as any;
const { P, MUST, tagsOf } = places as any;
const { travel, hoursFor, closedOn } = check as any;
const isWish = (id: string) => trip.wish.has(id);
const recOf = (p: any) => recs.countOf(recs.placeKey(PK.pack.city || '', p.name));
const MYP = myplaces.list as any[], mypOf = (id: string) => myplaces.of(id) as any;
const isoShift = (iso: string, n: number) => { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` };
export const nowMin = (): number => { const n = new Date(); return n.getHours() * 60 + n.getMinutes() };
export const mealNow = (): 'lunch' | 'dinner' | 'snack' => { const m = nowMin(); return m >= 630 && m < 930 ? 'lunch' : m >= 990 && m < 1290 ? 'dinner' : 'snack' };
export const planUsable = (): boolean => !!(DYa.days.length && PK.pack && PK.pack.city && PK.pack.city !== '새 여행');
export const DICE_MOODS: [string, string][] = [['any', '아무거나'], ['hungry', '배고파'], ['calm', '차분히'], ['dopa', '도파민'], ['mine', '내 카드'], ['legs', '다리 아파']];
const FACES = '⚀⚁⚂⚃⚄⚅';

/** what the old code keeps for the dice */
export interface DiceState { dice: any; eat: any; doS: any; diceLog: any[]; recentAreas: any[]; day: number; ai: boolean }

const dPills = (attr: string, cur: any, opts: any[]) => ({ r: 'pills', p: { attr, cur, opts } }), dHint = (t: string) => ({ r: 'hint', t });
const dBtn = (cls: string, label: string, o?: any) => Object.assign({ a: 'btn', cls, label }, o || {}), dLink = (cls: string, label: string, href: any) => ({ a: 'link', cls, label, href: String(href || '') });
const dSpin = () => ({ s: 'die', spin: true, face: FACES[Math.floor(Math.random() * 6)] });
const sheet = (pr: any) => Object.assign({ eat: false, head: null, tabs: null, bases: null, picker: null, rows: [], cond: null, msg: '', acts: [], ai: null, foot: null }, pr);

export function diceGaps(d: number): any[] {
  const its=check.analyze(d).items.filter((i: any)=>!i.stay), out=[]; let cur=d===0?arrEnd():dayStart(d), prev=null;
  const end=CUR.profile.kind==='day'?tmin(CUR.profile.meet.end,1200):1380;
  for(const it of its){ if(it.start>=end) break; if(it.start-cur>=45) out.push({s:cur,e:it.start,prev}); if(it.end>cur){cur=it.end;prev=it} }
  if(end-cur>=45) out.push({s:cur,e:end,prev}); return out;
}
function moodOk(p: any,from: number,mood: string){const tg=tagsOf(p.id).join(' ')+' '+p.name+' '+(p.note||'');
  switch(mood){case 'hungry':return p.cat==='food';
    case 'calm':return ['art','walk'].includes(p.cat)||/카페|정원|서점|사색|공원|조용/.test(tg);
    case 'dopa':return ['shop','music'].includes(p.cat)||(p.cat==='night'&&from>=1020)||/액티비티|체험|놀이|전망|쇼핑|게임/.test(tg);
    case 'mine':return isWish(p.id);
    default:return true}}
/** the places the dice can land on in gap g */
export function diceCands(g: any, S: DiceState): any[] {
  const {dice,diceLog,day}=S;
  const D=DYa.days[day],wd=D.wd,used=new Set(CUR.placed.map((b: any)=>b.id)),from=g.prev?g.prev.ll:DYa.loc[D.startLoc].ll;
  const recent=new Set(diceLog.filter((x: any)=>x.d&&D.iso&&x.d<D.iso&&x.d>=isoShift(D.iso,-5)).map((x: any)=>norm(x.n)));
  let s0=g.s,e0=g.e; if(dice.lunch){const mw=dice.meal==='dinner'?[1050,1260]:[690,840];s0=Math.max(s0,mw[0]);e0=Math.min(e0,mw[1]);if(e0-s0<30)return []}
  const out=[];
  for(const p of P){
    if(used.has(p.id)||p.drop||closedOn(p,wd)||outOfSeason(p,D.iso)) continue;
    if(dice.lunch?(p.cat!=='food'||recent.has(norm(p.name))||!eatMoodOk(p,S.eat.mood)):!moodOk(p,g.s,dice.mood)) continue;
    const t=travel(from,p.ll), tm=t?t.min:0;
    if(dice.lunch&&t&&(t.mode!=='도보'||tm>dice.walk)) continue;
    if(!dice.lunch&&dice.mood==='legs'&&t&&(t.mode!=='도보'||tm>10)) continue;
    const h=hoursFor(p,wd), ss=sunsetMin()||1050;
    let pref=({morning:540,day:720,sunset:ss-45,evening:1080,night:ss+30} as any)[p.best]||(p.cat==='food'?(s0<=720?720:s0):p.cat==='night'?1140:600);
    if(dice.lunch) pref=dice.meal==='dinner'?1110:720; if(h) pref=Math.max(pref,h[0]);
    let arr=Math.ceil(Math.max(s0+tm,Math.min(pref,e0-Math.min(p.dur,90)))/15)*15;
    if(h&&arr<h[0]) arr=Math.ceil(h[0]/15)*15;
    const dur=Math.min(p.dur,e0-arr); if(dur<30) continue;
    if(h&&(arr<h[0]||arr+30>h[1])) continue;
    let w=1+matchKw(p.id).length+(isWish(p.id)?3:0)+(MUST[p.id]?1.5:0)+(p.season?1.5:0)+recOf(p)*0.5-tm/30;
    if(bestTips(p,arr,arr+dur).length) w-=0.7;
    if(!dice.lunch&&dice.mood==='legs'&&(p.dur<=60||/카페|공원|정원|벤치/.test(tagsOf(p.id).join(' ')+' '+p.name))) w+=1.5;
    out.push({p,arr,dur,tm,mode:t?t.mode:'',w:Math.max(0.2,w)});
  }
  return out;
}
export function eatMoodOk(p: any, mood: string){const m=EAT_MOODS.find((x: any)=>x[0]===mood);if(!m||!m[2].length)return true;const tx=p.name+' '+tagsOf(p.id).join(' ')+' '+(p.note||'');return m[2].some((k: any)=>tx.includes(k))}
/** 🗓 the trip's free time (P모드 too): top = the tabs and bases above */
export function plan(S: DiceState, top: any) {
  const {dice,day}=S, sample=S.ai;
  const D=DYa.days[day], gs=diceGaps(day), c=dice.pick, left=Math.max(0,3-dice.rolls);
  const reasons=c?[isWish(c.p.id)?'♥ 가고 싶은 곳':'',...matchKw(c.p.id).slice(0,2).map((k: any)=>'#'+k),c.p.season?'🗓 '+c.p.season:'',recOf(c.p)?`👍 ${recOf(c.p)}`:'',c.tm?`${c.mode} ${c.tm}분`:'바로 옆'].filter(Boolean):[];
  return sheet({...top,head:D.date||'',rows:[...(gs.length?[dHint('언제'),dPills('dicegap',dice.gapI,gs.map((g: any,i: any)=>[i,`${fmt(g.s)}–${fmt(g.e)}`]))]:[]),
      ...(dice.lunch?[]:[dHint('지금 기분'),dPills('dicemood',dice.mood,DICE_MOODS.map(([k,l]: any)=>[k,l]))])],
    stage:dice.rolling?dSpin():c?{s:'planCard',cat:c.p.cat,name:c.p.name,line:`${fmt(c.arr)}–${fmt(c.arr+c.dur)} · ${c.p.area}`,note:c.p.note||'',tags:reasons}:{s:'die',face:'⚄'},
    msg:dice.msg||'',acts:c&&!dice.rolling?[dBtn('small-btn primary','이걸로 할래요',{id:'diceFix'}),...(dice.force?[dBtn('small-btn','그래도 넣기',{id:'diceForce'})]:[]),dBtn('small-btn',`다시 굴리기 (${left}번)`,{id:'diceAgain',disabled:!left})]
      :dice.rolling?[]:[dBtn('dice-go','🎲 굴리기',{id:'diceGo'})],
    ai:sample&&!PK.pack.manual?{primary:true}:null});
}
/** 🍚 뭐 먹지 */
export function eatTab(S: DiceState) {
  const {dice,eat,day}=S, sample=S.ai;
  const meal=eat.base==='plan'?eat.meal:mealNow(), mt=MEAL_TXT[meal]||'점심', D=DYa.days[day]||{};
  const orgs=[['gps','지금 위치'],...MYP.filter((x: any)=>x.ll).map((x: any)=>[x.id,x.name])];
  const nearLbl=eat.org==='gps'?'지금 위치':(mypOf(eat.org)||{}).name||'지금 위치';
  let stage, acts;
  if(eat.base==='plan'){
    const c=dice.pick, left=Math.max(0,3-dice.rolls);
    stage=dice.rolling?dSpin():c?{s:'planCard',cat:c.p.cat,name:c.p.name,line:`${fmt(c.arr)}–${fmt(c.arr+c.dur)} · ${c.p.area}${c.tm?` · ${c.mode} ${c.tm}분`:''}`,note:c.p.note||'',tags:null}:{s:'die',face:'🍚'};
    acts=c&&!dice.rolling?[dBtn('small-btn primary','이걸로! 일정에 넣기',{id:'diceFix'}),...(dice.force?[dBtn('small-btn','그래도 넣기',{id:'diceForce'})]:[]),dBtn('small-btn',`다시 굴리기 (${left})`,{data:{eatroll:'again'},disabled:!left})]
      :dice.rolling?[]:[dBtn('dice-go',`🍚 ${MEAL_TXT[eat.meal]} 굴리기`,{data:{eatroll:'go'}})];
  } else {
    const c=eat.pick, left=Math.max(0,3-eat.rolls);
    stage=eat.busy?{s:'die',spin:true,face:'🍚',hint:'주변 식당을 찾는 중…'}:dice.rolling?dSpin():c?{s:'placeCard',title:c.name,line:`걸어서 약 ${Math.max(1,Math.round(c.dist/80))}분 · ${c.cat}`,addr:c.addr||'',foot:`${eat.where} 기준 · ${eat.src}`}:{s:'die',face:'🍚'};
    acts=c&&!eat.busy&&!dice.rolling?(eat.chosen===c.name?[{a:'status',t:'맛있게 드세요! 🍚'},dLink('small-btn primary','지도 열기',c.url)]
      :[dBtn('small-btn primary','이걸로!',{id:'eatPick'}),dLink('small-btn','지도',c.url),dBtn('small-btn',`다시 굴리기 (${left})`,{data:{eatroll:'again'},disabled:!left})])
      :(eat.busy||dice.rolling?[]:[dBtn('dice-go',`🍚 ${mt} 굴리기`,{data:{eatroll:'go'}})]);
  }
  return sheet({eat:true,tabs:dice.tab==='eat'?'eat':'do',
    bases:[{attr:'eatbase',v:'near',on:eat.base==='near',label:`📍 ${nearLbl} 주변`,small:`걸어서 ${eat.walk}분`},
      ...(planUsable()?[{attr:'eatbase',v:'plan',on:eat.base==='plan',label:`🗓 ${PK.pack.city} Day ${day+1}`,small:`${D.date||''} ${MEAL_TXT[eat.meal]}`}]:[])],
    cond:{open:!!eat.cond,txt:eatCondTxt(S),rows:[...(eat.base==='near'?[dHint('기준'),dPills('eatorg',eat.org,orgs),...(MYP.some((x: any)=>x.ll)?[]:[{r:'setPlaces'}])]:[dHint('언제'),dPills('eatmeal',eat.meal,[['lunch','점심'],['dinner','저녁']])]),
      dHint('걸어서'),dPills('eatwalk',eat.walk,[[5,'5분'],[10,'10분'],[15,'15분'],[20,'20분']]),dHint('기분'),dPills('eatmood',eat.mood,EAT_MOODS.map((m: any)=>[m[0],m[1]]))]},
    stage,msg:eat.base==='near'?(eat.msg||''):(dice.msg||''),acts,ai:eat.base==='plan'&&sample&&!PK.pack.manual?{primary:false}:null,foot:'최근 5일 동안 고른 곳은 빼고 굴려요.'});
}
function doCondTxt(S: DiceState){const {doS}=S;const mood=(DO_MOODS.find((m: any)=>m[0]===doS.mood)||[])[1];return [doS.when==='now'?'지금':`이따 ${doS.at}`,doS.clen==='rest'?'코스: 오늘 끝까지':doS.clen==='half'?'코스: 반나절':'코스: 2~3시간',mood==='상관없음'?'':mood].filter(Boolean).join(' · ')}
function eatCondTxt(S: DiceState){const {eat}=S;const mood=(EAT_MOODS.find((m: any)=>m[0]===eat.mood)||[])[1];return [eat.base==='plan'?MEAL_TXT[eat.meal]:'',`걸어서 ${eat.walk}분`,mood==='상관없음'?'':mood].filter(Boolean).join(' · ')}
/** the 내 주변 / 동네 / 여행 buttons of 뭐 하지 */
export function doBases(S: DiceState){const {doS,day}=S;const nearLbl=doS.org==='gps'?'지금 위치':(mypOf(doS.org)||{}).name||'지금 위치';
  return [{attr:'dobase',v:'near',on:doS.base==='near',label:'📍 내 주변',small:nearLbl},{attr:'dobase',v:'area',on:doS.base==='area',label:'🗺 동네',small:doS.area?doS.area.name:'골라 주세요'},
    ...(planUsable()?[{attr:'dobase',v:'plan',on:doS.base==='plan',label:`🗓 ${PK.pack.city}`,small:`Day ${day+1} 빈 시간`}]:[])]}
/** 🎯 뭐 하지 around me or in a 동네 */
export function doNear(S: DiceState) {
  const {dice,doS}=S, RECENT_AREAS=S.recentAreas;
  const orgs=[['gps','지금 위치'],...MYP.filter((x: any)=>x.ll).map((x: any)=>[x.id,x.name])];
  const busy=doS.busy?{s:'die',spin:true,face:'🎲',hint:`${doS.base==='area'&&doS.area?doS.area.name:'주변'}에서 찾는 중…`}:null;
  let stage, acts;
  if(doS.course){
    const C=doS.course, cEnd=C.length?C[C.length-1].start+C[C.length-1].dur:0;
    stage=busy||{s:'course',head:`${fmt(C[0].start)}–${fmt(cEnd)} · ${C.length}곳 · 약 ${durTxt(cEnd-C[0].start)}`,src:doS.src||'',
      items:C.map((x: any,i: any)=>({t:fmt(x.start),title:`${TYPE_ICON[x.type]} ${x.name}`,sub:`${i?`앞에서 걸어서 ${x.walk}분`:`${doS.where}에서 걸어서 ${x.walk}분`} · ${x.cat}${x.meal?` · ${x.meal==='lunch'?'점심':'저녁'}`:''}`,url:String(x.url||''),name:x.name}))};
    acts=doS.busy?[]:[dBtn('small-btn primary','📌 이 코스 저장',{id:'doSave'}),dBtn('small-btn','다시 짜기',{data:{dogo:'course'}}),dBtn('small-btn','하나만 굴리기',{data:{dogo:'one'}})];
  }else if(doS.pick){
    const c=doS.pick,left=Math.max(0,3-doS.rolls);
    stage=busy||(dice.rolling?dSpin():{s:'placeCard',title:`${TYPE_ICON[c.type]} ${c.name}`,line:`걸어서 약 ${c.walk}분 · ${c.cat}`,addr:c.addr||'',foot:`${doS.where} 기준 · ${doS.src}`});
    acts=doS.busy||dice.rolling?[]:doS.chosen===c.name?[{a:'status',t:'즐거운 시간 보내세요! 🎲'},dLink('small-btn primary','지도 열기',c.url),dBtn('small-btn','여기서 코스로 짜기',{data:{dogo:'course'}})]
      :[dBtn('small-btn primary','이걸로!',{id:'doPick'}),dLink('small-btn','지도',c.url),dBtn('small-btn',`다시 (${left})`,{data:{dogo:'one',again:'1'},disabled:!left}),dBtn('small-btn','코스로 짜기',{data:{dogo:'course'}})];
  }else{
    stage=busy||{s:'die',face:'⚄'};
    acts=doS.busy?[]:[dBtn('dice-go','🎲 하나 굴리기',{data:{dogo:'one'}}),dBtn('dice-go alt','🗺 코스 짜기',{data:{dogo:'course'}})];
  }
  return sheet({tabs:dice.tab==='eat'?'eat':'do',
    bases:doBases(S),
    picker:doS.base==='area'&&(!doS.area||doS.picking)?{focus:!!doS.focus,hits:doS.hits.map((h: any)=>({name:h.name,addr:h.addr})),recent:RECENT_AREAS.map((a: any)=>a.name)}:null,
    cond:{open:!!doS.cond,txt:doCondTxt(S),rows:[...(doS.base==='near'?[dHint('기준'),dPills('doorg',doS.org,orgs),...(MYP.some((x: any)=>x.ll)?[]:[{r:'setPlaces'}])]:[]),
      dHint('언제'),{r:'when',later:doS.when==='later',at:doS.at||''},dHint('코스 길이'),dPills('doclen',doS.clen,[['short','2~3시간 · 3곳 안팎'],['half','반나절 · 4~5곳'],['rest','오늘 끝까지']]),
      dHint('기분'),dPills('domood',doS.mood,DO_MOODS.map((m: any)=>[m[0],m[1]]))]},
    stage,msg:doS.msg||'',acts,foot:'최근 5일 동안 고른 곳은 빼고 굴려요. 영업시간은 지도에서 한 번 확인하세요.'});
}

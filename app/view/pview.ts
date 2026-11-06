// What P모드 shows (PView.tsx): the day as a board game — squares follow the day (start → places, stamped "다녀옴" once
// done → ? squares for free time → flag squares for fixed times → end); a future day stays closed until its morning; a
// rolled die shows a card. Also the 가볍게 시작 form. This only makes the props. (It used to be renderPView / pSquares /
// partQuick … in src/js/170-quick-start-pview.js.) The drawn card and the chosen die are the old code's (pSt).
import * as trip from '../data/trip';
import * as places from '../data/places';
import * as check from '../data/check';
import { state as DYs, dayStart } from '../data/days';
import { mdTxt } from '../data/season';
import { fmt } from '../logic/time';
import { norm } from '../logic/places';
import { diceGaps, nowMin } from './dice';

const CUR = trip.cur as any, PK = places.state as any, DY = DYs as any;
const { PM, CATS } = places as any;
const isWish = (id: string) => trip.wish.has(id);
const isoOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
/** 가볍게 시작: when the day starts and ends */
export const SLOTS: [string, string, number, number][] = [['morning', '오전부터', 600, 1080], ['noon', '점심부터', 720, 1200], ['after', '오후부터', 840, 1320], ['eve', '저녁만', 1080, 1380]];
export const shortFuzzy = (m: number) => { const h = Math.floor(m / 60) % 24; return `${h % 12 || 12}시${m % 60 >= 30 ? ' 반' : ''}쯤` };
export const partOfDay = (m: number) => m < 720 ? '오전' : m < 1020 ? '오후' : m < 1260 ? '저녁' : '밤';
/** the six dice of the board: [key, name, face] */
export const P_DICE: [string, string, number][] = [['any', '아무거나', 1], ['hungry', '배고파', 2], ['calm', '차분히', 3], ['dopa', '도파민', 4], ['mine', '내 카드', 5], ['legs', '다리 아파', 6]];
/** what the old code tells the board: 미리 열기 on, in the demo, AI connected */
export interface PViewOpts { ahead: boolean; demo: boolean; ai: boolean }

/** 가볍게 시작 / 오늘 어디서 놀아요 (OnbBody.tsx Quick); it sets p.q if missing */
export function partQuick(p: any,dayOnly: boolean){
  const q=p.q||(p.q={when:'',len:dayOnly?'0':'',slot:'noon'});
  return {f:'quick',dest:p.dest??'',dayOnly:!!dayOnly,when:String(q.when??''),date:p.dateSet!==false?String(p.startDate??''):'',len:String(q.len??''),slot:String(q.slot??''),
    slots:SLOTS.map((s: any)=>[s[0],s[1]]),kws:['맛집','카페','산책','쇼핑','전시','한잔','사진','자연'].map((k: any)=>({k,on:CUR.kws.some((x: any)=>norm(x)===norm(k))})),party:p.party.type};
}
/** where "now" is on this day: past day → everything done, today → the clock, future → nothing yet */
export function pClock(day: number){const dIso=DY.days[day]&&DY.days[day].iso, t=isoOf(new Date());
  if(!dIso) return {past:false,today:false,future:false,nm:-1};
  return {past:dIso<t,today:dIso===t,future:dIso>t,nm:dIso===t?nowMin():-1};
}
/** free time you can still roll for (from now on, when it's today) */
export function pGaps(day: number): any[]{const c=pClock(day); if(c.past) return [];
  return diceGaps(day).map((g: any)=>c.today?{s:Math.max(g.s,Math.ceil(c.nm/15)*15),e:g.e,prev:g.prev}:g).filter((g: any)=>g.e-g.s>=45);
}
function pSquares(day: number){
  const c=pClock(day), items=check.analyze(day).items.filter((i: any)=>!i.stay), gaps=pGaps(day), out: any[]=[];
  const start=DY.loc[DY.days[day].startLoc], firstT=items.length?items[0].start:dayStart(day);
  // day 1 begins with its fixed trip from home, so it needs no start square
  if(day>0) out.push({k:'start',t:-1,top:'출발',name:start?String(start.name):'',stamp:c.past||(c.today&&c.nm>=firstT)});
  const seq: any[]=[];
  items.forEach((i: any)=>{const done=c.past||(c.today&&i.end<=c.nm), here=c.today&&i.start<=c.nm&&c.nm<i.end;
    seq.push(i.kind==='fixed'
      ?{k:here?'now':'flag',t:i.start,top:fmt(i.start),name:String(i.name),uid:String(i.uid),stamp:done,flag:true}
      :{k:here?'now':done?'done':'place',t:i.start,top:shortFuzzy(i.start),name:String(i.name),uid:String(i.uid),cat:i.p?String(i.p.cat):'',stamp:done})});
  gaps.forEach((g: any,gi: any)=>seq.push({k:'q',t:g.s,top:'?',name:partOfDay(g.s),gap:gi}));
  if(c.today&&!seq.some((s: any)=>s.k==='now')) seq.push({k:'now',t:c.nm,top:'지금 '+fmt(c.nm).replace(/^0/,''),name:''});
  seq.sort((a: any,b: any)=>a.t-b.t||(a.k==='now'?-1:b.k==='now'?1:0)).forEach((s: any)=>out.push(s));
  const next=DY.days[day+1]&&DY.loc[DY.days[day+1].startLoc];
  out.push({k:'end',t:1e4,top:'하루 끝',name:next?String(next.name):'집으로',stamp:c.past});
  return out.map(({t,...s}: any)=>({name:'',uid:'',cat:'',stamp:false,flag:false,gap:-1,...s}));
}
function pDiceProps(mood: string){return P_DICE.map(([k,label,n]: any)=>({k,label,n,on:mood===k}))}
function pMyCards(){const ids=CUR.wish.filter((id: any)=>PM[id]&&!CUR.placed.some((b: any)=>b.id===id));
  return {count:ids.length,list:ids.map((id: any)=>({id:String(id),name:String(PM[id].name),cat:String(PM[id].cat)}))}}
/** the board for this day (PView.tsx): closed until its morning, a drawn card, or the board itself */
export function board(day: number, pSt: any, o: PViewOpts) {
  const c=pClock(day), cards=pMyCards(), base={day,dice:pDiceProps(pSt.mood),cards};
  if(c.future&&!o.ahead&&!o.demo){
    const until=Math.round((+new Date(DY.days[day].iso+'T00:00:00')-+new Date(isoOf(new Date())+'T00:00:00'))/864e5);
    const flags=check.analyze(day).items.filter((i: any)=>i.kind==='fixed').map((i: any)=>({t:fmt(i.start),name:String(i.name)}));
    return {...base,mode:'closed',closed:{until,date:mdTxt(DY.days[day].iso)||'',started:!!(DY.days[0].iso&&DY.days[0].iso<=isoOf(new Date())),flags}};
  }
  const d=pSt.draw;
  if(d&&d.day===day){
    const x=d.cand;
    return {...base,mode:'draw',draw:{rolling:!!d.rolling,n:(P_DICE.find((v: any)=>v[0]===d.mood)||P_DICE[0])[2],mood:(P_DICE.find((v: any)=>v[0]===d.mood)||P_DICE[0])[1],
      part:partOfDay(d.g.s),left:d.left,empty:d.mood==='mine'&&!CUR.wish.some((id: any)=>PM[id])?'내 카드가 비어 있어요. 장소 탭에서 ♥ 해 봐요.':'이 주사위로 나올 곳은 다 봤어요.',ai:!!(o.ai&&!PK.pack.manual),
      card:x?{id:String(x.p.id),cat:String(x.p.cat),catName:String(CATS[x.p.cat]||''),name:String(x.p.name),dist:x.tm?`${x.mode} ${x.tm}분`:'바로 옆',note:String(x.p.note||''),
        when:`${shortFuzzy(x.arr)} 도착${isWish(x.p.id)?' · 내 카드':''}`,mine:isWish(x.p.id)}:null}};
  }
  const sq=pSquares(day), nextQ=sq.find((s: any)=>s.k==='q');
  return {...base,mode:'board',squares:sq,ahead:c.future,canRoll:!!nextQ,qLeft:sq.filter((s: any)=>s.k==='q').length,rollGap:nextQ?nextQ.gap:-1};
}

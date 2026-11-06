// One plan as a whole: its automatic name ("오사카 3박 4일"), its contents as saved / synced / shared, the line in the plan
// list (dates · blocks), and the 카톡용 글. It used to be planName / planData / planMeta / planText in src/js/180-plans.js
// (opening, copying and deleting plans are still there).
import * as trip from './trip';
import * as places from './places';
import * as days from './days';
import { analyze } from './check';
import { fmt } from '../logic/time';

const WD = ['일', '월', '화', '수', '목', '금', '토'];
const CUR = trip.cur as any, PK = places.state as any, DY = days.state, PL = trip.planList;
const clone = <T,>(o: T): T => JSON.parse(JSON.stringify(o));

/** the automatic name: "오사카 3박 4일" (or "… 하루 코스") */
export function planName(): string { const pr = CUR.profile; if (pr.kind === 'day') return `${PK.pack.city} 하루 코스`; const n = days.nightsOf(pr); return `${PK.pack.city} ${n}박 ${n + 1}일` }
/** everything the open plan holds, as saved (blocks without their uids) */
export function planData(): trip.PlanData { return { profile: clone(CUR.profile), pack: PK.pack, placed: trip.slimBlocks(CUR.placed), custom: clone(CUR.custom), fmarks: clone(CUR.fmarks), wish: CUR.wish.slice(), meals: clone(CUR.meals), done: clone(CUR.done) } }
/** what the plan list shows about the open plan: dates, how many blocks, a trip or a day course */
export function planMeta(): { name: string; dates: string; blocks: number; kind: string } {
  const D0: any = DY.days[0] || {}, Dn: any = DY.days[DY.days.length - 1] || {};
  return { name: '', dates: D0.iso ? `${D0.iso.slice(5).replace('-', '/')}${DY.days.length > 1 ? '~' + (Dn.iso || '').slice(5).replace('-', '/') : ''}` : '', blocks: CUR.placed.length, kind: CUR.profile.kind || 'trip' };
}
/** 카톡용 글: the plan as plain text, day by day */
export function planText(): string {
  const L = [`[JEPI] ${(PL.plans.find(x => x.id === PL.curPlan) || {} as any).name || planName()}`];
  if (CUR.profile.purpose) L.push(`🧭 ${CUR.profile.purpose}`);
  DY.days.forEach((D, d) => { L.push('', `📅 ${D.title.replace(/^Day \d+ · /, '') || ''} ${D.date} (${WD[D.wd]})`.replace('  ', ' '));
    analyze(d).items.filter((i: any) => !i.stay).forEach((i: any) => L.push(`${fmt(i.start)} ${i.name}${i.kind === 'place' && i.area ? ` · ${i.area}` : ''}`)) });
  L.push('', 'JEPI로 만든 일정이에요.'); return L.join('\n');
}

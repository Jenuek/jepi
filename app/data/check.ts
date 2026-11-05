// The day check with everything it needs from the trip: travel between places (a guess, or a real route when one was
// fetched), fares, opening hours, closed days, the season, 할 일 표시 warnings. The rules themselves are in
// app/logic/schedule.ts. It used to be analyze / gapsOf / travel / fareOf … in src/js/330-helpers.js and 010-trip-basics.js.
import * as trip from './trip';
import * as places from './places';
import * as days from './days';
import * as marks from './marks';
import * as season from './season';
import * as routes from './routes';
import { km, travelGuess, navLink, type LL } from '../logic/geo';
import { checkDay, gaps } from '../logic/schedule';
import { fmt } from '../logic/time';

const WD = ['일', '월', '화', '수', '목', '금', '토'];
const DAY_START = 7 * 60;
const prof = () => trip.cur.profile as any;

/** how far the traveler is happy to walk (km), from their style */
export const walkKm = (): number => { const pr = prof(), w = pr && pr.style && pr.style.walk; return w === 'lots' ? 2 : w === 'less' ? 0.7 : 1.3 };
/** an airport / station within 2 km of this point */
export function gwNear(x: LL): places.Gateway | null { for (const k in places.AIRPORTS) { const g = places.AIRPORTS[k]; if (km(x, g.ll) < 2) return g } return null }
/** the fare of a trip (local money): free on foot or by car, the gateway's fare from an airport, else by distance */
export function fareOf(a: LL, b: LL, mode: string): number {
  if (mode === '도보' || mode === '차') return 0;
  const g = gwNear(a) || gwNear(b); if (g && g.fare != null && km(a, b) > 3) return g.fare;
  const pk = places.state.pack, f = (pk && pk.fare) || { base: 0, perKm: 0, max: 0 }; let v = f.base + Math.max(0, km(a, b) - 4) * f.perKm; if (f.max > 0) v = Math.min(f.max, v);
  return f.base >= 50 ? Math.round(v / 10) * 10 : Math.round(v * 10) / 10;
}
/** a guess of how to get from a to b and how long */
export function travelEst(a: LL | null, b: LL | null) {
  if (!a || !b) return null;
  const pr = prof(), pk = places.state.pack;
  return travelGuess(a, b, { car: !!(pr && pr.local === 'car'), transitName: (pk && pk.transit) || '대중교통', walkKm: walkKm(), gateway: gwNear(a) || gwNear(b) });
}
/** how to get from a to b: the real route when one was fetched, else the guess */
export function travel(a: LL | null, b: LL | null): any {
  const e = travelEst(a, b); if (!e) return e;
  const m = e.mode === '도보' ? 'walk' : e.mode === '차' ? 'car' : 'transit'; const r = routes.get(m, a, b);
  if (!r) return Object.assign({}, e, { est: routes.provider(a!, b!) ? true : false, guess: true });
  return { mode: r.label || e.mode, min: r.min, real: true, lines: r.lines || '', tf: r.tf || 0, fare: r.fare, cur: r.cur || '', poly: r.poly };
}
/** a place's opening hours on a weekday (null: always open) */
export const hoursFor = (p: any, wd: number): [number, number] | null => p.always ? null : ((p.hoursBy && p.hoursBy[wd]) || p.hours);
export const closedOn = (p: any, wd: number): boolean => !!(p.closed && p.closed.includes(wd));

/** one day's items with their warnings, and the trips between them */
export function analyze(d: number) {
  const D = days.state.days[d], items = days.dayItems(d), wd = D.wd, MW = marks.warnings().W, L = days.state.loc[D.startLoc];
  const trans = checkDay(items, { firstDay: d === 0, start: { ll: L.ll, name: L.name }, dayStart: DAY_START, wdName: WD[wd], iso: D.iso,
    kidsInParty: prof().party.kids > 0, currency: places.state.pack!.currency || '', marksOf: marks.marksOf, hasMark: marks.hasMark, markWarnings: (uid: string) => MW.get(d + ':' + uid) || [],
    closed: (p: any) => closedOn(p, wd), outOfSeason: (p: any) => season.outOfSeason(p, D.iso) ? `${season.mdTxt(p.dates[0]) || '?'}~${season.mdTxt(p.dates[1]) || '?'}` : null,
    tips: season.bestTips, hours: (p: any) => hoursFor(p, wd), travel, fare: fareOf, nav: navLink, fmt } as any);
  return { items, trans };
}
/** a day's free time ([start, end] in minutes) */
export function gapsOf(d: number): [number, number][] { return gaps(days.dayItems(d), d === 0 ? days.arrEnd() : 480) }

/** 간식·기타 of a day (the destination's daily snack money unless changed) */
export const mealOf = (d: number): number => { const m = (trip.cur.meals || {}) as Record<string, number>; return m[d] != null ? +m[d] : ((places.state.pack && places.state.pack.snack) || 1000) };
/** what a day costs per person (local money): places, local transport, snacks; krw: what is paid in won (home trips) */
export function dayCost(d: number): { act: number; tr: number; meal: number; krw: number; yen: number } {
  const { items, trans } = analyze(d);
  const act = items.reduce((a: number, i: any) => a + (i.yen || 0), 0), tr = trans.reduce((a: number, t: any) => a + (t.fare || 0), 0), meal = mealOf(d), krw = items.reduce((a: number, i: any) => a + (i.krw || 0), 0);
  return { act, tr, meal, krw, yen: act + tr + meal };
}

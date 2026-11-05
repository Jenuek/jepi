// Changes to the schedule as a list (what the AI chat proposes, what 🎲 / 장소 찾기 / P모드 put in):
// add · add_custom · move · remove · add_place · mark. Before showing or applying them they are tried out on a copy:
// which new warnings would they bring, and can moving a time a little avoid them? (It used to be applyOpsCore /
// simulateOps / repairOps in src/js/090-ai-check.js.) The day's warnings come from the old code (analyze, connectOps).
import * as trip from './trip';
import * as places from './places';
import { fmt, parse } from '../logic/time';
import { norm } from '../logic/places';

export interface Op {
  op: 'add' | 'add_custom' | 'move' | 'remove' | 'add_place' | 'mark' | string;
  id?: string; uid?: string; day?: number | string; start?: string; dur?: number | string;
  name?: string; area?: string; category?: string; cost?: number; mark?: string; on?: boolean;
  [more: string]: unknown;
}
export interface OpsHost {
  /** the first minute a block may start on this day */
  dayStart(d: number): number;
  /** how many days the trip has */
  days(): number;
  /** the day's check: each item's name and warnings */
  items(d: number): { name: string; warns: string[] }[];
  /** a place the AI added: remember it as "방금 찾은 곳" */
  fresh(id: string): void;
}
let host: OpsHost | null = null;
export function connectOps(h: OpsHost): void { host = h }
const H = () => { if (!host) throw new Error('ops not connected'); return host };

/** true while changes are tried out on a copy (nothing is saved meanwhile) */
export const state = { dry: false };
const clone = <T,>(o: T): T => JSON.parse(JSON.stringify(o));

/** apply the changes to the current trip (the caller saves afterwards) */
export function apply(ops: Op[]): void {
  const h = H(), C = trip.cur, { PM, P } = places;
  for (const o of ops) {
    const st = parse(o.start);
    if (o.op === 'add' && PM[o.id!] && !C.placed.some(b => b.id === o.id)) C.placed.push({ uid: trip.uids.next(), id: o.id!, day: +o.day!, start: Math.max(h.dayStart(+o.day!), Math.min(1410, st!)), dur: Math.max(15, +o.dur! || PM[o.id!].dur) });
    if (o.op === 'add_custom') {
      const c = { id: 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name: String(o.name).slice(0, 40), area: places.AREAS[o.area!] ? o.area! : places.firstArea(), cat: places.CATS[o.category!] ? o.category! : 'walk', dur: Math.max(15, +o.dur! || 60), cost: Math.max(0, +o.cost! || 0), memo: 'AI가 만든 블록이에요.', tags: '', drop: false };
      C.custom.push(c); places.addCustom(c); C.placed.push({ uid: trip.uids.next(), id: c.id, day: +o.day!, start: Math.max(h.dayStart(+o.day!), Math.min(1410, st!)), dur: c.dur });
    }
    if (o.op === 'move') { const b = C.placed.find(x => x.uid === o.uid); if (b) { if (o.day != null) b.day = +o.day; if (st != null) b.start = Math.max(h.dayStart(b.day), Math.min(1410, st)); if (o.dur) b.dur = Math.max(15, +o.dur) } }
    if (o.op === 'remove') C.placed = C.placed.filter(x => x.uid !== o.uid);
    if (o.op === 'add_place' && !state.dry) {
      const pl = places.cleanPlace({ name: o.name, local: o.local, area: o.area, cat: o.category, lat: o.lat, lng: o.lng, dur: o.dur, open: o.open, closed: o.closed, cost: o.cost, costNote: o.costNote, tags: o.tags, note: o.note });
      if (pl && !P.some(p => norm(p.name) === norm(pl.name))) { places.state.pack!.places.push(pl); places.addPackPlace(pl); h.fresh(pl.id); places.savePack() }
    }
    if (o.op === 'mark') { const b = C.placed.find(x => x.uid === o.uid); const now = b ? (b.mk || []) : (C.fmarks[o.uid!] || []); if (now.includes(o.mark!) !== (o.on !== false)) trip.toggleMark(o.uid!, o.mark!) }
  }
}

/** every warning of the trip now, keyed so the same warning with other numbers counts once */
export function warnings(): Map<string, string> {
  const h = H(), s = new Map<string, string>();
  for (let d = 0; d < h.days(); d++) h.items(d).forEach(it => it.warns.forEach(w => { const k = `${d}|${it.name}|${w.replace(/\d+/g, '#')}`; if (!s.has(k)) s.set(k, `Day ${d + 1} ${it.name}: ${w}`) }));
  return s;
}

/** the warnings the trip would have with these changes (tried on a copy, then put back) */
export function simulate(ops: Op[]): Map<string, string> {
  const C = trip.cur, bk = { placed: C.placed, custom: C.custom, fmarks: C.fmarks, uidN: trip.uids.get(), n: places.P.length };
  state.dry = true; C.placed = clone(C.placed); C.custom = clone(C.custom); C.fmarks = clone(C.fmarks);
  try { apply(ops); return warnings() }
  finally { const extra = places.P.splice(bk.n); extra.forEach(p => { delete places.PM[p.id] }); C.placed = bk.placed; C.custom = bk.custom; C.fmarks = bk.fmarks; trip.uids.set(bk.uidN); state.dry = false }
}

/** the changes with times moved a little where that avoids new warnings, and the new warnings that are left */
export function repair(ops: Op[]): { ops: Op[]; warns: string[] } {
  const h = H(), base = warnings(), fresh = (m: Map<string, string>) => [...m.entries()].filter(([k]) => !base.has(k)).map(([, v]) => v);
  let now = ops.map(o => Object.assign({}, o)); let w = fresh(simulate(now));
  for (let i = 0; i < now.length && w.length; i++) {
    const o = now[i]; if (!['add', 'add_custom', 'move'].includes(o.op) || parse(o.start) == null) continue;
    const dd = o.day != null ? +o.day : ((trip.cur.placed.find(b => b.uid === o.uid) || {} as { day?: number }).day || 0), s0 = parse(o.start)!;
    let best: Op[] | null = null, bestN = w.length;
    for (const dl of [15, 30, 45, 60, 75, 90, 120, 150, -15, -30, -45, -60, -90]) {
      const s = s0 + dl; if (s < h.dayStart(dd) || s > 1380) continue;
      const t = now.map((x, j) => j === i ? Object.assign({}, x, { start: fmt(s) }) : x); const n = fresh(simulate(t)).length;
      if (n < bestN) { bestN = n; best = t; if (!n) break }
    }
    if (best) { now = best; w = fresh(simulate(now)) }
  }
  return { ops: now, warns: w };
}

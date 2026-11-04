// 친구와 함께: combining two people's changes to one shared trip (it used to be merge3 / mergePlan in src/js/384-trips.js).
// Each device remembers the last server version it saw (base). When both changed the trip, the three versions are merged
// per block / per place / per field: a change to day 1 and a change to day 2 both survive; only the very same thing changed
// twice keeps mine (the newest change here). ♥ (wish) is personal and never merged.
import type { Block, PlanData } from './trip';

type Obj = Record<string, unknown>;
const same = (a: unknown, b: unknown) => (a === undefined ? '∅' : JSON.stringify(a)) === (b === undefined ? '∅' : JSON.stringify(b));

/** field by field: what I did not touch takes theirs; what I changed keeps mine */
export function merge3<T extends Obj>(base: T | null | undefined, mine: T | null | undefined, theirs: T | null | undefined): T {
  const b = (base || {}) as Obj, m = (mine || {}) as Obj, t = (theirs || {}) as Obj, out: Obj = {};
  new Set([...Object.keys(b), ...Object.keys(m), ...Object.keys(t)]).forEach(k => {
    const v = same(m[k], b[k]) ? t[k] : m[k];
    if (v !== undefined) out[k] = v;
  });
  return out as T;
}

/** blocks keyed by place + day (+ a count when the same place is on the same day twice) */
export function blockMap(list: Block[] | null | undefined): Record<string, Block> {
  const n: Record<string, number> = {};
  return Object.fromEntries((list || []).map(b => { const k = b.id + '@' + b.day; n[k] = (n[k] || 0) + 1; return [k + '#' + n[k], b] }));
}
export const idMap = <T extends { id: string }>(list: T[] | null | undefined): Record<string, T> => Object.fromEntries((list || []).map(x => [x.id, x]));

const pk = (x: unknown): Obj => (x && typeof x === 'object' ? x as Obj : {});

/** merge a whole plan: trip facts by field, places / blocks / hand-made places by id, the rest by key */
export function mergePlan(base: Partial<PlanData> | null | undefined, mine: Partial<PlanData>, theirs: Partial<PlanData>): PlanData {
  const B = base || {};
  type P = { id: string };
  const places = (x: unknown) => (pk(x).places as P[] | undefined);
  const pack = Object.assign({}, pk(theirs.pack), { places: Object.values(merge3(idMap(places(B.pack)), idMap(places(mine.pack)), idMap(places(theirs.pack)))) });
  return Object.assign({}, theirs, {
    profile: merge3(B.profile, mine.profile, theirs.profile), pack,
    placed: Object.values(merge3(blockMap(B.placed), blockMap(mine.placed), blockMap(theirs.placed))),
    custom: Object.values(merge3(idMap(B.custom), idMap(mine.custom), idMap(theirs.custom))),
    fmarks: merge3(B.fmarks, mine.fmarks, theirs.fmarks), meals: merge3(B.meals, mine.meals, theirs.meals), done: merge3(B.done, mine.done, theirs.done),
    wish: mine.wish || [],
  }) as PlanData;
}

/** places and hand-made places I add to a shared trip carry my name ("민지 추천"); known = place ids already on the server */
export function stampMine(data: Partial<PlanData>, known: Set<string>, name: string): void {
  ((pk(data.pack).places as ({ id: string; by?: string })[] | undefined) || []).forEach(p => { if (!p.by && !known.has(p.id)) p.by = name });
  ((data.custom || []) as ({ by?: string })[]).forEach(c => { if (!c.by) c.by = name });
}

/** the same data? (the old code compares saved copies this way) */
export const sameData = same;

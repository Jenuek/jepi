// The trip's data in one place: what each part is called on this device, its shape, how it is saved,
// and telling whoever listens that it changed. (Step 2-② of the move to React: docs/ROADMAP.md)
//
// For now the old code (src/js) still keeps its own working copy of each part (profile, placed, …) and changes it in
// place; whenever it has changed one it calls JD.trip.save(part, value). Everything that is saved goes through here, so
// the storage names and shapes live only in this file, and React screens can read parts or listen for changes.
// The storage names are the ones used since the first version: data saved by an older version opens as it is.
import * as storage from './storage';
import { norm } from '../logic/places';

/** One block in the schedule (saved without uid; the old code gives each a uid when it loads) */
export interface Block {
  id: string;
  day: number;
  /** minutes from midnight */
  start: number;
  dur: number;
  /** 할 일 표시 (bag+, wait-, …) */
  mk?: string[];
  uid?: string;
}

/** A place the traveler made by hand */
export interface CustomPlace {
  id: string; name: string; area: string; cat: string; dur: number; cost: number;
  memo: string; tags: string; drop: boolean; share?: boolean; ll?: [number, number];
}

/** The trip facts the traveler entered (dest, dates, party, stays, …). Large and still shaped by the old code. */
export type Profile = Record<string, unknown>;

/** The parts of the current trip, and where each is saved on this device */
export interface TripParts {
  profile: Profile;
  placed: Block[];
  custom: CustomPlace[];
  /** 할 일 표시 on fixed blocks (flights, stays): uid → marks */
  fmarks: Record<string, string[]>;
  /** ♥ place ids */
  wish: string[];
  /** 간식·기타 per day (local money) */
  meals: Record<string, number>;
  /** 준비하기 ticks */
  done: Record<string, boolean>;
}
export type PartName = keyof TripParts;

const KEY: { [K in PartName]: string } = {
  profile: 'gp.profile', placed: 'gp.placed3', custom: 'gp.custom',
  fmarks: 'gp.fmarks', wish: 'gp.wish', meals: 'gp.meal2', done: 'gp.done',
};

/** Everything one plan holds (saved as "gp.plan.<id>", synced as one document) */
export interface PlanData {
  profile: Profile;
  pack: unknown;
  placed: Block[];
  custom: CustomPlace[];
  fmarks: TripParts['fmarks'];
  wish: string[];
  meals: TripParts['meals'];
  done: TripParts['done'];
}

/** blocks as they are saved: no uid, marks only when there are some */
export function slimBlocks(list: Block[]): Block[] {
  return list.map(({ id, day, start, dur, mk }) => (mk && mk.length ? { id, day, start, dur, mk } : { id, day, start, dur }));
}

type Listener = (part: string, value: unknown) => void;
const listeners = new Set<Listener>();
const latest: Partial<Record<string, unknown>> = {};
function emit(part: string, value: unknown) {
  latest[part] = value;
  listeners.forEach(f => { try { f(part, value) } catch { /* a listener's own problem */ } });
}

/** what was saved for this part, or the fallback (the old code checks the shape) */
export function load<K extends PartName>(part: K, fallback: TripParts[K] | null): TripParts[K] | null {
  const v = storage.get<TripParts[K] | null>(KEY[part], fallback);
  latest[part] = v;
  return v;
}

/** save one part of the current trip and tell listeners */
export function save<K extends PartName>(part: K, value: TripParts[K]): void {
  storage.set(KEY[part], part === 'placed' ? slimBlocks(value as Block[]) : value);
  emit(part, value);
}

// The old code tells us how to read its live working copy (it reassigns them, e.g. after opening another plan).
type Source = { [K in PartName]?: () => TripParts[K] } & { kws?: () => string[] };
let source: Source = {};
export function connect(s: Source): void { source = s }

/** the current value: the old code's live copy, or the last value saved or loaded */
export function get<K extends PartName>(part: K): TripParts[K] | undefined {
  const f = source[part] as (() => TripParts[K]) | undefined;
  return f ? f() : latest[part] as TripParts[K] | undefined;
}

/** listen for changes: (part, value). Returns a function that stops listening. */
export function on(f: Listener): () => void {
  listeners.add(f);
  return () => { listeners.delete(f) };
}

// ---- taste keywords (they belong to the person, not to one plan; carried into new plans) ----
export const kws = {
  get: (): string[] => (source.kws ? source.kws() : (latest.kws as string[] | undefined) ?? storage.get<string[]>('gp.kw', [])),
  load: (): string[] | null => storage.get<string[] | null>('gp.kw', null),
  save: (list: string[]): void => { storage.set('gp.kw', list); emit('kws', list) },
};

// ---- the plan list and each plan's saved copy ----
export const plans = {
  list: <T = unknown>(): T[] | null => storage.get<T[] | null>('gp.plans', null),
  current: (): string => storage.get<string>('gp.cur', ''),
  /** the list and which plan is open */
  saveList: (list: unknown[], cur: string): void => { storage.set('gp.plans', list); storage.set('gp.cur', cur); emit('plans', list) },
  get: (id: string): PlanData | null => storage.get<PlanData | null>('gp.plan.' + id, null),
  put: (id: string, data: unknown): void => { storage.set('gp.plan.' + id, data); emit('plan', id) },
  del: (id: string): void => { storage.del('gp.plan.' + id); emit('plan', id) },
};

// ---- changing the current trip (step ①-b of the move: docs/ROADMAP.md) ----
// The old code still keeps the working copies, but the changes themselves happen here: they change the live copy in
// place and save it. While the old code tries changes out (an AI check on a copy) it says "don't save now".
type SaveHook = (part: string) => boolean;
let saveHook: SaveHook = () => true;
/** the old code: false = don't save now (a try-out); it may also tidy up first (blocks) */
export function connectSaving(f: SaveHook): void { saveHook = f }
function commit<K extends PartName>(part: K): void {
  const v = get(part); if (v === undefined || !saveHook(part)) return;
  save(part, v);
}
function commitKws(): void { if (saveHook('kws')) kws.save(kws.get()) }

/** block ids on this device (u1, u2 …; not saved — given again when a plan opens) */
let uidN = 1;
export const uids = { next: (): string => 'u' + (uidN++), get: (): number => uidN, set: (n: number): void => { uidN = n } };

/** blocks of the schedule (placed) */
export const blocks = {
  find: (uid: string): Block | undefined => (get('placed') || []).find(b => b.uid === uid),
  /** put a block in (start / dur already fit the day) and save */
  add(b: { id: string; day: number; start: number; dur: number; mk?: string[] }): Block {
    const nb: Block = { uid: uids.next(), ...b };
    get('placed')!.push(nb); commit('placed'); return nb;
  },
  /** change a block's day / start / length and save */
  change(uid: string, c: Partial<Pick<Block, 'day' | 'start' | 'dur' | 'id'>>): Block | undefined {
    const b = blocks.find(uid); if (!b) return;
    Object.assign(b, c); commit('placed'); return b;
  },
  /** take a block out and save */
  remove(uid: string): void {
    const list = get('placed')!, i = list.findIndex(b => b.uid === uid);
    if (i >= 0) { list.splice(i, 1); commit('placed') }
  },
  /** save after the list was changed in some other way */
  saved: (): void => commit('placed'),
};

/** 할 일 표시 (bag+, wait- …) on a block, or on a fixed block (flight, stay) by its uid */
export function toggleMark(uid: string, m: string): void {
  const b = blocks.find(uid);
  if (b) { b.mk = b.mk || []; const i = b.mk.indexOf(m); if (i >= 0) b.mk.splice(i, 1); else b.mk.push(m); commit('placed'); return }
  const fm = get('fmarks')!, a = fm[uid] = fm[uid] || [], i = a.indexOf(m);
  if (i >= 0) a.splice(i, 1); else a.push(m);
  if (!a.length) delete fm[uid];
  commit('fmarks');
}

/** ♥ places */
export const wish = {
  has: (id: string): boolean => (get('wish') || []).includes(id),
  toggle(id: string): boolean { const w = get('wish')!, i = w.indexOf(id); if (i >= 0) w.splice(i, 1); else w.push(id); commit('wish'); return i < 0 },
  /** add these (the ones not there yet) and save once */
  add(ids: string[]): void { const w = get('wish')!; ids.forEach(id => { if (!w.includes(id)) w.push(id) }); commit('wish') },
};

/** 준비하기 ticks */
export function tick(id: string, on: boolean): void { get('done')![id] = on; commit('done') }
/** 간식·기타 of a day (local money) */
export function setMeal(day: number, v: number): void { get('meals')![day] = v; commit('meals') }

/** taste keywords: compared without spaces / case */
const same = (a: string, b: string) => norm(a) === norm(b);
export const keywords = {
  /** on/off; returns whether it is on now */
  toggle(k: string): boolean { const l = kws.get(), i = l.findIndex(x => same(x, k)); if (i >= 0) l.splice(i, 1); else l.push(k); commitKws(); return i < 0 },
  /** add if not there (max: only while fewer than this); returns whether it was added */
  add(k: string, max = Infinity): boolean { const l = kws.get(); k = String(k || '').trim(); if (!k || l.some(x => same(x, k)) || l.length >= max) return false; l.push(k); commitKws(); return true },
  addAll(ks: string[]): void { const l = kws.get(); ks.forEach(k => { if (k && !l.some(x => same(x, k))) l.push(k) }); commitKws() },
  remove(i: number): void { kws.get().splice(i, 1); commitKws() },
};

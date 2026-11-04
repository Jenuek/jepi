// The trip's data in one place: what each part is called on this device, its shape, how it is saved,
// and telling whoever listens that it changed. (Step 2-② of the move to React: docs/ROADMAP.md)
//
// For now the old code (src/js) still keeps its own working copy of each part (profile, placed, …) and changes it in
// place; whenever it has changed one it calls JD.trip.save(part, value). Everything that is saved goes through here, so
// the storage names and shapes live only in this file, and React screens can read parts or listen for changes.
// The storage names are the ones used since the first version: data saved by an older version opens as it is.
import * as storage from './storage';

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

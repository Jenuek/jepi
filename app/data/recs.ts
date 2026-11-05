// 👍 여행자 추천: places travelers recommend, shared by everyone going to the same city (it used to be recsFetch /
// writeMine / toggleRec … in src/js/070-shared-recs.js). One row per person per place in the server table jepi_recs
// (anyone may read; you write only your own — supabase/schema.sql). A place is known by "city|name" (both squeezed).
// What a recommended place looks like as a card (the old place list) stays in the old code.
import { norm } from '../logic/places';
import { SYNC, syncOn, sbTable, sbPublicGet } from './server';
import { appError } from './errors';

/** one recommendation as saved (the place's facts, so others can see it without having it) */
export interface RecEntry {
  k: string; city: string; name: string; local: string; cat: string; area: string; lat: number; lng: number; dur: number;
  open: string | null; closed: number[]; cost: number; note: string; tags: string[]; made: boolean; at: number;
}
export type RecStatus = 'off' | 'on' | 'readonly';

/** shared with the old code (REC): everyone's recommendations for the city loaded last, mine, and the status */
export const state = {
  docs: [] as { uid: string; items: RecEntry[] }[],
  mine: [] as RecEntry[],
  count: new Map<string, number>(),
  /** off: not loaded · readonly: logged out (look only) · on: I can recommend too */
  status: 'off' as RecStatus,
  /** a note after the status line ("저장하지 못했어요 …") */
  msg: '',
};

export const cityKey = (city: unknown): string => norm(city || '');
export const placeKey = (city: unknown, name: unknown): string => cityKey(city) + '|' + norm(name);
export const countOf = (k: string): number => state.count.get(k) || 0;
export const isMine = (k: string): boolean => state.mine.some(e => e.k === k);
/** how many places are recommended in this city */
export const cityCount = (city: unknown): number => { const ck = cityKey(city) + '|'; return [...state.count.keys()].filter(k => k.startsWith(ck)).length };

function recount(): void {
  const c = new Map<string, number>();
  state.docs.forEach(d => { const seen = new Set<string>(); (d.items || []).forEach(e => { if (!e || typeof e.k !== 'string' || seen.has(e.k)) return; seen.add(e.k); c.set(e.k, (c.get(e.k) || 0) + 1) }) });
  state.count = c;
}
function putMine(items: RecEntry[]): void {
  state.mine = items;
  const me = (SYNC.sess && SYNC.sess.user) || '', i = state.docs.findIndex(d => d.uid === me);
  if (i >= 0) state.docs[i] = { uid: me, items }; else state.docs.push({ uid: me, items });
  recount();
}

/** recommended places of this city that are not in `have` (place keys), one entry each */
export function others(city: unknown, have: Set<string>): Map<string, RecEntry> {
  const ck = cityKey(city) + '|', pick = new Map<string, RecEntry>();
  state.docs.forEach(d => (d.items || []).forEach(e => { if (e && typeof e.k === 'string' && e.k.startsWith(ck) && !have.has(e.k) && !pick.has(e.k)) pick.set(e.k, e) }));
  return pick;
}

/** load everyone's recommendations for this city; false when there is nothing to load (no server or no city) */
export async function fetchCity(city: unknown): Promise<boolean> {
  if (!SYNC.url || !SYNC.key) return false;
  const c = cityKey(city); if (!c) return false;
  const r = await sbPublicGet('jepi_recs', '?select=user_id,k,entry&city=eq.' + encodeURIComponent(c) + '&limit=5000');
  if (!r.ok) throw appError('network', '추천을 불러오지 못했어요');
  const rows: { user_id: string; k: string; entry: RecEntry }[] = await r.json(), by = new Map<string, RecEntry[]>();
  rows.forEach(x => { if (!by.has(x.user_id)) by.set(x.user_id, []); by.get(x.user_id)!.push(Object.assign({}, x.entry, { k: x.k })) });
  state.docs = [...by].map(([uid, items]) => ({ uid, items }));
  const me = syncOn() ? SYNC.sess!.user : null;
  state.mine = me ? (by.get(me) || []).slice() : [];
  state.status = me ? 'on' : 'readonly';
  recount();
  return true;
}

/** make my recommendations for this city these (counts change right away; the server is told the difference).
 *  false when it could not be saved (then state.msg says so, or the status falls back to readonly when logged out). */
export async function setMine(city: unknown, items: RecEntry[]): Promise<boolean> {
  if (!syncOn()) { state.status = 'readonly'; return false }
  const user = SYNC.sess!.user, before = new Map(state.mine.map(e => [e.k, e])), after = new Map(items.map(e => [e.k, e]));
  putMine(items);
  try {
    const add = [...after].filter(([k]) => !before.has(k)).map(([k, e]) => ({ user_id: user, k, city: cityKey(city), entry: e, at: Date.now() }));
    const del = [...before.keys()].filter(k => !after.has(k));
    if (add.length) await sbTable('jepi_recs', 'POST', '?on_conflict=user_id,k', add, 'resolution=merge-duplicates,return=minimal');
    for (const k of del) await sbTable('jepi_recs', 'DELETE', '?k=eq.' + encodeURIComponent(k) + '&user_id=eq.' + user, null, 'return=minimal');
    state.msg = ''; return true;
  } catch { state.msg = '저장하지 못했어요. 잠시 뒤 다시 눌러 주세요.'; return false }
}

/** 👍 on/off for one place (entry: the place as it would be saved); false when it did nothing or could not save */
export async function toggle(city: unknown, entry: RecEntry): Promise<boolean> {
  if (state.status !== 'on') { state.msg = '로그인하면 추천할 수 있어요 (더보기 → 설정).'; return false }
  const on = isMine(entry.k);
  return setMine(city, on ? state.mine.filter(e => e.k !== entry.k) : [...state.mine, entry]);
}

/** the line above the place cards ("👍 여행자 추천 3곳이 …"), '' when off */
export function statusText(city: unknown): string {
  const n = cityCount(city);
  if (state.status === 'on') return `👍 여행자 추천 ${n}곳이 이 여행지에 모여 있어요.${state.msg ? ' ' + state.msg : ''}`;
  if (state.status === 'readonly') return `👍 여행자 추천 ${n}곳 · 로그인하면 나도 추천할 수 있어요.${state.msg && !/로그인/.test(state.msg) ? ' ' + state.msg : ''}`;
  return '';
}

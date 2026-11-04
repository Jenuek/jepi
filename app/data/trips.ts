// 친구와 함께: shared trips on the server (it used to be tripPush / tripsPull / tripShare … in src/js/384-trips.js).
// A shared trip keeps its plan in jepi_trips (one row; `rev` goes up by one on every save). Each device remembers the
// last server version it saw (`base`, saved as "jepi.tripBase"). Two people's changes are merged with merge.ts.
// Server tables + rules: supabase/schema.sql. The screens (friends panel, toasts, opening a plan) stay in the old code,
// which connects with connectTrips(host).
import * as storage from './storage';
import * as trip from './trip';
import { mergePlan, stampMine, sameData } from './merge';
import { SYNC, sbTable } from './server';
import type { PlanMeta } from './types';

export interface SharedPlan extends PlanMeta { shared?: boolean; role?: string; custom_name?: boolean }
export interface Member { trip_id: string; user_id: string; role: string; name: string }
export interface Mark { trip_id: string; place_id: string; user_id: string; name: string }

/** the old code's side: its plan list, the open plan, and what to do on screen */
export interface TripsHost {
  plans(): SharedPlan[];
  curPlan(): string;
  savePlans(): void;
  /** put a new version into the open plan; false while the person is typing (try again on the next pull) */
  applyIfOpen(id: string, data: unknown, who?: string): boolean;
  myName(): string;
  snapshotCurrent(): void;
  toast(msg: string): void;
  /** after a pull: redraw what shows shared trips (listChanged: the plan list changed) */
  pulled(listChanged: boolean): void;
}
let host: TripsHost | null = null;
// read when the old code connects: after the demo sandbox has been set up (data/index.ts installData)
export function connectTrips(h: TripsHost): void { host = h; state.base = storage.get<typeof state.base>('jepi.tripBase', {}) || {} }
const H = () => { if (!host) throw new Error('trips not connected'); return host };

/** shared with the old code (TRIPS): the server versions seen, members and 가고 싶어요 per trip */
export const state = {
  base: {} as Record<string, { rev: number; data: unknown }>,
  members: {} as Record<string, Member[]>,
  marks: {} as Record<string, Record<string, Mark[]>>,
};
export const saveBase = () => storage.set('jepi.tripBase', state.base);
const enc = encodeURIComponent;
const planOf = (id: string) => H().plans().find(p => p.id === id);
const me = () => (SYNC.sess && SYNC.sess.user) || '';
const knownPlaces = (id: string) => new Set<string>((((state.base[id] || {}).data as any)?.pack?.places || []).map((p: { id: string }) => p.id));

/** send my version of a shared trip; when someone else saved in between, merge and try again (3 times) */
export async function push(id: string): Promise<void> {
  const p = planOf(id); if (!p || !p.shared || p.role === 'view') return;
  const mine = trip.plans.get(id), b = state.base[id]; if (!mine || (b && sameData(b.data, mine))) return;
  stampMine(mine, knownPlaces(id), H().myName());
  for (let i = 0; i < 3; i++) {
    const srv = (await sbTable('jepi_trips', 'GET', `?id=eq.${enc(id)}&select=rev,data`))[0];
    if (!srv) { p.shared = false; p.role = ''; H().savePlans(); H().toast('공유가 끝난 여행이라 내 계획으로 남겼어요'); return }
    const next = b && srv.rev !== b.rev ? mergePlan(b.data as any, mine, srv.data) : mine;
    const res = await sbTable('jepi_trips', 'PATCH', `?id=eq.${enc(id)}&rev=eq.${srv.rev}`, { data: next, rev: srv.rev + 1, updated: Date.now(), last_by: H().myName(), name: p.name }, 'return=representation');
    if (res && res.length) {
      state.base[id] = { rev: srv.rev + 1, data: next }; saveBase();
      if (!sameData(next, mine)) { trip.plans.put(id, next); H().applyIfOpen(id, next) }
      return;
    }
  }
}

/** get members, shared trips (merging with what I changed here) and 가고 싶어요 */
export async function pull(): Promise<void> {
  const h = H(), my = me(), plans = h.plans();
  const mem: Member[] = await sbTable('jepi_trip_members', 'GET', '?select=trip_id,user_id,role,name') || [];
  state.members = {}; mem.forEach(m => (state.members[m.trip_id] = state.members[m.trip_id] || []).push(m));
  const mine = mem.filter(m => m.user_id === my), ids = mine.map(m => m.trip_id);
  let listChanged = false;
  plans.filter(p => p.shared && !ids.includes(p.id)).forEach(p => { p.shared = false; p.role = ''; listChanged = true; delete state.base[p.id] });
  if (ids.length) {
    const rows = await sbTable('jepi_trips', 'GET', `?id=in.(${ids.map(enc).join(',')})&select=id,name,rev,data,updated,last_by,owner`) || [];
    for (const r of rows) {
      const role = (mine.find(m => m.trip_id === r.id) || {} as Member).role || 'view', b = state.base[r.id]; let p = planOf(r.id);
      if (!p) { p = { id: r.id, name: r.name || '함께하는 여행', custom_name: true }; plans.push(p); listChanged = true }
      if (!p.shared || p.role !== role) { p.shared = true; p.role = role; listChanged = true }
      if (b && b.rev === r.rev) continue;
      const local = trip.plans.get(r.id);
      const next = !local || !b || role === 'view' || sameData(local, b.data) ? r.data : mergePlan(b.data as any, local, r.data);
      if (!h.applyIfOpen(r.id, next, r.last_by)) continue;
      trip.plans.put(r.id, next); Object.assign(p, { updated: +r.updated || Date.now() }); state.base[r.id] = { rev: r.rev, data: r.data }; listChanged = true;
      if (!sameData(next, r.data)) setTimeout(() => push(r.id).catch(() => { }), 300);
    }
    const mk: Mark[] = await sbTable('jepi_trip_marks', 'GET', `?trip_id=in.(${ids.map(enc).join(',')})&select=trip_id,place_id,user_id,name`) || [];
    state.marks = {}; mk.forEach(m => { const t = state.marks[m.trip_id] = state.marks[m.trip_id] || {}; (t[m.place_id] = t[m.place_id] || []).push(m) });
  }
  saveBase();
  if (listChanged) trip.plans.saveList(plans, h.curPlan());
  h.pulled(listChanged);
}

/** share the open plan: one server function (jepi_share) makes the trip — or takes back a half-made one of mine — and
 *  makes me its owner member, so the row rules can't stop it half-way */
export async function share(): Promise<void> {
  const h = H(); h.snapshotCurrent(); const id = h.curPlan(), p = planOf(id), data = trip.plans.get(id); if (!p || !data) return;
  stampMine(data, knownPlaces(id), h.myName());
  const rev = +(await sbTable('rpc/jepi_share', 'POST', '', { p_id: id, p_name: p.name || '', p_data: data, p_member: h.myName() })) || 1;
  p.shared = true; p.role = 'owner'; state.base[id] = { rev, data }; saveBase(); h.savePlans();
  state.members[id] = [{ trip_id: id, user_id: me(), role: 'owner', name: h.myName() }];
}

/** a new invite link for the open plan (role: edit | view) */
export async function invite(role: string, origin: string): Promise<string> {
  const ab = 'abcdefghjkmnpqrstuvwxyz23456789', code = Array.from(crypto.getRandomValues(new Uint8Array(12)), x => ab[x % ab.length]).join('');
  await sbTable('jepi_trip_invites', 'POST', '', { code, trip_id: H().curPlan(), role, created_by: me() }, 'return=minimal');
  return origin + '?join=' + code;
}

/** join with an invite code; returns the trip id */
export async function join(code: string): Promise<string> {
  const id = await sbTable('rpc/jepi_join', 'POST', '', { p_code: code, p_name: H().myName() });
  await pull();
  return id;
}

/** leave the open trip (or, as its owner, take someone out: uid) */
export async function leave(uid?: string): Promise<void> {
  const h = H(), id = h.curPlan(), p = planOf(id);
  await sbTable('jepi_trip_members', 'DELETE', `?trip_id=eq.${enc(id)}&user_id=eq.${uid || me()}`, null, 'return=minimal');
  if (p && (!uid || uid === me())) { p.shared = false; p.role = ''; delete state.base[id]; saveBase(); h.savePlans(); h.toast('여행에서 나왔어요 · 계획은 내 것으로 남아요') }
  await pull();
}

/** stop sharing the open trip (friends keep the last version) */
export async function stop(): Promise<void> {
  const h = H(), id = h.curPlan(), p = planOf(id);
  await sbTable('jepi_trips', 'DELETE', `?id=eq.${enc(id)}`, null, 'return=minimal');
  if (p) { p.shared = false; p.role = '' }
  delete state.base[id]; saveBase(); h.savePlans(); h.toast('공유를 끝냈어요 · 친구들 기기에는 마지막 내용이 남아요');
}

// ----- 가고 싶어요 -----
export const wantsOf = (pid: string): Mark[] => ((state.marks[H().curPlan()] || {})[pid]) || [];
export const iWant = (pid: string): boolean => wantsOf(pid).some(m => m.user_id === me());
/** turn my 가고 싶어요 on/off for a place of the open trip; changed() redraws right away, before the server answers */
export async function toggleWant(pid: string, changed: () => void): Promise<void> {
  const id = H().curPlan(), my = me(), t = state.marks[id] = state.marks[id] || {};
  if (iWant(pid)) {
    t[pid] = wantsOf(pid).filter(m => m.user_id !== my); changed();
    await sbTable('jepi_trip_marks', 'DELETE', `?trip_id=eq.${enc(id)}&place_id=eq.${enc(pid)}&user_id=eq.${my}`, null, 'return=minimal');
  } else {
    (t[pid] = t[pid] || []).push({ trip_id: id, place_id: pid, user_id: my, name: H().myName() }); changed();
    await sbTable('jepi_trip_marks', 'POST', '', { trip_id: id, place_id: pid, user_id: my, name: H().myName() }, 'return=minimal');
  }
}

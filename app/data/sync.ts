// Sync between devices (this person's own data, server table jepi_docs).
// What goes up: each plan (not shared trips: those go through jepi_trips), taste keywords, my places,
// and the AI·map keys (only encrypted). Newest "updated" wins; a hash of what was last sent avoids resending.
//
// The values themselves still live in the old code (src/js), which connects them with connectSync().
// This file decides what to send and how to merge what comes back; the old code redraws the screens.
import * as storage from './storage';
import { hashStr } from './hash';
import { SYNC, saveSync, syncOn, sbRest } from './server';
import { vaultSeal, vaultOpen } from './vault';
import type { DocRow, PlanMeta, SealedBox } from './types';

/** What the old code hands over: its values (read live) and how to react on screen. */
export interface SyncHost {
  plans(): PlanMeta[];
  setPlans(p: PlanMeta[]): void;
  curPlan(): string;
  kws(): string[];
  setKws(k: string[]): void;
  myPlaces(): unknown[];
  setMyPlaces(m: unknown[]): void;
  keys(): Record<string, string>;
  /** replace the keys and save them without counting it as a local change */
  setKeys(k: Record<string, string>): void;
  /** the sync message shown in settings ('' = fine) */
  setErr(msg: string): void;
  afterPush(): Promise<void>;
  afterPull(r: PullResult): Promise<void>;
}

export interface PullResult {
  /** the plan list changed */
  changed: boolean;
  /** new data for the plan that is open now */
  curChanged: unknown | null;
  keysPulled: boolean;
}

/** busy: a push or pull is running. keysLocked: the server keys were locked with another password. */
export const status = { busy: false, keysLocked: false };

let host: SyncHost | null = null;
let pushT: ReturnType<typeof setTimeout> | undefined;

interface Doc { id: string; kind: DocRow['kind']; data: any; updated: number }

/** the documents this device would send */
export function syncDocs(): Doc[] {
  const h = host!, out: Doc[] = [];
  h.plans().forEach(p => {
    const d = storage.get<unknown>('gp.plan.' + p.id, null);
    if (!d || p.shared) return;   // shared trips sync through jepi_trips
    out.push({ id: 'plan:' + p.id, kind: 'plan', data: { meta: p, data: d }, updated: p.updated || Date.now() });
  });
  out.push({ id: 'kw', kind: 'kw', data: { kws: h.kws() }, updated: storage.get('jepi.kwAt', 1) });
  out.push({ id: 'myplaces', kind: 'myplaces', data: { MYP: h.myPlaces() }, updated: storage.get('jepi.mypAt', 1) });
  return out;
}

/** every local save calls this: send a moment later (saves close together go as one) */
export function syncSoon(ms?: number): void {
  if (!syncOn()) return;
  clearTimeout(pushT);
  pushT = setTimeout(syncPush, ms || 2500);
}

export async function syncPush(): Promise<void> {
  if (!host || !syncOn() || status.busy) return;
  const h = host;
  status.busy = true;
  try {
    const user = SYNC.sess!.user;
    const rows: (DocRow & { _h: string })[] = [];
    for (const d of syncDocs()) {
      const hh = hashStr(JSON.stringify(d.data.data || d.data));
      if (SYNC.sent[d.id] === hh) continue;
      rows.push(Object.assign({ user_id: user }, d, { deleted: false, _h: hh }));
    }
    const keys = h.keys();
    if (storage.get('jepi.vk', null) && Object.keys(keys).length && !status.keysLocked) {
      const hh = hashStr(JSON.stringify(keys));
      if (SYNC.sent.keys !== hh) {
        let at = storage.get('jepi.keysAt', 0);
        if (!at) { at = Date.now(); storage.set('jepi.keysAt', at) }
        const sealed = await vaultSeal(keys);
        if (sealed) rows.push({ user_id: user, id: 'keys', kind: 'keys', data: sealed, updated: at, deleted: false, _h: hh });
      }
    }
    // plans deleted on this device
    for (const id of Object.keys(SYNC.sent))
      if (id.startsWith('plan:') && !h.plans().some(p => 'plan:' + p.id === id && !p.shared) && SYNC.sent[id] !== 'x')
        rows.push({ user_id: user, id, kind: 'plan', data: {}, updated: Date.now(), deleted: true, _h: 'x' });
    if (rows.length) {
      await sbRest('POST', '?on_conflict=user_id,id', rows.map(({ _h, ...r }) => r), 'resolution=merge-duplicates,return=minimal');
      rows.forEach(r => { SYNC.sent[r.id] = r._h });
    }
    SYNC.at = Date.now(); h.setErr(''); saveSync();
  } catch (e: any) {
    h.setErr(e.message);
    if (e.code !== 'network') console.warn('sync push', e);
  }
  status.busy = false;
  await h.afterPush();
}

export async function syncPull(): Promise<void> {
  if (!host || !syncOn() || status.busy) return;
  const h = host;
  status.busy = true;
  const res: PullResult = { changed: false, curChanged: null, keysPulled: false };
  try {
    const rows: DocRow[] = await sbRest('GET', `?select=id,kind,data,updated,deleted&updated=gt.${Math.max(0, SYNC.lastPull - 5000)}&order=updated.asc`) || [];
    for (const r of rows) {
      SYNC.lastPull = Math.max(SYNC.lastPull, +r.updated || 0);
      const data = r.data as any;
      if (r.kind === 'plan') {
        const pid = r.id.slice(5), loc = h.plans().find(p => p.id === pid);
        if (loc && loc.shared) { SYNC.sent[r.id] = r.deleted ? 'x' : SYNC.sent[r.id]; continue }
        if (r.deleted) {
          if (loc && pid !== h.curPlan()) { h.setPlans(h.plans().filter(p => p.id !== pid)); storage.del('gp.plan.' + pid); res.changed = true }
          SYNC.sent[r.id] = 'x';
          continue;
        }
        const v = data || {}, m = v.meta;
        if (!m || !v.data) continue;
        const hh = hashStr(JSON.stringify(v.data));
        if (loc && SYNC.sent[r.id] === hh) continue;
        if (!loc || (+r.updated) > (loc.updated || 0)) {
          storage.set('gp.plan.' + pid, v.data);
          if (loc) Object.assign(loc, m, { updated: +r.updated });
          else h.plans().push(Object.assign({}, m, { updated: +r.updated }));
          SYNC.sent[r.id] = hh; res.changed = true;
          if (pid === h.curPlan()) res.curChanged = v.data;
        }
      } else if (r.kind === 'kw' && Array.isArray(data && data.kws) && (+r.updated) > storage.get('jepi.kwAt', 0)) {
        h.setKws(data.kws.slice()); storage.set('gp.kw', h.kws()); storage.set('jepi.kwAt', +r.updated);
        SYNC.sent.kw = hashStr(JSON.stringify(data)); res.changed = true;
      } else if (r.kind === 'keys' && data && data.ct && storage.get('jepi.vk', null) && (+r.updated) > storage.get('jepi.keysAt', 0)) {
        let got: Record<string, string> | null = null;
        try { got = await vaultOpen(data as SealedBox) } catch { got = null }
        if (!got) { status.keysLocked = true; continue }
        status.keysLocked = false;
        const mine = h.keys(), merged = Object.assign({}, mine, got), extra = Object.keys(mine).some(k => !(k in got!));
        h.setKeys(merged);
        storage.set('jepi.keysAt', extra ? Date.now() : +r.updated);
        SYNC.sent.keys = extra ? '' : hashStr(JSON.stringify(got));
        res.keysPulled = true;
      } else if (r.kind === 'myplaces' && Array.isArray(data && data.MYP) && (+r.updated) > storage.get('jepi.mypAt', 0)) {
        h.setMyPlaces(data.MYP); storage.set('jepi.myplaces', data.MYP); storage.set('jepi.mypAt', +r.updated);
        SYNC.sent.myplaces = hashStr(JSON.stringify(data)); res.changed = true;
      }
    }
    if (res.changed) { h.plans().sort((a, b) => (b.updated || 0) - (a.updated || 0)); storage.set('gp.plans', h.plans()) }
    h.setErr(''); SYNC.at = Date.now(); saveSync();
  } catch (e: any) {
    h.setErr(e.message);
  }
  status.busy = false;
  await h.afterPull(res);
}

export async function syncNow(): Promise<void> { await syncPull(); await syncPush(); await syncPull() }

/** The old code connects its values once; from then on saves push and coming back to the app pulls. */
export function connectSync(h: SyncHost): void {
  const first = !host;
  host = h;
  if (!first) return;
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') syncPull(); else syncPush() });
  setInterval(() => { if (document.visibilityState === 'visible') syncPull() }, 60000);
  addEventListener('online', () => { syncNow() });
}

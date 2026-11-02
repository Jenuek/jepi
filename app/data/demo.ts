// Demo sandbox. Entering the demo copies this browser's saved data aside, fills storage with the
// Osaka demo and reloads. Leaving (or opening the app again later) puts the copy back exactly as
// it was, so the demo never leaves a plan, a keyword or a sync change behind.
import * as storage from './storage';

export const DEMO_BACKUP = 'jepi.demoBackup';
export const DEMO_LIVE = 'jepi.demoLive';
/** caches shared by the demo and real data, never part of the copy */
export const demoKeep = (k: string): boolean => k === 'jepi.routes' || k.startsWith('jepi.hours');

/** the old code reads DEMO.on everywhere; this is that same object */
export const DEMO = { on: false };

export function demoRestore(): void {
  const raw = storage.getRaw(DEMO_BACKUP);
  if (raw == null) return;
  let snap: Record<string, string> = {};
  try { snap = JSON.parse(raw) || {} } catch { /* broken copy: just clear */ }
  storage.keys().forEach(k => { if (!(k in snap) && !demoKeep(k)) storage.del(k) });
  Object.entries(snap).forEach(([k, v]) => storage.setRaw(k, v));
  storage.del(DEMO_BACKUP);
  try { sessionStorage.removeItem(DEMO_LIVE) } catch { /* blocked */ }
}

/** Runs once at start-up, before anything reads storage. */
export function demoGuard(): void {
  try {
    if (storage.getRaw(DEMO_BACKUP) != null) {
      // same tab reloading during the demo → stay in it; a new launch → back to the real data
      if (sessionStorage.getItem(DEMO_LIVE)) DEMO.on = true; else demoRestore();
    }
  } catch { /* storage blocked */ }
}

/** Entering the demo: put a copy of everything aside. false when storage is too full to do it. */
export function demoSaveCopy(): boolean {
  try {
    const snap: Record<string, string> = {};
    Object.keys(localStorage).forEach(k => { if (k !== DEMO_BACKUP && !demoKeep(k)) snap[k] = localStorage.getItem(k) as string });
    localStorage.setItem(DEMO_BACKUP, JSON.stringify(snap));
    return true;
  } catch {
    return false;
  }
}

/** Entering the demo: clear the trip data (the copy is safe aside) so the demo trip can go in. */
export function demoClearTrips(): void {
  storage.keys().forEach(k => { if (k.startsWith('gp.') || k === 'jepi.myplaces') storage.del(k) });
}

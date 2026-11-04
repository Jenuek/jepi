// JEPI's data layer, also handed to the old code (src/js) as window.JEPI_DATA.
// Start-up order matters: the demo guard may swap storage, so it runs before anything is read.
import * as storage from './storage';
import { appError } from './errors';
import { hashStr } from './hash';
import { DEMO, DEMO_BACKUP, DEMO_LIVE, demoKeep, demoRestore, demoGuard, demoSaveCopy, demoClearTrips } from './demo';
import { SYNC, SB_DEFAULT, loadSync, saveSync, syncOn, sbAuth, keepSess, sbToken, sbTable, sbRest, sbPublicGet, sbFunctionUrl } from './server';
import { b64e, b64d, vaultMake, vaultKey, vaultSeal, vaultOpen } from './vault';
import * as trip from './trip';
import * as merge from './merge';
import * as logic from '../logic';
import * as trips from './trips';
import { status, syncDocs, syncSoon, syncPush, syncPull, syncNow, connectSync } from './sync';

export const data = {
  storage, appError, hashStr,
  /** the trip's data: saving, shapes, change listeners */
  trip,
  /** 친구와 함께: merging two people's changes */
  merge,
  /** calculations: time text, distances, the day check (app/logic) */
  logic,
  /** 친구와 함께 on the server */
  trips,
  demo: { DEMO, DEMO_BACKUP, DEMO_LIVE, demoKeep, demoRestore, demoSaveCopy, demoClearTrips },
  server: { SYNC, SB_DEFAULT, saveSync, syncOn, sbAuth, keepSess, sbToken, sbTable, sbRest, sbPublicGet, sbFunctionUrl },
  vault: { b64e, b64d, vaultMake, vaultKey, vaultSeal, vaultOpen },
  sync: { status, syncDocs, syncSoon, syncPush, syncPull, syncNow, connectSync },
};
export type JepiData = typeof data;

declare global {
  interface Window { JEPI_DATA: JepiData }
}

export function installData(): void {
  demoGuard();
  loadSync();
  window.JEPI_DATA = data;
}

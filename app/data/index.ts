// JEPI's data layer, also handed to the old code (src/js) as window.JEPI_DATA.
// Start-up order matters: the demo guard may swap storage, so it runs before anything is read.
import * as storage from './storage';
import { appError } from './errors';
import { hashStr } from './hash';
import { DEMO, DEMO_BACKUP, DEMO_LIVE, demoKeep, demoRestore, demoGuard, demoSaveCopy, demoClearTrips } from './demo';
import { SYNC, SB_DEFAULT, loadSync, saveSync, syncOn, sbAuth, keepSess, sbToken, sbTable, sbRest, sbPublicGet, sbFunctionUrl } from './server';
import { b64e, b64d, vaultMake, vaultKey, vaultSeal, vaultOpen } from './vault';
import { status, syncDocs, syncSoon, syncPush, syncPull, syncNow, connectSync } from './sync';

export const data = {
  storage, appError, hashStr,
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

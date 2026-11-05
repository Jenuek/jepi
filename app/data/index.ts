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
import * as ai from './ai';
import * as alerts from './alerts';
import * as hours from './hours';
import * as kakao from './kakao';
import * as myplaces from './myplaces';
import * as routes from './routes';
import * as account from './account';
import * as recs from './recs';
import * as nearby from './nearby';
import * as keys from './keys';
import * as places from './places';
import * as ops from './ops';
import * as logic from '../logic';
import * as trips from './trips';
import { status, syncDocs, syncSoon, syncPush, syncPull, syncNow, connectSync } from './sync';

export const data = {
  storage, appError, hashStr,
  /** the trip's data: saving, shapes, change listeners */
  trip,
  /** 친구와 함께: merging two people's changes */
  merge,
  /** the AI connection (Claude / Gemini) */
  ai,
  /** 알림 (push reminders) */
  alerts,
  /** 영업시간 from Google Places */
  hours,
  /** Kakao places / addresses, and this device's location */
  kakao,
  /** 내 장소 (집·회사·…) */
  myplaces,
  /** real routes (Google, abroad) */
  routes,
  /** log in / sign up / password reset / logout */
  account,
  /** 👍 여행자 추천 */
  recs,
  /** 🎲 places nearby (뭐 먹지 · 뭐 하지) */
  nearby,
  /** AI·지도 keys on this device */
  keys,
  /** the destination's places and the lists made from them */
  places,
  /** changes to the schedule as a list: apply, try out, avoid new warnings */
  ops,
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

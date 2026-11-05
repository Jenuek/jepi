// AI·지도 keys on this device ("jepi.keys": name → key). The old code reads them as KEYS (the same object, changed in place).
// They are read when the old code starts (after the demo sandbox is set up). Keys are never sent anywhere from here:
// the sync engine locks them with the password first (vault.ts).
import * as storage from './storage';

export const list: Record<string, string> = {};
/** read what this device has */
export function load(): void { replace(storage.get<Record<string, string>>('jepi.keys', {}) || {}) }
/** make the keys these (after they came from another device) */
export function replace(k: Record<string, string>): void { for (const x of Object.keys(list)) delete list[x]; Object.assign(list, k) }
/** save; quiet = don't mark it as changed here (it came from the server) */
export function save(quiet?: boolean): void { storage.set('jepi.keys', list); if (!quiet) storage.set('jepi.keysAt', Date.now()) }

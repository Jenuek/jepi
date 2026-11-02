// AI·map keys go to the server only encrypted, with a key made from the person's password.
// That key stays on this device ("jepi.vk"); the server can never read the keys.
// Keep these settings exactly as they are: changing any of them makes old saved keys unreadable.
import * as storage from './storage';
import type { SealedBox } from './types';

const ITERATIONS = 210000;
const saltFor = (email: string) => 'jepi-keys:' + String(email).trim().toLowerCase();

export const b64e = (u: ArrayBuffer | Uint8Array): string => btoa(String.fromCharCode(...new Uint8Array(u)));
export const b64d = (t: string): Uint8Array<ArrayBuffer> => Uint8Array.from(atob(t), c => c.charCodeAt(0));

/** make this device's lock key from email + password (at login) */
export async function vaultMake(email: string, pw: string): Promise<void> {
  const baseKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(saltFor(email)), iterations: ITERATIONS }, baseKey, 256);
  storage.set('jepi.vk', b64e(bits));
}

export async function vaultKey(): Promise<CryptoKey | null> {
  const r = storage.get<string | null>('jepi.vk', null);
  return r ? crypto.subtle.importKey('raw', b64d(r), 'AES-GCM', false, ['encrypt', 'decrypt']) : null;
}

export async function vaultSeal(obj: unknown): Promise<SealedBox | null> {
  const k = await vaultKey();
  if (!k) return null;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, new TextEncoder().encode(JSON.stringify(obj)));
  return { v: 1, iv: b64e(iv), ct: b64e(ct) };
}

/** null when there is no lock key; throws when the box was locked with another password */
export async function vaultOpen(d: SealedBox | null | undefined): Promise<any> {
  const k = await vaultKey();
  if (!k || !d || !d.ct) return null;
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64d(d.iv) }, k, b64d(d.ct));
  return JSON.parse(new TextDecoder().decode(pt));
}

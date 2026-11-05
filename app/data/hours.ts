// 영업시간: real opening hours from Google Places (abroad), AI estimate in Korea (it used to be src/js/383-hours.js).
// Only places that are on the schedule and carry an AI/estimated time ("확인 필요: 영업시간") are looked up.
// Each place is looked up once and kept in "jepi.hours" (30 days). Kakao has no opening hours, so places in Korea keep
// the estimate and say so. A monthly cap keeps Google inside its free tier ("jepi.hoursUse").
import * as storage from './storage';
import { appError } from './errors';
import { km, type LL } from '../logic/geo';
import { fromGoogle, apply, type Hours } from '../logic/hours';

export const CAP = 900;   // Google Place Details / Text Search with opening hours: 1,000 free per month
type Place = Record<string, any> & { ll: LL; name: string; local?: string };

export interface HoursHost {
  /** the places on the schedule */
  placesOnSchedule(): Place[];
  googleKey(): string;
  keyBad(): boolean;
  demo(): boolean;
  inKorea(ll: LL): boolean;
  city(): string;
  /** some places got their hours: save and redraw */
  changed(): void;
}
let host: HoursHost | null = null;
export function connectHours(h: HoursHost): void { host = h }

/** Google says the key can't do this (shown in 설정) */
export const state = { off: '', busy: false };

const cache = (): Record<string, Hours & { t: number }> => storage.get('jepi.hours', {}) || {};
const keyOf = (p: Place) => `${p.local || p.name}|${(+p.ll[0]).toFixed(3)}|${(+p.ll[1]).toFixed(3)}`;
/** looked up this month (add: count more) */
export function used(add?: number): number {
  const m = new Date().toISOString().slice(0, 7); let u = storage.get('jepi.hoursUse', { m, n: 0 }); if (u.m !== m) u = { m, n: 0 };
  if (add) { u.n += add; storage.set('jepi.hoursUse', u) }
  return u.n;
}
const needs = (p: Place | undefined) => !!(p && p.ll && host && !host.inKorea(p.ll) && p.hsrc !== 'google' && !p.always && p.hours && (p.verify === '영업시간' || p.ai));

async function lookup(p: Place, key: string): Promise<Hours> {
  const r = await fetch('https://places.googleapis.com/v1/places:searchText', { method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': 'places.displayName,places.location,places.regularOpeningHours,places.businessStatus' },
    body: JSON.stringify({ textQuery: `${p.local || p.name} ${host!.city() || ''}`.trim(), maxResultCount: 1, languageCode: 'ko',
      locationBias: { circle: { center: { latitude: +p.ll[0], longitude: +p.ll[1] }, radius: 1500 } } }) });
  if (r.status === 403 || r.status === 400) { let m = ''; try { m = (await r.json()).error.message || '' } catch { /* */ } throw appError('off', /not been used|disabled|not enabled|blocked/i.test(m) ? 'Google Cloud에서 Places API (New)를 켜 주세요.' : 'Google 키가 장소 정보를 쓸 수 없어요.') }
  if (!r.ok) throw appError('net', 'HTTP ' + r.status);
  const j = await r.json(), x = j.places && j.places[0];
  if (!x || !x.location || km([x.location.latitude, x.location.longitude], p.ll) > 0.8) return { miss: true };
  if (x.businessStatus === 'CLOSED_PERMANENTLY') return { gone: true };
  return fromGoogle(x.regularOpeningHours) || { miss: true };
}

/** look up a few places that still have estimated hours (at most 12 at a time, within the monthly cap) */
export async function sweep(): Promise<void> {
  const h = host; if (!h || state.busy || state.off || h.demo() || document.hidden) return;
  const key = h.googleKey(); if (!key || h.keyBad()) return;
  const todo = h.placesOnSchedule().filter(needs); if (!todo.length) return;
  state.busy = true; const c = cache(), now = Date.now(); let changed = false, asked = 0;
  try {
    for (const p of todo) {
      const k = keyOf(p), hit = c[k];
      if (hit && now - hit.t < 30 * 864e5) { if (!hit.miss && apply(p, hit)) changed = true; else if (hit.miss) p.hsrc = 'miss'; continue }
      if (used() >= CAP || asked >= 12) break;
      asked++; used(1);
      const got = await lookup(p, key); c[k] = Object.assign({ t: now }, got);
      if (!got.miss && apply(p, got)) changed = true; else p.hsrc = 'miss';
    }
  } catch (e) { if ((e as { code?: string }).code === 'off') state.off = (e as Error).message }
  storage.set('jepi.hours', c); state.busy = false;
  if (changed) h.changed();
}

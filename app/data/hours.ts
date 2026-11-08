// 영업시간: real opening hours from Google Places (abroad), AI estimate in Korea (it used to be src/js/383-hours.js).
// Only places that are on the schedule and carry an AI/estimated time ("확인 필요: 영업시간") are looked up.
// Each place is looked up once and kept in "jepi.hours" (30 days). Kakao has no opening hours, so places in Korea keep
// the estimate and say so. A monthly cap keeps Google inside its free tier ("jepi.hoursUse").
import * as storage from './storage';
import { appError } from './errors';
import { km, type LL } from '../logic/geo';
import { fromGoogle, apply, type Hours } from '../logic/hours';
import { nameSim } from '../logic/places';
import { isGoogleId } from './gplaces';

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

type Got = Hours & { gid?: string };
const cache = (): Record<string, Got & { t: number }> => storage.get('jepi.hours', {}) || {};
// 구글 장소 ID가 있으면 그걸로 (이름이 같은 다른 지점과 섞이지 않아요)
const keyOf = (p: Place) => isGoogleId(p.gid) ? 'g:' + p.gid : `${p.local || p.name}|${(+p.ll[0]).toFixed(3)}|${(+p.ll[1]).toFixed(3)}`;
/** looked up this month (add: count more) */
export function used(add?: number): number {
  const m = new Date().toISOString().slice(0, 7); let u = storage.get('jepi.hoursUse', { m, n: 0 }); if (u.m !== m) u = { m, n: 0 };
  if (add) { u.n += add; storage.set('jepi.hoursUse', u) }
  return u.n;
}
// 구글 장소 ID가 있는 곳(장소 검색으로 넣은 곳)은 영업시간이 아직 없어도 조회해요
const needs = (p: Place | undefined) => !!(p && p.ll && host && !host.inKorea(p.ll) && p.hsrc !== 'google' && !p.gone
  && (isGoogleId(p.gid) ? p.verify === '영업시간' : (!p.always && p.hours && (p.verify === '영업시간' || p.ai))));

async function offError(r: Response): Promise<never> {
  let m = ''; try { m = (await r.json()).error.message || '' } catch { /* */ }
  throw appError('off', /not been used|disabled|not enabled|blocked/i.test(m) ? 'Google Cloud에서 Places API (New)를 켜 주세요.' : 'Google 키가 장소 정보를 쓸 수 없어요.');
}

/** 장소 ID로 바로 조회 (이름으로 찾는 것보다 정확해요) */
async function byId(gid: string, key: string): Promise<Got> {
  const r = await fetch('https://places.googleapis.com/v1/places/' + encodeURIComponent(gid) + '?languageCode=ko', { headers: { 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': 'id,regularOpeningHours,businessStatus' } });
  if (r.status === 403 || r.status === 400) return offError(r);
  if (r.status === 404) return { miss: true };
  if (!r.ok) throw appError('net', 'HTTP ' + r.status);
  const x = await r.json();
  if (x.businessStatus === 'CLOSED_PERMANENTLY') return { gone: true, gid };
  return Object.assign(fromGoogle(x.regularOpeningHours) || { miss: true }, { gid });
}

async function lookup(p: Place, key: string): Promise<Got> {
  if (isGoogleId(p.gid)) return byId(p.gid, key);
  const r = await fetch('https://places.googleapis.com/v1/places:searchText', { method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.regularOpeningHours,places.businessStatus' },
    body: JSON.stringify({ textQuery: `${p.local || p.name} ${host!.city() || ''}`.trim(), maxResultCount: 1, languageCode: 'ko',
      locationBias: { circle: { center: { latitude: +p.ll[0], longitude: +p.ll[1] }, radius: 1500 } } }) });
  if (r.status === 403 || r.status === 400) return offError(r);
  if (!r.ok) throw appError('net', 'HTTP ' + r.status);
  const j = await r.json(), x = j.places && j.places[0];
  if (!x || !x.location || km([x.location.latitude, x.location.longitude], p.ll) > 0.8) return { miss: true };
  // 이름이 비슷할 때만 이 장소의 ID로 삼아요 (같은 장소 묶기가 써요)
  const dn = String((x.displayName && x.displayName.text) || ''), gid = x.id && Math.max(nameSim(dn, p.name), p.local ? nameSim(dn, p.local) : 0) >= .5 ? String(x.id) : undefined;
  if (x.businessStatus === 'CLOSED_PERMANENTLY') return { gone: true, gid };
  return Object.assign(fromGoogle(x.regularOpeningHours) || { miss: true }, { gid });
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
      if (hit && now - hit.t < 30 * 864e5) { if (hit.gid && !p.gid) { p.gid = hit.gid; changed = true } if (!hit.miss && apply(p, hit)) changed = true; else if (hit.miss) p.hsrc = 'miss'; continue }
      if (used() >= CAP || asked >= 12) break;
      asked++; used(1);
      const got = await lookup(p, key); c[k] = Object.assign({ t: now }, got);
      if (got.gid && !p.gid) { p.gid = got.gid; changed = true }
      if (!got.miss && apply(p, got)) changed = true; else p.hsrc = 'miss';
    }
  } catch (e) { if ((e as { code?: string }).code === 'off') state.off = (e as Error).message }
  storage.set('jepi.hours', c); state.busy = false;
  if (changed) h.changed();
}

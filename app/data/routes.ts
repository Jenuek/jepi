// 경로: real travel times from Google Routes (abroad), kept on this device ("jepi.routes"). (It used to be src/js/200-routes.js.)
// Korea: Kakao gives no walking / public-transport routes to outside apps, so trips in Korea use the straight-line
// estimate (≈), and "안내 시작" opens Kakao Map with the start and the destination filled in (logic/geo.ts navLink).
// A route is asked for the first time it is needed (two at a time); until it comes the estimate is shown.
import * as storage from './storage';
import { appError } from './errors';
import { km, inKorea, decodePolyline, thinPolyline, type LL } from '../logic/geo';

export interface Route { min: number; label: string; lines: string; tf: number; fare: number | null; cur: string; poly: LL[] | null; km: number; src: string; t?: number; fail?: number }
export type Mode = 'walk' | 'car' | 'transit';
interface Job { k: string; m: Mode; a: LL; b: LL; pv: string }

export interface RoutesHost {
  googleKey(): string;
  /** the Google key turned out not to work (the old code's keyBad.google) */
  googleBad(): boolean;
  keyBroken(): void;
  /** some routes came: redraw when it is a good moment */
  arrived(): void;
}
let host: RoutesHost | null = null;
let cache: Record<string, Route> = {};
export function connectRoutes(h: RoutesHost): void { host = h; cache = storage.get('jepi.routes', {}) || {} }
export const stats = { ok: 0, fail: 0 };

let saveT = 0;
function saveSoon() {
  clearTimeout(saveT);
  saveT = window.setTimeout(() => {
    const ks = Object.keys(cache);
    if (ks.length > 700) ks.sort((a, b) => (cache[a].t || 0) - (cache[b].t || 0)).slice(0, ks.length - 600).forEach(k => delete cache[k]);
    storage.set('jepi.routes', cache);
  }, 800);
}

/** who can give a real route between a and b: 'google', or null (then the estimate is used) */
export function provider(a: LL, b: LL): string | null {
  if (inKorea(a) && inKorea(b)) return null;
  return host && host.googleKey() && !host.googleBad() ? 'google' : null;
}
const key = (m: Mode, a: LL, b: LL) => `${m}|${(+a[0]).toFixed(4)},${(+a[1]).toFixed(4)}|${(+b[0]).toFixed(4)},${(+b[1]).toFixed(4)}`;
const queue: Job[] = [], queued = new Set<string>(); let active = 0;

/** the saved route, or null (and ask for it in the background when it can be had) */
export function get(m: Mode, a: LL | null, b: LL | null): Route | null {
  if (!a || !b || !isFinite(a[0]) || !isFinite(b[0]) || (!a[0] && !a[1]) || (!b[0] && !b[1])) return null;
  const k = key(m, a, b), v = cache[k];
  if (v && !v.fail) return v;
  if (v && v.fail && Date.now() - (v.t || 0) < 6 * 3600e3) return null;
  const pv = provider(a, b); if (!pv) return null;
  if (!queued.has(k)) { queued.add(k); queue.push({ k, m, a, b, pv }); pump() }
  return null;
}
function pump() {
  while (active < 2 && queue.length) {
    const j = queue.shift()!; active++;
    fetchRoute(j).then(v => { if (v) { v.t = Date.now(); cache[j.k] = v; stats.ok++ } else { cache[j.k] = { fail: 1, t: Date.now() } as Route; stats.fail++ } })
      .catch(e => { if (e && e.code === 'not_granted') host && host.keyBroken(); else cache[j.k] = { fail: 1, t: Date.now() } as Route; stats.fail++ })
      .finally(() => { active--; queued.delete(j.k); saveSoon(); host && host.arrived(); pump() });
  }
}

/** noon tomorrow where the trip is (transit times depend on the hour) */
function middayAt(lng: number): string {
  const d = new Date(Date.now() + 86400e3); const uh = 12 - Math.round(lng / 15);
  d.setUTCHours(((uh % 24) + 24) % 24, 0, 0, 0); if (d.getTime() < Date.now() + 3600e3) d.setTime(d.getTime() + 86400e3);
  return d.toISOString();
}
const VEH: Record<string, string> = { SUBWAY: '지하철', HEAVY_RAIL: '기차', COMMUTER_TRAIN: '전철', HIGH_SPEED_TRAIN: '고속열차', LONG_DISTANCE_TRAIN: '기차', METRO_RAIL: '지하철', MONORAIL: '모노레일', RAIL: '철도', TRAM: '트램', LIGHT_RAIL: '경전철', BUS: '버스', INTERCITY_BUS: '버스', TROLLEYBUS: '버스', FERRY: '페리', CABLE_CAR: '케이블카', FUNICULAR: '푸니쿨라', SHARE_TAXI: '택시' };

/** ask Google for one route (also used to test the key in 설정) */
export async function fetchRoute(j: { m: Mode; a: LL; b: LL; pv: string }): Promise<Route | null> {
  const { m, a, b, pv } = j;
  if (pv !== 'google') return null;
  const mode = m === 'walk' ? 'WALK' : m === 'car' ? 'DRIVE' : 'TRANSIT';
  const body: Record<string, unknown> = { origin: { location: { latLng: { latitude: +a[0], longitude: +a[1] } } }, destination: { location: { latLng: { latitude: +b[0], longitude: +b[1] } } }, travelMode: mode, languageCode: 'ko' };
  if (mode === 'TRANSIT') body.departureTime = middayAt(+a[1]);
  if (mode === 'DRIVE') body.routingPreference = 'TRAFFIC_UNAWARE';
  let r: Response;
  try {
    r = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', { method: 'POST', headers: { 'content-type': 'application/json', 'X-Goog-Api-Key': host ? host.googleKey() : '',
      'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.steps.travelMode,routes.legs.steps.transitDetails.transitLine.nameShort,routes.legs.steps.transitDetails.transitLine.name,routes.legs.steps.transitDetails.transitLine.vehicle.type,routes.travelAdvisory.transitFare' }, body: JSON.stringify(body) });
  } catch { throw appError('network') }
  if (r.status === 401 || r.status === 403) throw appError('not_granted');
  if (!r.ok) return null;
  const jj = await r.json(), rt = (jj.routes || [])[0];
  if (!rt) { if (mode === 'TRANSIT' && km(a, b) < 2.5) return fetchRoute({ m: 'walk', a, b, pv }); return null }
  const steps: any[] = ((rt.legs || [])[0] || {}).steps || [], tr = steps.filter(s => s.transitDetails && s.transitDetails.transitLine);
  const kinds = [...new Set(tr.map(s => VEH[((s.transitDetails.transitLine.vehicle || {}).type)] || '대중교통'))];
  const lines = tr.map(s => { const L = s.transitDetails.transitLine; return L.nameShort || L.name || '' }).filter(Boolean);
  const fare = rt.travelAdvisory && rt.travelAdvisory.transitFare;
  return { min: Math.max(1, Math.ceil(parseInt(rt.duration || '0', 10) / 60)), label: mode === 'WALK' || !tr.length ? (mode === 'DRIVE' ? '차' : '도보') : (kinds.length === 1 ? kinds[0] : '대중교통'),
    lines: [...new Set(lines)].slice(0, 4).join(' → '), tf: Math.max(0, tr.length - 1), fare: fare ? (+fare.units || 0) + (fare.nanos || 0) / 1e9 : null, cur: fare ? fare.currencyCode : '',
    poly: rt.polyline && rt.polyline.encodedPolyline ? thinPolyline(decodePolyline(rt.polyline.encodedPolyline)) : null, km: (rt.distanceMeters || 0) / 1000, src: 'google' };
}

// Distances and the travel-time guess used when there is no real route (and as the start of one).
export type LL = [number, number];

/** kilometres between two points (haversine) */
export function km(a: LL, b: LL): number {
  const R = 6371, r = (x: number) => x * Math.PI / 180;
  const dLa = r(b[0] - a[0]), dLo = r(b[1] - a[1]);
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(r(a[0])) * Math.cos(r(b[0])) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export interface TravelGuess { mode: string; min: number }
export interface GuessOptions {
  /** getting around by car at the destination */
  car: boolean;
  /** what public transport is called there (지하철, 대중교통 …) */
  transitName: string;
  /** walk when it is closer than this (the 걷기 style: 2 / 1.3 / 0.7 km) */
  walkKm: number;
  /** an airport or station near either end, with its own transfer time */
  gateway: { min?: number } | null;
}

/** how long it takes between two points, by distance; null when they are right next to each other */
export function travelGuess(a: LL | null | undefined, b: LL | null | undefined, o: GuessOptions): TravelGuess | null {
  if (!a || !b) return null;
  const d = km(a, b); if (d < 0.15) return null;
  const g = o.gateway, car = o.car, tm = o.transitName || '대중교통';
  if (g && g.min && d > 5) return { mode: car ? '차' : tm, min: car ? Math.ceil(g.min * 0.8 / 5) * 5 : g.min };
  if (d < o.walkKm) return { mode: '도보', min: Math.max(5, Math.ceil(d * 1.3 / 4.8 * 60 / 5) * 5) };
  if (car) return { mode: '차', min: Math.ceil((10 + (d < 20 ? d * 2 : 20 + d)) / 5) * 5 };
  return { mode: tm, min: Math.ceil((d < 20 ? 12 + d * 2.4 : 36 + d * 1.2) / 5) * 5 };
}

/** inside South Korea (roughly) */
export const inKorea = (ll: LL | null | undefined): boolean => !!ll && ll[0] > 33 && ll[0] < 38.7 && ll[1] > 124.4 && ll[1] < 131.2;

/** Google's encoded polyline → points */
export function decodePolyline(s: string): LL[] {
  const out: LL[] = []; let i = 0, lat = 0, lng = 0;
  while (i < s.length) {
    let b, sh = 0, r = 0; do { b = s.charCodeAt(i++) - 63; r |= (b & 31) << sh; sh += 5 } while (b >= 32); lat += r & 1 ? ~(r >> 1) : r >> 1;
    sh = 0; r = 0; do { b = s.charCodeAt(i++) - 63; r |= (b & 31) << sh; sh += 5 } while (b >= 32); lng += r & 1 ? ~(r >> 1) : r >> 1;
    out.push([lat / 1e5, lng / 1e5]);
  }
  return out;
}
/** at most about 160 points, 5 decimals (enough for the map, small to save) */
export function thinPolyline(pts: LL[]): LL[] {
  const r = (p: LL): LL => [+p[0].toFixed(5), +p[1].toFixed(5)];
  if (pts.length <= 160) return pts.map(r);
  const st = Math.ceil(pts.length / 160), o: LL[] = []; for (let i = 0; i < pts.length; i += st) o.push(pts[i]); o.push(pts[pts.length - 1]);
  return o.map(r);
}

/** "안내 시작": Kakao Map in Korea, Google Maps elsewhere */
export function navLink(a: LL, b: LL, mode: string, name?: string): string {
  if (inKorea(a) && inKorea(b)) return `https://map.kakao.com/link/from/${encodeURIComponent('출발')},${a[0]},${a[1]}/to/${encodeURIComponent(name || '도착')},${b[0]},${b[1]}`;
  return `https://www.google.com/maps/dir/?api=1&origin=${a[0]},${a[1]}&destination=${b[0]},${b[1]}&travelmode=${mode === '도보' ? 'walking' : mode === '차' ? 'driving' : 'transit'}`;
}

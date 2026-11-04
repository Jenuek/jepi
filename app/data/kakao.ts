// Kakao Local API (places and addresses in Korea) with the person's own REST key, and this device's location.
// (They used to be kakaoGet / addrOf / getPos in src/js/270-my-places.js.)
import { appError } from './errors';
import type { LL } from '../logic/geo';

let keyOf: () => string = () => '';
export function connectKakao(key: () => string): void { keyOf = key }

export async function get(path: string, params: Record<string, string | number>): Promise<any> {
  const key = keyOf(); if (!key) throw appError('nokey', '카카오 키가 필요해요');
  let r: Response;
  try { r = await fetch(`https://dapi.kakao.com${path}?${new URLSearchParams(params as Record<string, string>)}`, { headers: { Authorization: 'KakaoAK ' + key } }) }
  catch { throw appError('network', '카카오에 연결하지 못했어요 (설정 → 카카오 지도 → 확인)') }
  if (r.status === 401 || r.status === 403) throw appError('not_granted', '카카오 키나 카카오맵 사용 설정을 확인해 주세요');
  if (!r.ok) throw appError('upstream_error', '카카오 오류 (HTTP ' + r.status + ')');
  return r.json();
}

/** the street address at a point ('' when unknown) */
export async function addressAt(ll: LL): Promise<string> {
  try {
    const j = await get('/v2/local/geo/coord2address.json', { x: ll[1], y: ll[0] }); const d = (j.documents || [])[0];
    return d ? ((d.road_address && d.road_address.address_name) || (d.address && d.address.address_name) || '') : '';
  } catch { return '' }
}

/** where this device is (maxAge: a reading this old is fine, ms) */
export function here(maxAge?: number): Promise<LL> {
  return new Promise((res, rej) => {
    if (!navigator.geolocation) return rej(new Error('이 기기에서는 위치를 쓸 수 없어요'));
    navigator.geolocation.getCurrentPosition(p => res([+p.coords.latitude.toFixed(6), +p.coords.longitude.toFixed(6)]),
      e => rej(new Error(e.code === 1 ? '위치 권한이 꺼져 있어요. 브라우저 설정에서 허용해 주세요.' : '지금 위치를 찾지 못했어요')),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: maxAge || 60000 });
  });
}

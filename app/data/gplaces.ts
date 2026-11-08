// 장소 검색: Google Places 텍스트 검색 (해외, 이름·주소·위치·장소 ID만) · 카카오 키워드 검색 (국내).
// 장소 찾기 화면과 "직접 만들기"의 위치 찾기가 같이 써요. 영업시간·사진·평점은 받지 않아요 (영업시간은 hours.ts가 따로 조회).
// 구글 장소 ID는 gid로 장소에 남겨서, 같은 장소 묶기(logic/places.ts)와 영업시간 조회(hours.ts)가 써요. 카카오 ID는 "k…"로 구분해요.
// 이번 달 Google 검색 횟수는 기기에 세어 둬요 ("jepi.placeUse", 설정에 표시).
import * as storage from './storage';
import * as kakao from './kakao';
import * as places from './places';
import { appError } from './errors';
import { inKorea, type LL } from '../logic/geo';

export interface Found {
  /** 구글 장소 ID, 카카오는 "k" + ID, 주소 검색은 '' */
  gid: string;
  name: string;
  addr: string;
  ll: LL;
  src: 'google' | 'kakao';
}
export type Provider = 'google' | 'kakao';

export interface GPlacesHost {
  googleKey(): string;
  googleBad(): boolean;
  kakaoKey(): string;
  kakaoBad(): boolean;
}
let host: GPlacesHost | null = null;
export function connectGPlaces(h: GPlacesHost): void { host = h }

/** 이 구글 ID는 구글에서 온 것인가 (카카오는 "k"로 시작) */
export const isGoogleId = (gid: unknown): gid is string => typeof gid === 'string' && !!gid && gid[0] !== 'k';

/** 이번 달 Google 장소 검색 횟수 (add: 더 센다) */
export function used(add?: number): number {
  const m = new Date().toISOString().slice(0, 7); let u = storage.get('jepi.placeUse', { m, n: 0 }); if (!u || u.m !== m) u = { m, n: 0 };
  if (add) { u.n += add; storage.set('jepi.placeUse', u) }
  return u.n;
}

/** 이 여행지에서 쓸 수 있는 검색: 국내는 카카오(키가 있으면), 아니면 Google. 둘 다 안 되면 null */
export function provider(): Provider | null {
  const h = host; if (!h) return null;
  const kr = inKorea(places.cityLL());
  if (kr && h.kakaoKey() && !h.kakaoBad()) return 'kakao';
  if (h.googleKey() && !h.googleBad()) return 'google';
  return null;
}

async function google(q: string, center: LL, radius: number): Promise<Found[]> {
  used(1);
  const r = await fetch('https://places.googleapis.com/v1/places:searchText', { method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': host!.googleKey(), 'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location' },
    body: JSON.stringify({ textQuery: q, maxResultCount: 5, languageCode: 'ko', locationBias: { circle: { center: { latitude: center[0], longitude: center[1] }, radius } } }) });
  if (r.status === 403 || r.status === 400) {
    let m = ''; try { m = (await r.json()).error.message || '' } catch { /* */ }
    throw appError('off', /not been used|disabled|not enabled|blocked/i.test(m) ? 'Google Cloud에서 Places API (New)를 켜 주세요.' : 'Google 키가 장소 검색을 쓸 수 없어요. 설정에서 확인해 주세요.');
  }
  if (!r.ok) throw appError('net', 'Google 장소 검색 오류 (HTTP ' + r.status + ')');
  const j = await r.json();
  return (j.places || []).filter((x: any) => x && x.id && x.location).map((x: any): Found => ({
    gid: String(x.id), name: String((x.displayName && x.displayName.text) || '').slice(0, 60) || '이름 없는 장소', addr: String(x.formattedAddress || ''),
    ll: [+(+x.location.latitude).toFixed(6), +(+x.location.longitude).toFixed(6)], src: 'google' }));
}

async function kakaoSearch(q: string, center: LL, radius: number): Promise<Found[]> {
  const k = await kakao.get('/v2/local/search/keyword.json', { query: q, size: 5, x: center[1], y: center[0], radius: Math.min(20000, radius) });
  let hits: Found[] = (k.documents || []).map((d: any): Found => ({ gid: d.id ? 'k' + d.id : '', name: String(d.place_name), addr: String(d.road_address_name || d.address_name || ''), ll: [+d.y, +d.x], src: 'kakao' }));
  if (!hits.length) {   // 주소로 적었을 수도 있어요
    const a = await kakao.get('/v2/local/search/address.json', { query: q, size: 5 });
    hits = (a.documents || []).map((d: any): Found => ({ gid: '', name: String(d.address_name), addr: String((d.road_address && d.road_address.address_name) || d.address_name), ll: [+d.y, +d.x], src: 'kakao' }));
  }
  return hits;
}

/** 이름이나 주소로 찾기 (center: 이 근처를 먼저, radius: 미터) */
export async function search(q: string, opt?: { center?: LL; radius?: number }): Promise<Found[]> {
  q = q.trim(); const p = provider(); if (!q || !p) return [];
  const center = (opt && opt.center) || places.cityLL(), radius = Math.max(500, Math.min(50000, (opt && opt.radius) || 30000));
  return p === 'kakao' ? kakaoSearch(q, center, radius) : google(q, center, radius);
}

// ---- 찾은 곳을 장소 목록에 넣기 ----
const CAT_WORDS: [string, RegExp][] = [
  ['night', /술집|펍|포차|이자카야|\bbar\b|\bpub\b|izakaya|lounge|야경|전망대/i],
  ['food', /카페|커피|식당|라멘|라면|우동|스시|초밥|맛집|베이커리|빵|디저트|레스토랑|국밥|고기|bbq|cafe|coffee|restaurant|ramen|sushi|bakery|diner|kitchen|bistro/i],
  ['art', /미술관|박물관|갤러리|전시|museum|gallery|뮤지엄/i],
  ['music', /공연|콘서트|라이브|재즈|극장|홀|live|jazz|theater|theatre|concert/i],
  ['shop', /백화점|쇼핑|마켓|시장|상점|스토어|몰|아울렛|mall|market|store|shop|outlet|donki|돈키/i],
  ['trip', /역$|공항|터미널|짐 ?보관|station|airport|terminal|locker/i],
];
/** 이름으로 대충 종류를 짐작해요 (맞지 않으면 블록 정보에서 고칠 수 있어요) */
export function guessCat(name: string): string { for (const [c, re] of CAT_WORDS) if (re.test(name)) return c; return 'walk' }

/** 이미 장소 목록에 있는 같은 장소 (같은 구글/카카오 ID) */
export function existing(f: Pick<Found, 'gid'>): places.Place | undefined { return f.gid ? places.P.find(p => p.gid === f.gid) : undefined }

/** 찾은 곳을 이 여행지의 장소로 넣어요 (동네는 가장 가까운 곳, 위치는 찾은 그대로). 이미 있으면 그걸 돌려줘요 */
export function addFound(f: Found, cat?: string): places.Place | null {
  const had = existing(f); if (had) return had;
  const pk = places.state.pack; if (!pk) return null;
  const pl = places.cleanPlace({ name: f.name, lat: f.ll[0], lng: f.ll[1], cat: cat || guessCat(f.name), dur: 60, note: f.addr });
  if (!pl) return null;
  const ak = places.nearestArea(f.ll) || places.firstArea(), A = places.AREAS[ak];
  Object.assign(pl, { ll: f.ll, gid: f.gid || undefined, addr: f.addr, ai: false, found: true, area: A[0], zone: places.AREA_ZONE[ak] || 'outer',
    // 해외 구글 장소는 영업시간을 나중에 조회해요 (hours.ts), 그 전엔 늘 열린 것으로 둬요
    verify: f.src === 'google' ? '영업시간' : undefined, check: '', note: f.addr });
  pk.places.push(pl); places.addPackPlace(pl); places.savePack();
  return pl;
}

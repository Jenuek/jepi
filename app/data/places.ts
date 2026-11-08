// The places of the trip's destination (the "pack": city, money, areas, gateways, places) and the lists made from it
// (AREAS, PM …). It used to be loadPack / addPackPlace / cleanPack / cleanPlace … in src/js/060-destination-pack.js and
// the lists at the top of 010-trip-basics.js. The old code reads the same objects (they are only ever changed in place)
// and the open pack as PK.pack. Until a destination is loaded the lists hold the built-in Tokyo example (tokyo.ts).
import * as storage from './storage';
import * as T from './tokyo';
import { km, type LL } from '../logic/geo';
import { parse } from '../logic/time';

/** one place (the AI's answer after cleanPlace, a Tokyo example place, or one I made) */
export interface Place {
  id: string; name: string; cat: string; area: string; ll: LL; dur: number;
  local?: string; hours?: [number, number]; always?: boolean; closed?: number[]; note?: string; verify?: string; check?: string; drop?: boolean;
  cost?: [number, string]; tags?: string[]; zone?: string; must?: string; cash?: boolean; best?: string; ai?: boolean;
  [more: string]: unknown;
}
export interface Gateway { iata?: string; name: string; kind?: string; ll: LL; fare?: number; min?: number }
/** a destination: the shape cleanPack makes (still loose: old plans saved more or fewer fields) */
export type Pack = Record<string, any>;

export const CATS = T.CATS;
// the lists of the open destination (filled again by loadPack; the Tokyo example until then)
export const AIRPORTS: Record<string, Gateway> = { ...T.AIRPORTS };
export const AREAS = { ...T.AREAS };
export const AREA_ZONE = { ...T.AREA_ZONE };
export const ZONES = { ...T.ZONES };
export const ZONE_OF = { ...T.ZONE_OF };
export const COST = { ...T.COST };
export const TAGS = { ...T.TAGS };
export const MUST = { ...T.MUST };
export const P: Place[] = T.P.slice();
export const PM: Record<string, Place> = Object.fromEntries(P.map(p => [p.id, p]));
export const STATIC_CHECKS = T.STATIC_CHECKS.slice();
/** keywords anyone can pick (취향 키워드, 여행지 찾기 chips) */
export const GENERIC_KW: string[] = ['사색·고요함','대자연 풍경','오로라·별','휴양·쉼','드라이브','맛집','카페','혼밥','술집','데이트','아이와 함께','테마파크','체험','야경','산책','공원','미술관','박물관','역사','건축','쇼핑','빈티지','시장','음악','라이브','서점','사진','자연','스파·온천','액티비티','현지 문화'];
/** the open destination */
export const state = { pack: null as Pack | null };

export const TOKYO_PACK: Pack = {
  example: true, city: '도쿄', country: '일본', intl: true, currency: 'JPY', symbol: '¥', rate: 8.4, transit: '전철', fare: { base: 180, perKm: 15, max: 360 }, snack: 1000, step: 500,
  arrivalNote: '입국 심사와 짐 찾기. Visit Japan Web QR을 준비하세요.',
  areas: Object.entries(T.AREAS).map(([k, v]) => ({ key: k, name: v[0], lat: v[1], lng: v[2], zone: T.AREA_ZONE[k] })),
  zones: Object.assign({}, T.ZONES),
  gateways: [{ key: 'hnd', iata: 'HND', name: '하네다 공항', kind: 'air', lat: 35.5494, lng: 139.7798, fare: 650 }, { key: 'nrt', iata: 'NRT', name: '나리타 공항', kind: 'air', lat: 35.7720, lng: 140.3929, fare: 1300, min: 75 }],
  checks: T.STATIC_CHECKS.map(s => s.t),
  places: T.P.map(p => Object.assign({}, p, { cost: T.COST[p.id] || [0, ''], tags: T.TAGS[p.id] || [], zone: T.ZONE_OF[p.id] || 'outer', must: T.MUST[p.id] || '' })),
};

const wipe = (o: Record<string, unknown>) => { for (const k of Object.keys(o)) delete o[k] };
export const firstArea = (): string => Object.keys(AREAS)[0];
export const firstGw = (): string => Object.keys(AIRPORTS)[0];
export const costOf = (id: string): [number, string] => COST[id] || [0, ''];
export const tagsOf = (id: string): string[] => TAGS[id] || [];
export const mustOf = (id: string): string => MUST[id] || '';
/** the middle of the destination's areas */
export function cityLL(): LL { const a = Object.values(AREAS); if (!a.length) return [0, 0]; return [a.reduce((s, x) => s + x[1], 0) / a.length, a.reduce((s, x) => s + x[2], 0) / a.length] }
export function nearestArea(ll: LL): string | null { let best: string | null = null, bd = 1e9; for (const [k, a] of Object.entries(AREAS)) { const d = km(ll, [a[1], a[2]]); if (d < bd) { bd = d; best = k } } return best }
/** a round number near n (1, 2, 5 … 10, 20 …) */
export const nice = (n: number): number => { if (!(n > 0)) return 0; const p = 10 ** Math.floor(Math.log10(n)); return Math.max(p, Math.round(n / p) * p) };

/** put a place into the lists */
export function addPackPlace(p: Place): void { P.push(p); PM[p.id] = p; COST[p.id] = p.cost || [0, '']; TAGS[p.id] = p.tags || []; ZONE_OF[p.id] = p.zone || 'outer'; if (p.must) MUST[p.id] = p.must }

let loaded: (pk: Pack) => void = () => {};
/** the old code: what to do after a destination is loaded (money rate, other travelers' 👍 places) */
export function connectPlaces(f: (pk: Pack) => void): void { loaded = f }

/** open this destination: fill every list from it */
export function loadPack(pk: Pack): void {
  state.pack = pk; [AREAS, AREA_ZONE, ZONES, ZONE_OF, COST, TAGS, MUST, PM, AIRPORTS].forEach(o => wipe(o as Record<string, unknown>)); P.length = 0;
  if (!pk.areas || !pk.areas.length) pk.areas = [{ key: 'center', name: '시내', lat: 0, lng: 0, zone: 'center' }];
  pk.areas.forEach((a: any) => { AREAS[a.key] = [a.name, +a.lat, +a.lng]; AREA_ZONE[a.key] = a.zone || a.key });
  Object.assign(ZONES, pk.zones || {});
  Object.entries(AREA_ZONE).forEach(([k, z]) => { if (!ZONES[z]) ZONES[z] = AREAS[k][0] });
  ZONES.air = ZONES.air || '공항·역'; ZONES.outer = ZONES.outer || '그 밖의 곳';
  if (!pk.gateways || !pk.gateways.length) { const c = cityLL(); pk.gateways = [{ key: 'gw_main', name: `${pk.city || '여행지'} 도착 지점`, kind: 'air', lat: c[0], lng: c[1] }] }
  pk.gateways.forEach((g: any) => { AIRPORTS[g.key] = { iata: g.iata || '', name: g.name, kind: g.kind || 'air', ll: [+g.lat, +g.lng], fare: g.fare, min: g.min } });
  (pk.places || (pk.places = [])).forEach(addPackPlace);
  STATIC_CHECKS.length = 0; (pk.checks || []).forEach((t: string, i: number) => STATIC_CHECKS.push({ id: `k${i}_${String(pk.city || '').slice(0, 8)}`, t }));
  const rate = +pk.rate > 0 ? +pk.rate : 1;
  if (!(pk.snack > 0)) pk.snack = pk.currency === 'KRW' ? 15000 : nice(15000 / rate);
  if (!(pk.step > 0)) pk.step = nice(pk.snack / 2);
  loaded(pk);
}
export const savePack = (): void => storage.set('gp.pack', state.pack);
/** a saved pack, or null when it is not one ("tokyo": the very first version's example) */
export function packFrom(v: unknown): Pack | null {
  if (v === 'tokyo') return TOKYO_PACK;
  if (v && typeof v === 'object' && Array.isArray((v as Pack).areas) && (v as Pack).areas.length && (v as Pack).city) return v as Pack;
  return null;
}
/** a destination typed by hand (no AI): no areas or places yet */
export function manualPack(dest: string): Pack { return { city: dest, country: '', intl: false, currency: 'KRW', symbol: '₩', rate: 1, transit: '대중교통', fare: { base: 0, perKm: 0, max: 0 }, checks: [], areas: [], zones: {}, gateways: [], places: [], manual: true } }
/** a new trip before anything is chosen */
export function blankPack(): Pack { return Object.assign(manualPack('새 여행'), { areas: [{ key: 'center', name: '시내', lat: 37.5665, lng: 126.978, zone: 'center' }] }) }

/** the AI's answer about a destination, checked and trimmed (null when it can't be used) */
export function cleanPack(r: any, dest: string): Pack | null {
  if (!r || r.ok === false) return null;
  const num = (x: any) => x !== null && x !== '' && Number.isFinite(+x) ? +x : null;
  const key = (s: any, i: number, pre: string) => (String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 16) || pre + i);
  const areas: any[] = [], seen = new Set<string>();
  (Array.isArray(r.areas) ? r.areas : []).slice(0, 16).forEach((a: any, i: number) => { const la = num(a && a.lat), ln = num(a && a.lng); if (la == null || ln == null || Math.abs(la) > 90 || Math.abs(ln) > 180 || (!la && !ln)) return;
    let k = key(a.key, i, 'a'); while (seen.has(k)) k += 'x'; seen.add(k); areas.push({ key: k, name: String(a.name || k).slice(0, 24), lat: la, lng: ln, zone: key(a.zone, i, 'z') }) });
  if (!areas.length) return null;
  const mid: LL = [areas.map(a => a.lat).sort((x, y) => x - y)[areas.length >> 1], areas.map(a => a.lng).sort((x, y) => x - y)[areas.length >> 1]];
  const near = areas.filter(a => km(mid, [a.lat, a.lng]) < 120); if (!near.length) return null;
  const zones: Record<string, string> = {}; Object.entries(r.zones && typeof r.zones === 'object' ? r.zones : {}).forEach(([k, v]) => { zones[key(k, 0, 'z')] = String(v).slice(0, 30) });
  const gws: any[] = []; (Array.isArray(r.gateways) ? r.gateways : []).slice(0, 5).forEach((g: any, i: number) => { const la = num(g && g.lat), ln = num(g && g.lng); if (la == null || ln == null || km(mid, [la, ln]) > 200) return;
    const k = 'gw_' + key(g.key, i, 'g'); if (gws.some(x => x.key === k)) return;
    gws.push({ key: k, iata: /^[A-Za-z]{3}$/.test(String(g.iata || '')) ? String(g.iata).toUpperCase() : '', name: String(g.name || '도착 지점').slice(0, 30), kind: ['air', 'rail', 'bus'].includes(g.kind) ? g.kind : 'air', lat: la, lng: ln, min: num(g.min)! > 0 ? Math.min(180, num(g.min)!) : undefined, fare: num(g.fare)! >= 0 ? num(g.fare) : undefined }) });
  const f = r.fare || {}, cur = String(r.currency || 'KRW').slice(0, 3).toUpperCase();
  return { city: String(r.city || dest).slice(0, 30), country: String(r.country || '').slice(0, 30), intl: r.intl !== false && cur !== 'KRW', currency: cur, symbol: String(r.symbol || cur).slice(0, 3),
    rate: cur === 'KRW' ? 1 : (num(r.rate)! > 0 ? num(r.rate) : 1), transit: String(r.transit || '대중교통').slice(0, 10), fare: { base: num(f.base) || 0, perKm: num(f.perKm) || 0, max: num(f.max) || 0 },
    snack: num(r.snack)! > 0 ? num(r.snack) : 0, step: num(r.step)! > 0 ? num(r.step) : 0, arrivalNote: String(r.arrivalNote || '').slice(0, 140),
    checks: (Array.isArray(r.checks) ? r.checks : []).map((x: any) => String(x).slice(0, 80)).slice(0, 8), areas: near, zones, gateways: gws, places: [] };
}

/** one place from the AI (or a pasted list), checked and trimmed into the open destination (null without a name) */
export function cleanPlace(x: any): Place | null {
  if (!x || !x.name) return null;
  let la = +x.lat, ln = +x.lng; const hasLL = Number.isFinite(la) && Number.isFinite(ln) && (la || ln);
  const ak = AREAS[x.area] ? x.area : (hasLL ? nearestArea([la, ln]) : firstArea()); const A = AREAS[ak!];
  if (!hasLL || km([la, ln], [A[1], A[2]]) > 15) { la = A[1]; ln = A[2] }
  const hm = /^(\d{1,2}:\d{2})\s*[-~–]\s*(\d{1,2}:\d{2})$/.exec(String(x.open || '').trim()); let hours: [number, number] | null = null;
  if (hm) { const a = parse(hm[1]); let b = parse(hm[2]); if (a != null && b != null) { if (b <= a) b = 1440; hours = [a, Math.min(1440, b)] } }
  return { id: 'g' + Date.now().toString(36).slice(-4) + Math.random().toString(36).slice(2, 7), name: String(x.name).slice(0, 50), local: String(x.local || '').slice(0, 60),
    cat: CATS[x.cat] ? x.cat : 'walk', area: A[0], ll: [la, ln], dur: Math.max(15, Math.min(300, Math.round((+x.dur || 60) / 15) * 15)),
    hours: hours || undefined, always: !hours, closed: (Array.isArray(x.closed) ? x.closed : []).map(Number).filter((w: number) => Number.isInteger(w) && w >= 0 && w <= 6),
    note: String(x.note || '').slice(0, 160), verify: '영업시간', check: String(x.check || '').slice(0, 80), drop: x.drop === true,
    cost: [Math.max(0, +x.cost || 0), String(x.costNote || '').slice(0, 40)], tags: (Array.isArray(x.tags) ? x.tags : []).map((t: any) => String(t).slice(0, 16)).slice(0, 6),
    zone: AREA_ZONE[ak!] || 'outer', must: String(x.must || '').slice(0, 60), cash: x.cash === true, best: ['morning', 'day', 'sunset', 'evening', 'night'].includes(x.best) ? x.best : 'any', ai: true };
}

/** a place I made (직접 만들기) as a place of the lists */
export function addCustom(c: { id: string; name?: string; area: string; cat: string; dur: number; cost?: number; memo?: string; tags?: string; drop?: boolean; ll?: LL; addr?: string; gid?: string }): void {
  const a = AREAS[c.area] || AREAS[firstArea()], i = P.findIndex(x => x.id === c.id);
  const p: Place = { id: c.id, name: c.name || '직접 만든 블록', cat: CATS[c.cat] ? c.cat : 'walk', area: a[0], ll: Array.isArray(c.ll) ? c.ll : [a[1], a[2]], dur: Math.max(15, +c.dur || 60), always: true, drop: !!c.drop, note: c.memo || '직접 만든 블록이에요.', custom: true };
  if (c.gid) p.gid = c.gid; if (c.addr) p.addr = c.addr;   // 위치 찾기로 고른 곳: 같은 장소 묶기·영업시간이 ID를 써요
  if (i >= 0) P[i] = p; else P.push(p);
  PM[p.id] = p; COST[p.id] = [Math.max(0, +(c.cost || 0) || 0), +(c.cost || 0) ? '직접 입력한 금액' : '']; TAGS[p.id] = String(c.tags || '').split(',').map(x => x.trim()).filter(Boolean); ZONE_OF[p.id] = AREA_ZONE[c.area] || 'outer';
}

/** won per 1 unit of the destination's money (1 when unknown or KRW) */
export const rate = (): number => { const pk = state.pack; return pk && +pk.rate > 0 ? +pk.rate : 1 };

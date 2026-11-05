// 🎲 뭐 먹지? / 뭐 하지? — finding real places around a point and rolling one (it used to be eatFetch / kFetch / aiPool /
// poolFor / pickNear / buildCourse … in src/js/280-dice-eat.js and 290-dice-do.js). In Korea with a Kakao key the places
// come from Kakao Local; otherwise the AI lists some. The DICE sheet (what is chosen, what it shows) stays in the old code.
import * as kakao from './kakao';
import { appError } from './errors';
import { inKorea, km, type LL } from '../logic/geo';
import { norm } from '../logic/places';
import type { Asker } from './ai';

/** a place found nearby */
export interface Spot {
  id?: string; name: string; cat: string; full: string; addr: string; url: string; ll: LL | null;
  /** metres from where we looked (뭐 먹지) */
  dist?: number;
  /** 뭐 하지: meal | cafe | act | night */
  type?: string;
  ai?: boolean;
}
/** where to look and with what */
export interface Look {
  /** a Kakao key is set (and, for 뭐 하지, it has not failed) */
  kakao: boolean;
  /** the AI, or null when none is connected */
  ai: Asker | null;
}
const NO_SOURCE = '주변 식당을 찾으려면 설정에서 카카오 지도 키나 AI를 연결해 주세요.';
const NO_SOURCE_DO = '주변 장소를 찾으려면 설정에서 카카오 지도 키나 AI를 연결해 주세요.';
const mapsLink = (name: string, addr: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + ' ' + (addr || ''))}`;
const kakaoLink = (d: any) => d.place_url || `https://map.kakao.com/link/search/${encodeURIComponent(d.place_name)}`;
const lastCat = (full: string) => { const c = String(full || '').split('>').map(s => s.trim()); return c[c.length - 1] };
const koName = (p: any) => p.nameKo && p.nameKo !== p.name ? `${p.nameKo} (${p.name})` : p.name;

// ================= 뭐 먹지? =================
export type Meal = 'lunch' | 'dinner' | 'snack';
export const MEAL_TXT: Record<Meal, string> = { lunch: '점심', dinner: '저녁', snack: '간식·카페' };
/** mood → [key, label, Kakao words to search] */
export const EAT_MOODS: [string, string, string[]][] = [['any', '상관없음', []], ['full', '든든하게', ['국밥', '백반', '덮밥', '돈까스']], ['light', '가볍게', ['샐러드', '샌드위치', '김밥', '죽']], ['soup', '국물', ['국밥', '찌개', '칼국수', '쌀국수', '라멘']], ['noodle', '면', ['국수', '라멘', '우동', '냉면', '파스타']], ['meat', '고기', ['고기', '삼겹살', '갈비', '스테이크']], ['solo', '혼밥 편한 곳', ['라멘', '덮밥', '김밥', '국밥', '분식']], ['new', '안 가 본 곳', []], ['cafe', '카페·디저트', []]];

let eatHit: { key: string; at: number; list: Spot[]; src: string } | null = null;
/** forget the last list (the starting point changed) */
export const forgetEat = (): void => { eatHit = null };

/** places to eat within `walk` minutes of ll (kept for 30 minutes per spot · distance · mood) */
export async function eatList(ll: LL, walk: number, mood: string, meal: Meal, o: Look): Promise<{ list: Spot[]; src: string }> {
  const R = Math.round(walk * 80), m = EAT_MOODS.find(x => x[0] === mood) || EAT_MOODS[0];
  const key = `${ll[0].toFixed(3)},${ll[1].toFixed(3)}|${R}|${mood}`;
  if (eatHit && eatHit.key === key && Date.now() - eatHit.at < 1800e3) return eatHit;
  let out: Spot[] = [], src: string;
  if (o.kakao && inKorea(ll)) {
    const base = { x: ll[1], y: ll[0], radius: R, sort: 'distance', size: 15 }, docs: any[] = [];
    const cat = async (code: string, pages: number[]) => { for (const page of pages) { const j = await kakao.get('/v2/local/search/category.json', Object.assign({ category_group_code: code, page }, base)); docs.push(...(j.documents || [])); if (j.meta && j.meta.is_end) break } };
    if (m[0] === 'cafe') await cat('CE7', [1, 2]);
    else if (m[2].length) { for (const q of m[2].slice(0, 4)) { const j = await kakao.get('/v2/local/search/keyword.json', Object.assign({ query: q, category_group_code: 'FD6' }, base)); docs.push(...(j.documents || [])) } }
    else await cat('FD6', [1, 2, 3]);
    const seen = new Set<string>();
    docs.forEach(d => { if (seen.has(d.id)) return; seen.add(d.id);
      out.push({ name: d.place_name, cat: lastCat(d.category_name) || '음식점', full: d.category_name || '', dist: +d.distance || 0, addr: d.road_address_name || d.address_name || '', url: kakaoLink(d), ll: [+d.y, +d.x] }) });
    src = '카카오 지도';
  } else if (o.ai) {
    const r = await o.ai.json(`List up to 14 real, currently operating ${mood === 'cafe' ? 'cafes or dessert places' : 'restaurants'} within about ${walk} minutes walk of latitude ${ll[0]}, longitude ${ll[1]}${mood !== 'any' && mood !== 'cafe' ? ` that fit this mood: ${m[1]} (${m[2].join(', ')})` : ''}, good for ${MEAL_TXT[meal]}. Only places you are confident exist there.
Reply with only JSON: {"places":[{"name":"name as shown locally","nameKo":"Korean reading if different","category":"short Korean food type","walkMin":5,"address":"short address","lat":0.0,"lng":0.0}]}`, { modelTier: 'quick', cache: false });
    (Array.isArray(r && r.places) ? r.places : []).forEach((p: any) => { if (!p || !p.name) return; const la = +p.lat, ln = +p.lng, ok = isFinite(la) && isFinite(ln) && km(ll, [la, ln]) < 3;
      out.push({ name: koName(p), cat: p.category || '음식점', full: p.category || '', dist: ok ? km(ll, [la, ln]) * 1000 : (+p.walkMin || walk) * 80, addr: p.address || '', url: mapsLink(p.name, p.address), ll: ok ? [la, ln] : null, ai: true }) });
    src = 'AI 추천 · 가기 전에 지도에서 확인하세요';
  } else throw appError('nokey', NO_SOURCE);
  if (meal !== 'dinner' && mood !== 'cafe') out = out.filter(x => !/술집|호프|바\b|포차/.test(x.full));
  eatHit = { key, at: Date.now(), list: out, src };
  return eatHit;
}

/** roll one place to eat: not one picked in the last days (recent), not the one showing now (skip), nearer ones a bit
 *  more often; 안 가 본 곳 leaves out every place ever picked (ever). null when nothing is left. */
export function eatRoll(list: Spot[], walk: number, mood: string, recent: Set<string>, ever: Set<string>, skip: string | null): Spot | null {
  let cs = list.filter(x => !recent.has(norm(x.name)) && (!skip || x.name !== skip));
  if (mood === 'new') cs = cs.filter(x => !ever.has(norm(x.name)));
  if (!cs.length) return null;
  const R = walk * 80, w = (x: Spot) => 1 + Math.max(0, 1 - (x.dist || 0) / R), tot = cs.reduce((a, x) => a + w(x), 0);
  let r = Math.random() * tot, pk = cs[cs.length - 1];
  for (const x of cs) { r -= w(x); if (r <= 0) { pk = x; break } }
  return pk;
}

// ================= 뭐 하지? =================
export const DO_MOODS: [string, string][] = [['any', '상관없음'], ['quiet', '조용히'], ['move', '움직이고 싶어'], ['drink', '한잔'], ['rain', '비 와요'], ['hungry', '배고파']];
type Spec = { q?: string; c?: string };
const DO_Q: Record<string, Spec[]> = { any: [{ c: 'AT4' }, { c: 'CT1' }, { c: 'CE7' }], quiet: [{ q: '서점' }, { q: '미술관' }, { q: '갤러리' }, { q: '공원' }], move: [{ q: '공원' }, { q: '산책로' }, { q: '볼링장' }, { q: '클라이밍' }],
  drink: [{ q: '바', c: 'FD6' }, { q: '이자카야', c: 'FD6' }, { q: '와인바', c: 'FD6' }], rain: [{ q: '전시' }, { q: '영화관' }, { q: '서점' }, { q: '보드게임카페' }], hungry: [{ c: 'FD6' }] };
const TYPE_Q: Record<string, Spec[]> = { meal: [{ c: 'FD6' }], cafe: [{ c: 'CE7' }], night: [{ q: '바', c: 'FD6' }, { q: '이자카야', c: 'FD6' }, { q: '와인바', c: 'FD6' }] };
export const TYPE_ICON: Record<string, string> = { meal: '🍽', cafe: '☕', act: '🎯', night: '🍸' };
export const TYPE_DUR: Record<string, number> = { meal: 60, cafe: 45, act: 60, night: 75 };

const kCache = new Map<string, { at: number; list: Spot[] }>();
async function kFetch(specs: Spec[], ll: LL, R: number): Promise<Spot[]> {
  const key = JSON.stringify(specs) + ll.map(v => v.toFixed(3)).join(',') + R, hit = kCache.get(key);
  if (hit && Date.now() - hit.at < 1800e3) return hit.list;
  const base = { x: ll[1], y: ll[0], radius: R, sort: 'distance', size: 15 }, docs: any[] = [];
  for (const s of specs) {
    if (s.q) { const j = await kakao.get('/v2/local/search/keyword.json', Object.assign({ query: s.q } as Record<string, string | number>, s.c ? { category_group_code: s.c } : {}, base)); docs.push(...(j.documents || [])) }
    else for (const page of [1, 2]) { const j = await kakao.get('/v2/local/search/category.json', Object.assign({ category_group_code: s.c!, page }, base)); docs.push(...(j.documents || [])); if (j.meta && j.meta.is_end) break }
  }
  const seen = new Set<string>(), list: Spot[] = [];
  docs.forEach(d => { if (seen.has(d.id)) return; seen.add(d.id);
    list.push({ id: 'k' + d.id, name: d.place_name, cat: lastCat(d.category_name) || '', full: d.category_name || '', ll: [+d.y, +d.x], addr: d.road_address_name || d.address_name || '', url: kakaoLink(d) }) });
  kCache.set(key, { at: Date.now(), list });
  return list;
}

let aiHit: { k: string; list: Spot[] } | null = null;
/** forget the AI's last list (the mood changed) */
export const forgetAi = (): void => { aiHit = null };
/** the AI's mix of places around ll (or in a 동네 by name) for this mood */
export async function aiPool(ll: LL | null, areaName: string, mood: string, ai: Asker | null): Promise<Spot[]> {
  const k = (ll ? ll.map(v => v.toFixed(2)).join(',') : areaName) + mood; if (aiHit && aiHit.k === k) return aiHit.list;
  if (!ai) throw appError('nokey', NO_SOURCE_DO);
  const ml = (DO_MOODS.find(m => m[0] === mood) || [])[1] || '';
  const r = await ai.json(`List 18 real, currently operating places ${ll ? `within about 1.5 km of latitude ${ll[0]}, longitude ${ll[1]}` : ''}${areaName ? ` in or around ${areaName}` : ''} for a spontaneous outing. Mix: 5 restaurants (type "meal"), 4 cafes ("cafe"), 6 things to do such as parks, galleries, bookshops, shops or activities ("act"), 3 bars ("night").${mood !== 'any' ? ` Mood: ${ml}.` : ''} Only places you are confident exist there, with accurate coordinates.
Reply with only JSON: {"places":[{"name":"name as shown locally","nameKo":"Korean reading if different","type":"meal|cafe|act|night","category":"short Korean","lat":0.0,"lng":0.0,"address":"short"}]}`, { modelTier: 'quick', cache: false });
  const list: Spot[] = (Array.isArray(r && r.places) ? r.places : []).filter((p: any) => p && p.name && isFinite(+p.lat) && isFinite(+p.lng)).map((p: any, i: number) => ({
    id: 'a' + i + norm(p.name), name: koName(p), cat: p.category || '', full: p.category || '', type: ['meal', 'cafe', 'act', 'night'].includes(p.type) ? p.type : 'act',
    ll: [+p.lat, +p.lng] as LL, addr: p.address || '', url: mapsLink(p.name, p.address), ai: true }));
  aiHit = { k, list };
  return list;
}

/** not a museum late at night, not a bar in the afternoon (t: minutes from midnight) */
export function timeOk(x: Spot, t: number, type: string, mood: string): boolean {
  const f = x.full + ' ' + x.name;
  if (t >= 1200 && /미술관|박물관|갤러리|전시|공원|산책/.test(f)) return false;
  if (t < 1020 && type !== 'night' && mood !== 'drink' && /술집|호프|이자카야|포차|와인바|칵테일|\bBAR\b|바$/.test(f)) return false;
  return true;
}

export interface DoLook extends Look { mood: string; /** the 동네 being looked in, by name ('' around a point) */ areaName: string }
/** places of one kind (meal | cafe | act | night) around ll that suit the time t */
export async function poolFor(type: string, ll: LL, t: number, o: DoLook): Promise<{ list: Spot[]; src: string }> {
  let list: Spot[], src: string;
  if (o.kakao && inKorea(ll)) { list = await kFetch(type === 'act' ? (DO_Q[o.mood] || DO_Q.any) : TYPE_Q[type], ll, 1500); src = '카카오 지도' }
  else { list = (await aiPool(ll, o.areaName, o.mood, o.ai)).filter(x => x.type === type || (type === 'act' && o.mood === 'hungry' && x.type === 'meal')); src = 'AI 추천 · 가기 전에 지도에서 확인하세요' }
  return { list: list.filter(x => timeOk(x, t, type, o.mood)), src };
}

/** roll one near `from` (within maxM metres, or a bit further when nothing is that close); not one picked lately */
export function pickNear(pool: Spot[], from: LL, maxM: number, recent: Set<string>): Spot | null {
  const cs = pool.filter(x => !recent.has(norm(x.name))).map(x => ({ x, d: km(from, x.ll as LL) * 1000 }));
  let near = cs.filter(c => c.d <= maxM); if (!near.length) near = cs.filter(c => c.d <= maxM * 1.8); if (!near.length) return null;
  const w = (c: { d: number }) => 1 + Math.max(0, 1 - c.d / maxM), tot = near.reduce((a, c) => a + w(c), 0); let r = Math.random() * tot;
  for (const c of near) { r -= w(c); if (r <= 0) return c.x }
  return near[near.length - 1].x;
}
export const walkMin = (a: LL, b: LL): number => Math.max(2, Math.round(km(a, b) * 1000 * 1.3 / 80));

/** one stop of a course */
export interface Stop extends Spot { type: string; meal: string; start: number; dur: number; walk: number }

/** what the next stop of a course should be at time t: [type, meal] (null: the course is done) */
export function courseTypes(t: number, items: Stop[], mood: string): [string, string] | null {
  const last = items[items.length - 1];
  if (!items.some(x => x.meal === 'lunch') && t >= 660 && t <= 790) return ['meal', 'lunch'];
  if (!items.some(x => x.meal === 'dinner') && t >= 1050 && t <= 1170) return ['meal', 'dinner'];
  if (mood === 'hungry' && !items.length) return ['meal', ''];
  if (t >= 1230) return items.some(x => x.type === 'night') ? null : [mood === 'quiet' ? 'cafe' : 'night', ''];
  if (last && last.type === 'act' && !items.some(x => x.type === 'cafe')) return ['cafe', ''];
  return ['act', ''];
}

/** a walking course from ll between t0 and tEnd (up to 8 stops) */
export async function buildCourse(ll: LL, t0: number, tEnd: number, o: DoLook, recent: Set<string>): Promise<{ items: Stop[]; src: string }> {
  const items: Stop[] = [], used = new Set<string>(); let t = t0, prev = ll, src = '';
  const pool = async (type: string) => { const r = await poolFor(type, ll, t, o); src = r.src; return r.list.filter(x => !used.has(x.id!)) };
  while (items.length < 8 && (t + 20 <= tEnd || (items.length < 3 && t < tEnd + 60))) {
    const ty = courseTypes(t, items, o.mood); if (!ty) break;
    let [type] = ty; const meal = ty[1];
    let c = pickNear(await pool(type), prev, 900, recent);
    if (!c && type === 'act') { type = 'cafe'; c = pickNear(await pool('cafe'), prev, 900, recent) }
    if (!c) { if (items.length) break; else throw appError('none', '이 근처에서 갈 만한 곳을 찾지 못했어요. 동네나 기분을 바꿔 보세요.') }
    const walk = walkMin(prev, c.ll as LL), start = Math.ceil((t + (items.length ? walk : Math.min(walk, 15))) / 10) * 10;
    items.push(Object.assign({}, c, { type, meal, start, dur: TYPE_DUR[type], walk })); used.add(c.id!); prev = c.ll as LL; t = start + TYPE_DUR[type];
  }
  return { items, src };
}

/** after a stop changed: walking times and start times from stop `from` on */
export function reflow(c: Stop[], origin: LL, from: number): void {
  for (let j = Math.max(1, from); j < c.length; j++) { c[j].walk = walkMin(c[j - 1].ll as LL, c[j].ll as LL); c[j].start = Math.ceil((c[j - 1].start + c[j - 1].dur + c[j].walk) / 10) * 10 }
  if (from === 0 && c[0]) c[0].walk = walkMin(origin, c[0].ll as LL);
}

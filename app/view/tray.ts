// What the 장소 tab shows (the filter chips and the place cards, grouped by 동네, by 👍, or as one list) and the sheet of an
// empty time in the 일정표 (places that fit, and ones that don't with why). The screens are Tray.tsx and BlockSheet.tsx
// FillSheet; this only makes their props. (It used to be renderTray / cardInfo / openFill in src/js/340-render.js.)
// The old code still gives the tab's state (which filter, which day …) and what other features add (TrayCtx).
import * as trip from '../data/trip';
import * as days from '../data/days';
import * as places from '../data/places';
import * as check from '../data/check';
import * as recs from '../data/recs';
import * as trips from '../data/trips';
import { outOfSeason, mdTxt, BEST_KO } from '../data/season';
import { yen } from '../data/traveler';
import { km, inKorea, type LL } from '../logic/geo';
import { norm } from '../logic/places';
import { fmt, durTxt } from '../logic/time';

const WD = ['일', '월', '화', '수', '목', '금', '토'];
const { P, PM, MUST, CATS, ZONES, ZONE_OF, costOf, mustOf, tagsOf } = places;
const { travel, hoursFor, closedOn } = check;
const placeKeyOf = (p: any) => recs.placeKey((places.state.pack && places.state.pack.city) || '', p.name);
const recOf = (p: any) => recs.countOf(placeKeyOf(p));
const iRec = (p: any) => recs.isMine(placeKeyOf(p));
const isWish = (id: string) => trip.wish.has(id);
/** the traveler's keywords this place carries */
export const matchKw = (id: string): string[] => { const set = new Set(trip.kws.get().map(norm)); return tagsOf(id).filter(t => set.has(norm(t))) };

/** the 장소 tab's state and what other features add */
export interface TrayCtx {
  day: number; cat: string; group: string; zoneOpen: Record<string, boolean>; openOnly: boolean; selected: string | null;
  /** P모드: the tab collects 내 카드 */
  pmode: boolean; ai: boolean; manual: boolean;
  /** places the AI just found (✨ 방금 찾은 곳) */
  fresh: Set<string>;
  /** the open plan is shared with friends (가고 싶어요 counts) */
  shared: boolean;
  /** "같은 곳 같아요" pairs (388-dedup.js) */
  dups: any[];
  /** what other features add to a card (CARD_EXTRAS) */
  extras(p: any): any[];
}

/** the places the day's blocks are at (and the stay it starts from), to say how far a card is */
function dayRefs(day: number) {
  const D = days.state, refs: { id?: string; name: string; ll: LL }[] = days.dayItems(day).map((i: any) => ({ id: i.id, name: i.stay ? `${i.area} 숙소` : i.name, ll: i.ll }));
  if (day > 0) refs.push({ name: `${D.locArea[D.days[day].startLoc]} 숙소`, ll: D.loc[D.days[day].startLoc].ll });
  return refs;
}
function nearestRef(p: any, refs: ReturnType<typeof dayRefs>) { let best: { d: number; r: (typeof refs)[number] } | null = null; for (const r of refs) { if (r.id === p.id) continue; const d = km(p.ll, r.ll); if (!best || d < best.d) best = { d, r } } return best }

/** one place card (Tray.tsx Card) */
function cardInfo(p: any, wd: number, near: any, c: TrayCtx) {
  const h = hoursFor(p, wd), off = closedOn(p, wd), oos = outOfSeason(p, days.state.days[c.day].iso), mk = matchKw(p.id), T = (cl: string, t: string) => ({ c: cl, t });
  let dist = ''; if (near) { const t = travel(near.r.ll, p.ll); dist = `${near.r.name}에서 ${t ? `${t.mode} 약 ${t.min}분` : '바로 옆'}` }
  const key = off ? T('tag w', `${WD[wd]} 휴관`) : oos ? T('tag w', '이 날은 기간 아님') : p.season ? T('tag r', `🗓 ${p.season}`) : mustOf(p.id) ? T('tag r', '★ 추천') : mk.length ? T('tag kwt', `#${mk[0]}`) : null;
  const det = [p.shared || p.fromUsers ? T('tag usr', p.userMade ? '여행자가 올린 곳' : '여행자 추천') : null,
    mustOf(p.id) ? T('tag r', `★ ${mustOf(p.id)}`) : null, ...mk.map(k => T('tag kwt', `#${k}`)),
    T('tag mono', costOf(p.id)[0] ? yen(costOf(p.id)[0]) : '무료'),
    h ? T('tag mono', `${fmt(h[0])}–${fmt(h[1])}`) : T('tag', '언제든'),
    p.closed && p.closed.length ? T('tag', `${p.closed.map((w: number) => WD[w]).join('·')} 휴관`) : null,
    p.season && p.dates ? T('tag r', `🗓 ${mdTxt(p.dates[0]) || ''}~${mdTxt(p.dates[1]) || ''}`) : null,
    p.best && p.best !== 'any' ? T('tag', `${BEST_KO[p.best]}에 좋아요`) : null,
    p.check ? T('tag', `준비: ${p.check}`) : null,
    p.gone ? T('tag r', '폐업했을 수 있어요') : p.hsrc === 'google' ? T('tag ok', '영업시간 확인됨') : p.verify === '영업시간' && p.ll && inKorea(p.ll) ? T('tag', '영업시간 추정') : p.verify ? T('tag', `확인 필요: ${p.verify}`) : null].filter(Boolean);
  return { id: String(p.id), name: String(p.name), sub: `${p.area} · ${p.note}`, cat: String(p.cat), sel: c.selected === p.id, off: !!(off || oos), dist, wish: !!isWish(p.id),
    vote: recs.state.status !== 'off' ? { on: !!iRec(p), n: recOf(p), locked: false } : null, extras: c.extras(p), dur: p.dur, key, det };
}

/** the filter chips, and the cards (or why there are none) */
export function tray(c: TrayCtx) {
  const wd = days.state.days[c.day].wd, cat = c.cat;
  const filters = { chips: [['all', '전체'], ['wish', '♥'], ...(P.some(p => p.season) ? [['season', '🗓 시즌']] : []), ...(recs.state.status !== 'off' ? [['users', '👍']] : []), ['must', '★']], cats: Object.entries(CATS), cat };
  const used = new Set(trip.cur.placed.map(b => b.id));
  const inCat = P.filter((p: any) => !(cat === 'all' && p.drop) && (cat === 'all' || (cat === 'wish' ? isWish(p.id) : cat === 'season' ? !!p.season : cat === 'must' ? !!MUST[p.id] : cat === 'users' ? (recOf(p) > 0 || p.shared) : p.cat === cat)) && (!c.openOnly || (!closedOn(p, wd) && !outOfSeason(p as any, days.state.days[c.day].iso))));
  const list = inCat.filter(p => !used.has(p.id));
  const nHidden = inCat.length - list.length;
  const pmode = c.pmode ? { count: trip.cur.wish.filter(id => PM[id] && !used.has(id)).length, ai: c.ai } : null;
  const cards = (empty: string | null, groups: any[]) => ({ dups: c.dups, hidden: nHidden, empty, groups, pmode });
  if (!list.length && c.pmode && !P.length) return { filters, cards: cards(c.ai ? '아직 장소가 없어요. 위의 "AI에게 추천받기"로 후보를 받아 보세요.' : '아직 장소가 없어요. 위의 "직접 적어 담기"로 가고 싶은 곳을 적어 보세요.', []) };
  if (!list.length) return { filters, cards: cards(P.length ? '이 조건에서 남은 후보지가 없어요.' : c.ai && !c.manual ? '아직 장소 후보가 없어요. 위에서 AI로 찾아보세요.' : '장소 후보가 없어요. 타임라인의 "+ 직접 만들기"로 블록을 만들어 쓰세요.', []) };
  const refs = dayRefs(c.day);
  let rows = list.map(p => ({ p, near: nearestRef(p, refs)! }));
  const card = (x: (typeof rows)[number]) => cardInfo(x.p, wd, x.near, c);
  const fresh = rows.filter(x => c.fresh.has(x.p.id)); rows = rows.filter(x => !c.fresh.has(x.p.id));
  const freshG = fresh.length ? [{ kind: 'fresh', name: '✨ 방금 찾은 곳', near: true, note: 'AI가 새로 찾았어요', cards: fresh.map(card) }] : [];
  const w = (p: any) => +isWish(p.id);
  if (c.group === 'pop') { // people's 👍 first (all travelers), then friends' 가고 싶어요, then my ♥
    const fw = (p: any) => c.shared ? trips.wantsOf(p.id).length : 0;
    rows.sort((a, b) => recOf(b.p) - recOf(a.p) || fw(b.p) - fw(a.p) || w(b.p) - w(a.p) || a.near.d - b.near.d);
    return { filters, cards: cards(null, [...freshG, { kind: 'list', cards: rows.map(card) }]) };
  }
  if (c.group === 'list') {
    rows.sort((a, b) => w(b.p) - w(a.p) || (+!!b.p.season) - (+!!a.p.season) || (+!!MUST[b.p.id]) - (+!!MUST[a.p.id]) || recOf(b.p) - recOf(a.p) || matchKw(b.p.id).length - matchKw(a.p.id).length || a.near.d - b.near.d);
    return { filters, cards: cards(null, [...freshG, { kind: 'list', cards: rows.map(card) }]) };
  }
  const zones: Record<string, typeof rows> = {}; rows.forEach(x => { const z = ZONE_OF[x.p.id] || 'outer'; (zones[z] = zones[z] || []).push(x) });
  const order = Object.entries(zones).map(([z, arr]) => { arr.sort((a, b) => a.near.d - b.near.d); return { z, arr, d: arr[0].near.d } }).sort((a, b) => a.d - b.d);
  return { filters, cards: cards(null, [...freshG, ...order.map((g, i) => {
    const open = c.zoneOpen[g.z] ?? (i < 2); const n = g.arr[0].near, t = travel(n.r.ll, g.arr[0].p.ll);
    return { kind: 'zone', zone: g.z, name: ZONES[g.z], open, near: i === 0, note: i === 0 ? '오늘 일정과 가장 가까워요' : `가장 가까운 일정에서 ${t ? `${t.mode} 약 ${t.min}분` : '바로'}`, cards: g.arr.map(card) };
  })]) };
}

/** the sheet of an empty time t on a day: up to 7 places that fit (plus one at random), and some that don't with why */
export function fill(day: number, t: number) {
  const D = days.state.days[day], wd = D.wd, { items } = check.analyze(day), L = days.state;
  const prev = items.filter((i: any) => i.end <= t).pop() || null;
  const next = items.find((i: any) => i.start > t) || null;
  const pLl = prev ? prev.ll : L.loc[D.startLoc].ll, pName = prev ? (prev.stay ? `${prev.area} 숙소` : prev.name) : `${L.locArea[D.startLoc]} 숙소`;
  const gS = prev ? prev.end : (day === 0 ? days.arrEnd() : 480), gE = next ? next.start : 1440, len = Math.max(0, gE - gS);
  const tm = (a: LL, b: LL) => (travel(a, b) || { min: 0 }).min;
  const base = next ? tm(pLl, next.ll) : 0;
  const used = new Set(trip.cur.placed.map(b => b.id));
  const carrying = prev ? !!prev.carryAfter : false;
  const rows: any[] = P.filter(p => !used.has(p.id)).map((p: any) => {
    const tin = tm(pLl, p.ll), tout = next ? tm(p.ll, next.ll) : 0, h = hoursFor(p, wd);
    let start = Math.ceil(Math.max(t, gS + tin) / 15) * 15; if (h && start < h[0]) start = Math.ceil(h[0] / 15) * 15;
    const end = start + p.dur; let why = '';
    if (carrying && !p.drop && !['walk', 'trip'].includes(p.cat)) why = '짐을 맡긴 뒤에 가능';
    else if (!carrying && p.drop) why = '들고 있는 짐이 없어요';
    else if (closedOn(p, wd)) why = `${WD[wd]}요일 휴관`;
    else if (h && end > h[1]) why = `영업 ${fmt(h[0])}–${fmt(h[1])}`;
    else if (end + tout > gE) why = '시간이 모자라요';
    return { p, tin, tout, start, extra: tin + tout - base - (carrying && p.drop ? 1000 : 0), why };
  });
  rows.forEach(r => { r.mk = matchKw(r.p.id); r.score = Math.min(r.mk.length, 4) * 10 + (MUST[r.p.id] ? 15 : 0) - r.extra * 0.6 });
  const fitAll = rows.filter(r => !r.why).sort((a, b) => b.score - a.score || a.start - b.start);
  const fit = fitAll.slice(0, 7); const rest = fitAll.slice(7);
  if (rest.length) { const r = rest[Math.floor(Math.random() * rest.length)]; r.random = true; fit.push(r) }
  const dim = rows.filter(r => r.why).sort((a, b) => a.extra - b.extra).slice(0, 4);
  const row = (r: any) => ({ id: String(r.p.id), cat: String(r.p.cat), name: String(r.p.name), random: !!r.random, star: !!MUST[r.p.id], kws: (r.mk || []).map(String), mustNote: '',
    line: [`${r.p.area} · ${r.p.dur}분 · ${costOf(r.p.id)[0] ? yen(costOf(r.p.id)[0]) : '무료'} · 앞 일정에서 ${r.tin ? `약 ${r.tin}분` : '바로'}${next ? ` · 다음 일정까지 ${r.tout ? `약 ${r.tout}분` : '바로'}` : ''}`],
    act: r.why ? { k: 'why', t: r.why } : { k: 'fill', start: r.start, time: fmt(r.start) } });
  return { title: `${fmt(gS)}–${fmt(gE)} 비어 있음`, when: `${durTxt(len)} · 앞: ${pName}${next ? ` · 뒤: ${next.stay ? `${next.area} 숙소` : next.name}` : ''}`,
    carrying, t, tapped: fmt(t), fit: fit.map(row), dim: dim.map(row) };
}

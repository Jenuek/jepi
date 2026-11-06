// What a block's sheet shows (BlockSheet.tsx): when and where, hours, cost, travel to it, warnings, 할 일 표시, and other
// places for the same time (가까운 곳 / 조금 먼 곳 / 들러 볼 만한 곳). This only makes the props. (It used to be openSheet /
// altsFor / altsInfo in src/js/350-actions.js.) What other features add to the sheet the old code still gives (`extras`).
import * as trip from '../data/trip';
import * as days from '../data/days';
import * as places from '../data/places';
import * as check from '../data/check';
import * as recs from '../data/recs';
import * as marks from '../data/marks';
import { mdTxt } from '../data/season';
import { yen, won } from '../data/traveler';
import { fmt, durTxt } from '../logic/time';
import type { LL } from '../logic/geo';
import { segs } from './day';
import { matchKw } from './tray';

const WD = ['일', '월', '화', '수', '목', '금', '토'];
const { P, MUST, costOf } = places;
const { travel, hoursFor, closedOn } = check;
const city = () => (places.state.pack && places.state.pack.city) || '';
const placeKeyOf = (p: any) => recs.placeKey(city(), p.name);
/** the place on Google Maps (by its local name in the destination) */
export const placeLink = (p: any): string => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((p.local || p.name) + ' ' + city())}`;

/** other places for the same time as this block: near (at most 10 more minutes of travel), far (a few, one at random),
 *  must (worth-the-detour places that don't fit: how much later the rest of the day gets) */
function altsFor(day: number, it: any) {
  const D = days.state.days[day], wd = D.wd, { items } = check.analyze(day);
  const others = items.filter((i: any) => i.uid !== it.uid);
  const prev = others.filter((i: any) => i.start < it.start || (i.start === it.start && i.kind === 'fixed')).pop() || null;
  const next = others.find((i: any) => i.start >= it.start && i !== prev && !(i.start === it.start && i.kind === 'fixed')) || null;
  const pLl = prev ? prev.ll : days.state.loc[D.startLoc].ll, gS = prev ? prev.end : days.dayStart(day), gE = next ? next.start : 1440;
  const carrying = prev ? !!prev.carryAfter : false;
  const tm = (a: LL, b: LL) => (travel(a, b) || { min: 0 }).min;
  const used = new Set(trip.cur.placed.map(b => b.id));
  const origT = tm(pLl, it.ll) + (next ? tm(it.ll, next.ll) : 0);
  const food = it.p.cat === 'food' || (it.p.cat === 'night' && !['shelter', 'zen'].includes(it.id));
  const out: any[] = [];
  for (const p of P as any[]) {
    if (used.has(p.id) || p.drop) continue;
    if (food ? !(p.cat === 'food' || (p.cat === 'night' && it.start >= 1020)) : (p.cat === 'food' || p.cat === 'trip' || (p.cat === 'night' && it.start < 1020))) continue;
    if (carrying && !['walk'].includes(p.cat)) continue;
    if (closedOn(p, wd)) continue;
    const h = hoursFor(p, wd), tin = tm(pLl, p.ll), tout = next ? tm(p.ll, next.ll) : 0;
    let start = Math.ceil(Math.max(it.start, gS + tin) / 5) * 5; if (h && start < h[0]) start = Math.ceil(h[0] / 5) * 5;
    let dur = Math.min(p.dur, gE - tout - start); if (h) dur = Math.min(dur, h[1] - start);
    if (dur < Math.min(30, p.dur)) continue;
    dur = Math.floor(dur / 5) * 5;
    const mk = matchKw(p.id);
    out.push({ p, start, dur, tin, tout, mk, extra: tin + tout - origT, score: Math.min(mk.length, 4) * 10 + (MUST[p.id] ? 15 : 0) - (tin + tout) * 0.6 });
  }
  out.sort((a, b) => b.score - a.score);
  const near = out.filter(r => r.extra <= 10);
  const farAll = out.filter(r => r.extra > 10);
  const far = farAll.slice(0, 3), rest = farAll.slice(3);
  if (rest.length) { const r = rest[Math.floor(Math.random() * rest.length)]; r.random = true; far.push(r) }
  const shown = new Set(out.map(r => r.p.id)), must: any[] = [];
  if (!food) for (const p of P as any[]) {
    if (!MUST[p.id] || used.has(p.id) || shown.has(p.id) || p.drop || p.dur > 240) continue;
    if (carrying && p.cat !== 'walk') continue;
    if (closedOn(p, wd)) continue;
    const h = hoursFor(p, wd), tin = tm(pLl, p.ll), tout = next ? tm(p.ll, next.ll) : 0;
    let start = Math.ceil(Math.max(it.start, gS + tin) / 5) * 5; if (h && start < h[0]) start = Math.ceil(h[0] / 5) * 5;
    if (h && start + 30 > h[1]) continue;
    const dur = h ? Math.min(p.dur, h[1] - start) : p.dur;
    const over = Math.max(0, start + dur + tout - gE); if (over > 120) continue;
    must.push({ p, start, dur, tin, tout, mk: matchKw(p.id), extra: tin + tout - origT, over, must: true });
  }
  must.sort((a, b) => a.over - b.over);
  return { near, far, must };
}
/** 같은 시간 대안 (BlockSheet.tsx) */
function altsInfo(day: number, it: any) {
  const { near, far, must } = altsFor(day, it);
  const mine = matchKw(it.id);
  const ex = (r: any) => r.extra <= 0 ? '이동 그대로' : `이동 +${r.extra}분`;
  const row = (r: any) => ({ id: String(r.p.id), cat: String(r.p.cat), name: String(r.p.name), random: !!r.random, star: !!(MUST[r.p.id] && !r.must), kws: r.mk.map(String), mustNote: r.must ? String(MUST[r.p.id]) : '',
    line: segs(`${r.p.area} · ${fmt(r.start)}–${fmt(r.start + r.dur)} · ${costOf(r.p.id)[0] ? yen(costOf(r.p.id)[0]) : '무료'} · ${r.must ? `앞에서 약 ${r.tin}분${r.over ? ' · ' : ''}` : ex(r)}`,
      ...(r.must && r.over ? [{ t: `뒤 일정이 ${durTxt(r.over)} 밀려요`, tag: 'b', color: 'var(--warn)' }] : [])), act: { k: 'swap', start: r.start, dur: r.dur } });
  return { mine: mine.length ? mine.map(k => '#' + k).join(' ') : '겹치는 취향 키워드 없음', near: near.map(row), must: must.map(row), far: far.map(row) };
}

/** a block's sheet (null: no such block on this day). marksOpen: keep the 할 일 표시 box open; extras: what features add */
export function blockSheet(day: number, uid: string, marksOpen: boolean, extras: (it: any) => any[]) {
  const { items } = check.analyze(day); const it = items.find((i: any) => i.uid === uid); if (!it) return null;
  const D = days.state.days[day], isP = it.kind === 'place', ti = it.travelIn;
  const h = isP ? hoursFor(it.p, D.wd) : null, B = (t: string) => ({ t, tag: 'b', cls: 'mono' });
  return {
    name: String(it.name), when: `${D.date} (${WD[D.wd]}) ${fmt(it.start)}–${fmt(it.end)} · ${it.locName}`, note: it.note || '',
    mapLink: isP && !it.p.custom ? placeLink(it.p) : '',
    vote: isP && recs.state.status !== 'off' ? { id: String(it.id), on: !!recs.isMine(placeKeyOf(it.p)), n: recs.countOf(placeKeyOf(it.p)), locked: false } : null,
    hours: isP && h ? `영업 ${fmt(h[0])}–${fmt(h[1])}${it.p.closed ? ` · 휴관 ${it.p.closed.map((w: number) => WD[w]).join('·')}` : ''}` : '',
    cost: isP ? segs('예상 비용 ', B(yen(it.yen)), it.costNote ? ` · ${it.costNote}` : '') : null,
    krw: it.krw ? won(it.krw) : '', check: isP && it.p.check ? String(it.p.check) : '', tips: it.tips && it.tips.length ? `💡 ${it.tips.join(' · ')}` : '',
    season: isP && it.p.season ? segs('🗓 ', { t: String(it.p.season), tag: 'b' }, it.p.dates ? ` · ${mdTxt(it.p.dates[0]) || '?'}~${mdTxt(it.p.dates[1]) || '?'}` : '',
      ...(it.p.conf !== 'high' ? [' · ', { t: '올해 날짜 확인', tag: 'a', href: `https://www.google.com/search?q=${encodeURIComponent((it.p.local || it.p.name) + ' ' + (days.state.days[0].iso || '').slice(0, 4))}` }] : [])) : null,
    extras: extras(it), warns: it.warns.map(String),
    travel: ti ? segs(`이동: ${ti.fromName}에서 ${ti.real ? '' : '약 '}${ti.mode} ${ti.min}분${ti.lines ? ` (${ti.lines}${ti.tf ? ` · 환승 ${ti.tf}회` : ''})` : ''}${ti.fare ? ` · ${yen(ti.fare)}` : ''} · `, { t: '안내 시작', tag: 'a', href: String(ti.link) }) : null,
    marks: !it.stay && !['f0a', 'f0b', 'f0c', 'f8', 'f9'].includes(it.uid) ? marks.info(it, marksOpen, day) : null,
    place: isP ? { customId: it.p.custom ? String(it.id) : null, alts: altsInfo(day, it) } : null,
    home: !isP && uid === 'f0a' ? { word: days.MODE_WORD[(trip.cur.profile as any).mode], min: days.state.homeMin } : null,
  };
}

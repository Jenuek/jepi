// The day check behind the 일정표: for each block, what to warn about, the travel between blocks, and the free gaps.
// (It used to be analyze / gapsOf in src/js/330-helpers.js.) The old code builds the day's items and passes what the
// check needs to know about places (opening hours, season, routes …); the rules themselves are here.
import type { LL } from './geo';

/** one block of the day (a fixed block — flight, stay — or a place), as the old code builds it */
export interface DayItem {
  kind: 'fixed' | 'place';
  uid: string; name: string; start: number; end: number; ll: LL;
  /** suitcase: dropped here (check-in, storage) / picked up here (arrival, checkout) */
  drop?: boolean; bagStart?: boolean;
  /** no travel into this block (e.g. right after landing) */
  skipIn?: boolean;
  p?: { cat: string; [k: string]: unknown };
  // filled in by checkDay:
  warns: string[]; tips: string[]; marks: string[]; carry?: boolean; carryAfter?: boolean; travelIn?: unknown;
  [k: string]: unknown;
}

export interface Travel { mode: string; min: number; real?: boolean; fare?: number | null; cur?: string; lines?: string; [k: string]: unknown }
export interface Leg { from: number; min: number; mode: string; bad: boolean; fare: number; real: boolean; lines: string; fromName: string; toName: string; link: string }

/** what the check needs to know (functions about places stay in the old code for now) */
export interface DayContext {
  /** Day 1 starts with the fixed arrival, so no travel into the first block */
  firstDay: boolean;
  /** where the day starts (the stay) */
  start: { ll: LL; name: string };
  dayStart: number;
  /** weekday name (월, 화, …) and date of the day */
  wdName: string; iso: string;
  kidsInParty: boolean;
  currency: string;
  marksOf(it: DayItem): string[];
  hasMark(it: DayItem, m: string): boolean;
  /** warnings that come from 할 일 표시 pairs, by uid */
  markWarnings(uid: string): string[];
  closed(p: DayItem['p']): boolean;
  /** not on during a season event: its date range text, else null */
  outOfSeason(p: DayItem['p']): string | null;
  tips(p: DayItem['p'], start: number, end: number): string[];
  hours(p: DayItem['p']): [number, number] | null;
  travel(a: LL, b: LL): Travel | null;
  fare(a: LL, b: LL, mode: string): number;
  nav(a: LL, b: LL, mode: string, name: string): string;
  fmt(m: number): string;
}

/** check one day: fills each item's warns / tips / marks / carry / travelIn and returns the travel legs */
export function checkDay(items: DayItem[], c: DayContext): Leg[] {
  const trans: Leg[] = [];
  items.forEach(it => { it.warns = []; it.tips = [] });
  type Prev = { end: number; ll: LL; name: string; virtual?: boolean };
  let prev: Prev | null = c.firstDay ? null
    : { end: items.length ? Math.max(c.dayStart, items[0].start - 90) : c.dayStart, ll: c.start.ll, name: c.start.name, virtual: true };
  let carrying = false;
  for (const it of items) {
    it.marks = c.marksOf(it);
    // suitcase: picked up at arrival/checkout, dropped at a check-in, a storage block or the airport
    if (it.drop || c.hasMark(it, 'bag+') || c.hasMark(it, 'ship+')) carrying = false;
    it.carry = carrying;
    if (carrying && it.kind === 'place' && !['walk', 'trip'].includes(it.p!.cat)) it.warns.push('캐리어를 든 채로는 어려워요 · 먼저 짐 맡기기');
    if (it.bagStart || c.hasMark(it, 'bag-') || c.hasMark(it, 'ship-')) carrying = true;
    c.markWarnings(it.uid).forEach(w => it.warns.push(w));
    it.carryAfter = carrying;
    if (it.kind === 'place') {
      const p = it.p;
      if (c.closed(p)) it.warns.push(`${c.wdName}요일 휴관`);
      const season = c.outOfSeason(p); if (season) it.warns.push(`행사 기간(${season})이 아니에요`);
      it.tips = c.tips(p, it.start, it.end);
      const h = c.hours(p);
      if (h && (it.start < h[0] || it.end > h[1])) it.warns.push(`영업시간 ${c.fmt(h[0])}–${c.fmt(h[1])} 밖`);
    }
    if (prev && !it.skipIn) {
      const t = c.travel(prev.ll, it.ll);
      if (!prev.virtual && it.start < prev.end) it.warns.push(`'${prev.name}'과 시간이 겹쳐요`);
      if (t) {
        const from = prev.virtual ? it.start - t.min : prev.end;
        const gap = it.start - (prev.virtual ? from : prev.end);
        const bad = !prev.virtual && gap < t.min;
        if (bad) it.warns.push(`이동 ${t.min}분이 필요한데 ${Math.max(0, gap)}분뿐이에요`);
        if (!prev.virtual && t.min >= 45 && c.kidsInParty && it.kind === 'place') it.warns.push(`아이와 ${t.min}분 이동은 길어요 · 가까운 곳으로 바꾸거나 쉬는 시간을 넣어 보세요`);
        const fare = t.real && t.fare != null && t.cur && t.cur === (c.currency || '') ? t.fare : c.fare(prev.ll, it.ll, t.mode);
        const link = c.nav(prev.ll, it.ll, t.mode, it.name);
        trans.push({ from, min: t.min, mode: t.mode, bad, fare, real: !!t.real, lines: t.lines || '', fromName: prev.name, toName: it.name, link });
        it.travelIn = { ...t, fare, link, fromName: prev.name };
      }
    }
    prev = { end: it.end, ll: it.ll, name: it.name };
  }
  return trans;
}

/** free time of 90 minutes or more between from (start of the day) and 23:00 */
export function gaps(items: { start: number; end: number }[], from: number): [number, number][] {
  const out: [number, number][] = []; let cur = from;
  for (const it of items.filter(i => i.start < 1380)) { if (it.start - cur >= 90) out.push([cur, it.start]); cur = Math.max(cur, it.end) }
  if (1380 - cur >= 90) out.push([cur, 1380]);
  return out;
}

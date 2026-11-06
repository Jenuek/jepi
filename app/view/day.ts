// What the 일정 tab shows for one day, worked out from the trip: the Day buttons, the 일정표 (blocks, trips between them,
// area bands, sunset line), the 동선 line and the 예산 box. The screens are DayTop.tsx and DayGrid.tsx; this only makes
// their props. (It used to be renderDays / renderTimeline / renderRoute / renderBudget in src/js/340-render.js.)
// What other features add to a block (badges, a handwritten memo) the old code still gives (`extras`).
import * as days from '../data/days';
import * as places from '../data/places';
import * as check from '../data/check';
import { MARKS } from '../data/marks';
import { sunsetMin } from '../data/season';
import { budgetParts, heads, yen, won } from '../data/traveler';
import { fmt, durTxt } from '../logic/time';

const WD = ['일', '월', '화', '수', '목', '금', '토'];
const DAY_END = 24 * 60;

/** the Day buttons (with how many warnings each day has) */
export function dayButtons(day: number) {
  return { days: days.state.days.map((D, i) => { const n = check.analyze(i).items.reduce((a: number, it: any) => a + it.warns.length, 0);
    return { date: `${D.date} ${WD[D.wd]}`, label: `Day ${i + 1}${n ? ` · 경고 ${n}` : ''}`, on: i === day } }) };
}

/** what the old code still adds to each block: its badges and its handwritten memo */
export interface BlockExtras { badges(it: any): any[]; memo(it: any): string }

/** the 일정표 of a day (H: pixels per hour) and how tall it is */
export function timeline(day: number, H: number, ex: BlockExtras) {
  const DAY_START = days.dayStart(day), { items, trans } = check.analyze(day);
  const y = (m: number) => (m - DAY_START) / 60 * H;
  const hours: number[] = []; for (let h = DAY_START / 60; h < DAY_END / 60; h++) hours.push(h);
  const tr = trans.map((t: any) => ({ top: y(Math.max(DAY_START, t.from)), h: Math.max(16, t.min / 60 * H), bad: !!t.bad, text: `${t.real ? '' : '≈'}${t.mode} ${t.min}분${t.lines ? ` · ${t.lines}` : ''}${t.fare ? ` · ${yen(t.fare)}` : ''}` }));
  const blocks = items.map((it: any) => {
    const top = y(Math.max(DAY_START, it.start)), hgt = Math.max(30, (it.end - Math.max(DAY_START, it.start)) / 60 * H - 2);
    const cls = ['blk', it.kind === 'fixed' ? 'fixed' : '', it.warns.length ? 'bad' : '', hgt < 48 ? 'compact' : hgt < 72 ? 'short' : ''].join(' ');
    const full = `${fmt(it.start)}–${fmt(it.end)} ${it.name}${it.marks && it.marks.length ? ' · ' + it.marks.map((m: string) => MARKS[m][1]).join(', ') : ''}${it.warns.length ? ' · ' + it.warns[0] : ''}`;
    return { uid: String(it.uid), cls, top, h: hgt, cc: String(it.cc), full, drag: it.kind === 'place', time: hgt < 48 ? `${fmt(it.start)} · ${durTxt(it.end - it.start)}` : `${fmt(it.start)}–${fmt(it.end)}`,
      bang: !!it.warns.length, badges: ex.badges(it), marks: it.marks && it.marks.length ? [...new Set(it.marks.map((m: string) => MARKS[m][0]))].join('') : '', name: String(it.name),
      memo: ex.memo(it) || '', loc: hgt >= 72 ? String(it.locName ?? '') : null };
  });
  // area bands: consecutive blocks (not lodging) in the same area group
  const bands: any[] = [], seq = items.filter((i: any) => !i.stay);
  for (let i = 0; i < seq.length;) {
    let j = i; while (j + 1 < seq.length && seq[j + 1].zone === seq[i].zone) j++;
    if (j > i) { const top = y(Math.max(DAY_START, seq[i].start)), bot = y(seq[j].end), zn = places.ZONES[seq[i].zone];
      bands.push({ top, h: Math.max(20, bot - top), title: `${zn} 권역 ${fmt(seq[i].start)}–${fmt(seq[j].end)}`, label: bot - top > 90 ? `${zn.split('·')[0]} 권역` : null }) }
    i = j + 1;
  }
  const ss = sunsetMin();
  return { grid: { hours, trans: tr, blocks, bands, sunset: ss && ss > DAY_START ? { top: y(ss), text: `🌇 일몰 ${fmt(ss)}` } : null }, height: (DAY_END - DAY_START) / 60 * H, items, trans };
}

/** the 동선 line: the areas of the day in order, its travel time, and the area groups visited twice */
export function route(day: number, items: any[], trans: any[]) {
  const stops: { area: string }[] = [];
  if (day > 0) stops.push({ area: days.state.locArea[days.state.days[day].startLoc] });
  items.forEach((i, k) => { if (i.stay && k !== items.length - 1) return; stops.push({ area: i.area }) });
  const seq = stops.filter((s, i) => i === 0 || s.area !== stops[i - 1].area);
  const total = trans.reduce((a, t) => a + t.min, 0);
  const zs = items.filter(i => !i.stay && !i.drop).map(i => i.zone).filter((z, i, a) => i === 0 || z !== a[i - 1]);
  const seen = new Set(), back = new Set<string>(); zs.forEach(z => { if (seen.has(z)) back.add(z); seen.add(z) });
  return { stops: seq.map(x => String(x.area)), total: durTxt(total), back: back.size ? [...back].map(z => places.ZONES[z].split('·')[0]).join(', ') : '' };
}

/** a line of text and bold / coloured parts (DayTop.tsx Line): neighbouring text is merged, empty text dropped */
export function segs(...xs: any[]): any[] { const out: any[] = []; xs.forEach(x => { if (x == null || x === '') return; if (typeof x === 'string' && typeof out[out.length - 1] === 'string') out[out.length - 1] += x; else out.push(x) }); return out }
/** " · 환율 ¥100 ≈ ₩900" (nothing for won) */
export const rateTxt = (): string => { const pk = places.state.pack!, r = places.rate(); return pk.currency === 'KRW' ? '' : ` · 환율 ${yen(r < 50 ? 100 : 1)} ≈ ${won(r * (r < 50 ? 100 : 1))}` };

/** the 예산 line at the top and the 예산 box of a day */
export function budget(day: number) {
  const c = check.dayCost(day); let tY = 0, tK = 0; days.state.days.forEach((_, i) => { const x = check.dayCost(i); tY += x.yen; tK += x.krw });
  const R = places.rate(), pk = places.state.pack!;
  const bp = budgetParts(), dl = bp ? bp.daily / (R || 1) : 0, pct = bp && dl ? Math.round(c.yen / dl * 100) : 0;
  const KRW = pk.currency === 'KRW', h = heads(), one = h > 1 ? ' (1인)' : '', B = (t: string, cls?: string) => ({ t, tag: 'b', cls });
  const sum = { segs: segs(`💰 오늘 예상${one} `, B(yen(c.yen)), KRW ? '' : ` · 약 ${won(c.yen * R + c.krw)}`, ...(bp ? [' · ', { t: `예산의 ${pct}%`, tag: 'span', cls: pct > 100 ? 'over' : '' }] : [])) };
  const local = bp ? bp.local / (R || 1) : 0;
  const box = { act: yen(c.act), tr: yen(c.tr), meal: yen(c.meal), step: pk.step, home: c.krw ? won(c.krw) : '',
    bar: bp ? { pct, over: pct > 100, line: segs('하루 현지 예산 ', B(yen(dl), 'mono'), ` 중 ${pct}% 사용`, ...(pct > 100 ? [' · ', { t: `${yen(c.yen - dl)} 넘어요`, tag: 'span', color: '#c27a00' }] : []),
      ' · 여행 전체 현지 예산 ', B(yen(local), 'mono'), ` 중 ${Math.round(tY / local * 100)}%`) } : null,
    totalLabel: `오늘 예상${one}`, total: yen(c.yen), totalSub: KRW ? '집 오가는 교통 포함 ' + won(c.yen + c.krw) : '약 ' + won(c.yen * R + c.krw),
    group: h > 1 ? segs(`${h}명 합계 오늘 `, B(yen(c.yen * h), 'mono'), KRW ? '' : ` (약 ${won((c.yen * R + c.krw) * h)})`, ' · 여행 전체 ', B(yen(tY * h), 'mono'), KRW ? '' : ` (약 ${won((tY * R + tK) * h)})`) : null,
    trip: segs(`여행 전체 현지 예상${one} `, B(yen(tY), 'mono'), ` ${KRW ? '' : `(약 ${won(tY * R + tK)}) `}· 쇼핑 제외 · 미리 결제한 교통편·숙소·예약은 제외${rateTxt()}`) };
  return { sum, box };
}

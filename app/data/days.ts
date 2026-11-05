// The trip's days, made from what the traveler entered (여행 정보): dates, the way there and back (flights, train, car),
// stays and booked events become each day's fixed blocks and the places a day starts from. Also the day's item list
// (fixed blocks + my blocks) that the day check reads. It used to be fixProfile / buildDays / dayItems … in
// src/js/020-profile.js, 010-trip-basics.js and 330-helpers.js. The old code reads the same state: DY.days, DY.loc …
import * as trip from './trip';
import * as places from './places';
import { fmt, parse } from '../logic/time';
import type { LL } from '../logic/geo';

/** optional travel style rows: [key, label, options] (every one defaults to "doesn't matter") */
export const STYLE_ROWS: [string, string, [string, string][]][] = [
  ['rhythm', '하루 리듬', [['early', '아침형'], ['late', '늦게 시작해서 밤까지']]],
  ['walk', '걷기', [['lots', '많이 걸어도 좋아요'], ['less', '덜 걷고 싶어요']]],
  ['fame', '장소 성향', [['famous', '유명한 곳 위주'], ['hidden', '현지인 숨은 곳']]],
  ['crowd', '붐비는 곳', [['ok', '괜찮아요'], ['avoid', '피하고 싶어요']]],
  ['food', '음식', [['familiar', '익숙한 맛'], ['adventurous', '현지 음식 도전']]],
  ['comfort', '편안함', [['comfort', '편한 게 최고'], ['experience', '고생해도 특별한 경험']]],
  ['exp', '여행 경험', [['new', '적은 편'], ['pro', '많은 편']]],
  ['lang', '외국어', [['low', '자신 없어요'], ['mid', '기본 영어'], ['high', '잘해요']]],
  ['gender', '성별', [['female', '여성'], ['male', '남성']]]];

/** a fixed block of a day (flight, check-in …) */
export interface Fixed { id: string; name: string; start: number; end: number; loc: string; note: string; skipIn?: boolean; krw?: number; bagStart?: boolean; drop?: boolean }
export interface Day { date: string; iso: string; wd: number; title: string; startLoc: string; fixed: Fixed[] }
type Prof = Record<string, any>;

/** the days and the named places they use (home, airports, stays, events …) */
export const state = {
  days: [] as Day[],
  loc: {} as Record<string, { name: string; ll: LL }>,
  locArea: {} as Record<string, string>,
  locZone: {} as Record<string, string>,
  /** when to be at the home airport / station (minutes) */
  gmpBy: 360,
  /** minutes from home to the airport / station */
  homeMin: 60,
};

export const tmin = (s: unknown, d: number): number => { const v = parse(s); return v == null ? d : v };
export const MODE_WORD: Record<string, string> = { flight: '공항', train: '역', bus: '터미널', car: '도착 지점' };
export const MAX_N = 30;
export function nightsOf(pr: Prof): number { return pr && pr.kind === 'day' ? 0 : Math.max(1, Math.min(MAX_N, +pr.nights || 1)) }
export function dateOf(pr: Prof, i: number): Date | null { const d = new Date((pr.startDate || '2026-11-07') + 'T00:00:00'); if (isNaN(+d)) return null; d.setDate(d.getDate() + i); return d }
export const mdOf = (pr: Prof, i: number): string => { const d = dateOf(pr, i); return d ? `${d.getMonth() + 1}/${d.getDate()}` : `Day ${i + 1}` };
const isoOf = (dt: Date | null) => dt ? `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}` : '';
const apName = (k: string) => (places.AIRPORTS[k] || places.AIRPORTS[places.firstGw()]).name;
const P = () => trip.cur.profile as Prof;

/** when the first day's free time starts (after arriving / meeting) */
export function arrEnd(): number { const pr = P(); return pr.kind === 'day' ? tmin((pr.meet || {}).time, 660) + 15 : tmin(pr.out.arr, 620) + 60 }
/** the first minute a block may start on a day */
export function dayStart(d: number): number {
  const pr = P();
  return d === 0 ? ((pr && pr.kind === 'day') ? Math.max(360, tmin(pr.meet.time, 660) - 60) : 240) : ((pr && pr.style && pr.style.rhythm === 'late') ? 600 : 420);
}

/** fill in and tidy what the traveler entered (old plans may lack fields) */
export function fixProfile(pr: Prof): Prof {
  const { AIRPORTS, AREAS, firstGw, firstArea } = places;
  pr.nights = nightsOf(pr);
  if (!['flight', 'train', 'bus', 'car'].includes(pr.mode)) pr.mode = 'flight'; if (!['transit', 'car'].includes(pr.local)) pr.local = pr.mode === 'car' ? 'car' : 'transit'; if (pr.dest == null) pr.dest = places.state.pack ? places.state.pack.city : '';
  pr.out = Object.assign({ airport: firstGw(), dep: '08:00', arr: '10:30', flight: '' }, pr.out || {});
  pr.back = Object.assign({ airport: firstGw(), dep: '19:00', arr: '21:30', flight: '' }, pr.back || {});
  if (!AIRPORTS[pr.out.airport]) pr.out.airport = firstGw(); if (!AIRPORTS[pr.back.airport]) pr.back.airport = firstGw();
  pr.home = Object.assign({ area: '', min: 60, fare: 1550, byMin: 120 }, pr.home || {});
  if (!Array.isArray(pr.stays) || !pr.stays.length) pr.stays = [{ name: '숙소', area: firstArea(), checkin: '15:00', checkout: '11:00', from: 0, to: pr.nights }];
  pr.stays.forEach((s: any) => { s.from = Math.max(0, Math.min(pr.nights - 1, +s.from || 0)); s.to = Math.max(s.from + 1, Math.min(pr.nights, +s.to || pr.nights)); if (!AREAS[s.area]) s.area = firstArea() });
  if (!Array.isArray(pr.events)) pr.events = [];
  pr.events.forEach((e: any) => { e.day = Math.max(0, Math.min(pr.nights, +e.day || 0)); if (!AREAS[e.area]) e.area = firstArea() });
  { const v: Record<string, string> = {}; STYLE_ROWS.forEach(([k, , o]) => { const x = (pr.style || {})[k]; if (o.some(([a]) => a === x)) v[k] = x }); pr.style = v }
  if (pr.direction && typeof pr.direction !== 'object') delete pr.direction; if (pr.direction) pr.direction = { purpose: String(pr.direction.purpose || '').slice(0, 80), avoid: String(pr.direction.avoid || '').slice(0, 80), note: String(pr.direction.note || '').slice(0, 160) };
  if (!['low', 'mid', 'high'].includes(pr.budget)) pr.budget = 'mid'; if (!['domestic', 'near', 'far'].includes(pr.reach)) pr.reach = 'near';
  if (pr.kind !== 'day') pr.kind = 'trip'; pr.meet = Object.assign({ time: '11:00', end: '20:00', area: '' }, pr.meet || {}); if (!AREAS[pr.meet.area]) pr.meet.area = firstArea();
  if (pr.dateSet === undefined) pr.dateSet = true; if (pr.nightsSet === undefined) pr.nightsSet = true;
  if (pr.flightSet === undefined) pr.flightSet = true; if (pr.staySet === undefined) pr.staySet = true;
  if (pr.bookedFlight !== false) pr.bookedFlight = true; if (pr.bookedStay !== false) pr.bookedStay = true;
  pr.party = Object.assign({ type: 'solo', adults: 1, kids: 0 }, pr.party || {});
  if (!['solo', 'couple', 'friends', 'family'].includes(pr.party.type)) pr.party.type = 'solo';
  pr.party.adults = Math.max(1, Math.min(20, Math.round(+pr.party.adults) || 1)); pr.party.kids = Math.max(0, Math.min(10, Math.round(+pr.party.kids) || 0));
  if (pr.party.type === 'solo') { pr.party.adults = 1; pr.party.kids = 0 } if (pr.party.type === 'couple') { pr.party.adults = 2; pr.party.kids = 0 } if (pr.party.type === 'friends') { pr.party.adults = Math.max(2, pr.party.adults); pr.party.kids = 0 }
  if (!['slow', 'normal', 'full'].includes(pr.pace)) pr.pace = 'normal';
  if (!['alone', 'some', 'social'].includes(pr.social)) pr.social = 'some';
  pr.breakfast = pr.breakfast === true;
  return pr;
}

/** make the days from the current trip's profile */
export function buildDays(): void {
  const { AIRPORTS, AREAS, AREA_ZONE, firstArea } = places, pack = places.state.pack!, S = state;
  if (P().kind === 'day') {
    const pr = fixProfile(P()), m = pr.meet, a = AREAS[m.area] || AREAS[firstArea()], dt = dateOf(pr, 0), st = tmin(m.time, 660), en = Math.max(st + 60, tmin(m.end, 1200)); S.homeMin = 0;
    S.loc = { meet: { name: `만나는 곳 (${a[0]})`, ll: [a[1], a[2]] } }; S.locArea = { meet: a[0] }; S.locZone = { meet: AREA_ZONE[m.area] || 'outer' };
    Object.entries(AIRPORTS).forEach(([k, g]) => { S.loc[k] = { name: g.name, ll: g.ll }; S.locArea[k] = g.name; S.locZone[k] = 'air' });
    S.days = [{ date: mdOf(pr, 0), iso: isoOf(dt), wd: dt ? dt.getDay() : 0, title: `하루 코스 · ${pack.city}`, startLoc: 'meet',
      fixed: [{ id: 'm0', name: '만나기', start: st, end: st + 15, loc: 'meet', note: '여기서 하루를 시작해요.' }, { id: 'm1', name: '헤어지기', start: en, end: Math.min(1440, en + 15), loc: 'meet', note: '오늘 코스 끝!' }] }];
    return;
  }
  const pr = fixProfile(P()), n = pr.nights, M = pr.mode, intl = !!pack.intl, carry = M !== 'car'; S.homeMin = +pr.home.min || 60;
  S.loc = { home: { name: pr.home.area ? `출발지 (${pr.home.area})` : '출발지', ll: Array.isArray(pr.home.ll) ? pr.home.ll : [37.5665, 126.9780] } }; S.locArea = { home: '출발지' }; S.locZone = { home: 'air' };
  Object.entries(AIRPORTS).forEach(([k, g]) => { S.loc[k] = { name: g.name, ll: g.ll }; S.locArea[k] = g.name; S.locZone[k] = 'air' });
  pr.stays.forEach((s: any, i: number) => { const a = AREAS[s.area]; S.loc['stay' + i] = { name: s.name || '숙소', ll: [a[1], a[2]] }; S.locArea['stay' + i] = a[0]; S.locZone['stay' + i] = AREA_ZONE[s.area] });
  pr.events.forEach((e: any, i: number) => { const a = AREAS[e.area]; S.loc['ev' + i] = { name: e.name || '예약한 일정', ll: [a[1], a[2]] }; S.locArea['ev' + i] = a[0]; S.locZone['ev' + i] = AREA_ZONE[e.area] });
  { const a0 = AREAS[(pr.stays[0] || {}).area] || AREAS[firstArea()]; S.loc.arrive = { name: `${pack.city} 도착`, ll: [a0[1], a0[2]] }; S.locArea.arrive = pack.city; S.locZone.arrive = 'air' }
  const stayOf = (k: number) => pr.stays.findIndex((s: any) => k >= s.from && k < s.to);
  const days: Day[] = [], homeMin = S.homeMin;
  for (let d = 0; d <= n; d++) {
    const dt = dateOf(pr, d), fixed: Fixed[] = [], names: string[] = [];
    if (d === 0) {
      const dep = tmin(pr.out.dep, 480), arr = tmin(pr.out.arr, 630), gw = apName(pr.out.airport), word = MODE_WORD[M];
      if (M === 'car') { S.gmpBy = dep; fixed.push({ id: 'f0c', name: `자동차로 ${pack.city} 가기`, start: dep, end: Math.max(dep + 30, arr), loc: 'arrive', skipIn: true, krw: +pr.home.fare || 0, note: `${fmt(dep)} 출발 → ${fmt(arr)} 도착 예정. 기름값·통행료는 "내 정보"에서 바꿀 수 있어요.` }) }
      else {
        const lead = M === 'flight' ? (+pr.home.byMin || 120) : 20; S.gmpBy = Math.max(240, dep - lead); const G = S.gmpBy;
        fixed.push({ id: 'f0a', name: `집 출발 → ${word}`, start: G - homeMin, end: G, loc: 'home', krw: +pr.home.fare || 0, note: `집에서 ${word}까지 걸리는 시간으로 출발 시간을 계산했어요. 아래 버튼으로 바꿀 수 있어요.` });
        if (M === 'flight') fixed.push({ id: 'f0b', name: intl ? '출국 수속' : '탑승 수속', start: G, end: Math.max(G + 15, dep - 30), loc: 'home', note: '항공사 온라인 체크인을 미리 해 두면 짐만 부치면 돼요.' });
        fixed.push({ id: 'f0c', name: `${pr.out.flight ? pr.out.flight + ' · ' : ''}${gw}행`, start: dep, end: Math.max(dep + 30, arr), loc: pr.out.airport, skipIn: true, note: `${fmt(dep)} 출발 → ${fmt(arr)} ${gw} 도착` });
        const ad = M === 'flight' ? (intl ? 60 : 30) : 15;
        fixed.push({ id: 'f1', name: `${gw} 도착${M === 'flight' && intl ? ' · 입국' : ''}`, start: arr, end: arr + ad, loc: pr.out.airport, bagStart: true, note: M === 'flight' && intl ? (pack.arrivalNote || '입국 심사와 짐 찾기.') : '짐을 챙겨 나와요.' });
      }
    }
    const ps = d > 0 ? stayOf(d - 1) : -1, cs = d < n ? stayOf(d) : -1;
    if (ps >= 0 && ps !== cs) { const s = pr.stays[ps], co = tmin(s.checkout, 660); fixed.push({ id: 'co' + d, name: `${s.name || '숙소'} 체크아웃 (${fmt(co)}까지)`, start: co - 30, end: co, loc: 'stay' + ps, bagStart: carry, note: carry ? '체크아웃 뒤에도 짐을 맡길 수 있는지 숙소에 물어보세요. 안 되면 역 짐 보관함을 쓰세요.' : '짐은 차에 실어 두면 돼요.' }) }
    if (cs >= 0 && cs !== ps) { const s = pr.stays[cs], ci = tmin(s.checkin, 900); fixed.push({ id: 'ci' + d, name: `${s.name || '숙소'} 체크인 (${fmt(ci)}부터)`, start: ci, end: ci + 30, loc: 'stay' + cs, drop: true, note: '체크인 전에 짐을 먼저 맡길 수 있는지 숙소에 물어보세요.' }); if (d > 0) names.push('숙소 이동') }
    pr.events.forEach((e: any, i: number) => { if (+e.day !== d) return; const st = tmin(e.start, 1080), en = Math.max(st + 30, tmin(e.end, st + 120)); fixed.push({ id: 'ev' + i, name: e.name || '예약한 일정', start: st, end: en, loc: 'ev' + i, note: '미리 예약한 일정이에요.' }); names.push(e.name || '예약한 일정') });
    if (cs >= 0) fixed.push({ id: 'st' + d, name: `${pr.stays[cs].name || '숙소'} 숙박`, start: 1380, end: 1440, loc: 'stay' + cs, note: '' });
    if (d === n) {
      const dep = tmin(pr.back.dep, 1140), arr = tmin(pr.back.arr, 1290), gw = apName(pr.back.airport);
      if (M === 'car') fixed.push({ id: 'f8', name: '자동차로 집으로', start: dep, end: arr > dep ? arr : 1440, loc: 'home', skipIn: true, krw: +pr.home.fare || 0, note: `${fmt(dep)} 출발 → ${fmt(arr)} 도착 예정` });
      else {
        const lead = M === 'flight' ? (intl ? 180 : 90) : 20;
        fixed.push({ id: 'f7', name: M === 'flight' ? `${gw} ${intl ? '출국' : '탑승'} 수속` : `${gw} 도착 · 탑승 대기`, start: dep - lead, end: dep, loc: pr.back.airport, drop: true, note: M === 'flight' ? (intl ? '출발 3시간 전 도착 기준이에요. 면세 환급은 짐을 부치기 전에 하세요.' : '출발 1시간 30분 전 도착 기준이에요.') : '출발 20분 전 도착 기준이에요.' });
        fixed.push({ id: 'f8', name: `${pr.back.flight ? pr.back.flight + ' · ' : ''}${M === 'flight' ? '돌아가는 비행기' : M === 'train' ? '돌아가는 기차' : '돌아가는 버스'}`, start: dep, end: arr > dep ? arr : 1440, loc: 'home', skipIn: true, note: `${fmt(dep)} 출발 → ${fmt(arr)} 도착` });
        if (arr > dep && arr < 1380) fixed.push({ id: 'f9', name: '도착 · 집으로', start: arr, end: Math.min(1440, arr + (M === 'flight' ? 40 : 10) + homeMin), loc: 'home', krw: +pr.home.fare || 0, note: '도착해서 집까지 가는 시간이에요.' });
      }
    }
    days.push({ date: mdOf(pr, d), iso: isoOf(dt), wd: dt ? dt.getDay() : 0,
      title: `Day ${d + 1}${d === 0 ? ' · 도착' : d === n ? ' · 돌아가는 날' : ''}${names.length ? ' · ' + names.join(', ') : ''}`,
      startLoc: d === 0 ? (M === 'car' ? 'arrive' : pr.out.airport) : (ps >= 0 ? 'stay' + ps : (M === 'car' ? 'arrive' : pr.out.airport)), fixed });
  }
  S.days = days;
}

/** one day's items for the day check: fixed blocks and my blocks, in time order */
export function dayItems(d: number): any[] {
  const S = state, { PM, ZONE_OF, costOf } = places;
  const fx = S.days[d].fixed.map(f => ({ kind: 'fixed', uid: f.id, name: f.name, start: f.id === 'f0a' ? S.gmpBy - S.homeMin : f.start, end: f.id === 'f9' ? f.start + 40 + Math.max(15, S.homeMin - 15) : f.end, skipIn: !!f.skipIn, yen: 0, krw: f.krw || 0, bagStart: !!f.bagStart, drop: !!f.drop, ll: S.loc[f.loc].ll, locName: S.loc[f.loc].name, area: S.locArea[f.loc], zone: S.locZone[f.loc], stay: f.name.includes('숙박'), note: f.note, cc: 'var(--c-fixed)' }));
  const pl = trip.cur.placed.filter(b => b.day === d).map(b => { const p = PM[b.id]; return { kind: 'place', uid: b.uid, id: b.id, name: p.name, start: b.start, end: b.start + b.dur, ll: p.ll, locName: p.area, area: p.area, zone: ZONE_OF[p.id] || 'outer', stay: false, drop: !!p.drop, yen: costOf(p.id)[0], costNote: costOf(p.id)[1], krw: 0, note: p.note, cc: `var(--c-${p.cat})`, p } });
  return (fx as any[]).concat(pl).sort((a, b) => a.start - b.start || a.end - b.end);
}

// What the 이번 여행 / 처음 설정 forms show (TripForms.tsx, OnbBody.tsx, MeRows.tsx): each form part's values, the rows of
// 더보기 → 이번 여행 and the trip's one-line summary. This only makes the props. (It used to be partParty / partTrip /
// partFlight … in src/js/030-forms.js, partBudget in 130, partDest in 060 and meRows / tripSummary in 220.) What the old
// code keeps (the paste box's last message, the finder's answers, the 하루 코스 and 집 parts) it passes in.
import * as trip from '../data/trip';
import * as places from '../data/places';
import { MODE_WORD, MAX_N, nightsOf, mdOf } from '../data/days';
import { budgetParts, won } from '../data/traveler';
import { durTxt } from '../logic/time';
import { norm } from '../logic/places';

const WD = ['일', '월', '화', '수', '목', '금', '토'];
const clone = (o: any) => JSON.parse(JSON.stringify(o));
const esc = (s: unknown) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as any)[c]);
const pack = () => places.state.pack as any;
/** [key, name] pairs for a select */
export const optsOf = (o: Record<string, any>): [string, string][] => Object.entries(o).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v.name]);
const headsOf = (q: any) => Math.max(1, (+q.adults || 1) + (+q.kids || 0));

export function datesInfo(p: any) { const ds = p.dateSet !== false, ns = p.nightsSet !== false; return { start: ds && !p.dateUnknown ? String(p.startDate ?? '') : '', unknown: !!p.dateUnknown, nights: ns ? p.nights : null, maxN: MAX_N } }
export function party(p: any) { const q = p.party; return { f: 'party', type: q.type, adults: q.adults, kids: q.kids } }
export function tripPart(p: any) { return { f: 'trip', bookedFlight: p.bookedFlight !== false, bookedStay: p.bookedStay !== false, dates: datesInfo(p) } }
export function flight(p: any, paste: any) { return { f: 'flight', mode: p.mode, word: MODE_WORD[p.mode], notBooked: p.bookedFlight === false, out: clone(p.out), back: clone(p.back), local: p.local, airports: optsOf(places.AIRPORTS), paste } }
export function stay(p: any, paste: any) { const n = nightsOf(p); return { f: 'stay', helper: p.bookedStay === false, stays: clone(p.stays), areas: optsOf(places.AREAS), nights: Array.from({ length: n }, (_, k) => `${k + 1}박째 (${mdOf(p, k)} 밤)`), paste } }
export function home(p: any) { const h = p.home; return { f: 'home', mode: p.mode, word: MODE_WORD[p.mode], area: h.area, min: h.min, fare: h.fare, byMin: h.byMin, byMinOpts: [60, 90, 120, 150, 180].map(m => [m, '출발 ' + durTxt(m) + ' 전']) } }
export function events(p: any) { const n = nightsOf(p); return { f: 'events', events: clone(p.events), areas: optsOf(places.AREAS), days: Array.from({ length: n + 1 }, (_, k) => `Day ${k + 1} (${mdOf(p, k)})`) } }
/** the line under 예산 (it follows what is typed) */
export function budgetHint(p: any) { const b = budgetParts(p); return b ? `교통·숙박 약 ${won(b.trip)} · 현지 경비 하루 약 ${won(b.daily)}로 계산해요.` : '총예산만 넣으면 교통·숙박 60%, 현지 경비 40%로 나눠요.' }
export function budget(p: any) { return { f: 'budget', man: p.budgetMan || '', trip: p.tripMan || '', local: p.localMan || '', hint: budgetHint(p) } }
/** 여행지 (once picked; the finder is the old code's) */
export function dest(p: any, ai: boolean) {
  const pk = pack(), ready = pk && norm(pk.city) === norm(p.dest || '');
  return { f: 'dest', dest: p.dest ?? '', ai, ready: ready ? `${pk.city} 준비됨 · 동네 ${Object.keys(places.AREAS).length}곳 · 장소 ${places.P.length}곳` : '',
    rate: ready && pk.currency !== 'KRW' ? { cur: pk.currency, val: +places.rate().toFixed(4) } : null };
}
export const banner = (p: any, next: string) => ({ f: 'banner', purpose: p.purpose || '', next });

/** what the old code gives for the rows */
export interface MeParts { dest: (p: any) => any; day: (p: any) => any[]; homeBox: (p: any) => any; paste: (kind: string, hint: string) => any }
/** the rows of 더보기 → 이번 여행: [id, label, value (HTML), the open row's parts] */
export function meRows(p: any, X: MeParts): [string, string, string, () => any[]][] {
  const md = (k: number) => mdOf(p, k), n = nightsOf(p), city = (pack() && pack().city) || '';
  const flightTxt = p.kind === 'day' ? '' : p.bookedFlight === false ? '<span class="wtxt">아직 안 정했어요</span>' : (p.flightSet ? `<span class="mono">가는 편 ${esc(p.out.dep || '')} → ${esc(p.out.arr || '')}</span><small class="mono">오는 편 ${esc(p.back.dep || '')} → ${esc(p.back.arr || '')}</small>` : '시간을 넣어 주세요');
  const stayTxt = p.bookedStay === false ? '<span class="wtxt">아직 안 정했어요</span>' : esc(p.stays.map((s: any) => s.name || '숙소').join(', '));
  const b = budgetParts(p);
  const who = p.party.type === 'solo' ? '혼자' : p.party.type === 'couple' ? '연인·부부' : p.party.type === 'family' ? `가족 ${headsOf(p.party)}명` : `친구 ${headsOf(p.party)}명`;
  if (p.kind === 'day') return [
    ['day', '코스', `${esc(city)} · ${esc(md(0))}`, () => X.day(p)],
    ['who', '누구와', who, () => [party(p)]],
    ['bud', '예산', b ? `1인 ${Math.round(b.total / 10000)}만원` : '정하지 않음', () => [budget(p)]]];
  return [
    ['when', '언제·어디', `${esc(city || p.dest || '미정')} · ${p.dateUnknown ? '날짜 미정' : `${esc(md(0))}–${esc(md(n))}`} (${n}박)`, () => [X.dest(p), tripPart(p)]],
    ['who', '누구와', who, () => [party(p)]],
    ['way', '오가는 길', flightTxt, () => [flight(p, X.paste('flight', '예약 메일이나 e티켓 내용을 붙여 넣으면 AI가 위 칸을 채워요.')), X.homeBox(p), home(p)].filter(Boolean)],
    ['stay', '숙소', stayTxt, () => [stay(p, X.paste('stay', '숙소 예약 확인 내용을 붙여 넣으면 이름, 동네, 체크인·체크아웃을 채워요.'))]],
    ['bud', '예산', b ? `1인 ${Math.round(b.total / 10000)}만원 <small>· 현지 하루 ${won(b.daily)}</small>` : '정하지 않음', () => [budget(p)]],
    ['ev', '예약한 일정', p.events.length ? `${p.events.length}개` : '없음', () => [events(p)]]];
}

/** the trip's city and one line (dates · nights · who) */
export function tripSummary(days: any[]) {
  const pr = trip.cur.profile as any, n = nightsOf(pr), D0 = days[0] || {}, Dn = days[days.length - 1] || {};
  const md = (iso: string) => iso ? `${+iso.slice(5, 7)}/${+iso.slice(8, 10)}` : '';
  const dates = pr.kind === 'day' ? md(D0.iso) : pr.dateUnknown ? '날짜 미정' : `${md(D0.iso)}(${WD[D0.wd]}) – ${md(Dn.iso)}(${WD[Dn.wd]})`;
  const who = pr.party.type === 'solo' ? '혼자' : pr.party.type === 'couple' ? '둘이서' : `${headsOf(pr.party)}명`;
  return { city: (pack() && pack().city) || '여행지 미정', line: pr.kind === 'day' ? `${dates} · 하루 코스 · ${who}` : `${dates} · ${n}박 · ${who}` };
}

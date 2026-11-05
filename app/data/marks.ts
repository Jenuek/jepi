// 할 일 표시 on blocks (짐 맡기기/찾기, 웨이팅, 주문, 빌리기, 짐 보내기, 현금, 면세) and the warnings they make:
// a start without its end (or the other way), luggage left somewhere else, cash-only places, a tax refund to plan.
// It used to be MARKS / markWarnings / marksInfo … in src/js/080-todos.js. Changing a mark: trip.toggleMark.
import * as trip from './trip';
import * as places from './places';
import * as days from './days';
import { km } from '../logic/geo';

export const MARKS: Record<string, [icon: string, label: string]> = {
  'bag+': ['🧳', '짐 맡기기'], 'bag-': ['🧳', '짐 찾기'], 'wait+': ['🎫', '웨이팅 등록'], 'wait-': ['🎫', '웨이팅 입장'],
  'order+': ['🛍', '주문·맡기기'], 'order-': ['🛍', '주문한 것 찾기'], 'rent+': ['🔁', '빌리기'], 'rent-': ['🔁', '반납하기'],
  'ship+': ['📦', '짐 보내기'], 'ship-': ['📦', '짐 받기'], 'cash': ['💴', '현금 준비'], 'tax': ['🧾', '면세 환급'] };
/** the same in English, for the AI */
export const MARK_EN: Record<string, string> = {
  'bag+': 'leaves luggage here', 'bag-': 'picks luggage up here', 'wait+': 'joins the waiting list here', 'wait-': 'enters after waiting here',
  'order+': 'orders or drops off an item here', 'order-': 'collects the ordered item here', 'rent+': 'rents something here', 'rent-': 'returns the rental here',
  'ship+': 'ships luggage ahead from here', 'ship-': 'receives shipped luggage here', 'cash': 'gets cash here', 'tax': 'does the tax refund here' };
/** marks that come in pairs: start (+) and end (-) */
export const PAIRS: Record<string, { same: boolean; sameDay?: boolean; need: string; orphan: string; pair: string; dur: number }> = {
  bag: { same: true, need: '맡긴 짐을 찾는 일정이 없어요', orphan: '맡긴 짐이 없는데 찾기 표시가 있어요', pair: '짐 찾기', dur: 15 },
  wait: { same: true, sameDay: true, need: '웨이팅 뒤 입장하는 일정이 없어요', orphan: '웨이팅 등록 표시가 먼저 있어야 해요', pair: '웨이팅 입장', dur: 60 },
  order: { same: true, need: '주문한 것을 찾으러 가는 일정이 없어요', orphan: '주문·맡기기 표시가 먼저 있어야 해요', pair: '주문한 것 찾기', dur: 15 },
  rent: { same: false, need: '반납하는 일정이 없어요', orphan: '빌리기 표시가 먼저 있어야 해요', pair: '반납하기', dur: 15 },
  ship: { same: false, need: '보낸 짐을 받는 곳이 없어요', orphan: '짐 보내기 표시가 먼저 있어야 해요', pair: '짐 받기', dur: 15 } };

type Item = any;
export const marksOf = (it: Item): string[] => it.kind === 'place' ? ((trip.cur.placed.find(b => b.uid === it.uid) || {} as { mk?: string[] }).mk || []) : ((trip.cur.fmarks || {})[it.uid] || []);
export const hasMark = (it: Item, m: string): boolean => (it.marks || []).includes(m);
/** a locker / storage place counts as leaving the bag there */
const implicitBagDrop = (it: Item) => it.kind === 'place' && !!it.drop;

/** every mark warning of the trip ("day:uid" → warnings), and whether a tax refund should be planned */
export function warnings(): { W: Map<string, string[]>; needTax: boolean } {
  const W = new Map<string, string[]>(), add = (d: number, uid: string, w: string) => { const k = d + ':' + uid; (W.get(k) || W.set(k, []).get(k)!).push(w) };
  const open: Record<string, { d: number; uid: string; ll: any; name: string }[]> = { bag: [], wait: [], order: [], rent: [], ship: [] }; let cashOk = false; const shops: Item[] = []; let tax = false;
  days.state.days.forEach((_, d) => days.dayItems(d).forEach(it => {
    const mk = it.marks = marksOf(it);
    if (mk.includes('cash')) cashOk = true;
    if (mk.includes('tax')) tax = true;
    if (it.kind === 'place' && it.p.cash && !cashOk) add(d, it.uid, '현금만 받는 곳일 수 있어요 · 먼저 💴 현금 준비 표시를 붙여 두세요');
    if (it.kind === 'place' && it.p.cat === 'shop') shops.push(it);
    if (open.bag.length && it.kind === 'fixed' && (it.uid === 'f7' || /^ci|^co/.test(it.uid))) add(d, it.uid, `${open.bag[0].name}에 맡긴 짐을 먼저 찾아야 해요`);
    for (const T of Object.keys(PAIRS)) {
      const st = mk.includes(T + '+') || (T === 'bag' && implicitBagDrop(it)), en = mk.includes(T + '-');
      if (en) { const o = open[T].shift();
        if (!o) add(d, it.uid, PAIRS[T].orphan);
        else { if (PAIRS[T].same && km(o.ll, it.ll) > 0.4) add(d, it.uid, `${o.name}과 장소가 달라요 · 맡긴 곳으로 가야 해요`);
          if (PAIRS[T].sameDay && o.d !== d) add(d, it.uid, '웨이팅은 등록한 날 입장해야 해요') } }
      if (st) open[T].push({ d, uid: it.uid, ll: it.ll, name: it.name });
    }
  }));
  for (const T of Object.keys(open)) open[T].forEach(o => add(o.d, o.uid, PAIRS[T].need));
  return { W, needTax: !!(places.state.pack!.intl && shops.length && !tax) };
}

/** which pairs start at this block (on day d) and still miss their end */
export function openPairOf(it: Item, d: number): string[] {
  const { W } = warnings(); const ws = W.get(d + ':' + it.uid) || [];
  return Object.keys(PAIRS).filter(T => ws.includes(PAIRS[T].need) && (hasMark(it, T + '+') || (T === 'bag' && implicitBagDrop(it))));
}

/** the 할 일 표시 box of a block's sheet (BlockSheet.tsx) */
export function info(it: Item, forceOpen: boolean, d: number) {
  const mk: string[] = it.marks || []; const pend = openPairOf(it, d);
  const row = (a: string, b?: string) => ({ icon: MARKS[a][0], btns: [a, ...(b ? [b] : [])].map(m => ({ m, label: MARKS[m][1], on: mk.includes(m) })) });
  const nb = places.P.filter(p => p.drop && km(p.ll, it.ll) < 1.2).map(p => ({ p, d: km(p.ll, it.ll) })).sort((a, b) => a.d - b.d).slice(0, 2);
  return { open: !!(mk.length || pend.length || forceOpen), summary: `할 일 표시${mk.length ? ` · ${mk.map(m => MARKS[m][0] + ' ' + MARKS[m][1]).join(', ')}` : ''}`,
    rows: [row('bag+', 'bag-'), row('wait+', 'wait-'), row('order+', 'order-'), row('rent+', 'rent-'), row('ship+', 'ship-'), row('cash', 'tax')],
    bagHint: nb.length ? `근처 짐 보관: ${nb.map(x => `${x.p.name} (${x.d < 0.1 ? '바로 옆' : Math.round(x.d * 1000) + 'm'})`).join(', ')}` : '',
    pairs: pend.map(T => ({ T, label: `${MARKS[T + '-'][0]} ${PAIRS[T].pair} 블록 만들기` })) };
}

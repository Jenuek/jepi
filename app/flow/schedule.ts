// What happens on the 일정표 and around it: a block's sheet (move, longer, delete, swap, 할 일 표시, 집 출발), an empty
// time (fill it or put the picked card there), the day buttons, 간식비, drag & drop, the day's summary chips, 준비하기
// (tick, go to a warning, reset), the AI box (stop, close, put one in), 취향 키워드, day titles and handwritten memos.
// (It used to be blockAct / gridAct / checksAct … in src/js/380-events.js, 382-tidy.js, 389-titles.js and 389b-memo.js.)
// What the old code still does is passed in once with connect() (Legacy).
import * as trip from '../data/trip';
import * as places from '../data/places';
import * as check from '../data/check';
import { state as DY, dayStart, buildDays } from '../data/days';
import { heads, yen } from '../data/traveler';
import * as memo from '../logic/memo';
import { fmt, durTxt } from '../logic/time';
import { ui } from '../ui/state';
import * as R from './render';

/** what the old code still does */
export interface Legacy {
  hero(p: any): void;
  /** 🎲 from this empty time */
  diceFrom(t: number): void;
  openCustom(id: string | null, start: number | null): void;
  makePairBlock(uid: string, kind: string): void;
  genSeason(statusId: string): void;
  /** hand every warning to the AI chat */
  fixWarns(): void;
}
let L: Legacy;
export function connect(l: Legacy): void { L = l }

const $ = (s: string) => document.querySelector(s) as HTMLElement;
const mount = (name: string, el: Element, props: any) => (window.JEPI_UI.mount as any)(name, el, props);
const CUR = trip.cur as any, PK = places.state as any, D_ = DY as any;
const keep = (d: number, m: number) => Math.max(dayStart(d), Math.min(1410, m));

/** pressed in a block's sheet (BlockSheet.tsx; the sheet's block is #sheet's uid). Only changes that move the block redraw
 *  the sheet: tapping an input (memo, …) keeps the keyboard. */
export function blockAct(n: string, v: string, o?: any): void {
  o = o || {}; const uid = $('#sheet').dataset.uid || '', b = CUR.placed.find((x: any) => x.uid === uid);
  switch (n) {
    case 'fill': R.place(v, +o.start); R.closeSheet(); R.renderAll(); return;          // an empty time: put this place there
    case 'dicefrom': L.diceFrom(+v); return;
    case 'totray': R.closeSheet(); ui.tab = 'tray'; R.renderTabs(); return;
    case 'newcustom': L.openCustom(null, +v); return;
    case 'editcustom': L.openCustom(v, null); return;
    case 'swap': if (b) { trip.blocks.change(uid, { id: v, start: +o.start, dur: +o.dur }); R.renderAll(); R.openSheet(uid) } return;
    case 'mark': trip.toggleMark(uid, v); R.renderAll(); R.openSheet(uid, { marksOpen: true }); return;
    case 'pairblock': L.makePairBlock(uid, v); return;
    case 'home': CUR.profile.home.min = Math.max(10, Math.min(240, (+CUR.profile.home.min || 60) + +v)); trip.save('profile', CUR.profile); buildDays(); R.renderAll(); R.openSheet('f0a'); return;
  }
  if (!b) return;
  if (n === 'mv') { trip.blocks.change(uid, { start: keep(ui.day, b.start + +v) }); R.renderAll(); R.openSheet(uid); return }
  if (n === 'du') { trip.blocks.change(uid, { dur: Math.max(30, Math.min(720, b.dur + +v)) }); R.renderAll(); R.openSheet(uid); return }
  if (n === 'del') { trip.blocks.remove(uid); R.closeSheet(); R.renderAll(); return }
}
/** 준비하기 (Checks.tsx): a tick, a warning (go to its block), 경고 해결, 시즌 정보, 모두 지우기 (asks once more) */
export function checksAct(n: string, v: string, o?: any): void {
  switch (n) {
    case 'ck': trip.tick(v, !!o); R.renderChecks(); return;
    case 'goto': { const [d, u] = String(v).split('~'); ui.day = +d; ui.tab = 'timeline'; R.renderAll(); R.openSheet(u); return }
    case 'fix': L.fixWarns(); return;
    case 'season': L.genSeason('st_season'); return;
    case 'reset': if (!ui.resetArm) { ui.resetArm = true; R.renderChecks(); return }
      ui.resetArm = false; CUR.fmarks = {}; trip.save('fmarks', CUR.fmarks); CUR.placed = []; trip.blocks.saved(); R.renderAll(); return;
  }
}
/** ✨ 빈 시간 채우기 results (AiBox.tsx): stop, close, put one in */
export function aiboxAct(n: string, v: string): void {
  const st = ui.aiState;
  if (n === 'stop') { st?.ctl?.abort(); return }
  if (n === 'close') { ui.aiState = null; R.renderAI(); return }
  if (n === 'acc' && st?.items) { const x = st.items[+v]; if (x && !x.added) { R.place(x.id, x.start); x.added = true; R.renderAll() } }
}
/** pressed in the 일정표 and around it (DayGrid.tsx slots and blocks, the Day buttons, 간식비 −/+) */
export function gridAct(n: string, v: string): void {
  switch (n) {
    case 'day': ui.day = +v; R.renderAll(); return;
    case 'slot': if (!ui.selected) { R.openFill(+v); return } R.place(ui.selected, +v); ui.selected = null; R.renderAll(); return;   // an empty time: fill it, or put the chosen card there
    case 'blk': R.openSheet(v); return;
    case 'meal': trip.setMeal(ui.day, Math.max(0, Math.min((PK.pack.snack || 1000) * 20, check.mealOf(ui.day) + +v))); R.renderBudget(); return;
  }
}
/** 취향 키워드 (TasteKeywords.tsx, and the chips in 처음 설정): toggle returns whether the keyword is on now */
export function kwAct(n: string, v: string): boolean | void {
  switch (n) {
    case 'toggle': { const on = trip.keywords.toggle(v); R.renderPref(); return on }
    case 'del': trip.keywords.remove(+v); R.saveKw(); return;
    case 'add': if (trip.keywords.add(v)) R.saveKw(); return;   // a suggestion, or what was typed
    case 'reset': CUR.kws = []; R.saveKw(); return;
  }
}
/** drag & drop (desktop): app/ui/drag.ts marks the slot and works out the time; a new card or a moved block lands here */
export function dropped(kind: string, id: string, m: number): void {
  if (kind === 'new') R.place(id, m); else if (trip.blocks.find(id)) trip.blocks.change(id, { start: keep(ui.day, m) });
  ui.selected = null; R.renderAll();
}

// ---------- the day's summary: one line of chips (이동 · 비용 · 확인할 것 · 빈 시간 · 더 정확하게); each opens its part ----------
let sumOpen: string | null = null;
export function renderDaySum(items: any[], trans: any[], gaps: any[]): void {
  const box = $('#daySum'); if (!box) return;
  const total = trans.reduce((a, t) => a + t.min, 0), c = check.dayCost(ui.day) as any, warns = items.filter(i => i.warns.length);
  const nudge = ($('#nudges') && ($('#nudges').textContent || '').trim()) ? 1 : 0;
  // drawn by React: app/screens/DayTop.tsx
  const chip = (k: string, t: string, warn?: boolean) => ({ k, t, warn: !!warn, open: sumOpen === k });
  mount('daySum', box, { chips: [chip('route', `이동 ${durTxt(total)}`), chip('budget', `${heads() > 1 ? '1인 ' : ''}${yen(c.yen)}`),
    ...(warns.length ? [chip('warn', `확인할 것 ${warns.reduce((a, i) => a + i.warns.length, 0)}`, true)] : []), ...(gaps.length ? [chip('gap', `빈 시간 ${gaps.length}`)] : []), ...(nudge ? [chip('nudge', '💡 더 정확하게')] : [])] });
  if (sumOpen === 'warn' && !warns.length || sumOpen === 'gap' && !gaps.length || sumOpen === 'nudge' && !nudge) sumOpen = null;
  const P0 = $('#panel-timeline'); ['route', 'budget', 'nudge'].forEach(k => P0.classList.toggle('sum-' + k, sumOpen === k));
  if (sumOpen === 'budget' && $('#budgetBox')) ($('#budgetBox') as HTMLDetailsElement).open = true;
  const body = $('#sumBody');
  const sw = sumOpen === 'warn' ? warns.map(i => ({ uid: String(i.uid), time: fmt(i.start), name: String(i.name), warn: String(i.warns[0]) })) : [];
  const sg = sumOpen === 'gap' ? gaps.map(g => ({ range: `${fmt(g[0])}–${fmt(g[1])}`, find: ui.sample && !PK.pack.manual ? `${g[0]}-${g[1]}` : null })) : [];
  mount('sumBody', body, { warns: sw, gaps: sg });
  body.hidden = !(sw.length || sg.length);
}
/** the day's summary chips (DayTop.tsx DaySum / SumBody): a chip opens its list, a warning row opens its block */
export function sumAct(n: string, v: string): void {
  if (n === 'uid') { R.openSheet(v); return }
  if (n === 'chip') { sumOpen = sumOpen === v ? null : v; R.renderTimeline() }
}

// ---------- day titles the traveler can rename, and handwritten memos (rules: app/logic/memo.ts) ----------
/** profile.dayTitles[d], or the automatic "Day 1 · 도착" */
export const dayTitleOf = (d: number): string => memo.dayTitle(CUR.profile, d, (D_.days[d] || {}).title || '');
export const memoKey = (it: any, d: number): string => memo.blockKey(it.id, d);
export const blockMemoOf = (it: any, d: number): string => memo.blockMemo(CUR.profile, memoKey(it, d));
export const dayMemoOf = (d: number): string => memo.dayMemo(CUR.profile, d);
export function renderDayMemo(): void { const m = dayMemoOf(ui.day); L.hero({ memo: m ? `“${m}”` : '' }) }
let dayTitleRev = 0;
/** the ✎ form (DayTitleForm.tsx saves itself); here: the header around it */
export function titleEditing(on: boolean): void {
  L.hero({ editing: on, slot: true });
  mount('dayTitle', $('#dayTitleSlot'), { open: on, day: ui.day, title: memo.ownDayTitle(CUR.profile, ui.day), auto: String(D_.days[ui.day].title || ''), memo: dayMemoOf(ui.day), rev: ++dayTitleRev });
}

// Drawing the trip's screens: the 일정표 (day buttons, blocks, route line, budget), the 장소 tab, 준비하기, the bottom
// tabs, the "넣을 시간을 탭하세요" banner, the AI check box, 취향 키워드, and the block / empty-time sheets. Each one
// works out its props (app/view/*.ts) and mounts its React screen. (It used to be src/js/340-render.js and 350-actions.js.)
// What other parts of the old code still draw or know is passed in once with connect() (Legacy).
import * as trip from '../data/trip';
import * as places from '../data/places';
import * as check from '../data/check';
import * as recs from '../data/recs';
import * as marks from '../data/marks';
import * as storage from '../data/storage';
import { syncSoon } from '../data/sync';
import { state as DY, dayStart } from '../data/days';
import { fmt } from '../logic/time';
import { norm } from '../logic/places';
import { ui } from '../ui/state';
import * as dayView from '../view/day';
import * as trayView from '../view/tray';
import * as sheetView from '../view/sheet';

/** what the old code (src/js) still draws or knows */
export interface Legacy {
  hero(p: any): void;
  dayTitleOf(d: number): string;
  /** what features add to a block (badges), a place card and a block sheet (007-panels.js) */
  badges(it: any, d: number): any[];
  cardExtras(p: any): any[];
  sheetExtras(it: any, d: number): any[];
  blockMemoOf(it: any, d: number): any;
  renderDaySum(items: any[], trans: any[], gaps: any[]): void;
  renderPView(): void;
  recsMaybe(): void;
  openFind(o: any): void;
  /** the places the AI just found (✨) */
  fresh(): Set<string>;
  curShared(): any;
  dupInfo(): any[];
  dock(p: any): void;
  seasonInfo(): any;
  fabDodge(): void;
  /** the extra side panels' names (007-panels.js PANELS) */
  panels(): string[];
  diceCloseAnim(): boolean;
  /** the rest of renderAll */
  touchPlan(): void; renderMeta(): void; renderNudges(): void; renderChat(): void; renderExt(): void; renderLook(): void;
}
let L: Legacy;
export function connect(l: Legacy): void { L = l }

const $ = (s: string) => document.querySelector(s) as HTMLElement;
const mount = (name: string, el: Element, props: any) => (window.JEPI_UI.mount as any)(name, el, props);
const CUR = trip.cur as any, PK = places.state as any, D_ = DY as any;
const WD = ['일', '월', '화', '수', '목', '금', '토'];
let gridRev = 0, trayRev = 0, checksRev = 0, sheetRev = 0, aiBoxRev = 0;
/** the next sheet redraw number (a new number = draw it fresh) */
export const nextSheetRev = (): number => ++sheetRev;

export function renderDays(): void { mount('days', $('#days'), dayView.dayButtons(ui.day)) }
/** time spacing: 60 or 100 px an hour */
export function setZoom(h: number, quiet?: boolean): void {
  h = h === 100 ? 100 : 60; document.documentElement.style.setProperty('--hour', h + 'px');
  document.querySelectorAll<HTMLElement>('[data-zoom]').forEach(b => b.setAttribute('aria-pressed', String(+(b.dataset.zoom || 0) === h)));
  if (!quiet) { storage.set('gp.zoom', h); renderTimeline() }
}
export function renderTimeline(): void {
  const D = D_.days[ui.day]; L.hero({ title: L.dayTitleOf(ui.day) });
  const H = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hour')) || 60;
  // drawn by React: app/screens/DayGrid.tsx (its props: app/view/day.ts); badges and memos come from the features that add them
  const T = dayView.timeline(ui.day, H, { badges: (it: any) => L.badges(it, ui.day), memo: (it: any) => L.blockMemoOf(it, ui.day) }) as any;
  L.hero({ sub: `${D.date} (${WD[D.wd]})` }); L.renderDaySum(T.items, T.trans, check.gapsOf(ui.day));
  const grid = $('#grid');
  mount('grid', grid, { ...T.grid, rev: ++gridRev });
  grid.style.height = T.height + 'px';
  mount('route', $('#route'), dayView.route(ui.day, T.items, T.trans));
  renderBudget();
  L.renderPView();
}
export function renderBudget(): void { const B = dayView.budget(ui.day); mount('budgetSum', $('#budgetSum'), B.sum); mount('budget', $('#budget'), B.box) }
// the top of the 장소 tab is drawn by React (app/screens/Tops.tsx); #filters and #cards inside it get their own screens
export function drawTrayTop(): void { mount('trayTop', $('#trayTopMount'), { moreHidden: !ui.sample || !!PK.pack.manual, rec: recs.statusText(PK.pack.city || ''), group: ui.group }) }
/** pressed in the 장소 tab's top */
export function trayAct(n: string, v: string): void {
  if (n === 'group') { ui.group = v; renderTray() }
  else if (n === 'open') renderTray();
  else if (n === 'more') L.openFind({ where: 'city', into: 'list', q: v, autorun: true });
}
export function renderTray(): void {
  L.recsMaybe(); drawTrayTop();
  // drawn by React: app/screens/Tray.tsx (its props: app/view/tray.ts)
  const V = trayView.tray({ day: ui.day, cat: ui.cat, group: ui.group, zoneOpen: ui.zoneOpen, openOnly: ($('#openOnly') as HTMLInputElement).checked, selected: ui.selected, pmode: ui.jp === 'P', ai: !!ui.sample, manual: !!PK.pack.manual,
    fresh: L.fresh(), shared: !!L.curShared(), dups: L.dupInfo(), extras: (p: any) => L.cardExtras(p) } as any) as any;
  mount('trayFilters', $('#filters'), { ...V.filters, rev: ++trayRev });
  mount('trayCards', $('#cards'), { ...V.cards, rev: ++trayRev });
}
/** an empty time in the 일정표 was tapped: places that fit there (BlockSheet.tsx FillSheet; props: app/view/tray.ts) */
export function openFill(t: number): void {
  mount('fill', $('#sheet'), { rev: ++sheetRev, ...trayView.fill(ui.day, t) });
  $('#sheet').dataset.uid = ''; $('#sheetBg').hidden = false;
  setTimeout(() => { const b = $('#sheet button'); b && b.focus() }, 0);
}
export const ckInfo = (id: string, t: unknown, sub?: string) => ({ id, t: String(t), sub, on: !!CUR.done[id] });
export function renderChecks(): void {
  const warnRows: any[] = [], prepRows: any[] = [];
  D_.days.forEach((_: any, i: number) => { const { items } = check.analyze(i) as any;
    items.forEach((it: any) => { it.warns.forEach((w: string) => warnRows.push({ d: i, uid: it.uid, t: `${it.name}: ${w}` }));
      if (it.kind === 'place' && it.p.check) prepRows.push({ id: 'p-' + it.id, d: i, t: it.p.check, s: it.name });
      if (it.kind === 'place' && it.p.verify) prepRows.push({ id: 'v-' + it.id, d: i, t: `${it.p.verify} 확인`, s: it.name }); });
  });
  if (marks.warnings().needTax) prepRows.push({ id: 'tax-' + recs.cityKey(PK.pack.city || ''), d: D_.days.length - 1, t: '쇼핑 일정이 있어요 · 면세 환급을 어디서 할지 🧾 표시를 붙여 두세요', s: '매장 또는 출국 공항' });
  tabs({ warn: warnRows.length ? String(warnRows.length) : '' }); $('#warnCount2').textContent = warnRows.length ? ' ' + warnRows.length : '';
  L.dock({ fixHidden: !(warnRows.length && ui.sample), fixText: `🛠 경고 ${warnRows.length}개 해결` });
  // drawn by React: app/screens/Checks.tsx
  mount('checks', $('#checks'), { ai: !!ui.sample, warns: warnRows.map(r => ({ d: r.d, uid: String(r.uid), t: r.t })), prep: prepRows.map(r => ckInfo(r.id, r.t, `Day ${r.d + 1} · ${r.s}`)),
    season: L.seasonInfo(), all: (places.STATIC_CHECKS as any[]).map(s => ckInfo(s.id, s.t)), resetArm: !!ui.resetArm, rev: ++checksRev });
}
// the bottom tabs are drawn by React (app/screens/Bars.tsx); tabs({…}) changes some of it and draws again
let tabsView: any = { shown: 'timeline', warn: '' };
export function tabs(p: any): void { tabsView = { ...tabsView, ...p }; mount('tabs', $('#tabsMount'), tabsView) }
export function renderTabs(): void {
  setTimeout(() => L.fabDodge(), 0);   // the 🎲 button shows on every tab (300-intro-header.js fabDodge)
  const wide = matchMedia('(min-width:900px)').matches, tab = ui.tab;
  const grp: Record<string, string> = { check: 'more', pref: 'more', me: 'more', plans: 'more', settings: 'more' }; L.panels().forEach(k => grp[k] = 'more');
  const shown = wide && tab === 'timeline' ? 'tray' : (grp[tab] || tab);
  tabs({ shown });
  document.body.dataset.tab = grp[tab] || tab;
  $('#panel-timeline').hidden = !wide && tab !== 'timeline';
  $('#panel-side').hidden = !wide && tab === 'timeline';
  const sides = ['tray', 'check', 'pref', 'me', 'more', 'plans', 'settings', 'map', ...L.panels()];
  const sideTab = sides.includes(tab) && tab !== 'tray' ? tab : 'tray';
  sides.forEach(k => { const el = $('#side-' + k); if (el) el.hidden = sideTab !== k });
}
// the banner is drawn by React (app/screens/Frames.tsx); it keeps its last text while hidden
let bannerView = { open: false, text: '' };
export function drawBanner(): void { mount('banner', $('#bannerMount'), bannerView) }
export function renderBanner(): void {
  document.body.classList.toggle('placing', !!ui.selected);
  if (ui.selected) { const p = (places.PM as any)[ui.selected]; bannerView = { open: true, text: `${p.name} (${p.dur}분) · 넣을 시간을 탭하세요` } } else bannerView = { ...bannerView, open: false };
  drawBanner();
}
export function renderAI(): void {
  const box = $('#aiBox'), st0 = ui.aiState; L.dock({ aiHidden: !ui.sample });
  if (!st0 || st0.day !== ui.day) { box.hidden = true; return }
  box.hidden = false;
  const PM = places.PM as any;
  // drawn by React: app/screens/AiBox.tsx
  const st = st0.status === 'loading' ? { s: 'loading' } : st0.status === 'error' ? { s: 'error', msg: String(st0.msg || '') }
    : { s: 'done', date: String(D_.days[ui.day].date), dropped: st0.dropped || 0, items: st0.items.map((x: any) => ({ time: `${fmt(x.start)}–${fmt(x.start + PM[x.id].dur)}`, name: String(PM[x.id].name), why: String(x.reason || ''), added: !!x.added })) };
  mount('aiBox', box, { state: st, rev: ++aiBoxRev });
}
// Drawn by React: app/screens/TasteKeywords.tsx
export function renderPref(): void {
  const box = $('#prefBox'); if (!box) return;
  const P = places.P as any[], tagsOf = places.tagsOf;
  const counts = (k: string) => P.filter(p => tagsOf(p.id).some(t => norm(t) === norm(k))).length;
  const known = [...new Set([...places.GENERIC_KW, ...(Object.values(places.TAGS) as string[][]).flat()])].filter(t => !CUR.kws.some((k: string) => norm(k) === norm(t)));
  mount('keywords', box, { kws: CUR.kws.map((k: string) => ({ k: String(k), n: counts(k) })), known: known.map(String) });
}
/** the keywords changed: save, sync soon, redraw */
export function saveKw(): void { trip.kws.save(CUR.kws); storage.set('jepi.kwAt', Date.now()); syncSoon(); renderPref(); renderTray() }
export function renderAll(): void {
  L.touchPlan(); L.renderMeta(); L.renderNudges(); renderDays(); renderTimeline(); renderTray(); renderChecks(); renderPref(); renderTabs(); renderBanner(); renderAI(); L.renderChat(); L.renderExt(); L.renderLook();
}

/** put a place in the 일정표 at a time (kept inside the day) */
export function place(id: string, start: number, d: number = ui.day): void {
  const p = (places.PM as any)[id]; start = Math.max(dayStart(d), Math.min(1410, start));
  trip.blocks.add({ id, day: d, start, dur: p.dur } as any);
}
/** a block's sheet (BlockSheet.tsx; props: app/view/sheet.ts). opt.marksOpen: keep the 할 일 표시 box open */
export function openSheet(uid: string, opt?: { marksOpen?: boolean }): void {
  const v = sheetView.blockSheet(ui.day, uid, !!(opt && opt.marksOpen), (it: any) => L.sheetExtras(it, ui.day)); if (!v) return;
  mount('block', $('#sheet'), { rev: ++sheetRev, ...v });
  $('#sheet').dataset.uid = uid; $('#sheetBg').hidden = false;
  setTimeout(() => { const b = $('#sheet button'); b && b.focus() }, 0);
}
export const closeSheet = (): void => { if (L.diceCloseAnim()) return; $('#sheetBg').hidden = true };

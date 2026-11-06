// Drag & drop on a computer: a place card (장소 탭) or a block onto the 일정표 (#grid). The card / block starts the drag
// (Tray.tsx, DayGrid.tsx); this marks the time slot under the pointer and works out the time where it was dropped;
// putting it there is the old code's (app().dropped). It used to be at the end of src/js/380-events.js.
import { dayStart } from '../data/days';
import { liveOf } from './live';
import { app } from './host';

type Drag = { type: 'new'; id: string } | { type: 'move'; uid: string };
let drag: Drag | null = null;

/** a card (new place) or a block (move it) starts being dragged */
export function start(e: { dataTransfer: DataTransfer | null }, d: Drag): void {
  drag = d;
  try { e.dataTransfer!.setData('text/plain', 'x'); e.dataTransfer!.effectAllowed = 'move' } catch { /* some browsers */ }
}
// the slot under a dragged card (React draws the slots: marked through their handle)
const mark = (el: Element, on: boolean) => { const h = liveOf(el); if (h) h.cls('drop', on); else el.classList.toggle('drop', on) };
const unmarkAll = (except?: Element) => document.querySelectorAll('.slot.drop').forEach(x => { if (x !== except) mark(x, false) });

/** listen on the 일정표 (once, at start-up) */
export function connectGrid(grid: HTMLElement): void {
  document.addEventListener('dragend', () => { drag = null; unmarkAll() });
  grid.addEventListener('dragover', e => {
    if (!drag) return; e.preventDefault();
    const s = document.elementsFromPoint(e.clientX, e.clientY).find(el => el.classList && el.classList.contains('slot'));
    unmarkAll(s); if (s && !s.classList.contains('drop')) mark(s, true);
  });
  grid.addEventListener('drop', e => {
    if (!drag) return; e.preventDefault();
    const H = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hour')) || 60;
    const r = grid.getBoundingClientRect(), m = dayStart(app().day()) + Math.floor(((e.clientY - r.top) / H * 60) / 30) * 30;
    const d = drag; drag = null;
    app().dropped(d.type, d.type === 'new' ? d.id : d.uid, m);
  });
}

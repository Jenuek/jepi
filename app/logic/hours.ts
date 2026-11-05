// 영업시간: Google's opening hours → this app's shape (it used to be hoursFromGoogle / hoursApply in src/js/383-hours.js).
//   hours: [open, close] minutes for most days · hoursBy: {weekday: [open, close]} for days that differ · closed: weekdays
export interface Hours { always?: boolean; gone?: boolean; miss?: boolean; hours?: [number, number]; hoursBy?: Record<number, [number, number]>; closed?: number[] }
interface GPeriod { open?: { day: number; hour: number; minute?: number }; close?: { day: number; hour: number; minute?: number } }

export function fromGoogle(oh: { periods?: GPeriod[] } | null | undefined): Hours | null {
  const per = (oh && oh.periods) || []; if (!per.length) return null;
  if (per.length === 1 && per[0].open && !per[0].close) return { always: true };
  const byDay: Record<number, [number, number]> = {};
  per.forEach(x => {
    if (!x.open) return; const d = x.open.day, o = x.open.hour * 60 + (x.open.minute || 0);
    let c = x.close ? x.close.hour * 60 + (x.close.minute || 0) : 1440; if (x.close && x.close.day !== d) c = 1440; if (c <= o) c = 1440;
    const cur = byDay[d]; byDay[d] = cur ? [Math.min(cur[0], o), Math.max(cur[1], c)] : [o, c];
  });
  const days = Object.keys(byDay).map(Number); if (!days.length) return null;
  const count: Record<string, number> = {}; days.forEach(d => { const k = byDay[d].join('-'); count[k] = (count[k] || 0) + 1 });
  const base = Object.entries(count).sort((a, b) => b[1] - a[1])[0][0].split('-').map(Number) as [number, number];
  const hoursBy: Record<number, [number, number]> = {}; days.forEach(d => { if (byDay[d].join('-') !== base.join('-')) hoursBy[d] = byDay[d] });
  return { hours: base, hoursBy: Object.keys(hoursBy).length ? hoursBy : undefined, closed: [0, 1, 2, 3, 4, 5, 6].filter(d => !(d in byDay)) };
}

/** put looked-up hours on a place; false when there was nothing to put */
export function apply(p: Record<string, any>, h: Hours | null | undefined): boolean {
  if (!h) return false;
  if (h.gone) { p.gone = true; return true }
  if (h.always) { p.always = true; p.hours = undefined } else { p.always = false; p.hours = h.hours; p.hoursBy = h.hoursBy; p.closed = h.closed || [] }
  p.hsrc = 'google'; if (p.verify === '영업시간') p.verify = undefined;
  return true;
}

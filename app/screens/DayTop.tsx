// 일정표 위쪽: 날짜 버튼(#days), 요약 줄(#daySum)과 펼친 내용(#sumBody), 하루 동선(#route), 예산(#budgetSum, #budget).
// They used to be renderDays / renderDaySum / renderRoute / renderBudget (340-render.js, 382-tidy.js). The boxes themselves
// stay in body.html; the old code still opens/closes them (hidden, the panel's sum-… class) and works out every number.
import { Fragment } from 'react';
import { app } from '../ui/host';

/** a line of text with bold/colored parts and links. The old code merges neighbouring text, so each string is one text piece. */
export type Seg = string | { t: string; tag: 'b' | 'span'; cls?: string; color?: string } | { t: string; tag: 'a'; href: string };
export const Line = ({ segs }: { segs: Seg[] }) => <>{segs.map((s, i) => typeof s === 'string'
  ? <Fragment key={i}>{s}</Fragment>
  : s.tag === 'a' ? <a key={i} href={s.href} target="_blank" rel="noopener">{s.t}</a>
  : s.tag === 'b' ? <b key={i} className={s.cls} style={s.color ? { color: s.color } : undefined}>{s.t}</b>
  : <span key={i} className={s.cls} style={s.color ? { color: s.color } : undefined}>{s.t}</span>)}</>;

export interface DaysProps { days: { date: string; label: string; on: boolean }[] }
export function DayButtons({ days }: DaysProps) {
  return <>{days.map((d, i) => <button key={i} className="day-btn" data-day={i} aria-pressed={d.on} onClick={() => app().grid('day', String(i))}><b>{d.date}</b><span>{d.label}</span></button>)}</>;
}

export interface DaySumProps {
  chips: { k: string; t: string; warn: boolean; open: boolean }[];
}
export function DaySum({ chips }: DaySumProps) {
  return <>{chips.map(c => <button key={c.k} type="button" className={c.warn ? 'sum-chip warn' : 'sum-chip'} data-sum={c.k} aria-expanded={c.open}>{c.t}</button>)}</>;
}

export interface SumBodyProps {
  warns: { uid: string; time: string; name: string; warn: string }[];
  gaps: { range: string; find: string | null }[];
}
export function SumBody({ warns, gaps }: SumBodyProps) {
  return <>
    {warns.map(w => <button key={w.uid} type="button" className="sum-row warn" data-sumuid={w.uid}><b className="mono">{w.time}</b>{` ${w.name}`}<span>{w.warn}</span></button>)}
    {gaps.map((g, i) => <div key={i} className="sum-row"><b className="mono">{g.range}</b> 비어 있어요{g.find && <button type="button" className="small-btn" data-findgap={g.find}>채울 곳 찾기</button>}</div>)}
  </>;
}

export interface RouteProps { stops: string[]; total: string; back: string }
export function Route({ stops, total, back }: RouteProps) {
  return <>
    {stops.map((a, i) => <Fragment key={i}>{i > 0 && <span className="ln" aria-hidden="true" />}<span className="st"><i aria-hidden="true" />{a}</span></Fragment>)}
    <div className="sum mono">{`이동 합계 약 ${total}${back ? ' · ' : ''}`}{back && <b>{`${back} 쪽을 두 번 오가요`}</b>}</div>
  </>;
}

export interface BudgetSumProps { segs: Seg[] }
export function BudgetSum({ segs }: BudgetSumProps) {
  return <><Line segs={segs} /><span className="more">자세히</span></>;
}

export interface BudgetProps {
  act: string; tr: string; meal: string; step: number; home: string;
  /** with a budget: the bar and the "하루 현지 예산" line */
  bar: null | { pct: number; over: boolean; line: Seg[] };
  totalLabel: string; total: string; totalSub: string;
  /** for a group: the 합계 line */
  group: Seg[] | null;
  trip: Seg[];
}
export function Budget(p: BudgetProps) {
  return <>
    <div className="bud-grid">
      <div><span>입장·식사·활동</span><b className="mono">{p.act}</b></div>
      <div><span>현지 교통</span><b className="mono">{p.tr}</b></div>
      <div><span>간식·기타</span><b className="mono">{p.meal}</b><span className="adj"><button className="small-btn" data-meal={String(-p.step)} aria-label="간식비 줄이기" onClick={() => app().grid('meal', String(-p.step))}>−</button><button className="small-btn" data-meal={String(p.step)} aria-label="간식비 늘리기" onClick={() => app().grid('meal', String(p.step))}>+</button></span></div>
      {p.home && <div><span>집 오가는 교통</span><b className="mono">{p.home}</b></div>}
    </div>
    {p.bar && <>
      <div className={p.bar.over ? 'bud-bar over' : 'bud-bar'}><i style={{ width: `${Math.min(100, p.bar.pct)}%` }} /></div>
      <div className="bud-trip"><Line segs={p.bar.line} /></div>
    </>}
    <div className="bud-total"><span>{p.totalLabel}</span><b className="mono">{p.total}</b><span className="mono">{p.totalSub}</span></div>
    {p.group && <div className="bud-trip"><Line segs={p.group} /></div>}
    <div className="bud-trip"><Line segs={p.trip} /></div>
  </>;
}

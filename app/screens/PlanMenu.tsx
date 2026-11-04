// 계획 바꾸기 drop-down under the trip name (#planMenu). It used to be planMenuHTML in src/js/300-intro-header.js.
// The old code opens/closes and places the menu (#planMenu is in body.html) and reads the clicks (data-pmopen / data-pmact).
import { Fragment, type CSSProperties } from 'react';

export interface PlanMenuProps {
  plans: { id: string; cur: boolean; past: boolean; color: string; coverSVG: string; dday: string; name: string; sub: string }[];
  rev: number;
}

export function PlanMenu({ plans, rev }: PlanMenuProps) {
  return <Fragment key={rev}>
    <div className="pm-list">{plans.length ? plans.map(p => (
      <button key={p.id} type="button" className={'pm-item pm-card' + (p.cur ? ' cur' : '') + (p.past ? ' past' : '')} style={{ '--theme': p.color } as CSSProperties} role="menuitemradio" aria-checked={p.cur} data-pmopen={p.id}>
        <span className="pm-art" aria-hidden="true" dangerouslySetInnerHTML={{ __html: p.coverSVG }} />
        {p.dday && <span className="pm-dday mono">{p.dday}</span>}
        <span className="pm-t"><b>{p.name}</b><small>{p.sub}</small></span>
        {p.cur && <span className="pm-ck" aria-hidden="true">✓</span>}
      </button>
    )) : <p className="hint">저장된 계획이 없어요.</p>}</div>
    <div className="pm-acts"><button type="button" className="small-btn primary" data-pmact="new">+ 새 계획</button><button type="button" className="small-btn" data-pmact="manage">계획 관리·공유</button></div>
  </Fragment>;
}

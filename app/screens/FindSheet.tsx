// 장소 찾기 sheet (it used to be renderFind in src/js/385-find.js). Opens in #sheet, which the block sheet
// uses too. Buttons keep their data-find / data-findr / id names and tell the old code through app().find, which
// asks the AI and places results.
// #findSt is the status line the old code writes into while searching; it starts empty on every full redraw (rev).
import { app } from '../ui/host';
export interface FindRow {
  id: string;
  name: string;
  meta: string;
  note: string;
  /** what was chosen: '' = not yet, 'skip' | 'list' | 'sched' | 'pick' */
  c: string;
  txt: string;
}

export interface FindSheetProps {
  dayNo: number;
  date: string;
  city: string;
  where: 'near' | 'area' | 'city' | string;
  area: string;
  areas: { k: string; label: string }[];
  when: 'gap' | 'any' | string;
  /** free gaps of the day: value "start-end" (minutes) and label "13:00–15:00" */
  gaps: { v: string; label: string }[];
  /** the chosen gap's value and label, or null */
  gap: { v: string; label: string } | null;
  into: 'sched' | 'list' | string;
  q: string;
  busy: boolean;
  /** P모드: "장소에만" keeps it as one of 내 카드 */
  mine?: boolean;
  rows: FindRow[];
  /** changes on every full redraw: the boxes and the status line start fresh, like before */
  rev: number;
}

function Seg({ k, v, cur, label }: { k: string; v: string; cur: string; label: string }) {
  return <button type="button" className="fchip" data-find={`${k}:${v}`} aria-pressed={cur === v} onClick={() => app().find('chip', `${k}:${v}`, (document.getElementById('findQ') as HTMLInputElement | null)?.value ?? null)}>{label}</button>;
}

function Row({ r, into, slot, mine }: { r: FindRow; into: string; slot: string; mine?: boolean }) {
  return (
    <div className={'cp' + (r.c === 'skip' ? ' off' : '')}>
      <div className="cp-t"><b>{r.name}</b>{r.meta && <small>{r.meta}</small>}{r.note && <p>{r.note}</p>}</div>
      {r.c ? <span className="cp-st">{r.txt}</span> : (
        <div className="cp-b">
          <button className={'small-btn' + (into === 'sched' ? ' primary' : '')} type="button" data-findr={`${r.id}:sched`} onClick={() => app().find('r', `${r.id}:sched`)}>{'일정에 넣기 ' + slot}</button>
          <button className={'small-btn' + (into === 'list' ? ' primary' : '')} type="button" data-findr={`${r.id}:list`} onClick={() => app().find('r', `${r.id}:list`)}>{mine ? '♥ 내 카드에 담기' : '장소에만'}</button>
          <button className="small-btn" type="button" data-findr={`${r.id}:skip`} onClick={() => app().find('r', `${r.id}:skip`)}>안 함</button>
        </div>
      )}
    </div>
  );
}

export function FindSheet(p: FindSheetProps) {
  const slot = p.when === 'gap' && p.gap ? '· 빈 시간에' : '· 시간 고르기';
  return (
    <>
      <h3>장소 찾기</h3>
      <div className="when">{`Day ${p.dayNo} · ${p.date}`}</div>
      <form id="findForm" className="find-form" key={p.rev} onSubmit={e => { e.preventDefault(); app().find('submit', '', (e.currentTarget.querySelector('#findQ') as HTMLInputElement | null)?.value || '') }}>
        <div className="find-g"><span className="hint">어디</span>
          <div className="seg">
            <Seg k="where" v="near" cur={p.where} label="오늘 일정 근처" />
            <Seg k="where" v="area" cur={p.where} label="동네 고르기" />
            <Seg k="where" v="city" cur={p.where} label={`${p.city} 전체`} />
          </div>
          {p.where === 'area' && <select id="findArea" aria-label="동네" defaultValue={p.area} onChange={e => app().find('area', e.currentTarget.value)}>{p.areas.map(a => <option key={a.k} value={a.k}>{a.label}</option>)}</select>}
        </div>
        <div className="find-g"><span className="hint">언제</span>
          <div className="seg">
            {p.gaps.length > 0 && <Seg k="when" v="gap" cur={p.when} label="빈 시간에" />}
            <Seg k="when" v="any" cur={p.when} label="아무 때나" />
          </div>
          {p.when === 'gap' && p.gaps.length > 1
            ? <select id="findGap" aria-label="빈 시간" onChange={e => app().find('gapsel', e.currentTarget.value)} defaultValue={p.gap ? p.gaps.find(g => g.v.split('-')[0] === p.gap!.v.split('-')[0])?.v : undefined}>{p.gaps.map(g => <option key={g.v} value={g.v}>{g.label}</option>)}</select>
            : p.when === 'gap' && p.gap ? <span className="hint mono">{p.gap.label}</span> : null}
        </div>
        <div className="find-g"><span className="hint">넣을 곳</span>
          <div className="seg">
            <Seg k="into" v="sched" cur={p.into} label="일정에" />
            <Seg k="into" v="list" cur={p.into} label={p.mine ? '내 카드에' : '장소에만'} />
          </div>
        </div>
        <input id="findQ" maxLength={60} defaultValue={p.q} placeholder="예) 카페, 비 오는 날 · 비워 두면 알아서" autoComplete="off" />
        <button className="small-btn primary" type="submit" id="findGo" disabled={p.busy}>{p.busy ? '찾는 중…' : '찾기'}</button>
      </form>
      <p className="ai-status" id="findSt" key={'st' + p.rev}></p>
      <div className="cps" id="findRes">{p.rows.map(r => <Row key={r.id} r={r} into={p.into} slot={slot} mine={p.mine} />)}</div>
      <div className="row"><button className="small-btn" type="button" data-close="1">닫기</button></div>
    </>
  );
}

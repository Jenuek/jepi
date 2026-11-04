// 🎲 DICE sheet (#sheet): 뭐 하지? / 뭐 먹지? It used to be renderEat (280-dice-eat.js), renderDoNear (290-dice-do.js)
// and renderDiceDo (160-modes-roll.js). The old code keeps the rolls and works out every piece; this draws the pieces
// in the same order and redraws fresh (rev). "AI가 새로 찾아서 굴리기" and its status line are Live (app/ui/live.tsx).
// Every button says what was pressed through app().dice(name, value) — the old code keeps the state and redraws.
// The 장소 찾기 sheet and the block sheet use the same #sheet (bridge.ts starts over when they swap).
import { Fragment, useEffect, useRef, type CSSProperties } from 'react';
import { app } from '../ui/host';
import { LiveButton, LiveLine } from '../ui/live';

type Opt = [value: string | number, label: string];

export interface Pills { attr: string; cur: string | number; opts: Opt[] }

/** a line in the 조건 box (or at the top of the plan view) */
export type DiceRow =
  | { r: 'hint'; t: string }
  | { r: 'pills'; p: Pills }
  | { r: 'setPlaces' }
  | { r: 'when'; later: boolean; at: string };

export type DiceStage =
  | { s: 'die'; face: string; spin?: boolean; hint?: string }
  | { s: 'planCard'; cat: string; name: string; line: string; note: string; tags: string[] | null }
  | { s: 'placeCard'; title: string; line: string; addr: string; foot: string }
  | { s: 'course'; head: string; items: { t: string; title: string; sub: string; url: string; name: string }[]; src: string };

export type DiceAct =
  | { a: 'btn'; cls: string; label: string; id?: string; data?: Record<string, string>; disabled?: boolean }
  | { a: 'link'; cls: string; label: string; href: string }
  | { a: 'status'; t: string };

export interface DiceProps {
  /** the "뭐 먹지" look (class dice eat) */
  eat: boolean;
  /** plan view: the "🎲 DICE · 날짜 빈 시간에서 굴려요" title (after the tabs) */
  head: string | null;
  tabs: null | 'do' | 'eat';
  bases: { attr: string; v: string; on: boolean; label: string; small: string }[] | null;
  picker: null | { /** put the cursor in the box (right after 🗺 동네 was chosen) */ focus?: boolean; hits: { name: string; addr: string }[]; recent: string[] };
  /** lines shown right away (plan view) */
  rows: DiceRow[];
  cond: null | { open: boolean; txt: string; rows: DiceRow[] };
  stage: DiceStage;
  msg: string;
  acts: DiceAct[];
  ai: null | { primary: boolean };
  foot: string | null;
  rev: number;
}

const go = (name: string, value = '', more?: Record<string, string>) => app().dice(name, value, more);

const PillRow = ({ p }: { p: Pills }) => (
  <div className="radio">{p.opts.map(([v, l]) => <button key={String(v)} type="button" {...{ ['data-' + p.attr]: String(v) }} aria-pressed={String(p.cur) === String(v)} onClick={() => go(p.attr, String(v))}>{l}</button>)}</div>
);

function Row({ x }: { x: DiceRow }) {
  switch (x.r) {
    case 'hint': return <span className="hint">{x.t}</span>;
    case 'pills': return <PillRow p={x.p} />;
    case 'setPlaces': return <button type="button" className="linkbtn" id="eatSetPlaces" onClick={() => go('eatSetPlaces')}>🏠 집·🏢 회사 등록해 두기</button>;
    case 'when': return (
      <div className="radio">
        <button type="button" data-dowhen="now" aria-pressed={!x.later} onClick={() => go('dowhen', 'now')}>지금</button>
        <button type="button" data-dowhen="later" aria-pressed={x.later} onClick={() => go('dowhen', 'later')}>이따</button>
        {x.later && <input type="time" id="doAt" defaultValue={x.at} aria-label="시작 시간" onChange={e => go('doAt', e.currentTarget.value)} />}
      </div>
    );
  }
}
const Rows = ({ rows }: { rows: DiceRow[] }) => <>{rows.map((x, i) => <Row key={i} x={x} />)}</>;

function Stage({ s }: { s: DiceStage }) {
  switch (s.s) {
    case 'die': return <><div className={s.spin ? 'die spin' : 'die'} aria-hidden="true">{s.face}</div>{s.hint && <p className="hint">{s.hint}</p>}</>;
    case 'planCard': return (
      <div className="dice-card" style={{ '--cc': `var(--c-${s.cat})` } as CSSProperties}>
        <b>{s.name}</b><span className="mono hint">{s.line}</span><p>{s.note}</p>
        {s.tags && <div className="tags">{s.tags.map((t, i) => <span key={i} className="tag">{t}</span>)}</div>}
      </div>
    );
    case 'placeCard': return (
      <div className="dice-card"><b>{s.title}</b><span className="mono hint">{s.line}</span>{s.addr && <p>{s.addr}</p>}<small className="hint">{s.foot}</small></div>
    );
    case 'course': return <>
      <p className="course-h">{s.head}</p>
      <ol className="course">{s.items.map((x, i) => (
        <li key={i}><span className="mono ct">{x.t}</span><div className="cm"><b>{x.title}</b><small>{x.sub}</small></div>
          <a className="small-btn" href={x.url} target="_blank" rel="noopener" aria-label={`${x.name} 지도`}>지도</a>
          <button className="small-btn" type="button" data-doreroll={i} aria-label="이 칸 다시 굴리기" onClick={() => go('doreroll', String(i))}>🎲</button></li>
      ))}</ol>
      <small className="hint">{s.src}</small>
    </>;
  }
}

function Act({ x }: { x: DiceAct }) {
  if (x.a === 'status') return <span className="ai-status">{x.t}</span>;
  if (x.a === 'link') return <a className={x.cls} href={x.href} target="_blank" rel="noopener">{x.label}</a>;
  const data = Object.fromEntries(Object.entries(x.data || {}).map(([k, v]) => ['data-' + k, v]));
  // named by its id, or by its first data-… (data-eatroll="again" → 'eatroll', 'again')
  const [name, value] = x.id ? [x.id, ''] : Object.entries(x.data || {})[0] || ['', ''];
  return <button type="button" className={x.cls} id={x.id} {...data} disabled={x.disabled} onClick={() => go(name, value, x.data)}>{x.label}</button>;
}

/** 🗺 동네: type a name, 찾기 (or Enter) */
function AreaPick({ pk }: { pk: NonNullable<DiceProps['picker']> }) {
  const q = useRef<HTMLInputElement>(null);
  useEffect(() => { if (pk.focus) setTimeout(() => q.current?.focus(), 50) }, []);
  const find = () => go('doAreaFind', q.current ? q.current.value : '');
  return (
    <div className="area-pick">
      <div className="kin"><input id="doAreaQ" ref={q} placeholder="동네·역 이름 (예: 강남역, 성수동, 해운대)" autoComplete="off" enterKeyHint="search" onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); find() } }} /><button className="small-btn primary" type="button" id="doAreaFind" onClick={find}>찾기</button></div>
      {pk.hits.length > 0 && (
        <div className="myp-hits">{pk.hits.map((h, i) => (
          <button key={i} className="mrow" type="button" data-doareapick={i} onClick={() => go('doareapick', String(i))}><span className="mt"><b>{h.name}</b><small>{h.addr}</small></span></button>
        ))}</div>
      )}
      {pk.recent.length > 0 && <><span className="hint">최근</span><PillRow p={{ attr: 'doarecent', cur: '', opts: pk.recent.map((n, i) => [i, n]) }} /></>}
    </div>
  );
}

export function Dice(p: DiceProps) {
  return (
    <div className={p.eat ? 'dice eat' : 'dice'} key={p.rev}>
      {p.tabs && (
        <div className="dice-tabs" role="tablist">
          <button type="button" role="tab" data-dicetab="do" aria-selected={p.tabs !== 'eat'} onClick={() => go('dicetab', 'do')}>🎲 뭐 하지?</button>
          <button type="button" role="tab" data-dicetab="eat" aria-selected={p.tabs === 'eat'} onClick={() => go('dicetab', 'eat')}>🍚 뭐 먹지?</button>
        </div>
      )}
      {p.bases && (
        <div className="eat-bases">{p.bases.map(b => (
          <button key={b.v} type="button" className="eat-base" {...{ ['data-' + b.attr]: b.v }} aria-pressed={b.on} onClick={() => go(b.attr, b.v)}>{b.label}<small>{b.small}</small></button>
        ))}</div>
      )}
      {p.picker && <AreaPick pk={p.picker} />}
      {p.head != null && <h3>🎲 DICE <span className="hint">{`· ${p.head} 빈 시간에서 굴려요`}</span></h3>}
      <Rows rows={p.rows} />
      {p.cond && (
        <details className="cond" open={p.cond.open} onToggle={e => go('cond', e.currentTarget.open ? '1' : '')}>
          <summary><span>{p.cond.txt}</span><span className="cond-e">조건 바꾸기</span></summary>
          <Rows rows={p.cond.rows} />
        </details>
      )}
      <div className="dice-stage"><Stage s={p.stage} /></div>
      {p.msg && <p className="hint" style={{ color: 'var(--warn)' }}>{p.msg}</p>}
      <div className="row dice-acts">{p.acts.map((x, i) => <Act key={i} x={x} />)}</div>
      {p.ai && <div className="row"><LiveButton className={p.ai.primary ? 'small-btn primary' : 'small-btn'} id="diceAI" onClick={() => go('diceAI')}>🔎 AI가 새로 찾아서 굴리기</LiveButton><LiveLine tag="span" id="st_dice" /></div>}
      {p.foot && <p className="hint">{p.foot}</p>}
      <div className="row"><button type="button" className="small-btn" data-close="1">닫기</button></div>
    </div>
  );
}

// 지도 아래 카드 (#mapCards): one per stop of the day (it used to be renderMapCards in 210-map.js)
export interface MapCardsProps {
  stops: { leg: string; name: string; time: string; nav: string }[];
  rev: number;
}
export function MapCards({ stops, rev }: MapCardsProps) {
  if (!stops.length) return <p className="hint" key={rev}>이 날은 아직 장소가 없어요.</p>;
  return (
    <Fragment key={rev}>{stops.map((s, i) => (
      <div className="mcard" data-mapi={i} key={i}>
        {s.leg && <div className="mleg mono">{s.leg}</div>}
        <b>{s.name}</b><small className="mono">{s.time}</small>
        {s.nav && <a className="small-btn" href={s.nav} target="_blank" rel="noopener">안내 시작</a>}
      </div>
    ))}</Fragment>
  );
}

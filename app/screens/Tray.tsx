// 장소 탭: the filter chips (#filters) and the place cards (#cards). They used to be renderTray / cardHTML / dupHTML
// in src/js (340-render.js, 388-dedup.js). The old code works out every card (tags, distance, hours) and redraws
// the whole list fresh (rev) after anything changes, like before. Buttons (♥ 👍 넣기 묶기, filters) say what was pressed
// through app().place(name, value); dragging a card onto the 일정표 starts here (app/ui/drag.ts).
// What other features add to a card (CARD_EXTRAS, e.g. 친구와 함께 "가고 싶어요") is drawn by Extras.tsx.
import { Fragment, type CSSProperties } from 'react';
import { Extras, type Extra } from './Extras';
import { LiveLine } from '../ui/live';
import { app } from '../ui/host';
import * as drag from '../ui/drag';

const go = (name: string, value: string) => app().place(name, value);

export interface Tag { c: string; t: string }

export interface PlaceCard {
  id: string; name: string; sub: string; cat: string;
  sel: boolean; off: boolean;
  dist: string;
  wish: boolean;
  /** 👍 여행자 추천 (null when recommendations are off) */
  vote: null | { on: boolean; n: number; locked: boolean };
  extras: Extra[];
  dur: number;
  key: Tag | null;
  det: Tag[];
}

export interface DupPair { a: string; b: string; why: string; aWho: string; aName: string; bWho: string; bName: string }

export interface CardGroup {
  /** a 동네 group (zone) or the "방금 찾은 곳" group (fresh), or a plain list */
  kind: 'zone' | 'fresh' | 'list';
  zone?: string; name?: string; open?: boolean; near?: boolean; note?: string;
  cards: PlaceCard[];
}

export interface TrayCardsProps {
  dups: DupPair[];
  /** how many are hidden because they are in the schedule */
  hidden: number;
  /** nothing left: this message */
  empty: string | null;
  groups: CardGroup[];
  /** P모드: the 장소 tab is where you collect 내 카드 (count, and whether the AI can suggest) */
  pmode?: { count: number; ai: boolean } | null;
  rev: number;
}

export interface TrayFiltersProps {
  chips: [k: string, label: string][];
  cats: [k: string, label: string][];
  cat: string;
  rev: number;
}

const T = ({ x }: { x: Tag }) => <span className={x.c}>{x.t}</span>;

function Card({ p, pm }: { p: PlaceCard; pm: boolean }) {
  return (
    <div className={'card' + (p.sel ? ' sel' : '') + (p.off ? ' off' : '') + (pm && p.wish ? ' mine' : '')} style={{ '--cc': `var(--c-${p.cat})` } as CSSProperties} draggable="true" data-id={p.id} onDragStart={e => drag.start(e, { type: 'new', id: p.id })}>
      <div className="nm">{p.name}</div>
      {pm
        ? <button className={p.wish ? 'small-btn wish-go on' : 'small-btn primary wish-go'} data-wish={p.id} aria-pressed={p.wish} onClick={() => go('wish', p.id)}>{p.wish ? '담았어요 ✓' : '♥ 담기'}</button>
        : <button className="small-btn primary" data-pick={p.id} onClick={() => go('pick', p.id)}>{p.sel ? '선택됨' : '넣기'}</button>}
      <div className="sub">{p.sub}</div>
      {p.dist && <div className="dist">{p.dist}</div>}
      <div className="tags">
        {pm ? <button className="t-link" data-ppick={p.id} onClick={() => go('ppick', p.id)}>일정에 바로 넣기</button>
          : <button className="vote" data-wish={p.id} aria-pressed={p.wish} aria-label="가고 싶어요" onClick={() => go('wish', p.id)}>{p.wish ? '♥' : '♡'}</button>}
        {p.vote && <button className="vote" data-vote={p.id} aria-pressed={p.vote.on} aria-label="추천하기" disabled={p.vote.locked} onClick={() => go('vote', p.id)}>{`👍 ${p.vote.n}`}</button>}
        <Extras xs={p.extras} />
        <span className="tag mono">{`${p.dur}분`}</span>
        {p.key && <T x={p.key} />}
      </div>
      <details className="cmore"><summary>자세히</summary><div className="tags">{p.det.map((x, i) => <T key={i} x={x} />)}</div></details>
    </div>
  );
}

function Group({ g, pm }: { g: CardGroup; pm: boolean }) {
  const cards = g.cards.map(p => <Card key={p.id} p={p} pm={pm} />);
  if (g.kind === 'list') return <>{cards}</>;
  const fresh = g.kind === 'fresh';
  return (
    <details className={fresh ? 'zone fresh' : 'zone'} data-zone={fresh ? undefined : g.zone} open={fresh || g.open} onToggle={fresh ? undefined : e => go('zone', `${g.zone}~${e.currentTarget.open ? 1 : 0}`)}>
      <summary><b>{g.name}<span className="mono">{g.cards.length}</span></b><span className={g.near ? 'd near' : 'd'}>{g.note}</span></summary>
      <div className="cards">{cards}</div>
    </details>
  );
}

/** P모드: the top of the 장소 tab — how many cards, and three ways to collect more */
function Collect({ pm }: { pm: { count: number; ai: boolean } }) {
  return (
    <div className="pcollect">
      <b>{`내 카드 ${pm.count}장 모았어요`}</b>
      <small>판은 그날 아침에 열려요. 그 전엔 가고 싶은 곳을 ♥ 담기로 모아 두면, 그날 주사위로 뽑아요.</small>
      <div className="row">
        {pm.ai && <button type="button" className="small-btn primary" data-pairec="" onClick={() => go('pairec', '')}>✨ AI에게 추천받기</button>}
        {pm.ai && <button type="button" className="small-btn" data-pfind="" onClick={() => go('pfind', '')}>🔍 찾아서 담기</button>}
        <button type="button" className="small-btn" data-pnewcard="" onClick={() => go('pnewcard', '')}>✏️ 직접 적어 담기</button>
      </div>
      <LiveLine tag="p" id="st_pairec" className="ai-status" />
    </div>
  );
}

export function TrayCards(p: TrayCardsProps) {
  const pm = !!p.pmode;
  return (
    <Fragment key={p.rev}>
      {p.pmode && <Collect pm={p.pmode} />}
      {p.dups.map(d => (
        <div className="dup-card" key={d.a + '~' + d.b}>
          <div className="dup-h"><b>🔗 같은 곳 같아요</b><span className="hint">{d.why}</span></div>
          <div className="dup-row"><span className="tag">{d.aWho}</span>{` ${d.aName}`}</div>
          <div className="dup-row"><span className="tag">{d.bWho}</span>{` ${d.bName}`}</div>
          <div className="row"><button className="small-btn primary" type="button" data-dupmerge={`${d.a}~${d.b}`} onClick={() => go('dupmerge', `${d.a}~${d.b}`)}>하나로 묶기</button><button className="small-btn" type="button" data-dupno={`${d.a}~${d.b}`} onClick={() => go('dupno', `${d.a}~${d.b}`)}>다른 곳이에요</button></div>
        </div>
      ))}
      {p.hidden > 0 && <p className="now-hint" style={{ margin: '0 0 4px' }}>{`일정에 넣은 ${p.hidden}곳은 목록에서 숨겼어요.`}</p>}
      {p.empty != null
        ? <p className="now-hint">{p.empty}</p>
        : p.groups.map((g, i) => <Group key={(g.zone || g.kind) + i} g={g} pm={pm} />)}
    </Fragment>
  );
}

export function TrayFilters(p: TrayFiltersProps) {
  return (
    <Fragment key={p.rev}>
      {p.chips.map(([k, v]) => <button key={k} className="fchip" data-cat={k} aria-pressed={p.cat === k} onClick={() => go('cat', k)}>{v}</button>)}
      <select id="catSel" className="fsel" aria-label="분류" onChange={e => go('cat', e.currentTarget.value)} defaultValue={p.cats.some(([k]) => k === p.cat) ? p.cat : undefined}>
        <option value="">분류 ▾</option>
        {p.cats.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
    </Fragment>
  );
}

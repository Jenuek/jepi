// 장소 탭: the filter chips (#filters) and the place cards (#cards). They used to be renderTray / cardHTML / dupHTML
// in src/js (340-render.js, 388-dedup.js). The old code works out every card (tags, distance, hours) and redraws
// the whole list fresh (rev) after anything changes, like before. Clicks (♥ 👍 넣기 묶기, drag) are read by the old code.
// What other features add to a card (CARD_EXTRAS, e.g. 친구와 함께 "가고 싶어요") is still old HTML.
import { Fragment, type CSSProperties } from 'react';

export interface Tag { c: string; t: string }

export interface PlaceCard {
  id: string; name: string; sub: string; cat: string;
  sel: boolean; off: boolean;
  dist: string;
  wish: boolean;
  /** 👍 여행자 추천 (null when recommendations are off) */
  vote: null | { on: boolean; n: number; locked: boolean };
  extrasHTML: string;
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
  rev: number;
}

export interface TrayFiltersProps {
  chips: [k: string, label: string][];
  cats: [k: string, label: string][];
  cat: string;
  rev: number;
}

const Old = ({ html }: { html: string }) => html ? <span className="old-part" style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: html }} /> : null;
const T = ({ x }: { x: Tag }) => <span className={x.c}>{x.t}</span>;

function Card({ p }: { p: PlaceCard }) {
  return (
    <div className={'card' + (p.sel ? ' sel' : '') + (p.off ? ' off' : '')} style={{ '--cc': `var(--c-${p.cat})` } as CSSProperties} draggable="true" data-id={p.id}>
      <div className="nm">{p.name}</div><button className="small-btn primary" data-pick={p.id}>{p.sel ? '선택됨' : '넣기'}</button>
      <div className="sub">{p.sub}</div>
      {p.dist && <div className="dist">{p.dist}</div>}
      <div className="tags">
        <button className="vote" data-wish={p.id} aria-pressed={p.wish} aria-label="가고 싶어요">{p.wish ? '♥' : '♡'}</button>
        {p.vote && <button className="vote" data-vote={p.id} aria-pressed={p.vote.on} aria-label="추천하기" disabled={p.vote.locked}>{`👍 ${p.vote.n}`}</button>}
        <Old html={p.extrasHTML} />
        <span className="tag mono">{`${p.dur}분`}</span>
        {p.key && <T x={p.key} />}
      </div>
      <details className="cmore"><summary>자세히</summary><div className="tags">{p.det.map((x, i) => <T key={i} x={x} />)}</div></details>
    </div>
  );
}

function Group({ g }: { g: CardGroup }) {
  const cards = g.cards.map(p => <Card key={p.id} p={p} />);
  if (g.kind === 'list') return <>{cards}</>;
  const fresh = g.kind === 'fresh';
  return (
    <details className={fresh ? 'zone fresh' : 'zone'} data-zone={fresh ? undefined : g.zone} open={fresh || g.open}>
      <summary><b>{g.name}<span className="mono">{g.cards.length}</span></b><span className={g.near ? 'd near' : 'd'}>{g.note}</span></summary>
      <div className="cards">{cards}</div>
    </details>
  );
}

export function TrayCards(p: TrayCardsProps) {
  return (
    <Fragment key={p.rev}>
      {p.dups.map(d => (
        <div className="dup-card" key={d.a + '~' + d.b}>
          <div className="dup-h"><b>🔗 같은 곳 같아요</b><span className="hint">{d.why}</span></div>
          <div className="dup-row"><span className="tag">{d.aWho}</span>{` ${d.aName}`}</div>
          <div className="dup-row"><span className="tag">{d.bWho}</span>{` ${d.bName}`}</div>
          <div className="row"><button className="small-btn primary" type="button" data-dupmerge={`${d.a}~${d.b}`}>하나로 묶기</button><button className="small-btn" type="button" data-dupno={`${d.a}~${d.b}`}>다른 곳이에요</button></div>
        </div>
      ))}
      {p.hidden > 0 && <p className="now-hint" style={{ margin: '0 0 4px' }}>{`일정에 넣은 ${p.hidden}곳은 목록에서 숨겼어요.`}</p>}
      {p.empty != null
        ? <p className="now-hint">{p.empty}</p>
        : p.groups.map((g, i) => <Group key={(g.zone || g.kind) + i} g={g} />)}
    </Fragment>
  );
}

export function TrayFilters(p: TrayFiltersProps) {
  return (
    <Fragment key={p.rev}>
      {p.chips.map(([k, v]) => <button key={k} className="fchip" data-cat={k} aria-pressed={p.cat === k}>{v}</button>)}
      <select id="catSel" className="fsel" aria-label="분류" defaultValue={p.cats.some(([k]) => k === p.cat) ? p.cat : undefined}>
        <option value="">분류 ▾</option>
        {p.cats.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
    </Fragment>
  );
}

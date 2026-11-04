// The sheets the 일정표 opens in #sheet: a block's sheet (tap a block) and the free-time sheet (tap an empty slot).
// They used to be openSheet / altsHTML / marksHTML (350-actions.js, 080-todos.js) and openFill (340-render.js).
// The old code works out every row and opens the sheet again after each change (a new rev).
// What other features add to a block's sheet (SHEET_EXTRAS: 손글씨 메모, 🔔 알림, 가고 싶어요) is drawn by Extras.tsx.
import { Fragment, type CSSProperties, type ReactNode } from 'react';
import { Line, type Seg } from './DayTop';
import { Extras, type Extra } from './Extras';
import { app } from '../ui/host';

export interface FillRow {
  id: string; cat: string; name: string; random: boolean; star: boolean; kws: string[];
  /** ★ 꼭 추천: why (the 대안 list) */
  mustNote: string;
  line: Seg[];
  act: { k: 'fill'; start: number; time: string } | { k: 'why'; t: string } | { k: 'swap'; start: number; dur: number };
}

const STAR = { borderStyle: 'solid', color: 'var(--accent)', borderColor: 'var(--accent)' };

export function Row({ r, dim }: { r: FillRow; dim?: boolean }) {
  const a = r.act;
  return (
    <div className={dim ? 'fill-row dim' : 'fill-row'} style={{ '--cc': `var(--c-${r.cat})` } as CSSProperties}>
      <div>
        <b>{r.name}</b>{r.random && <span className="rnd">랜덤</span>}{r.star && <span className="rnd" style={STAR}>★ 꼭 추천</span>}
        {r.kws.length > 0 && <div>{r.kws.map((k, i) => <span key={i} className="kwm">{`#${k}`}</span>)}</div>}
        {r.mustNote && <div className="m" style={{ color: 'var(--ink)' }}>{r.mustNote}</div>}
        <div className="m"><Line segs={r.line} /></div>
      </div>
      {a.k === 'fill' ? <button className="small-btn primary" data-fill={r.id} data-start={a.start}><span className="t">{a.time}</span> 넣기</button>
        : a.k === 'swap' ? <button className="small-btn primary" data-swap={r.id} data-start={a.start} data-dur={a.dur}>바꾸기</button>
        : <span className="m">{a.t}</span>}
    </div>
  );
}

export interface FillSheetProps {
  title: string; when: string; carrying: boolean; t: number; tapped: string;
  fit: FillRow[]; dim: FillRow[];
  rev: number;
}
export function FillSheet(p: FillSheetProps) {
  return (
    <Fragment key={p.rev}>
      <h3>{p.title}</h3>
      <div className="when">{p.when}</div>
      {p.carrying && <p style={{ color: 'var(--warn)', fontSize: '12.5px', fontWeight: 600 }}>이 시간에는 캐리어를 들고 있어요. 짐 맡길 곳을 먼저 넣고, 미술관이나 매장은 그 뒤에 넣으세요.</p>}
      <p style={{ color: 'var(--muted)', fontSize: '12.5px' }}>{`취향 키워드가 많이 겹치고 이동이 적게 늘어나는 순서예요. 마지막 하나는 랜덤 추천이에요. 시작 시간은 탭한 ${p.tapped} 이후, 이동 시간을 뺀 뒤로 잡았어요.`}</p>
      <div className="fill-list">
        {p.fit.length ? p.fit.map(r => <Row key={r.id} r={r} />) : <p className="now-hint">이 빈 시간에 들어가는 장소가 없어요. 앞뒤 블록을 옮겨 보세요.</p>}
        {p.dim.map(r => <Row key={r.id} r={r} dim />)}
      </div>
      <div className="row"><button className="small-btn primary" data-dicefrom={p.t}>🎲 굴리기</button><button className="small-btn" data-totray="1">다른 장소 고르기</button><button className="small-btn" data-newcustom={p.t}>직접 만들기</button><button className="small-btn" data-close="1">닫기</button></div>
    </Fragment>
  );
}

export interface MarksBox {
  open: boolean; summary: string;
  rows: { icon: string; btns: { m: string; label: string; on: boolean }[] }[];
  /** 근처 짐 보관 (after the first row) */
  bagHint: string;
  pairs: { T: string; label: string }[];
}

export interface Alts {
  mine: string;
  near: FillRow[]; must: FillRow[]; far: FillRow[];
}

export interface BlockSheetProps {
  name: string; when: string; note: string; mapLink: string;
  vote: null | { id: string; on: boolean; n: number; locked: boolean };
  hours: string; cost: Seg[] | null; krw: string; check: string; tips: string;
  season: Seg[] | null;
  extras: Extra[];
  warns: string[];
  travel: Seg[] | null;
  marks: MarksBox | null;
  /** a place block: 시간·길이·빼기 and 대안 */
  place: null | { customId: string | null; alts: Alts };
  /** the "집 → 공항" block */
  home: null | { word: string; min: number };
  rev: number;
}

const H4 = ({ top, children }: { top: number; children: ReactNode }) => <h4 style={{ fontSize: '12.5px', marginTop: `${top}px` }}>{children}</h4>;

function AltList({ a }: { a: Alts }) {
  const list = (rows: FillRow[]) => <div className="fill-list" style={{ marginTop: 0 }}>{rows.map(r => <Row key={r.id} r={r} />)}</div>;
  return (
    <div className="alt">
      <h4>같은 시간 대안</h4>
      <p className="sub">{`지금 블록: ${a.mine} · 앞뒤 일정, 영업시간, 짐 상태에 맞는 곳만 골랐어요.`}</p>
      <H4 top={8}>가까워서 바로 바꿀 수 있는 곳 <span className="mono" style={{ color: 'var(--muted)', fontWeight: 400 }}>{a.near.length}</span></H4>
      <p className="sub">이동이 10분 이상 늘지 않는 곳을 모두 보여 줘요. 취향 키워드가 많이 겹치는 순서예요.</p>
      <div className="fill-list" style={{ marginTop: 0 }}>{a.near.length ? a.near.map(r => <Row key={r.id} r={r} />) : <p className="now-hint">가까운 대안이 없어요.</p>}</div>
      {a.must.length > 0 && <>
        <H4 top={12}>★ 멀어도 꼭 추천하는 곳</H4>
        <p className="sub">지금 시간 안에는 다 들어가지 않지만 특히 추천하는 곳이에요. 바꾸면 뒤 일정과 겹치는 블록이 빨갛게 표시되니, 그 블록을 빼거나 옮겨서 맞추세요.</p>
        {list(a.must)}
      </>}
      {a.far.length > 0 && <>
        <H4 top={12}>조금 멀지만 취향에 맞는 곳</H4>
        <p className="sub">이동이 더 걸리지만 키워드가 잘 맞는 곳 3개와 랜덤 1개예요.</p>
        {list(a.far)}
      </>}
    </div>
  );
}

function Marks({ m }: { m: MarksBox }) {
  return (
    <details className="marks" open={m.open}>
      <summary>{m.summary}</summary>
      <p className="hint">시간을 따로 잡지 않고 이 블록에 붙는 일이에요. 짝이 있는 일은 끝내는 표시가 없으면 경고해요.</p>
      {m.rows.map((r, i) => (
        <Fragment key={i}>
          <div className="mk-row"><span>{r.icon}</span>{r.btns.map(b => <button key={b.m} className="small-btn" data-mark={b.m} aria-pressed={b.on}>{b.label}</button>)}</div>
          {i === 0 && m.bagHint && <p className="hint" style={{ margin: '0 0 6px 28px' }}>{m.bagHint}</p>}
        </Fragment>
      ))}
      {m.pairs.map(x => <div className="row" key={x.T}><button className="small-btn primary" data-pairblock={x.T}>{x.label}</button></div>)}
    </details>
  );
}

export function BlockSheet(p: BlockSheetProps) {
  return (
    <Fragment key={p.rev}>
      <h3>{p.name}</h3>
      <div className="when">{p.when}</div>
      {p.note && <p>{p.note}</p>}
      {p.mapLink && <p><a href={p.mapLink} target="_blank" rel="noopener">지도에서 위치·영업시간 확인</a></p>}
      {p.vote && <div className="row"><button className="vote" data-vote={p.vote.id} aria-pressed={p.vote.on} disabled={p.vote.locked} onClick={() => app().place('vote', p.vote!.id)}>{`👍 추천 ${p.vote.n}`}</button><span className="hint">{p.vote.on ? '추천했어요. 다시 누르면 취소돼요.' : '좋았던 곳이면 다른 여행자에게 추천해 주세요.'}</span></div>}
      {p.hours && <p className="mono" style={{ color: 'var(--muted)', fontSize: '12px' }}>{p.hours}</p>}
      {p.cost && <p><Line segs={p.cost} /></p>}
      {p.krw && <p>예상 비용 <b className="mono">{p.krw}</b> · 원화 기준</p>}
      {p.check && <p><b>준비:</b>{` ${p.check}`}</p>}
      {p.tips && <div className="tips">{p.tips}</div>}
      {p.season && <p><Line segs={p.season} /></p>}
      <Extras xs={p.extras} />
      {p.warns.length > 0 && <div className="warns">{p.warns.map((w, i) => <div key={i}>{w}</div>)}</div>}
      {p.travel && <p><Line segs={p.travel} /></p>}
      {p.marks && <Marks m={p.marks} />}
      {p.place ? <>
        <div className="row"><span className="lbl">시간</span><button className="small-btn" data-mv="-30">30분 앞으로</button><button className="small-btn" data-mv="30">30분 뒤로</button></div>
        <div className="row"><span className="lbl">길이</span><button className="small-btn" data-du="-30">30분 줄이기</button><button className="small-btn" data-du="30">30분 늘리기</button></div>
        <div className="row"><button className="small-btn danger" data-del="1">일정에서 빼기</button>{p.place.customId && <button className="small-btn" data-editcustom={p.place.customId}>블록 정보 수정</button>}<button className="small-btn primary" data-close="1">완료</button></div>
        <AltList a={p.place.alts} />
      </> : <>
        {p.home && <>
          <div className="row"><span className="lbl" style={{ width: 'auto' }}>{`집 → ${p.home.word} `}<b className="mono">{`${p.home.min}분`}</b></span></div>
          <div className="row"><button className="small-btn" data-home="-10">10분 줄이기</button><button className="small-btn" data-home="10">10분 늘리기</button></div>
        </>}
        <div className="row"><button className="small-btn primary" data-close="1">닫기</button></div>
      </>}
    </Fragment>
  );
}

// P모드 일정 (#pview): 하루를 보드게임판으로. 칸은 4칸×3줄 지그재그(한 장에 10칸)로 길처럼 이어지고, 칸이 넘치면 옆으로 넘겨요.
// 아래 주사위 판에서 주사위(기분)를 고르고 굴리면 3D 주사위가 한 바퀴 돈 뒤 카드가 나와요.
// The old code (170-quick-start-pview.js) builds the values: squares, dice, my cards, the drawn card, and whether the day is still closed.
// Page turning is this screen's own state (it stays while the old code redraws; a new day starts on the page with "now" or the next ?).
import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type PointerEvent as RPointerEvent, type MouseEvent as RMouseEvent } from 'react';
import { LiveLine } from '../ui/live';
import { app } from '../ui/host';

const go = (n: string, v?: string) => app().pview(n, v);

export interface PSquare { k: 'start' | 'done' | 'now' | 'place' | 'flag' | 'q' | 'end'; top: string; name: string; uid: string; cat: string; stamp: boolean; flag: boolean; gap: number }
export interface PDie { k: string; label: string; n: number; on: boolean }
export interface PMyCards { count: number; list: { id: string; name: string; cat: string }[] }
export interface PCard { id: string; cat: string; catName: string; name: string; dist: string; note: string; when: string; mine: boolean }

interface Base { day: number; dice: PDie[]; cards: PMyCards; rev: number }
export type PViewProps = Base & (
  | { mode: 'board'; squares: PSquare[]; ahead: boolean; canRoll: boolean; qLeft: number; rollGap: number }
  | { mode: 'closed'; closed: { until: number; date: string; started: boolean; flags: { t: string; name: string }[] } }
  | { mode: 'draw'; draw: { rolling: boolean; n: number; mood: string; part: string; left: number; empty: string; ai: boolean; card: PCard | null } }
);

const DIE_COLOR: Record<string, string> = { any: '#ffffff', hungry: '#f08a4b', calm: '#8fd3c4', dopa: '#ffd23f', mine: '#f5a3c7', legs: '#a9b9f5' };
const dieColor = (dice: PDie[], n: number) => DIE_COLOR[(dice.find(d => d.n === n) || dice[0]).k] || '#ffffff';
const FACES: Record<number, number[]> = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };

/** a die face: 3×3 spots, the face's pips filled */
function Face({ n, color, cls = 'pdie' }: { n: number; color: string; cls?: string }) {
  return <span className={cls} style={{ background: color }} aria-hidden="true">{Array.from({ length: 9 }, (_, i) => <i key={i} className={FACES[n].includes(i) ? 'on' : ''} />)}</span>;
}

// category pictograms (stroke icons, 24×24)
const ICON: Record<string, ReactNode> = {
  food: <><path d="M6 3v7a2 2 0 0 0 4 0V3" /><path d="M8 10v11" /><path d="M17 21V3c-2 1.5-3 4.5-3 8h3" /></>,
  music: <><path d="M9 18V5l11-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="17" cy="16" r="3" /></>,
  art: <><rect x="3" y="4" width="18" height="16" rx="1.5" /><path d="M3 16l5-5 4 4 3-3 6 6" /><circle cx="16" cy="9" r="1.5" /></>,
  walk: <><path d="M12 3l5 7h-3l4 6H6l4-6H7z" /><path d="M12 16v5" /></>,
  shop: <><path d="M5 8h14l-1.2 13H6.2z" /><path d="M9 8V6.5a3 3 0 0 1 6 0V8" /></>,
  night: <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />,
  trip: <><rect x="4" y="7" width="16" height="13" rx="2" /><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /><path d="M9 11v5M15 11v5" /></>,
};
export function CatIcon({ cat, size = 18 }: { cat: string; size?: number }) {
  return <svg className="pic" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICON[cat] || ICON.walk}</svg>;
}
const catColor = (cat: string) => `var(--c-${cat || 'walk'})`;

const PER = 10;   // squares on one page
// where square j (0–9) of a page sits, and which way its road goes to the next one (zigzag)
const POS = [[1, 1], [1, 2], [1, 3], [1, 4], [2, 4], [2, 3], [2, 2], [2, 1], [3, 1], [3, 2]];
const ROAD = ['r', 'r', 'r', 'd', 'l', 'l', 'l', 'd', 'r', 'next'];

function Square({ s, j, more }: { s: PSquare; j: number; more: boolean }) {
  const style = { gridRow: POS[j][0], gridColumn: POS[j][1], '--cc': catColor(s.cat) } as CSSProperties;
  const road = more && ROAD[j] !== 'next' ? <span className={`road ${ROAD[j]}`} aria-hidden="true" /> : null;
  const stamp = s.stamp ? <span className="pstamp" aria-label="다녀옴">{s.k === 'start' ? '출발!' : s.k === 'end' ? '도착!' : '다녀옴'}</span> : null;
  const body = <>
    {s.k === 'now' && <svg className="pawn" width="24" height="28" viewBox="0 0 26 30" aria-hidden="true"><circle cx="13" cy="8" r="6" /><path d="M6 27 L9 15 H17 L20 27 Z" /></svg>}
    <span className="st">{s.flag && <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true" className="flag"><path d="M5 21V4" /><path d="M5 4h12l-3 4 3 4H5" /></svg>}{s.k === 'now' && s.uid ? '지금' : s.top}</span>
    <span className="sn">{s.name}</span>
    {stamp}{road}
  </>;
  const cls = `sq ${s.k}${s.flag ? ' fl' : ''}${s.stamp ? ' stamped' : ''}`;
  if (s.k === 'q') return <button type="button" className={cls} style={style} data-pgap={s.gap} onClick={() => go('gap', String(s.gap))} aria-label={`${s.name} 빈 칸: 굴려서 채우기`}>{body}</button>;
  if (s.uid) return <button type="button" className={cls} style={style} data-psq={s.uid} onClick={() => go('sq', s.uid!)}>{body}</button>;
  return <div className={cls} style={style}>{body}</div>;
}

function Board({ squares, day, qLeft }: { squares: PSquare[]; day: number; qLeft: number }) {
  const pages: PSquare[][] = [];
  for (let i = 0; i < squares.length; i += PER) pages.push(squares.slice(i, i + PER));
  const startAt = Math.max(0, Math.floor(Math.max(squares.findIndex(s => s.k === 'now'), squares.findIndex(s => s.k === 'q'), 0) / PER));
  const [page, setPage] = useState(startAt);
  const track = useRef<HTMLDivElement>(null);
  const go = (p: number, smooth = true) => {
    const el = track.current; p = Math.max(0, Math.min(pages.length - 1, p)); setPage(p);
    if (el) el.scrollTo({ left: p * el.clientWidth, behavior: smooth ? 'smooth' : 'auto' });
  };
  useEffect(() => { go(startAt, false) }, [day]);   // a new day opens where you are
  const onScroll = () => { const el = track.current; if (!el || !el.clientWidth) return; const p = Math.round(el.scrollLeft / el.clientWidth); if (p !== page) setPage(p) };
  return (
    <section className="pboard" aria-label="오늘의 판">
      <div className="ptrack" ref={track} onScroll={onScroll}>
        {pages.map((pg, pi) => (
          <div className="ppage" key={pi} aria-label={`판 ${pi + 1}장`}>
            {pg.map((s, j) => <Square key={`${s.k}${s.uid}${s.gap}${j}`} s={s} j={j} more={pi * PER + j < squares.length - 1} />)}
            <div className="plabel">{pi < pages.length - 1
              ? <><b>다음 장으로 →</b><small>옆으로 넘겨요</small></>
              : qLeft ? <><b>{`? 칸이 ${qLeft}개 남았어요`}</b><small>주사위로 채워 봐요</small></> : <><b>오늘 판을 다 채웠어요</b><small>칸을 누르면 자세히 봐요</small></>}</div>
          </div>
        ))}
      </div>
      {pages.length > 1 && (
        <div className="ppager">
          <button type="button" aria-label="이전 장" onClick={() => go(page - 1)} disabled={page === 0}>‹</button>
          <span className="dots" aria-hidden="true">{pages.map((_, i) => <i key={i} className={i === page ? 'on' : ''} />)}</span>
          <span className="pn">{`${page + 1} / ${pages.length}장`}</span>
          <button type="button" aria-label="다음 장" onClick={() => go(page + 1)} disabled={page === pages.length - 1}>›</button>
        </div>
      )}
    </section>
  );
}

function Tray({ dice, canRoll, rollGap }: { dice: PDie[]; canRoll: boolean; rollGap: number }) {
  const cur = dice.find(d => d.on) || dice[0];
  return (
    <section className="ptray" aria-label="주사위 판">
      <span className="pstep">① 어떤 주사위를 굴릴까요?</span>
      <div className="pdice" role="radiogroup" aria-label="주사위 고르기">
        {dice.map(d => (
          <button key={d.k} type="button" role="radio" aria-checked={d.on} className={d.on ? 'pd on' : 'pd'} data-pmood={d.k} onClick={() => go('mood', d.k)}>
            <Face n={d.n} color={DIE_COLOR[d.k]} /><span>{d.label}</span>
          </button>
        ))}
      </div>
      <span className="pstep">② 굴려요</span>
      <button type="button" className="proll" data-proll={rollGap} onClick={() => go('roll', String(rollGap))} disabled={!canRoll}>
        <Face n={cur.n} color={DIE_COLOR[cur.k]} cls="pdie big" />
        <span><b>{`${cur.label} 주사위 굴리기!`}</b><small>{canRoll ? '다음 ? 칸에 넣을 카드를 뽑아요' : '이 날은 채울 빈 칸이 없어요'}</small></span>
      </button>
    </section>
  );
}

const TILT = [-8, 3, -3, 7, -5, 2];
/** my cards as a fanned row you drag left and right (touch scrolls by itself; a mouse drags it too) */
function MyCards({ cards }: { cards: PMyCards }) {
  const row = useRef<HTMLDivElement>(null);
  const drag = useRef({ on: false, x: 0, left: 0, moved: false });
  const down = (e: RPointerEvent) => {
    if (e.pointerType !== 'mouse' || !row.current) return;
    drag.current = { on: true, x: e.clientX, left: row.current.scrollLeft, moved: false };
  };
  const move = (e: RPointerEvent) => {
    const d = drag.current, el = row.current; if (!d.on || !el) return;
    const dx = e.clientX - d.x; if (Math.abs(dx) > 5) d.moved = true;
    if (d.moved) { el.scrollLeft = d.left - dx; e.preventDefault() }
  };
  const up = () => { drag.current.on = false };
  // a drag is not a tap on the card under the mouse
  const click = (e: RMouseEvent) => { if (drag.current.moved) { e.stopPropagation(); e.preventDefault(); drag.current.moved = false } };
  return (
    <section className="pmine" aria-label="내 카드">
      <div className="pmh"><b className="ph">{`내 카드 ${cards.count}장`}</b>{cards.count > 3 && <small>← 밀어서 더 보기 →</small>}{cards.count > 0 && <button type="button" className="pcol" data-tab="tray">+ 카드 모으기</button>}</div>
      {cards.count ? (
        <div className={cards.count > 3 ? 'pfan many' : 'pfan'} ref={row} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up} onClickCapture={click}>
          {cards.list.map((c, i) => (
            <button key={c.id} type="button" className="mcard" data-pcard={c.id} onClick={() => go('card', c.id)} style={{ '--cc': catColor(c.cat), '--tilt': `${TILT[i % TILT.length]}deg` } as CSSProperties} aria-label={`${c.name}: 내 카드 주사위로 굴리기`}>
              <span className="mb"><CatIcon cat={c.cat} size={15} /></span><span className="mn">{c.name}</span>
            </button>
          ))}
        </div>
      ) : <button type="button" className="pcol big" data-tab="tray"><b>+ 카드 모으기</b><small>가고 싶은 곳을 ♥ 담아 두면, 그날 주사위로 뽑아요</small></button>}
    </section>
  );
}

/** the 3D die that spins once before the card shows */
function Spin({ n, color }: { n: number; color: string }) {
  const others = [1, 2, 3, 4, 5, 6].filter(x => x !== n);
  return (
    <div className="pspin" role="status" aria-label="주사위를 굴리는 중">
      <div className="cube">
        <Face n={n} color={color} cls="pdie cf front" />
        {['back', 'right', 'left', 'top', 'bottom'].map((f, i) => <Face key={f} n={others[i]} color={color} cls={`pdie cf ${f}`} />)}
      </div>
      <span className="shadow" />
    </div>
  );
}

function Draw({ d, dice }: { d: Extract<PViewProps, { mode: 'draw' }>['draw']; dice: PDie[] }) {
  const c = d.card;
  return (
    <section className="pdraw" aria-label="카드 뽑기">
      <div className="pdhead">
        <button type="button" className="pback" data-pclose="" onClick={() => go('close')} aria-label="판으로 돌아가기">‹</button>
        <span><b>{d.rolling ? '주사위를 굴리는 중…' : c ? '카드를 뽑았어요!' : '더 나올 카드가 없어요'}</b><small>{`${d.part} ? 칸 · ${d.mood} 주사위`}</small></span>
      </div>
      {d.rolling ? <Spin n={d.n} color={dieColor(dice, d.n)} /> : c ? (
        <>
          <div className="pstage">
            <span className="deck d1" aria-hidden="true" /><span className="deck d2" aria-hidden="true" />
            <span className="dleft">{`남은 ${d.left}장`}</span>
            <article className="pcard" style={{ '--cc': catColor(c.cat) } as CSSProperties} aria-label="뽑은 카드">
              <div className="pin">
                <div className="pctop"><span className="pcat"><CatIcon cat={c.cat} size={18} />{c.catName}</span><span className="pdist">{c.dist}</span></div>
                <div className="part"><CatIcon cat={c.cat} size={56} /></div>
                <div className="pcb"><h3>{c.name}</h3>{c.note && <p>{c.note}</p>}<small>{c.when}</small></div>
              </div>
            </article>
          </div>
          <div className="pacts">
            <button type="button" className="pgo" data-pyes="" onClick={() => go('yes')}>이 카드로 갈래요</button>
            <div className="row2">
              <button type="button" data-pnext="" onClick={() => go('next')}>다시 뽑기</button>
              <button type="button" data-pkeep="" onClick={() => go('keep')} disabled={c.mine}>{c.mine ? '내 카드에 있어요' : '내 카드에 넣기'}</button>
            </div>
          </div>
        </>
      ) : (
        <div className="pempty">
          <p>{d.empty}</p>
          <div className="row">{d.ai && <button type="button" className="small-btn" data-pai="" onClick={() => go('ai')}>AI에게 더 찾아 달라기</button>}<button type="button" className="small-btn" data-pclose="" onClick={() => go('close')}>다른 주사위 고르기</button></div>
          <LiveLine tag="span" id="st_pai" />
        </div>
      )}
    </section>
  );
}

function Closed({ c }: { c: Extract<PViewProps, { mode: 'closed' }>['closed'] }) {
  return (
    <>
      <section className="pclosed" aria-label="아직 닫힌 판">
        <div className="ptok"><small>{c.started ? '이 날까지' : '출발까지'}</small><b>{c.until}</b><small>일</small></div>
        <div className="pct"><b>판은 그날 아침에 펼쳐요!</b><small>{`${c.date} 아침에 열려요. 지금은 가고 싶은 곳을 내 카드로 모아 둬요.`}</small></div>
      </section>
      {c.flags.length > 0 && (
        <section className="pflags" aria-label="꼭 지킬 시간">
          <b className="ph">꼭 지킬 시간</b>
          {c.flags.map((f, i) => <div key={i} className="pflag"><svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" className="flag"><path d="M5 21V4" /><path d="M5 4h12l-3 4 3 4H5" /></svg><span className="mono">{f.t}</span>{f.name}</div>)}
        </section>
      )}
      <button type="button" className="pahead" data-pahead="" onClick={() => go('ahead')} role="switch" aria-checked="false"><span>미리 열어서 계획하기</span><i aria-hidden="true" /></button>
    </>
  );
}

export function PView(props: PViewProps) {
  if (props.mode === 'draw') return <div className="pwrap">{<Draw d={props.draw} dice={props.dice} />}</div>;
  if (props.mode === 'closed') return <div className="pwrap"><Closed c={props.closed} /><MyCards cards={props.cards} /></div>;
  return (
    <div className="pwrap">
      {props.ahead && <button type="button" className="pahead on" data-pahead="" onClick={() => go('ahead')} role="switch" aria-checked="true"><span>미리 열어 둔 판이에요 · 닫아 두기</span><i aria-hidden="true" /></button>}
      <Board squares={props.squares} day={props.day} qLeft={props.qLeft} />
      <Tray dice={props.dice} canRoll={props.canRoll} rollGap={props.rollGap} />
      <MyCards cards={props.cards} />
    </div>
  );
}

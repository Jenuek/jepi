// P 모드 일정 (#pview): 시간 구간(오전·점심·오후·저녁·밤)마다 블록과 "뭐 할까요?" 주사위 칸. It used to be renderPView / pItem / pTile
// in 170-quick-start-pview.js. The old code keeps the rolls and redraws fresh (rev). "AI에게 더 찾아 달라기" status lines are Live.
import { Fragment, type CSSProperties } from 'react';
import { LiveLine } from '../ui/live';

export interface PItem { uid: string; fixed: boolean; cc: string; time: string; name: string; loc: string; warn: string }
export type PTile =
  | { s: 'roll'; k: string; nm: string }
  | { s: 'cand'; k: string; cat: string; name: string; line: string; note: string }
  | { s: 'empty'; k: string; nm: string; ai: boolean; stId: string };

export interface PViewProps {
  buckets: { nm: string; items: PItem[]; tile: PTile | null }[];
  rev: number;
}

function Tile({ t }: { t: PTile }) {
  if (t.s === 'roll') return <button type="button" className="ptile" data-proll={t.k}><span className="die-s">🎲</span><span>{`${t.nm}, 뭐 할까요?`}<small>눌러서 굴려 보기</small></span></button>;
  if (t.s === 'empty') return (
    <div className="ptile"><p>{`${t.nm}에 맞는 곳은 다 봤어요.`}</p>
      <div className="row">{t.ai && <button type="button" className="small-btn" data-pai={t.k}>AI에게 더 찾아 달라기</button>}<button type="button" className="t-link" data-pclose={t.k}>닫기</button><LiveLine tag="span" id={t.stId} /></div>
    </div>
  );
  return (
    <div className="ptile on">
      <div className="pc" style={{ '--cc': `var(--c-${t.cat})` } as CSSProperties}><b>{t.name}</b><small>{t.line}</small>{t.note && <p>{t.note}</p>}</div>
      <div className="row"><button type="button" className="small-btn primary" data-pyes={t.k}>좋아요</button><button type="button" className="small-btn" data-pnext={t.k}>다음 →</button><button type="button" className="t-link" data-pclose={t.k}>그만</button></div>
    </div>
  );
}

export function PView({ buckets, rev }: PViewProps) {
  if (!buckets.length) return <p className="hint" key={rev}>이 날은 채울 시간이 없어요.</p>;
  return (
    <Fragment key={rev}>{buckets.map(b => (
      <section className="pb" key={b.nm}>
        <h3>{b.nm}</h3>
        {b.items.map(i => (
          <button key={i.uid} type="button" className={i.fixed ? 'pi fx' : 'pi'} data-puid={i.uid} style={{ '--cc': i.cc } as CSSProperties}>
            <span className="pt">{i.time}</span><b>{i.name}</b><small>{`${i.loc}${i.warn ? ' · ' : ''}`}{i.warn && <span className="w">{`⚠ ${i.warn}`}</span>}</small>
          </button>
        ))}
        {b.tile && <Tile t={b.tile} />}
        {!b.items.length && !b.tile && <p className="hint">여유 시간이 없어요.</p>}
      </section>
    ))}</Fragment>
  );
}

// 준비하기 (#checks): 일정 경고 · 예약·준비 · 이 시기 여행 팁 · 여행 전체 · 일정 초기화.
// It used to be renderChecks / ckRow / seasonChecksHTML in src/js (340-render.js, 110-season.js). The old code works out
// the rows and redraws fresh (rev) after a tick or a change. "시즌 정보 받기" and its status line are Live (app/ui/live.tsx).
import { Fragment } from 'react';
import { LiveButton, LiveLine } from '../ui/live';
import { app } from '../ui/host';

export interface CheckRow { id: string; t: string; sub?: string; on: boolean }

export interface ChecksProps {
  ai: boolean;
  warns: { d: number; uid: string; t: string }[];
  prep: CheckRow[];
  season: {
    /** got the season info: the sun line (may be ''), weather, tips */
    got: null | { sun: string; weather: string; notes: CheckRow[] };
    stale: boolean;
    canAsk: boolean;
  };
  all: CheckRow[];
  resetArm: boolean;
  rev: number;
}

const Row = ({ r }: { r: CheckRow }) => (
  <label className={r.on ? 'ck done' : 'ck'}><input type="checkbox" data-ck={r.id} defaultChecked={r.on} onChange={e => app().checks('ck', r.id, e.currentTarget.checked)} /><span>{r.t}{r.sub && <small>{r.sub}</small>}</span></label>
);
const m6 = { margin: '0 0 6px' };

export function Checks(p: ChecksProps) {
  const s = p.season;
  return (
    <Fragment key={p.rev}>
      <div className="check-group">
        <h3>일정 경고</h3>
        {p.warns.length > 0 && p.ai && <div className="row" style={{ margin: '0 0 8px' }}><button className="small-btn primary" id="fixWarnBtn" onClick={() => app().checks('fix')}>AI에게 경고 해결 맡기기</button></div>}
        {p.warns.length
          ? p.warns.map((w, i) => <button key={i} className="ck warn" style={{ width: '100%', textAlign: 'left' }} data-goto={w.d} data-uid={w.uid} onClick={() => app().checks('goto', `${w.d}~${w.uid}`)}><span className="mono">{`D${w.d + 1}`}</span><span>{w.t}<small>탭해서 블록 고치기</small></span></button>)
          : <p className="now-hint">겹치거나 휴관인 블록이 없어요.</p>}
      </div>
      <div className="check-group">
        <h3>예약·준비</h3>
        {p.prep.length ? p.prep.map(r => <Row key={r.id} r={r} />) : <p className="now-hint">일정에 넣은 블록 중 준비할 게 없어요.</p>}
      </div>
      <div className="check-group">
        <h3>이 시기 여행 팁</h3>
        {s.got
          ? <>
              <p className="now-hint" style={m6}>{s.got.sun}</p>
              {s.got.weather && <p className="now-hint" style={m6}>{s.got.weather}</p>}
              {s.got.notes.map(r => <Row key={r.id} r={r} />)}
            </>
          : <p className="now-hint" style={m6}>{s.stale ? '여행 날짜가 바뀌어서 시즌 정보를 다시 받아야 해요.' : '여행 날짜의 날씨, 해 지는 시간, 축제·행사, 휴무 정보를 받아 추천에 반영할 수 있어요.'}</p>}
        {s.canAsk && <div className="row"><LiveButton className={s.got ? 'small-btn' : 'small-btn primary'} id="seasonBtn" noType onClick={() => app().checks('season')}>{s.got ? '시즌 정보 다시 받기' : 'AI로 이 시기 정보 받기'}</LiveButton><LiveLine tag="span" id="st_season" /></div>}
        <p className="now-hint" style={{ margin: '6px 0 0' }}>행사 날짜는 AI가 아는 예년 기준이라 올해와 다를 수 있어요. 시즌 장소의 "날짜 확인" 링크로 꼭 확인하세요.</p>
      </div>
      <div className="check-group">
        <h3>여행 전체</h3>
        {p.all.map(r => <Row key={r.id} r={r} />)}
      </div>
      <div className="check-group">
        <h3>일정 초기화</h3>
        <p className="now-hint" style={m6}>넣어 둔 블록을 모두 지워요. 항공편, 숙소 같은 고정 블록은 남아요.</p>
        <button className="small-btn danger" id="resetBtn" onClick={() => app().checks('reset')}>{p.resetArm ? '한 번 더 누르면 모두 지워요' : '넣은 블록 모두 지우기'}</button>
      </div>
    </Fragment>
  );
}

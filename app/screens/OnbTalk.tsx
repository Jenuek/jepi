// 처음 설정 → 아직 막연해요 · 이야기하면서 정할래요 (it used to be fTalk in src/js/140-direction-chat.js).
// The old code keeps the conversation and redraws after every answer; "지금 생각 중" and errors are part of what it sends.
import { Radio, Inp } from './TripForms';
import { LiveChip, LiveLine } from '../ui/live';
import { app } from '../ui/host';

export interface TalkPart {
  f: 'talk';
  /** answers given so far / the most */
  n: number; max: number;
  /** earlier questions and answers */
  hist: [q: string, a: string][];
  /** the last thing the AI said */
  last: string;
  busy: boolean;
  options: string[];
  failed: boolean;
  /** the conversation is summed up: the 방향 letter */
  done: null | {
    note: string; purpose: string; chips: { k: string; on: boolean }[];
    pace: string; solo: boolean; social: string; avoid: string; applyLabel: string;
  };
}

export function Talk(p: TalkPart) {
  const d = p.done;
  return (
    <div className={d ? 'talk2 done' : 'talk2'}>
      <div className="t-dots" aria-label={`${Math.min(p.n, p.max)} / ${p.max}`}>{Array.from({ length: p.max }, (_, k) => <i key={k} className={k < p.n ? 'on' : ''} />)}</div>
      {p.hist.length > 0 && (
        <details className="t-hist"><summary>지금까지 나눈 이야기</summary>
          {p.hist.map(([q, a], i) => [<p key={i + 'q'} className="t-hq">{q}</p>, <p key={i + 'a'} className="t-ha">{a}</p>])}
        </details>
      )}
      {!d ? <>
        {p.busy
          ? <p className="t-q t-wait">잠시 생각을 정리하고 있어요<span className="t-ell" /></p>
          : <>
              <p className="t-q" id="talkQ">{p.last}</p>
              {p.options.length > 0 && <div className="t-opts">{p.options.map((o, i) => <button key={i} type="button" className="t-opt" data-talkopt={i} onClick={() => app().form('talkopt', String(i))}>{o}</button>)}</div>}
              <div className="t-write"><textarea id="talkInput" onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); app().form('talkSend', e.currentTarget.value) } }} rows={2} maxLength={300} placeholder="떠오르는 대로 적어 보세요" /><button type="button" className="t-send" id="talkSend" aria-label="보내기" onClick={e => app().form('talkSend', (e.currentTarget.previousElementSibling as HTMLInputElement | null)?.value || '')}>→</button></div>
              {p.failed && <div className="row"><button type="button" className="small-btn primary" id="talkRetry" onClick={() => app().form('talkRetry')}>다시 시도하기</button></div>}
              <div className="t-links">{p.n >= 2 && <button type="button" className="t-link" id="talkFinish" onClick={() => app().form('talkFinish')}>이 정도로 정리해 줘</button>}<button type="button" className="t-link" data-startmode="quick" onClick={() => app().form('startmode', 'quick', { inChoose: false })}>건너뛰고 직접 고를게요</button></div>
            </>}
        <LiveLine id="st_talk" />
      </> : <>
        {p.last && <p className="t-close">{p.last}</p>}
        <div className="t-letter">
          <span className="t-label">이번 여행의 방향</span>
          <p className="t-note">{d.note}</p>
          <label className="t-field"><span>한 줄로 말하면</span><Inp pf="purpose" val={d.purpose} maxLength={80} /></label>
          <div className="t-field"><span>마음에 담아 둘 단어</span><div className="chips">{d.chips.map(x => <LiveChip key={x.k} k={x.k} on={x.on} />)}</div></div>
          <div className="t-field"><span>여행의 속도</span><Radio path="pace" val={d.pace} opts={[['slow', '느긋하게'], ['normal', '보통'], ['full', '꽉 채워서']]} /></div>
          {d.solo && <div className="t-field"><span>사람과의 거리</span><Radio path="social" val={d.social} opts={[['alone', '혼자가 좋아요'], ['some', '가끔은 대화도'], ['social', '많이 만나고 싶어요']]} /></div>}
          <label className="t-field"><span>피하고 싶은 것</span><Inp pf="direction.avoid" val={d.avoid} maxLength={80} placeholder="예: 사람 많은 관광지" /></label>
          <div className="row"><button type="button" className="small-btn primary" id="talkApply" onClick={() => app().form('talkApply')}>{d.applyLabel}</button><button type="button" className="t-link" id="talkRedo" onClick={() => app().form('talkRedo')}>다시 이야기하기</button></div>
          <p className="hint">대화 내용은 저장하지 않고, 이 방향만 남겨요.</p>
        </div>
      </>}
    </div>
  );
}

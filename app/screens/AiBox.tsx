// AI 빈 시간 추천 상자 (#aiBox, above the 일정표). It used to be renderAI in 340-render.js.
// The "Claude · 12초째" counter is written every second by the old code through the live handle (LiveLine aiSec).
import { Fragment } from 'react';
import { LiveLine } from '../ui/live';
import { app } from '../ui/host';

export interface AiBoxProps {
  state:
    | { s: 'loading' }
    | { s: 'error'; msg: string }
    | { s: 'done'; date: string; dropped: number; items: { time: string; name: string; why: string; added: boolean }[] };
  rev: number;
}

export function AiBox({ state, rev }: AiBoxProps) {
  if (state.s === 'loading') return <Fragment key={rev}>
    <h3>빈 시간에 맞는 블록을 고르는 중</h3>
    <div className="status">AI가 이 날의 일정, 이동 거리, 영업시간을 보고 있어요. 보통 10~40초 걸려요. <LiveLine tag="span" id="aiSec" className="mono" /></div>
    <div className="sugg"><button className="small-btn" id="aiStop" onClick={() => app().aibox('stop')}>멈추기</button></div>
  </Fragment>;
  if (state.s === 'error') return <Fragment key={rev}>
    <h3>추천을 받지 못했어요</h3><div className="status">{state.msg}</div><div className="sugg"><button className="small-btn" id="aiClose" onClick={() => app().aibox('close')}>닫기</button></div>
  </Fragment>;
  const d = state.dropped;
  return <Fragment key={rev}>
    <h3>{`AI 추천 · ${state.date}`}</h3>
    <div className="status">{state.items.length
      ? `✓ 넣어도 경고가 생기지 않는지 확인한 블록만 보여 줘요.${d ? ` 경고가 생기는 추천 ${d}개는 뺐어요.` : ''}`
      : `지금 일정에 경고 없이 넣을 만한 블록을 찾지 못했어요.${d ? ` (경고가 생기는 추천 ${d}개를 뺐어요)` : ''}`}</div>
    <div className="sugg">
      {state.items.map((x, i) => (
        <div key={i} className="sugg-item"><div><div className="t">{x.time}</div><b>{x.name}</b><div className="why">{x.why}</div></div>
          <button className="small-btn primary" data-acc={i} disabled={x.added} onClick={() => app().aibox('acc', String(i))}>{x.added ? '넣음' : '넣기'}</button></div>
      ))}
      <button className="small-btn" id="aiClose" onClick={() => app().aibox('close')}>닫기</button>
    </div>
  </Fragment>;
}

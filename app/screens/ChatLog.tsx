// 채팅 (#chatLog): the last 8 messages with the AI, its proposed changes (적용하기 / 그대로 두기 / 되돌리기) and place
// suggestions (일정에 넣기 / 장소에만 / 안 함). It used to be renderChat / placeRowsHTML (050-chat.js, 260-chat-places.js).
// Also 더 정확하게 (#nudges): the "tell us more" rows above the 일정표 (050-chat.js renderNudges).
import { Fragment } from 'react';

export interface ChatPlace { k: number; name: string; meta: string; note: string; off: boolean; done: string | null; schedLabel: string }
export type ChatMsg =
  | { r: 'u'; text: string }
  | { r: 'busy'; note: string }
  | { r: 'a'; i: number; text: string; places: ChatPlace[] | null; ops: string[]; check: null | { warns: string[] };
      state: string; undo: boolean };

export interface ChatLogProps { msgs: ChatMsg[]; rev: number }

function Msg({ m }: { m: ChatMsg }) {
  if (m.r === 'u') return <div className="msg u">{m.text}</div>;
  if (m.r === 'busy') return <div className="msg a">{`${m.note} `}<button className="small-btn" type="button" id="chatStop">멈추기</button></div>;
  const i = m.i;
  return (
    <div className="msg a">
      {m.text}
      {m.places && <div className="cps">{m.places.map(o => (
        <div key={o.k} className={o.off ? 'cp off' : 'cp'}>
          <div className="cp-t"><b>{o.name}</b>{o.meta && <small>{o.meta}</small>}{o.note && <p>{o.note}</p>}</div>
          {o.done != null ? <span className="cp-st">{o.done}</span>
            : <div className="cp-b"><button className="small-btn primary" type="button" data-cp={`${i}:${o.k}:sched`}>{o.schedLabel}</button><button className="small-btn" type="button" data-cp={`${i}:${o.k}:list`}>장소에만</button><button className="small-btn" type="button" data-cp={`${i}:${o.k}:skip`}>안 함</button></div>}
        </div>
      ))}</div>}
      {m.ops.length > 0 && <ul>{m.ops.map((t, k) => <li key={k}>{t}</li>)}</ul>}
      {m.check && (m.check.warns.length
        ? <div className="chk bad">{`⚠ 적용하면 경고 ${m.check.warns.length}개가 남아요`}<ul>{m.check.warns.slice(0, 4).map((w, k) => <li key={k}>{w}</li>)}</ul></div>
        : <div className="chk ok">✓ 적용해도 새 경고가 생기지 않는 걸 확인했어요</div>)}
      {m.ops.length > 0 && m.state === 'pending' && <div className="acts"><button className="small-btn primary" type="button" data-chatapply={i}>적용하기</button><button className="small-btn" type="button" data-chatcancel={i}>그대로 두기</button></div>}
      {m.state === 'applied' && <div className="acts"><span className="ai-status">적용했어요.</span>{m.undo && <button className="small-btn" type="button" data-chatundo={i}>되돌리기</button>}</div>}
      {m.state === 'cancelled' && <div className="acts"><span className="ai-status">적용하지 않았어요.</span></div>}
    </div>
  );
}

export function ChatLog({ msgs, rev }: ChatLogProps) {
  return <Fragment key={rev}>{msgs.map((m, k) => <Msg key={k} m={m} />)}</Fragment>;
}

export interface NudgesProps {
  dir: string;
  rows: { k: string; ic: string; label: string; title: string; aria: string; btns: { id: string; label: string; primary: boolean }[] }[];
}
export function Nudges({ dir, rows }: NudgesProps) {
  return <>
    {dir && <div className="dir-line">{`🧭 ${dir}`}</div>}
    {rows.length > 0 && <div className="nudge"><b className="nt">더 정확한 일정을 위해 알려 주세요</b>{rows.map(r => (
      <div key={r.k} className="nrow"><span className="ic">{r.ic}</span><span className="nl" title={r.title}>{r.label}</span>
        <span className="nb">{r.btns.map(b => <button key={b.id} className={b.primary ? 'small-btn primary' : 'small-btn'} id={b.id}>{b.label}</button>)}<button className="x" data-nudgeoff={r.k} aria-label={r.aria}>✕</button></span></div>
    ))}</div>}
  </>;
}

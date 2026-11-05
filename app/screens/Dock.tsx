// The dock under the schedule (#chat): fold button, the quick chips (✨ 빈 시간 채우기 · 🛠 경고 해결 · 🧳 예약 도우미 ·
// + 직접 만들기), the message box and its note. The chat log itself (ChatLog.tsx) is drawn by the old code into #chatLog.
// The old code keeps what the dock shows (dockView in src/js/050-chat.js) and draws it again; the buttons tell it through the host.
import { useRef, type KeyboardEvent } from 'react';
import { app } from '../ui/host';

export interface DockProps {
  /** the log is folded away (class "folded") */
  folded: boolean;
  foldHidden: boolean; foldText: string;
  /** aria-expanded of the fold button (undefined = not set yet) */
  expanded?: boolean;
  aiHidden: boolean; aiOff: boolean;
  fixHidden: boolean; fixText: string;
  helperHidden: boolean;
  note: string;
  inputOff: boolean; sendOff: boolean; placeholder: string;
}

export function Dock(p: DockProps) {
  const ta = useRef<HTMLTextAreaElement>(null);
  const submit = (e: { preventDefault(): void }) => {
    e.preventDefault();
    const v = (ta.current?.value || '').trim();
    if (v && ta.current) ta.current.value = '';
    app().dock('send', v);
  };
  const grow = () => { const x = ta.current; if (x) { x.style.height = 'auto'; x.style.height = Math.min(120, x.scrollHeight) + 'px' } };
  const key = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); e.currentTarget.form?.requestSubmit() }
  };
  return (
    <div className={p.folded ? 'chat dock folded' : 'chat dock'} id="chat">
      <button className="chat-fold" type="button" id="chatFold" hidden={p.foldHidden} aria-expanded={p.expanded} onClick={() => app().dock('fold')}>{p.foldText}</button>
      <div className="chat-log" id="chatLog"></div>
      <div className="quick">
        <button className="chip-btn" id="aiBtn" hidden={p.aiHidden} disabled={p.aiOff} onClick={() => app().dock('ai')}>✨ 빈 시간 채우기</button>
        <button className="chip-btn warn" id="fixWarnChip" hidden={p.fixHidden} onClick={() => app().dock('fix')}>{p.fixText}</button>
        <button className="chip-btn" id="helperBtn" hidden={p.helperHidden} onClick={() => app().dock('helper')}>🧳 예약 도우미</button>
        <button className="chip-btn" id="customBtn" onClick={() => app().dock('custom')}>+ 직접 만들기</button>
      </div>
      <form className="chat-form" id="chatForm" onSubmit={submit}>
        <textarea id="chatInput" ref={ta} rows={1} maxLength={600} placeholder={p.placeholder} disabled={p.inputOff} onInput={grow} onKeyDown={key}></textarea>
        <button className="small-btn primary" type="submit" id="chatSend" disabled={p.sendOff}>보내기</button>
      </form>
      <span className="chat-note" id="chatNote">{p.note}</span>
    </div>
  );
}

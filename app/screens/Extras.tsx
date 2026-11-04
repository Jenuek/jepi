// Little things other features add to a block, a place card and a block's sheet (src/js/007-panels.js:
// BLOCK_BADGES, CARD_EXTRAS, SHEET_EXTRAS). Each feature returns pieces of data (not HTML); this draws them.
//   🔔 / 👍 badge on a block · 친구 "가고 싶어요" chip · a tag · 🔔 알림 row · 손글씨 메모 box (saves itself)
import { useState } from 'react';
import * as trip from '../data/trip';
import { memo } from '../logic';
import { app } from '../ui/host';
export type Extra =
  | { k: 'badge'; t: string; title: string }
  | { k: 'want'; pid: string; on: boolean; n: number; who: string }
  | { k: 'tag'; cls: string; t: string }
  | { k: 'wantRow'; want: Extract<Extra, { k: 'want' }>; by: string }
  | { k: 'alert'; on: boolean; hint: string }
  | { k: 'memo'; key: string; value: string };

function Want({ x }: { x: Extract<Extra, { k: 'want' }> }) {
  return <>
    <button className="want" type="button" data-want={x.pid} aria-pressed={x.on} title={x.who || '가고 싶어요'}>{`👍 가고 싶어요${x.n ? ` ${x.n}` : ''}`}</button>
    {x.n > 0 && <span className="want-who">{x.who}</span>}
  </>;
}

// 손글씨 메모 in a block's sheet: it saves itself (저장 or Enter). What is typed survives a redraw of the sheet.
const drafts = new Map<string, string>();
function MemoBox({ x }: { x: Extract<Extra, { k: 'memo' }> }) {
  const [v, setV] = useState(drafts.get(x.key) ?? x.value);
  const save = () => {
    const p = trip.get('profile'); if (!p) return;
    const t = memo.setBlockMemo(p, x.key, v); drafts.delete(x.key);
    trip.save('profile', p); app().closeSheet(); app().renderAll(); app().toast(t ? '메모를 남겼어요' : '메모를 지웠어요');
  };
  return (
    <div className="memo-f" id="bmForm" data-bm={x.key}>
      <label className="hint" htmlFor="bmIn">손글씨 메모</label>
      <div className="kin">
        <input id="bmIn" className="hand" maxLength={60} value={v} placeholder="예) 참치! · 글리코 앞에서 사진" autoComplete="off"
          onChange={e => { setV(e.target.value); drafts.set(x.key, e.target.value) }}
          onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); save() } }} />
        <button className="small-btn" type="button" id="bmSave" onClick={save}>저장</button>
      </div>
    </div>
  );
}

function One({ x }: { x: Extra }) {
  switch (x.k) {
    case 'badge': return <><span className="mks" title={x.title}>{x.t}</span>{' '}</>;
    case 'want': return <Want x={x} />;
    case 'tag': return <span className={x.cls}>{x.t}</span>;
    case 'wantRow': return <div className="row"><Want x={x.want} />{x.by && <span className="hint">{`${x.by} 추천`}</span>}</div>;
    case 'alert': return (
      <div className="row alert-row"><button className={x.on ? 'small-btn primary' : 'small-btn'} type="button" data-alert={x.on ? 'off' : 'on'}>{`🔔 ${x.on ? '알림 켜짐' : '알림 켜기'}`}</button><span className="hint">{x.hint}</span></div>
    );
    case 'memo': return <MemoBox x={x} />;
  }
}

export function Extras({ xs }: { xs: Extra[] }) {
  return <>{xs.map((x, i) => <One key={i} x={x} />)}</>;
}

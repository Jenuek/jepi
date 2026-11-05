// 날짜 제목 고치기: the small form that replaces the day title in the header while it is edited (✎). It used to be
// editDayTitle / closeDayTitle in src/js/389-titles.js. It saves itself; the header (body.html) is shown again through the host.
import { useEffect, useRef } from 'react';
import * as trip from '../data/trip';
import { memo } from '../logic';
import { app } from '../ui/host';

export interface DayTitleFormProps {
  open: boolean;
  day: number;
  /** what the person typed before ('' = automatic) and the automatic title */
  title: string; auto: string;
  memo: string;
  rev: number;
}

export function DayTitleForm(p: DayTitleFormProps) {
  const t = useRef<HTMLInputElement>(null), m = useRef<HTMLInputElement>(null);
  useEffect(() => { if (p.open && t.current) { t.current.focus(); t.current.select() } }, [p.open, p.rev]);
  if (!p.open) return null;
  const close = (save: boolean) => {
    let typed = '';
    if (save) {
      const pr = trip.get('profile');
      if (pr) { typed = (t.current?.value || '').trim(); memo.setDayTitle(pr, p.day, typed); memo.setDayMemo(pr, p.day, m.current?.value || ''); trip.save('profile', pr) }
    }
    app().titleEditing(false); app().renderAll();
    if (save) app().toast(typed ? '제목을 바꿨어요' : '자동 제목으로 돌아갔어요');
  };
  return (
    <form id="dayTitleForm" className="dt-form" key={p.rev} onSubmit={e => { e.preventDefault(); close(true) }}>
      <input id="dayTitleIn" ref={t} maxLength={40} defaultValue={p.title} placeholder={p.auto} aria-label={`Day ${p.day + 1} 제목`} />
      <input id="dayMemoIn" ref={m} className="hand" maxLength={60} defaultValue={p.memo} placeholder="한 줄 메모 (손글씨로 보여요)" aria-label={`Day ${p.day + 1} 메모`} />
      <button className="small-btn primary" type="submit">저장</button>
      <button className="small-btn" type="button" id="dayTitleCancel" onClick={() => close(false)}>취소</button>
    </form>
  );
}

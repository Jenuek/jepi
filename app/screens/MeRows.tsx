// 더보기 → 이번 여행: one row per topic, tap to open its form (it used to be renderMeRows in src/js/220-more-menu.js).
// The row values are still old HTML. The open form is a list of parts (TripForms.tsx)
// drawn fresh on every full redraw (rev) like before; a message-only update keeps it as it is (same rev).
import { FormPiece, type FormPart } from './TripForms';

export interface MeRowInfo {
  id: string;
  label: string;
  /** the short summary (old HTML: may hold <small>/<span>) */
  valueHTML: string;
}

export interface MeRowsProps {
  rows: MeRowInfo[];
  /** the open row */
  open: string | null;
  /** the form of the open row */
  body: FormPart[];
  /** "✓ 자동 저장됨 …" */
  msg: string;
  /** a day course: no 예약 도우미 */
  dayCourse: boolean;
  rev: number;
}

const Chev = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
);
const Old = ({ html, className }: { html: string; className?: string }) => <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;

export function MeRows(p: MeRowsProps) {
  return (
    <>
      <div className="mgroup merows">
        {p.rows.map(r => [
          <button key={r.id} className="merow" data-meopen={r.id} aria-expanded={p.open === r.id}>
            <span className="mk">{r.label}</span><Old className="mv" html={r.valueHTML} /><Chev />
          </button>,
          p.open === r.id ? <div key={r.id + ':body:' + p.rev} className="mebody">{p.body.map((x, i) => <FormPiece key={i} part={x} />)}</div> : null,
        ])}
      </div>
      <p className="saved" id="meMsg">{p.msg}</p>
      <div className="row" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
        <button className="small-btn" type="button" id="meOnb">처음 설정 다시 하기</button>
        {!p.dayCourse && <button className="small-btn" type="button" id="meHelper">예약 도우미</button>}
      </div>
    </>
  );
}

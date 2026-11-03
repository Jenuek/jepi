// 취향 탭 → "어떤 여행을 원하나요?" (it used to be fStyle/styleOnly + styleMoreHTML in src/js, drawn into #tasteStyle).
// Same field names as before (data-pf, data-radio): the old code reads every click and input and redraws (a new rev).
import { Fragment } from 'react';
import { Radio, Inp, type Opt } from './TripForms';

export interface TasteStyleProps {
  purpose: string;
  pace: string;
  /** traveling alone: also asks about meeting people */
  solo: boolean;
  social: string;
  breakfast: string | boolean;
  /** 여행 스타일 더: [key, label, choices] */
  rows: [string, string, Opt[]][];
  /** what is chosen for each style row (missing = 상관없음) */
  style: Record<string, string>;
  /** the 여행 스타일 더 box is open */
  open: boolean;
  /** "✓ 자동 저장됨 …" */
  msg: string;
  rev: number;
}

export function TasteStyle(p: TasteStyleProps) {
  return (
    <Fragment key={p.rev}>
      <div className="fsec">
        <h3>어떤 여행을 원하나요?</h3>
        <label className="fg" style={{ display: 'block' }}><span className="hint">이번 여행의 목적을 한 줄로 (선택)</span><Inp pf="purpose" val={p.purpose} maxLength={80} placeholder="예: 맛있는 거 먹고 천천히 걷기" style={{ marginTop: 4 }} /></label>
        <span className="hint">속도</span>
        <Radio path="pace" val={p.pace} opts={[['slow', '느긋하게 (하루 핵심 하나)'], ['normal', '보통'], ['full', '꽉 채워서']]} />
        {p.solo && <>
          <span className="hint">현지에서 사람 만나기</span>
          <Radio path="social" val={p.social} opts={[['alone', '혼자가 좋아요'], ['some', '가끔은 대화도'], ['social', '많이 만나고 싶어요']]} />
        </>}
        <span className="hint">아침 식사</span>
        <Radio path="breakfast" val={p.breakfast} opts={[['true', '먹어요'], ['false', '거의 안 먹어요']]} />
        <StyleMore rows={p.rows} style={p.style} open={p.open} />
      </div>
      <p className="saved">{p.msg}</p>
    </Fragment>
  );
}

/** 여행 스타일 더 알려 주기 (also in 처음 설정 → 여행지 추천) */
export function StyleMore({ rows, style, open }: { rows: [string, string, Opt[]][]; style: Record<string, string>; open: boolean }) {
  const n = Object.values(style).filter(v => v && v !== 'any').length;
  return (
    <details className="marks" open={n > 0 || open}>
      <summary>{`여행 스타일 더 알려 주기 (선택)${n ? ` · ${n}개 골랐어요` : ''}`}</summary>
      <p className="hint">모두 "상관없음"이 기본이에요. 고른 것만 추천에 반영돼요. 하루 리듬과 걷기는 일정 계산에도 쓰여요.</p>
      {rows.map(([k, l, o]) => (
        <Fragment key={k}>
          <span className="hint">{l}</span>
          <Radio path={'style.' + k} val={style[k] || 'any'} opts={[...o, ['any', k === 'gender' ? '밝히지 않음' : '상관없음']]} />
        </Fragment>
      ))}
    </details>
  );
}

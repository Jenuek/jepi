// 여행 꾸미기 (#sheet): 제목·한 줄 소개·스타일·테마 색·커버·손글씨 글꼴·날짜별 제목. It used to be renderLookSheet in
// src/js/389a-look.js. The old code keeps the draft, reads the fields (ids lk…) before every redraw, and redraws (rev).
// The cover pictures are small SVG strings made by the old code (coverSVG).
import { Fragment, type CSSProperties, type ReactNode } from 'react';
import { LiveLine } from '../ui/live';

export interface LookSheetProps {
  name: string; tagline: string; style: string; color: string; cover: string; hand: string; photo: string;
  colors: [c: string, name: string][];
  covers: { k: string; name: string; svg: string }[];
  hands: [k: string, name: string, font: string][];
  days: { title: string; placeholder: string }[];
  ai: boolean;
  rev: number;
}

function Opt({ k, v, cur, label, style, children }: { k: string; v: string; cur: string; label: string; style?: CSSProperties; children?: ReactNode }) {
  return <button type="button" className={`lk-opt ${k}`} data-lk={`${k}:${v}`} aria-pressed={cur === v} aria-label={label} style={style}>{children}</button>;
}

export function LookSheet(p: LookSheetProps) {
  return (
    <Fragment key={p.rev}>
      <h3>여행 꾸미기</h3>
      <form id="lookForm" className="look-form">
        <label className="lk-f"><span className="hint">여행 제목</span><input id="lkName" maxLength={30} defaultValue={p.name} className="lk-title" /></label>
        <label className="lk-f"><span className="hint">한 줄 소개</span><input id="lkTag" maxLength={40} defaultValue={p.tagline} placeholder="예) 3박 4일 · 미나미 중심 · 둘이서" /></label>
        <div className="lk-f"><span className="hint">스타일</span><div className="lk-row">
          <Opt k="style" v="color" cur={p.style} label="컬러 블록" style={{ flex: 1 }}><b>컬러 블록</b><small>깔끔하게, 여행 색으로</small></Opt>
          <Opt k="style" v="note" cur={p.style} label="여행 수첩" style={{ flex: 1 }}><b>여행 수첩</b><small>종이·도장·손글씨</small></Opt>
        </div></div>
        <div className="lk-f"><span className="hint">테마 색</span><div className="lk-row">
          {p.colors.map(([c, n]) => <Opt key={c} k="color" v={c} cur={p.color} label={n} style={{ '--sw': c } as CSSProperties} />)}
        </div></div>
        <div className="lk-f"><span className="hint">커버</span><div className="lk-row">
          {p.covers.map(c => <Opt key={c.k} k="cover" v={c.k} cur={p.cover} label={c.name}><span className="lk-cv" style={{ '--theme': p.color } as CSSProperties} dangerouslySetInnerHTML={{ __html: c.svg }} /><small>{c.name}</small></Opt>)}
          <label className="lk-opt cover lk-photo" aria-pressed={p.cover === 'photo'}><span className="lk-cv" style={p.photo ? { backgroundImage: `url('${p.photo}')` } : undefined} /><small>내 사진</small><input type="file" accept="image/*" id="lkPhoto" hidden /></label>
        </div></div>
        <div className="lk-f"><span className="hint">손글씨 메모 글꼴</span><div className="lk-row">
          {p.hands.map(([k, n, f]) => <Opt key={k} k="hand" v={k} cur={p.hand} label={n}><span style={{ fontFamily: `${f},cursive`, fontSize: '20px' }}>참치!</span><small>{n}</small></Opt>)}
        </div></div>
        <div className="lk-f">
          <div className="lk-h"><span className="hint">날짜별 제목</span>{p.ai && <button type="button" className="small-btn" id="lkAi">AI로 지어 보기</button>}</div>
          {p.days.map((d, i) => <label key={i} className="lk-day"><span className="mono">{`Day ${i + 1}`}</span><input data-lkday={i} maxLength={40} defaultValue={d.title} placeholder={d.placeholder} /></label>)}
          <LiveLine id="lkSt" className="hint" text="비워 두면 일정에 맞춰 자동으로 지어요." />
        </div>
        <div className="row"><button className="small-btn primary" type="submit">저장</button><button className="small-btn" type="button" data-close="1">취소</button></div>
      </form>
    </Fragment>
  );
}

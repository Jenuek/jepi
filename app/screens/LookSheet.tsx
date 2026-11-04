// 여행 꾸미기 (#sheet): 제목·한 줄 소개·스타일·테마 색·커버·손글씨 글꼴·날짜별 제목. It used to be renderLookSheet / saveLook
// in src/js/389a-look.js. The sheet keeps its own draft and handles its buttons: choices, 내 사진 (made small so it syncs
// quickly), AI로 지어 보기 (the question is still written by the old code: host.aiDayTitles), 저장.
// The cover pictures are small SVG strings made by the old code (coverSVG).
import { Fragment, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import * as trip from '../data/trip';
import { app } from '../ui/host';

export interface LookSheetProps {
  name: string; tagline: string; style: string; color: string; cover: string; hand: string; photo: string;
  /** the second theme colour (kept as it is) */
  pop: string;
  colors: [c: string, name: string][];
  covers: { k: string; name: string; svg: string }[];
  hands: [k: string, name: string, font: string][];
  days: { title: string; placeholder: string }[];
  ai: boolean;
  rev: number;
}

function Opt({ k, v, cur, label, style, children, pick }: { k: string; v: string; cur: string; label: string; style?: CSSProperties; children?: ReactNode; pick: (k: string, v: string) => void }) {
  return <button type="button" className={`lk-opt ${k}`} data-lk={`${k}:${v}`} aria-pressed={cur === v} aria-label={label} style={style} onClick={() => pick(k, v)}>{children}</button>;
}

/** a photo made at most 720 px wide (JPEG) so it syncs quickly */
function shrink(file: File): Promise<string> {
  return new Promise((ok, no) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, 720 / img.width), c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); ok(c.toDataURL('image/jpeg', .72));
    };
    img.onerror = () => { URL.revokeObjectURL(url); no(new Error('사진을 읽지 못했어요.')) };
    img.src = url;
  });
}

export function LookSheet(p: LookSheetProps) {
  return <Sheet key={p.rev} {...p} />;
}

function Sheet(p: LookSheetProps) {
  const [d, setD] = useState({ style: p.style, color: p.color, cover: p.cover, hand: p.hand, photo: p.photo });
  const [titles, setTitles] = useState(p.days.map(x => x.title));
  const [msg, setMsg] = useState('비워 두면 일정에 맞춰 자동으로 지어요.');
  const name = useRef<HTMLInputElement>(null), tag = useRef<HTMLInputElement>(null);
  const pick = (k: string, v: string) => setD(x => ({ ...x, [k]: v }));
  const askAI = async () => {
    setMsg('제목을 짓는 중이에요 (보통 10~20초)');
    try {
      const a = await app().aiDayTitles(name.current?.value || p.name);
      setTitles(t => t.map((x, i) => (i < a.length ? String(a[i] || '').slice(0, 40) : x)));
      setMsg('마음에 들지 않는 건 고쳐 쓰면 돼요.');
    } catch (e) { setMsg(app().errText(e, '제목을 짓지 못했어요')) }
  };
  const photo = async (f: File | undefined) => {
    if (!f) return;
    try { const url = await shrink(f); setD(x => ({ ...x, photo: url, cover: 'photo' })) } catch (e) { setMsg((e as Error).message) }
  };
  const save = () => {
    const pr = trip.get('profile'); if (!pr) return;
    pr.look = { color: d.color, pop: p.pop, cover: d.cover, tagline: (tag.current?.value || '').trim().slice(0, 40), style: d.style, hand: d.hand, photo: d.cover === 'photo' ? d.photo : '' };
    const t = titles.map(x => String(x || '').trim().slice(0, 40)); while (t.length && !t[t.length - 1]) t.pop(); pr.dayTitles = t;
    trip.save('profile', pr);
    app().renamePlan((name.current?.value || '').trim().slice(0, 30));
    app().closeSheet(); app().renderAll(); app().toast('여행을 꾸몄어요');
  };
  return (
    <Fragment>
      <h3>여행 꾸미기</h3>
      <form id="lookForm" className="look-form" onSubmit={e => { e.preventDefault(); save() }}>
        <label className="lk-f"><span className="hint">여행 제목</span><input id="lkName" ref={name} maxLength={30} defaultValue={p.name} className="lk-title" /></label>
        <label className="lk-f"><span className="hint">한 줄 소개</span><input id="lkTag" ref={tag} maxLength={40} defaultValue={p.tagline} placeholder="예) 3박 4일 · 미나미 중심 · 둘이서" /></label>
        <div className="lk-f"><span className="hint">스타일</span><div className="lk-row">
          <Opt k="style" v="color" cur={d.style} label="컬러 블록" style={{ flex: 1 }} pick={pick}><b>컬러 블록</b><small>깔끔하게, 여행 색으로</small></Opt>
          <Opt k="style" v="note" cur={d.style} label="여행 수첩" style={{ flex: 1 }} pick={pick}><b>여행 수첩</b><small>종이·도장·손글씨</small></Opt>
        </div></div>
        <div className="lk-f"><span className="hint">테마 색</span><div className="lk-row">
          {p.colors.map(([c, n]) => <Opt key={c} k="color" v={c} cur={d.color} label={n} style={{ '--sw': c } as CSSProperties} pick={pick} />)}
        </div></div>
        <div className="lk-f"><span className="hint">커버</span><div className="lk-row">
          {p.covers.map(c => <Opt key={c.k} k="cover" v={c.k} cur={d.cover} label={c.name} pick={pick}><span className="lk-cv" style={{ '--theme': d.color } as CSSProperties} dangerouslySetInnerHTML={{ __html: c.svg }} /><small>{c.name}</small></Opt>)}
          <label className="lk-opt cover lk-photo" aria-pressed={d.cover === 'photo'}><span className="lk-cv" style={d.photo ? { backgroundImage: `url('${d.photo}')` } : undefined} /><small>내 사진</small><input type="file" accept="image/*" id="lkPhoto" hidden onChange={e => photo(e.target.files?.[0])} /></label>
        </div></div>
        <div className="lk-f"><span className="hint">손글씨 메모 글꼴</span><div className="lk-row">
          {p.hands.map(([k, n, f]) => <Opt key={k} k="hand" v={k} cur={d.hand} label={n} pick={pick}><span style={{ fontFamily: `${f},cursive`, fontSize: '20px' }}>참치!</span><small>{n}</small></Opt>)}
        </div></div>
        <div className="lk-f">
          <div className="lk-h"><span className="hint">날짜별 제목</span>{p.ai && <button type="button" className="small-btn" id="lkAi" onClick={askAI}>AI로 지어 보기</button>}</div>
          {p.days.map((x, i) => <label key={i} className="lk-day"><span className="mono">{`Day ${i + 1}`}</span><input data-lkday={i} maxLength={40} value={titles[i] || ''} placeholder={x.placeholder} onChange={e => { const v = e.target.value; setTitles(t => t.map((y, j) => (j === i ? v : y))) }} /></label>)}
          <p className="hint" id="lkSt">{msg}</p>
        </div>
        <div className="row"><button className="small-btn primary" type="submit">저장</button><button className="small-btn" type="button" data-close="1">취소</button></div>
      </form>
    </Fragment>
  );
}

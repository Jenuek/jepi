// 나의 여행 취향 → 취향 키워드 (it used to be renderPref in src/js/340-render.js).
// Buttons keep their data-kw* / id names and tell the old code through app().kw, which keeps the keywords.
import { useRef } from 'react';
import { app } from '../ui/host';
export interface TasteKeywordsProps {
  /** my keywords and how many places carry each */
  kws: { k: string; n: number }[];
  /** keywords found on places that I don't have yet */
  known: string[];
}

export function TasteKeywords(p: TasteKeywordsProps) {
  const box = useRef<HTMLInputElement>(null);
  return (
    <>
      <div className="kw-list">
        {p.kws.length ? p.kws.map(({ k, n }, i) => (
          <span className="kw" key={k + i}>{'#' + k + ' '}<span className="n">{n}</span><button data-kwdel={i} aria-label={k + ' 빼기'} onClick={() => app().kw('del', String(i))}>×</button></span>
        )) : <p className="now-hint">등록한 키워드가 없어요.</p>}
      </div>
      {/* key: after a keyword is added the box starts empty again; typing is kept otherwise */}
      <form className="kw-add" id="kwForm" key={p.kws.map(x => x.k).join('|')} onSubmit={e => { e.preventDefault(); const v = box.current ? box.current.value : ''; if (box.current) box.current.value = ''; app().kw('add', v) }}>
        <input id="kwInput" ref={box} placeholder="키워드 추가 (예: 레코드)" maxLength={20} autoComplete="off" />
        <button className="small-btn primary" type="submit">추가</button>
      </form>
      {p.known.length > 0 && <>
        <p className="now-hint" style={{ margin: '0 0 6px' }}>장소에 붙어 있는 다른 키워드</p>
        <div className="kw-sugg">{p.known.map(k => <button key={k} data-kwadd={k} onClick={() => app().kw('add', k)}>{'+ ' + k}</button>)}</div>
      </>}
      <p className="now-hint" style={{ margin: '0 0 6px' }}>숫자는 그 키워드가 붙은 장소 수예요. 장소에 없는 키워드는 0으로 나오고, 장소 데이터가 늘어나면 반영돼요.</p>
      <button className="small-btn" id="kwReset" onClick={() => app().kw('reset')}>처음 키워드로 되돌리기</button>
    </>
  );
}

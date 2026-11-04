// 여행 노트 보기 (#notebook): the whole trip as one notebook — cover + a chapter per day. Read-only.
// It used to be notebookHTML in src/js/389c-notebook.js; the old code still makes/opens the #notebook box and handles the buttons.
import { Fragment } from 'react';

export interface NotebookProps {
  cover: { photo: string; svg: string; city: string; date: string; name: string; line: string };
  days: { ch: string; title: string; memo: string; rows: { mv: string; time: string; name: string; memo: string }[] }[];
  rev: number;
}

export function Notebook({ cover: c, days, rev }: NotebookProps) {
  return (
    <Fragment key={rev}>
      <div className="nb-bar"><button className="small-btn" type="button" id="nbPrint">PDF로 저장</button><button className="small-btn" type="button" id="nbShare">링크로 보내기</button><button className="small-btn" type="button" id="nbClose">닫기</button></div>
      <section className="nb-page nb-cover" style={c.photo ? { backgroundImage: `linear-gradient(rgba(0,0,0,.25),rgba(0,0,0,.55)),url('${c.photo}')` } : undefined}>
        {!c.photo && <div className="nb-art" aria-hidden="true" dangerouslySetInnerHTML={{ __html: c.svg }} />}
        <div className="nb-stamp" aria-hidden="true"><span>{c.city}</span><b>{c.date}</b><span>JEPI</span></div>
        <h1>{c.name}</h1><p>{c.line}</p>
      </section>
      {days.map((d, i) => (
        <section key={i} className="nb-page">
          <div className="nb-ch">{d.ch}</div><h2>{d.title}</h2>{d.memo && <p className="nb-dmemo">{`“${d.memo}”`}</p>}
          <ul className="nb-list">{d.rows.length ? d.rows.map((r, k) => (
            <Fragment key={k}>
              {r.mv && <li className="mvrow"><span /><span className="mv">{r.mv}</span></li>}
              <li><span className="t">{r.time}</span><b>{r.name}</b><span className="m">{r.memo}</span></li>
            </Fragment>
          )) : <li><span /><span className="mv">아직 일정이 없어요</span></li>}</ul>
        </section>
      ))}
    </Fragment>
  );
}

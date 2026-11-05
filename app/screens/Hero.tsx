// The header (#hero): cover picture, JEPI logo, 꾸미기 · J/P mode, the plan's name (opens the plan menu), the trip line,
// the tagline and the day's title with its ✎ button, date and handwritten memo. It used to be fixed HTML in body.html that
// the old code wrote into. The old code keeps what it shows (heroView in 389a-look.js) and draws it again; the buttons tell it
// through the host. (The folding is the old code's: it sets the --fold style variable on #hero and the body class "mini".)
import { app } from '../ui/host';

export interface HeroProps {
  /** the cover: the ready-made picture / stamp (html), the photo behind it (css) */
  artHtml: string; artBg: string; artPhoto: boolean;
  jp: 'J' | 'P';
  planName: string; planOpen: boolean;
  meta: string;
  /** the tagline ('' = hidden) */
  tag: string;
  /** "DAY 01 · 5/3 (금)", the title, the date line, the handwritten memo ('' = hidden) */
  day: string; title: string; sub: string; memo: string;
  /** the title is being edited: it and the ✎ button are hidden (the form is drawn after the title: #dayTitleSlot) */
  editing: boolean;
  /** #dayTitleSlot exists (it is made when the title is edited the first time) */
  slot: boolean;
}

export function Hero(p: HeroProps) {
  return (
    <header className="top hero" id="hero">
      <div className={p.artPhoto ? 'hero-art photo' : 'hero-art'} id="heroArt" aria-hidden="true" style={{ backgroundImage: p.artBg || undefined }} dangerouslySetInnerHTML={{ __html: p.artHtml }}></div>
      <div className="brand">
        <svg className="logo" viewBox="0 0 34 30" aria-hidden="true"><rect x="1" y="9" width="15" height="15" rx="3.5" fill="var(--ink)" /><g transform="rotate(14 25 15)"><rect x="17" y="6" width="15" height="15" rx="4" fill="var(--accent)" /><circle cx="21" cy="10" r="1.5" fill="var(--paper)" /><circle cx="24.5" cy="13.5" r="1.5" fill="var(--paper)" /><circle cx="28" cy="17" r="1.5" fill="var(--paper)" /></g></svg>
        <h1>JEPI</h1><span className="beta">베타</span>

        <button type="button" className="look-btn" id="lookBtn" aria-label="여행 꾸미기" onClick={() => app().hero('look')}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="13.5" cy="6.5" r="1.5" /><circle cx="17.5" cy="10.5" r="1.5" /><circle cx="8.5" cy="7.5" r="1.5" /><circle cx="6.5" cy="12.5" r="1.5" /><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.7-.8 1.7-1.7 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.9.8-1.7 1.7-1.7h2c3.1 0 5.6-2.5 5.6-5.6C22 6 17.5 2 12 2z" /></svg></button>
        <div className="jp" role="group" aria-label="모드"><button type="button" data-jp="J" aria-pressed={p.jp === 'J'} onClick={() => app().hero('J')}>J모드</button><button type="button" data-jp="P" aria-pressed={p.jp === 'P'} onClick={() => app().hero('P')}>P모드</button></div>
      </div>
      <button className="plan-btn" id="planBtn" aria-haspopup="menu" aria-expanded={p.planOpen} aria-label="계획 바꾸기" onClick={() => app().hero('plan')}><span id="planName">{p.planName}</span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg></button>
      <span className="meta mono" id="tripMeta">{p.meta}</span>
      <span className="hero-tag" id="heroTag" hidden={!p.tag}>{p.tag}</span>
      <div className="dayhead"><div className="dt-wrap"><span className="hero-day mono" id="heroDay">{p.day}</span><h2 id="dayTitle" hidden={p.editing}>{p.title}</h2>{p.slot ? <span id="dayTitleSlot" style={{ display: 'contents' }}></span> : null}<button type="button" className="dt-edit" id="dayTitleEdit" aria-label="이 날 제목 바꾸기" hidden={p.editing} onClick={() => app().hero('title')}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg></button><p id="daySub">{p.sub}</p><p className="hand day-memo" id="dayMemo" hidden={!p.memo}>{p.memo}</p></div></div>
    </header>
  );
}

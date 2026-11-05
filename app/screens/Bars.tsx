// The two bars that used to be fixed HTML in body.html: the bottom tabs (.tabs) and the one-line bar that takes the
// header's place when the page is scrolled (#miniBar). The old code keeps what they show (tabsView in 340-render.js,
// miniView in 389a-look.js) and draws them again; the buttons tell it through the host.
import { app } from '../ui/host';

export interface TabsProps {
  /** the highlighted tab: timeline, tray, map or more */
  shown: string;
  /** the number of warnings on 더보기 ('' = none) */
  warn: string;
}

const TABS: [string, string][] = [['timeline', '일정'], ['tray', '장소'], ['map', '지도'], ['more', '더보기']];

export function Tabs(p: TabsProps) {
  return (
    <nav className="tabs" role="group" aria-label="화면 선택">
      {TABS.map(([k, t]) => <button key={k} data-tab={k} aria-pressed={p.shown === k} onClick={() => app().tab(k)}>{t}{k === 'more' ? <span className="n" id="warnCount">{p.warn}</span> : null}</button>)}
    </nav>
  );
}

export interface MiniBarProps {
  /** the bar is showing (the header has scrolled away) */
  on: boolean;
  /** the day number ('' = none) and the title next to it */
  day: string; dayHidden: boolean; title: string;
  /** ‹ › are hidden (not on the schedule, or only one day) */
  navHidden: boolean;
}

export function MiniBar(p: MiniBarProps) {
  return (
    <div className="minibar" id="miniBar" aria-hidden={!p.on}><span className="mb-day mono" id="mbDay" hidden={p.dayHidden}>{p.day}</span><b className="mb-title" id="mbTitle">{p.title}</b>
      <button type="button" className="mb-nav" data-mbday="-1" aria-label="이전 날" tabIndex={p.on ? 0 : -1} hidden={p.navHidden} onClick={() => app().miniDay(-1)}>‹</button>
      <button type="button" className="mb-nav" data-mbday="1" aria-label="다음 날" tabIndex={p.on ? 0 : -1} hidden={p.navHidden} onClick={() => app().miniDay(1)}>›</button></div>
  );
}

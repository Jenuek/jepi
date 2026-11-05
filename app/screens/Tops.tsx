// The top of two panels that used to be fixed HTML in body.html: the 장소 tab (title, "AI로 장소 더 찾기", the
// recommendation line, 묶어 보기, the filters' and cards' places, "이 날 문 여는 곳만") and the 지도 top (이 날/전체, 내 위치).
// The old code keeps what they show (trayTopView in 340-render.js, mapTopView in 210-map.js) and draws them again.
import { useRef } from 'react';
import { app } from '../ui/host';

export interface TrayTopProps {
  /** the "AI로 장소 더 찾기" form is hidden (no AI, or a manual trip) */
  moreHidden: boolean;
  /** the line about the travelers' recommendations ('' = hidden) */
  rec: string;
  group: string;
}

const GROUPS: [string, string][] = [['zone', '동네별'], ['list', '추천순'], ['pop', '👍 많은 순']];

export function TrayTop(p: TrayTopProps) {
  const inp = useRef<HTMLInputElement>(null);
  return (
    <>
      <h2>장소</h2>
      <form className="kw-add" id="moreForm" hidden={p.moreHidden} onSubmit={e => {
        e.preventDefault();
        const v = (inp.current?.value || '').trim(); if (inp.current) inp.current.value = '';
        app().tray('more', v);
      }}><input id="moreInput" ref={inp} maxLength={60} placeholder="AI로 장소 더 찾기 · 예) 비 오는 날" autoComplete="off" /><button className="small-btn primary" type="submit" id="moreBtn">찾기</button></form>
      <p className="ai-status" id="moreSt" style={{ margin: '0 0 8px' }}></p>
      <p className="rec-st" id="recSt" hidden={!p.rec}>{p.rec}</p>
      <div className="seg" role="group" aria-label="묶어 보기">{GROUPS.map(([k, t]) => <button key={k} className="fchip" data-group={k} aria-pressed={p.group === k} onClick={() => app().tray('group', k)}>{t}</button>)}</div>
      <div className="filters" id="filters"></div>
      <label className="toggle"><input type="checkbox" id="openOnly" defaultChecked onChange={() => app().tray('open')} />{' '}이 날 문 여는 곳만</label>
      <div className="cards" id="cards"></div>
    </>
  );
}

export interface MapTopProps {
  /** "전체" is chosen (else 이 날) */
  all: boolean;
  /** 내 위치 is on */
  me: boolean;
}

export function MapTop(p: MapTopProps) {
  return (
    <div className="map-top"><h2 style={{ margin: 0, flex: 1 }}>지도</h2>
      <div className="radio" role="group" aria-label="보기">
        <button type="button" data-mapday="day" aria-pressed={!p.all} onClick={() => app().mapTop('day')}>이 날</button>
        <button type="button" data-mapday="all" aria-pressed={p.all} onClick={() => app().mapTop('all')}>전체</button>
      </div>
      <button className="small-btn" type="button" id="mapMe" aria-pressed={p.me} onClick={() => app().mapTop('me')}>내 위치</button></div>
  );
}

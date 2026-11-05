// Frames around other screens that used to be fixed HTML in body.html: the 예약 도우미 frame (#helper), the
// 처음 안내 bubble (#coach) and the "넣을 시간을 탭하세요" banner (#banner). The old code keeps what they show
// (step, text, open or not) and draws them again through JEPI_UI.mount; the buttons tell the old code through the host.
import { useState, type RefObject } from 'react';
import { app } from '../ui/host';
import { useHandle } from '../ui/live';

export interface HelperFrameProps {
  open: boolean;
  /** "1 / 4" and the step's title */
  step: string; title: string;
  prevOff: boolean;
  nextLabel: string;
}

/** 예약 도우미: the frame; the step itself (HelperBody) is drawn by the old code into #helperBody. */
export function HelperFrame(p: HelperFrameProps) {
  return (
    <div className="onb-bg" id="helper" hidden={!p.open}><div className="onb" role="dialog" aria-modal="true" aria-labelledby="helperTitle">
      <div className="onb-top"><span className="mono" id="helperStep">{p.step}</span><span>예약 도우미</span></div>
      <h2 id="helperTitle">{p.title}</h2>
      <div id="helperBody"></div>
      <div className="onb-nav"><button className="small-btn" id="helperPrev" disabled={p.prevOff} onClick={() => app().helperFrame('prev')}>이전</button><span style={{ flex: 1 }}></span><button className="small-btn" id="helperClose" onClick={() => app().helperFrame('close')}>닫기</button><button className="small-btn primary" id="helperNext" onClick={() => app().helperFrame('next')}>{p.nextLabel}</button></div>
    </div></div>
  );
}

export interface CoachProps {
  open: boolean;
  /** which step (undefined = none shown yet), its text, "2 / 5" and the last step's button */
  i?: number; text: string; step: string; last: boolean;
}

/** 처음 안내: the bubble. */
export function Coach(p: CoachProps) {
  return (
    <div className="coach" id="coach" hidden={!p.open} role="dialog" aria-live="polite" data-i={p.i}><p id="coachText">{p.text}</p><div className="row"><span className="mono" id="coachStep">{p.step}</span><span style={{ flex: 1 }}></span><button className="small-btn" id="coachSkip" onClick={() => app().coach('skip')}>건너뛰기</button><button className="small-btn primary" id="coachNext" onClick={() => app().coach('next')}>{p.last ? '시작하기' : '다음'}</button></div></div>
  );
}

export interface BannerProps { open: boolean; text: string }

/** 장소를 고른 뒤 일정표 위에 뜨는 안내 줄. */
export function Banner(p: BannerProps) {
  return <div className="banner" id="banner" hidden={!p.open}><span id="bannerText">{p.text}</span><button id="bannerCancel" onClick={() => app().banner('cancel')}>취소</button></div>;
}

export interface OnbFrameProps {
  open: boolean;
  /** "1 / 3", the title and the line under it */
  step: string; title: string; sub: string;
  prevOff: boolean; prevHidden: boolean;
  nextLabel: string; nextOff: boolean; nextHidden: boolean;
  skipLabel: string; skipOff: boolean; skipHidden: boolean;
  /** 데모 둘러보기 is locked while something is being prepared */
  exampleOff: boolean;
}

/** 처음 설정: the frame; the questions (OnbBody) are drawn by the old code into #onbBody. */
export function OnbFrame(p: OnbFrameProps) {
  // 다음 may be relabelled while the old code prepares something ("준비하는 중…", see live.tsx)
  const [l, setL] = useState<string | null>(null);
  const next = useHandle({ label: setL });
  return (
    <div className="onb-bg" id="onb" hidden={!p.open}><div className="onb" role="dialog" aria-modal="true" aria-labelledby="onbTitle">
      <div className="onb-top"><span className="mono" id="onbStep">{p.step}</span><span className="mono" style={{ fontSize: '11px', color: 'var(--muted)', marginLeft: '8px' }}>v35</span><button className="small-btn" id="onbExample" disabled={p.exampleOff} onClick={() => app().onbFrame('example')}>데모 둘러보기</button></div>
      <h2 id="onbTitle">{p.title}</h2><p className="onb-sub" id="onbSub">{p.sub}</p>
      <div id="onbBody"></div>
      <div className="onb-nav"><button className="small-btn" id="onbPrev" disabled={p.prevOff} hidden={p.prevHidden} onClick={() => app().onbFrame('prev')}>이전</button><span style={{ flex: 1 }}></span><button className="small-btn" id="onbSkip" disabled={p.skipOff} hidden={p.skipHidden} onClick={() => app().onbFrame('skip')}>{p.skipLabel}</button><button className="small-btn primary" id="onbNext" disabled={p.nextOff} hidden={p.nextHidden} onClick={() => app().onbFrame('next')} ref={next as RefObject<HTMLButtonElement>}>{l ?? p.nextLabel}</button></div>
    </div></div>
  );
}

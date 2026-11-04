// 더보기 → 알림 (it used to be PANELS.notify in src/js/386-notify.js).
// The buttons do the work themselves (app/data/alerts.ts: subscribing, the server); names data-ntf / data-nset stay.
import * as alerts from '../data/alerts';
export interface NotifySettings {
  on: boolean;
  /** every block (true) or only the blocks with 🔔 (false) */
  all: boolean;
  /** minutes before */
  lead: number;
  /** count back the travel time to the next place */
  depart: boolean;
  morning: boolean;
}

export interface NotifyPanelProps {
  /** demo: not available · ios-home: iPhone/iPad outside the home-screen app · unsupported: this browser can't
   *  · login: not logged in · ready: can turn on/off */
  mode: 'demo' | 'ios-home' | 'unsupported' | 'login' | 'ready';
  settings: NotifySettings;
  /** turning on/off or sending a test is running */
  busy: boolean;
  msg: string;
  /** the trip's time zone, e.g. Asia/Tokyo */
  tz: string;
}

type Opt = [string | number, string];

function Radio({ k, opts, value }: { k: string; opts: Opt[]; value: unknown }) {
  return (
    <div className="radio">
      {opts.map(([v, l]) => (
        <button key={String(v)} type="button" data-nset={k} data-val={String(v)} aria-pressed={String(value) === String(v)}
          onClick={() => alerts.set(k as 'all' | 'lead' | 'depart' | 'morning', v === 'true' ? true : v === 'false' ? false : +v)}>{l}</button>
      ))}
    </div>
  );
}

function Device({ mode, on, busy }: { mode: NotifyPanelProps['mode']; on: boolean; busy: boolean }) {
  if (mode === 'ios-home') return <>
    <p className="hint" style={{ marginTop: 0 }}>아이폰·아이패드는 <b>홈 화면에 추가한 JEPI</b>에서만 알림을 받을 수 있어요 (iOS 16.4 이상).</p>
    <ol className="hint fr-list">
      <li>사파리에서 공유 버튼 → <b>홈 화면에 추가</b></li>
      <li>홈 화면의 JEPI를 열고 여기로 다시 오기</li>
      <li>이 기기에서 알림 받기를 켜기</li>
    </ol>
  </>;
  if (mode === 'unsupported') return <p className="hint" style={{ margin: 0 }}>이 브라우저는 알림을 지원하지 않아요. 크롬이나 홈 화면에 추가한 앱에서 열어 주세요.</p>;
  if (mode === 'login') return <>
    <p className="hint" style={{ marginTop: 0 }}>알림은 로그인한 기기로 보내요.</p>
    <div className="row"><button className="small-btn primary" data-tab="settings">로그인하러 가기</button></div>
  </>;
  return <>
    <div className="srow" style={{ margin: 0 }}>
      <span><b>이 기기에서 알림 받기</b><br /><small className="hint">{on ? '켜져 있어요' : '꺼져 있어요'}</small></span>
      <button className={'small-btn' + (on ? '' : ' primary')} type="button" data-ntf={on ? 'off' : 'on'} disabled={busy} onClick={() => alerts.run(on ? 'off' : 'on')}>{on ? '끄기' : '켜기'}</button>
    </div>
    {on && <div className="row"><button className="small-btn" type="button" data-ntf="test" disabled={busy} onClick={() => alerts.run('test')}>테스트 알림 보내기</button></div>}
  </>;
}

export function NotifyPanel(p: NotifyPanelProps) {
  if (p.mode === 'demo') return <div className="mgroup pad"><p className="hint" style={{ margin: 0 }}>데모에서는 알림을 쓸 수 없어요.</p></div>;
  const s = p.settings;
  return (
    <>
      <div className="mgroup pad">
        <Device mode={p.mode} on={s.on} busy={p.busy} />
        {p.msg && <p className="hint">{p.msg}</p>}
      </div>
      <div className="mgroup pad">
        <h3 className="taste-h">어떤 일정에 알릴까요</h3>
        <div className="srow"><span>일정마다</span><Radio k="all" value={s.all} opts={[['false', '고른 일정만'], ['true', '모든 일정']]} /></div>
        <p className="hint">일정 블록을 누르면 🔔 알림 켜기로 하나씩 고를 수 있어요.</p>
        <div className="srow"><span>언제</span><Radio k="lead" value={s.lead} opts={[[5, '5분 전'], [10, '10분 전'], [15, '15분 전'], [30, '30분 전']]} /></div>
        <div className="srow"><span>기준</span><Radio k="depart" value={s.depart} opts={[['true', '출발할 때'], ['false', '시작할 때']]} /></div>
        <p className="hint">출발할 때: 다음 장소까지 이동 시간을 빼고 "이제 나가야 해요"를 알려요.</p>
        <div className="srow"><span>아침 일정 요약</span><Radio k="morning" value={s.morning} opts={[['true', '받기'], ['false', '안 받기']]} /></div>
      </div>
      <p className="hint">{`알림은 지금 열어 둔 여행 기준으로 준비돼요. 시간은 여행지 현지 시간(${p.tz})이에요. 저전력 모드에서는 조금 늦게 올 수 있어요.`}</p>
    </>
  );
}

// 첫 화면 (#welcomeBox): 새 여행 만들기 / 이미 계정이 있어요 / 데모 둘러보기, the login or 초대 받은 form, and "메일을 보냈어요".
// It used to be renderWelcome in src/js/381-welcome-demo.js. Drawn fresh every time (rev): after a failed login the
// password box is empty again, like before. Clicks and the form are read by the old code (data-w, ids w…).
import { Fragment } from 'react';

export interface WelcomeProps {
  view: 'pick' | 'login' | 'join' | 'sent';
  /** the 초대 form: 가입 chosen instead of 로그인 */
  joinMode: boolean;
  email: string;
  busy: boolean;
  err: string;
  rev: number;
}

export function Welcome(p: WelcomeProps) {
  if (p.view === 'sent') return (
    <Fragment key={p.rev}>
      <button className="linkbtn w-back" data-w="login">← 로그인으로</button><h2 className="w-h">메일을 보냈어요</h2>
      <p className="w-sub"><b>{p.email}</b>로 비밀번호 재설정 링크를 보냈어요. 이 기기에서 링크를 누르면 새 비밀번호를 정할 수 있어요.</p>
    </Fragment>
  );
  if (p.view === 'login' || p.view === 'join') {
    const inv = p.view === 'join', J = p.joinMode;
    return (
      <Fragment key={p.rev}>
        {!inv && <button className="linkbtn w-back" data-w="back">← 처음으로</button>}
        <h2 className="w-h">{inv ? '친구가 여행에 초대했어요' : '로그인'}</h2>
        <p className="w-sub">{inv ? '로그인하거나 처음이면 가입하면 바로 같은 일정에 참여해요.' : '다른 기기에서 만든 계획과 AI·지도 연결을 그대로 가져와요.'}</p>
        {inv && <div className="radio" style={{ margin: '0 0 8px' }}><button type="button" data-w="mode-login" aria-pressed={!J}>로그인</button><button type="button" data-w="mode-join" aria-pressed={J}>처음이에요 (가입)</button></div>}
        <form id="wForm" className="sb-form">
          <input id="wEmail" type="email" placeholder="이메일" autoComplete="email" defaultValue={p.email} required />
          <input id="wPw" type="password" placeholder={J ? '비밀번호 (6자 이상)' : '비밀번호'} autoComplete={J ? 'new-password' : 'current-password'} minLength={6} required />
          <button className="w-go" type="submit" id="wGo" disabled={p.busy}>{p.busy ? '잠시만요…' : J ? '가입하고 참여하기' : inv ? '로그인하고 참여하기' : '로그인'}</button>
        </form>
        {p.err && <p className="w-err">{`✕ ${p.err}`}</p>}
        <div className="w-links"><button className="linkbtn" data-w="forgot">비밀번호를 잊었어요</button><button className="linkbtn" data-w="new">계정 없이 시작하기</button></div>
      </Fragment>
    );
  }
  return (
    <Fragment key={p.rev}>
      <div className="w-logo"><b>JEPI</b><span>우리의 삶은 계획과 우연의 연속</span></div>
      <div className="w-choices">
        <button className="w-card primary" data-w="new"><b>새 여행 만들기</b><small>어디로 갈지 아직 몰라도 괜찮아요</small></button>
        <button className="w-card" data-w="login"><b>이미 계정이 있어요</b><small>로그인하면 다른 기기의 계획을 가져와요</small></button>
        <button className="w-card" data-w="demo"><b>데모 둘러보기</b><small>오사카 3박 4일 예시 · 끝내면 아무것도 남지 않아요</small></button>
      </div>
    </Fragment>
  );
}

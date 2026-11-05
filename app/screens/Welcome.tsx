// 첫 화면 (#welcomeBox): 새 여행 만들기 / 이미 계정이 있어요 / 데모 둘러보기, the login or 초대 받은 form, and "메일을 보냈어요".
// It used to be renderWelcome and its click / submit handlers in src/js/381-welcome-demo.js. It keeps which view shows,
// 로그인/가입, "잠시만요…" and the error itself, logs in through app/data/account.ts, and asks the old code (host) to start a
// new trip, open the demo, or open what came with the account.
import { Fragment, useEffect, useRef, useState } from 'react';
import * as account from '../data/account';
import { SYNC, saveSync, sbAuth } from '../data/server';
import { syncNow } from '../data/sync';
import { app } from '../ui/host';

export interface WelcomeProps {
  /** where it starts: the three choices, the login form, or the 초대 form */
  view: 'pick' | 'login' | 'join';
  email: string;
  rev: number;
}

export function Welcome(p: WelcomeProps) {
  return <Screen key={p.rev} {...p} />;
}

function Screen(p: WelcomeProps) {
  const [view, setView] = useState<'pick' | 'login' | 'join' | 'sent'>(p.view);
  const [J, setJ] = useState(false), [busy, setBusy] = useState(false), [err, setErr] = useState('');
  const em = useRef<HTMLInputElement>(null), pw = useRef<HTMLInputElement>(null);
  useEffect(() => { if (view === 'login' && em.current && !em.current.value) em.current.focus() }, [view]);
  const go = (v: 'pick' | 'login') => { setView(v); setErr('') };
  const login = async () => {
    setBusy(true); setErr('');
    try { await account.signIn((em.current?.value || '').trim(), pw.current?.value || '', J); await syncNow(); await app().welcomeLoggedIn() }
    catch (e) { setBusy(false); setErr(account.errText((e as Error).message)); if (pw.current) pw.current.value = '' }   // an empty password box after a failed try, as before
  };
  const forgot = async () => {
    const e = (em.current?.value || '').trim();
    if (!/^\S+@\S+\.\S+$/.test(e)) { setErr('이메일을 먼저 넣어 주세요.'); return }
    SYNC.email = e; saveSync();
    try { await sbAuth('/auth/v1/recover?redirect_to=' + encodeURIComponent(location.origin + location.pathname), { email: e }); setView('sent') } catch (x) { setErr((x as Error).message) }
  };
  if (view === 'sent') return (
    <Fragment>
      <button className="linkbtn w-back" data-w="login" onClick={() => go('login')}>← 로그인으로</button><h2 className="w-h">메일을 보냈어요</h2>
      <p className="w-sub"><b>{SYNC.email || p.email}</b>로 비밀번호 재설정 링크를 보냈어요. 이 기기에서 링크를 누르면 새 비밀번호를 정할 수 있어요.</p>
    </Fragment>
  );
  if (view === 'login' || view === 'join') {
    const inv = view === 'join';
    return (
      <Fragment>
        {!inv && <button className="linkbtn w-back" data-w="back" onClick={() => go('pick')}>← 처음으로</button>}
        <h2 className="w-h">{inv ? '친구가 여행에 초대했어요' : '로그인'}</h2>
        <p className="w-sub">{inv ? '로그인하거나 처음이면 가입하면 바로 같은 일정에 참여해요.' : '다른 기기에서 만든 계획과 AI·지도 연결을 그대로 가져와요.'}</p>
        {inv && <div className="radio" style={{ margin: '0 0 8px' }}>
          <button type="button" data-w="mode-login" aria-pressed={!J} onClick={() => { setJ(false); setErr('') }}>로그인</button>
          <button type="button" data-w="mode-join" aria-pressed={J} onClick={() => { setJ(true); setErr('') }}>처음이에요 (가입)</button>
        </div>}
        <form id="wForm" className="sb-form" onSubmit={e => { e.preventDefault(); login() }}>
          <input id="wEmail" ref={em} type="email" placeholder="이메일" autoComplete="email" defaultValue={p.email} required />
          <input id="wPw" ref={pw} type="password" placeholder={J ? '비밀번호 (6자 이상)' : '비밀번호'} autoComplete={J ? 'new-password' : 'current-password'} minLength={6} required />
          <button className="w-go" type="submit" id="wGo" disabled={busy}>{busy ? '잠시만요…' : J ? '가입하고 참여하기' : inv ? '로그인하고 참여하기' : '로그인'}</button>
        </form>
        {err && <p className="w-err">{`✕ ${err}`}</p>}
        <div className="w-links"><button className="linkbtn" data-w="forgot" onClick={forgot}>비밀번호를 잊었어요</button><button className="linkbtn" data-w="new" onClick={() => app().welcomeNew()}>계정 없이 시작하기</button></div>
      </Fragment>
    );
  }
  return (
    <Fragment>
      <div className="w-logo"><b>JEPI</b><span>우리의 삶은 계획과 우연의 연속</span></div>
      <div className="w-choices">
        <button className="w-card primary" data-w="new" onClick={() => app().welcomeNew()}><b>새 여행 만들기</b><small>어디로 갈지 아직 몰라도 괜찮아요</small></button>
        <button className="w-card" data-w="login" onClick={() => go('login')}><b>이미 계정이 있어요</b><small>로그인하면 다른 기기의 계획을 가져와요</small></button>
        <button className="w-card" data-w="demo" onClick={() => app().welcomeDemo()}><b>데모 둘러보기</b><small>오사카 3박 4일 예시 · 끝내면 아무것도 남지 않아요</small></button>
      </div>
    </Fragment>
  );
}

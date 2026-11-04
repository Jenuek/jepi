// 설정 → 기기 간 동기화 (it used to be syncHTML in src/js/310-sync.js).
// The buttons and forms do the work themselves (app/data/account.ts); the boxes keep their ids.
// Passwords are never passed in or kept in state: they are read from the boxes only when the form is sent.
import { useRef, useState } from 'react';
import * as account from '../data/account';
import { syncNow } from '../data/sync';
export interface SyncSectionProps {
  /** setup: server address · reset: password-reset mail sent · login / join: the form
   *  · newpw: choose a new password · on: logged in */
  mode: 'setup' | 'reset' | 'login' | 'join' | 'newpw' | 'on';
  url: string;
  /** a key is saved already (the box stays empty) */
  hasKey: boolean;
  email: string;
  /** error message ('' = none) */
  err: string;
  /** sending or receiving right now */
  busy: boolean;
  /** last finished sync (ms), 0 = never */
  lastAt: number;
  /** logged in, but this device has no lock key for the AI·map keys */
  vkMissing: boolean;
  keysLocked: boolean;
}

const Err = ({ err }: { err: string }) => (err ? <small className="kmsg">{'✕ ' + err}</small> : null);
const noAuto = { autoComplete: 'off', autoCapitalize: 'off', spellCheck: false } as const;
const hm = (t: number) => { const d = new Date(t); return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}` };
const WARN = { color: 'var(--warn,#b45309)' };
const val = (id: string) => ((document.getElementById(id) as HTMLInputElement | null)?.value || '');

/** 로그인 / 가입: the button says 잠시만요… and is locked while it works */
function LoginForm({ join, email }: { join: boolean; email: string }) {
  const [busy, setBusy] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  return (
    <form id="sbForm" className="sb-form" ref={form} onSubmit={async e => {
      e.preventDefault(); if (busy) return; setBusy(true);
      await account.submitLogin(val('sbEmail').trim(), val('sbPw'), val('sbPw2'));
      if (form.current) setBusy(false);   // still drawn (the section is usually drawn fresh anyway)
    }}>
      <input id="sbEmail" type="email" defaultValue={email} placeholder="이메일" autoComplete="email" required />
      <input id="sbPw" type="password" placeholder={join ? '비밀번호 (6자 이상)' : '비밀번호'} autoComplete={join ? 'new-password' : 'current-password'} minLength={6} required />
      {join && <input id="sbPw2" type="password" placeholder="비밀번호 한 번 더" autoComplete="new-password" minLength={6} required />}
      <button className="small-btn primary" type="submit" id="sbGo" disabled={busy}>{busy ? '잠시만요…' : join ? '가입하고 동기화 켜기' : '로그인'}</button>
    </form>
  );
}
function VerifyButton() {
  const [busy, setBusy] = useState(false);
  return <button className="small-btn primary" type="button" id="sbVerify" disabled={busy} onClick={async () => { setBusy(true); await account.verify(val('sbCode')); setBusy(false) }}>확인</button>;
}

export function SyncSection(p: SyncSectionProps) {
  if (p.mode === 'setup') return (
    <div className="mgroup pad">
      <p className="hint" style={{ marginTop: 0 }}>Supabase 프로젝트의 <b>Project URL</b>과 <b>anon(또는 publishable) 키</b>를 넣어 주세요. 대시보드 → Project Settings → API에 있어요.</p>
      <label className="fg" style={{ display: 'block' }}><span className="hint">Project URL</span><input id="sbUrl" defaultValue={p.url} placeholder="https://xxxx.supabase.co" {...noAuto} /></label>
      <label className="fg" style={{ display: 'block', marginTop: 6 }}><span className="hint">anon / publishable 키</span><input id="sbKey" type="password" defaultValue="" placeholder={p.hasKey ? '저장됨 · 바꿀 때만 입력' : 'eyJ… 또는 sb_publishable_…'} {...noAuto} /></label>
      <div className="row" style={{ marginTop: 8 }}>
        <button className="small-btn primary" type="button" id="sbSave" onClick={() => account.saveServer(val('sbUrl'), val('sbKey'))}>저장</button>
        {p.url && p.hasKey && <button className="small-btn" type="button" id="sbCancel" onClick={() => account.setup(false)}>취소</button>}
      </div>
      <Err err={p.err} />
    </div>
  );
  if (p.mode === 'reset') return (
    <div className="mgroup pad">
      <p className="hint" style={{ marginTop: 0 }}><b>{p.email}</b>로 비밀번호 재설정 메일을 보냈어요. 메일의 링크를 이 기기에서 누르거나, 길게 눌러 복사해서 아래에 붙여 넣어 주세요.</p>
      <div className="kin"><input id="sbCode" {...noAuto} placeholder="https://…supabase.co/auth/v1/verify?token=…" /><VerifyButton /></div>
      <Err err={p.err} />
      <div className="row"><button className="small-btn" type="button" id="sbBack" onClick={account.back}>로그인으로</button></div>
    </div>
  );
  if (p.mode === 'login' || p.mode === 'join') {
    const join = p.mode === 'join';
    return (
      <div className="mgroup pad">
        <div className="radio" role="tablist" style={{ margin: '0 0 8px' }}>
          <button type="button" data-sbmode="login" aria-pressed={!join} onClick={() => account.mode('login')}>로그인</button>
          <button type="button" data-sbmode="join" aria-pressed={join} onClick={() => account.mode('join')}>처음이에요 (가입)</button>
        </div>
        <p className="hint" style={{ marginTop: 0 }}>{join ? '처음 한 번만 가입해요. 폰과 아이패드에서 같은 이메일·비밀번호로 로그인하면 계획이 맞춰져요.' : '가입한 이메일과 비밀번호로 로그인해요. 한 번 로그인하면 이 기기에서는 계속 유지돼요.'}</p>
        {/* key: switching 로그인 ↔ 가입 starts with fresh boxes, as before */}
        <LoginForm key={p.mode} join={join} email={p.email} />
        <Err err={p.err} />
        <div className="row">
          {!join && <button className="small-btn" type="button" id="sbForgot" onClick={() => account.forgot(val('sbEmail'))}>비밀번호를 잊었어요</button>}
          <button className="small-btn" type="button" id="sbSetup" onClick={() => account.setup(true)}>서버 주소 바꾸기</button>
        </div>
      </div>
    );
  }
  if (p.mode === 'newpw') return (
    <div className="mgroup pad">
      <p className="hint" style={{ marginTop: 0 }}>새 비밀번호를 정해 주세요.</p>
      <form id="sbPwForm" className="sb-form" onSubmit={e => { e.preventDefault(); account.newPassword(val('sbNew')) }}><input id="sbNew" type="password" placeholder="새 비밀번호 (6자 이상)" autoComplete="new-password" minLength={6} required /><button className="small-btn primary" type="submit">저장</button></form>
      <Err err={p.err} />
    </div>
  );
  return (
    <div className="mgroup pad">
      <div className="srow" style={{ margin: 0 }}>
        <span><b>{'☁️ ' + p.email}</b><br /><small className="hint">{p.busy ? '맞추는 중…' : p.err ? '✕ ' + p.err : p.lastAt ? '마지막 동기화 ' + hm(p.lastAt) : '아직 동기화 전'}</small></span>
        <span className={'mchip ' + (p.err ? 'warn' : 'ok')}>{p.err ? '확인 필요' : '켜짐'}</span>
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        <button className="small-btn primary" type="button" id="sbNow" onClick={() => { syncNow(); account.back() }}>지금 동기화</button>
        <button className="small-btn" type="button" id="sbOut" onClick={account.logout}>로그아웃</button>
      </div>
      <p className="hint">계획, 취향 키워드, 내 장소, AI·지도 키가 맞춰져요. 키는 비밀번호로 암호화해서 올라가서 서버에서도 알아볼 수 없어요.</p>
      {p.vkMissing ? <p className="hint" style={WARN}>키까지 맞추려면 로그아웃했다가 다시 로그인해 주세요.</p>
        : p.keysLocked ? <p className="hint" style={WARN}>서버의 키가 다른 비밀번호로 잠겨 있어요. 비밀번호를 바꿨다면 키가 있는 기기에서 다시 로그인해 주세요.</p> : null}
    </div>
  );
}

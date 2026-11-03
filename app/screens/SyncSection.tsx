// 설정 → 기기 간 동기화 (it used to be syncHTML in src/js/310-sync.js).
// The boxes and buttons keep their ids: the old code reads what was typed and does the login.
// Passwords are never passed in or kept here; they stay in the input boxes until the old code reads them.
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

export function SyncSection(p: SyncSectionProps) {
  if (p.mode === 'setup') return (
    <div className="mgroup pad">
      <p className="hint" style={{ marginTop: 0 }}>Supabase 프로젝트의 <b>Project URL</b>과 <b>anon(또는 publishable) 키</b>를 넣어 주세요. 대시보드 → Project Settings → API에 있어요.</p>
      <label className="fg" style={{ display: 'block' }}><span className="hint">Project URL</span><input id="sbUrl" defaultValue={p.url} placeholder="https://xxxx.supabase.co" {...noAuto} /></label>
      <label className="fg" style={{ display: 'block', marginTop: 6 }}><span className="hint">anon / publishable 키</span><input id="sbKey" type="password" defaultValue="" placeholder={p.hasKey ? '저장됨 · 바꿀 때만 입력' : 'eyJ… 또는 sb_publishable_…'} {...noAuto} /></label>
      <div className="row" style={{ marginTop: 8 }}>
        <button className="small-btn primary" type="button" id="sbSave">저장</button>
        {p.url && p.hasKey && <button className="small-btn" type="button" id="sbCancel">취소</button>}
      </div>
      <Err err={p.err} />
    </div>
  );
  if (p.mode === 'reset') return (
    <div className="mgroup pad">
      <p className="hint" style={{ marginTop: 0 }}><b>{p.email}</b>로 비밀번호 재설정 메일을 보냈어요. 메일의 링크를 이 기기에서 누르거나, 길게 눌러 복사해서 아래에 붙여 넣어 주세요.</p>
      <div className="kin"><input id="sbCode" {...noAuto} placeholder="https://…supabase.co/auth/v1/verify?token=…" /><button className="small-btn primary" type="button" id="sbVerify">확인</button></div>
      <Err err={p.err} />
      <div className="row"><button className="small-btn" type="button" id="sbBack">로그인으로</button></div>
    </div>
  );
  if (p.mode === 'login' || p.mode === 'join') {
    const join = p.mode === 'join';
    return (
      <div className="mgroup pad">
        <div className="radio" role="tablist" style={{ margin: '0 0 8px' }}>
          <button type="button" data-sbmode="login" aria-pressed={!join}>로그인</button>
          <button type="button" data-sbmode="join" aria-pressed={join}>처음이에요 (가입)</button>
        </div>
        <p className="hint" style={{ marginTop: 0 }}>{join ? '처음 한 번만 가입해요. 폰과 아이패드에서 같은 이메일·비밀번호로 로그인하면 계획이 맞춰져요.' : '가입한 이메일과 비밀번호로 로그인해요. 한 번 로그인하면 이 기기에서는 계속 유지돼요.'}</p>
        {/* key: switching 로그인 ↔ 가입 starts with fresh boxes, as before */}
        <form id="sbForm" className="sb-form" key={p.mode}>
          <input id="sbEmail" type="email" defaultValue={p.email} placeholder="이메일" autoComplete="email" required />
          <input id="sbPw" type="password" placeholder={join ? '비밀번호 (6자 이상)' : '비밀번호'} autoComplete={join ? 'new-password' : 'current-password'} minLength={6} required />
          {join && <input id="sbPw2" type="password" placeholder="비밀번호 한 번 더" autoComplete="new-password" minLength={6} required />}
          <button className="small-btn primary" type="submit" id="sbGo">{join ? '가입하고 동기화 켜기' : '로그인'}</button>
        </form>
        <Err err={p.err} />
        <div className="row">
          {!join && <button className="small-btn" type="button" id="sbForgot">비밀번호를 잊었어요</button>}
          <button className="small-btn" type="button" id="sbSetup">서버 주소 바꾸기</button>
        </div>
      </div>
    );
  }
  if (p.mode === 'newpw') return (
    <div className="mgroup pad">
      <p className="hint" style={{ marginTop: 0 }}>새 비밀번호를 정해 주세요.</p>
      <form id="sbPwForm" className="sb-form"><input id="sbNew" type="password" placeholder="새 비밀번호 (6자 이상)" autoComplete="new-password" minLength={6} required /><button className="small-btn primary" type="submit">저장</button></form>
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
        <button className="small-btn primary" type="button" id="sbNow">지금 동기화</button>
        <button className="small-btn" type="button" id="sbOut">로그아웃</button>
      </div>
      <p className="hint">계획, 취향 키워드, 내 장소, AI·지도 키가 맞춰져요. 키는 비밀번호로 암호화해서 올라가서 서버에서도 알아볼 수 없어요.</p>
      {p.vkMissing ? <p className="hint" style={WARN}>키까지 맞추려면 로그아웃했다가 다시 로그인해 주세요.</p>
        : p.keysLocked ? <p className="hint" style={WARN}>서버의 키가 다른 비밀번호로 잠겨 있어요. 비밀번호를 바꿨다면 키가 있는 기기에서 다시 로그인해 주세요.</p> : null}
    </div>
  );
}

// 계정: log in / sign up with e-mail + password, password reset, the server address, logging out
// (it used to be the click / submit handlers in src/js/310-sync.js). The 동기화 section in 설정 and the first screen call
// these; what to redraw and say comes through connectAccount(host).
import * as storage from './storage';
import { appError } from './errors';
import { SYNC, saveSync, sbAuth, keepSess, sbToken } from './server';
import { vaultMake } from './vault';
import { status, syncSoon } from './sync';

/** which part of the section shows (setup / reset / join / newpw; '' = login or logged in), and the last error */
export const state = { step: '' as '' | 'setup' | 'reset' | 'join' | 'newpw', err: '' };

interface Host { redraw(): void; toast(msg: string): void; syncNow(): Promise<void> }
let host: Host | null = null;
export function connectAccount(h: Host): void { host = h }
const H = () => { if (!host) throw new Error('account not connected'); return host };
const done = () => H().redraw();

/** Supabase's messages in the app's words */
export function errText(m: string): string {
  return /already registered|already exists/i.test(m) ? '이미 가입된 이메일이에요. "로그인"으로 들어가 주세요.'
    : /invalid login|invalid_credentials|Invalid login/i.test(m) ? '이메일이나 비밀번호가 맞지 않아요.'
    : /Email not confirmed/i.test(m) ? '메일 확인이 켜져 있어요. Supabase에서 Confirm email을 꺼 주세요.'
    : /Password should|weak/i.test(m) ? '비밀번호는 6자 이상으로 해 주세요.'
    : /signups not allowed/i.test(m) ? '가입이 꺼져 있어요 (Supabase 설정).' : m;
}
const validEmail = (em: string) => /^\S+@\S+\.\S+$/.test(em);
const linkBack = (em: string) => location.origin + location.pathname + '?sb=' + encodeURIComponent(btoa(JSON.stringify({ u: SYNC.url, k: SYNC.key, e: em })));

/** sign up or log in; also makes this device's key-unlocking key (AI·map keys stay encrypted with the password) */
export async function signIn(em: string, pw: string, join: boolean): Promise<void> {
  SYNC.email = em; saveSync();
  const j = join ? await sbAuth('/auth/v1/signup', { email: em, password: pw }) : await sbAuth('/auth/v1/token?grant_type=password', { email: em, password: pw });
  const sess = j.access_token ? j : (j.session || null);
  if (!sess || !sess.access_token) throw appError('auth', '메일 확인이 켜져 있어서 바로 로그인되지 않았어요. Supabase에서 Confirm email을 꺼 주세요.');
  try { await vaultMake(em, pw) } catch { /* the keys just won't sync */ }
  keepSess(Object.assign({}, sess, { user: sess.user || j.user })); state.err = ''; SYNC.sent = {}; SYNC.lastPull = 0; saveSync();
}

/** the 로그인 / 가입 form; false when it did not work (the message is in state.err) */
export async function submitLogin(em: string, pw: string, pw2: string): Promise<boolean> {
  const join = state.step === 'join';
  if (em) { SYNC.email = em; saveSync() }
  if (join && pw !== pw2) { state.err = '두 비밀번호가 달라요.'; done(); return false }
  try {
    state.step = ''; await signIn(em, pw, join); done(); await H().syncNow();
    H().toast(join ? '가입했어요 · 동기화를 켰어요' : '로그인했어요 · 동기화를 켰어요'); return true;
  } catch (e) { if (join) state.step = 'join'; state.err = errText((e as Error).message); done(); return false }
}

/** 로그인 / 처음이에요 (가입) */
export function mode(m: 'login' | 'join'): void { state.step = m === 'join' ? 'join' : ''; state.err = ''; done() }

/** 비밀번호를 잊었어요: a reset mail */
export async function forgot(em: string): Promise<void> {
  em = (em || SYNC.email || '').trim();
  if (!validEmail(em)) { state.err = '이메일을 먼저 넣어 주세요.'; done(); return }
  SYNC.email = em; saveSync();
  try { await sbAuth('/auth/v1/recover?redirect_to=' + encodeURIComponent(linkBack(em)), { email: em }); state.step = 'reset'; state.err = '' } catch (e) { state.err = (e as Error).message }
  done();
}

/** a link from the mail (or a code) pasted in */
export async function verifyInput(v: string): Promise<any> {
  let th: string | null = null, ty = 'email';
  try { const u = new URL(v); th = u.searchParams.get('token') || u.searchParams.get('token_hash'); ty = u.searchParams.get('type') || 'magiclink' } catch { /* not a link */ }
  if (th) {
    if (/^pkce_/.test(th)) throw appError('auth', '이 링크는 이 방식으로 쓸 수 없어요. 링크를 이 기기에서 직접 눌러 주세요.');
    return sbAuth('/auth/v1/verify', { type: ty === 'signup' ? 'signup' : ty === 'recovery' ? 'recovery' : 'magiclink', token_hash: th });
  }
  const code = v.replace(/\s/g, ''); if (!/^\d{6,10}$/.test(code)) throw appError('auth', '메일의 Sign in 링크 주소를 통째로 붙여 넣어 주세요.');
  return sbAuth('/auth/v1/verify', { type: 'email', email: SYNC.email, token: code });
}
export async function verify(v: string): Promise<void> {
  v = v.trim(); if (!v) return;
  try {
    const wasReset = state.step === 'reset'; keepSess(await verifyInput(v)); state.step = wasReset ? 'newpw' : ''; state.err = ''; SYNC.sent = {}; SYNC.lastPull = 0; saveSync();
    done(); await H().syncNow(); H().toast('동기화를 켰어요');
  } catch (e) { state.err = (e as Error).message; done() }
}

/** 새 비밀번호: change it, and lock the keys again with it */
export async function newPassword(pw: string): Promise<void> {
  try {
    const tk = await sbToken();
    const r = await fetch(SYNC.url + '/auth/v1/user', { method: 'PUT', headers: { apikey: SYNC.key, Authorization: 'Bearer ' + tk, 'content-type': 'application/json' }, body: JSON.stringify({ password: pw }) });
    if (!r.ok) { let m = ''; try { const j = await r.json(); m = j.msg || j.message || '' } catch { /* */ } throw appError('auth', errText(m || 'HTTP ' + r.status)) }
    try { await vaultMake((SYNC.sess && SYNC.sess.email) || SYNC.email, pw); status.keysLocked = false; SYNC.sent.keys = ''; storage.set('jepi.keysAt', Date.now()); syncSoon(500) } catch { /* */ }
    state.step = ''; state.err = ''; H().toast('새 비밀번호를 저장했어요');
  } catch (e) { state.err = (e as Error).message }
  done();
}

/** 서버 주소 바꾸기 / 취소 / 저장 */
export function setup(open: boolean): void { state.step = open ? 'setup' : ''; done() }
export function saveServer(url: string, key: string): void {
  const u = url.trim().replace(/\/+$/, ''), k = key.trim();
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/i.test(u)) { state.err = '주소는 https://xxxx.supabase.co 모양이에요.'; done(); return }
  if (!k && !SYNC.key) { state.err = '키를 넣어 주세요.'; done(); return }
  if (u !== SYNC.url) { SYNC.sess = null; SYNC.sent = {}; SYNC.lastPull = 0 }
  SYNC.url = u; if (k) SYNC.key = k; state.err = ''; state.step = ''; saveSync(); done();
}
export function back(): void { state.step = ''; done() }
export function logout(): void { storage.del('jepi.vk'); status.keysLocked = false; SYNC.sess = null; SYNC.sent = {}; SYNC.lastPull = 0; saveSync(); state.step = ''; done() }

// Talking to the JEPI server (Supabase): login, keeping the session fresh, reading and writing tables.
// Only the publishable (public) key is here; the server's RLS rules decide which rows a person sees.
import * as storage from './storage';
import { appError } from './errors';
import { DEMO } from './demo';
import type { Session, SyncState } from './types';

/** the built-in server: the publishable key is meant to be public */
export const SB_DEFAULT = { url: 'https://qjzxhcvneorbskpebvca.supabase.co', key: 'sb_publishable_-IUuxuXFsSJQFz4V0we-zA_OIi1AZQH' };

/** Sync settings. The old code shares this very object as SYNC (it reads and changes its fields). */
export const SYNC: SyncState = { url: '', key: '', email: '', sess: null, lastPull: 0, sent: {}, at: 0, msg: '' };

/** Load saved settings (after the demo guard, which may swap storage). */
export function loadSync(): void {
  Object.assign(SYNC, storage.get<Partial<SyncState>>('jepi.sync', {}) || {});
  if (!SYNC.url || !SYNC.key) { SYNC.url = SB_DEFAULT.url; SYNC.key = SB_DEFAULT.key }
}

export function saveSync(): void {
  const { url, key, email, sess, lastPull, sent, at } = SYNC;
  storage.set('jepi.sync', { url, key, email, sess, lastPull, sent, at });
}

/** logged in, and not inside the demo */
export const syncOn = (): boolean => !DEMO.on && !!(SYNC.url && SYNC.key && SYNC.sess && SYNC.sess.access);

const base = () => SYNC.url.replace(/\/$/, '');

/** turn a server message into something a person can act on */
function authMessage(m: string): string {
  if (/rate|seconds/i.test(m)) return '잠시 뒤에 다시 시도해 주세요 (메일 발송 제한).';
  if (/invalid login|invalid_credentials|invalid_grant/i.test(m)) return '이메일이나 비밀번호가 맞지 않아요.';
  if (/already registered|already exists/i.test(m)) return '이미 가입된 이메일이에요. "로그인"으로 들어가 주세요.';
  if (/invalid|expired/i.test(m)) return '링크가 틀렸거나 만료됐어요. 다시 받아 주세요.';
  return m;
}

/** POST to an /auth/v1/... address (sign up, log in, refresh, password mail) */
export async function sbAuth(path: string, body: unknown): Promise<any> {
  let r: Response;
  try {
    r = await fetch(base() + path, { method: 'POST', headers: { apikey: SYNC.key, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  } catch {
    throw appError('network', '서버에 연결하지 못했어요. 주소를 확인해 주세요.');
  }
  let j: any = {};
  try { j = await r.json() } catch { /* empty answer */ }
  if (!r.ok) {
    const m = j.msg || j.error_description || j.message || j.error || ('HTTP ' + r.status);
    throw appError(r.status === 429 ? 'rate_limited' : 'auth', authMessage(m));
  }
  return j;
}

/** remember the session from a login / refresh answer */
export function keepSess(j: any): void {
  const sess: Session = {
    access: j.access_token,
    refresh: j.refresh_token,
    exp: Date.now() + ((+j.expires_in || 3600) - 60) * 1000,
    user: (j.user && j.user.id) || (SYNC.sess && SYNC.sess.user) || undefined,
    email: (j.user && j.user.email) || SYNC.email,
  };
  SYNC.sess = sess;
  saveSync();
}

/** a fresh access token (refreshes it when it ran out) */
export async function sbToken(): Promise<string> {
  if (!syncOn() || !SYNC.sess) throw appError('auth', '로그인이 필요해요');
  if (Date.now() < SYNC.sess.exp) return SYNC.sess.access;
  try {
    keepSess(await sbAuth('/auth/v1/token?grant_type=refresh_token', { refresh_token: SYNC.sess.refresh }));
    return SYNC.sess!.access;
  } catch (e: any) {
    if (e.code === 'auth') { SYNC.sess = null; saveSync() }
    throw e;
  }
}

/** any table (or rpc/<name>), as the logged-in person; rows are limited by RLS on the server */
export async function sbTable(table: string, method: string, q?: string, body?: unknown, prefer?: string): Promise<any> {
  const tk = await sbToken();
  const headers: Record<string, string> = { apikey: SYNC.key, Authorization: 'Bearer ' + tk, 'content-type': 'application/json' };
  if (prefer) headers.Prefer = prefer;
  let r: Response;
  try {
    r = await fetch(base() + '/rest/v1/' + table + (q || ''), { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw appError('network', '오프라인이에요');
  }
  if (r.status === 401) { if (SYNC.sess) SYNC.sess.exp = 0; throw appError('auth', '로그인이 만료됐어요') }
  if (!r.ok) {
    let m = '';
    try { m = (await r.json()).message } catch { /* no message */ }
    throw appError('upstream_error', m || ('HTTP ' + r.status));
  }
  return r.status === 204 ? null : r.json().catch(() => null);
}

/** this person's own documents (jepi_docs) */
export const sbRest = (method: string, q?: string, body?: unknown, prefer?: string) => sbTable('jepi_docs', method, q, body, prefer);

/** a table anyone may read (jepi_recs); sends the login too when there is one */
export async function sbPublicGet(table: string, q: string): Promise<Response> {
  const tk = syncOn() ? await sbToken().catch(() => null) : null;
  const headers: Record<string, string> = { apikey: SYNC.key };
  if (tk) headers.Authorization = 'Bearer ' + tk;
  return fetch(base() + '/rest/v1/' + table + q, { headers });
}

/** address of a server function, e.g. 'jepi-push' */
export const sbFunctionUrl = (name: string): string => base() + '/functions/v1/' + name;

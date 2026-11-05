// 알림 while travelling (it used to be src/js/386-notify.js). This device subscribes once (Web Push). The app writes the
// upcoming reminders of the open plan into jepi_alerts (fire time in UTC); a server function (supabase/functions/jepi-push)
// runs every minute and sends the ones that are due to every device the person turned alerts on.
// Settings: "jepi.notify"; per-block on/off: "jepi.alerts" {planId: {blockKey: true|false}}.
// The screens (panel, 🔔 row in a block's sheet) call the functions here; connectAlerts(host) gives the open plan's days.
import * as storage from './storage';
import { hashStr } from './hash';
import { sbTable, sbFunctionUrl, syncOn } from './server';
import { appError } from './errors';
import { alertList, type AlertRow, type AlertSettings } from '../logic/alerts';
import { fmt } from '../logic/time';

export interface AlertsHost {
  curPlan(): string;
  /** the open plan's days with the blocks that can ring */
  days(): { iso: string; rows: AlertRow[] }[];
  tz(): string;
  demo(): boolean;
  /** redraw what shows alerts (the panel, 🔔 badges) */
  redraw(): void;
}
let host: AlertsHost | null = null;
const H = () => { if (!host) throw new Error('alerts not connected'); return host };

export const settings: AlertSettings & { dev: string } = { on: false, all: false, lead: 10, depart: true, morning: true, dev: '' };
export let perBlock: Record<string, Record<string, boolean>> = {};
/** what the panel shows while it works */
export const ui = { busy: false, msg: '' };
let lastHash = '';

/** read the saved settings when the old code connects (after the demo sandbox is set up) */
export function connectAlerts(h: AlertsHost): void {
  host = h;
  Object.assign(settings, storage.get('jepi.notify', {}) || {});
  perBlock = storage.get('jepi.alerts', {}) || {};
}
const saveSettings = () => storage.set('jepi.notify', settings);
const savePerBlock = () => storage.set('jepi.alerts', perBlock);
export const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
export const isIOS = () => /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const standaloneApp = () => matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
const pushFn = () => sbFunctionUrl('jepi-push');

/** is this block's alert on? (its own choice, else "every block" from the settings) */
export function isOn(key: string): boolean { const m = perBlock[H().curPlan()] || {}; return key in m ? !!m[key] : settings.all }
export function setBlock(key: string, v: boolean): void { (perBlock[H().curPlan()] = perBlock[H().curPlan()] || {})[key] = v; savePerBlock(); soon(400) }
/** one panel setting (all / lead / depart / morning) */
export function set(k: 'all' | 'lead' | 'depart' | 'morning', v: boolean | number): void { (settings as any)[k] = v; saveSettings(); soon(500); H().redraw() }

let timer = 0;
export function soon(ms?: number): void { clearTimeout(timer); timer = window.setTimeout(() => upload().catch(e => { ui.msg = '✕ ' + e.message }), ms || 3000) }

/** send the open plan's upcoming reminders to the server (only when something changed) */
export async function upload(force?: boolean): Promise<void> {
  const h = H(); if (!settings.on || !syncOn() || h.demo()) return;
  const plan = h.curPlan(); if (!plan) return;
  const list = alertList(plan, h.days(), settings, isOn, h.tz(), fmt, Date.now());
  const hash = hashStr(plan + JSON.stringify(list.map(a => [a.id, a.t, a.title, a.body])));
  if (!force && hash === lastHash) return; lastHash = hash;
  await sbTable('jepi_alerts', 'DELETE', `?plan=eq.${encodeURIComponent(plan)}&sent_at=is.null`, null, 'return=minimal');
  if (list.length) await sbTable('jepi_alerts', 'POST', '?on_conflict=user_id,id', list.map(a => ({ id: a.id, plan, fire_at: new Date(a.t).toISOString(), title: a.title, body: a.body, url: location.pathname, sent_at: null })), 'resolution=merge-duplicates,return=minimal');
}

const b64u = (s: string) => { const p = '='.repeat((4 - s.length % 4) % 4); return Uint8Array.from(atob((s + p).replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)) };
async function enable(): Promise<void> {
  if (!pushSupported()) throw appError('unsupported', isIOS() ? '홈 화면에 추가한 JEPI 앱에서 켜 주세요.' : '이 브라우저는 알림을 지원하지 않아요.');
  if (!syncOn()) throw appError('auth', '먼저 로그인해 주세요.');
  const perm = await Notification.requestPermission(); if (perm !== 'granted') throw appError('denied', '알림 권한이 꺼져 있어요. 기기 설정에서 JEPI 알림을 허용해 주세요.');
  const reg = await navigator.serviceWorker.register('sw.js'); await navigator.serviceWorker.ready;
  const r = await fetch(pushFn()); if (!r.ok) throw appError('server', '알림 서버가 아직 준비되지 않았어요.'); const { publicKey } = await r.json();
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64u(publicKey) });
  settings.dev = settings.dev || ('d' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6));
  await sbTable('jepi_push', 'POST', '?on_conflict=user_id,id', { id: settings.dev, sub: sub.toJSON(), updated: Date.now(), label: isIOS() ? 'iPhone/iPad' : /Android/.test(navigator.userAgent) ? 'Android' : 'PC' }, 'resolution=merge-duplicates,return=minimal');
  settings.on = true; saveSettings(); lastHash = ''; await upload(true);
}
async function disable(): Promise<void> {
  try { const reg = await navigator.serviceWorker.getRegistration(); const sub = reg && await reg.pushManager.getSubscription(); if (sub) await sub.unsubscribe() } catch { /* already gone */ }
  if (syncOn() && settings.dev) await sbTable('jepi_push', 'DELETE', `?id=eq.${settings.dev}`, null, 'return=minimal');
  settings.on = false; saveSettings();
}
async function test(): Promise<void> {
  await sbTable('jepi_alerts', 'POST', '?on_conflict=user_id,id', { id: 'test:' + Date.now(), plan: 'test', fire_at: new Date().toISOString(), title: '🔔 JEPI 알림 테스트', body: '이렇게 알림이 와요. 여행 중에는 출발할 시간을 알려 드려요.', url: location.pathname, sent_at: null }, 'return=minimal');
  await fetch(pushFn(), { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }).catch(() => { });
}

/** the panel's 켜기 / 끄기 / 테스트 buttons: one at a time, with a message */
export async function run(what: 'on' | 'off' | 'test'): Promise<void> {
  if (ui.busy) return; ui.busy = true; ui.msg = ''; H().redraw();
  try {
    if (what === 'on') { await enable(); ui.msg = '알림을 켰어요' }
    else if (what === 'off') { await disable(); ui.msg = '알림을 껐어요' }
    else { await test(); ui.msg = '테스트 알림을 보냈어요. 몇 초 안에 와요.' }
  } catch (e) { ui.msg = '✕ ' + (e as Error).message }
  ui.busy = false; H().redraw();
}

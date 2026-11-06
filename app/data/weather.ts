// 날씨 (Open-Meteo, 무료 · 키 없음). 여행지 가운데 좌표와 날짜만 보내요 (집 위치 같은 건 보내지 않아요).
//  · 오늘부터 16일 안: 실제 예보 (시간대별 날씨, 비 올 확률, 체감 온도)
//  · 그보다 먼 날짜: 지난 3년 같은 날의 평균 ("평년")
//  · 이미 지난 날짜: 그날 실제 날씨
// 받은 값은 기기에 저장해서(예보 3시간, 평년 30일) 같은 값을 다시 받지 않고, 인터넷이 없어도 마지막 값을 보여 줘요.
import * as storage from './storage';
import * as places from './places';

export type WxKind = 'forecast' | 'past' | 'normal';
export interface Wx {
  iso: string; kind: WxKind;
  code: number; icon: string; text: string;
  hi: number; lo: number;
  /** 체감 온도 (예보만) */
  feel?: number;
  /** 비 올 확률 % (예보만) */
  rain?: number;
  /** 시간대별 [시각, 아이콘, 기온] (예보만) */
  hours?: [string, string, number][];
  /** 평년: 몇 해 가운데 비 온 해가 몇 해인지 */
  years?: number; rainyYears?: number;
}

const KEY = 'gp.wx';
const FORECAST_TTL = 3 * 3600e3, NORMAL_TTL = 30 * 86400e3;
const HOURS = [9, 12, 15, 18, 21];

/** 날씨 코드(WMO) → 아이콘, 한 줄 설명 */
export function codeInfo(c: number): [string, string] {
  if (c === 0) return ['☀️', '맑아요'];
  if (c === 1) return ['🌤️', '대체로 맑아요'];
  if (c === 2) return ['⛅', '구름이 조금 있어요'];
  if (c === 3) return ['☁️', '흐려요'];
  if (c === 45 || c === 48) return ['🌫️', '안개가 껴요'];
  if (c >= 51 && c <= 57) return ['🌦️', '이슬비가 와요'];
  if (c === 61 || c === 63 || c === 80 || c === 81) return ['🌧️', '비가 와요'];
  if (c === 65 || c === 82 || c === 66 || c === 67) return ['🌧️', '비가 많이 와요'];
  if ((c >= 71 && c <= 77) || c === 85 || c === 86) return ['❄️', '눈이 와요'];
  if (c >= 95) return ['⛈️', '천둥 번개가 쳐요'];
  return ['⛅', '구름이 조금 있어요'];
}
/** 비나 눈이 오는 날씨 코드 */
export const wetCode = (c: number): boolean => (c >= 51 && c <= 67) || (c >= 71 && c <= 86) || c >= 95;
/** 우산이 필요한 날 (비 올 확률 60% 이상이거나 비 코드, 평년은 3년 중 2년 이상 비) */
export const needsUmbrella = (w: Wx): boolean => w.kind === 'normal' ? (w.rainyYears || 0) >= 2 && (w.years || 0) >= 2 : (w.rain != null ? w.rain >= 60 : wetCode(w.code));

interface Saved { at: number; ll: string; by: Record<string, Wx & { at: number }> }
const state: { by: Record<string, Wx>; busy: boolean; failed: boolean } = { by: {}, busy: false, failed: false };
const listeners = new Set<() => void>();
/** 날씨가 바뀌면 알려 줘요 (돌려주는 함수를 부르면 그만 들어요) */
export function on(fn: () => void): () => void { listeners.add(fn); return () => { listeners.delete(fn) } }
const tell = () => listeners.forEach(f => { try { f() } catch { /* a listener must not break the others */ } });
export const get = (iso: string): Wx | null => state.by[iso] || null;
export const failed = (): boolean => state.failed;

const r2 = (n: number) => Math.round(n * 100) / 100;
const pad = (n: number) => String(n).padStart(2, '0');
const isoOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (iso: string, n: number) => { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return isoOf(d) };
/** same day, k years earlier (Feb 29 → Feb 28) */
const yearsBack = (iso: string, k: number) => { const y = +iso.slice(0, 4) - k, m = +iso.slice(5, 7), d = +iso.slice(8, 10); return `${y}-${pad(m)}-${pad(m === 2 && d === 29 ? 28 : d)}` };
const validIso = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(+new Date(s + 'T00:00:00'));

async function getJson(url: string): Promise<any> {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 12000);
  try { const r = await fetch(url, { signal: ctl.signal }); if (!r.ok) throw new Error('weather ' + r.status); return await r.json() }
  finally { clearTimeout(t) }
}
const num = (v: unknown): number | null => typeof v === 'number' && isFinite(v) ? v : null;

function forecastUrl(ll: [number, number], a: string, b: string): string {
  return `https://api.open-meteo.com/v1/forecast?latitude=${ll[0]}&longitude=${ll[1]}&timezone=auto&start_date=${a}&end_date=${b}`
    + '&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_probability_max'
    + '&hourly=weather_code,temperature_2m,precipitation_probability';
}
function archiveUrl(ll: [number, number], a: string, b: string): string {
  return `https://archive-api.open-meteo.com/v1/archive?latitude=${ll[0]}&longitude=${ll[1]}&timezone=auto&start_date=${a}&end_date=${b}`
    + '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum';
}

/** 예보 답 → 날짜별 날씨 */
function readForecast(j: any, want: string[]): Record<string, Wx> {
  const out: Record<string, Wx> = {}; const d = j && j.daily; if (!d || !Array.isArray(d.time)) return out;
  const h = (j && j.hourly) || {};
  d.time.forEach((iso: string, i: number) => {
    if (!want.includes(iso)) return;
    const hi = num(d.temperature_2m_max && d.temperature_2m_max[i]), lo = num(d.temperature_2m_min && d.temperature_2m_min[i]), code = num(d.weather_code && d.weather_code[i]);
    if (hi == null || lo == null || code == null) return;
    const [icon, text] = codeInfo(code);
    const fa = num(d.apparent_temperature_max && d.apparent_temperature_max[i]), fb = num(d.apparent_temperature_min && d.apparent_temperature_min[i]);
    const hours: [string, string, number][] = [];
    if (Array.isArray(h.time)) HOURS.forEach(hr => {
      const k = h.time.indexOf(`${iso}T${pad(hr)}:00`); if (k < 0) return;
      const c = num(h.weather_code && h.weather_code[k]), t = num(h.temperature_2m && h.temperature_2m[k]); if (c == null || t == null) return;
      hours.push([`${pad(hr)}시`, codeInfo(c)[0], Math.round(t)]);
    });
    out[iso] = { iso, kind: 'forecast', code, icon, text, hi: Math.round(hi), lo: Math.round(lo),
      feel: fa != null && fb != null ? Math.round((fa + fb) / 2) : undefined, rain: num(d.precipitation_probability_max && d.precipitation_probability_max[i]) ?? undefined, hours };
  });
  return out;
}
/** 지난 날 실제 날씨 */
function readPast(j: any, want: string[]): Record<string, Wx> {
  const out: Record<string, Wx> = {}; const d = j && j.daily; if (!d || !Array.isArray(d.time)) return out;
  d.time.forEach((iso: string, i: number) => {
    if (!want.includes(iso)) return;
    const hi = num(d.temperature_2m_max && d.temperature_2m_max[i]), lo = num(d.temperature_2m_min && d.temperature_2m_min[i]), code = num(d.weather_code && d.weather_code[i]);
    if (hi == null || lo == null || code == null) return;
    const [icon, text] = codeInfo(code);
    out[iso] = { iso, kind: 'past', code, icon, text, hi: Math.round(hi), lo: Math.round(lo) };
  });
  return out;
}
/** 평년: 지난 3년 같은 날 (answers[k] = k+1년 전) */
function readNormal(answers: any[], want: string[]): Record<string, Wx> {
  const out: Record<string, Wx> = {};
  want.forEach(iso => {
    const his: number[] = [], los: number[] = [], codes: number[] = []; let rainy = 0;
    answers.forEach((j, k) => {
      const d = j && j.daily; if (!d || !Array.isArray(d.time)) return;
      const i = d.time.indexOf(yearsBack(iso, k + 1)); if (i < 0) return;
      const hi = num(d.temperature_2m_max && d.temperature_2m_max[i]), lo = num(d.temperature_2m_min && d.temperature_2m_min[i]), code = num(d.weather_code && d.weather_code[i]);
      if (hi == null || lo == null || code == null) return;
      his.push(hi); los.push(lo); codes.push(code);
      const mm = num(d.precipitation_sum && d.precipitation_sum[i]); if ((mm != null && mm >= 1) || wetCode(code)) rainy++;
    });
    if (!his.length) return;
    const avg = (a: number[]) => Math.round(a.reduce((s, x) => s + x, 0) / a.length);
    const counts = new Map<number, number>(); codes.forEach(c => counts.set(c, (counts.get(c) || 0) + 1));
    const code = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0];
    const [icon, text] = codeInfo(code);
    out[iso] = { iso, kind: 'normal', code, icon, text, hi: avg(his), lo: avg(los), years: his.length, rainyYears: rainy };
  });
  return out;
}

/** 지금 이 날짜에 맞는 종류: 16일 안이면 예보, 더 멀면 평년, 지났으면 그날 날씨 (여행이 가까워지면 평년을 예보로 바꿔요) */
const kindOf = (iso: string, today: string): WxKind => iso < today ? 'past' : iso <= addDays(today, 15) ? 'forecast' : 'normal';
const fresh = (w: Wx & { at: number }, now: number, today: string) => w.kind === kindOf(w.iso, today) && now - w.at < (w.kind === 'normal' ? NORMAL_TTL : FORECAST_TTL);
let inflight = '';

/** 이 날짜들의 날씨를 준비해요 (기기에 저장된 게 새것이면 그대로 쓰고, 아니면 받아 와요). 여러 번 불러도 돼요. */
export async function want(isos: string[]): Promise<void> {
  const list = [...new Set(isos.filter(validIso))].sort(); if (!list.length) return;
  const c = places.cityLL(); if (!c || (!c[0] && !c[1]) || !isFinite(c[0]) || !isFinite(c[1])) return;
  const ll: [number, number] = [r2(c[0]), r2(c[1])]; const llKey = ll.join(',');
  const saved = storage.get<Saved | null>(KEY, null); const now = Date.now();
  const keep: Record<string, Wx & { at: number }> = saved && saved.ll === llKey ? saved.by : {};
  list.forEach(iso => { const w = keep[iso]; if (w) state.by[iso] = w });
  tell();
  const today = isoOf(new Date()), lastFc = addDays(today, 15);
  const need = list.filter(iso => !keep[iso] || !fresh(keep[iso], now, today));
  if (!need.length) { state.failed = false; return }
  const sig = llKey + '|' + need.join(',');
  if (inflight === sig) return; inflight = sig; state.busy = true;
  const near = need.filter(i => i >= today && i <= lastFc), past = need.filter(i => i < today), far = need.filter(i => i > lastFc);
  const got: Record<string, Wx> = {}; let bad = false;
  const run = async (fn: () => Promise<Record<string, Wx>>) => { try { Object.assign(got, await fn()) } catch { bad = true } };
  await Promise.all([
    near.length ? run(async () => readForecast(await getJson(forecastUrl(ll, near[0], near[near.length - 1])), near)) : null,
    past.length ? run(async () => readPast(await getJson(archiveUrl(ll, past[0], past[past.length - 1])), past)) : null,
    far.length ? run(async () => readNormal(await Promise.all([1, 2, 3].map(k => getJson(archiveUrl(ll, yearsBack(far[0], k), yearsBack(far[far.length - 1], k))).catch(() => null))), far)) : null,
  ]);
  inflight = ''; state.busy = false; state.failed = bad && !Object.keys(got).length;
  const stamped: Record<string, Wx & { at: number }> = { ...keep };
  Object.values(got).forEach(w => { stamped[w.iso] = { ...w, at: now }; state.by[w.iso] = w });
  // 오래된 날짜 값은 버려요 (저장 공간이 계속 커지지 않게)
  Object.keys(stamped).forEach(k => { if (k < addDays(today, -30)) delete stamped[k] });
  if (Object.keys(got).length) storage.set(KEY, { at: now, ll: llKey, by: stamped } satisfies Saved);
  tell();
}

/** 기온 글자: 16°/9° */
export const degTxt = (w: Wx): string => `${w.hi}°/${w.lo}°`;

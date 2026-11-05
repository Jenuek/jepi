// 알림: which reminders a trip needs and when (it used to be alertList / tripTZ / localToUtc in src/js/386-notify.js).
// Times in the app are local to the trip; the server sends at a moment in UTC, so the trip's time zone matters.

export const COUNTRY_TZ: Record<string, string> = { '일본': 'Asia/Tokyo', '한국': 'Asia/Seoul', '대한민국': 'Asia/Seoul', '대만': 'Asia/Taipei', '중국': 'Asia/Shanghai', '홍콩': 'Asia/Hong_Kong', '태국': 'Asia/Bangkok', '베트남': 'Asia/Ho_Chi_Minh', '싱가포르': 'Asia/Singapore', '필리핀': 'Asia/Manila', '인도네시아': 'Asia/Jakarta', '말레이시아': 'Asia/Kuala_Lumpur', '미국': 'America/Los_Angeles', '캐나다': 'America/Vancouver', '영국': 'Europe/London', '프랑스': 'Europe/Paris', '이탈리아': 'Europe/Rome', '스페인': 'Europe/Madrid', '독일': 'Europe/Berlin', '호주': 'Australia/Sydney', '괌': 'Pacific/Guam' };

/** the trip's time zone: the destination's own, else by country, else this device's */
export function tripTZ(pack: { tz?: string; country?: string; currency?: string } | null | undefined): string {
  const p = pack || {};
  return p.tz || COUNTRY_TZ[p.country || ''] || (p.currency === 'KRW' ? 'Asia/Seoul' : Intl.DateTimeFormat().resolvedOptions().timeZone);
}

/** how far that time zone is ahead of UTC at moment t (ms) */
export function tzOffsetMs(tz: string, t: number): number {
  const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const v = Object.fromEntries(f.formatToParts(new Date(t)).map(x => [x.type, x.value]));
  return Date.UTC(+v.year, +v.month - 1, +v.day, +v.hour % 24, +v.minute, +v.second) - t;
}

/** a local date + minutes in that time zone → the moment (ms since 1970, UTC) */
export function localToUtc(iso: string, min: number, tz: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  const g = Date.UTC(y, m - 1, d, 0, 0) + min * 60000;
  let t = g - tzOffsetMs(tz, g); t = g - tzOffsetMs(tz, t);
  return t;
}

export interface AlertSettings { on: boolean; all: boolean; lead: number; depart: boolean; morning: boolean }
/** a block that can ring (places and fixed things like check-in or flights, not the night at the hotel) */
export interface AlertRow {
  key: string; name: string; start: number; end: number; locName?: string;
  travelIn?: { min: number; mode: string; fromName: string } | null;
}
export interface Alert { id: string; t: number; title: string; body: string }

/** the reminders still to come for one plan (at most 80): the morning summary, and each block that is on */
export function alertList(plan: string, days: { iso: string; rows: AlertRow[] }[], s: AlertSettings, isOn: (key: string) => boolean, tz: string, fmt: (m: number) => string, now: number): Alert[] {
  const out: Alert[] = [], lead = +s.lead || 10;
  days.forEach((D, d) => {
    if (!D.iso) return; const rows = D.rows;
    if (s.morning && rows.length) {
      const at = Math.min(480, rows[0].start - 60);
      out.push({ id: `${plan}:${d}:morning`, t: localToUtc(D.iso, Math.max(300, at), tz), title: `☀️ 오늘 일정 · Day ${d + 1}`, body: rows.slice(0, 3).map(i => `${fmt(i.start)} ${i.name}`).join(' → ') });
    }
    rows.forEach(it => {
      if (!isOn(it.key)) return;
      const ti = it.travelIn, go = s.depart && ti && ti.min >= 5;
      const at = (go ? it.start - ti!.min : it.start) - lead;
      out.push({ id: `${plan}:${it.key}`, t: localToUtc(D.iso, at, tz),
        title: go ? `🚶 ${lead}분 뒤 출발 · ${it.name}` : `⏰ ${lead}분 뒤 · ${it.name}`,
        body: go ? `${fmt(it.start)} 도착 예정 · ${ti!.fromName}에서 ${ti!.mode} ${ti!.min}분` : `${fmt(it.start)}–${fmt(it.end)} · ${it.locName || ''}` });
    });
  });
  return out.filter(a => a.t > now + 30000).slice(0, 80);
}

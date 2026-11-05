// 손글씨 메모 and 날짜 제목, kept in the trip facts (profile) so they sync and go to friends on a shared trip:
//   profile.memo = { b: { "<place id>@<day>": text }, d: [text per day] }   profile.dayTitles = [title per day]
// (They used to live in src/js/389b-memo.js and 389-titles.js.)
type P = Record<string, any>;

function store(p: P): { b: Record<string, string>; d: string[] } {
  p.memo = p.memo && typeof p.memo === 'object' ? p.memo : {};
  p.memo.b = p.memo.b || {}; p.memo.d = Array.isArray(p.memo.d) ? p.memo.d : [];
  return p.memo;
}
export const blockKey = (placeId: string, day: number): string => placeId + '@' + day;
export const blockMemo = (p: P, key: string): string => ((p.memo && p.memo.b) || {})[key] || '';
export const dayMemo = (p: P, d: number): string => ((p.memo && p.memo.d) || [])[d] || '';

/** a block's memo (empty removes it); at most 60 characters */
export function setBlockMemo(p: P, key: string, v: string): string {
  const m = store(p), t = String(v || '').trim().slice(0, 60);
  if (t) m.b[key] = t; else delete m.b[key];
  return t;
}
/** the day's one-line memo; at most 60 characters */
export function setDayMemo(p: P, d: number, v: string): void {
  const m = store(p); m.d[d] = String(v || '').trim().slice(0, 60);
  while (m.d.length && !m.d[m.d.length - 1]) m.d.pop();
}
/** the day's own title, or the automatic one */
export function dayTitle(p: P | null | undefined, d: number, auto: string): string {
  const t = ((p && p.dayTitles) || [])[d];
  return t && String(t).trim() ? String(t) : auto || '';
}
/** the title the person typed for that day ('' = automatic) */
export const ownDayTitle = (p: P, d: number): string => ((p.dayTitles || [])[d]) || '';
/** set the day's title ('' = back to automatic); at most 40 characters */
export function setDayTitle(p: P, d: number, v: string): void {
  const a = (p.dayTitles || []).slice(); a[d] = String(v || '').trim().slice(0, 40);
  while (a.length && !a[a.length - 1]) a.pop();
  p.dayTitles = a;
}

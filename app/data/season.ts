// This trip's season (sunrise / sunset, weather, events — asked from the AI and kept with the destination) and what
// it means for places: seasonal places only within their dates, and the best time of day. It used to be at the top of
// src/js/110-season.js (asking the AI for the season is still there).
import * as trip from './trip';
import * as places from './places';
import { nightsOf } from './days';
import { fmt, parse } from '../logic/time';

export const BEST_KO: Record<string, string> = { morning: '오전', day: '낮', sunset: '일몰 무렵', evening: '저녁', night: '밤' };
/** which dates the season info is for (it is asked again when they change) */
export const tripKey = (): string => { const pr = trip.cur.profile as any; return `${pr.startDate}|${nightsOf(pr)}` };
/** the season of this trip's dates, or null when not asked (or asked for other dates) */
export const seasonOf = (): any => { const pk = places.state.pack; return pk && pk.season && pk.season.key === tripKey() ? pk.season : null };
/** sunset (minutes), when known */
export const sunsetMin = (): number | null => { const s = seasonOf(); return (s && parse(s.sunset)) || null };
/** a seasonal place outside its dates on this day (iso) */
export function outOfSeason(p: { dates?: [string, string] }, iso: string): boolean { if (!p.dates || !iso) return false; const [a, b] = p.dates; return !!((a && iso < a) || (b && iso > b)) }
/** 2026-11-07 → 11/7 */
export const mdTxt = (iso: string): string => iso ? `${+iso.slice(5, 7)}/${+iso.slice(8, 10)}` : '';
/** a tip when a block is not at the place's best time of day (s, e: its start and end) */
export function bestTips(p: { best?: string }, s: number, e: number): string[] {
  const b = p.best; if (!b || b === 'any') return [];
  const ss = sunsetMin() || 1050;
  if (b === 'night' && s < ss) return [`해가 진 뒤(일몰 약 ${fmt(ss)})에 가면 더 좋아요`];
  if (b === 'sunset' && !(s <= ss - 15 && e >= ss)) return [`일몰(약 ${fmt(ss)}) 무렵에 걸치게 가면 좋아요`];
  if (b === 'evening' && s < ss - 60) return ['저녁 시간대에 가야 분위기가 좋아요'];
  if (b === 'morning' && s >= 660) return ['오전에 가야 덜 붐비고 좋아요'];
  if (b === 'day' && e > ss + 15) return [`해가 있을 때(일몰 약 ${fmt(ss)} 전) 가야 좋아요`];
  return [];
}

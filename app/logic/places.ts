// Is it the same place? (it used to be nameSim / samePlace in src/js/388-dedup.js)
// "Same place" = within 100 m and a similar name (one contains the other, or most letter pairs match).
// Nothing is merged automatically: a branch of the same chain can sit next door.
import { km, type LL } from './geo';

/** names compared without spaces or case */
export const norm = (k: unknown): string => String(k).replace(/\s+/g, '').toLowerCase();

/** 0 … 1: how alike two names are (1 the same, .9 one inside the other, else shared letter pairs) */
export function nameSim(a: string, b: string): number {
  const x = norm(a).replace(/[^\p{L}\p{N}]/gu, ''), y = norm(b).replace(/[^\p{L}\p{N}]/gu, '');
  if (!x || !y) return 0; if (x === y) return 1; if (x.includes(y) || y.includes(x)) return .9;
  const bi = (s: string) => { const m = new Map<string, number>(); for (let i = 0; i < s.length - 1; i++) { const g = s.slice(i, i + 2); m.set(g, (m.get(g) || 0) + 1) } return m };
  const A = bi(x), B = bi(y); let hit = 0; A.forEach((n, g) => { hit += Math.min(n, B.get(g) || 0) });
  return 2 * hit / Math.max(1, (x.length - 1) + (y.length - 1));
}

interface Pl { id: string; name: string; local?: string; ll?: LL; gid?: string; custom?: boolean }
export function samePlace(p: Pl | null | undefined, q: Pl | null | undefined): boolean {
  if (!p || !q || p.id === q.id) return false;
  if (p.gid && q.gid) return p.gid === q.gid;
  const near = p.ll && q.ll && !p.custom && !q.custom ? km(p.ll, q.ll) < 0.1 : true;   // hand-made blocks sit at the area centre: judge by name only
  return !!near && (nameSim(p.name, q.name) >= .6 || (!!p.local && !!q.local && nameSim(p.local, q.local) >= .6));
}

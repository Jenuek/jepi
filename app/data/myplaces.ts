// 내 장소 (집·회사·…): kept on this device ("jepi.myplaces") and synced with the account; never in share links.
// (It used to be src/js/270-my-places.js.) The section in 설정 calls the actions here and redraws through connectMyPlaces.
import * as storage from './storage';
import * as kakao from './kakao';
import type { LL } from '../logic/geo';

export interface MyPlace { id: string; name: string; ll: LL | null; addr: string }
/** the list (the same array the old code reads as MYP; changed in place) */
export const list: MyPlace[] = [];
/** what the section shows while editing */
export const ui = { edit: null as string | null, msg: '', hits: [] as { name: string; addr: string; ll: LL }[] };

interface Host { redraw(): void; syncSoon(): void }
let host: Host | null = null;
export function connectMyPlaces(h: Host): void {
  host = h;
  const saved = storage.get<MyPlace[] | null>('jepi.myplaces', null);
  setAll(Array.isArray(saved) ? saved : [{ id: 'home', name: '집', ll: null, addr: '' }, { id: 'work', name: '회사', ll: null, addr: '' }]);
}
/** replace the whole list (a newer one came from the account) */
export function setAll(m: MyPlace[]): void { list.splice(0, list.length, ...m) }
export const of = (id: string): MyPlace | undefined => list.find(x => x.id === id);
export function save(): void { storage.set('jepi.myplaces', list); storage.set('jepi.mypAt', Date.now()); host && host.syncSoon() }
const fixed = (id: string) => id === 'home' || id === 'work';
const redraw = () => host && host.redraw();

export function edit(id: string): void { ui.edit = id; ui.msg = ''; ui.hits = []; redraw() }
/** 닫기: keep the typed name */
export function done(name?: string): void { const x = ui.edit ? of(ui.edit) : undefined; if (x && name && name.trim()) x.name = name.trim().slice(0, 12); save(); ui.edit = null; redraw() }
export function add(): void { const id = 'p' + Date.now().toString(36); list.push({ id, name: '새 장소', ll: null, addr: '' }); save(); edit(id) }
/** 집·회사: forget the location; others: remove */
export function clear(id: string): void {
  if (fixed(id)) { const x = of(id); if (x) { x.ll = null; x.addr = '' } } else setAll(list.filter(x => x.id !== id));
  save(); ui.edit = null; redraw();
}
export async function useHere(id: string): Promise<void> {
  const x = of(id); if (!x) return; ui.msg = '지금 위치를 찾는 중…'; redraw();
  try { const ll = await kakao.here(0); x.ll = ll; x.addr = await kakao.addressAt(ll); save(); ui.msg = `저장했어요${x.addr ? ' · ' + x.addr : ''}` } catch (e) { ui.msg = (e as Error).message }
  redraw();
}
export async function search(q: string): Promise<void> {
  q = q.trim(); if (!q) return; ui.msg = '찾는 중…'; redraw();
  try {
    const a = await kakao.get('/v2/local/search/address.json', { query: q, size: 5 });
    let hits = (a.documents || []).map((d: any) => ({ name: d.address_name, addr: (d.road_address && d.road_address.address_name) || d.address_name, ll: [+d.y, +d.x] as LL }));
    if (!hits.length) { const k = await kakao.get('/v2/local/search/keyword.json', { query: q, size: 5 }); hits = (k.documents || []).map((d: any) => ({ name: d.place_name, addr: d.road_address_name || d.address_name, ll: [+d.y, +d.x] as LL })) }
    ui.hits = hits; ui.msg = hits.length ? '맞는 곳을 눌러 주세요.' : '찾지 못했어요. 다르게 적어 보세요.';
  } catch (e) { ui.msg = (e as Error).message }
  redraw();
}
export function pick(id: string, i: number): void {
  const x = of(id), h = ui.hits[i];
  if (x && h) { x.ll = h.ll; x.addr = h.addr; save(); ui.hits = []; ui.msg = '저장했어요 · ' + h.addr }
  redraw();
}

// The 지도 tab: the day's stops and the trips between them on a Leaflet map (CARTO / OpenStreetMap tiles; Leaflet is
// loaded from cdnjs only when the map is first opened), the cards under it, and 내 위치. It used to be src/js/210-map.js.
// The top of the panel (이 날/전체, 내 위치) is Tops.tsx; the cards are MapCards (Dice.tsx).
import * as days from '../data/days';
import * as check from '../data/check';
import * as routes from '../data/routes';
import { cityLL } from '../data/places';
import { km, navLink, type LL } from '../logic/geo';
import { fmt } from '../logic/time';
import { app } from './host';

/* Leaflet is a plain script (window.L) */
declare const L: any;
const UI = () => (window as any).JEPI_UI;
const $ = (s: string) => document.querySelector(s) as HTMLElement | null;
const esc = (s: unknown) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as Record<string, string>)[c]);

/** the map and what it shows (the old code reads it as mapState) */
export const state = { on: false, map: null as any, layer: null as any, all: false, me: null as LL | null, meMarker: null as any, watch: null as number | null, loading: null as Promise<void> | null, lastDay: -1, located: false };

let topView = { all: false, me: false };
/** draw the top of the map panel again with these changes */
export function mapTop(p: Partial<typeof topView>): void { topView = { ...topView, ...p }; const el = $('#mapTopMount'); if (el) UI().mount('mapTop', el, topView) }
/** 이 날 / 전체 / 내 위치 */
export function mapTopAct(n: string): void {
  if (n === 'me') locateMe();
  else { state.all = n === 'all'; mapTop({ all: state.all }); drawMap(true) }
}

function loadLeaflet(): Promise<void> {
  if ((window as any).L) return Promise.resolve();
  if (state.loading) return state.loading;
  state.loading = new Promise((res, rej) => {
    const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'; document.head.appendChild(css);
    const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'; s.onload = () => res(); s.onerror = () => { state.loading = null; rej(new Error('지도를 불러오지 못했어요')) }; document.head.appendChild(s);
  });
  return state.loading;
}
const MODE_STYLE = (m: string) => m === '도보' ? { dashArray: '2 8', weight: 4 } : m === '차' ? { weight: 6 } : { weight: 5 };
const DAY_COLORS = ['#27306b', '#c0397f', '#1f7f86', '#a8761b', '#3f7a5a', '#7a3f78', '#b4542f'];
const msg = (t: string) => { const m = $('#mapMsg'); if (m) m.textContent = t };

/** open the map (the 지도 tab was chosen) */
export async function openMap(): Promise<void> {
  const box = $('#mapBox'); if (!box) return;
  try { await loadLeaflet() } catch { msg('지도를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.'); return }
  if (!state.map) {
    state.map = L.map(box, { zoomControl: true, attributionControl: true });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> 기여자' }).addTo(state.map);
    state.layer = L.layerGroup().addTo(state.map);
  }
  state.on = true;
  setTimeout(() => { state.map.invalidateSize(); drawMap(true) }, 60);
}

/** a day's stops (places, stays, airports; the same spot once) and the trips between them */
export function mapLegs(d: number): { stops: any[]; legs: any[] } {
  const { items } = check.analyze(d); const list = items.filter((i: any) => !(i.stay && i !== items[items.length - 1] && i !== items[0]) && i.ll && (i.ll[0] || i.ll[1]));
  const stops: any[] = []; list.forEach((i: any) => { const last = stops[stops.length - 1]; if (last && km(last.ll, i.ll) < 0.05 && last.stay === i.stay) return; stops.push(i) });
  const legs: any[] = []; for (let k = 1; k < stops.length; k++) { const a = stops[k - 1].ll, b = stops[k].ll; const t = check.travel(a, b); legs.push({ a, b, t, from: stops[k - 1], to: stops[k] }) }
  return { stops, legs };
}

/** draw the open day (or every day, coloured by day); fit: move the view to show them all */
export function drawMap(fit?: boolean): void {
  if (!state.map || !state.on) return;
  const lg = state.layer; lg.clearLayers(); const bounds: LL[] = [];
  const day = app().day(), list = state.all ? days.state.days.map((_, i) => i) : [day];
  list.forEach(d => {
    const col = state.all ? DAY_COLORS[d % DAY_COLORS.length] : getComputedStyle(document.body).getPropertyValue('--accent').trim() || '#27306b';
    const { stops, legs } = mapLegs(d);
    legs.forEach(L_ => {
      const t = L_.t; const pts = t && t.poly ? t.poly : [L_.a, L_.b];
      const st = t && t.real ? MODE_STYLE(t.mode) : { dashArray: '6 8', weight: 3, opacity: .7 };
      L.polyline(pts, Object.assign({ color: col, opacity: .85, lineCap: 'round' }, st)).addTo(lg)
        .bindPopup(`<b>${esc(L_.from.name)} → ${esc(L_.to.name)}</b><br>${t ? `${t.real ? '' : '≈ '}${esc(t.mode)} ${t.min}분${t.lines ? ' · ' + esc(t.lines) : ''}${t.tf ? ` · 환승 ${t.tf}회` : ''}` : '가까워요'}<br><a href="${navLink(L_.a, L_.b, t ? t.mode : '도보', L_.to.name)}" target="_blank" rel="noopener">안내 시작</a>`);
      pts.forEach((p: LL) => bounds.push(p));
    });
    let n = 0;
    stops.forEach(s => {
      const num = s.kind === 'place' ? ++n : 0;
      const ic = L.divIcon({ className: 'jp-pin', html: `<span style="background:${s.kind === 'place' ? col : '#ffffff'};color:${s.kind === 'place' ? '#fff' : col};border-color:${col}">${s.kind === 'place' ? num : s.stay ? '⌂' : '✈'}</span>`, iconSize: [28, 28], iconAnchor: [14, 14] });
      L.marker(s.ll, { icon: ic, title: s.name }).addTo(lg).bindPopup(`<b>${esc(s.name)}</b><br><span class="mono">${state.all ? `Day ${d + 1} · ` : ''}${fmt(s.start)}–${fmt(s.end)}</span>`);
      bounds.push(s.ll);
    });
  });
  if (state.me) { bounds.length || bounds.push(state.me) }
  if (fit && bounds.length) { state.map.fitBounds(bounds, { padding: [36, 36], maxZoom: 16 }) }
  else if (fit) { const c = cityLL(); if (c) state.map.setView(c, 12) }
  renderMapCards();
}

let cardsRev = 0;
/** the cards under the map for the open day, and the line above them */
export function renderMapCards(): void {
  const el = $('#mapCards'); if (!el) return;
  const { stops, legs } = mapLegs(app().day());
  const est = legs.some(x => x.t && x.t.est), noKey = legs.length && !legs.some(x => x.t && x.t.real) && !routes.provider(legs[0].a, legs[0].b);
  msg(state.all ? '날짜별 색으로 전체 여행을 보여 줘요.' : noKey ? '점선은 직선 거리예요. 설정에서 지도 키를 연결하면 실제 경로가 그려져요.' : est ? '경로를 불러오는 중이에요…' : '');
  UI().mount('mapCards', el, { rev: ++cardsRev, stops: stops.map((s, i) => { const t = i ? legs[i - 1].t : null, prev = i ? stops[i - 1] : null;
    return { leg: t ? `${t.real ? '' : '≈ '}${t.mode} ${t.min}분${t.lines ? ` · ${t.lines}` : ''}${t.tf ? ` · 환승 ${t.tf}` : ''}` : '', name: String(s.name), time: `${fmt(s.start)}–${fmt(s.end)}`, nav: prev ? navLink(prev.ll, s.ll, t ? t.mode : '도보', s.name) : '' } }) });
}
/** a card was tapped: the map moves to that stop */
export function mapCardAct(i: number): void { const { stops } = mapLegs(app().day()); const s = stops[+i]; if (s && state.map) state.map.setView(s.ll, 16) }

/** 내 위치: follow this device on the map (again: stop) */
export function locateMe(): void {
  if (!navigator.geolocation) { msg('이 기기에서는 위치를 쓸 수 없어요.'); return }
  if (state.watch != null) { navigator.geolocation.clearWatch(state.watch); state.watch = null; if (state.meMarker) { state.meMarker.remove(); state.meMarker = null } state.me = null; mapTop({ me: false }); return }
  mapTop({ me: true });
  state.watch = navigator.geolocation.watchPosition(p => {
    state.me = [p.coords.latitude, p.coords.longitude];
    if (!state.meMarker) state.meMarker = L.circleMarker(state.me, { radius: 8, color: '#fff', weight: 3, fillColor: '#1a73e8', fillOpacity: 1 }).addTo(state.map); else state.meMarker.setLatLng(state.me);
    if (!state.located) { state.located = true; state.map.setView(state.me, 15) }
  }, () => { msg('위치 권한이 꺼져 있어요. 브라우저 설정에서 허용해 주세요.'); mapTop({ me: false }); state.watch = null }, { enableHighAccuracy: true, maximumAge: 15000 });
}

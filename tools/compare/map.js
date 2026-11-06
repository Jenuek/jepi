// 지도: 이 날의 핀·경로 선·카드 · 전체 날짜 · 다른 날 · 카드 눌러 그 곳으로 (지도 그림은 Leaflet의 핀·선 모양으로 비교)
module.exports = { name: 'map', async run(t) {
  const { b, S, device, skipCoach, grab } = t;
  const p = t.page = await device(b, S); await p.click('[data-w="new"]'); await p.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(p);
  const tap = async (sel, w = 600) => { await p.$eval(sel, x => x.click()); await p.waitForTimeout(w) };
  // what the map drew: pins (their label) and lines (their style), without pixel positions
  const drawn = async k => { await p.evaluate(() => { let d = document.getElementById('mapDrawn'); if (!d) { d = document.createElement('pre'); d.id = 'mapDrawn'; d.hidden = true; document.body.append(d) }
    const pins = [...document.querySelectorAll('#mapBox .leaflet-marker-icon')].map(x => x.title + ':' + x.textContent + ':' + (x.querySelector('span') || {}).style?.cssText);
    const lines = [...document.querySelectorAll('#mapBox .leaflet-overlay-pane path')].map(x => ['stroke', 'stroke-width', 'stroke-dasharray', 'stroke-opacity'].map(a => x.getAttribute(a)).join(' '));
    d.textContent = pins.join('\n') + '\n---\n' + lines.join('\n') + '\n---\n' + (document.getElementById('mapMsg') || {}).textContent }); await grab(k, '#mapDrawn') };
  await tap('.tabs [data-tab="map"]', 1500); await drawn('day1'); await grab('cards1', '#mapCards');
  await tap('[data-mapday="all"]', 800); await drawn('all');
  await tap('[data-mapday="day"]', 800); await tap('#days [data-day="1"]', 1000); await drawn('day2'); await grab('cards2', '#mapCards');
  await tap('#mapCards .mcard >> nth=1', 800).catch(() => {}); await drawn('card');
  await p.ctx.close();
} };

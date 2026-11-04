// 경로 (가짜 Google): 일정표 이동 칩 · 블록 시트의 이동 줄 · 지도 카드가 실제 경로로 바뀐 뒤
module.exports = { name: 'routes', async run(t) {
  const { b, S, device, skipCoach, grab } = t;
  const p = t.page = await device(b, S);
  await p.route(/routes\.googleapis\.com/, r => { const q = JSON.parse(r.request().postData() || '{}'), walk = q.travelMode === 'WALK';
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ routes: [{ duration: walk ? '600s' : '780s', distanceMeters: 4200, polyline: { encodedPolyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@' },
      legs: [{ steps: walk ? [] : [{ transitDetails: { transitLine: { nameShort: '미도스지선', vehicle: { type: 'SUBWAY' } } } }, { transitDetails: { transitLine: { name: '난카이선', vehicle: { type: 'HEAVY_RAIL' } } } }] }], travelAdvisory: walk ? {} : { transitFare: { currencyCode: 'JPY', units: '240', nanos: 500000000 } } }] }) }) });
  await p.click('[data-w="new"]'); await p.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(p);
  await p.evaluate(() => { const k = JSON.parse(localStorage.getItem('jepi.keys') || '{}'); k.gmaps = 'AIzaTestKey'; localStorage.setItem('jepi.keys', JSON.stringify(k)) });
  await p.reload(); await p.waitForTimeout(4500); await skipCoach(p).catch(() => {});
  await p.evaluate(() => { let s = 7; Math.random = () => ((s = s * 16807 % 2147483647) / 2147483647) });
  await grab('grid', '#grid');
  await p.click('#grid .blk:not(.fixed) >> nth=1'); await p.waitForTimeout(300); await grab('sheet', '#sheet');
  await p.keyboard.press('Escape'); await p.click('#sheet [data-close] >> nth=-1').catch(() => {}); await p.waitForTimeout(200);
  await p.click('.tabs [data-tab="map"]'); await p.waitForTimeout(800); await grab('map', '#mapCards');
  await p.ctx.close();
} };

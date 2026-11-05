// 장소 탭 위쪽(AI로 더 찾기 칸 · 추천 안내 · 묶어 보기 · 문 여는 곳만)과 지도 위쪽(이 날/전체 · 내 위치)
module.exports = { name: 'tops', async run(t) {
  const { b, S, device, skipCoach, grab } = t;
  const p = t.page = await device(b, S, { ls: { 'jepi.keys': { anthropic: 'sk-ant-test-key' } } });
  await p.route(/api\.anthropic\.com/, r => r.fulfill({ status: 503, body: '{}' }));
  await p.click('[data-w="new"]'); await p.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(p);
  await p.click('.tabs [data-tab="tray"]'); await p.waitForTimeout(300);
  await grab('tray0', '#side-tray');
  await p.click('[data-group="pop"]'); await grab('tray_pop', '#side-tray');
  await p.click('#openOnly'); await grab('tray_open_off', '#side-tray');
  await p.fill('#moreInput', '비 오는 날'); await grab('tray_typed', '#side-tray');
  await p.click('#moreBtn'); await p.waitForTimeout(600); await grab('tray_find', '=#sheetBg');
  await p.evaluate(() => document.querySelector('#sheet [data-close]').click()); await p.waitForTimeout(300);
  await grab('tray_after', '#side-tray');
  await p.ctx.grantPermissions(['geolocation']); await p.ctx.setGeolocation({ latitude: 34.67, longitude: 135.5 });
  await p.click('.tabs [data-tab="map"]'); await p.waitForTimeout(900);
  await grab('map0', '=.map-top');
  await p.click('[data-mapday="all"]'); await p.waitForTimeout(500); await grab('map_all', '=.map-top'); await grab('map_all_msg', '#mapMsg');
  await p.click('[data-mapday="day"]'); await p.waitForTimeout(500); await grab('map_day', '=.map-top');
  await p.click('#mapMe'); await p.waitForTimeout(600); await grab('map_me', '=.map-top');
  await p.click('#mapMe'); await p.waitForTimeout(400); await grab('map_me_off', '=.map-top');
  await p.ctx.close();
} };

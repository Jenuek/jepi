// 장소 탭: 같은 곳 같아요 · 동네별 · ♥ 누르기 · ♥ 필터 · 분류 고르기 · 모두 보기(휴관 포함) · 인기순 · 목록 · 넣기(선택됨)
module.exports = { name: 'tray', async run(t) {
  const { b, S, device, skipCoach, grab } = t;
  const p = t.page = await device(b, S); await p.click('[data-w="new"]'); await p.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(p);
  await p.click('.tabs [data-tab="tray"]'); await p.waitForTimeout(300);
  await grab('zones', '#side-tray');
  await p.click('#cards [data-wish] >> nth=0'); await grab('wished', '#side-tray');
  await p.click('#filters [data-cat="wish"]'); await grab('wish_filter', '#side-tray');
  await p.click('#filters [data-cat="all"]'); await p.selectOption('#catSel', { index: 2 }); await grab('cat', '#side-tray');
  await p.click('#filters [data-cat="all"]'); await p.click('#openOnly'); await grab('all_days', '#side-tray');
  await p.click('[data-group="pop"]'); await grab('pop', '#side-tray');
  await p.click('[data-group="list"]'); await grab('list', '#side-tray');
  await p.click('#cards details.cmore summary >> nth=0'); await grab('detail_open', '#cards');
  await p.click('[data-group="zone"]'); await p.click('#cards details.zone summary >> nth=0'); await grab('zone_closed', '#side-tray');
  await p.click('#cards details[open] [data-pick] >> nth=0'); await p.waitForTimeout(200);
  await p.click('.tabs [data-tab="tray"]'); await grab('picked', '#side-tray');
  await p.evaluate(() => window.__jepi.dupTest()); await p.click('.tabs [data-tab="more"]'); await p.click('.tabs [data-tab="tray"]'); await grab('dup', '#cards');
  await p.ctx.close();
} };

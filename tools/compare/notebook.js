// 여행 노트: 표지 + 날짜별 장(메모·이동 포함), 사진 없는 커버 · 수첩 스타일
module.exports = { name: 'notebook', async run(t) {
  const { b, S, device, skipCoach, grab } = t;
  const p = t.page = await device(b, S); await p.click('[data-w="new"]'); await p.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(p);
  await p.click('#grid .blk:not(.fixed) >> nth=0'); await p.waitForTimeout(300); await p.fill('#bmIn', '사진!'); await p.click('#bmSave'); await p.waitForTimeout(300);
  await p.click('.tabs [data-tab="more"]'); await p.waitForTimeout(200);
  await p.click('#nbOpen'); await p.waitForTimeout(400); await grab('note', '#notebook');
  await p.click('#nbClose'); await p.waitForTimeout(200);
  await p.click('#lookBtn'); await p.waitForTimeout(300); await p.click('#sheet [data-lk="cover:sea"]'); await p.fill('#lkTag', '둘이서'); await p.click('#lookForm [type="submit"]'); await p.waitForTimeout(400);
  await p.click('.tabs [data-tab="more"]'); await p.waitForTimeout(200); await p.click('#nbOpen'); await p.waitForTimeout(400); await grab('sea', '#notebook');
  await p.ctx.close();
} };

// 여행 꾸미기: 열기 · 여행 수첩 · 색 · 커버 · 글꼴 · 날짜 제목 적고 색 바꾸기(적은 것 유지) · 저장 뒤 다시 열기
module.exports = { name: 'look', async run(t) {
  const { b, S, device, skipCoach, grab } = t;
  const p = t.page = await device(b, S); await p.click('[data-w="new"]'); await p.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(p);
  await p.click('#lookBtn'); await p.waitForTimeout(300); await grab('open', '#sheet');
  const tap = async sel => { await p.click('#sheet ' + sel); await p.waitForTimeout(200) };
  await tap('[data-lk="style:note"]'); await grab('note', '#sheet');
  await tap('[data-lk^="color:"] >> nth=3'); await tap('[data-lk="cover:sea"]'); await tap('[data-lk="hand:gaegu"]'); await grab('picked', '#sheet');
  await p.fill('#sheet [data-lkday="0"]', '첫날은 천천히'); await p.fill('#lkTag', '둘이서'); await tap('[data-lk^="color:"] >> nth=1'); await grab('typed_kept', '#sheet');
  await p.click('#lookForm [type="submit"]'); await p.waitForTimeout(400);
  await p.click('#lookBtn'); await p.waitForTimeout(300); await grab('reopen', '#sheet');
  await p.ctx.close();
} };

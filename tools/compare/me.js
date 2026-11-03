// 이번 여행: 줄 목록 · 누구와 열기 · 값 바꿔 자동 저장 · 예산 열기 · 언제·어디 열기 · 닫기
module.exports = { name: 'me', async run(t) {
  const { b, S, device, skipCoach, grab } = t;
  const p = t.page = await device(b, S); await p.click('[data-w="new"]'); await p.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(p);
  await p.click('.tabs [data-tab="more"]'); await p.click('#moreBox [data-tab="me"]'); await p.waitForTimeout(250);
  await grab('rows', '#meBox');
  await p.click('[data-meopen="who"]'); await grab('who', '#meBox');
  await p.click('#meBox .mebody [data-radio] >> nth=1'); await p.waitForTimeout(900); await grab('who_saved', '#meBox');
  await p.click('[data-meopen="bud"]'); await grab('budget', '#meBox');
  await p.click('[data-meopen="when"]'); await grab('when', '#meBox');
  await p.click('[data-meopen="when"]'); await grab('closed', '#meBox');
  await p.ctx.close();
} };

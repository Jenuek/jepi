// 나의 여행 취향 → 키워드: 데모 키워드 · 하나 추가 · 하나 빼기 · 모두 빼기
module.exports = { name: 'keywords', async run(t) {
  const { b, S, device, skipCoach, grab } = t;
  const p = t.page = await device(b, S); await p.click('[data-w="new"]'); await p.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(p);
  await p.click('.tabs [data-tab="more"]'); await p.click('#moreBox [data-tab="pref"]'); await p.waitForTimeout(250);
  await grab('start', '#prefBox');
  await p.fill('#kwInput', '레코드'); await p.press('#kwInput', 'Enter'); await grab('added', '#prefBox');
  await p.click('[data-kwadd] >> nth=0'); await grab('suggested', '#prefBox');
  await p.click('[data-kwdel="0"]'); await grab('removed', '#prefBox');
  for (let i = 0; i < 40 && await p.$('[data-kwdel]'); i++) await p.click('[data-kwdel="0"]');
  await grab('empty', '#prefBox');
  await p.ctx.close();
} };

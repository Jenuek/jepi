// 일정표 위쪽: 날짜 버튼 · 요약 줄(이동·비용·확인할 것·빈 시간 펼치기) · 동선 · 예산(간식비 ±, 예산 있을 때 · 넘을 때) · 다른 날
module.exports = { name: 'daytop', async run(t) {
  const { b, S, device, skipCoach, grab } = t;
  const p = t.page = await device(b, S); await p.click('[data-w="new"]'); await p.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(p);
  const all = async k => { for (const id of ['days', 'daySum', 'sumBody', 'route', 'budgetSum', 'budget']) await grab(k + '_' + id, '#' + id) };
  await all('start');
  await p.click('#daySum [data-sum="route"]'); await p.waitForTimeout(200); await all('route');
  await p.click('#daySum [data-sum="budget"]'); await p.waitForTimeout(200); await all('budget');
  await p.click('#budget [data-meal] >> nth=1'); await p.waitForTimeout(200); await all('meal');
  if (await p.$('#daySum [data-sum="warn"]')) { await p.click('#daySum [data-sum="warn"]'); await p.waitForTimeout(200); await all('warn') }
  if (await p.$('#daySum [data-sum="gap"]')) { await p.click('#daySum [data-sum="gap"]'); await p.waitForTimeout(200); await all('gap') }
  await p.click('#days [data-day="1"]'); await p.waitForTimeout(300); await all('day2');
  // with a budget (under and over)
  await p.click('.tabs [data-tab="more"]'); await p.click('#moreBox [data-tab="me"]'); await p.waitForTimeout(250);
  await p.click('[data-meopen="bud"]'); await p.fill('#meBox [data-pf="budgetMan"]', '150'); await p.dispatchEvent('#meBox [data-pf="budgetMan"]', 'change'); await p.waitForTimeout(900);
  await p.click('.tabs [data-tab="timeline"]'); await p.waitForTimeout(300); await all('budget150');
  await p.click('.tabs [data-tab="more"]'); await p.click('#moreBox [data-tab="me"]'); await p.waitForTimeout(250);
  await p.click('[data-meopen="who"]'); await p.click('#meBox [data-radio="party.type"][data-val="friends"]'); await p.waitForTimeout(900);
  await p.click('[data-meopen="bud"]'); await p.fill('#meBox [data-pf="budgetMan"]', '10'); await p.dispatchEvent('#meBox [data-pf="budgetMan"]', 'change'); await p.waitForTimeout(900);
  await p.click('.tabs [data-tab="timeline"]'); await p.waitForTimeout(300); await all('over_group');
  await p.ctx.close();
} };

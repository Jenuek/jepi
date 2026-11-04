// 나의 여행 취향 → 어떤 여행을 원하나요: 처음 · 속도 바꾸기 · 스타일 하나 고르기 · 목적 적기 · 혼자 여행(사람 만나기) · 예산 안내
module.exports = { name: 'taste', async run(t) {
  const { b, S, device, skipCoach, grab } = t;
  const p = t.page = await device(b, S); await p.click('[data-w="new"]'); await p.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(p);
  await p.click('.tabs [data-tab="more"]'); await p.click('#moreBox [data-tab="pref"]'); await p.waitForTimeout(250);
  await grab('start', '#tasteStyle');
  await p.click('#tasteStyle [data-radio="pace"][data-val="full"]'); await p.waitForTimeout(900); await grab('pace', '#tasteStyle');
  await p.click('#tasteStyle details.marks summary'); await p.waitForTimeout(100);
  await p.click('#tasteStyle [data-radio="style.walk"][data-val="less"]'); await p.waitForTimeout(900); await grab('style', '#tasteStyle');
  await p.fill('#tasteStyle [data-pf="purpose"]', '천천히 걷기'); await p.dispatchEvent('#tasteStyle [data-pf="purpose"]', 'change'); await p.waitForTimeout(900);
  await p.click('.tabs [data-tab="more"]'); await p.click('#moreBox [data-tab="pref"]'); await p.waitForTimeout(250); await grab('purpose', '#tasteStyle');
  // 혼자 여행으로 바꾸고 다시 열기
  await p.click('.tabs [data-tab="more"]'); await p.click('#moreBox [data-tab="me"]'); await p.waitForTimeout(250);
  await p.click('[data-meopen="who"]'); await p.click('#meBox [data-radio="party.type"][data-val="solo"]'); await p.waitForTimeout(900);
  await p.click('[data-meopen="bud"]'); await p.waitForTimeout(150); await grab('budget', '#meBox');
  await p.fill('#meBox [data-pf="budgetMan"]', '150'); await p.dispatchEvent('#meBox [data-pf="budgetMan"]', 'input'); await p.waitForTimeout(100); await grab('budget_typing', '#meBox .mebody');
  await p.waitForTimeout(900); await grab('budget_saved', '#meBox');
  await p.click('.tabs [data-tab="more"]'); await p.click('#moreBox [data-tab="pref"]'); await p.waitForTimeout(250); await grab('solo', '#tasteStyle');
  await p.ctx.close();
} };

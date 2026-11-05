// 아래 탭(.tabs)과 접히는 머리글 줄(#miniBar): 탭 바꾸기 · 더보기 안쪽 화면 · 경고 숫자 · 스크롤로 접힘 · ‹ › 날 바꾸기
module.exports = { name: 'bars', async run(t) {
  const { b, S, device, skipCoach, grab } = t;
  const p = t.page = await device(b, S);
  await grab('tabs_welcome', '=.tabs'); await grab('mini_welcome', '=#miniBar');
  await p.click('[data-w="new"]'); await p.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(p); await p.waitForTimeout(300);
  await grab('tabs0', '=.tabs'); await grab('mini0', '=#miniBar');
  for (const k of ['tray', 'map', 'more']) { await p.click(`.tabs [data-tab="${k}"]`); await p.waitForTimeout(500); await grab('tabs_' + k, '=.tabs'); await grab('mini_' + k, '=#miniBar') }
  await p.click('#moreBox [data-tab="plans"]'); await p.waitForTimeout(300); await grab('tabs_plans', '=.tabs'); await grab('mini_plans', '=#miniBar');
  await p.click('#side-plans .back'); await p.waitForTimeout(300); await grab('tabs_back', '=.tabs');
  await p.click('.tabs [data-tab="timeline"]'); await p.waitForTimeout(400);
  await p.evaluate(() => window.scrollTo(0, 900)); await p.waitForTimeout(500); await grab('tabs_scrolled', '=.tabs'); await grab('mini_scrolled', '=#miniBar');
  await p.evaluate(() => document.querySelector('[data-mbday="1"]').click()); await p.waitForTimeout(400); await grab('mini_next', '=#miniBar'); await grab('days_next', '#days');
  await p.evaluate(() => document.querySelector('[data-mbday="-1"]').click()); await p.waitForTimeout(400); await grab('mini_prev', '=#miniBar');
  await p.click('.tabs [data-tab="tray"]'); await p.waitForTimeout(500); await grab('mini_tray_scrolled', '=#miniBar');
  await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(500); await grab('mini_top', '=#miniBar');
  await p.ctx.close();
} };

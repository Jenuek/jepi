// 계획 메뉴: 계획 하나 · 새 계획 뒤 둘 · 바꾼 뒤
module.exports = { name: 'planmenu', async run(t) {
  const { b, S, device, skipCoach, grab } = t;
  const p = t.page = await device(b, S); await p.click('[data-w="new"]'); await p.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(p);
  await p.click('#planBtn'); await p.waitForTimeout(300); await grab('one', '#planMenu');
  await p.click('#planMenu [data-pmact="new"]'); await p.waitForTimeout(500);
  await p.keyboard.press('Escape'); await p.evaluate(() => { const o = document.getElementById('onb'); if (o && !o.hidden) document.getElementById('onbSkip')?.click() }); await p.waitForTimeout(400);
  await p.click('#planBtn', { force: true }); await p.waitForTimeout(300); await grab('two', '#planMenu');
  await p.ctx.close();
} };

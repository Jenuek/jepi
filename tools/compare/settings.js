// 설정: 로그인 전 · 테마/시간 간격 바꾼 뒤 · 초기화 한 번 누름 · 로그인 후 · AI 키 넣는 칸
module.exports = { name: 'settings', async run(t) {
  const { b, S, device, skipCoach, openSettings, grab } = t;
  const p = t.page = await device(b, S); await p.click('[data-w="new"]'); await p.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(p);
  await openSettings(p); await grab('logged_out', '#setBox');
  await p.click('[data-theme-set="dark"]'); await p.click('[data-zoom="100"]'); await grab('theme_zoom', '#setBox');
  await p.click('#wipeBtn'); await grab('wipe_armed', '#setBox'); await p.click('#wipeCancel');
  await p.click('[data-sbmode="join"]'); await grab('join_form', '#setBox');
  await p.fill('#sbEmail', 'st@x.com'); await p.fill('#sbPw', 'pass123'); await p.fill('#sbPw2', 'pass123'); await p.click('#sbGo'); await p.waitForTimeout(1800);
  await grab('logged_in', '#setBox');
  const k = await p.$('[data-keyedit]'); if (k) { await k.click(); await grab('key_edit', '#setBox') }
  await p.ctx.close();
} };

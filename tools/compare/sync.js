// 설정 → 기기 간 동기화: 로그인 · 가입 · 틀린 비밀번호 · 비밀번호 잊음 · 서버 주소 · 로그인 후
module.exports = { name: 'sync', async run(t) {
  const { b, S, device, skipCoach, openSettings, grab } = t;
  S.users['have@x.com'] = 'pass123';
  const p = t.page = await device(b, S); await p.click('[data-w="new"]'); await p.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(p);
  const sel = '#setBox section:nth-of-type(2)';
  await openSettings(p); await grab('login', sel);
  await p.click('[data-sbmode="join"]'); await grab('join', sel);
  await p.fill('#sbEmail', 'have@x.com'); await p.fill('#sbPw', 'pass123'); await p.fill('#sbPw2', 'other99'); await p.click('#sbGo'); await p.waitForTimeout(400); await grab('join_mismatch', sel);
  await p.click('[data-sbmode="login"]'); await p.fill('#sbEmail', 'have@x.com'); await p.fill('#sbPw', 'wrong!!'); await p.click('#sbGo'); await p.waitForTimeout(800); await grab('login_wrong', sel);
  await p.click('#sbForgot'); await p.waitForTimeout(800); await grab('forgot', sel);
  await p.click('#sbBack').catch(() => {}); await p.click('#sbSetup'); await grab('setup', sel); await p.click('#sbCancel');
  await p.fill('#sbEmail', 'have@x.com'); await p.fill('#sbPw', 'pass123'); await p.click('#sbGo'); await p.waitForTimeout(1800); await grab('logged_in', sel);
  await p.ctx.close();
} };

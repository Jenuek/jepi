// 첫 화면: 세 가지 · 로그인 · 비밀번호 틀림 · 비밀번호 잊었어요(이메일 없음) · 초대 받음(로그인/가입)
module.exports = { name: 'welcome', async run(t) {
  const { b, S, device, skipCoach, grab, openSettings } = t;
  let p = t.page = await device(b, S); await grab('pick', '#welcomeBox');
  await p.click('[data-w="login"]'); await p.waitForTimeout(200); await grab('login', '#welcomeBox');
  await p.click('[data-w="forgot"]'); await p.waitForTimeout(200); await grab('forgot_noemail', '#welcomeBox');
  await p.fill('#wEmail', 'nobody@x.com'); await p.fill('#wPw', 'wrongpw'); await p.click('#wGo'); await p.waitForTimeout(1500); await grab('wrong', '#welcomeBox');
  await p.click('[data-w="back"]'); await p.waitForTimeout(200); await grab('back', '#welcomeBox');
  await p.ctx.close();
  // an invite
  const A = await device(b, S); await A.click('[data-w="new"]'); await A.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(A);
  await openSettings(A); await A.click('[data-sbmode="join"]'); await A.fill('#sbEmail', 'wa@x.com'); await A.fill('#sbPw', 'pass123'); await A.fill('#sbPw2', 'pass123'); await A.click('#sbGo'); await A.waitForTimeout(1800);
  await A.click('.tabs [data-tab="more"]'); await A.click('#moreBox [data-tab="friends"]'); await A.waitForTimeout(200);
  await A.click('[data-trip="share"]'); await A.waitForTimeout(1200);
  const url = await A.inputValue('#friendsBox .share-text'); await A.ctx.close();
  p = t.page = await device(b, S, { q: '?' + url.split('?')[1] }); await p.waitForTimeout(400); await grab('invite', '#welcomeBox');
  await p.click('[data-w="mode-join"]'); await p.waitForTimeout(200); await grab('invite_join', '#welcomeBox');
  await p.ctx.close();
} };

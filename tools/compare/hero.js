// 머리글(#hero): 계획 이름 · 여행 줄 · 한 줄 소개 · 날짜 제목 고치기(열기·취소·저장·자동으로 되돌리기) · 손글씨 메모 · J/P 모드 · 계획 메뉴 열림 · 꾸미기(수첩 스타일·커버)
module.exports = { name: 'hero', async run(t) {
  const { b, S, device, skipCoach, grab } = t;
  const p = t.page = await device(b, S);
  await grab('welcome', '=#hero');
  await p.click('[data-w="new"]'); await p.waitForTimeout(250); await grab('onb', '=#hero');
  await p.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(p); await p.waitForTimeout(300);
  await grab('trip', '=#hero');
  await p.click('#days [data-day="1"]'); await p.waitForTimeout(300); await grab('day2', '=#hero');
  await p.click('#days [data-day="0"]'); await p.waitForTimeout(300);
  await p.click('[data-jp="P"]'); await p.waitForTimeout(400); await grab('p_mode', '=#hero');
  await p.click('[data-jp="J"]'); await p.waitForTimeout(400); await grab('j_mode', '=#hero');
  await p.click('#planBtn'); await p.waitForTimeout(300); await grab('menu_open', '=#hero');
  await p.click('#planBtn'); await p.waitForTimeout(300); await grab('menu_closed', '=#hero');
  await p.click('#planBtn'); await p.waitForTimeout(300); await p.keyboard.press('Escape'); await p.waitForTimeout(300); await grab('menu_esc', '=#hero');
  await p.click('#dayTitleEdit'); await p.waitForTimeout(300); await grab('title_edit', '=#hero');
  await p.fill('#dayTitleIn', '천천히 도착하는 날'); await p.fill('#dayMemoIn', '비행기에서 푹 자기'); await p.click('#dayTitleForm [type="submit"]'); await p.waitForTimeout(400); await grab('title_saved', '=#hero');
  await p.click('#dayTitleEdit'); await p.waitForTimeout(300); await p.click('#dayTitleCancel'); await p.waitForTimeout(300); await grab('title_cancel', '=#hero');
  await p.click('#dayTitleEdit'); await p.waitForTimeout(300); await p.fill('#dayTitleIn', ''); await p.click('#dayTitleForm [type="submit"]'); await p.waitForTimeout(400); await grab('title_auto', '=#hero');
  await p.click('#lookBtn'); await p.waitForTimeout(300);
  const tap = async sel => { await p.click('#sheet ' + sel); await p.waitForTimeout(200) };
  await tap('[data-lk="cover:sea"]'); await p.fill('#lkTag', '둘이서'); await p.click('#lookForm [type="submit"]'); await p.waitForTimeout(400); await grab('look_sea', '=#hero');
  await p.click('#lookBtn'); await p.waitForTimeout(300); await tap('[data-lk="style:note"]'); await p.click('#lookForm [type="submit"]'); await p.waitForTimeout(400); await grab('look_note', '=#hero');
  await p.evaluate(() => window.scrollTo(0, 900)); await p.waitForTimeout(500); await grab('scrolled', '=#hero');
  await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(500);
  await p.ctx.close();
} };

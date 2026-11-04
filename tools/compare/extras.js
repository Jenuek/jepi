// 다른 기능이 붙이는 조각: 공유한 여행의 "가고 싶어요"(장소 카드 · 블록 👍 표시 · 블록 시트 줄) · 🔔 알림 줄 · 손글씨 메모 칸
module.exports = { name: 'extras', async run(t) {
  const { b, S, device, skipCoach, grab, openSettings } = t;
  const A = await device(b, S); await A.click('[data-w="new"]'); await A.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(A);
  await openSettings(A); await A.click('[data-sbmode="join"]'); await A.fill('#sbEmail', 'ex@x.com'); await A.fill('#sbPw', 'pass123'); await A.fill('#sbPw2', 'pass123'); await A.click('#sbGo'); await A.waitForTimeout(1800);
  await A.click('.tabs [data-tab="more"]'); await A.click('#moreBox [data-tab="friends"]'); await A.waitForTimeout(200);
  await A.click('[data-trip="share"]'); await A.waitForTimeout(1200);
  const url = await A.inputValue('#friendsBox .share-text'); await A.ctx.close();
  const p = t.page = await device(b, S, { q: '?' + url.split('?')[1] });
  await p.click('[data-w="mode-join"]'); await p.fill('#wEmail', 'ey@x.com'); await p.fill('#wPw', 'pass123'); await p.click('#wGo'); await p.waitForTimeout(2500); await skipCoach(p);
  await p.evaluate(() => { document.querySelector('.tabs [data-tab="tray"]')?.click() }); await p.waitForTimeout(300); await grab('cards', '#cards');
  const id = await p.getAttribute('#cards details[open] [data-want] >> nth=0', 'data-want');
  await p.click(`#cards [data-want="${id}"]`); await p.waitForTimeout(600); await grab('wanted', '#cards');
  await p.click(`#cards [data-pick="${id}"]`); await p.waitForTimeout(300);
  await p.$eval('#grid .slot[data-t="1290"]', e => e.click()); await p.waitForTimeout(500); await grab('grid', '#grid');
  await p.click('#grid .blk:has-text("👍")'); await p.waitForTimeout(400); await grab('sheet', '#sheet');
  await p.ctx.close();
} };

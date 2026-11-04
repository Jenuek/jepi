// 직접 블록 만들기: 빈 시간에서 열기 · 이름 한 글자 · 이미 있는 장소와 비슷한 이름 · 저장 · 블록 정보 수정
module.exports = { name: 'custom', async run(t) {
  const { b, S, device, skipCoach, grab } = t;
  const p = t.page = await device(b, S); await p.click('[data-w="new"]'); await p.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(p);
  await p.$eval('#grid .slot[data-t="1290"]', e => e.click()); await p.waitForTimeout(400);
  await p.click('#sheet [data-newcustom]'); await p.waitForTimeout(300); await grab('new', '#sheet');
  await p.type('#cfName', '구'); await p.waitForTimeout(200); await grab('one', '#sheet');
  const near = await p.$eval('#grid .blk:not(.fixed) .bn', e => e.textContent.trim().slice(0, 3));
  await p.fill('#cfName', ''); await p.type('#cfName', near); await p.waitForTimeout(200); await grab('dup', '#sheet');
  await p.fill('#cfName', '친구 카페'); await p.dispatchEvent('#cfName', 'input'); await p.fill('#cfMemo', '창가 자리'); await p.waitForTimeout(200); await grab('typed', '#sheet');
  await p.click('#customForm [type="submit"]'); await p.waitForTimeout(500);
  await p.click('#grid .blk:has-text("친구 카페")'); await p.waitForTimeout(300);
  await p.click('#sheet [data-editcustom]'); await p.waitForTimeout(300); await grab('edit', '#sheet');
  await p.ctx.close();
} };

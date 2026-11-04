// 일정표 본체: Day 1 · 블록 메모 · 장소 넣기(넣기 → 빈칸) · Day 2 · 크게 보기(줌)
module.exports = { name: 'grid', async run(t) {
  const { b, S, device, skipCoach, grab } = t;
  const p = t.page = await device(b, S); await p.click('[data-w="new"]'); await p.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(p);
  await grab('day1', '#grid');
  await p.click('#grid .blk:not(.fixed) >> nth=0'); await p.waitForTimeout(300);
  await p.fill('#bmIn', '사진 찍기!'); await p.click('#bmSave'); await p.waitForTimeout(300);
  await p.click('#sheet [data-close] >> nth=0').catch(() => {}); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  await grab('memo', '#grid');
  await p.click('.tabs [data-tab="tray"]'); await p.waitForTimeout(200); await p.click('#cards details[open] [data-pick] >> nth=0'); await p.waitForTimeout(300);
  await grab('selected', '#grid');
  await p.click('#grid .slot[data-t="1260"]'); await p.waitForTimeout(400); await grab('placed', '#grid');
  await p.click('#days [data-day="1"]'); await p.waitForTimeout(300); await grab('day2', '#grid');
  await p.evaluate(() => { const b = document.querySelector('[data-zoom="100"]'); if (b) b.click() }); await p.waitForTimeout(300); await grab('zoom', '#grid');
  await p.ctx.close();
} };

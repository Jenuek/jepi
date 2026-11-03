// 장소 찾기: 빈 시간·일정에 · 동네 고르기 · 아무 때나 · AI 없이 찾기 · 블록 시트 뒤에 다시 열기
module.exports = { name: 'find', async run(t) {
  const { b, S, device, skipCoach, grab } = t;
  const p = t.page = await device(b, S); await p.click('[data-w="new"]'); await p.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(p);
  await p.evaluate(() => window.__jepi.openFind({ when: 'gap', into: 'sched' })); await grab('gap_sched', '#sheet');
  await p.click('[data-find="where:area"]'); await grab('area', '#sheet');
  await p.click('[data-find="when:any"]'); await p.click('[data-find="into:list"]'); await grab('any_list', '#sheet');
  await p.fill('#findQ', '카페'); await p.click('#findGo'); await p.waitForTimeout(300); await grab('no_ai', '#sheet');
  await p.click('#sheet [data-close]'); await p.click('#grid .blk >> nth=1'); await p.waitForTimeout(200); await grab('block_sheet', '#sheet');
  await p.click('#sheet [data-close="1"]').catch(() => {});
  await p.evaluate(() => window.__jepi.openFind({ where: 'city' })); await grab('again', '#sheet');
  await p.ctx.close();
} };

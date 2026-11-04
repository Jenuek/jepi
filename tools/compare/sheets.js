// 일정표 시트: 장소 블록 · 30분 뒤로 · 할 일 표시 켜기(상자 열린 채) · 대안으로 바꾸기 · 고정 블록 · 집→공항(10분 늘리기) · 빈 시간 시트
module.exports = { name: 'sheets', async run(t) {
  const { b, S, device, skipCoach, grab } = t;
  const p = t.page = await device(b, S); await p.click('[data-w="new"]'); await p.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(p);
  await p.evaluate(() => { let s = 7; Math.random = () => ((s = s * 16807 % 2147483647) / 2147483647) });
  const tap = async (sel, w = 300) => { await p.click('#sheet ' + sel); await p.waitForTimeout(w) };
  const esc = async () => { const c = await p.$$('#sheet [data-close]'); if (c.length) await c[c.length - 1].click(); await p.waitForTimeout(300) };
  await p.click('#grid .blk:not(.fixed) >> nth=1'); await p.waitForTimeout(300); await grab('place', '#sheet');
  await tap('[data-mv="30"]'); await grab('moved', '#sheet');
  await tap('details.marks summary'); await tap('[data-mark="wait+"]'); await grab('marked', '#sheet');
  await tap('[data-swap] >> nth=0', 400); await grab('swapped', '#sheet');
  await esc();
  await p.click('#grid .blk.fixed >> nth=1'); await p.waitForTimeout(300); await grab('fixed', '#sheet');
  await esc();
  await p.click('#grid .blk[data-uid="f0a"]').catch(() => {}); await p.waitForTimeout(300);
  if (await p.$('#sheet [data-home]')) { await tap('[data-home="10"]'); await grab('home', '#sheet') }
  await esc();
  await p.$eval('#grid .slot[data-t="1290"]', e => e.click()); await p.waitForTimeout(400); await grab('fill', '#sheet');
  await esc(); await p.$eval('#grid .slot[data-t="720"]', e => e.click()); await p.waitForTimeout(400); await grab('fill_noon', '#sheet');
  await p.ctx.close();
} };

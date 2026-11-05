// 🎲 DICE: 열기 · 뭐 먹지(주변 / 일정 기준, 굴리기, 다시) · 뭐 하지(일정 빈 시간 굴리기 · 다시 · 동네 고르기 · 주변 굴리기) · 지도 카드
module.exports = { name: 'dice', async run(t) {
  const { b, S, device, skipCoach, grab } = t;
  const p = t.page = await device(b, S); await p.click('[data-w="new"]'); await p.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(p);
  await p.emulateMedia({ reducedMotion: 'reduce' });
  await p.evaluate(() => { let s = 7; Math.random = () => ((s = s * 16807 % 2147483647) / 2147483647) });
  const tap = async (sel, w = 300) => { await p.click('#sheet ' + sel); await p.waitForTimeout(w) };
  await p.click('#diceFab'); await p.waitForTimeout(400); await grab('open', '#sheet');
  if (!(await p.$('#sheet [data-dobase]'))) await tap('[data-dicetab="do"]');   // at meal times it opens on 뭐 먹지
  await tap('[data-dobase="plan"]'); await grab('do_plan', '#sheet');
  await tap('#diceGo', 900); await grab('do_rolled', '#sheet');
  await tap('#diceAgain', 900); await grab('do_again', '#sheet');
  await tap('[data-dicemood] >> nth=1', 300); await grab('do_mood', '#sheet');
  await tap('[data-dobase="area"]'); await grab('do_area', '#sheet');
  await p.fill('#doAreaQ', '성수동'); await tap('#doAreaFind'); await grab('do_area_set', '#sheet');
  await tap('[data-dobase="near"]'); await tap('details.cond summary'); await tap('[data-dowhen="later"]'); await grab('do_near_later', '#sheet');
  await tap('[data-dogo="one"] >> nth=0', 1500); await grab('do_near_roll', '#sheet');
  await tap('[data-dicetab="eat"]'); await grab('eat', '#sheet');
  await tap('[data-eatbase="plan"]'); await grab('eat_plan', '#sheet');
  await tap('[data-eatroll="go"]', 900); await grab('eat_rolled', '#sheet');
  await tap('[data-eatbase="near"]'); await tap('[data-eatroll="go"]', 1500); await grab('eat_near', '#sheet');
  await tap('[data-close]');
  await p.click('.tabs [data-tab="map"]'); await p.waitForTimeout(800); await grab('map_cards', '#mapCards');
  await p.ctx.close();
} };

// P 모드 일정: 시간 구간 · 굴리기 · 다음 · 그만 · 다 봤어요 · 좋아요 · 다른 날
module.exports = { name: 'pview', async run(t) {
  const { b, S, device, skipCoach, grab } = t;
  const p = t.page = await device(b, S); await p.click('[data-w="new"]'); await p.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(p);
  await p.evaluate(() => { let s = 7; Math.random = () => ((s = s * 16807 % 2147483647) / 2147483647) });
  await p.click('[data-jp="P"]'); await p.waitForTimeout(400); await skipCoach(p); await grab('start', '#pview');
  const roll = await p.$('#pview [data-proll]'); if (!roll) return;
  await roll.click(); await p.waitForTimeout(300); await grab('rolled', '#pview');
  await p.click('#pview [data-pnext]'); await p.waitForTimeout(300); await grab('next', '#pview');
  for (let i = 0; i < 40 && await p.$('#pview [data-pnext]'); i++) { await p.click('#pview [data-pnext]'); await p.waitForTimeout(60) }
  await grab('seen_all', '#pview');
  await p.click('#pview [data-pclose] >> nth=0'); await p.waitForTimeout(300); await grab('closed', '#pview');
  await p.click('#pview [data-proll] >> nth=0'); await p.waitForTimeout(300); await p.click('#pview [data-pyes]'); await p.waitForTimeout(400); await grab('yes', '#pview');
  await p.click('#days [data-day="1"]'); await p.waitForTimeout(300); await grab('day2', '#pview');
  await p.ctx.close();
} };

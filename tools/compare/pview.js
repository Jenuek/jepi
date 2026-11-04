// P 모드 판: 닫힌 판 · 미리 열기 · 주사위 고르기 · 굴리기 · 다시 뽑기 · 내 카드에 넣기 · 그만 · 갈래요 · 빈 칸 · 내 카드 · 칸 눌러 블록 · 닫아 두기 · 다른 날
module.exports = { name: 'pview', async run(t) {
  const { b, S, device, skipCoach, grab } = t;
  const p = t.page = await device(b, S); await p.click('[data-w="new"]'); await p.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(p);
  await p.emulateMedia({ reducedMotion: 'reduce' });
  await p.evaluate(() => { let s = 7; Math.random = () => ((s = s * 16807 % 2147483647) / 2147483647) });
  const tap = async (sel, w = 400) => { await p.$eval('#pview ' + sel, x => x.click()); await p.waitForTimeout(w) };
  await p.click('[data-jp="P"]'); await p.waitForTimeout(400); await skipCoach(p); await grab('start', '#pview');
  await tap('[data-pahead]'); await grab('ahead', '#pview');
  await tap('[data-pmood="dopa"]'); await grab('mood', '#pview');
  await tap('[data-pmood="any"]'); await tap('[data-proll]', 1500); await grab('rolled', '#pview');
  await tap('[data-pnext]', 1500); await grab('next', '#pview');
  await tap('[data-pkeep]').catch(() => {}); await grab('kept', '#pview');
  await tap('[data-pclose]'); await grab('closed', '#pview');
  await tap('[data-pgap]', 1500); await grab('gap', '#pview');
  await tap('[data-pyes]'); await grab('yes', '#pview');
  await tap('[data-pcard]').catch(() => {}); await grab('card', '#pview');
  await tap('[data-psq]'); await grab('sq_sheet', '#sheet');
  await p.click('#sheet [data-close] >> nth=-1').catch(() => {}); await p.waitForTimeout(300);
  await tap('[data-pahead]'); await grab('ahead_off', '#pview');
  await p.click('#days [data-day="1"]'); await p.waitForTimeout(300); await grab('day2', '#pview');
  await p.ctx.close();
} };

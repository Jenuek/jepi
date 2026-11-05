// 고정 틀: 처음 안내(#coach) · 예약 도우미 틀(#helper) · 장소 고른 뒤 안내 줄(#banner). 틀 자신의 속성까지 비교해요("=").
module.exports = { name: 'frames', async run(t) {
  const { b, S, device, grab, skipCoach } = t;
  const p = t.page = await device(b, S); const oc = p.click.bind(p); p.click = async (s, ...a) => { try { return await oc(s, ...a) } catch (e) { console.log('FAILED click', s); throw e } };
  await grab('banner0', '=#banner'); await grab('coach0', '=#coach'); await grab('helper0', '=#helper');
  await p.click('[data-w="new"]'); await p.waitForTimeout(250);
  await p.evaluate(() => window.__jepi.demoLikeTrip()); await p.waitForTimeout(1200); await skipCoach(p);
  await grab('coach_off', '=#coach');
  await p.click('.tabs [data-tab="more"]'); await p.click('#moreBox [data-tab="help"]'); await p.waitForTimeout(250);
  await p.click('#helpBox button:has-text("처음 안내 다시 보기")'); await p.waitForTimeout(300);
  await grab('coach1', '=#coach');
  await p.click('#coachNext'); await p.waitForTimeout(300); await grab('coach2', '=#coach');
  for (let i = 0; i < 8 && (await p.textContent('#coachNext')) !== '시작하기'; i++) { await p.click('#coachNext'); await p.waitForTimeout(150) }
  await grab('coach_last', '=#coach');
  await p.click('#coachNext'); await p.waitForTimeout(300); await grab('coach_done', '=#coach');
  // 예약 도우미 틀
  await p.click('.tabs [data-tab="more"]'); await p.click('#moreBox [data-tab="me"]'); await p.waitForTimeout(250);
  await p.click('#meHelper'); await p.waitForTimeout(400); await grab('helper1', '=#helper');
  await p.click('#helperNext'); await p.waitForTimeout(300); await grab('helper2', '=#helper');
  await p.click('#helperNext'); await p.click('#helperNext'); await p.waitForTimeout(300); await grab('helper4', '=#helper');
  await p.click('#helperPrev'); await p.waitForTimeout(300); await grab('helper3', '=#helper');
  await p.click('#helperClose'); await p.waitForTimeout(400); await grab('helper_closed', '=#helper');
  await p.click('#helperBtn').catch(() => {}); await p.waitForTimeout(300);
  // 장소 고르기 → 안내 줄 → 취소
  await p.click('.tabs [data-tab="tray"]'); await p.waitForTimeout(300);
  await p.click('#cards details.zone summary >> nth=0'); await p.click('#cards details[open] [data-pick] >> nth=0'); await p.waitForTimeout(300);
  await grab('banner1', '=#banner');
  await p.click('#bannerCancel'); await p.waitForTimeout(300); await grab('banner2', '=#banner');
  await p.ctx.close();
} };

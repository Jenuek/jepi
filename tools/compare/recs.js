// 👍 여행자 추천: 로그인 전(볼 수만) · 👍 눌러 보기(로그인 안내) · 로그인 후 · 👍 켜기 · 블록 시트의 👍 · 끄기
module.exports = { name: 'recs', async run(t) {
  const { b, S, device, skipCoach, openSettings, grab } = t;
  const e = (n) => ({ k: '오사카|' + n.replace(/\s+/g, '').toLowerCase(), city: '오사카', name: n, cat: 'trip', lat: 34.66, lng: 135.43, dur: 60 });
  S.recs = [['U_a', '덴포잔 대관람차'], ['U_b', '덴포잔 대관람차'], ['U_b', '가이유칸 수족관']].map(([u, n]) => ({ user_id: u, k: e(n).k, city: '오사카', entry: e(n) }));
  S.users['have@x.com'] = 'pass123';
  const p = t.page = await device(b, S); await p.click('[data-w="new"]'); await p.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(p);
  const tray = async () => { await p.click('.tabs [data-tab="more"]'); await p.click('.tabs [data-tab="tray"]'); await p.waitForTimeout(300) };
  await tray(); await p.evaluate(() => { const o = document.getElementById('openOnly'); if (o.checked) o.click() }); await p.click('[data-group="pop"]'); await p.waitForTimeout(200);
  await grab('logged_out', '#side-tray');
  await p.click('#cards [data-vote] >> nth=0'); await p.waitForTimeout(300); await grab('vote_logged_out', '#side-tray');
  await openSettings(p); await p.fill('#sbEmail', 'have@x.com'); await p.fill('#sbPw', 'pass123'); await p.click('#sbGo'); await p.waitForTimeout(2000);
  await tray(); await p.waitForTimeout(500); await grab('logged_in', '#side-tray');
  await p.click('#cards [data-vote] >> nth=1'); await p.waitForTimeout(500); await grab('voted', '#side-tray');
  t.note && t.note('server rows ' + S.recs.length);
  await p.click('#cards [data-filter="users"], #filters [data-cat="users"]'); await p.waitForTimeout(300); await grab('users_filter', '#side-tray');
  await p.click('#cards [data-vote] >> nth=1'); await p.waitForTimeout(500); await grab('unvoted', '#side-tray');
  await p.click('#filters [data-cat="all"]'); await p.click('#cards [data-pick] >> nth=0'); await p.waitForTimeout(300);
  await p.click('.tabs [data-tab="timeline"]'); await p.waitForTimeout(300);
  const blk = await p.$('#grid .blk >> nth=-1'); if (blk) { await blk.click(); await p.waitForTimeout(300); await grab('sheet', '#sheet');
    const v = await p.$('#sheet [data-vote]'); if (v) { await v.click(); await p.waitForTimeout(500); await grab('sheet_voted', '#sheet') } }
  await p.ctx.close();
} };

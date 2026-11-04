// AI 빈 시간 추천 상자: 기다리는 중 · 추천 2개 · 하나 넣기 · 실패 · 닫기
module.exports = { name: 'aibox', async run(t) {
  const { b, S, device, skipCoach, grab } = t;
  const p = t.page = await device(b, S); let ids = [], fail = false;
  const ask = async () => { await p.click('#aiBtn'); await p.waitForTimeout(300); if (await p.$('#sheet [data-find="where:near"]')) await p.click('#sheet [data-find="where:near"]'); await p.click('#findGo') };
  await p.route(/api\.anthropic\.com/, async r => { const q = r.request().postData() || '';
    if (!q.includes('suggestions')) return r.fulfill({ status: 503, body: '{}' });
    await new Promise(x => setTimeout(x, 1500));
    if (fail) return r.fulfill({ status: 401, body: '{}' });
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ type: 'text', text: JSON.stringify({ suggestions: ids.map((id, i) => ({ id, start: ['22:00', '21:30', '12:00', '13:30', '22:10', '11:45'][i], reason: '이 시간에 가기 좋아요' })) }) }] }) }) });
  await p.click('[data-w="new"]'); await p.waitForTimeout(250);
  await p.fill('#onbKey_anthropic', 'sk-ant-test-key'); await p.click('#onbBody [data-onbkey="anthropic"]'); await p.waitForTimeout(300);
  await p.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(p);
  await p.click('.tabs [data-tab="tray"]'); await p.waitForTimeout(200);
  ids = await p.$$eval('#cards .card', e => e.filter(x => /식사|카페|한잔|밤|야경|바/.test(x.textContent) || 1).slice(0, 6).map(x => x.dataset.id));
  await p.click('.tabs [data-tab="timeline"]'); await p.waitForTimeout(200);
  await ask(); await p.waitForTimeout(1000); await grab('loading', '#aiBox');
  await p.waitForTimeout(1500); await grab('done', '#aiBox');
  if (await p.$('#aiBox [data-acc]')) { await p.click('#aiBox [data-acc] >> nth=0'); await p.waitForTimeout(300); await grab('added', '#aiBox') }
  await p.click('#aiClose'); await p.waitForTimeout(200); fail = true;
  await ask(); await p.waitForTimeout(2200); await grab('error', '#aiBox');
  await p.ctx.close();
} };

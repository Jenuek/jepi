// 채팅 (가짜 AI): 보내기 · 기다리는 중 · 바꿀 것 제안(적용하기/그대로 두기) · 적용 · 되돌리기 · 장소 제안(일정에/장소에만/안 함) · 더 정확하게 줄
module.exports = { name: 'chat', async run(t) {
  const { b, S, device, skipCoach, grab } = t;
  const p = t.page = await device(b, S); let reply = null;
  await p.route(/api\.anthropic\.com/, async r => { const q = r.request().postData() || '';
    if (!q.includes('what you will change')) return r.fulfill({ status: 503, body: '{}' });
    await new Promise(x => setTimeout(x, 1200));
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ type: 'text', text: JSON.stringify(reply) }] }) }) });
  await p.click('[data-w="new"]'); await p.waitForTimeout(250);
  await p.fill('#onbKey_anthropic', 'sk-ant-test-key'); await p.click('#onbBody [data-onbkey="anthropic"]'); await p.waitForTimeout(300);
  await p.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(p);
  await grab('nudges', '#nudges');
  await p.click('.tabs [data-tab="tray"]'); await p.waitForTimeout(200);
  const id = await p.getAttribute('#cards .card >> nth=0', 'data-id');
  await p.click('.tabs [data-tab="timeline"]'); await p.waitForTimeout(200);
  reply = { reply: '저녁 뒤에 하나 넣을게요.', ops: [{ op: 'add', day: 0, id, start: '21:30', dur: 60 }] };
  await p.fill('#chatInput', '밤에 하나 더 넣어 줘'); await p.click('#chatSend'); await p.waitForTimeout(500); await grab('busy', '#chatLog');
  await p.waitForTimeout(2500); await grab('proposal', '#chatLog');
  await p.click('#chatLog [data-chatapply]'); await p.waitForTimeout(300); await grab('applied', '#chatLog');
  await p.click('#chatLog [data-chatundo]'); await p.waitForTimeout(300); await grab('undone', '#chatLog');
  reply = { reply: '이런 곳은 어때요?', ops: [{ op: 'add_place', name: '테스트 카페', local: 'Test Cafe', area: 'namba', day: 0, start: '21:30', category: 'food', lat: 34.666, lng: 135.501, dur: 45, open: '10:00-23:00', closed: [], cost: 800, note: '조용한 카페예요' }, { op: 'add_place', name: '두번째 바', local: 'Bar Two', area: 'namba', category: 'night', lat: 34.667, lng: 135.502, dur: 60, open: null, closed: [], cost: 1500, note: '' }] };
  await p.fill('#chatInput', '카페 추천해 줘'); await p.click('#chatSend'); await p.waitForTimeout(2500); await grab('places', '#chatLog');
  await p.click('#chatLog [data-cp$=":1:list"]'); await p.waitForTimeout(300); await grab('listed', '#chatLog');
  await p.click('#chatLog [data-cp$=":0:skip"]'); await p.waitForTimeout(300); await grab('skipped', '#chatLog');
  await p.ctx.close();
} };

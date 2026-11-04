// 예약 내용 붙여 넣기 → AI로 채우기: 오가는 길(빈 칸으로 누름 · 채움) · 숙소(채움)
const say = (r, o) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ type: 'text', text: JSON.stringify(o) }] }) });
module.exports = { name: 'paste', async run(t) {
  const { b, S, device, skipCoach, grab } = t;
  const p = t.page = await device(b, S);
  await p.route(/api\.anthropic\.com/, r => { const q = r.request().postData() || '';
    if (q.includes('round trip')) return say(r, { startDate: null, endDate: null, mode: 'flight', out: { airport: null, dep: '09:10', arr: '11:05', flight: 'KE 723' }, back: { airport: null, dep: '18:40', arr: '20:35', flight: 'KE 724' } });
    if (q.includes('hotel stays')) return say(r, { stays: [{ name: '난바 호텔', area: 'namba', checkin: '15:00', checkout: '10:00', checkinDate: null, checkoutDate: null }] });
    r.fulfill({ status: 503, body: '{}' }) });
  await p.click('[data-w="new"]'); await p.waitForTimeout(250);
  await p.fill('#onbKey_anthropic', 'sk-ant-test-key'); await p.click('#onbBody [data-onbkey="anthropic"]'); await p.waitForTimeout(300);
  await p.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(p);
  await p.click('.tabs [data-tab="more"]'); await p.click('#moreBox [data-tab="me"]'); await p.waitForTimeout(250);
  await p.click('[data-meopen="way"]'); await p.waitForTimeout(200); await grab('way', '#meBox');
  await p.click('#meBox [data-aifill="flight"]'); await p.waitForTimeout(300); await grab('empty', '#meBox');
  await p.fill('#paste_flight', '대한항공 KE723 09:10 출발'); await p.click('#meBox [data-aifill="flight"]'); await p.waitForTimeout(1500); await grab('filled', '#meBox');
  await p.click('[data-meopen="stay"]'); await p.waitForTimeout(200);
  await p.fill('#paste_stay', '난바 호텔 체크인 15:00'); await p.click('#meBox [data-aifill="stay"]'); await p.waitForTimeout(1500); await grab('stay', '#meBox');
  await p.ctx.close();
} };

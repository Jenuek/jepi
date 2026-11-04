// 준비하기: 처음 · 하나 체크 · 체크 풀기 · 초기화 한 번 누름 · AI 연결(경고 해결·시즌 버튼) · 시즌 정보 받은 뒤(가짜 AI)
const say = (r, o) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ type: 'text', text: JSON.stringify(o) }] }) });
module.exports = { name: 'checks', async run(t) {
  const { b, S, device, skipCoach, grab } = t;
  const open = async p => { await p.click('.tabs [data-tab="more"]'); await p.click('#moreBox [data-tab="check"]'); await p.waitForTimeout(300) };
  let p = t.page = await device(b, S); await p.click('[data-w="new"]'); await p.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(p);
  await open(p); await grab('start', '#checks');
  await p.click('#checks input[data-ck] >> nth=0'); await p.waitForTimeout(200); await grab('ticked', '#checks');
  await p.click('#checks input[data-ck] >> nth=0'); await p.waitForTimeout(200); await grab('unticked', '#checks');
  await p.click('#resetBtn'); await p.waitForTimeout(200); await grab('reset_arm', '#checks');
  await p.ctx.close();
  p = t.page = await device(b, S);
  await p.route(/api\.anthropic\.com/, r => (r.request().postData() || '').includes('sunrise') ? say(r, { sunrise: '06:30', sunset: '17:10', weather: '맑고 선선해요', notes: ['얇은 겉옷 챙기기', '단풍 명소는 아침 일찍'], events: [] }) : r.fulfill({ status: 503, body: '{}' }));
  await p.click('[data-w="new"]'); await p.waitForTimeout(250);
  await p.fill('#onbKey_anthropic', 'sk-ant-test-key'); await p.click('#onbBody [data-onbkey="anthropic"]'); await p.waitForTimeout(300);
  await p.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(p);
  await open(p); await grab('ai', '#checks');
  await p.click('#seasonBtn'); await p.waitForTimeout(2500); await open(p); await grab('season', '#checks');
  await p.ctx.close();
} };

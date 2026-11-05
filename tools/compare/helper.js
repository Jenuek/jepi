// 예약 도우미 (가짜 AI): ① ♥ 누르기 · 목록 붙여 넣기 ② 동네 고르기 · 분위기 · 숙소 후보 ③ 시간대 가정하기 · 노선 ④ 예약 상태
const say = (r, o) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ type: 'text', text: JSON.stringify(o) }] }) });
module.exports = { name: 'helper', async run(t) {
  const { b, S, device, skipCoach, grab } = t;
  const p = t.page = await device(b, S);
  await p.route(/api\.anthropic\.com/, r => { const q = r.request().postData() || '';
    if (q.includes('pasted places')) return say(r, { places: [{ name: '우메다 스카이 빌딩', local: 'Umeda Sky Building', area: 'umeda', cat: 'walk', lat: 34.705, lng: 135.49, dur: 60, open: '09:30-22:30', closed: [], cost: 2000, tags: ['야경'], note: '전망대예요.', cash: false }] });
    if (q.includes('Describe these neighbourhoods')) return say(r, { areas: [{ key: 'namba', vibe: '밤늦게까지 활기차요', good: '먹방 여행', caution: '시끄러워요' }] });
    if (q.includes('places to stay')) return say(r, { stays: [{ name: '난바 호텔', local: 'Namba Hotel', type: '호텔', why: '역 앞이에요', price: '1박 12만원', caution: '' }] });
    if (q.includes('usual ways to get there')) return say(r, { routes: [{ from: '인천', to: '간사이', type: '직항', carriers: ['대한항공', '피치'], lcc: true, duration: '약 1시간 40분', note: '아침 편이 많아요' }], tips: ['저비용 항공은 짐 요금 확인'] });
    r.fulfill({ status: 503, body: '{}' }) });
  await p.click('[data-w="new"]'); await p.waitForTimeout(250);
  await p.fill('#onbKey_anthropic', 'sk-ant-test-key'); await p.click('#onbBody [data-onbkey="anthropic"]'); await p.waitForTimeout(300);
  await p.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(p);
  await p.click('.tabs [data-tab="more"]'); await p.click('#moreBox [data-tab="me"]'); await p.waitForTimeout(250);
  await p.click('#meHelper'); await p.waitForTimeout(400); await grab('s0', '#helperBody');
  await p.click('#helperBody [data-wish] >> nth=1'); await p.waitForTimeout(200);
  await p.fill('#wishPaste', '우메다 스카이 빌딩'); await p.click('#wishPasteBtn'); await p.waitForTimeout(1200); await grab('s0_pasted', '#helperBody');
  await p.click('#helperNext'); await p.waitForTimeout(300); await grab('s1', '#helperBody');
  await p.click('#helperBody [data-setarea] >> nth=1'); await p.waitForTimeout(300);
  await p.click('#vibeBtn'); await p.waitForTimeout(1200);
  await p.click('#helperBody [data-hotels] >> nth=0'); await p.waitForTimeout(1200); await grab('s1_ai', '#helperBody');
  await p.click('#helperNext'); await p.waitForTimeout(300); await grab('s2', '#helperBody');
  await p.click('#helperBody [data-slot] >> nth=1'); await p.waitForTimeout(300); await grab('s2_slot', '#helperBody');
  await p.click('#routeBtn'); await p.waitForTimeout(1200); await grab('s2_route', '#helperBody');
  await p.click('#helperNext'); await p.waitForTimeout(300); await grab('s3', '#helperBody');
  await p.click('#helperBody [data-radio="bookedStay"][data-val="false"]'); await p.waitForTimeout(300); await grab('s3_radio', '#helperBody');
  await p.ctx.close();
} };

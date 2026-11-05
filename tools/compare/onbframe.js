// 처음 설정의 틀(#onb): 제목·안내·이전/다음/건너뛰기 · 시작 방법별 · 다음 단계 · 준비하는 동안 잠김(가짜 AI) · 끝내기
const say = (r, o) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ type: 'text', text: JSON.stringify(o) }] }) });
module.exports = { name: 'onbframe', async run(t) {
  const { b, S, device, skipCoach, grab } = t;
  const fresh = async (ls) => { const p = t.page = await device(b, S, ls ? { ls } : undefined); const oc = p.click.bind(p); p.click = async (q, ...a) => { try { return await oc(q, ...a) } catch (e) { console.log('FAILED click', q); throw e } }; await p.click('[data-w="new"]'); await p.waitForTimeout(250); return p };
  const tap = async (p, sel) => { await p.click('#onbBody ' + sel); await p.waitForTimeout(250) };
  let p = await fresh();
  await grab('jp', '=#onb');
  await tap(p, '[data-pickjp="J"]'); await grab('chooser', '=#onb');
  await tap(p, '[data-startmode="quick"]:not([data-destmode])'); await grab('quick', '=#onb');
  await p.fill('#onbBody [data-pf="dest"]', '부산'); await p.click('#onbNext'); await p.waitForTimeout(300); await grab('need_dates', '=#onb');
  await tap(p, '#dateUnknown'); await p.click('#onbNext'); await p.waitForTimeout(400); await grab('step2', '=#onb');
  if (await p.isEnabled('#onbPrev')) await p.click('#onbPrev'); await p.waitForTimeout(300); await grab('back', '=#onb');
  await p.ctx.close();
  p = await fresh(); await tap(p, '[data-pickjp="P"]'); await grab('p_start', '=#onb');
  await tap(p, '[data-q="when"][data-qv="pick"]'); await tap(p, '[data-q="len"][data-qv="0"]'); await grab('p_pick', '=#onb');
  await p.ctx.close();
  p = await fresh(); await tap(p, '[data-pickjp="J"]'); await tap(p, '[data-startmode="day"]'); await grab('day', '=#onb');
  await p.ctx.close();
  // 준비하는 동안: 가짜 AI가 천천히 답해요 (여행지 준비 → 장소 찾는 중 → 기다리지 않고 시작)
  p = await fresh();
  await p.route(/api\.anthropic\.com/, async r => { await new Promise(x => setTimeout(x, 1800)); const q = r.request().postData() || '';
    if (q.includes('not a real travel destination')) return say(r, { ok: true, city: '도쿄', country: '일본', intl: true, currency: 'JPY', symbol: '¥', rate: 9, transit: '지하철', fare: { base: 180, perKm: 10, max: 0 }, snack: 1500, step: 100,
      areas: [{ key: 'shinjuku', name: '신주쿠', lat: 35.69, lng: 139.7, zone: 'west' }, { key: 'asakusa', name: '아사쿠사', lat: 35.71, lng: 139.79, zone: 'east' }], zones: { west: '서부', east: '동부' },
      gateways: [{ key: 'hnd', name: '하네다', kind: 'air', iata: 'HND', lat: 35.55, lng: 139.78, min: 30, fare: 500 }], checks: ['교통카드 챙기기'], arrivalNote: '' });
    await new Promise(x => setTimeout(x, 4000)); r.fulfill({ status: 503, body: '{}' }) });
  await p.fill('#onbKey_anthropic', 'sk-ant-test-key'); await p.click('#onbBody [data-onbkey="anthropic"]'); await p.waitForTimeout(300);
  await tap(p, '[data-pickjp="J"]'); await tap(p, '[data-startmode="quick"]:not([data-destmode])');
  await p.fill('#onbBody [data-pf="dest"]', '도쿄'); await p.fill('#onbBody [data-pf="startDate"]', '2027-03-01'); await p.selectOption('#onbBody [data-pf="nights"]', { index: 2 }); await p.waitForTimeout(250);
  await p.click('#onbNext'); await p.waitForTimeout(250); await grab('preparing_next', '=#onb'); await p.waitForTimeout(1200); await grab('finishing', '=#onb');
  await p.click('#onbSkip'); await p.waitForTimeout(800); await grab('after_skip', '=#onb');
  await p.ctx.close();
} };

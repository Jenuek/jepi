// 설정 → AI·지도 연결: 키 없음 · 키 있음 · 키 칸 열림 · 보기 · 삭제 뒤 · Google 키(영업시간 줄)
module.exports = { name: 'aikeys', async run(t) {
  const { b, S, device, skipCoach, openSettings, grab } = t;
  const sel = '#setBox section:nth-of-type(4)';
  const p = t.page = await device(b, S); await p.click('[data-w="new"]'); await p.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(p);
  await openSettings(p); await grab('no_keys', sel);
  await p.click('[data-keyedit="anthropic"]'); await p.waitForTimeout(100); await grab('edit', sel);
  await p.fill('#keyIn', 'sk-ant-typed'); await p.click('#keyShow'); await grab('show', sel);
  await p.click('#keyCancel'); await p.ctx.close();
  const q = t.page = await device(b, S, { ls: { 'jepi.keys': { gemini: 'AIzaGEMINIKEY000', kakao: '0123456789abcdef0123456789abcdef', gmaps: 'AIzaMAPSKEY00000' } } });
  await q.click('[data-w="new"]'); await q.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(q);
  await openSettings(q); await grab('keys', sel);
  await q.click('[data-keydel="kakao"]'); await q.waitForTimeout(150); await openSettings(q); await grab('deleted', sel);
  await q.ctx.close();
} };

// 설정 → 내 장소: 처음 · 집 편집 · 장소 추가 · 키 없이 · 등록된 장소
module.exports = { name: 'myplaces', async run(t) {
  const { b, S, device, skipCoach, openSettings, grab } = t;
  const p = t.page = await device(b, S, { ls: { 'jepi.myplaces': [{ id: 'home', name: '집', ll: [37.5665, 126.978], addr: '서울 중구 세종대로 110' }, { id: 'work', name: '회사', ll: null, addr: '' }, { id: 'px', name: '헬스장', ll: [37.4, 127.1], addr: '' }] } });
  await p.click('[data-w="new"]'); await p.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(p);
  const sel = '#setBox section:nth-of-type(3)';
  await openSettings(p); await grab('list', sel);
  await p.click('[data-mypedit="home"]'); await grab('edit_home', sel);
  await p.click('#mypDone'); await p.click('[data-mypedit="px"]'); await grab('edit_custom', sel);
  await p.click('#mypDone'); await p.click('#mypAdd'); await grab('added', sel);
  await p.ctx.close();
} };

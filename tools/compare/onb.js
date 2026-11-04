// 처음 설정: J/P 고르기 · 시작 방법 · 가고 싶은 곳(여행지·날짜·동행, 날짜 먼저 안내) · 여행지 추천(찾기) · P 가볍게 시작 · 하루 코스 → 이번 여행 줄
module.exports = { name: 'onb', async run(t) {
  const { b, S, device, skipCoach, grab } = t;
  const fresh = async () => { const p = t.page = await device(b, S); await p.click('[data-w="new"]'); await p.waitForTimeout(250); return p };
  const tap = async (p, sel) => { await p.click('#onbBody ' + sel); await p.waitForTimeout(250) };
  let p = await fresh();
  await grab('jp', '#onbBody');
  await tap(p, '[data-pickjp="J"]'); await grab('chooser', '#onbBody');
  await tap(p, '[data-startmode="quick"]:not([data-destmode])'); await grab('quick', '#onbBody');
  await p.fill('#onbBody [data-pf="dest"]', '부산'); await p.click('#onbNext'); await p.waitForTimeout(300); await grab('need_dates', '#onbBody');
  await tap(p, '[data-radio="party.type"][data-val="family"]'); await grab('family', '#onbBody');
  await tap(p, '#dateUnknown'); await grab('unknown', '#onbBody');
  await tap(p, '[data-destmode="find"]'); await grab('finder', '#onbBody');
  await p.ctx.close();
  p = await fresh(); await tap(p, '[data-pickjp="P"]'); await grab('p_start', '#onbBody');
  await tap(p, '[data-q="when"][data-qv="pick"]'); await tap(p, '[data-q="len"][data-qv="0"]'); await tap(p, '[data-kwtoggle="카페"]'); await grab('p_pick', '#onbBody');
  await tap(p, '#quickStart'); await grab('p_nodest', '#onbBody');
  await p.ctx.close();
  p = await fresh(); await tap(p, '[data-pickjp="J"]'); await tap(p, '[data-startmode="day"]'); await grab('day', '#onbBody');
  await p.fill('#onbBody [data-pf="dest"]', '성수동'); await tap(p, '[data-q="when"][data-qv="tomorrow"]'); await tap(p, '#quickStart'); await p.waitForTimeout(800); await skipCoach(p);
  await p.click('.tabs [data-tab="more"]'); await p.click('#moreBox [data-tab="me"]'); await p.waitForTimeout(250); await grab('day_rows', '#meBox');
  await p.click('[data-meopen="day"]'); await p.waitForTimeout(150); await grab('day_form', '#meBox');
  await p.ctx.close();
} };

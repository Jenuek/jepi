// 이번 여행 forms: 언제·어디(예약 상태·기간·날짜 미정) · 누구와(가족) · 오가는 길(기차·자동차) · 숙소(추가·예약 전) · 예약한 일정(추가)
module.exports = { name: 'forms', async run(t) {
  const { b, S, device, skipCoach, grab } = t;
  const p = t.page = await device(b, S); await p.click('[data-w="new"]'); await p.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(p);
  await p.click('.tabs [data-tab="more"]'); await p.click('#moreBox [data-tab="me"]'); await p.waitForTimeout(250);
  const open = async id => { await p.click(`[data-meopen="${id}"]`); await p.waitForTimeout(150) };
  const tap = async sel => { await p.click('#meBox ' + sel); await p.waitForTimeout(800) };
  await open('when'); await grab('when', '#meBox');
  await tap('[data-radio="bookedStay"][data-val="false"]'); await grab('when_nostay', '#meBox');
  await tap('#dateUnknown'); await grab('when_unknown', '#meBox');
  await open('who'); await tap('[data-radio="party.type"][data-val="family"]'); await grab('who_family', '#meBox');
  await open('way'); await grab('way', '#meBox');
  await tap('[data-radio="mode"][data-val="train"]'); await grab('way_train', '#meBox');
  await tap('[data-radio="mode"][data-val="car"]'); await grab('way_car', '#meBox');
  await tap('[data-radio="bookedFlight"]').catch(() => {});
  await open('stay'); await grab('stay_nobook', '#meBox');
  await tap('[data-addstay]'); await grab('stay_two', '#meBox');
  await tap('[data-delstay="1"]'); await grab('stay_one', '#meBox');
  await open('ev'); await grab('ev', '#meBox');
  await tap('[data-addev]'); await tap('[data-addev]'); await grab('ev_two', '#meBox');
  await tap('[data-delev="0"]'); await grab('ev_one', '#meBox');
  await open('bud'); await grab('bud', '#meBox');
  await p.ctx.close();
} };

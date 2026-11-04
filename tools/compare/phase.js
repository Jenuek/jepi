// 여행 단계 띠: 여행 전(D-n) · 여행 중(지금·다음·안내 시작, 다른 날 보는 중) · 여행 뒤
// The demo trip starts 3 weeks after "today", so the clock is moved after the demo is loaded.
module.exports = { name: 'phase', async run(t) {
  const { b, S, device, skipCoach, grab } = t;
  const at = async (shiftDays, hm, day) => { const p = t.page = await device(b, S); await p.click('[data-w="new"]'); await p.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(p);
    if (shiftDays != null) {
      const start = await p.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => k.endsWith('gp.profile')))).startDate);
      const d = new Date(start + 'T' + hm + ':00'); d.setDate(d.getDate() + shiftDays); await p.clock.setFixedTime(d);
    }
    await p.click(`#days [data-day="${day || 0}"]`); await p.waitForTimeout(300); return p };
  let p = await at(null); await grab('before', '#phase'); await p.ctx.close();
  p = await at(0, '16:20'); await grab('now', '#phase'); await p.ctx.close();
  p = await at(1, '10:05', 2); await grab('now_other_day', '#phase'); await p.ctx.close();
  p = await at(30, '10:00'); await grab('after', '#phase'); await p.ctx.close();
} };

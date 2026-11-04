// What is saved on the device (localStorage) after the same steps: 새 여행 → 데모 같은 여행 → 블록 옮기기·할 일 표시·♥ ·
// 준비 체크 · 간식비 · 이번 여행 고치기 · 취향 · 직접 블록 · 새 계획 · 계획 바꾸기 · 계획 지우기.
// Times and clock-made ids are blanked so only what the app chose to save is compared.
const dump = () => {
  const norm = v => JSON.stringify(v).replace(/\d{10,}/g, '#').replace(/"(p|c|g)[a-z0-9]{7,10}"/g, '"$1~"').replace(/u\d+/g, 'u~');
  const ks = Object.keys(localStorage).filter(k => k.startsWith('gp.') || k.startsWith('jepi.')).filter(k => !/^jepi\.(sync|vk|keysAt|kwAt|mypAt|zoomAt)$/.test(k)).sort();
  let el = document.getElementById('__dump'); if (!el) { el = document.createElement('pre'); el.id = '__dump'; document.body.appendChild(el) }
  el.textContent = ks.map(k => { let v; try { v = JSON.parse(localStorage.getItem(k)) } catch (_) { v = localStorage.getItem(k) } return k.replace(/gp\.plan\.\w+/, 'gp.plan.~') + ' = ' + norm(v) }).join('\n');
};
module.exports = { name: 'saved', async run(t) {
  const { b, S, device, skipCoach, grab } = t;
  const p = t.page = await device(b, S); await p.click('[data-w="new"]'); await p.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(p);
  const snap = async k => { await p.waitForTimeout(1500); await p.evaluate(dump); await grab(k, '#__dump') };
  await snap('start');
  await p.click('#grid .blk:not(.fixed) >> nth=1'); await p.waitForTimeout(300); await p.click('#sheet [data-mv="30"]'); await p.waitForTimeout(200);
  await p.click('#sheet details.marks summary'); await p.click('#sheet [data-mark="wait+"]'); await p.waitForTimeout(200);
  await p.click('#sheet [data-close] >> nth=-1'); await p.waitForTimeout(200);
  await p.click('.tabs [data-tab="tray"]'); await p.click('#cards details[open] [data-wish] >> nth=0'); await p.waitForTimeout(200);
  await p.click('.tabs [data-tab="timeline"]'); await p.click('#daySum [data-sum="budget"]'); await p.click('#budget [data-meal]:not([data-meal^="-"])'); await p.waitForTimeout(200);
  await snap('edits');
  await p.click('.tabs [data-tab="more"]'); await p.click('#moreBox [data-tab="check"]'); await p.waitForTimeout(200); await p.click('#checks input[data-ck] >> nth=0'); await p.waitForTimeout(200);
  await p.click('.tabs [data-tab="more"]'); await p.click('#moreBox [data-tab="me"]'); await p.waitForTimeout(200);
  await p.click('[data-meopen="who"]'); await p.click('#meBox [data-radio="party.type"][data-val="friends"]'); await p.waitForTimeout(900);
  await p.click('.tabs [data-tab="more"]'); await p.click('#moreBox [data-tab="pref"]'); await p.waitForTimeout(200);
  await p.click('#tasteStyle [data-radio="pace"][data-val="full"]'); await p.waitForTimeout(900);
  await snap('me_taste');
  await p.click('.tabs [data-tab="timeline"]'); await p.$eval('#grid .slot[data-t="1290"]', e => e.click()); await p.waitForTimeout(300);
  await p.click('#sheet [data-newcustom]'); await p.waitForTimeout(200); await p.fill('#cfName', '친구 카페'); await p.click('#customForm [type="submit"]'); await p.waitForTimeout(300);
  await snap('custom');
  await p.click('#planBtn'); await p.waitForTimeout(200); await p.click('#planMenu [data-pmact="new"]'); await p.waitForTimeout(500);
  await snap('new_plan');
  await p.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(p).catch(() => {}); await p.waitForTimeout(300);
  await p.click('#planBtn', { force: true }); await p.waitForTimeout(200); await p.click('#planMenu [data-pmopen]:not(.cur) >> nth=0'); await p.waitForTimeout(500);
  await snap('switched');
  await p.ctx.close();
} };

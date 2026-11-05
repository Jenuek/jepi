// 일정표 아래 대화 칸(#chat): AI 키 없음 · 있음 · Enter로 보내기(여러 줄) · 기다림 · 접기/펼치기 · P모드 안내 글 · 직접 만들기 · 빈 시간 채우기
module.exports = { name: 'dock', async run(t) {
  const { b, S, device, skipCoach, grab } = t;
  const p = t.page = await device(b, S);
  await p.route(/api\.anthropic\.com/, async r => { await new Promise(x => setTimeout(x, 1500));
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ type: 'text', text: JSON.stringify({ reply: '알겠어요.', ops: [] }) }] }) }) });
  await p.click('[data-w="new"]'); await p.waitForTimeout(250);
  await p.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(p);
  await grab('nokey', '=#chat');
  await p.click('#customBtn'); await p.waitForTimeout(300); await grab('custom_sheet', '=#sheetBg');
  await p.click('#sheet [data-close]'); await p.waitForTimeout(300);
  await p.click('.tabs [data-tab="timeline"]'); await p.waitForTimeout(200);
  await p.evaluate(() => { localStorage.setItem('jepi.keys', JSON.stringify({ anthropic: 'sk-ant-test-key' })) }); await p.reload(); await p.waitForTimeout(3500); await skipCoach(p);
  await grab('key', '=#chat');
  await p.click('[data-jp="P"]'); await p.waitForTimeout(300); await grab('p_mode', '=#chat');
  await p.click('[data-jp="J"]'); await p.waitForTimeout(300);
  await p.click('#chatInput'); await p.keyboard.type('첫 줄'); await p.keyboard.press('Shift+Enter'); await p.keyboard.type('둘째 줄'); await p.keyboard.press('Shift+Enter'); await p.keyboard.type('셋째 줄');
  await grab('typed', '=#chat');
  await p.keyboard.press('Enter'); await p.waitForTimeout(500); await grab('busy', '=#chat');
  await p.waitForTimeout(2500); await grab('answered', '=#chat');
  await p.click('#chatFold'); await p.waitForTimeout(300); await grab('folded', '=#chat');
  await p.click('#chatFold'); await p.waitForTimeout(300); await grab('unfolded', '=#chat');
  await p.click('#chatSend'); await p.waitForTimeout(300); await grab('empty_send', '=#chat');
  await p.click('#aiBtn'); await p.waitForTimeout(500); await grab('find_sheet', '=#sheetBg');
  await p.ctx.close();
} };

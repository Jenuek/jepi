// What is SENT to the AI (not what the screen shows): the question text of 빈 시간 채우기 · 채팅 · 시즌 정보 · 동네 분위기 ·
// 숙소 후보 · 노선, with a pretend AI that answers nothing useful. Each question is put on the page so it can be compared.
// Times that change with the clock (today's date, seconds) are blanked.
module.exports = { name: 'prompts', async run(t) {
  const { b, S, device, skipCoach, grab } = t;
  const p = t.page = await device(b, S); const sent = [];
  await p.route(/api\.anthropic\.com/, r => {
    let q = ''; try { const j = JSON.parse(r.request().postData() || '{}'); q = (j.messages || []).map(m => typeof m.content === 'string' ? m.content : JSON.stringify(m.content)).join('\n') + '\n[system] ' + (typeof j.system === 'string' ? j.system : JSON.stringify(j.system || '')) } catch (_) { q = r.request().postData() || '' }
    sent.push(q.replace(/\d{4}-\d{2}-\d{2}T[\d:.]+Z?/g, '<time>'));
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ type: 'text', text: '{}' }] }) });
  });
  const show = async k => { await t.page.evaluate(([k, s]) => { let d = document.getElementById('sentPrompts'); if (!d) { d = document.createElement('pre'); d.id = 'sentPrompts'; d.hidden = true; document.body.append(d) } d.textContent = s }, [k, sent.join('\n=====\n')]); await grab(k, '#sentPrompts'); sent.length = 0 };
  await p.click('[data-w="new"]'); await p.waitForTimeout(250);
  await p.fill('#onbKey_anthropic', 'sk-ant-test-key'); await p.click('#onbBody [data-onbkey="anthropic"]'); await p.waitForTimeout(300);
  await p.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(p);
  sent.length = 0;
  // 빈 시간 채우기
  await p.click('#aiBtn'); await p.waitForTimeout(300); if (await p.$('#sheet [data-find="where:near"]')) await p.click('#sheet [data-find="where:near"]'); await p.click('#findGo'); await p.waitForTimeout(2500); await show('fill');
  await p.click('#sheet [data-close] >> nth=-1').catch(() => {}); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  // 채팅
  await p.fill('#chatInput', '저녁에 하나 넣어 줘'); await p.click('#chatSend'); await p.waitForTimeout(2500); await show('chat');
  // 시즌 정보
  await p.click('.tabs [data-tab="more"]'); await p.click('#moreBox [data-tab="check"]'); await p.waitForTimeout(300);
  await p.click('#seasonBtn').catch(() => {}); await p.waitForTimeout(2500); await show('season');
  // 예약 도우미: 동네 분위기 · 숙소 · 노선
  await p.click('.tabs [data-tab="more"]'); await p.click('#moreBox [data-tab="me"]'); await p.waitForTimeout(300);
  await p.click('#meHelper'); await p.waitForTimeout(400); await p.click('#helperNext'); await p.waitForTimeout(300);
  await p.click('#vibeBtn').catch(() => {}); await p.waitForTimeout(2000); await show('vibe');
  await p.click('#helperBody [data-hotels] >> nth=0').catch(() => {}); await p.waitForTimeout(2000); await show('hotels');
  await p.click('#helperNext'); await p.waitForTimeout(300); await p.click('#routeBtn').catch(() => {}); await p.waitForTimeout(2000); await show('routes');
  // 장소 더 찾기 (P모드 장소 탭: AI에게 추천받기)
  await p.click('#helperClose').catch(() => {}); await p.waitForTimeout(200);
  await p.click('[data-jp="P"]'); await p.waitForTimeout(400); await skipCoach(p).catch(() => {});
  await p.click('.tabs [data-tab="tray"]'); await p.waitForTimeout(300); await p.click('#cards [data-pairec]').catch(() => {}); await p.waitForTimeout(2500); await show('more');
  await p.ctx.close();
  // 여행지 준비 (처음 설정: 가고 싶은 곳이 있어요 → 여행지 적기 → AI로 여행지 준비하기)
  const q = t.page = await device(b, S);
  await q.route(/api\.anthropic\.com/, r => { let x = ''; try { const j = JSON.parse(r.request().postData() || '{}'); x = (j.messages || []).map(m => typeof m.content === 'string' ? m.content : JSON.stringify(m.content)).join('\n') } catch (_) {} sent.push(x); r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ type: 'text', text: '{"ok":false}' }] }) }) });
  await q.click('[data-w="new"]'); await q.waitForTimeout(250);
  await q.fill('#onbKey_anthropic', 'sk-ant-test-key'); await q.click('#onbBody [data-onbkey="anthropic"]'); await q.waitForTimeout(300);
  await q.click('#onbBody [data-pickjp="J"]'); await q.waitForTimeout(250);
  await q.click('#onbBody [data-startmode="quick"] >> nth=0'); await q.waitForTimeout(300);
  sent.length = 0;
  await q.fill('#onb [data-pf="dest"]', '오사카'); await q.click('#onb #genPack'); await q.waitForTimeout(2500);
  await show('destination');
  await q.ctx.close();
} };

// What is SENT to the AI (not what the screen shows): the question text of 빈 시간 채우기 · 채팅 · 시즌 정보 · 동네 분위기 ·
// 숙소 후보 · 노선, with a pretend AI that answers nothing useful. Each question is put on the page so it can be compared.
// Times that change with the clock (today's date, seconds) are blanked.
module.exports = { name: 'prompts', async run(t) {
  const { b, S, device, skipCoach, grab } = t;
  const p = t.page = await device(b, S); const sent = [];
  await p.route(/api\.anthropic\.com/, r => {
    let q = ''; try { const j = JSON.parse(r.request().postData() || '{}'); q = (j.messages || []).map(m => typeof m.content === 'string' ? m.content : JSON.stringify(m.content)).join('\n') + '\n[system] ' + (typeof j.system === 'string' ? j.system : JSON.stringify(j.system || '')) } catch (_) { q = r.request().postData() || '' }
    sent.push(q.replace(/\d{4}-\d{2}-\d{2}T[\d:.]+Z?/g, '<time>'));
    // the chat: propose putting the first candidate on top of the first fixed block, so the app asks once more to fix it
    if (q.includes('You help edit a trip schedule') && !q.includes('Your previous answer')) {
      const id = (q.match(/Candidate places[^\n]*\n\[\["([^"]+)"/) || [])[1];
      if (id) return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ type: 'text', text: JSON.stringify({ reply: '넣어 볼게요.', ops: [{ op: 'add', day: 0, id, start: '03:00', dur: 600 }] }) }] }) });
    }
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
  await p.fill('#chatInput', '저녁에 하나 넣어 줘'); await p.click('#chatSend'); await p.waitForTimeout(4000); await show('chat');
  // 시즌 정보
  await p.click('.tabs [data-tab="more"]'); await p.click('#moreBox [data-tab="check"]'); await p.waitForTimeout(300);
  await p.click('#seasonBtn').catch(() => {}); await p.waitForTimeout(2500); await show('season');
  // 예약 도우미: 동네 분위기 · 숙소 · 노선
  await p.click('.tabs [data-tab="more"]'); await p.click('#moreBox [data-tab="me"]'); await p.waitForTimeout(300);
  await p.click('#meHelper'); await p.waitForTimeout(400); await p.click('#helperNext'); await p.waitForTimeout(300);
  await p.click('#vibeBtn').catch(() => {}); await p.waitForTimeout(2000); await show('vibe');
  await p.click('#helperBody [data-hotels] >> nth=0').catch(() => {}); await p.waitForTimeout(2000); await show('hotels');
  await p.click('#helperNext'); await p.waitForTimeout(300); await p.click('#routeBtn').catch(() => {}); await p.waitForTimeout(2000); await show('routes');
  // 예약 내용 읽기 (이번 여행 → 가는 길 → AI로 채우기)
  // (clicked inside the page: the folded header bar may sit over buttons after scrolling)
  const tap = sel => p.$eval(sel, x => x.click()).catch(() => {});
  await tap('#helperClose'); await p.waitForTimeout(300); await p.evaluate(() => scrollTo(0, 0));
  await tap('.tabs [data-tab="more"]'); await p.waitForTimeout(200); await tap('#moreBox [data-tab="me"]'); await p.waitForTimeout(300);
  await tap('[data-meopen="way"]'); await p.waitForTimeout(300);
  await p.fill('#paste_flight', 'KE723 인천 08:15 출발 간사이 10:20 도착, 귀국 KE724 19:30 간사이 출발').catch(() => {}); await tap('[data-aifill="flight"]'); await p.waitForTimeout(2000); await show('booking');
  // 날짜 제목 (여행 꾸미기 → AI로 지어 보기)
  await p.click('#lookBtn').catch(() => {}); await p.waitForTimeout(300); await p.click('#lkAi').catch(() => {}); await p.waitForTimeout(2000); await show('titles');
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
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
  // 이야기하며 정하기 (첫 답) · 여행지 추천 (취향으로 추천받기)
  const r2 = t.page = await device(b, S);
  await r2.route(/api\.anthropic\.com/, r => { let x = ''; try { const j = JSON.parse(r.request().postData() || '{}'); x = (j.messages || []).map(m => typeof m.content === 'string' ? m.content : JSON.stringify(m.content)).join('\n') } catch (_) {} sent.push(x); r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ type: 'text', text: '{"reply":"좋아요.","options":[],"done":false,"summary":null,"destinations":[]}' }] }) }) });
  await r2.click('[data-w="new"]'); await r2.waitForTimeout(250);
  await r2.fill('#onbKey_anthropic', 'sk-ant-test-key'); await r2.click('#onbBody [data-onbkey="anthropic"]'); await r2.waitForTimeout(300);
  await r2.click('#onbBody [data-pickjp="J"]'); await r2.waitForTimeout(250);
  await r2.click('#onbBody [data-startmode="talk"]'); await r2.waitForTimeout(300); sent.length = 0;
  await r2.fill('#talkInput', '그냥 답답해서 벗어나고 싶어요'); await r2.click('#talkSend'); await r2.waitForTimeout(2000); await show('talk');
  await r2.click('#onbBody [data-startmode="quick"] >> nth=-1').catch(() => {}); await r2.waitForTimeout(300);
  await r2.click('#onbBody [data-destmode="find"]').catch(() => {}); await r2.waitForTimeout(300);
  // the dates first (otherwise it asks for them), then 여행지 추천 and 이 곳은 어때요?
  await r2.selectOption('#onbBody [data-pf="nights"]', '3').catch(() => {}); await r2.fill('#onbBody [data-pf="startDate"]', '2026-12-10').catch(() => {}); await r2.dispatchEvent('#onbBody [data-pf="startDate"]', 'change').catch(() => {}); await r2.waitForTimeout(300);
  await r2.fill('#destWant', '조용히 걷고 싶어요').catch(() => {}); await r2.click('#destRecBtn').catch(() => {}); await r2.waitForTimeout(2000); await show('recommend');
  await r2.fill('#destAsk', '아이슬란드').catch(() => {}); await r2.click('#destAskBtn').catch(() => {}); await r2.waitForTimeout(2000); await show('ask');
  await r2.ctx.close();
} };

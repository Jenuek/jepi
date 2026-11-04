// 처음 설정 with a pretend AI: 이야기하면서 정하기(질문 → 답 → 정리된 방향) · 여행지 추천(카드 5곳 · 더 보기 · 궁금한 곳)
const D = (c, n) => ({ city: c, country: n, why: c + '의 골목을 걸어요', season: '선선해요', highlights: ['시장', '바다', '야경'], flight: '비행 약 2시간', budget: '60만원', caution: n === '일본' ? '' : '비가 잦아요', fit: '' });
let turn = 0;
const fake = async r => {
  const body = r.request().postData() || '', say = o => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ type: 'text', text: JSON.stringify(o) }] }) });
  if (body.includes('travel companion')) {
    turn++;
    if (turn < 3) return say({ reply: '그랬군요. 무엇을 느끼고 싶어요?', options: ['쉬고 싶어요', '걷고 싶어요', '맛있는 거'], done: false, summary: null });
    return say({ reply: '좋은 여행이 될 거예요.', options: [], done: true, summary: { purpose: '천천히 걸으며 쉬기', keywords: ['산책', '바다'], pace: 'slow', social: 'alone', party: 'solo', reach: 'near', avoid: '사람 많은 곳', dest: '', nights: null, startDate: null, note: '조용히 걷는 여행' } });
  }
  if (body.includes('is considering')) return say({ destinations: [D('레이캬비크', '아이슬란드')] });
  if (body.includes('Recommend 5')) return say({ destinations: body.includes('Do not repeat') ? [D('타이베이', '대만'), D('하노이', '베트남')] : [D('후쿠오카', '일본'), D('삿포로', '일본'), D('가오슝', '대만'), D('다낭', '베트남'), D('제주', '대한민국')] });
  return r.fulfill({ status: 503, body: '{}' });
};
module.exports = { name: 'onb-ai', async run(t) {
  const { b, S, device, grab } = t;
  const fresh = async () => {
    const p = t.page = await device(b, S); await p.route(/api\.anthropic\.com/, fake);
    await p.click('[data-w="new"]'); await p.waitForTimeout(250);
    await p.fill('#onbKey_anthropic', 'sk-ant-test-key'); await p.click('#onbBody [data-onbkey="anthropic"]'); await p.waitForTimeout(300);
    await p.click('#onbBody [data-pickjp="J"]'); await p.waitForTimeout(250); return p;
  };
  const tap = async (p, sel, w = 250) => { await p.click('#onbBody ' + sel); await p.waitForTimeout(w) };
  let p = await fresh(); await grab('chooser_ai', '#onbBody');
  await tap(p, '[data-startmode="talk"]'); await grab('talk_start', '#onbBody');
  await tap(p, '[data-talkopt="1"]', 900); await grab('talk_one', '#onbBody');
  await p.fill('#talkInput', '바다 보며 쉬고 싶어요'); await tap(p, '#talkSend', 900); await grab('talk_two', '#onbBody');
  await tap(p, '#talkFinish', 900); await grab('talk_done', '#onbBody');
  await tap(p, '[data-kwtoggle="바다"]'); await grab('talk_chip', '#onbBody');
  await tap(p, '#talkApply', 400); await grab('after_talk', '#onbBody');
  await p.ctx.close();
  p = await fresh(); await tap(p, '[data-startmode="quick"][data-destmode="find"]'); await grab('finder_ai', '#onbBody');
  await p.selectOption('#onbBody [data-pf="nights"]', '3'); await p.fill('#onbBody [data-pf="startDate"]', '2026-12-10'); await p.dispatchEvent('#onbBody [data-pf="startDate"]', 'change'); await p.waitForTimeout(300);
  await tap(p, '[data-radio="reach"][data-val="far"]'); await tap(p, '[data-kwtoggle] >> nth=0'); await grab('finder_far', '#onbBody');
  await p.fill('#destWant', '조용한 바다'); await tap(p, '#destRecBtn', 1200); await grab('cards', '#onbBody');
  await tap(p, '#destMoreBtn', 1200); await grab('more', '#onbBody');
  await p.fill('#destAsk', '아이슬란드'); await tap(p, '#destAskBtn', 1200); await grab('asked', '#onbBody');
  await tap(p, '[data-pickdest="1"]', 600); await grab('picked', '#onbBody');
  await p.ctx.close();
} };

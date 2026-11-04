// 🎲 주변 찾기 (가짜 카카오 · 가짜 AI · 지도 위치 고정): 뭐 하지 하나 굴리기·다시·코스·칸 바꾸기·이걸로 · 동네 찾기 · 뭐 먹지 주변 굴리기·다시·기분·이걸로
const CAT = { FD6: '음식점 > 한식 > 국밥', CE7: '음식점 > 카페', AT4: '여행 > 관광명소 > 공원', CT1: '문화시설 > 미술관' };
const kakao = r => {
  const u = new URL(r.request().url()), q = u.searchParams.get('query'), c = u.searchParams.get('category_group_code'), pg = +(u.searchParams.get('page') || 1);
  const x0 = +u.searchParams.get('x') || 127.056, y0 = +u.searchParams.get('y') || 37.544, tag = (q || c) + pg;
  const docs = [0, 1, 2, 3, 4, 5].map(i => ({ id: tag + i, place_name: `${q || c} ${pg}-${i}`, category_name: q ? `음식점 > ${q}` : CAT[c] || '기타', distance: String(100 + i * 130),
    road_address_name: `성수이로 ${i + 1}`, place_url: 'https://place.map.kakao.com/' + i, x: String(x0 + i * 0.0012), y: String(y0 + i * 0.0009) }));
  r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(u.pathname.includes('keyword') && !c && q === '성수동' ? { documents: [{ id: 'a1', place_name: '성수역', category_name: '교통', road_address_name: '아차산로 100', x: '127.0557', y: '37.5446' }], meta: { is_end: true } } : { documents: docs, meta: { is_end: true } }) });
};
const ai = r => {
  const body = r.request().postData() || '', say = o => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ type: 'text', text: JSON.stringify(o) }] }) });
  const pl = (n, type) => Array.from({ length: n }, (_, i) => ({ name: `AI ${type} ${i}`, nameKo: `에이아이 ${type} ${i}`, type, category: type + ' 곳', lat: 35.6595 + i * 0.001, lng: 139.7005 + i * 0.001, address: '시부야 ' + i }));
  if (body.includes('List 18 real')) return say({ places: [...pl(5, 'meal'), ...pl(4, 'cafe'), ...pl(6, 'act'), ...pl(3, 'night')] });
  if (body.includes('List up to 14 real')) return say({ places: pl(8, 'meal').map(x => ({ ...x, walkMin: 6 })) });
  return r.fulfill({ status: 503, body: '{}' });
};
module.exports = { name: 'nearby', async run(t) {
  const { b, S, device, skipCoach, grab } = t;
  const go = async (keys, ll) => {
    const p = t.page = await device(b, S);
    await p.ctx.grantPermissions(['geolocation']); await p.ctx.setGeolocation({ latitude: ll[0], longitude: ll[1] });
    await p.route(/dapi\.kakao\.com/, kakao); await p.route(/api\.anthropic\.com/, ai);
    await p.click('[data-w="new"]'); await p.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(p);
    await p.evaluate(k => { localStorage.setItem('jepi.keys', JSON.stringify(Object.assign(JSON.parse(localStorage.getItem('jepi.keys') || '{}'), k))) }, keys);
    await p.clock.setFixedTime(new Date('2027-03-10T15:20:00'));
    await p.reload(); await p.waitForTimeout(3800); await skipCoach(p).catch(() => {});
    await p.emulateMedia({ reducedMotion: 'reduce' });
    await p.evaluate(() => { let s = 7; Math.random = () => ((s = s * 16807 % 2147483647) / 2147483647) });
    return p;
  };
  for (const [nm, keys, ll] of [['kakao', { kakao: 'KakaoTestKey' }, [37.544, 127.056]], ['ai', { anthropic: 'sk-ant-test-key' }, [35.6595, 139.7005]]]) {
    const p = await go(keys, ll), tap = async (sel, w = 400) => { await p.click('#sheet ' + sel); await p.waitForTimeout(w) };
    await p.click('#diceFab'); await p.waitForTimeout(400);
    if (await p.$('#sheet [data-dicetab="do"][aria-pressed="false"], #sheet [data-dicetab="do"]:not(.on)')) await tap('[data-dicetab="do"]').catch(() => {});
    await tap('[data-dobase="near"]'); await grab(nm + '_near', '#sheet');
    await tap('[data-dogo="one"] >> nth=0', 1500); await grab(nm + '_one', '#sheet');
    await tap('[data-dogo="one"][data-again]', 1200).catch(() => {}); await grab(nm + '_again', '#sheet');
    await tap('#doPick', 400).catch(() => {}); await grab(nm + '_picked', '#sheet');
    await tap('[data-dogo="course"] >> nth=0', 2500); await grab(nm + '_course', '#sheet');
    await tap('[data-doreroll] >> nth=1', 1500).catch(() => {}); await grab(nm + '_reroll', '#sheet');
    await tap('details.cond summary').catch(() => {}); await tap('[data-doclen="half"]', 2500).catch(() => {}); await grab(nm + '_half', '#sheet');
    await tap('[data-domood="quiet"]', 400).catch(() => {}); await tap('[data-dogo="course"] >> nth=0', 2500).catch(() => {}); await grab(nm + '_quiet', '#sheet');
    if (nm === 'kakao') { await tap('[data-dobase="area"]'); await p.fill('#doAreaQ', '성수동'); await tap('#doAreaFind', 800); await grab('area_hits', '#sheet');
      await tap('[data-doareapick="0"]', 400).catch(() => {}); await tap('[data-dogo="one"] >> nth=0', 1500).catch(() => {}); await grab('area_one', '#sheet') }
    await tap('[data-dicetab="eat"]'); await tap('[data-eatbase="near"]').catch(() => {}); await grab(nm + '_eat', '#sheet');
    await tap('[data-eatroll="go"]', 1500); await grab(nm + '_eat_roll', '#sheet');
    await tap('[data-eatroll="again"]', 1200).catch(() => {}); await grab(nm + '_eat_again', '#sheet');
    await tap('details.cond summary').catch(() => {}); await tap('[data-eatmood="soup"]', 300).catch(() => {}); await tap('[data-eatroll="go"]', 1500).catch(() => {}); await grab(nm + '_eat_soup', '#sheet');
    await tap('[data-eatmood="cafe"]', 300).catch(() => {}); await tap('[data-eatroll="go"]', 1500).catch(() => {}); await grab(nm + '_eat_cafe', '#sheet');
    await tap('#eatPick', 400).catch(() => {}); await grab(nm + '_eat_picked', '#sheet');
    await p.ctx.close();
  }
} };

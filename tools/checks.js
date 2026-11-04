// The list of smoke checks. Each check gets fresh browser "devices" that share one fake server.
module.exports = [
  {
    name: 'first launch → welcome screen with three choices',
    async run({ b, S, device, ok, vis }) {
      const p = await device(b, S);
      ok(await vis(p, '#welcome'), 'welcome is shown');
      ok(!(await vis(p, '#onb')), 'trip questions are not shown yet');
      ok((await p.$$('#welcome [data-w]')).length === 3, 'three choices');
      await p.click('[data-w="new"]'); await p.waitForTimeout(200);
      ok(await vis(p, '#onb') && !(await vis(p, '#welcome')), '"새 여행 만들기" opens the trip questions');
      ok(p.errs.length === 0, 'no page errors ' + p.errs.join(' | '));
      await p.ctx.close();
    }
  },
  {
    name: 'demo is a sandbox: nothing stays behind',
    async run({ b, S, device, ok, vis, skipCoach }) {
      const p = await device(b, S, { ls: { 'gp.plans': [{ id: 'mine', name: '내 여행', updated: 1 }], 'gp.cur': 'mine', 'gp.profile': { dest: '부산', nights: 1, startDate: '2026-12-01', stays: [{ name: '숙소', area: 'center', checkin: '15:00', checkout: '11:00', from: 0, to: 1 }], events: [] }, 'gp.plan.mine': { profile: { dest: '부산' } }, 'gp.kw': ['바다'] } });
      ok(!(await vis(p, '#welcome')), 'returning user skips the welcome');
      await p.evaluate(() => window.__jepi.demoEnter()); await p.waitForTimeout(3600); await skipCoach(p);
      ok(await vis(p, '#demoBar'), 'demo bar is shown');
      ok((await p.textContent('#planName')).includes('오사카'), 'demo plan is Osaka');
      const blocks = await p.$$eval('#grid .blk', e => e.length);
      ok(blocks >= 4, 'demo day 1 has blocks (' + blocks + ')');
      ok(await p.evaluate(() => JSON.parse(localStorage.getItem('gp.kw') || '[]').length === 0), 'demo has no personal taste keywords');
      await p.click('#demoExit'); await p.waitForTimeout(3600);
      const st = await p.evaluate(() => ({ plans: JSON.parse(localStorage.getItem('gp.plans')), kw: JSON.parse(localStorage.getItem('gp.kw')), bk: localStorage.getItem('jepi.demoBackup') }));
      ok(st.plans.some(x => x.id === 'mine') && !st.plans.some(x => x.id === 'demo'), 'my plans are back, demo plan gone ' + JSON.stringify(st.plans.map(x => x.id)));
      ok(st.kw[0] === '바다' && !st.bk, 'taste back, backup removed');
      ok(!(await vis(p, '#demoBar')), 'demo bar gone');
      ok(p.errs.length === 0, 'no page errors ' + p.errs.join(' | '));
      await p.ctx.close();
    }
  },
  {
    name: 'demo left open then app relaunched → clean again',
    async run({ b, S, device, ok, vis }) {
      const p = await device(b, S);
      await p.click('[data-w="demo"]'); await p.waitForTimeout(3600);
      ok(await vis(p, '#demoBar'), 'in demo');
      const p2 = await p.ctx.newPage(); p2.errs = []; p2.on('pageerror', e => p2.errs.push(e.message));
      await p.close(); await p2.goto('http://localhost:8790/'); await p2.waitForTimeout(3400);
      ok(await vis(p2, '#welcome') && !(await vis(p2, '#demoBar')), 'fresh launch shows the welcome, not the demo');
      ok(p2.errs.length === 0, 'no page errors ' + p2.errs.join(' | '));
      await p2.context().close();
    }
  },
  {
    name: 'phone signs up, laptop logs in from the welcome screen and gets plans + keys',
    async run({ b, S, device, ok, vis, skipCoach, openSettings }) {
      const phone = await device(b, S, { ls: { 'jepi.keys': { gemini: 'AIzaPHONEKEY', kakao: '0123456789abcdef0123456789abcdef' } } });
      await phone.click('[data-w="new"]'); await phone.waitForTimeout(200);
      await phone.evaluate(() => window.__jepi.demoLikeTrip()); await phone.waitForTimeout(400); await skipCoach(phone);
      await openSettings(phone);
      await phone.click('[data-sbmode="join"]'); await phone.fill('#sbEmail', 'me@x.com'); await phone.fill('#sbPw', 'pass123'); await phone.fill('#sbPw2', 'pass123');
      await phone.click('#sbGo'); await phone.waitForTimeout(2500);
      ok(S.rows.some(r => r.kind === 'plan'), 'plan uploaded');
      ok(S.rows.some(r => r.id === 'keys') && !JSON.stringify(S.rows).includes('AIzaPHONEKEY'), 'keys uploaded, encrypted');
      const pc = await device(b, S);
      await pc.click('[data-w="login"]'); await pc.waitForTimeout(150);
      await pc.fill('#wEmail', 'me@x.com'); await pc.fill('#wPw', 'pass123'); await pc.click('#wGo'); await pc.waitForTimeout(3000); await skipCoach(pc);
      ok(!(await vis(pc, '#welcome')) && !(await vis(pc, '#onb')), 'laptop goes straight to the schedule');
      ok((await pc.textContent('#planName')).length > 0 && await pc.evaluate(() => JSON.parse(localStorage.getItem('gp.plans')).length >= 1), 'laptop has the plan');
      ok(await pc.evaluate(() => (JSON.parse(localStorage.getItem('jepi.keys') || '{}').gemini === 'AIzaPHONEKEY')), 'laptop got the keys');
      ok(phone.errs.length + pc.errs.length === 0, 'no page errors ' + phone.errs.concat(pc.errs).join(' | '));
      await phone.ctx.close(); await pc.ctx.close();
    }
  },

  {
    name: 'opening hours come from Google once, then from the cache',
    async run({ b, S, device, ok, skipCoach }) {
      const p = await device(b, S, { ls: { 'jepi.keys': { gmaps: 'AIzaTEST' } } });
      await p.click('[data-w="new"]'); await p.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(p);
      await p.waitForTimeout(5500);
      const k = await p.evaluate(() => { const pk = JSON.parse(localStorage.getItem('gp.pack')); const x = pk.places.find(q => q.id === 'os_kuromon'); return x && { h: x.hours, c: x.closed, s: x.hsrc } });
      ok(k && k.s === 'google' && k.h[0] === 600 && k.h[1] === 1080 && k.c.join() === '0', 'kuromon hours replaced by Google hours ' + JSON.stringify(k));
      const n1 = S.places; ok(n1 >= 5 && n1 <= 12, 'looked up scheduled places only, at most 12 at a time (' + n1 + ')');
      await p.reload(); await p.waitForTimeout(8000);
      ok(S.places <= n1 + 12, 'second visit uses the cache for places already checked');
      ok(await p.evaluate(() => JSON.parse(localStorage.getItem('jepi.hoursUse')).n) === S.places, 'monthly counter matches calls');
      ok(p.errs.length === 0, 'no page errors ' + p.errs.join(' | '));
      await p.ctx.close();
    }
  },

  {
    name: 'two friends share one trip: invite, merge edits on different days, 가고 싶어요',
    async run({ b, S, device, ok, vis, skipCoach, openSettings }) {
      const signup = async (p, em) => { await openSettings(p); await p.click('[data-sbmode="join"]'); await p.fill('#sbEmail', em); await p.fill('#sbPw', 'pass123'); await p.fill('#sbPw2', 'pass123'); await p.click('#sbGo'); await p.waitForTimeout(1800) };
      const A = await device(b, S); await A.click('[data-w="new"]'); await A.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(A);
      await signup(A, 'a@x.com');
      await A.click('.tabs [data-tab="more"]'); await A.click('#moreBox [data-tab="friends"]'); await A.waitForTimeout(200);
      await A.click('[data-trip="share"]'); await A.waitForTimeout(1200);
      const url = await A.inputValue('#friendsBox .share-text');
      ok(/\?join=[a-z0-9]{12}$/.test(url) && S.trips.length === 1, 'A shared the trip and got an invite link');
      const B = await device(b, S, { q: '?' + url.split('?')[1] });
      ok(await vis(B, '#welcome') && (await B.textContent('#welcomeBox')).includes('초대'), 'B sees the invitation');
      await B.click('[data-w="mode-join"]'); await B.fill('#wEmail', 'b@x.com'); await B.fill('#wPw', 'pass123'); await B.click('#wGo'); await B.waitForTimeout(2500); await skipCoach(B);
      ok((await B.textContent('#planName')).includes('오사카'), 'B joined and sees the Osaka trip');
      ok(S.members.length === 2, 'two members on the server');
      // A moves a day-1 block, B moves a day-2 block at the same time
      const move = async (p, d, name) => { await p.click('.tabs [data-tab="timeline"]'); await p.click(`.day-btn >> nth=${d}`); await p.waitForTimeout(200);
        await p.click(`#grid .blk:has-text("${name}")`); await p.waitForTimeout(150); await p.click('#sheet [data-mv="30"]'); await p.click('#sheet [data-close="1"]').catch(() => { }); await p.waitForTimeout(1500) };
      await move(A, 0, '구로몬'); await move(B, 1, '오사카성');
      await A.evaluate(() => window.__jepi.sync()); await B.evaluate(() => window.__jepi.sync()); await A.evaluate(() => window.__jepi.sync()); await A.waitForTimeout(800);
      const start = (p, id) => p.evaluate(id => { const d = JSON.parse(localStorage.getItem('gp.plan.' + JSON.parse(localStorage.getItem('gp.cur')))); return d.placed.find(x => x.id === id).start }, id);
      ok(await start(A, 'os_kuromon') === 975 && await start(A, 'os_castle') === 600, 'A has both changes');
      ok(await start(B, 'os_kuromon') === 975 && await start(B, 'os_castle') === 600, 'B has both changes');
      // 가고 싶어요
      await B.click('.tabs [data-tab="tray"]').catch(() => { }); await B.evaluate(() => { document.querySelector('.tabs [data-tab="tray"]')?.click() }); await B.waitForTimeout(300);
      const w = await B.$('[data-want]'); ok(!!w, 'place cards show 가고 싶어요'); if (w) { await w.click(); await B.waitForTimeout(500) }
      await A.evaluate(() => window.__jepi.sync()); await A.waitForTimeout(500);
      await A.evaluate(() => { document.querySelector('.tabs [data-tab="tray"]')?.click() }); await A.waitForTimeout(300);
      ok((await A.$$eval('.want', e => e.map(x => x.textContent))).some(t => /1$/.test(t.trim())), 'A sees B\'s 가고 싶어요');
      ok(A.errs.length + B.errs.length === 0, 'no page errors ' + A.errs.concat(B.errs).join(' | '));
      await A.ctx.close(); await B.ctx.close();
    }
  },
  {
    name: 'alerts: block bell + reminders written for the server',
    async run({ b, S, device, ok, skipCoach, openSettings }) {
      const p = await device(b, S); await p.click('[data-w="new"]'); await p.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(p);
      await openSettings(p); await p.click('[data-sbmode="join"]'); await p.fill('#sbEmail', 'n@x.com'); await p.fill('#sbPw', 'pass123'); await p.fill('#sbPw2', 'pass123'); await p.click('#sbGo'); await p.waitForTimeout(1500);
      await p.evaluate(() => { localStorage.setItem('jepi.notify', JSON.stringify({ on: true, all: false, lead: 10, depart: true, morning: true, dev: 'dX' })) }); await p.reload(); await p.waitForTimeout(3500); await skipCoach(p);
      await p.click('.tabs [data-tab="timeline"]'); await p.click('#grid .blk:has-text("구로몬")'); await p.waitForTimeout(200);
      ok(await p.isVisible('#sheet [data-alert="on"]'), 'block sheet has 🔔 알림 켜기');
      await p.click('#sheet [data-alert="on"]'); await p.waitForTimeout(200);
      ok(await p.isVisible('#sheet [data-alert="off"]'), 'turned on');
      await p.click('#sheet [data-close="1"]').catch(() => { }); await p.waitForTimeout(1500);
      ok((await p.textContent('#grid .blk:has-text("구로몬")')).includes('🔔'), 'block shows 🔔');
      const a = S.alerts.filter(x => x.user_id === 'U_n@x.com');
      const k = a.find(x => x.id.includes('os_kuromon'));
      ok(!!k && /출발/.test(k.title), 'departure reminder for 구로몬 sent to the server ' + (k && k.title));
      ok(a.some(x => x.id.endsWith(':morning')), 'morning summaries included');
      ok(p.errs.length === 0, 'no page errors ' + p.errs.join(' | '));
      await p.ctx.close();
    }
  },
  {
    name: 'tidy day screen, one find screen, same place twice, everyone\'s 👍',
    async run({ b, S, device, ok, vis, skipCoach }) {
      const e = (n) => ({ k: '오사카|' + n.replace(/\s+/g, '').toLowerCase(), city: '오사카', name: n, cat: 'trip', lat: 34.66, lng: 135.43, dur: 60 });
      S.recs = [{ user_id: 'U_a', ...e('덴포잔 대관람차'), entry: e('덴포잔 대관람차') }, { user_id: 'U_b', ...e('덴포잔 대관람차'), entry: e('덴포잔 대관람차') }, { user_id: 'U_b', ...e('가이유칸 수족관'), entry: e('가이유칸 수족관') }]
        .map(x => ({ user_id: x.user_id, k: x.k, city: x.city, entry: x.entry }));
      const p = await device(b, S);
      await p.click('[data-w="new"]'); await p.waitForTimeout(200);
      await p.evaluate(() => window.__jepi.demoLikeTrip()); await p.waitForTimeout(500); await skipCoach(p);
      // tidy
      const chips = await p.$$eval('#daySum .sum-chip', e => e.map(x => x.textContent));
      ok(chips.length >= 2 && chips[0].startsWith('이동'), 'summary chips ' + chips.join(' / '));
      ok(!(await vis(p, '#route')) && !(await vis(p, '#budgetBox')), 'route and cost folded away');
      await p.click('[data-sum="route"]'); await p.waitForTimeout(150);
      ok(await vis(p, '#route'), 'route opens from its chip');
      ok((await p.$$('#grid .blk .flag')).length === 0, 'blocks carry no warning sentences');
      // find screen
      await p.evaluate(() => window.__jepi.openFind({ when: 'gap', into: 'sched' })); await p.waitForTimeout(150);
      ok(await vis(p, '#findForm'), 'find sheet opens');
      ok(await p.$eval('[data-find="into:sched"]', x => x.getAttribute('aria-pressed') === 'true'), 'opened with 넣을 곳 = 일정에');
      await p.click('[data-find="where:area"]'); await p.waitForTimeout(100);
      ok(await vis(p, '#findArea'), 'area picker appears');
      await p.click('#sheet [data-close]').catch(() => p.evaluate(() => closeSheet && closeSheet())); await p.waitForTimeout(150);
      // same place twice
      const nm = await p.evaluate(() => window.__jepi.dupTest());
      await p.click('.tabs [data-tab="tray"]'); await p.waitForTimeout(250);
      ok(await vis(p, '.dup-card'), '"같은 곳 같아요" shown for ' + nm);
      await p.click('[data-dupmerge]'); await p.waitForTimeout(250);
      ok(!(await p.evaluate(() => window.__jepi.has('dupx'))) && !(await vis(p, '.dup-card')), 'merged into one');
      await p.evaluate(() => window.__jepi.openCustom()); await p.waitForTimeout(150);
      await p.fill('#cfName', nm.slice(0, 3)); await p.dispatchEvent('#cfName', 'input'); await p.waitForTimeout(100);
      ok((await p.$$('.dup-pick')).length >= 1, 'typing a new place shows the existing one');
      await p.click('#sheet [data-close]'); await p.waitForTimeout(100);
      // everyone's 👍 (not logged in: can see, cannot add)
      await p.click('.tabs [data-tab="tray"]'); await p.waitForTimeout(150);
      await p.evaluate(() => { const o = document.getElementById('openOnly'); if (o.checked) o.click() }); await p.waitForTimeout(150);
      await p.click('[data-group="pop"]'); await p.waitForTimeout(200);
      const first = await p.$eval('#cards .card', x => x.textContent);
      ok(first.includes('덴포잔') && first.includes('👍 2'), 'sorted by 👍 · first card ' + first.slice(0, 40));
      ok((await p.textContent('#recSt')).includes('로그인'), 'logged out: asks to log in to recommend');
      await p.click('.tabs [data-tab="timeline"]'); await p.waitForTimeout(150);
      await p.click('#dayTitleEdit'); await p.fill('#dayTitleIn', '도착, 그리고 네온의 첫인상'); await p.click('#dayTitleForm [type=submit]'); await p.waitForTimeout(200);
      ok((await p.textContent('#dayTitle')) === '도착, 그리고 네온의 첫인상', 'day title renamed');
      ok(await p.evaluate(() => JSON.parse(localStorage.getItem('gp.profile')).dayTitles[0] === '도착, 그리고 네온의 첫인상'), 'title saved with the plan');
      ok(p.errs.length === 0, 'no page errors ' + p.errs.join(' | '));
      await p.ctx.close();
    }
  },
  {
    name: '👍 여행자 추천 after logging in: on, counted, saved on the server, off',
    async run({ b, S, device, ok, skipCoach, openSettings }) {
      const e = (n) => ({ k: '오사카|' + n.replace(/\s+/g, '').toLowerCase(), city: '오사카', name: n, cat: 'trip', lat: 34.66, lng: 135.43, dur: 60 });
      S.recs = [['U_a', '덴포잔 대관람차'], ['U_b', '덴포잔 대관람차']].map(([u, n]) => ({ user_id: u, k: e(n).k, city: '오사카', entry: e(n) }));
      S.users['rec@x.com'] = 'pass123';
      const p = await device(b, S);
      await p.click('[data-w="new"]'); await p.waitForTimeout(200);
      await p.evaluate(() => window.__jepi.demoLikeTrip()); await p.waitForTimeout(500); await skipCoach(p);
      await openSettings(p); await p.fill('#sbEmail', 'rec@x.com'); await p.fill('#sbPw', 'pass123'); await p.click('#sbGo'); await p.waitForTimeout(2000);
      await p.click('.tabs [data-tab="tray"]'); await p.waitForTimeout(400);
      ok((await p.textContent('#recSt')).includes('모여 있어요'), 'logged in: the line says how many are recommended · ' + (await p.textContent('#recSt')));
      const card = p.locator('#cards .card').filter({ hasNotText: '덴포잔' }).first(), nm = await card.locator('.nm').textContent();
      await card.locator('[data-vote]').click(); await p.waitForTimeout(500);
      const on = p.locator('#cards .card', { hasText: nm }).first().locator('[data-vote]');
      ok((await on.getAttribute('aria-pressed')) === 'true' && (await on.textContent()) === '👍 1', '👍 on and counted · ' + nm);
      ok(S.recs.length === 3 && S.recs.some(r => r.entry && r.entry.name === nm), 'saved on the server');
      await on.click(); await p.waitForTimeout(500);
      ok(S.recs.length === 2, 'off again: taken off the server');
      ok(p.errs.length === 0, 'no page errors ' + p.errs.join(' | '));
      await p.ctx.close();
    }
  },
  {
    name: 'trip look: hero folds, 여행 꾸미기, handwritten memos, 여행 노트',
    async run({ b, S, device, ok, vis, skipCoach }) {
      const p = await device(b, S);
      await p.click('[data-w="new"]'); await p.waitForTimeout(200);
      await p.evaluate(() => window.__jepi.demoLikeTrip()); await p.waitForTimeout(500); await skipCoach(p);
      ok(await vis(p, '#hero #dayTitle') && await vis(p, '.tabs'), 'day title sits in the hero, tabs at the bottom');
      ok(await p.$eval('.tabs', x => getComputedStyle(x).position === 'fixed' && x.getBoundingClientRect().bottom >= innerHeight - 1), 'tabs fixed to the bottom');
      await p.evaluate(() => scrollTo(0, 900)); await p.waitForTimeout(400);
      ok(await p.evaluate(() => document.body.classList.contains('mini')), 'scrolling down folds the hero into the one-line bar');
      await p.click('[data-mbday="1"]'); await p.waitForTimeout(200);
      ok((await p.textContent('#mbDay')) === '02', 'bar arrows switch the day');
      await p.click('[data-mbday="-1"]'); await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(400);
      await p.click('#lookBtn'); await p.waitForTimeout(200);
      await p.click('[data-lk="style:note"]'); await p.click('[data-lk="color:#0f7a5c"]'); await p.fill('#lkTag', '먹고 걷는 3박 4일'); await p.fill('[data-lkday="1"]', '성과 시장 사이');
      await p.click('#lookForm [type=submit]'); await p.waitForTimeout(300);
      const L = await p.evaluate(() => JSON.parse(localStorage.getItem('gp.profile')));
      ok(L.look.style === 'note' && L.look.color === '#0f7a5c' && L.dayTitles[1] === '성과 시장 사이', 'look saved with the plan');
      ok(await p.evaluate(() => document.body.classList.contains('style-note') && getComputedStyle(document.documentElement).getPropertyValue('--theme').trim() === '#0f7a5c'), '여행 수첩 style and colour applied');
      ok((await p.textContent('#heroTag')) === '먹고 걷는 3박 4일', 'tagline shown');
      await p.click('#grid .blk:not(.fixed)'); await p.waitForTimeout(200);
      await p.fill('#bmIn', '참치!'); await p.click('#bmSave'); await p.waitForTimeout(250);
      ok((await p.$$eval('#grid .bmemo', e => e.map(x => x.textContent))).includes('참치!'), 'block shows the handwritten memo');
      await p.click('#dayTitleEdit'); await p.fill('#dayMemoIn', '바로 시장으로!'); await p.click('#dayTitleForm [type=submit]'); await p.waitForTimeout(250);
      ok((await p.textContent('#dayMemo')).includes('바로 시장으로!'), 'day memo under the day title');
      await p.click('.tabs [data-tab="more"]'); await p.waitForTimeout(200); await p.click('#nbOpen'); await p.waitForTimeout(300);
      const nb = await p.textContent('#notebook');
      ok(nb.includes('CHAPTER 2') && nb.includes('성과 시장 사이') && nb.includes('참치!') && nb.includes('바로 시장으로!'), 'notebook has chapters, titles and memos');
      await p.click('#nbClose');
      ok(p.errs.length === 0, 'no page errors ' + p.errs.join(' | '));
      await p.ctx.close();
    }
  },
  {
    name: 'React screen: 사용 안내 is drawn by React and its buttons work',
    async run({ b, S, device, ok, vis, skipCoach }) {
      const p = await device(b, S, { ls: { 'gp.plans': [{ id: 'mine', name: '내 여행', updated: 1 }], 'gp.cur': 'mine', 'gp.profile': { dest: '부산', nights: 1, startDate: '2026-12-01', stays: [{ name: '숙소', area: 'center', checkin: '15:00', checkout: '11:00', from: 0, to: 1 }], events: [] }, 'gp.plan.mine': { profile: { dest: '부산' } } } });
      await skipCoach(p);
      ok(await p.evaluate(() => typeof window.JEPI_UI === 'object' && typeof window.JEPI_UI.mount === 'function'), 'React bridge is ready before the old code');
      const openHelp = async () => { await p.click('.tabs [data-tab="more"]'); await p.click('#moreBox [data-tab="help"]'); await p.waitForTimeout(250) };
      await openHelp();
      ok(await vis(p, '#side-help'), 'help panel opens');
      const d = await p.$$eval('#helpBox details', e => e.map(x => [x.querySelector('summary').textContent, x.open]));
      ok(d.length === 10 && d[0][1] && !d[1][1], '10 sections, only the first open ' + d.map(x => x[0]).join(','));
      await p.click('#helpBox details:nth-child(2) summary');
      ok(await p.$eval('#helpBox details:nth-child(2)', x => x.open), 'a section opens when tapped');
      ok(await vis(p, '#helpBox button:has-text("데모 둘러보기")'), 'demo button shown outside the demo');
      await p.click('#helpBox button:has-text("처음 안내 다시 보기")'); await p.waitForTimeout(250);
      ok(await vis(p, '#coach'), '"처음 안내 다시 보기" shows the guide again');
      await skipCoach(p);
      await openHelp();
      await p.click('#helpBox button:has-text("데모 둘러보기")'); await p.waitForTimeout(3600); await skipCoach(p);
      ok(await vis(p, '#demoBar'), '"데모 둘러보기" starts the demo');
      await openHelp();
      ok(!(await vis(p, '#helpBox button:has-text("데모 둘러보기")')), 'demo button hidden inside the demo');
      ok(p.errs.length === 0, 'no page errors ' + p.errs.join(' | '));
      await p.ctx.close();
    }
  },
  {
    name: 'data layer (app/data): data saved by the old version still works',
    async run({ b, S, device, ok, skipCoach }) {
      // exactly what the old version left in storage: a plan, a login, an encryption key
      const sess = { access: 'AT_old@x.y', refresh: 'RT_old@x.y', exp: Date.now() + 3600e3, user: 'U_old@x.y', email: 'old@x.y' };
      const p = await device(b, S, { ls: { 'gp.plans': [{ id: 'mine', name: '내 여행', updated: 1 }], 'gp.cur': 'mine', 'gp.profile': { dest: '부산', nights: 1, startDate: '2026-12-01', stays: [{ name: '숙소', area: 'center', checkin: '15:00', checkout: '11:00', from: 0, to: 1 }], events: [] }, 'gp.plan.mine': { profile: { dest: '부산' } },
        'jepi.sync': { url: 'https://qjzxhcvneorbskpebvca.supabase.co', key: 'sb_publishable_-IUuxuXFsSJQFz4V0we-zA_OIi1AZQH', email: 'old@x.y', sess, lastPull: 0, sent: {}, at: 0 } } });
      await skipCoach(p);
      const st = await p.evaluate(() => { const D = window.JEPI_DATA; return { on: D.server.syncOn(), user: D.server.SYNC.sess && D.server.SYNC.sess.user, plan: D.storage.get('gp.plans', []).map(x => x.id) } });
      ok(st.on && st.user === 'U_old@x.y', 'still logged in with the saved session');
      ok(st.plan.includes('mine'), 'saved plan list read');
      // keys locked by the OLD code (copied here as it was) must open with the new code, and the other way round
      const r = await p.evaluate(async () => {
        const b64e = u => btoa(String.fromCharCode(...new Uint8Array(u))), b64d = t => Uint8Array.from(atob(t), c => c.charCodeAt(0));
        const base = await crypto.subtle.importKey('raw', new TextEncoder().encode('pw-1234'), 'PBKDF2', false, ['deriveBits']);
        const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode('jepi-keys:' + ' Old@X.y '.trim().toLowerCase()), iterations: 210000 }, base, 256);
        const oldVk = b64e(bits);
        const k = await crypto.subtle.importKey('raw', b64d(oldVk), 'AES-GCM', false, ['encrypt', 'decrypt']);
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, new TextEncoder().encode(JSON.stringify({ claude: 'sk-test' })));
        const oldBox = { v: 1, iv: b64e(iv), ct: b64e(ct) };
        const V = window.JEPI_DATA.vault;
        await V.vaultMake(' Old@X.y ', 'pw-1234');
        const sameKey = JSON.parse(localStorage.getItem('jepi.vk')) === oldVk;
        const opened = await V.vaultOpen(oldBox);
        const box = await V.vaultSeal({ gemini: 'g-test' });
        const back = JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64d(box.iv) }, k, b64d(box.ct))));
        await V.vaultMake('old@x.y', 'wrong');
        let wrong = 'opened'; try { await V.vaultOpen(oldBox) } catch (_) { wrong = 'refused' }
        return { sameKey, opened, back, wrong, hash: window.JEPI_DATA.hashStr('JEPI 여행') };
      });
      ok(r.sameKey, 'same lock key from the same email + password');
      ok(r.opened && r.opened.claude === 'sk-test', 'keys locked by the old version open');
      ok(r.back.gemini === 'g-test', 'keys locked now open with the old method');
      ok(r.wrong === 'refused', 'a different password cannot open them');
      // old hash (copied as it was): documents already sent are not sent again
      const oldHash = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = (h * 33 ^ s.charCodeAt(i)) >>> 0; return h.toString(36) + s.length.toString(36) };
      ok(r.hash === oldHash('JEPI 여행'), 'change fingerprint is the same as before');
      // a broken saved value falls back instead of stopping the app
      ok(await p.evaluate(() => { localStorage.setItem('x.bad', '{oops'); return window.JEPI_DATA.storage.get('x.bad', 7) === 7 }), 'broken saved value → default');
      ok(p.errs.length === 0, 'no page errors ' + p.errs.join(' | '));
      await p.ctx.close();
    }
  },
  {
    name: 'sync engine (app/data/sync.ts): deleted plans, taste, my places, keys locked with another password',
    async run({ b, S, device, ok, skipCoach }) {
      const sess = { access: 'AT_sy@x.y', refresh: 'RT_sy@x.y', exp: Date.now() + 3600e3, user: 'U_sy@x.y', email: 'sy@x.y' };
      const sync = { url: 'https://qjzxhcvneorbskpebvca.supabase.co', key: 'sb_publishable_-IUuxuXFsSJQFz4V0we-zA_OIi1AZQH', email: 'sy@x.y', sess, lastPull: 0, sent: {}, at: 0 };
      // the lock key a login makes from email + password (same recipe as app/data/vault.ts)
      const vk = pw => JSON.stringify(require('crypto').pbkdf2Sync(pw, 'jepi-keys:sy@x.y', 210000, 32, 'sha256').toString('base64'));
      const prof = d => ({ dest: d, nights: 1, startDate: '2026-12-01', stays: [{ name: '숙소', area: 'center', checkin: '15:00', checkout: '11:00', from: 0, to: 1 }], events: [] });
      const lsA = { 'jepi.sync': sync, 'gp.plans': [{ id: 'p1', name: '부산', updated: 10 }, { id: 'p2', name: '제주', updated: 5 }], 'gp.cur': 'p1', 'gp.profile': prof('부산'),
        'gp.plan.p1': { profile: prof('부산') }, 'gp.plan.p2': { profile: prof('제주') }, 'gp.kw': ['바다'], 'jepi.kwAt': 100,
        'jepi.myplaces': [{ id: 'home', name: '집', ll: [37.5, 127], addr: '' }], 'jepi.mypAt': 100, 'jepi.keys': { gemini: 'G-KEY-1' }, 'jepi.vk': vk('pw-same') };
      const A = await device(b, S, { ls: lsA }); await skipCoach(A);
      await A.evaluate(() => window.__jepi.sync()); await A.waitForTimeout(300);
      const mine = S.rows.filter(r => r.user_id === 'U_sy@x.y');
      ok(['plan:p1', 'plan:p2', 'kw', 'myplaces', 'keys'].every(id => mine.some(r => r.id === id)), 'A sent plans, taste, my places, keys ' + mine.map(r => r.id).join(','));
      ok(!JSON.stringify(mine).includes('G-KEY-1'), 'keys only encrypted on the server');

      const B = await device(b, S, { ls: { 'jepi.sync': sync, 'gp.plans': [{ id: 'p1', name: '부산', updated: 1 }], 'gp.cur': 'p1', 'gp.profile': prof('부산'), 'gp.plan.p1': { profile: prof('부산') }, 'jepi.vk': vk('pw-same') } });
      await skipCoach(B);
      await B.evaluate(() => window.__jepi.sync()); await B.waitForTimeout(300);
      const gotB = await B.evaluate(() => { const g = k => JSON.parse(localStorage.getItem(k) || 'null'); return { plans: g('gp.plans').map(p => p.id), kw: g('gp.kw'), myp: g('jepi.myplaces'), keys: g('jepi.keys') } });
      ok(gotB.plans.includes('p2'), 'B got the other plan');
      ok(JSON.stringify(gotB.kw) === '["바다"]', 'B got the taste keywords');
      ok(gotB.myp && gotB.myp[0].ll && gotB.myp[0].ll[0] === 37.5, 'B got my places');
      ok(gotB.keys && gotB.keys.gemini === 'G-KEY-1', 'B opened the keys');

      // A deletes 제주 and changes taste (as the app saves them), then syncs
      await A.evaluate(() => { const D = window.JEPI_DATA.storage; D.set('gp.plans', [{ id: 'p1', name: '부산', updated: 10 }]); D.del('gp.plan.p2'); D.set('gp.kw', ['바다', '시장']); D.set('jepi.kwAt', Date.now()) });
      await A.reload(); await A.waitForTimeout(3300); await skipCoach(A);
      await A.evaluate(() => window.__jepi.sync()); await A.waitForTimeout(300);
      ok(S.rows.some(r => r.id === 'plan:p2' && r.deleted), 'A marked 제주 deleted on the server');
      await B.evaluate(() => window.__jepi.sync()); await B.waitForTimeout(300);
      const gotB2 = await B.evaluate(() => ({ plans: JSON.parse(localStorage.getItem('gp.plans')).map(p => p.id), p2: localStorage.getItem('gp.plan.p2'), kw: JSON.parse(localStorage.getItem('gp.kw')) }));
      ok(!gotB2.plans.includes('p2') && gotB2.p2 === null, 'deleted plan gone on B too');
      ok(gotB2.kw.includes('시장'), 'B got the new taste keyword');

      // C: same account, but its lock key comes from another password → cannot open, must not overwrite
      const before = JSON.stringify(S.rows.find(r => r.id === 'keys').data);
      const C = await device(b, S, { ls: { 'jepi.sync': sync, 'gp.plans': [{ id: 'p1', name: '부산', updated: 1 }], 'gp.cur': 'p1', 'gp.profile': prof('부산'), 'gp.plan.p1': { profile: prof('부산') }, 'jepi.keys': { kakao: 'C-ONLY' }, 'jepi.vk': vk('pw-other') } });
      await skipCoach(C);
      await C.evaluate(() => window.__jepi.sync()); await C.waitForTimeout(300);
      ok(await C.evaluate(() => window.JEPI_DATA.sync.status.keysLocked === true), 'C sees the keys are locked');
      ok(JSON.stringify(S.rows.find(r => r.id === 'keys').data) === before, 'C did not overwrite the keys on the server');
      ok(await C.evaluate(() => JSON.parse(localStorage.getItem('jepi.keys')).kakao === 'C-ONLY'), 'C kept its own key');
      const errs = A.errs.concat(B.errs, C.errs);
      ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
      await A.ctx.close(); await B.ctx.close(); await C.ctx.close();
    }
  },
  {
    name: 'React screen: 더보기 menu (trip card, chips, P-mode short menu, buttons open screens)',
    async run({ b, S, device, ok, vis, skipCoach }) {
      const p = await device(b, S);
      await p.evaluate(() => window.__jepi.demoEnter()); await p.waitForTimeout(3600); await skipCoach(p);
      await p.click('.tabs [data-tab="more"]'); await p.waitForTimeout(250);
      ok((await p.textContent('#moreBox .tc-city')).includes('오사카'), 'trip card shows the city');
      ok(await p.$$eval('#moreBox .tc-chips .mchip', e => e.length) >= 2, 'trip card chips (교통편 · 숙소)');
      ok(await vis(p, '#moreBox [data-tab="plans"]') && await vis(p, '#moreBox [data-tab="settings"]'), 'J mode: full menu');
      ok(!(await vis(p, '#moreAll')), 'J mode: no short-menu toggle');
      await p.click('#moreBox [data-tab="help"]'); await p.waitForTimeout(250);
      ok(await vis(p, '#side-help'), '사용 안내 opens from the menu');
      await p.click('.tabs [data-tab="more"]'); await p.click('#moreBox [data-tab="settings"]'); await p.waitForTimeout(250);
      ok(await vis(p, '#setBox'), '설정 opens from the menu');
      await p.click('[data-jp="P"]'); await p.waitForTimeout(250);
      await p.click('.tabs [data-tab="more"]'); await p.waitForTimeout(250);
      ok(!(await vis(p, '#moreBox [data-tab="plans"]')) && await vis(p, '#moreAll'), 'P mode: short menu with 전체 메뉴 보기');
      await p.click('#moreAll'); await p.waitForTimeout(200);
      ok(await vis(p, '#moreBox [data-tab="plans"]') && (await p.textContent('#moreAll')).includes('간단히'), '전체 메뉴 보기 shows everything');
      await p.click('#moreBox #lookOpen'); await p.waitForTimeout(300);
      ok(p.errs.length === 0, 'no page errors ' + p.errs.join(' | '));
      await p.ctx.close();
    }
  },
  {
    name: 'React screen: 내 계획 (list, copy, delete twice, 카톡용 글, typed link kept)',
    async run({ b, S, device, ok, vis, skipCoach }) {
      const p = await device(b, S);
      await p.evaluate(() => window.__jepi.demoEnter()); await p.waitForTimeout(3600); await skipCoach(p);
      await p.click('.tabs [data-tab="more"]'); await p.click('#moreBox [data-tab="plans"]'); await p.waitForTimeout(250);
      const count = () => p.$$eval('#plansBox .plan', e => e.length);
      ok(await count() === 1 && await vis(p, '#plansBox .plan.cur .tag'), 'one plan, marked 지금 보는 계획');
      await p.fill('#codeIn', 'JP-TEST1');
      await p.click('#plansBox [data-plandup]'); await p.waitForTimeout(250);
      ok(await p.inputValue('#codeIn') === 'JP-TEST1', 'what you typed stays when the list redraws');
      ok(await count() === 2 && (await p.textContent('#plansBox .ai-status')).includes('복사본'), '복제 adds a copy with a message');
      const other = '#plansBox .plan:not(.cur) [data-plandel]';
      await p.click(other); await p.waitForTimeout(150);
      ok((await p.textContent(other)).includes('한 번 더'), '삭제 asks once more');
      await p.click(other); await p.waitForTimeout(250);
      ok(await count() === 1, 'second press deletes it');
      await p.click('#planText'); await p.waitForTimeout(200);
      ok((await p.$eval('#plansBox textarea.share-text', x => x.value)).includes('오사카'), '카톡용 글 shows the plan as text');
      await p.click('#plansBox .plan.cur [data-planrename]'); await p.waitForTimeout(150);
      ok(await p.evaluate(() => document.activeElement && document.activeElement.classList.contains('pl-name')), '이름 바꾸기 opens a name box, ready to type');
      await p.fill('#plansBox .pl-name', '우리 오사카'); await p.click('#plansBox [data-planname]'); await p.waitForTimeout(250);
      ok((await p.textContent('#plansBox .plan.cur .pl-top b')) === '우리 오사카' && !(await vis(p, '#plansBox .pl-name')), 'new name saved and shown');
      ok((await p.textContent('#planName')).includes('우리 오사카'), 'the header shows the new name too');
      ok(p.errs.length === 0, 'no page errors ' + p.errs.join(' | '));
      await p.ctx.close();
    }
  },
  {
    name: 'React screen: 친구와 함께 (login prompt, invite links, view-only friend, 공유 끝내기 asks then ends)',
    async run({ b, S, device, ok, vis, skipCoach, openSettings }) {
      const openF = async p => { await p.click('.tabs [data-tab="more"]'); await p.click('#moreBox [data-tab="friends"]'); await p.waitForTimeout(200) };
      const A = await device(b, S); await A.click('[data-w="new"]'); await A.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(A);
      await openF(A);
      ok(await vis(A, '#friendsBox [data-tab="settings"]'), 'not logged in: asks to log in');
      await openSettings(A); await A.click('[data-sbmode="join"]'); await A.fill('#sbEmail', 'fa@x.com'); await A.fill('#sbPw', 'pass123'); await A.fill('#sbPw2', 'pass123'); await A.click('#sbGo'); await A.waitForTimeout(1800);
      await openF(A);
      ok(await vis(A, '#friendsBox [data-trip="share"]'), 'logged in: 이 여행에 친구 초대하기');
      await A.fill('#myNameIn', '지수'); await A.click('#friendsBox [data-trip="name"]'); await A.waitForTimeout(500);
      ok(await A.inputValue('#myNameIn') === '지수', 'my name saved and shown');
      await A.click('[data-trip="share"]'); await A.waitForTimeout(1200);
      ok((await A.textContent('#friendsBox')).includes('같이 고칠 수 있는 초대 링크') && /\?join=/.test(await A.inputValue('#friendsBox .share-text')), 'shared: edit invite link shown');
      await A.click('[data-trip="invite-view"]'); await A.waitForTimeout(800);
      ok((await A.textContent('#friendsBox')).includes('보기만 하는 초대 링크'), 'view-only invite link');
      const url = await A.inputValue('#friendsBox .share-text');
      const B = await device(b, S, { q: '?' + url.split('?')[1] });
      await B.click('[data-w="mode-join"]'); await B.fill('#wEmail', 'fb@x.com'); await B.fill('#wPw', 'pass123'); await B.click('#wGo'); await B.waitForTimeout(2500); await skipCoach(B);
      await openF(B);
      ok((await B.textContent('#friendsBox')).includes('보기만 할 수 있는 여행') && await vis(B, '#friendsBox [data-trip="leave"]'), 'friend: view-only note and 나가기');
      await A.evaluate(() => window.__jepi.sync()); await openF(A);
      ok(await A.$$eval('#friendsBox .mrow.static', e => e.length) === 2 && await vis(A, '#friendsBox [data-trip="kick"]'), 'owner sees two members and 내보내기');
      const mine = () => S.trips.filter(t => t.owner === 'U_fa@x.com').length;
      await A.click('[data-trip="stop"]'); await A.waitForTimeout(300);
      ok((await A.textContent('#friendsBox [data-trip="stop"]')).includes('한 번 더') && mine() === 1, '공유 끝내기 asks once more first');
      await openF(A);
      ok((await A.textContent('#friendsBox [data-trip="stop"]')) === '공유 끝내기', 'opening the panel again forgets the first press');
      await A.click('[data-trip="stop"]'); await A.waitForTimeout(300); await A.click('[data-trip="stop"]'); await A.waitForTimeout(800);
      ok(mine() === 0 && await vis(A, '#friendsBox [data-trip="share"]'), 'second press ends sharing');
      const errs = A.errs.concat(B.errs);
      ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
      await A.ctx.close(); await B.ctx.close();
    }
  },
  {
    name: 'React screen: 알림 (login prompt, options saved, test alert, buttons not stuck)',
    async run({ b, S, device, ok, vis, skipCoach, openSettings }) {
      const openN = async p => { await p.click('.tabs [data-tab="more"]'); await p.click('#moreBox [data-tab="notify"]'); await p.waitForTimeout(200) };
      const p = await device(b, S); await p.click('[data-w="new"]'); await p.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(p);
      await openN(p);
      ok(await vis(p, '#notifyBox [data-tab="settings"]'), 'not logged in: asks to log in');
      await openSettings(p); await p.click('[data-sbmode="join"]'); await p.fill('#sbEmail', 'nt@x.com'); await p.fill('#sbPw', 'pass123'); await p.fill('#sbPw2', 'pass123'); await p.click('#sbGo'); await p.waitForTimeout(1800);
      await openN(p);
      ok(await vis(p, '#notifyBox [data-ntf="on"]'), 'logged in: 켜기 button');
      await p.click('[data-nset="lead"][data-val="30"]'); await p.click('[data-nset="morning"][data-val="false"]'); await p.waitForTimeout(150);
      const st = await p.evaluate(() => JSON.parse(localStorage.getItem('jepi.notify')));
      ok(st.lead === 30 && st.morning === false, 'options saved');
      ok(await p.getAttribute('[data-nset="lead"][data-val="30"]', 'aria-pressed') === 'true' && await p.getAttribute('[data-nset="lead"][data-val="10"]', 'aria-pressed') === 'false', 'chosen option is shown pressed');
      await p.evaluate(() => { const n = JSON.parse(localStorage.getItem('jepi.notify')); n.on = true; n.dev = 'dX'; localStorage.setItem('jepi.notify', JSON.stringify(n)) });
      await p.reload(); await p.waitForTimeout(3500); await skipCoach(p); await openN(p);
      await p.click('[data-ntf="test"]'); await p.waitForTimeout(800);
      ok((await p.textContent('#notifyBox')).includes('테스트 알림을 보냈어요'), 'test alert sent');
      ok(!(await p.isDisabled('[data-ntf="test"]')) && !(await p.isDisabled('[data-ntf="off"]')), 'buttons usable again afterwards');
      ok(p.errs.length === 0, 'no page errors ' + p.errs.join(' | '));
      await p.ctx.close();
    }
  },
  {
    name: 'React screen: 설정 frame (theme, time spacing, 모두 초기화 asks, old parts drawn fresh)',
    async run({ b, S, device, ok, vis, skipCoach, openSettings }) {
      const p = await device(b, S); await p.click('[data-w="new"]'); await p.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(p);
      await openSettings(p);
      ok(await vis(p, '#setBox [data-sbmode="join"]') && await vis(p, '#setBox #backupAll'), 'sections shown: 동기화 (old part) and 데이터');
      await p.click('[data-theme-set="dark"]'); await p.waitForTimeout(150);
      ok(await p.getAttribute('html', 'data-theme') === 'dark' && await p.getAttribute('[data-theme-set="dark"]', 'aria-pressed') === 'true', '어둡게: page dark, button pressed');
      await p.click('[data-theme-set="light"]');
      await p.click('[data-zoom="100"]'); await p.waitForTimeout(150);
      ok(await p.getAttribute('#setBox [data-zoom="100"]', 'aria-pressed') === 'true' && await p.getAttribute('#setBox [data-zoom="60"]', 'aria-pressed') === 'false', '넓게 pressed');
      ok(await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--hour').trim()) === '100px', 'schedule spacing changed');
      await p.click('[data-zoom="60"]');
      await p.click('#wipeBtn'); await p.waitForTimeout(100);
      ok((await p.textContent('#wipeBtn')).includes('한 번 더') && await vis(p, '#wipeCancel'), '모두 초기화 asks once more');
      await p.click('#wipeCancel'); await p.waitForTimeout(100);
      ok((await p.textContent('#wipeBtn')) === '모두 초기화', '취소 goes back');
      await p.evaluate(() => { const x = document.querySelector('#setBox [data-sbmode="join"]'); x.disabled = true });
      await p.click('[data-theme-set="light"]'); await p.waitForTimeout(100);
      ok(!(await p.isDisabled('#setBox [data-sbmode="join"]')), 'old parts are drawn fresh on every redraw (like before)');
      ok(p.errs.length === 0, 'no page errors ' + p.errs.join(' | '));
      await p.ctx.close();
    }
  },
  {
    name: 'React screen: 기기 간 동기화 (wrong password, boxes cleared, button not stuck, logout)',
    async run({ b, S, device, ok, vis, skipCoach, openSettings }) {
      S.users['sy2@x.com'] = 'pass123';
      const p = await device(b, S); await p.click('[data-w="new"]'); await p.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(p);
      await openSettings(p);
      await p.fill('#sbEmail', 'sy2@x.com'); await p.fill('#sbPw', 'wrong!!'); await p.click('#sbGo'); await p.waitForTimeout(800);
      ok((await p.textContent('#setBox .kmsg')).includes('맞지 않아요'), 'wrong password: message shown');
      ok(await p.inputValue('#sbPw') === '' && await p.inputValue('#sbEmail') === 'sy2@x.com', 'password box emptied, email kept');
      ok(!(await p.isDisabled('#sbGo')) && (await p.textContent('#sbGo')) === '로그인', 'login button usable again');
      await p.fill('#sbPw', 'pass123'); await p.click('#sbGo'); await p.waitForTimeout(1800);
      ok(await vis(p, '#sbNow') && (await p.textContent('#setBox')).includes('sy2@x.com'), 'logged in: account and 지금 동기화 shown');
      await p.click('#sbOut'); await p.waitForTimeout(300);
      ok(await vis(p, '#sbForm'), 'logout: back to the login form');
      ok(p.errs.length === 0, 'no page errors ' + p.errs.join(' | '));
      await p.ctx.close();
    }
  },
  {
    name: 'React screen: 내 장소 (add and name a place, clear home, saved on this device)',
    async run({ b, S, device, ok, vis, skipCoach, openSettings }) {
      const p = await device(b, S, { ls: { 'jepi.myplaces': [{ id: 'home', name: '집', ll: [37.5665, 126.978], addr: '서울 중구 세종대로 110' }, { id: 'work', name: '회사', ll: null, addr: '' }] } });
      await p.click('[data-w="new"]'); await p.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(p);
      await openSettings(p);
      ok((await p.textContent('#setBox')).includes('세종대로 110'), 'saved address shown');
      await p.click('#mypAdd'); await p.waitForTimeout(100);
      ok(await vis(p, '#mypName') && await vis(p, '[data-myphere]'), 'new place opens for editing');
      await p.fill('#mypName', '본가'); await p.click('#mypDone'); await p.waitForTimeout(100);
      ok((await p.textContent('#setBox')).includes('📍 본가') && await p.evaluate(() => JSON.parse(localStorage.getItem('jepi.myplaces')).some(x => x.name === '본가')), 'named and saved');
      await p.click('[data-mypedit="home"]'); await p.click('[data-mypclear="home"]'); await p.waitForTimeout(100);
      ok(await p.evaluate(() => JSON.parse(localStorage.getItem('jepi.myplaces')).find(x => x.id === 'home').ll === null) && (await p.textContent('#setBox [data-mypedit="home"]')) === '등록', '위치 지우기 clears home');
      ok(p.errs.length === 0, 'no page errors ' + p.errs.join(' | '));
      await p.ctx.close();
    }
  },
  {
    name: 'React screen: AI·지도 연결 (empty key asks, key saved and only shown masked, 보기 keeps typing, delete)',
    async run({ b, S, device, ok, vis, skipCoach, openSettings }) {
      const p = await device(b, S); await p.click('[data-w="new"]'); await p.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(p);
      await openSettings(p);
      await p.click('[data-keyedit="kakao"]'); await p.waitForTimeout(100);
      ok(await p.evaluate(() => document.activeElement && document.activeElement.id === 'keyIn') && await p.getAttribute('#keyIn', 'type') === 'password', 'key box opens, ready to type, hidden');
      await p.click('[data-keysave="kakao"]'); await p.waitForTimeout(100);
      ok((await p.textContent('#setBox')).includes('키를 붙여 넣어 주세요'), 'empty key: asks for one');
      const key = '0123456789abcdef0123456789abcdef';
      await p.fill('#keyIn', key); await p.click('#keyShow'); await p.waitForTimeout(100);
      ok(await p.getAttribute('#keyIn', 'type') === 'text' && await p.inputValue('#keyIn') === key, '보기 shows what was typed');
      await p.click('[data-keysave="kakao"]'); await p.waitForTimeout(400);
      ok(await p.evaluate(k => JSON.parse(localStorage.getItem('jepi.keys')).kakao === k, key), 'key saved on this device');
      const shown = await p.textContent('#setBox');
      ok(!shown.includes(key) && shown.includes('012345••••••cdef'), 'the screen shows it only masked');
      await p.click('[data-keydel="kakao"]'); await p.waitForTimeout(200);
      ok(await vis(p, '[data-keyedit="kakao"]') && !(await p.evaluate(() => 'kakao' in JSON.parse(localStorage.getItem('jepi.keys') || '{}'))), '삭제 removes it');
      ok(p.errs.length === 0, 'no page errors ' + p.errs.join(' | '));
      await p.ctx.close();
    }
  },
  {
    name: 'React screen: 취향 키워드 (add, typing kept while the app redraws, box empty after adding, remove)',
    async run({ b, S, device, ok, skipCoach }) {
      const p = await device(b, S); await p.click('[data-w="new"]'); await p.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(p);
      await p.click('.tabs [data-tab="more"]'); await p.click('#moreBox [data-tab="pref"]'); await p.waitForTimeout(250);
      const saved = () => p.evaluate(() => JSON.parse(localStorage.getItem('gp.kw') || '[]'));
      await p.fill('#kwInput', '레코');
      await p.evaluate(() => document.querySelector('[data-jp="P"]').click()); await p.waitForTimeout(150);   // the whole app redraws
      await p.evaluate(() => document.querySelector('[data-jp="J"]').click()); await p.waitForTimeout(150);
      ok(await p.inputValue('#kwInput') === '레코', 'what you typed stays while the app redraws');
      await p.fill('#kwInput', '레코드'); await p.press('#kwInput', 'Enter'); await p.waitForTimeout(150);
      ok((await saved()).includes('레코드') && (await p.textContent('#prefBox .kw-list')).includes('#레코드'), 'keyword added and saved');
      ok(await p.inputValue('#kwInput') === '', 'box empty after adding');
      const n = (await saved()).length;
      await p.click('#prefBox [data-kwdel="0"]'); await p.waitForTimeout(150);
      ok((await saved()).length === n - 1, '× removes one');
      ok(p.errs.length === 0, 'no page errors ' + p.errs.join(' | '));
      await p.ctx.close();
    }
  },
  {
    name: 'React screen: 장소 찾기 (chips, typed words kept, no AI message, shares the sheet with the block sheet)',
    async run({ b, S, device, ok, vis, skipCoach }) {
      const p = await device(b, S); await p.click('[data-w="new"]'); await p.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(p);
      await p.evaluate(() => window.__jepi.openFind({ when: 'gap', into: 'sched' })); await p.waitForTimeout(150);
      ok(await p.getAttribute('[data-find="when:gap"]', 'aria-pressed') === 'true', 'opens with 빈 시간에');
      await p.fill('#findQ', '카페');
      await p.click('[data-find="into:list"]'); await p.waitForTimeout(100);
      ok(await p.getAttribute('[data-find="into:list"]', 'aria-pressed') === 'true' && await p.inputValue('#findQ') === '카페', 'chip switched, typed words kept');
      await p.click('#findGo'); await p.waitForTimeout(300);
      ok((await p.textContent('#findSt')).includes('AI가 연결되어 있지 않아요') && !(await p.isDisabled('#findGo')), 'no AI: says so, button usable');
      await p.click('#sheet [data-close]'); await p.waitForTimeout(100);
      await p.click('#grid .blk:has-text("구로몬")'); await p.waitForTimeout(200);
      ok(await vis(p, '#sheet [data-mv="30"]') && !(await vis(p, '#findForm')), 'a block opens its own sheet in the same place');
      await p.click('#sheet [data-close="1"]').catch(() => {});
      await p.evaluate(() => window.__jepi.openFind({ where: 'city' })); await p.waitForTimeout(150);
      ok(await vis(p, '#findForm') && await p.getAttribute('[data-find="where:city"]', 'aria-pressed') === 'true' && await p.inputValue('#findQ') === '', '찾기 opens again fresh after the block sheet');
      ok(p.errs.length === 0, 'no page errors ' + p.errs.join(' | '));
      await p.ctx.close();
    }
  },
  {
    name: 'React screen: 이번 여행 rows (open/close, auto-save message keeps the box you type in)',
    async run({ b, S, device, ok, vis, skipCoach }) {
      const p = await device(b, S); await p.click('[data-w="new"]'); await p.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(p);
      await p.click('.tabs [data-tab="more"]'); await p.click('#moreBox [data-tab="me"]'); await p.waitForTimeout(250);
      ok(await p.$$eval('#meBox .merow', e => e.length) === 6, 'six rows for a trip');
      await p.click('[data-meopen="bud"]'); await p.waitForTimeout(150);
      ok(await vis(p, '#meBox .mebody') && await p.getAttribute('[data-meopen="bud"]', 'aria-expanded') === 'true', 'tapping a row opens it');
      const box = '#meBox .mebody input[data-pf]:not([type="hidden"]) >> nth=0';
      await p.click(box); await p.fill(box, '1234'); await p.dispatchEvent(box, 'change'); await p.waitForTimeout(800);
      ok((await p.textContent('#meMsg')).includes('자동 저장됨'), 'auto-save message shown');
      ok(await p.evaluate(() => document.activeElement && document.activeElement.matches('#meBox .mebody input[data-pf]')) && await p.inputValue(box) === '1234', 'the box you typed in stays (not redrawn)');
      await p.click('[data-meopen="bud"]'); await p.waitForTimeout(150);
      ok(!(await vis(p, '#meBox .mebody')), 'tapping again closes it');
      ok(p.errs.length === 0, 'no page errors ' + p.errs.join(' | '));
      await p.ctx.close();
    }
  },
  {
    name: 'React screen: 이번 여행 forms (typing saves, mode/stay/event buttons redraw the form)',
    async run({ b, S, device, ok, vis, skipCoach }) {
      const p = await device(b, S); await p.click('[data-w="new"]'); await p.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(p);
      await p.click('.tabs [data-tab="more"]'); await p.click('#moreBox [data-tab="me"]'); await p.waitForTimeout(250);
      const prof = () => p.evaluate(() => { const k = Object.keys(localStorage).find(x => x.endsWith('gp.profile')); return JSON.parse(localStorage.getItem(k)) });
      await p.click('[data-meopen="way"]'); await p.waitForTimeout(150);
      await p.fill('#meBox [data-pf="out.dep"]', '07:45'); await p.dispatchEvent('#meBox [data-pf="out.dep"]', 'change'); await p.waitForTimeout(900);
      ok((await prof()).out.dep === '07:45' && (await p.textContent('#meMsg')).includes('자동 저장됨'), 'a time typed in 오가는 길 is saved');
      ok(await vis(p, '#meBox .home-box') && await vis(p, '#meBox select[data-pf="out.airport"]'), 'flight form: airport list and 출발지 box');
      await p.click('#meBox [data-radio="mode"][data-val="car"]'); await p.waitForTimeout(900);
      ok(!(await p.$('#meBox select[data-pf="out.airport"]')) && !(await p.$('#meBox .home-box')) && (await p.textContent('#meBox .mebody')).includes('자동차 비용') && (await prof()).mode === 'car', 'car: no airport list, car cost form, saved');
      await p.click('[data-meopen="stay"]'); await p.waitForTimeout(150);
      await p.click('#meBox [data-addstay]'); await p.waitForTimeout(900);
      ok(await p.$$eval('#meBox .frow', e => e.length) === 2 && (await prof()).stays.length === 2, '+ 숙소 추가: two stays, saved');
      await p.selectOption('#meBox [data-pf="stays.1.area"]', { index: 2 }); await p.waitForTimeout(900);
      const a2 = await p.inputValue('#meBox [data-pf="stays.1.area"]');
      ok((await prof()).stays[1].area === a2, 'choosing a 동네 is saved');
      await p.click('[data-meopen="ev"]'); await p.waitForTimeout(150);
      await p.click('#meBox [data-addev]'); await p.waitForTimeout(900);
      await p.fill('#meBox [data-pf="events.0.name"]', '콘서트'); await p.dispatchEvent('#meBox [data-pf="events.0.name"]', 'change'); await p.waitForTimeout(900);
      ok((await prof()).events.length === 1 && (await prof()).events[0].name === '콘서트', 'a booked event is added and named');
      await p.click('[data-meopen="when"]'); await p.waitForTimeout(150);
      await p.click('#meBox #dateUnknown'); await p.waitForTimeout(900);
      ok(await p.isDisabled('#meBox [data-pf="startDate"]') && await p.isChecked('#meBox #dateUnknown') && (await prof()).dateUnknown === true, '날짜는 아직 몰라요: date box locked, saved');
      ok(p.errs.length === 0, 'no page errors ' + p.errs.join(' | '));
      await p.ctx.close();
    }
  },
  {
    name: 'React screen: 예산 hint follows typing, 취향 style rows save and stay open',
    async run({ b, S, device, ok, vis, skipCoach }) {
      const p = await device(b, S); await p.click('[data-w="new"]'); await p.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(p);
      const prof = () => p.evaluate(() => { const k = Object.keys(localStorage).find(x => x.endsWith('gp.profile')); return JSON.parse(localStorage.getItem(k)) });
      await p.click('.tabs [data-tab="more"]'); await p.click('#moreBox [data-tab="me"]'); await p.waitForTimeout(250);
      await p.click('[data-meopen="bud"]'); await p.waitForTimeout(150);
      await p.fill('#meBox [data-pf="budgetMan"]', ''); await p.waitForTimeout(900);
      const before = await p.textContent('#budgetHint');
      await p.click('#meBox [data-pf="budgetMan"]'); await p.keyboard.type('200'); await p.waitForTimeout(100);
      const mid = await p.textContent('#budgetHint');
      ok(before.includes('총예산만 넣으면') && mid.includes('현지 경비 하루 약'), 'the hint changes while typing');
      ok(await p.evaluate(() => document.activeElement && document.activeElement.matches('#meBox [data-pf="budgetMan"]')) && await p.inputValue('#meBox [data-pf="budgetMan"]') === '200', 'still typing in the same box');
      await p.dispatchEvent('#meBox [data-pf="budgetMan"]', 'change'); await p.waitForTimeout(900);
      ok((await prof()).budgetMan === 200 && await p.inputValue('#meBox [data-pf="budgetMan"]') === '200', 'saved, the box keeps the number');
      await p.click('.tabs [data-tab="more"]'); await p.click('#moreBox [data-tab="pref"]'); await p.waitForTimeout(250);
      await p.click('#tasteStyle [data-radio="pace"][data-val="full"]'); await p.waitForTimeout(900);
      ok((await prof()).pace === 'full' && await p.getAttribute('#tasteStyle [data-radio="pace"][data-val="full"]', 'aria-pressed') === 'true', '속도 saved and shown');
      await p.click('#tasteStyle details.marks summary'); await p.click('#tasteStyle [data-radio="style.lang"][data-val="high"]'); await p.waitForTimeout(900);
      ok((await prof()).style.lang === 'high' && await p.evaluate(() => document.querySelector('#tasteStyle details.marks').open) && (await p.textContent('#tasteStyle summary')).includes('1개 골랐어요'), 'a style row is saved, the box stays open and counts it');
      ok(p.errs.length === 0, 'no page errors ' + p.errs.join(' | '));
      await p.ctx.close();
    }
  },
  {
    name: 'React screen: 처음 설정 (start paths, messages land in React status lines, 준비하기 button relabels and comes back)',
    async run({ b, S, device, ok, vis, skipCoach }) {
      let p = await device(b, S); await p.click('[data-w="new"]'); await p.waitForTimeout(250);
      const tap = async sel => { await p.click('#onbBody ' + sel); await p.waitForTimeout(250) };
      ok(await vis(p, '#onbBody [data-pickjp="J"]') && await vis(p, '#onbBody .importFile'), 'J/P choice and backup import');
      await tap('[data-pickjp="J"]'); await tap('[data-startmode="quick"]:not([data-destmode])');
      ok(await vis(p, '#onbBody [data-pf="dest"]') && await vis(p, '#onbBody [data-pf="nights"]') && await vis(p, '#onbBody [data-radio="party.type"]'), '가고 싶은 곳: 여행지 · 날짜 · 동행');
      await p.fill('#onbBody [data-pf="dest"]', '부산'); await p.click('#onbNext'); await p.waitForTimeout(300);
      ok((await p.textContent('#st_dates')).includes('여행 날짜와 기간을 먼저'), '다음 without dates: the message shows under the dates');
      ok(await p.inputValue('#onbBody [data-pf="dest"]') === '부산', 'what was typed stays');
      await tap('[data-destmode="find"]');
      ok(await vis(p, '#onbBody #destWant') && await vis(p, '#onbBody [data-pf="startDate"]'), '여행지 추천: dates + finder');
      await p.ctx.close();
      p = await device(b, S); await p.click('[data-w="new"]'); await p.waitForTimeout(250);
      await tap('[data-pickjp="P"]'); await tap('[data-q="when"][data-qv="pick"]');
      ok(await vis(p, '#onbBody [data-pf="startDate"]'), 'P: 날짜 고르기 shows a date box');
      await tap('[data-q="len"][data-qv="0"]');
      ok(await vis(p, '#onbBody [data-q="slot"]') && (await p.textContent('#quickStart')).includes('하루 코스 시작하기'), '하루: time slots, button says 하루 코스');
      await tap('#quickStart');
      ok((await p.textContent('#onbBody #st_pack')).includes('어디로 갈지'), 'no place: asks where');
      await p.ctx.close();
      // with an AI key: 준비하기 relabels the button and shows the time while it waits
      p = await device(b, S); await p.click('[data-w="new"]'); await p.waitForTimeout(250);
      if (await p.$('#onbKey_anthropic')) { await p.fill('#onbKey_anthropic', 'sk-ant-test-key'); await p.click('#onbBody [data-onbkey="anthropic"]'); await p.waitForTimeout(300) }
      await p.route(/api\.anthropic\.com/, async r => { await new Promise(x => setTimeout(x, 2500)); r.fulfill({ status: 503, body: '{}' }) });
      await tap('[data-pickjp="J"]'); await tap('[data-startmode="quick"]:not([data-destmode])');
      ok(await vis(p, '#onbBody #genPack'), 'AI connected: 준비하기 button');
      await p.fill('#onbBody [data-pf="dest"]', '부산'); await p.click('#onbBody #genPack'); await p.waitForTimeout(1300);
      const busy = { btn: await p.textContent('#genPack'), st: await p.textContent('#st_pack'), cls: await p.getAttribute('#st_pack', 'class') };
      ok(busy.btn.includes('준비하는 중') && busy.st.includes('초 지났어요') && busy.cls.includes('busy'), 'while waiting: button relabeled, time shown ' + JSON.stringify(busy));
      await p.waitForTimeout(13000);   // a busy server is tried 3 times (2.5 s each here) before it gives up
      const done = { btn: await p.textContent('#genPack'), st: await p.textContent('#st_pack'), cls: await p.getAttribute('#st_pack', 'class') };
      ok(done.btn === 'AI로 여행지 준비하기' && !done.cls.includes('busy') && !done.st.includes('초 지났어요') && done.st.length > 0, 'after it fails: button back, a message instead ' + JSON.stringify(done));
      ok(done.st.includes('바빠요'), 'the message says the AI server is busy');
      ok(p.errs.length === 0, 'no page errors ' + p.errs.join(' | '));
      await p.ctx.close();
    }
  },
  {
    name: 'React screen: 처음 설정 with AI (talk → 방향, 여행지 추천 cards · 더 보기 · 궁금한 곳, chips flip, buttons relabel while waiting)',
    async run({ b, S, device, ok, vis }) {
      const D = c => ({ city: c, country: '일본', why: c + ' 좋아요', season: '선선해요', highlights: ['시장'], flight: '비행 약 2시간', budget: '60만원', caution: '', fit: '' });
      let turn = 0;
      const fake = async r => {
        const body = r.request().postData() || '', say = o => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ type: 'text', text: JSON.stringify(o) }] }) });
        if (body.includes('travel companion')) return ++turn < 3 ? say({ reply: '그랬군요. 더 들려주세요.', options: ['쉬고 싶어요', '걷고 싶어요'], done: false, summary: null })
          : say({ reply: '좋아요.', options: [], done: true, summary: { purpose: '천천히 걷기', keywords: ['산책길'], pace: 'slow', social: 'alone', party: 'solo', reach: 'near', avoid: '', dest: '', nights: null, startDate: null, note: '조용한 여행' } });
        await new Promise(x => setTimeout(x, 1500));
        if (body.includes('is considering')) return say({ destinations: [D('레이캬비크')] });
        return say({ destinations: body.includes('Do not repeat') ? [D('타이베이'), D('하노이')] : ['후쿠오카', '삿포로', '가오슝', '다낭', '제주'].map(D) });
      };
      const fresh = async () => {
        const p = await device(b, S); await p.route(/api\.anthropic\.com/, fake); await p.click('[data-w="new"]'); await p.waitForTimeout(250);
        if (await p.$('#onbKey_anthropic')) { await p.fill('#onbKey_anthropic', 'sk-ant-test-key'); await p.click('#onbBody [data-onbkey="anthropic"]'); await p.waitForTimeout(300) }
        await p.click('#onbBody [data-pickjp="J"]'); await p.waitForTimeout(250); return p;
      };
      let p = await fresh();
      await p.click('#onbBody [data-startmode="talk"]'); await p.waitForTimeout(250);
      ok(await vis(p, '#talkQ') && await p.$$eval('#onbBody .t-opt', e => e.length) === 4, 'talk: first question with 4 answers');
      await p.click('#onbBody [data-talkopt="0"]'); await p.waitForTimeout(800);
      ok((await p.textContent('#talkQ')).includes('더 들려주세요') && await p.$$eval('#onbBody .t-dots i.on', e => e.length) === 1, 'an answer: next question, one dot on');
      await p.fill('#talkInput', '바다'); await p.click('#talkSend'); await p.waitForTimeout(800);
      await p.click('#talkFinish'); await p.waitForTimeout(800);
      ok(await vis(p, '#onbBody .t-letter') && await p.inputValue('#onbBody [data-pf="purpose"]') === '천천히 걷기', 'finish: the 방향 letter with the summed-up line');
      const chip = '#onbBody .t-letter [data-kwtoggle="산책길"]';
      const before = await p.getAttribute(chip, 'aria-pressed'); await p.click(chip); await p.waitForTimeout(200);
      ok(before === 'true' && await p.getAttribute(chip, 'aria-pressed') === 'false' && !(await p.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => k.endsWith('gp.kw'))) || '[]'))).includes('산책길'), 'a chip flips off and the keyword is removed');
      await p.click('#talkApply'); await p.waitForTimeout(300);
      ok((await p.textContent('#onbBody .t-banner')).includes('천천히 걷기') && await vis(p, '#onbBody #destRecBtn'), 'apply: banner + 여행지 추천');
      await p.selectOption('#onbBody [data-pf="nights"]', '3'); await p.fill('#onbBody [data-pf="startDate"]', '2026-12-10'); await p.dispatchEvent('#onbBody [data-pf="startDate"]', 'change'); await p.waitForTimeout(300);
      await p.fill('#destWant', '조용한 바다'); await p.click('#destRecBtn'); await p.waitForTimeout(500);
      ok((await p.textContent('#destRecBtn')).includes('고르는 중') && (await p.textContent('#st_dest')).includes('초 지났어요'), 'while waiting: 고르는 중… and the time');
      await p.waitForTimeout(1800);
      ok(await p.$$eval('#onbBody .area-card', e => e.length) === 5 && (await p.textContent('#destRecBtn')) === 'AI로 여행지 추천받기' && (await p.textContent('#st_dest')).includes('골라 주세요'), 'five cards, button back, a message');
      ok(await p.inputValue('#destWant') === '조용한 바다', 'what was written in the wish box stays');
      await p.click('#destMoreBtn'); await p.waitForTimeout(2300);
      ok(await p.$$eval('#onbBody [data-pickdest]', e => e.length) === 7, '다른 곳 더 보기 adds two');
      await p.fill('#destAsk', '아이슬란드'); await p.click('#destAskBtn'); await p.waitForTimeout(2300);
      ok((await p.textContent('#asked-0')).includes('레이캬비크') && (await p.textContent('#st_ask')).includes('정리했어요'), '궁금한 곳: its own card');
      await p.click('#onbBody [data-pickdest="1"]'); await p.waitForTimeout(400);
      ok(await p.inputValue('#onbBody [data-pf="dest"]') === '삿포로', 'picking a card fills 여행지');
      ok(p.errs.length === 0, 'no page errors ' + p.errs.join(' | '));
      await p.ctx.close();
    }
  },
  {
    name: 'React screen: 장소 탭 (♥ stays after redraw, filters, 넣기 then a slot places it, 동네 folds stay folded)',
    async run({ b, S, device, ok, vis, skipCoach }) {
      const p = await device(b, S); await p.click('[data-w="new"]'); await p.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(p);
      await p.click('.tabs [data-tab="tray"]'); await p.waitForTimeout(300);
      const n0 = await p.$$eval('#cards .card', e => e.length);
      ok(n0 > 0 && await p.$$eval('#cards details.zone', e => e.length) > 0, 'cards grouped by 동네 (' + n0 + ')');
      const id = await p.getAttribute('#cards details[open] .card >> nth=0', 'data-id');
      await p.click(`#cards [data-wish="${id}"]`); await p.waitForTimeout(200);
      ok(await p.textContent(`#cards [data-wish="${id}"]`) === '♥' && await p.getAttribute(`#cards [data-wish="${id}"]`, 'aria-pressed') === 'true', '♥ is on after the list redraws');
      await p.click('#filters [data-cat="wish"]'); await p.waitForTimeout(200);
      ok(await p.$$eval('#cards .card', e => e.length) === 1 && await p.getAttribute('#filters [data-cat="wish"]', 'aria-pressed') === 'true', '♥ filter: only that place');
      await p.click('#filters [data-cat="all"]'); await p.selectOption('#catSel', 'food'); await p.waitForTimeout(200);
      ok(await p.inputValue('#catSel') === 'food' && await p.$$eval('#cards .card', e => e.every(c => c.getAttribute('style').includes('--c-food'))), '분류: only 식사·카페');
      await p.click('#filters [data-cat="all"]'); await p.waitForTimeout(200);
      const z = await p.getAttribute('#cards details.zone[open] >> nth=0', 'data-zone');
      await p.click(`#cards details.zone[data-zone="${z}"] > summary`); await p.waitForTimeout(100);
      await p.click(`#cards [data-wish="${id}"]`).catch(() => {}); await p.waitForTimeout(200);
      ok(!(await p.evaluate(z => document.querySelector(`#cards details.zone[data-zone="${z}"]`).open, z)), 'a folded 동네 stays folded after a redraw');
      const pid = await p.getAttribute('#cards details[open] .card >> nth=0', 'data-id');
      await p.click(`#cards [data-pick="${pid}"]`); await p.waitForTimeout(250);
      if (!(await vis(p, '#grid'))) { await p.click('.tabs [data-tab="timeline"]'); await p.waitForTimeout(200) }
      await p.click('#grid .slot >> nth=0'); await p.waitForTimeout(300);
      await p.click('.tabs [data-tab="tray"]'); await p.waitForTimeout(200);
      ok(!(await p.$(`#cards [data-id="${pid}"]`)) && (await p.textContent('#cards')).includes('목록에서 숨겼어요'), '넣기 → slot: placed, hidden from the list');
      ok(p.errs.length === 0, 'no page errors ' + p.errs.join(' | '));
      await p.ctx.close();
    }
  },
  {
    name: 'React screen: 준비하기 (a tick is saved and stays, 초기화 asks once more, 시즌 정보 button waits then shows tips)',
    async run({ b, S, device, ok, vis, skipCoach }) {
      const say = (r, o) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ type: 'text', text: JSON.stringify(o) }] }) });
      const p = await device(b, S);
      await p.route(/api\.anthropic\.com/, async r => { if (!(r.request().postData() || '').includes('sunrise')) return r.fulfill({ status: 503, body: '{}' }); await new Promise(x => setTimeout(x, 1500)); say(r, { sunrise: '06:30', sunset: '17:10', weather: '맑아요', notes: ['얇은 겉옷 챙기기'], events: [] }) });
      await p.click('[data-w="new"]'); await p.waitForTimeout(250);
      if (await p.$('#onbKey_anthropic')) { await p.fill('#onbKey_anthropic', 'sk-ant-test-key'); await p.click('#onbBody [data-onbkey="anthropic"]'); await p.waitForTimeout(300) }
      await p.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(p);
      const open = async () => { await p.click('.tabs [data-tab="more"]'); await p.click('#moreBox [data-tab="check"]'); await p.waitForTimeout(300) };
      await open();
      const ck = '#checks .check-group:has(h3:text("여행 전체")) input[data-ck] >> nth=0';
      const id = await p.getAttribute(ck, 'data-ck');
      await p.click(ck); await p.waitForTimeout(200);
      await open();
      ok(await p.isChecked(`#checks input[data-ck="${id}"]`) && await p.evaluate(id => JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => k.endsWith('gp.done')))||'{}')[id] === true, id), 'a tick is saved and still on after reopening');
      ok(await p.$eval(`#checks input[data-ck="${id}"]`, x => x.closest('label').classList.contains('done')), 'the ticked row looks done');
      const blocks = async () => p.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => k.endsWith('gp.placed3'))) || '[]').length);
      const before = await blocks();
      await p.click('#resetBtn'); await p.waitForTimeout(200);
      ok((await p.textContent('#resetBtn')).includes('한 번 더') && before > 0 && await blocks() === before, '초기화: asks once more first (' + before + ' blocks kept)');
      await p.click('#seasonBtn'); await p.waitForTimeout(600);
      ok((await p.textContent('#seasonBtn')).length > 0 && (await p.textContent('#st_season')).includes('초 지났어요'), '시즌 정보: shows the time while waiting');
      await p.waitForTimeout(2200); await open();
      ok((await p.textContent('#checks')).includes('얇은 겉옷 챙기기') && (await p.textContent('#seasonBtn')) === '시즌 정보 다시 받기', 'tips arrive as rows, the button says 다시 받기');
      ok(p.errs.length === 0, 'no page errors ' + p.errs.join(' | '));
      await p.ctx.close();
    }
  },
  {
    name: '🎲 nearby (pretend Kakao map, location set): 뭐 하지 one place and a course, 뭐 먹지 a place to eat, 이걸로 remembers it',
    async run({ b, S, device, ok, skipCoach }) {
      const p = await device(b, S);
      await p.ctx.grantPermissions(['geolocation']); await p.ctx.setGeolocation({ latitude: 37.544, longitude: 127.056 });
      await p.route(/dapi\.kakao\.com/, r => { const u = new URL(r.request().url()), w = u.searchParams.get('query') || u.searchParams.get('category_group_code'), x = +u.searchParams.get('x'), y = +u.searchParams.get('y');
        r.fulfill({ contentType: 'application/json', body: JSON.stringify({ meta: { is_end: true }, documents: [0, 1, 2, 3].map(i => ({ id: w + i, place_name: `${w} 가게 ${i}`, category_name: '음식점 > ' + w, distance: String(120 * (i + 1)), road_address_name: '성수이로 ' + i, x: String(x + i * 0.001), y: String(y + i * 0.001) })) }) }) });
      await p.click('[data-w="new"]'); await p.evaluate(() => window.__jepi.demoLikeTrip()); await p.waitForTimeout(400); await skipCoach(p);
      await p.evaluate(() => localStorage.setItem('jepi.keys', JSON.stringify(Object.assign(JSON.parse(localStorage.getItem('jepi.keys') || '{}'), { kakao: 'KakaoTestKey' }))));
      await p.clock.setFixedTime(new Date('2027-03-10T15:20:00'));
      await p.reload(); await p.waitForTimeout(3800); await skipCoach(p).catch(() => {}); await p.emulateMedia({ reducedMotion: 'reduce' });
      await p.click('#diceFab'); await p.waitForTimeout(400);
      if (!(await p.$('#sheet [data-dobase]'))) { await p.click('#sheet [data-dicetab="do"]'); await p.waitForTimeout(300) }
      await p.click('#sheet [data-dobase="near"]'); await p.waitForTimeout(300);
      await p.click('#sheet [data-dogo="one"] >> nth=0'); await p.waitForTimeout(1200);
      const one = await p.textContent('#sheet');
      ok(/가게 \d/.test(one) && one.includes('카카오 지도') && one.includes('지금 위치 기준'), '뭐 하지: one place from the map around me');
      await p.click('#sheet [data-dogo="course"] >> nth=0'); await p.waitForTimeout(1800);
      const stops = await p.$$eval('#sheet [data-doreroll]', e => e.length);
      ok(stops >= 3 && (await p.textContent('#sheet')).includes('지금 위치에서 걸어서'), 'course of ' + stops + ' stops, walking times between them');
      await p.click('#sheet [data-dicetab="eat"]'); await p.waitForTimeout(300);
      await p.click('#sheet [data-eatbase="near"]').catch(() => {}); await p.waitForTimeout(200);
      await p.click('#sheet [data-eatroll="go"]'); await p.waitForTimeout(1200);
      const eat = await p.textContent('#sheet');
      ok(/FD6 가게 \d/.test(eat) && eat.includes('걸어서 약'), '뭐 먹지: a restaurant within walking distance');
      const nm = (eat.match(/FD6 가게 \d/) || [''])[0];
      await p.click('#eatPick'); await p.waitForTimeout(300);
      ok((await p.textContent('#sheet')).includes('맛있게 드세요') && await p.evaluate(n => JSON.parse(localStorage.getItem('gp.dice')).some(x => x.n === n), nm), '이걸로! is remembered (left out of the next rolls)');
      ok(p.errs.length === 0, 'no page errors ' + p.errs.join(' | '));
      await p.ctx.close();
    }
  },
  {
    name: 'React screen: 🎲 DICE (roll in a free slot → 이걸로 할래요 puts it in the schedule, 다시 counts down, tabs swap) and 지도 cards',
    async run({ b, S, device, ok, vis, skipCoach }) {
      const p = await device(b, S); await p.click('[data-w="new"]'); await p.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(p);
      await p.emulateMedia({ reducedMotion: 'reduce' });
      await p.evaluate(() => { let s = 7; Math.random = () => ((s = s * 16807 % 2147483647) / 2147483647) });   // the same rolls every time
      const blocks = () => p.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => k.endsWith('gp.placed3'))) || '[]').length);
      await p.click('#diceFab'); await p.waitForTimeout(400);
      // at meal times the button opens 뭐 먹지 first: go to 뭐 하지 for the rest of this check
      if (!(await vis(p, '#sheet [data-dobase="near"]'))) { await p.click('#sheet [data-dicetab="do"]'); await p.waitForTimeout(300) }
      ok(await vis(p, '#sheet .dice-tabs') && await vis(p, '#sheet [data-dobase="near"]'), 'DICE opens with 뭐 하지/뭐 먹지 tabs');
      await p.click('#sheet [data-dobase="plan"]'); await p.waitForTimeout(300);
      ok((await p.textContent('#sheet h3')).includes('빈 시간에서 굴려요') && await vis(p, '#sheet [data-dicegap]'), 'plan view: free slots to pick');
      await p.click('#diceGo'); await p.waitForTimeout(500);
      ok(await vis(p, '#sheet .dice-card') && (await p.textContent('#diceAgain')).includes('2번'), 'a roll shows a place, 2 rolls left');
      await p.click('#diceAgain'); await p.waitForTimeout(500);
      ok((await p.textContent('#diceAgain')).includes('1번'), '다시 굴리기 counts down');
      const n0 = await blocks();
      await p.click('#diceFix'); await p.waitForTimeout(500);
      if (await vis(p, '#diceForce')) { await p.click('#diceForce'); await p.waitForTimeout(500) }   // a pick that needs 그래도 넣기
      ok(await blocks() === n0 + 1 && !(await vis(p, '#sheetBg')), '이걸로 할래요: one more block, sheet closed');
      await p.click('#diceFab'); await p.waitForTimeout(400);
      await p.click('#sheet [data-dicetab="eat"]'); await p.waitForTimeout(300);
      ok(await vis(p, '#sheet .dice.eat') && await p.getAttribute('#sheet [data-dicetab="eat"]', 'aria-selected') === 'true', '뭐 먹지 tab');
      await p.click('#sheet [data-close]'); await p.waitForTimeout(200);
      await p.click('.tabs [data-tab="map"]'); await p.waitForTimeout(800);
      ok(await p.$$eval('#mapCards .mcard', e => e.length) > 2 && await p.$$eval('#mapCards .mcard a', e => e.length) > 0, '지도: a card per stop with 안내 시작');
      ok(p.errs.length === 0, 'no page errors ' + p.errs.join(' | '));
      await p.ctx.close();
    }
  },
  {
    name: 'React screen: 일정표 위쪽 (day buttons switch day, 빈 시간 chip opens/closes its list, 간식비 + changes the total)',
    async run({ b, S, device, ok, vis, skipCoach }) {
      const p = await device(b, S); await p.click('[data-w="new"]'); await p.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(p);
      ok(await p.$$eval('#days .day-btn', e => e.length) >= 2 && await p.getAttribute('#days [data-day="0"]', 'aria-pressed') === 'true', 'day buttons, Day 1 chosen');
      await p.click('#days [data-day="1"]'); await p.waitForTimeout(300);
      ok(await p.getAttribute('#days [data-day="1"]', 'aria-pressed') === 'true' && (await p.textContent('#daySub')).length > 0, 'tapping Day 2 switches');
      await p.click('#days [data-day="0"]'); await p.waitForTimeout(300);
      ok(!(await vis(p, '#sumBody')), 'summary details closed at first');
      await p.click('#daySum [data-sum="gap"]'); await p.waitForTimeout(200);
      ok(await vis(p, '#sumBody') && (await p.textContent('#sumBody')).includes('비어 있어요') && await p.getAttribute('#daySum [data-sum="gap"]', 'aria-expanded') === 'true', '빈 시간 chip opens the list');
      await p.click('#daySum [data-sum="gap"]'); await p.waitForTimeout(200);
      ok(!(await vis(p, '#sumBody')), 'tapping again closes it');
      await p.click('#daySum [data-sum="budget"]'); await p.waitForTimeout(200);
      const before = await p.textContent('#budget .bud-grid > div:nth-child(3) b');
      await p.click('#budget [data-meal]:not([data-meal^="-"])'); await p.waitForTimeout(200);
      ok(await p.textContent('#budget .bud-grid > div:nth-child(3) b') !== before && (await p.textContent('#budgetSum')).includes('자세히'), '간식비 + changes the number');
      ok((await p.textContent('#route')).includes('이동 합계'), 'route line with the total');
      ok(p.errs.length === 0, 'no page errors ' + p.errs.join(' | '));
      await p.ctx.close();
    }
  },
  {
    name: 'React screen: 일정표 블록 (drag a block: the slot under it lights up, drop moves it, highlight clears; memo shows; 넣기 → slot)',
    async run({ b, S, device, ok, vis, skipCoach }) {
      const p = await device(b, S); await p.click('[data-w="new"]'); await p.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(p);
      const n0 = await p.$$eval('#grid .blk', e => e.length);
      ok(n0 > 3 && await p.$$eval('#grid .slot', e => e.length) >= 30, 'blocks and time slots drawn (' + n0 + ')');
      const uid = await p.getAttribute('#grid .blk[draggable="true"] >> nth=0', 'data-uid');
      const startOf = () => p.evaluate(u => { const k = Object.keys(localStorage).find(k => k.endsWith('gp.placed3')); return (JSON.parse(localStorage.getItem(k)) || []).map(x => x.start) }, uid);
      const before = await startOf();
      const box = await p.$eval('#grid .slot[data-t="1290"]', el => { el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } });
      const fire = (type, sel, x, y) => p.evaluate(([type, sel, x, y]) => { const dt = new DataTransfer(); const el = document.querySelector(sel); el.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, dataTransfer: dt })) }, [type, sel, x, y]);
      await fire('dragstart', `#grid .blk[data-uid="${uid}"]`, 0, 0);
      await fire('dragover', '#grid', box.x, box.y);
      ok(await p.$$eval('#grid .slot.drop', e => e.length) === 1 && await p.getAttribute('#grid .slot.drop', 'data-t') === '1290', 'the slot under the pointer lights up');
      await fire('drop', '#grid', box.x, box.y); await p.waitForTimeout(300);
      await fire('dragend', '#grid', 0, 0);
      ok(JSON.stringify(await startOf()) !== JSON.stringify(before) && (await startOf()).includes(1290), 'drop moves the block to that time');
      ok(await p.$$eval('#grid .slot.drop', e => e.length) === 0, 'the highlight clears');
      await p.click('#grid .blk:not(.fixed) >> nth=0'); await p.waitForTimeout(300);
      await p.fill('#bmIn', '사진!'); await p.click('#bmSave'); await p.waitForTimeout(300); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
      ok((await p.textContent('#grid')).includes('사진!') && await vis(p, '#grid .bmemo'), 'a handwritten memo shows on the block');
      ok(p.errs.length === 0, 'no page errors ' + p.errs.join(' | '));
      await p.ctx.close();
    }
  },
  {
    name: 'React screen: 일정표 시트 (30분 뒤로 moves the block, 할 일 표시 stays open, 대안 swaps, 빈 시간 → 넣기 places it)',
    async run({ b, S, device, ok, vis, skipCoach }) {
      const p = await device(b, S); await p.click('[data-w="new"]'); await p.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(p);
      const placedNow = () => p.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => k.endsWith('gp.placed3'))) || '[]'));
      const uid = await p.getAttribute('#grid .blk:not(.fixed) >> nth=1', 'data-uid');
      await p.click(`#grid .blk[data-uid="${uid}"]`); await p.waitForTimeout(300);
      ok(await vis(p, '#sheet [data-mv="30"]') && await vis(p, '#sheet .alt') && await vis(p, '#sheet #bmIn'), 'a place block: time buttons, 대안, memo box');
      const t0 = (await p.textContent('#sheet .when'));
      await p.click('#sheet [data-mv="30"]'); await p.waitForTimeout(300);
      ok((await p.textContent('#sheet .when')) !== t0, '30분 뒤로: the time in the sheet changes');
      await p.click('#sheet details.marks summary'); await p.click('#sheet [data-mark="wait+"]'); await p.waitForTimeout(300);
      ok(await p.getAttribute('#sheet [data-mark="wait+"]', 'aria-pressed') === 'true' && await p.evaluate(() => document.querySelector('#sheet details.marks').open), '할 일 표시 on, the box stays open');
      const before = (await placedNow()).map(x => x.id).sort().join();
      const alt = await p.getAttribute('#sheet [data-swap] >> nth=0', 'data-swap');
      await p.click('#sheet [data-swap] >> nth=0'); await p.waitForTimeout(400);
      ok((await placedNow()).some(x => x.id === alt) && (await placedNow()).map(x => x.id).sort().join() !== before && (await p.textContent('#sheet h3')).length > 0, '대안 바꾸기: swapped, the sheet shows the new place');
      const n0 = (await placedNow()).length;
      await p.click('#sheet [data-close] >> nth=-1'); await p.waitForTimeout(300);
      await p.$eval('#grid .slot[data-t="1290"]', e => e.click()); await p.waitForTimeout(400);
      ok((await p.textContent('#sheet h3')).includes('비어 있음') && await p.$$eval('#sheet [data-fill]', e => e.length) > 0, '빈 시간: places that fit');
      await p.click('#sheet [data-fill] >> nth=0'); await p.waitForTimeout(400);
      ok((await placedNow()).length === n0 + 1 && !(await vis(p, '#sheetBg')), '넣기: one more block, sheet closed');
      ok(p.errs.length === 0, 'no page errors ' + p.errs.join(' | '));
      await p.ctx.close();
    }
  },
  {
    name: 'P모드: collecting 내 카드 before the board opens (+ 카드 모으기 → 장소 tab with ♥ 담기, 직접 적어 담기, 일정에 바로 넣기)',
    async run({ b, S, device, ok, vis, skipCoach }) {
      const p = await device(b, S); await p.click('[data-w="new"]'); await p.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(p);
      ok(await p.$$eval('#cards [data-pick]', e => e.length) > 0 && !(await vis(p, '.pcollect')), 'J모드: the 장소 tab is unchanged (넣기, no collecting box)');
      await p.click('[data-jp="P"]'); await p.waitForTimeout(300); await skipCoach(p);
      ok(await vis(p, '#pview .pclosed') && await vis(p, '#pview .pcol.big'), 'closed day with no cards: a big "+ 카드 모으기"');
      await p.click('#pview .pcol.big'); await p.waitForTimeout(400); await skipCoach(p);
      ok(await vis(p, '#cards .pcollect') && (await p.textContent('#cards .pcollect b')).includes('0장'), '… opens the 장소 tab as "카드 모으기" (0장)');
      ok(await p.$$eval('#cards .card .wish-go', e => e.length) > 0 && await p.$$eval('#cards [data-pick]', e => e.length) === 0, 'P모드: every place has "♥ 담기" instead of 넣기');
      await p.evaluate(() => document.querySelectorAll('#cards .wish-go')[0].click()); await p.waitForTimeout(200);
      await p.evaluate(() => document.querySelectorAll('#cards .wish-go:not(.on)')[0].click()); await p.waitForTimeout(200);
      ok((await p.textContent('#cards .pcollect b')).includes('2장') && await p.$$eval('#cards .wish-go.on', e => e.length) === 2, '♥ 담기 twice → 2장, buttons say 담았어요');
      await p.click('#cards [data-pnewcard]'); await p.waitForTimeout(300);
      ok(await vis(p, '#customForm[data-card="1"]') && !(await vis(p, '#cfStart')), '직접 적어 담기: a card form without a start time');
      await p.fill('#cfName', '친구가 말한 타코야키집'); await p.click('#customForm [type=submit]'); await p.waitForTimeout(400);
      ok((await p.textContent('#cards .pcollect b')).includes('3장'), '… it becomes a card (3장)');
      const placed = () => p.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => k.endsWith('gp.placed3'))) || '[]').length);
      const n0 = await placed();
      await p.evaluate(() => document.querySelector('.tabs [data-tab="timeline"]').click()); await p.waitForTimeout(300);
      ok(await placed() === n0 && await p.$$eval('#pview .pfan .mcard', e => e.length) === 3 && (await p.textContent('#pview .pfan')).includes('타코야키'), 'the board shows 3 cards, none put into the day');
      ok(await vis(p, '#pview .pmh .pcol'), 'with cards: a small "+ 카드 모으기" next to 내 카드');
      ok(p.errs.length === 0, 'no page errors ' + p.errs.join(' | '));
      await p.ctx.close();
    }
  },
  {
    name: 'P모드 × 여행 수첩 style = black-and-white sketchbook (same board, pencil look, only the stamps/now in red)',
    async run({ b, S, device, ok, vis, skipCoach }) {
      const p = await device(b, S); await p.click('[data-w="new"]'); await p.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(p);
      await p.click('[data-jp="P"]'); await p.waitForTimeout(300); await skipCoach(p);
      await p.click('#pview [data-pahead]'); await p.waitForTimeout(300);
      const look = () => p.evaluate(() => { const cs = s => getComputedStyle(document.querySelector(s)); return { wrap: cs('#pview .pwrap').backgroundColor, tray: cs('#pview .ptray').backgroundColor, die: cs('#pview .pd:nth-child(2) .pdie').backgroundColor, roll: cs('#pview .proll').backgroundColor } });
      const color = await look();
      ok(color.tray === 'rgb(31, 94, 87)' && color.die !== 'rgb(255, 255, 255)', '컬러 블록: board-game colours (green tray, coloured dice) ' + JSON.stringify(color));
      await p.click('#lookBtn'); await p.waitForTimeout(200); await p.click('[data-lk="style:note"]'); await p.click('#lookForm [type=submit]'); await p.waitForTimeout(300);
      const note = await look();
      ok(note.wrap === 'rgb(248, 245, 238)' && note.tray === 'rgb(255, 255, 255)' && note.die === 'rgb(255, 255, 255)' && note.roll === 'rgb(51, 48, 43)', '여행 수첩: paper, white pencil dice, graphite roll button ' + JSON.stringify(note));
      ok(await p.$$eval('#pview .ppage:first-child .sq', e => e.length) >= 4 && await p.$$eval('#pview .pd', e => e.length) === 6, 'same board and the same six dice');
      ok(await p.$eval('#pview .pstep', e => getComputedStyle(e).fontFamily).then(f => /Pen|Gaegu|Melody/.test(f)), 'titles in the trip handwriting');
      ok(p.errs.length === 0, 'no page errors ' + p.errs.join(' | '));
      await p.ctx.close();
    }
  },
  {
    name: 'React screen: P모드 보드게임판 (closed until the morning, 미리 열기, zigzag board with roads, dice 1–6, 3D roll → card, 다시 뽑기, 갈래요 adds it, my cards row drags sideways, stamps on a past/now day)',
    async run({ b, S, device, ok, vis, skipCoach }) {
      const p = await device(b, S); await p.click('[data-w="new"]'); await p.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(p);
      await p.evaluate(() => { let s = 7; Math.random = () => ((s = s * 16807 % 2147483647) / 2147483647) });
      const count = () => p.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => k.endsWith('gp.placed3'))) || '[]').length);
      ok((await p.textContent('[data-jp="J"]')) === 'J모드' && (await p.textContent('[data-jp="P"]')) === 'P모드', 'mode buttons say J모드 / P모드');
      await p.click('[data-jp="P"]'); await p.waitForTimeout(400); await skipCoach(p);
      ok(await vis(p, '#pview .pclosed') && !(await vis(p, '#grid')) && !(await vis(p, '#pview .pboard')), 'a future day is closed: "판은 그날 아침에 펼쳐요"');
      ok((await p.textContent('#pview .pclosed')).includes('아침에'), 'closed card explains the morning opening');
      await p.click('#pview [data-pahead]'); await p.waitForTimeout(300);
      ok(await vis(p, '#pview .pboard') && await p.$$eval('#pview .ppage:first-child .sq', e => e.length) >= 4, '미리 열어서 계획하기 → the board');
      ok(await p.$$eval('#pview .ppage:first-child .road', e => e.length) >= 3, 'squares are joined by roads');
      ok(!(await vis(p, '#pview .sq.start')) && await p.$$eval('#pview .sq.q', e => e.length) >= 1 && await p.$$eval('#pview .sq.fl', e => e.length) >= 1, 'day 1: flag squares for fixed times and ? squares (no start square)');
      const faces = await p.$$eval('#pview .pd', ds => ds.map(d => d.querySelectorAll('.pdie i.on').length));
      ok(JSON.stringify(faces) === '[1,2,3,4,5,6]', 'six dice show 1–6 pips ' + JSON.stringify(faces));
      await p.click('#pview [data-pmood="dopa"]'); await p.waitForTimeout(200);
      ok((await p.textContent('#pview .proll')).includes('도파민 주사위 굴리기') && await p.$$eval('#pview .proll .pdie i.on', e => e.length) === 4, 'the roll button follows the chosen die');
      await p.click('#pview [data-pmood="any"]'); await p.waitForTimeout(200);
      await p.click('#pview [data-proll]'); await p.waitForTimeout(250);
      ok(await vis(p, '#pview .pspin .cube'), 'rolling: a 3D die spins first');
      await p.waitForTimeout(1200);
      ok(await vis(p, '#pview .pcard') && await vis(p, '#pview .pcard .pic'), 'then a card with a category pictogram');
      const a = await p.textContent('#pview .pcard h3');
      await p.click('#pview [data-pnext]'); await p.waitForTimeout(1400);
      ok(a && (await p.textContent('#pview .pcard h3')) !== a, '다시 뽑기 draws another card');
      const n0 = await count();
      await p.click('#pview [data-pyes]'); await p.waitForTimeout(400);
      ok(await count() === n0 + 1 && await vis(p, '#pview .pboard'), '이 카드로 갈래요 adds it, back to the board');
      await p.evaluate(() => document.querySelector('.tabs [data-tab="tray"]').click()); await p.waitForTimeout(300);
      for (let i = 0; i < 6; i++) { await p.evaluate(() => document.querySelector('#cards [data-wish][aria-pressed="false"]')?.click()); await p.waitForTimeout(120) }   // some groups are folded
      await p.evaluate(() => document.querySelector('.tabs [data-tab="timeline"]').click()); await p.waitForTimeout(300);
      ok(await p.$$eval('#pview .pfan .mcard', e => e.length) >= 5, 'my cards: every ♥ place is a card (not only 3)');
      ok(await p.$eval('#pview .pfan', e => e.scrollWidth > e.clientWidth + 20), 'my cards: the row is wider than the screen, so it scrolls');
      const fan = await p.$eval('#pview .pfan', e => { e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } });
      await p.mouse.move(fan.x, fan.y); await p.mouse.down(); await p.mouse.move(fan.x - 80, fan.y, { steps: 6 }); await p.mouse.move(fan.x - 160, fan.y, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(250);
      ok(await p.$eval('#pview .pfan', e => e.scrollLeft) > 40, 'my cards: dragging with the mouse moves the row');
      ok((await p.getAttribute('#pview .pd.on', 'data-pmood')) === 'any', 'my cards: a drag is not a tap');
      await p.click('#pview .pfan .mcard >> nth=1'); await p.waitForTimeout(200);
      ok((await p.getAttribute('#pview .pd.on', 'data-pmood')) === 'mine', 'my cards: tapping a card picks the 내 카드 die');
      const md = (await p.textContent('[data-day="1"]')).match(/(\d+)\/(\d+)/);
      await p.clock.install({ time: new Date(new Date().getFullYear(), +md[1] - 1, +md[2], 14, 10) }); await p.reload(); await p.waitForTimeout(3400); await skipCoach(p);
      await p.click('[data-day="1"]'); await p.waitForTimeout(300);
      ok(await vis(p, '#pview .pboard') && !(await vis(p, '#pview .pclosed')) && await vis(p, '#pview .sq.start'), 'today: the board is open by itself, starting at the hotel');
      ok(await p.$$eval('#pview .sq.stamped .pstamp', e => e.length) >= 2 && await p.$$eval('#pview .sq.now', e => e.length) === 1, 'today: finished squares are stamped, the pawn stands on "now"');
      await p.click('[data-jp="J"]'); await p.waitForTimeout(300);
      ok(await vis(p, '#grid') && !(await vis(p, '#pview')), 'back to J: the hour grid');
      ok(p.errs.length === 0, 'no page errors ' + p.errs.join(' | '));
      await p.ctx.close();
    }
  },
  {
    name: 'AI: a busy server (529) or a broken reply is tried again; a wrong key is not; the message says why',
    async run({ b, S, device, ok, vis, skipCoach }) {
      const p = await device(b, S); let calls = 0, mode = 'busy2';
      await p.route(/api\.anthropic\.com/, r => {
        calls++;
        if (mode === 'busy2' && calls <= 2) return r.fulfill({ status: 529, body: '{"error":{"message":"Overloaded"}}' });
        if (mode === 'badjson' && calls === 1) return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ type: 'text', text: '{"sunrise": "06:3' }] }) });
        if (mode === 'key') return r.fulfill({ status: 401, body: '{}' });
        if (mode === 'busy') return r.fulfill({ status: 529, body: '{}' });
        r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ type: 'text', text: JSON.stringify({ sunrise: '06:30', sunset: '17:10', weather: '맑아요', notes: ['겉옷'], events: [] }) }] }) });
      });
      await p.click('[data-w="new"]'); await p.waitForTimeout(250);
      if (await p.$('#onbKey_anthropic')) { await p.fill('#onbKey_anthropic', 'sk-ant-test-key'); await p.click('#onbBody [data-onbkey="anthropic"]'); await p.waitForTimeout(300) }
      await p.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(p);
      const open = async () => { await p.click('.tabs [data-tab="more"]'); await p.click('#moreBox [data-tab="check"]'); await p.waitForTimeout(300) };
      const ask = async (m, wait) => { mode = m; calls = 0; await open(); await p.click('#seasonBtn'); await p.waitForTimeout(wait); await open() };
      await ask('busy2', 6000);
      ok((await p.textContent('#checks')).includes('겉옷') && calls === 3, 'busy twice, then it answers: tips arrive (' + calls + ' tries)');
      await ask('badjson', 4000);
      ok(calls === 2 && (await p.textContent('#checks')).includes('겉옷'), 'a cut-off reply is asked again once (' + calls + ' tries)');
      await ask('key', 2500);
      ok(calls === 1, 'a wrong key is not asked again (' + calls + ' tries)');
      mode = 'busy'; calls = 0; await open(); await p.click('#seasonBtn'); await p.waitForTimeout(9000);
      ok(calls === 3 && (await p.textContent('#st_season')).includes('바빠요'), 'still busy after 3 tries: says the server is busy (' + calls + ' tries) ' + await p.textContent('#st_season'));
      ok(p.errs.length === 0, 'no page errors ' + p.errs.join(' | '));
      await p.ctx.close();
    }
  },
  {
    name: 'React screen: 예약 내용 붙여 넣기 (empty → asks for text, AI fills the times, says so)',
    async run({ b, S, device, ok, vis, skipCoach }) {
      const say = (r, o) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ type: 'text', text: JSON.stringify(o) }] }) });
      const p = await device(b, S);
      await p.route(/api\.anthropic\.com/, r => (r.request().postData() || '').includes('round trip') ? say(r, { mode: 'flight', out: { dep: '09:10', arr: '11:05', flight: 'KE 723' }, back: { dep: '18:40', arr: '20:35', flight: 'KE 724' } }) : r.fulfill({ status: 503, body: '{}' }));
      await p.click('[data-w="new"]'); await p.waitForTimeout(250);
      if (await p.$('#onbKey_anthropic')) { await p.fill('#onbKey_anthropic', 'sk-ant-test-key'); await p.click('#onbBody [data-onbkey="anthropic"]'); await p.waitForTimeout(300) }
      await p.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(p);
      await p.click('.tabs [data-tab="more"]'); await p.click('#moreBox [data-tab="me"]'); await p.waitForTimeout(250);
      await p.click('[data-meopen="way"]'); await p.waitForTimeout(200);
      await p.click('#meBox [data-aifill="flight"]'); await p.waitForTimeout(200);
      ok((await p.textContent('#st_flight')).includes('붙여 넣은 내용이 없어요'), 'nothing pasted: says so');
      await p.fill('#paste_flight', 'KE723 09:10'); await p.click('#meBox [data-aifill="flight"]'); await p.waitForTimeout(1500);
      ok(await p.inputValue('#meBox [data-pf="out.dep"]') === '09:10' && await p.inputValue('#meBox [data-pf="out.flight"]') === 'KE 723' && (await p.textContent('#st_flight')).includes('채웠어요'), 'AI filled the times and says so');
      await p.evaluate(() => window.__jepi.sync()); await p.click('.tabs [data-tab="more"]'); await p.click('#moreBox [data-tab="me"]'); await p.waitForTimeout(300); await p.click('[data-meopen="way"]').catch(() => {}); await p.waitForTimeout(200);
      ok(!(await p.textContent('#st_flight')).includes('채웠어요'), 'the message is gone once the row is opened again');
      ok(p.errs.length === 0, 'no page errors ' + p.errs.join(' | '));
      await p.ctx.close();
    }
  },
  {
    name: 'React screen: 여행 꾸미기 · 직접 블록 만들기 (font previews use their font, typed titles survive a color tap, saving applies; a new block lands at its time)',
    async run({ b, S, device, ok, vis, skipCoach }) {
      const p = await device(b, S); await p.click('[data-w="new"]'); await p.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(p);
      await p.click('#lookBtn'); await p.waitForTimeout(300);
      ok(await p.$eval('#sheet [data-lk="hand:gaegu"] span', e => getComputedStyle(e).fontFamily.includes('Gaegu')), 'each font choice shows in its own font');
      await p.fill('#sheet [data-lkday="0"]', '첫날은 천천히'); await p.click('#sheet [data-lk^="color:"] >> nth=2'); await p.waitForTimeout(200);
      ok(await p.inputValue('#sheet [data-lkday="0"]') === '첫날은 천천히' && await p.getAttribute('#sheet [data-lk^="color:"] >> nth=2', 'aria-pressed') === 'true', 'a typed day title stays when a color is tapped');
      await p.click('#lookForm [type="submit"]'); await p.waitForTimeout(400);
      ok((await p.textContent('#dayTitle')).includes('첫날은 천천히'), 'saving applies the day title');
      await p.$eval('#grid .slot[data-t="1290"]', e => e.click()); await p.waitForTimeout(400);
      await p.click('#sheet [data-newcustom]'); await p.waitForTimeout(300);
      await p.fill('#cfName', '친구 카페'); await p.click('#customForm [type="submit"]'); await p.waitForTimeout(500);
      ok(await vis(p, '#grid .blk:has-text("친구 카페")') && (await p.getAttribute('#grid .blk:has-text("친구 카페")', 'title')).startsWith('21:30'), 'a hand-made block lands at the tapped time');
      ok(p.errs.length === 0, 'no page errors ' + p.errs.join(' | '));
      await p.ctx.close();
    }
  },
  {
    name: 'React screen: 여행 노트 · 여행 단계 띠 (a chapter per day with memos; during the trip: 지금 / 다음 / 안내 시작)',
    async run({ b, S, device, ok, vis, skipCoach }) {
      const p = await device(b, S); await p.click('[data-w="new"]'); await p.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(p);
      ok((await p.textContent('#phase')).includes('D-'), 'before the trip: D-day');
      await p.click('#grid .blk:not(.fixed) >> nth=0'); await p.waitForTimeout(300); await p.fill('#bmIn', '사진!'); await p.click('#bmSave'); await p.waitForTimeout(300);
      await p.click('.tabs [data-tab="more"]'); await p.waitForTimeout(200); await p.click('#nbOpen'); await p.waitForTimeout(400);
      const days = await p.$$eval('#days .day-btn', e => e.length);
      ok(await vis(p, '#notebook') && await p.$$eval('#notebook .nb-page', e => e.length) === days + 1 && (await p.textContent('#notebook')).includes('사진!'), '노트: cover + a chapter per day, the memo is there');
      await p.click('#nbClose'); await p.waitForTimeout(200);
      ok(!(await vis(p, '#notebook')), '닫기 closes it');
      const start = await p.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => k.endsWith('gp.profile')))).startDate);
      await p.clock.setFixedTime(new Date(start + 'T16:20:00'));
      await p.click('.tabs [data-tab="timeline"]'); await p.click('#days [data-day="0"]'); await p.waitForTimeout(300);
      ok((await p.textContent('#phase')).includes('지금') && (await p.textContent('#phase')).includes('다음') && await vis(p, '#phase a.small-btn'), 'during the trip: 지금 · 다음 · 안내 시작');
      ok(p.errs.length === 0, 'no page errors ' + p.errs.join(' | '));
      await p.ctx.close();
    }
  },
  {
    name: 'data: the trip in one place (JD.trip reads the live copy, tells listeners, keeps the old storage names)',
    async run({ b, S, device, ok, vis, skipCoach }) {
      const p = await device(b, S); await p.click('[data-w="new"]'); await p.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(p);
      await p.evaluate(() => { window.__heard = []; window.JEPI_DATA.trip.on(part => window.__heard.push(part)) });
      const n0 = await p.evaluate(() => window.JEPI_DATA.trip.get('placed').length);
      ok(n0 > 3 && await p.evaluate(() => window.JEPI_DATA.trip.get('profile').dest) !== undefined, 'get(): blocks and trip facts');
      await p.click('#grid .blk:not(.fixed) >> nth=1'); await p.waitForTimeout(300); await p.click('#sheet [data-del="1"]'); await p.waitForTimeout(400);
      const after = await p.evaluate(() => ({ live: window.JEPI_DATA.trip.get('placed').length, saved: JSON.parse(localStorage.getItem('gp.placed3')).length, heard: window.__heard }));
      ok(after.live === n0 - 1 && after.saved === n0 - 1 && after.heard.includes('placed'), 'removing a block: live copy, saved copy (gp.placed3) and listeners agree ' + JSON.stringify(after.heard.slice(0, 6)));
      ok(await p.evaluate(() => JSON.parse(localStorage.getItem('gp.placed3')).every(x => !('uid' in x))), 'blocks are saved without uids, as before');
      await p.click('.tabs [data-tab="tray"]'); await p.click('#cards details[open] [data-wish] >> nth=0'); await p.waitForTimeout(200);
      ok(await p.evaluate(() => window.__heard.includes('wish') && window.JEPI_DATA.trip.get('wish').length === JSON.parse(localStorage.getItem('gp.wish')).length), '♥: saved as gp.wish, listeners told');
      await p.click('#planBtn'); await p.waitForTimeout(200); await p.click('#planMenu [data-pmact="new"]'); await p.waitForTimeout(500);
      ok(await p.evaluate(() => { const cur = localStorage.getItem('gp.cur'); return JSON.parse(cur) === window.__jepi.state().cur && window.JEPI_DATA.trip.plans.current() === cur.replace(/"/g, '') && window.__heard.includes('plans') }), '새 계획: the open plan is saved (gp.cur) and listeners told (it joins the list once it is first saved, as before)');
      ok(p.errs.length === 0, 'no page errors ' + p.errs.join(' | '));
      await p.ctx.close();
    }
  },
  {
    name: 'data: 친구와 함께 merge rules (app/data/merge.ts) case by case',
    async run({ b, S, device, ok }) {
      const p = await device(b, S);
      const r = await p.evaluate(() => {
        const M = window.JEPI_DATA.merge, B = (id, day, start) => ({ id, day, start, dur: 60 });
        const base = { profile: { dest: '오사카', pace: 'slow', nights: 3 }, pack: { city: '오사카', places: [{ id: 'a', name: 'A' }] }, placed: [B('x', 0, 600), B('y', 1, 600), B('z', 1, 900)], custom: [], fmarks: {}, meals: { 0: 1000 }, done: {}, wish: ['a'] };
        const c = o => JSON.parse(JSON.stringify(o));
        const mine = c(base), theirs = c(base);
        mine.placed[0].start = 660;                 // I move day-1 x
        theirs.placed[1].start = 720;               // they move day-2 y
        mine.profile.pace = 'full'; theirs.profile.nights = 4;   // different fields
        theirs.pack.places.push({ id: 'b', name: 'B' });         // they add a place
        theirs.placed = theirs.placed.filter(x => x.id !== 'z'); // they remove z
        mine.wish = ['a', 'b']; theirs.wish = [];                 // ♥ is mine
        mine.meals[0] = 1200; theirs.meals[0] = 800;             // both change the same day's 간식비 → mine
        const m = M.mergePlan(base, mine, theirs), at = id => (m.placed.find(x => x.id === id) || {}).start;
        const stamp = { pack: { places: [{ id: 'a' }, { id: 'n' }] }, custom: [{ id: 'c1' }] }; M.stampMine(stamp, new Set(['a']), '민지');
        return { x: at('x'), y: at('y'), z: at('z'), pace: m.profile.pace, nights: m.profile.nights, places: m.pack.places.map(x => x.id).sort().join(), wish: m.wish.join(), meal: m.meals[0],
          stamp: [stamp.pack.places[0].by || '', stamp.pack.places[1].by, stamp.custom[0].by].join('|') };
      });
      ok(r.x === 660 && r.y === 720, 'my day-1 move and their day-2 move both survive');
      ok(r.z === undefined, 'a block they removed (I did not touch it) is removed');
      ok(r.pace === 'full' && r.nights === 4, 'trip facts merge field by field');
      ok(r.places === 'a,b', 'a place they added is kept');
      ok(r.wish === 'a,b', '♥ stays mine');
      ok(r.meal === 1200, 'the same thing changed by both: mine (the newest here) wins');
      ok(r.stamp === '|민지|민지', 'new places / hand-made places carry my name, known ones do not');
    }
  },
  {
    name: 'logic: time text, travel guesses, the day check rules and free gaps (app/logic) case by case',
    async run({ b, S, device, ok }) {
      const p = await device(b, S);
      const r = await p.evaluate(() => {
        const { time, geo, schedule } = window.JEPI_DATA.logic;
        const A = [34.6687, 135.5013], near = [34.6730, 135.5013], far = [34.6873, 135.5262];   // near ≈ 500 m, far ≈ 3 km
        const ctx = (o = {}) => Object.assign({ firstDay: false, start: { ll: A, name: '숙소' }, dayStart: 420, wdName: '월', iso: '2026-11-30', kidsInParty: false, currency: 'JPY',
          marksOf: () => [], hasMark: () => false, markWarnings: () => [], closed: () => false, outOfSeason: () => null, tips: () => [], hours: () => null,
          travel: (a, b) => geo.travelGuess(a, b, { car: false, transitName: '전철', walkKm: 1.3, gateway: null }), fare: () => 0, nav: () => '#', fmt: time.fmt }, o);
        const it = (uid, start, end, ll, extra = {}) => Object.assign({ kind: 'place', uid, name: uid, start, end, ll, p: { cat: 'art' }, warns: [], tips: [], marks: [] }, extra);
        const out = {};
        out.time = [time.fmt(570), time.fmt(-5), time.fmt(2000), time.parse('9:05'), time.parse('x'), time.durTxt(90), time.durTxt(45), time.durTxt(120)].join('|');
        out.guess = [geo.travelGuess(A, A, ctx().travel === 0 ? {} : { car: false, transitName: '전철', walkKm: 1.3, gateway: null }), geo.travelGuess(A, near, { car: false, transitName: '전철', walkKm: 1.3, gateway: null }), geo.travelGuess(A, far, { car: false, transitName: '전철', walkKm: 1.3, gateway: null })].map(x => x ? x.mode + x.min : 'none').join('|');
        let d = [it('a', 600, 700, A), it('b', 680, 760, near)]; schedule.checkDay(d, ctx()); out.overlap = d[1].warns.join();
        d = [it('a', 600, 700, A), it('b', 705, 760, far)]; schedule.checkDay(d, ctx()); out.short = d[1].warns.join();
        d = [it('a', 600, 700, A)]; schedule.checkDay(d, ctx({ closed: () => true, hours: () => [660, 1080] })); out.closed = d[0].warns.join();
        d = [it('arr', 600, 620, A, { kind: 'fixed', bagStart: true }), it('m', 700, 760, near), it('w', 800, 860, near, { p: { cat: 'walk' } }), it('in', 900, 930, near, { kind: 'fixed', drop: true }), it('m2', 960, 1000, near)];
        schedule.checkDay(d, ctx()); out.bag = [d[1].warns.length, d[2].warns.length, d[4].warns.length].join();
        d = [it('a', 600, 700, A), it('b', 800, 900, [34.75, 135.6])]; schedule.checkDay(d, ctx({ kidsInParty: true })); out.kids = d[1].warns.some(w => w.includes('아이와'));
        d = [it('a', 600, 700, near)]; const legs = schedule.checkDay(d, ctx()); out.firstLeg = legs.length + ':' + (d[0].travelIn ? 'in' : '-');
        d = [it('a', 600, 700, A)]; out.firstDay = schedule.checkDay(d, ctx({ firstDay: true })).length;
        out.gaps = JSON.stringify(schedule.gaps([{ start: 600, end: 700 }, { start: 720, end: 800 }, { start: 1000, end: 1100 }], 480));
        return out;
      });
      ok(r.time === '09:30|00:00|24:00|545||1시간 30분|45분|2시간', 'time text ' + r.time);
      ok(/^none\|도보\d+\|전철\d+$/.test(r.guess), 'travel guess: right next to it · walk · transit ' + r.guess);
      ok(r.overlap.includes('시간이 겹쳐요'), 'two blocks at the same time: overlap warning');
      ok(r.short.includes('분이 필요한데'), 'not enough time to get there: warning');
      ok(r.closed.includes('월요일 휴관') && r.closed.includes('영업시간 11:00–18:00 밖'), 'closed that weekday · outside opening hours');
      ok(r.bag === '1,0,0', 'suitcase: a museum with it warns, a walk does not, after the check-in it is gone ' + r.bag);
      ok(r.kids === true, 'a long ride with children: warning');
      ok(r.firstLeg === '1:in' && r.firstDay === 0, 'travel from the stay to the first block (not on Day 1)');
      ok(r.gaps === '[[480,600],[800,1000],[1100,1380]]', 'free gaps of 90 min or more until 23:00 ' + r.gaps);
    }
  },
  {
    name: 'the floating 🎲 button keeps its small die (the P board big die uses the same class names)',
    async run({ b, S, device, ok, skipCoach }) {
      const p = await device(b, S); await p.click('[data-w="new"]'); await p.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(p);
      const size = await p.evaluate(() => { const f = document.getElementById('diceFab').getBoundingClientRect(); const fr = document.querySelector('#diceFab .cf.front').getBoundingClientRect(); return { fab: Math.round(f.width), face: Math.round(fr.width) } });
      ok(size.face <= 36 && size.face < size.fab, 'the die inside the button stays inside it ' + JSON.stringify(size));
    }
  },
  {
    name: 'the floating 🎲: on every tab in J and P, the same size; in P it steps aside only while the board dice is on screen',
    async run({ b, S, device, ok, skipCoach }) {
      const p = await device(b, S); await p.click('[data-w="new"]'); await p.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(p);
      const fab = async () => { await p.waitForTimeout(450); return p.evaluate(() => { const f = document.getElementById('diceFab'), c = getComputedStyle(f); return { on: c.display !== 'none' && c.opacity !== '0', w: Math.round(f.getBoundingClientRect().width) } }) };
      const seen = [];
      for (const tb of ['timeline', 'tray', 'map', 'more']) { await p.click(`.tabs [data-tab="${tb}"]`); seen.push((await fab()).on) }
      ok(seen.every(Boolean), 'J: on every tab ' + seen);
      const wJ = (await fab()).w;
      await p.click('.tabs [data-tab="timeline"]'); await p.click('[data-jp="P"]'); await p.waitForTimeout(400); await skipCoach(p).catch(() => {});
      const fP = await fab();
      ok(fP.on && fP.w === wJ, 'P: shown, the same size as in J (' + fP.w + ' / ' + wJ + ')');
      const start = await p.evaluate(() => JSON.parse(localStorage.getItem('gp.profile')).startDate);
      await p.clock.setFixedTime(new Date(start + 'T13:00:00')); await p.click('#days [data-day="0"]'); await p.waitForTimeout(500); await p.evaluate(() => window.scrollTo(0, 0));
      ok((await fab()).on, 'P board day, top of the page (the board dice is further down): shown');
      await p.evaluate(() => { const e = document.querySelector('#pview .proll'); if (e) window.scrollTo(0, e.getBoundingClientRect().top + scrollY - 200) });
      ok(!(await fab()).on, 'the board roll button on screen: the floating 🎲 steps aside');
      await p.click('.tabs [data-tab="tray"]');
      ok((await fab()).on, 'another tab: back again');
      ok(p.errs.length === 0, 'no page errors ' + p.errs.join(' | '));
      await p.ctx.close();
    }
  },
  {
    name: 'React handles its own buttons: 손글씨 메모 (typed text survives a sheet redraw, Enter saves) · 날짜 제목 (cancel, back to automatic)',
    async run({ b, S, device, ok, vis, skipCoach }) {
      const p = await device(b, S); await p.click('[data-w="new"]'); await p.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(p);
      const memoOf = () => p.evaluate(() => JSON.parse(localStorage.getItem('gp.profile')).memo || {});
      await p.click('#grid .blk:not(.fixed) >> nth=1'); await p.waitForTimeout(300);
      await p.fill('#bmIn', '사진 찍기'); await p.click('#sheet [data-mv="30"]'); await p.waitForTimeout(300);
      ok(await p.inputValue('#bmIn') === '사진 찍기', 'typed memo is still there after the sheet redraws (30분 뒤로)');
      await p.press('#bmIn', 'Enter'); await p.waitForTimeout(400);
      ok(!(await vis(p, '#sheetBg')) && Object.values((await memoOf()).b || {}).includes('사진 찍기') && (await p.textContent('#grid')).includes('사진 찍기'), 'Enter saves: the sheet closes, the block shows it, it is saved');
      const t0 = await p.textContent('#dayTitle');
      await p.click('#dayTitleEdit'); await p.waitForTimeout(200);
      ok(await vis(p, '#dayTitleForm') && !(await vis(p, '#dayTitle')) && await p.evaluate(() => document.activeElement && document.activeElement.id === 'dayTitleIn'), '✎ opens the form in place of the title, the box is ready to type');
      await p.fill('#dayTitleIn', '바꿀까 말까'); await p.click('#dayTitleCancel'); await p.waitForTimeout(300);
      ok(!(await vis(p, '#dayTitleForm')) && await vis(p, '#dayTitle') && (await p.textContent('#dayTitle')) === t0, '취소: the title comes back unchanged');
      await p.click('#dayTitleEdit'); await p.fill('#dayTitleIn', '첫날은 천천히'); await p.click('#dayTitleForm [type=submit]'); await p.waitForTimeout(400);
      ok((await p.textContent('#dayTitle')) === '첫날은 천천히' && (await p.textContent('#toast').catch(() => '')).includes('바꿨어요'), '저장: the new title, 제목을 바꿨어요');
      await p.click('#dayTitleEdit'); await p.fill('#dayTitleIn', ''); await p.click('#dayTitleForm [type=submit]'); await p.waitForTimeout(400);
      ok((await p.textContent('#dayTitle')) === t0 && (await p.textContent('#toast').catch(() => '')).includes('자동 제목'), 'empty: back to the automatic title, and it says so');
      ok(p.errs.length === 0, 'no page errors ' + p.errs.join(' | '));
      await p.ctx.close();
    }
  },
  {
    name: 'logic: 알림 reminders (app/logic/alerts.ts) — time zones, 출발할 때 / 시작할 때, morning summary',
    async run({ b, S, device, ok }) {
      const p = await device(b, S);
      const r = await p.evaluate(() => {
        const A = window.JEPI_DATA.logic.alerts, fmt = window.JEPI_DATA.logic.time.fmt;
        const t = A.localToUtc('2027-01-10', 600, 'Asia/Tokyo');           // 10:00 in Tokyo = 01:00 UTC
        const tz = [new Date(t).toISOString(), A.tripTZ({ country: '일본' }), A.tripTZ({ tz: 'Europe/Paris', country: '일본' }), A.tripTZ({ currency: 'KRW' })].join('|');
        const rows = [{ key: 'a@0', name: '미술관', start: 600, end: 700, locName: '우에노' }, { key: 'b@0', name: '카페', start: 780, end: 840, travelIn: { min: 20, mode: '전철', fromName: '미술관' } }];
        const s = { on: true, all: true, lead: 10, depart: true, morning: true };
        const now = Date.UTC(2027, 0, 1);
        const L = A.alertList('p1', [{ iso: '2027-01-10', rows }], s, () => true, 'Asia/Tokyo', fmt, now);
        const only = A.alertList('p1', [{ iso: '2027-01-10', rows }], Object.assign({}, s, { morning: false }), k => k === 'b@0', 'Asia/Tokyo', fmt, now);
        const atStart = A.alertList('p1', [{ iso: '2027-01-10', rows }], Object.assign({}, s, { depart: false, morning: false }), () => true, 'Asia/Tokyo', fmt, now);
        const past = A.alertList('p1', [{ iso: '2027-01-10', rows }], s, () => true, 'Asia/Tokyo', fmt, Date.UTC(2027, 0, 11));
        const hm = x => new Date(x.t + 9 * 3600000).toISOString().slice(11, 16);   // back to Tokyo time
        return { tz, n: L.length, morning: L[0].title + ' ' + hm(L[0]) + ' ' + L[0].body, depart: L[2].title + ' ' + hm(L[2]), start: hm(atStart[1]) + ' ' + atStart[1].title, only: only.map(x => x.id).join(), past: past.length };
      });
      ok(r.tz === '2027-01-10T01:00:00.000Z|Asia/Tokyo|Europe/Paris|Asia/Seoul', 'Tokyo 10:00 → 01:00 UTC, the trip time zone by country / its own / Korea ' + r.tz);
      ok(r.n === 3 && r.morning === '☀️ 오늘 일정 · Day 1 08:00 10:00 미술관 → 13:00 카페', 'morning summary at 08:00 with the first blocks ' + r.morning);
      ok(r.depart === '🚶 10분 뒤 출발 · 카페 12:30', '출발할 때: start minus the ride minus 10 min ' + r.depart);
      ok(r.start === '12:50 ⏰ 10분 뒤 · 카페', '시작할 때: 10 min before the start ' + r.start);
      ok(r.only === 'p1:b@0', 'only the blocks that are on');
      ok(r.past === 0, 'nothing that is already past');
    }
  },
  {
    name: 'logic: 영업시간 from Google (app/logic/hours.ts) and same-place rules (app/logic/places.ts)',
    async run({ b, S, device, ok }) {
      const p = await device(b, S);
      const r = await p.evaluate(() => {
        const { hours, places } = window.JEPI_DATA.logic;
        const P = (d, oh, om, ch, cm, cd) => ({ open: { day: d, hour: oh, minute: om }, close: { day: cd ?? d, hour: ch, minute: cm } });
        const week = hours.fromGoogle({ periods: [1, 2, 3, 4, 5].map(d => P(d, 10, 0, 18, 0)).concat([P(6, 10, 0, 20, 30)]) });   // closed Sunday, Saturday later
        const late = hours.fromGoogle({ periods: [P(5, 18, 0, 2, 0, 6)] });   // Friday 18:00 → Saturday 02:00
        const always = hours.fromGoogle({ periods: [{ open: { day: 0, hour: 0 } }] });
        const pl = { verify: '영업시간', hours: [600, 1200] }; hours.apply(pl, week);
        const A = { id: 'a', name: '이치란 라멘 도톤보리점', ll: [34.6687, 135.5013] };
        return { week: JSON.stringify(week), late: JSON.stringify(late.hours), always: !!always.always, applied: pl.hsrc + '|' + (pl.verify === undefined) + '|' + pl.closed.join(),
          sim: [places.nameSim('이치란 라멘', '이치란라멘 도톤보리점'), places.nameSim('ABC', 'xyz')].map(x => x.toFixed(1)).join(),
          same: [places.samePlace(A, { id: 'b', name: '이치란 라멘', ll: [34.6688, 135.5014] }), places.samePlace(A, { id: 'c', name: '이치란 라멘', ll: [34.70, 135.50] }), places.samePlace(A, { id: 'd', name: '이치란 라멘', custom: true })].join() };
      });
      ok(r.week === '{"hours":[600,1080],"hoursBy":{"6":[600,1230]},"closed":[0]}', 'weekdays 10–18, Saturday till 20:30, closed Sunday ' + r.week);
      ok(r.late === '[1080,1440]', 'open past midnight counts to the end of the day');
      ok(r.always === true, 'open all the time');
      ok(r.applied === 'google|true|0', 'applied: marked as checked by Google, the "확인 필요" goes away');
      ok(r.sim === '0.9,0.0', 'name likeness: one name inside the other · nothing alike');
      ok(r.same === 'true,false,true', 'same place: next door with the name · far away is not · hand-made judged by name');
    }
  },
  {
    name: 'React handles its own buttons: 내 장소 address search (pretend Kakao) → pick → saved and shown',
    async run({ b, S, device, ok, vis, skipCoach, openSettings }) {
      const p = await device(b, S);
      await p.route(/dapi\.kakao\.com/, r => { const u = r.request().url();
        if (u.includes('address.json')) return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ documents: [{ address_name: '경기 성남시 분당구 판교역로 235', road_address: { address_name: '판교역로 235' }, y: '37.4021', x: '127.1086' }] }) });
        r.fulfill({ status: 200, contentType: 'application/json', body: '{"documents":[]}' }) });
      await p.click('[data-w="new"]'); await p.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(p);
      await p.evaluate(() => { const k = JSON.parse(localStorage.getItem('jepi.keys') || '{}'); k.kakao = '0123456789abcdef0123456789abcdef'; localStorage.setItem('jepi.keys', JSON.stringify(k)) });
      await p.reload(); await p.waitForTimeout(1200); await skipCoach(p).catch(() => {});
      await openSettings(p); await p.click('[data-mypedit="work"]'); await p.waitForTimeout(200);
      await p.fill('#mypQ', '판교역로 235'); await p.press('#mypQ', 'Enter'); await p.waitForTimeout(500);
      ok(await p.$$eval('[data-myppick]', e => e.length) === 1 && (await p.textContent('.kmsg')).includes('맞는 곳을 눌러'), 'Enter searches: one result to pick');
      await p.click('[data-myppick]'); await p.waitForTimeout(300);
      const saved = await p.evaluate(() => (JSON.parse(localStorage.getItem('jepi.myplaces')) || []).find(x => x.id === 'work'));
      ok(saved && saved.addr === '판교역로 235' && saved.ll[0] === 37.4021 && (await p.textContent('.kmsg')).includes('저장했어요'), 'picking saves 회사 with the address');
      await p.click('#mypDone'); await p.waitForTimeout(200);
      ok((await p.textContent('#settingsBox, #side-settings').catch(() => '')).includes('판교역로 235'), 'the list shows the address');
      ok(p.errs.length === 0, 'no page errors ' + p.errs.join(' | '));
      await p.ctx.close();
    }
  },
  {
    name: 'routes abroad (app/data/routes.ts): pretend Google answers → real times with line names replace the ≈ guess, saved on the device',
    async run({ b, S, device, ok, skipCoach }) {
      const p = await device(b, S); let asked = 0;
      await p.route(/routes\.googleapis\.com/, r => { asked++; r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ routes: [{ duration: '780s', distanceMeters: 4200,
        polyline: { encodedPolyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@' }, legs: [{ steps: [{ transitDetails: { transitLine: { nameShort: '미도스지선', vehicle: { type: 'SUBWAY' } } } }] }], travelAdvisory: { transitFare: { currencyCode: 'JPY', units: '240' } } }] }) }) });
      await p.click('[data-w="new"]'); await p.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(p);
      ok((await p.textContent('#grid')).includes('≈'), 'before routes arrive: the ≈ guess');
      await p.evaluate(() => { const k = JSON.parse(localStorage.getItem('jepi.keys') || '{}'); k.gmaps = 'AIzaTestKey'; localStorage.setItem('jepi.keys', JSON.stringify(k)) });
      await p.reload(); await p.waitForTimeout(4000); await skipCoach(p).catch(() => {});
      const chips = await p.$$eval('#grid .trn .chip', e => e.map(x => x.textContent));
      ok(asked > 0 && chips.some(t => t.includes('지하철 13분') && t.includes('미도스지선') && !t.startsWith('≈')), 'real time, line name, no ≈ (' + asked + ' asked) ' + chips.slice(0, 3).join(' / '));
      ok(await p.evaluate(() => Object.values(JSON.parse(localStorage.getItem('jepi.routes') || '{}')).some(v => v.src === 'google' && v.poly && v.poly.length === 3)), 'saved on the device with the route line');
      ok(p.errs.length === 0, 'no page errors ' + p.errs.join(' | '));
      await p.ctx.close();
    }
  },
  {
    name: 'React handles its own buttons: 여행 꾸미기 AI로 지어 보기 (pretend AI) and 내 사진 (made small), saved together',
    async run({ b, S, device, ok, vis, skipCoach }) {
      const p = await device(b, S);
      await p.route(/api\.anthropic\.com/, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ type: 'text', text: JSON.stringify({ titles: ['네온 아래 첫 저녁', '성과 시장 사이', '바다 쪽으로', '안녕, 오사카'] }) }] }) }));
      await p.click('[data-w="new"]'); await p.waitForTimeout(250);
      if (await p.$('#onbKey_anthropic')) { await p.fill('#onbKey_anthropic', 'sk-ant-test-key'); await p.click('#onbBody [data-onbkey="anthropic"]'); await p.waitForTimeout(300) }
      await p.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(p);
      await p.click('#lookBtn'); await p.waitForTimeout(300);
      await p.fill('#lkName', '우리 오사카'); await p.click('#lkAi'); await p.waitForTimeout(1500);
      ok(await p.inputValue('#sheet [data-lkday="0"]') === '네온 아래 첫 저녁' && (await p.textContent('#lkSt')).includes('고쳐 쓰면') && await p.inputValue('#lkName') === '우리 오사카', 'AI titles fill the day boxes, the typed trip name stays');
      // a 1×1 PNG as "my photo"
      const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
      await p.setInputFiles('#lkPhoto', { name: 'me.png', mimeType: 'image/png', buffer: png }); await p.waitForTimeout(600);
      ok(await p.getAttribute('#sheet .lk-photo', 'aria-pressed') === 'true', '내 사진 is chosen as the cover');
      await p.click('#lookForm [type="submit"]'); await p.waitForTimeout(400);
      const pr = await p.evaluate(() => JSON.parse(localStorage.getItem('gp.profile')));
      ok(pr.look.cover === 'photo' && /^data:image\/jpeg/.test(pr.look.photo) && pr.dayTitles[0] === '네온 아래 첫 저녁' && (await p.textContent('#dayTitle')) === '네온 아래 첫 저녁', 'saved: photo cover (as a small JPEG) and the day titles');
      ok((await p.textContent('#planName')).includes('우리 오사카'), 'the trip got its new name');
      ok(p.errs.length === 0, 'no page errors ' + p.errs.join(' | '));
      await p.ctx.close();
    }
  },
  {
    name: 'friends: sharing again after a share that stopped half-way (trip on the server, no membership)',
    async run({ b, S, device, ok, vis, skipCoach, openSettings }) {
      const p = await device(b, S); await p.click('[data-w="new"]'); await p.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(p);
      await openSettings(p); await p.click('[data-sbmode="join"]'); await p.fill('#sbEmail', 'half@x.com'); await p.fill('#sbPw', 'pass123'); await p.fill('#sbPw2', 'pass123'); await p.click('#sbGo'); await p.waitForTimeout(1800);
      const id = await p.evaluate(() => window.__jepi.state().cur);
      S.trips.push({ id, owner: 'U_half@x.com', name: '옛 시도', data: { old: true }, rev: 1, updated: 1 });   // what the earlier try left behind
      await p.click('.tabs [data-tab="more"]'); await p.click('#moreBox [data-tab="friends"]'); await p.waitForTimeout(200);
      await p.click('[data-trip="share"]'); await p.waitForTimeout(1200);
      ok(!(await p.textContent('#friendsBox')).includes('duplicate'), 'no "duplicate key" error');
      ok(await vis(p, '#friendsBox [data-trip="stop"]') && /\?join=/.test(await p.inputValue('#friendsBox .share-text')), 'shared: invite link and 공유 끝내기');
      const t = S.trips.find(x => x.id === id);
      ok(S.members.some(m => m.trip_id === id && m.user_id === 'U_half@x.com' && m.role === 'owner'), 'I am the owner member on the server');
      ok(t && !t.data.old && t.rev === 2, 'the server holds today\'s plan, not the old try');
      ok(p.errs.length === 0, 'no page errors ' + p.errs.join(' | '));
      await p.ctx.close();
    }
  },
  {
    name: 'Korea: no Kakao route requests, 안내 시작 opens Kakao Map from → to, key check uses place search',
    async run({ b, S, device, ok, skipCoach, openSettings }) {
      const p = await device(b, S, { ls: { 'jepi.keys': { kakao: '0123456789abcdef0123456789abcdef' } } });
      let routing = 0, search = 0;
      await p.route(/dapi\.kakao\.com\/v2\/routing/, r => { routing++; r.abort() });
      await p.route(/dapi\.kakao\.com\/v2\/local\/search/, r => { search++; r.fulfill({ status: 200, contentType: 'application/json', body: '{"documents":[{"place_name":"서울역"}],"meta":{}}' }) });
      await p.click('[data-w="new"]'); await p.evaluate(() => window.__jepi.demoLikeTrip()); await skipCoach(p);
      const seoul = [37.5547, 126.9707], busan = [35.1151, 129.0415];
      ok(await p.evaluate(([a, c]) => window.__jepi.routeProvider(a, c), [seoul, busan]) === null, 'in Korea no route provider: estimate only');
      const link = await p.evaluate(([a, c]) => window.__jepi.navLink(a, c, '도보', '부산역'), [seoul, busan]);
      ok(link.startsWith('https://map.kakao.com/link/from/') && link.includes(',37.5547,126.9707/to/') && link.includes(encodeURIComponent('부산역') + ',35.1151,129.0415'), '안내 시작: Kakao Map with start and destination');
      await openSettings(p); await p.click('[data-keytest="kakao"]'); await p.waitForTimeout(400);
      ok((await p.textContent('#setBox')).includes('✓ 장소·주소 검색 연결됨') && search === 1, '확인 tests place search and says so');
      ok(routing === 0, 'no requests to the Kakao route address');
      ok(p.errs.length === 0, 'no page errors ' + p.errs.join(' | '));
      await p.ctx.close();
    }
  },
  {
    name: 'press feedback: buttons react while held down',
    async run({ b, S, device, ok }) {
      const p = await device(b, S);
      const btn = await p.$('#welcome [data-w="new"]'); const r = await btn.boundingBox();
      const before = await btn.evaluate(e => getComputedStyle(e).filter);
      await p.mouse.move(r.x + r.width / 2, r.y + r.height / 2); await p.mouse.down(); await p.waitForTimeout(50);
      const held = await btn.evaluate(e => ({ f: getComputedStyle(e).filter, s: getComputedStyle(e).scale }));
      await p.mouse.move(0, 0); await p.mouse.up();
      ok(before === 'none' && held.f.includes('brightness') && held.s !== 'none', 'held button gets darker and smaller ' + JSON.stringify(held));
      ok(await p.evaluate(() => getComputedStyle(document.documentElement).webkitTapHighlightColor === 'rgba(0, 0, 0, 0)'), 'browser blue tap flash is off');
      ok(p.errs.length === 0, 'no page errors ' + p.errs.join(' | '));
      await p.ctx.close();
    }
  }
];

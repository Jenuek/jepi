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
  }
];

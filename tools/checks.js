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
      await p.waitForTimeout(5000);
      const done = { btn: await p.textContent('#genPack'), st: await p.textContent('#st_pack'), cls: await p.getAttribute('#st_pack', 'class') };
      ok(done.btn === 'AI로 여행지 준비하기' && !done.cls.includes('busy') && !done.st.includes('초 지났어요') && done.st.length > 0, 'after it fails: button back, a message instead ' + JSON.stringify(done));
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
  }
];

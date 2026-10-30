#!/usr/bin/env node
// JEPI smoke check — run after every change, before uploading:
//   python3 tools/build.py && node tools/check.js
// Needs: npm i playwright (and optionally leaflet, for the map step).
// Every outside service (AI, routes, Supabase, Google Places) is replaced by a fake,
// so the check is free, offline and repeatable. It fails (exit 1) on any page error.
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const DIST = path.join(__dirname, '..');
const PORT = 8790, BASE = `http://localhost:${PORT}/`;
let failed = 0;
const ok = (cond, label) => { console.log((cond ? '  ✓ ' : '  ✗ ') + label); if (!cond) failed++; };

function serve() {
  const types = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
  return http.createServer((q, r) => {
    const f = path.join(DIST, decodeURIComponent(q.url.split('?')[0]).replace(/\/$/, '/index.html'));
    fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); return } r.writeHead(200, { 'content-type': types[path.extname(f)] || 'text/plain' }); r.end(b) });
  }).listen(PORT);
}

// one fake Supabase shared by every "device"
function fakeServer() {
  const S = { users: {}, rows: [], trips: [], members: [], marks: [], invites: [], alerts: [], subs: [], log: [] };
  S.handler = async r => {
    const u = new URL(r.request().url()), m = r.request().method();
    let body = null; try { body = r.request().postData() ? JSON.parse(r.request().postData()) : null } catch (_) { }
    S.log.push(m + ' ' + u.pathname);
    const J = (s, o) => r.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(o) });
    const auth = (r.request().headers()['authorization'] || '').replace('Bearer ', '');
    const me = auth.startsWith('AT_') ? 'U_' + auth.slice(3) : null;
    const sess = e => ({ access_token: 'AT_' + e, refresh_token: 'RT_' + e, expires_in: 3600, user: { id: 'U_' + e, email: e } });
    if (u.pathname === '/auth/v1/signup') { if (S.users[body.email]) return J(422, { msg: 'User already registered' }); S.users[body.email] = body.password; return J(200, sess(body.email)) }
    if (u.pathname === '/auth/v1/token') {
      if (u.searchParams.get('grant_type') === 'refresh_token') return J(200, sess(String(body.refresh_token).slice(3)));
      return S.users[body.email] === body.password ? J(200, sess(body.email)) : J(400, { msg: 'Invalid login credentials' })
    }
    if (u.pathname === '/auth/v1/recover') return J(200, {});
    if (u.pathname === '/auth/v1/user') return J(200, { id: me, email: me && me.slice(2) });
    const tbl = u.pathname.replace('/rest/v1/', '');
    // tiny PostgREST: eq. / in.() / is.null / lte. / gte. filters, rules like the real RLS
    const filt = x => [...u.searchParams].every(([k, v]) => {
      if (['select', 'order', 'on_conflict', 'limit'].includes(k)) return true;
      const val = x[k] == null ? null : String(x[k]);
      if (v.startsWith('eq.')) return val === decodeURIComponent(v.slice(3));
      if (v.startsWith('in.(')) return v.slice(4, -1).split(',').map(decodeURIComponent).includes(val);
      if (v === 'is.null') return val === null;
      if (v.startsWith('gt.')) return +x[k] > +v.slice(3);
      return true });
    const role = t => (S.members.find(x => x.trip_id === t && x.user_id === me) || {}).role;
    const T = { jepi_docs: ['rows', x => x.user_id === me], jepi_alerts: ['alerts', x => x.user_id === me], jepi_push: ['subs', x => x.user_id === me],
      jepi_trips: ['trips', x => !!role(x.id)], jepi_trip_members: ['members', x => !!role(x.trip_id)], jepi_trip_marks: ['marks', x => !!role(x.trip_id)], jepi_trip_invites: ['invites', () => false] }[tbl];
    if (T) {
      const [key, can] = T; S[key] = S[key] || [];
      const pk = x => key === 'trips' ? x.id : key === 'members' ? x.trip_id + '/' + x.user_id : key === 'marks' ? x.trip_id + '/' + x.place_id + '/' + x.user_id : key === 'invites' ? x.code : x.user_id + '/' + x.id;
      if (m === 'GET') return J(200, S[key].filter(x => can(x) && filt(x)));
      if (m === 'POST') {
        for (const x of [].concat(body)) {
          if (['rows', 'alerts', 'subs', 'marks'].includes(key)) x.user_id = x.user_id || me;
          if (key === 'trips' && x.owner !== me) return J(403, { message: 'rls' });
          if (key === 'members' && !(x.user_id === me && x.role === 'owner')) return J(403, { message: 'rls' });
          if (key === 'invites' && !['owner', 'edit'].includes(role(x.trip_id))) return J(403, { message: 'rls' });
          S[key] = S[key].filter(y => pk(y) !== pk(x)); S[key].push(x)
        }
        return J(201, [])
      }
      if (m === 'PATCH') {
        const hit = S[key].filter(x => can(x) && filt(x) && (key !== 'trips' || ['owner', 'edit'].includes(role(x.id))));
        hit.forEach(x => Object.assign(x, body)); return J(200, hit)
      }
      if (m === 'DELETE') { const before = S[key].length; S[key] = S[key].filter(x => !(filt(x) && (can(x) || key === 'rows' || key === 'alerts'))); if (key === 'trips') S.members = S.members.filter(x => S.trips.some(t => t.id === x.trip_id)); return J(204, null) }
    }
    if (tbl === 'rpc/jepi_join') {
      const inv = (S.invites || []).find(x => x.code === body.p_code); if (!inv) return J(400, { message: 'invite expired' });
      if (!role(inv.trip_id)) S.members.push({ trip_id: inv.trip_id, user_id: me, role: inv.role, name: body.p_name });
      return J(200, inv.trip_id)
    }
    if (u.pathname.startsWith('/functions/v1/jepi-push')) return J(200, m === 'GET' ? { publicKey: 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U' } : { due: 0 });
    return J(200, {});
  };
  return S;
}

async function device(b, S, opts = {}) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  await ctx.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  const leaf = p => { try { return fs.readFileSync(require.resolve('leaflet/dist/' + p)) } catch (_) { return null } };
  await ctx.route(/leaflet\.min\.(js|css)/, r => { const b = leaf(r.request().url().endsWith('.css') ? 'leaflet.css' : 'leaflet.js'); b ? r.fulfill({ body: b }) : r.abort() });
  await ctx.route(/basemaps\.cartocdn\.com|tile\.openstreetmap/, r => r.fulfill({ status: 204 }));
  await ctx.route(/supabase\.co/, S.handler);
  await ctx.route(/places\.googleapis\.com/, r => { S.places = (S.places || 0) + 1; const q = JSON.parse(r.request().postData()); const c = q.locationBias.circle.center;
    const day = d => ({ open: { day: d, hour: 10, minute: 0 }, close: { day: d, hour: 18, minute: 0 } });
    r.fulfill({ contentType: 'application/json', body: JSON.stringify({ places: [{ displayName: { text: q.textQuery }, location: c, businessStatus: 'OPERATIONAL', regularOpeningHours: { periods: [1, 2, 3, 4, 5, 6].map(day) } }] }) }) });
  await ctx.route(/routes\.googleapis\.com|dapi\.kakao\.com|api\.anthropic\.com|generativelanguage/, r => r.fulfill({ status: 503, body: '{}' }));
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  await p.goto(BASE + (opts.q || ''));
  if (opts.ls) { await p.evaluate(ls => { for (const [k, v] of Object.entries(ls)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)) }, opts.ls); await p.reload() }
  await p.waitForTimeout(3300); // intro
  p.ctx = ctx; return p;
}
const vis = (p, s) => p.isVisible(s).catch(() => false);
async function skipCoach(p) { for (let i = 0; i < 8 && await vis(p, '#coach'); i++) { await p.click('#coachSkip').catch(() => { }); await p.waitForTimeout(80) } }
async function openSettings(p) { await p.click('.tabs [data-tab="more"]'); await p.click('#moreBox [data-tab="settings"]'); await p.waitForTimeout(250) }

(async () => {
  const srv = serve(); const b = await chromium.launch(); const S = fakeServer();
  try {
    for (const t of require('./checks')) {
      console.log('▶ ' + t.name);
      try { await t.run({ b, S, device, ok, vis, skipCoach, openSettings }) }
      catch (e) { ok(false, 'threw: ' + e.message.split('\n')[0]) }
    }
  } finally { await b.close(); srv.close() }
  console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
  process.exit(failed ? 1 : 0);
})();

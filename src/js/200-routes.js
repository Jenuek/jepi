// ---------- routes: Google Routes (abroad), cached on this device ----------
// Asking, the queue and the cache live in app/data/routes.ts; Korea checks and "안내 시작" links in app/logic/geo.ts.
// Here: the names the rest of the old code uses, and when to redraw after routes arrive.
const inKR=JD.logic.geo.inKorea, navLink=JD.logic.geo.navLink;
const routeProvider=(a,b)=>JD.routes.provider(a,b);
JD.routes.connectRoutes({googleKey:()=>KEYS.gmaps||'',googleBad:()=>!!KS.bad.gmaps,arrived:()=>routeDirty(),
  keyBroken(){KS.bad.google=true;KS.msg.gmaps='✕ 키가 맞지 않거나 이 API가 켜져 있지 않아요'}});
const routeDirty=PIECES.routeDirty;   // redraw once routes arrive (not while typing or a sheet is open): app/flow/pieces.ts

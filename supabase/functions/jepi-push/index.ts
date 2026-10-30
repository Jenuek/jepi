// JEPI push sender. Called every minute by pg_cron (see schema.sql), and by the app's
// "테스트 알림 보내기". GET returns the public VAPID key the app needs to subscribe.
// Deploy with "Verify JWT" OFF: it only ever sends reminders that are already due.
import webpush from "npm:web-push@3.6.7";

const BASE = Deno.env.get("SUPABASE_URL")!;
// server key: the classic service_role JWT, or the newer sb_secret_… key (sent as apikey only)
function serverKey(): string {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;
  try { const all = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}"); return String(Object.values(all)[0] || ""); } catch (_) { return ""; }
}
const KEY = serverKey();
const H: Record<string, string> = KEY.startsWith("sb_") ? { apikey: KEY, "content-type": "application/json" } : { apikey: KEY, Authorization: `Bearer ${KEY}`, "content-type": "application/json" };
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type", "Access-Control-Allow-Methods": "GET,POST,OPTIONS" };

async function rest(path: string, init: RequestInit = {}) {
  const r = await fetch(`${BASE}/rest/v1/${path}`, { ...init, headers: { ...H, ...(init.headers || {}) } });
  if (!r.ok) throw new Error(`${path.split("?")[0]} ${r.status} ${await r.text()}`);
  return r.status === 204 ? null : r.json().catch(() => null);
}

async function vapid() {
  const read = async () => {
    const rows = (await rest("jepi_secrets?k=in.(vapid_public,vapid_private)&select=k,v")) as { k: string; v: string }[];
    return { pub: rows.find((r) => r.k === "vapid_public")?.v, priv: rows.find((r) => r.k === "vapid_private")?.v };
  };
  let v = await read();
  if (!v.pub || !v.priv) {
    const k = webpush.generateVAPIDKeys();
    await rest("jepi_secrets", { method: "POST", headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
      body: JSON.stringify([{ k: "vapid_public", v: k.publicKey }, { k: "vapid_private", v: k.privateKey }]) });
    v = await read(); // if two calls raced, both now use the same stored pair
  }
  return v as { pub: string; priv: string };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...CORS, "content-type": "application/json" } });
  try {
    const { pub, priv } = await vapid();
    if (req.method === "GET") return json({ publicKey: pub });
    webpush.setVapidDetails("https://jenuek.github.io/jepi/", pub, priv);
    const now = new Date(), from = new Date(now.getTime() - 30 * 60000);
    const due = (await rest(`jepi_alerts?sent_at=is.null&fire_at=lte.${now.toISOString()}&fire_at=gte.${from.toISOString()}&select=user_id,id,title,body,url&order=fire_at.asc&limit=300`)) as
      { user_id: string; id: string; title: string; body: string; url: string }[];
    let sent = 0, gone = 0;
    const subsOf: Record<string, { id: string; sub: webpush.PushSubscription }[]> = {};
    for (const a of due) {
      // mark first, so a slow send is never repeated by the next minute's run
      await rest(`jepi_alerts?user_id=eq.${a.user_id}&id=eq.${encodeURIComponent(a.id)}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ sent_at: now.toISOString() }) });
      subsOf[a.user_id] ??= (await rest(`jepi_push?user_id=eq.${a.user_id}&select=id,sub`)) as { id: string; sub: webpush.PushSubscription }[];
      for (const s of subsOf[a.user_id]) {
        try {
          await webpush.sendNotification(s.sub, JSON.stringify({ title: a.title, body: a.body, url: a.url || "/jepi/", tag: a.id }), { TTL: 1800 });
          sent++;
        } catch (e) {
          const code = (e as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410) { await rest(`jepi_push?user_id=eq.${a.user_id}&id=eq.${encodeURIComponent(s.id)}`, { method: "DELETE" }); gone++; }
        }
      }
    }
    return json({ due: due.length, sent, gone });
  } catch (e) {
    return json({ error: String((e as Error).message || e) }, 500);
  }
});

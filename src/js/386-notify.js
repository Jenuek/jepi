// ---------- 알림: push notifications while travelling ----------
// The server / device side and the settings live in app/data/alerts.ts, which reminders and time zones in
// app/logic/alerts.ts; the trip side (which blocks ring, 🔔 badge and sheet row, the panel): app/flow/notify.ts
const NOTF=window.JEPI_UI.flow.notify;
NOTF.connect({renderMore:()=>renderMore()});
NOTF.init();   // the 🔔 badge, the sheet row and the panel join the lists here, in the same order as before
const NOTIFY=NOTF.NOTIFY;

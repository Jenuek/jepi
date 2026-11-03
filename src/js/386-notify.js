// ---------- 알림: push notifications while travelling ----------
// This device subscribes once (Web Push). The app writes the upcoming reminders of the open plan
// into jepi_alerts (fire time in UTC); a server function (supabase/functions/jepi-push) runs every
// minute and sends the ones that are due to every device the person turned alerts on.
// Per-block on/off lives in jepi.alerts {planId: {blockKey: true|false}}; defaults in jepi.notify.
var NOTIFY=Object.assign({on:false,all:false,lead:10,depart:true,morning:true,dev:''},LS.get('jepi.notify',{})||{});
var ALERTS=LS.get('jepi.alerts',{})||{}, notifyMsg='', alertHash='';
const saveNotify=()=>LS.set('jepi.notify',NOTIFY), saveAlerts=()=>LS.set('jepi.alerts',ALERTS);
const pushFn=()=>JD.server.sbFunctionUrl('jepi-push');
const pushSupported=()=>'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;
const isIOS=()=>/iP(hone|ad|od)/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const standaloneApp=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
// which blocks can ring: places and fixed things like check-in / flights, not the night at the hotel
const alertKey=(it,d)=>`${it.kind==='place'?it.id:it.uid}@${d}`;
const alertable=it=>!it.stay&&(it.kind==='place'||it.kind==='fixed');
function alertOn(it,d){const m=ALERTS[curPlan]||{},k=alertKey(it,d);return k in m?!!m[k]:NOTIFY.all}
function setAlert(it,d,v){(ALERTS[curPlan]=ALERTS[curPlan]||{})[alertKey(it,d)]=v;saveAlerts();alertsSoon(400)}
// time zone of the trip: pack.tz, else by country, else this device
const COUNTRY_TZ={'일본':'Asia/Tokyo','한국':'Asia/Seoul','대한민국':'Asia/Seoul','대만':'Asia/Taipei','중국':'Asia/Shanghai','홍콩':'Asia/Hong_Kong','태국':'Asia/Bangkok','베트남':'Asia/Ho_Chi_Minh','싱가포르':'Asia/Singapore','필리핀':'Asia/Manila','인도네시아':'Asia/Jakarta','말레이시아':'Asia/Kuala_Lumpur','미국':'America/Los_Angeles','캐나다':'America/Vancouver','영국':'Europe/London','프랑스':'Europe/Paris','이탈리아':'Europe/Rome','스페인':'Europe/Madrid','독일':'Europe/Berlin','호주':'Australia/Sydney','괌':'Pacific/Guam'};
const tripTZ=()=>PACK.tz||COUNTRY_TZ[PACK.country]||(PACK.currency==='KRW'?'Asia/Seoul':Intl.DateTimeFormat().resolvedOptions().timeZone);
function tzOffsetMs(tz,t){const f=new Intl.DateTimeFormat('en-US',{timeZone:tz,hourCycle:'h23',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'});
  const v=Object.fromEntries(f.formatToParts(new Date(t)).map(x=>[x.type,x.value]));return Date.UTC(+v.year,+v.month-1,+v.day,+v.hour%24,+v.minute,+v.second)-t}
function localToUtc(iso,min,tz){const [y,m,d]=iso.split('-').map(Number);const g=Date.UTC(y,m-1,d,0,0)+min*60000;let t=g-tzOffsetMs(tz,g);t=g-tzOffsetMs(tz,t);return t}
function alertList(){
  if(!curPlan||!DAYS.length||!DAYS[0].iso) return [];
  const tz=tripTZ(), now=Date.now(), out=[], lead=+NOTIFY.lead||10;
  DAYS.forEach((D,d)=>{
    if(!D.iso) return; const {items}=analyze(d), rows=items.filter(alertable);
    if(NOTIFY.morning&&rows.length){const first=rows[0], at=Math.min(480,first.start-60);
      out.push({id:`${curPlan}:${d}:morning`,t:localToUtc(D.iso,Math.max(300,at),tz),title:`☀️ 오늘 일정 · Day ${d+1}`,body:rows.slice(0,3).map(i=>`${fmt(i.start)} ${i.name}`).join(' → ')})}
    rows.forEach(it=>{if(!alertOn(it,d))return;
      const ti=it.travelIn, go=NOTIFY.depart&&ti&&ti.min>=5;
      const at=(go?it.start-ti.min:it.start)-lead;
      out.push({id:`${curPlan}:${alertKey(it,d)}`,t:localToUtc(D.iso,at,tz),
        title:go?`🚶 ${lead}분 뒤 출발 · ${it.name}`:`⏰ ${lead}분 뒤 · ${it.name}`,
        body:go?`${fmt(it.start)} 도착 예정 · ${ti.fromName}에서 ${ti.mode} ${ti.min}분`:`${fmt(it.start)}–${fmt(it.end)} · ${it.locName||''}`})});
  });
  return out.filter(a=>a.t>now+30000).slice(0,80);
}
let alertT=0; function alertsSoon(ms){clearTimeout(alertT);alertT=setTimeout(()=>alertsUpload().catch(e=>{notifyMsg='✕ '+e.message}),ms||3000)}
async function alertsUpload(force){
  if(!NOTIFY.on||!syncOn()||DEMO.on) return;
  const list=alertList(), h=hashStr(curPlan+JSON.stringify(list.map(a=>[a.id,a.t,a.title,a.body])));
  if(!force&&h===alertHash) return; alertHash=h;
  await sbTable('jepi_alerts','DELETE',`?plan=eq.${encodeURIComponent(curPlan)}&sent_at=is.null`,null,'return=minimal');
  if(list.length) await sbTable('jepi_alerts','POST','?on_conflict=user_id,id',list.map(a=>({id:a.id,plan:curPlan,fire_at:new Date(a.t).toISOString(),title:a.title,body:a.body,url:location.pathname,sent_at:null})),'resolution=merge-duplicates,return=minimal');
}
// ----- this device -----
const b64u=s=>{const p='='.repeat((4-s.length%4)%4);return Uint8Array.from(atob((s+p).replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0))};
async function notifyEnable(){
  if(!pushSupported()) throw aiErr('unsupported',isIOS()?'홈 화면에 추가한 JEPI 앱에서 켜 주세요.':'이 브라우저는 알림을 지원하지 않아요.');
  if(!syncOn()) throw aiErr('auth','먼저 로그인해 주세요.');
  const perm=await Notification.requestPermission(); if(perm!=='granted') throw aiErr('denied','알림 권한이 꺼져 있어요. 기기 설정에서 JEPI 알림을 허용해 주세요.');
  const reg=await navigator.serviceWorker.register('sw.js'); await navigator.serviceWorker.ready;
  const r=await fetch(pushFn()); if(!r.ok) throw aiErr('server','알림 서버가 아직 준비되지 않았어요.'); const {publicKey}=await r.json();
  let sub=await reg.pushManager.getSubscription();
  if(!sub) sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64u(publicKey)});
  NOTIFY.dev=NOTIFY.dev||('d'+Date.now().toString(36)+Math.random().toString(36).slice(2,6));
  await sbTable('jepi_push','POST','?on_conflict=user_id,id',{id:NOTIFY.dev,sub:sub.toJSON(),updated:Date.now(),label:isIOS()?'iPhone/iPad':/Android/.test(navigator.userAgent)?'Android':'PC'},'resolution=merge-duplicates,return=minimal');
  NOTIFY.on=true; saveNotify(); alertHash=''; await alertsUpload(true);
}
async function notifyDisable(){
  try{const reg=await navigator.serviceWorker.getRegistration();const sub=reg&&await reg.pushManager.getSubscription();if(sub)await sub.unsubscribe()}catch(_){}
  if(syncOn()&&NOTIFY.dev) await sbTable('jepi_push','DELETE',`?id=eq.${NOTIFY.dev}`,null,'return=minimal');
  NOTIFY.on=false; saveNotify();
}
async function notifyTest(){
  await sbTable('jepi_alerts','POST','?on_conflict=user_id,id',{id:'test:'+Date.now(),plan:'test',fire_at:new Date().toISOString(),title:'🔔 JEPI 알림 테스트',body:'이렇게 알림이 와요. 여행 중에는 출발할 시간을 알려 드려요.',url:location.pathname,sent_at:null},'return=minimal');
  await fetch(pushFn(),{method:'POST',headers:{'content-type':'application/json'},body:'{}'}).catch(()=>{});
}
// ----- UI -----
BLOCK_BADGES.push((it,d)=>alertable(it)&&alertOn(it,d)&&NOTIFY.on?'<span class="mks" title="알림 켜짐">🔔</span> ':'');
SHEET_EXTRAS.push((it,d)=>{if(!alertable(it)||DEMO.on)return '';const on=alertOn(it,d);
  return `<div class="row alert-row"><button class="small-btn${on?' primary':''}" type="button" data-alert="${on?'off':'on'}">🔔 ${on?'알림 켜짐':'알림 켜기'}</button><span class="hint">${!NOTIFY.on?'더보기 → 알림에서 이 기기 알림을 켜야 와요':on?(NOTIFY.depart&&it.travelIn?`출발 ${NOTIFY.lead}분 전에 알려 드려요`:`시작 ${NOTIFY.lead}분 전에 알려 드려요`):''}</span></div>`});
// The panel itself is drawn by React: app/screens/NotifyPanel.tsx
let notifyBusy=false;
PANELS.notify={render(){
  const box=$('#notifyBox'); if(!box) return;
  const mode=DEMO.on?'demo':!pushSupported()?(isIOS()&&!standaloneApp()?'ios-home':'unsupported'):!syncOn()?'login':'ready';
  window.JEPI_UI.mount('notify',box,{mode,busy:notifyBusy,msg:notifyMsg||'',tz:String(tripTZ()),
    settings:{on:!!NOTIFY.on,all:!!NOTIFY.all,lead:+NOTIFY.lead||10,depart:!!NOTIFY.depart,morning:!!NOTIFY.morning}});
}};
document.addEventListener('click',async e=>{
  const a=e.target.closest('[data-alert]');
  if(a){const uid=$('#sheet').dataset.uid,{items}=analyze(day),it=items.find(i=>i.uid===uid);if(it){setAlert(it,day,a.dataset.alert==='on');openSheet(uid);renderAll()}return}
  const s=e.target.closest('[data-nset]');
  if(s){let v=s.dataset.val;v=v==='true'?true:v==='false'?false:+v;NOTIFY[s.dataset.nset]=v;saveNotify();alertsSoon(500);PANELS.notify.render();renderAll();return}
  const n=e.target.closest('[data-ntf]'); if(!n) return;
  if(notifyBusy) return; notifyBusy=true; notifyMsg=''; PANELS.notify.render();
  try{if(n.dataset.ntf==='on'){await notifyEnable();notifyMsg='알림을 켰어요'}else if(n.dataset.ntf==='off'){await notifyDisable();notifyMsg='알림을 껐어요'}else{await notifyTest();notifyMsg='테스트 알림을 보냈어요. 몇 초 안에 와요.'}}
  catch(err){notifyMsg='✕ '+err.message}
  notifyBusy=false; PANELS.notify.render(); renderMore(); renderAll();
});
// keep the server's list in step with the plan (cheap: only uploads when something changed)
setInterval(()=>{if(NOTIFY.on&&!document.hidden)alertsSoon(100)},30000);

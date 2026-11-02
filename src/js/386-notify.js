// ---------- 알림: push notifications while travelling ----------
// This device subscribes once (Web Push). The app writes the upcoming reminders of the open plan
// into jepi_alerts (fire time in UTC); a server function (supabase/functions/jepi-push) runs every
// minute and sends the ones that are due to every device the person turned alerts on.
// Per-block on/off lives in jepi.alerts {planId: {blockKey: true|false}}; defaults in jepi.notify.
var NOTIFY=Object.assign({on:false,all:false,lead:10,depart:true,morning:true,dev:''},LS.get('jepi.notify',{})||{});
var ALERTS=LS.get('jepi.alerts',{})||{}, notifyMsg='', alertHash='';
const saveNotify=()=>LS.set('jepi.notify',NOTIFY), saveAlerts=()=>LS.set('jepi.alerts',ALERTS);
const pushFn=()=>SYNC.url.replace(/\/$/,'')+'/functions/v1/jepi-push';
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
PANELS.notify={render(){
  const box=$('#notifyBox'); if(!box) return; const msg=notifyMsg?`<p class="hint">${esc(notifyMsg)}</p>`:'';
  if(DEMO.on){box.innerHTML='<div class="mgroup pad"><p class="hint" style="margin:0">데모에서는 알림을 쓸 수 없어요.</p></div>';return}
  let dev;
  if(!pushSupported()) dev=isIOS()&&!standaloneApp()?`<p class="hint" style="margin-top:0">아이폰·아이패드는 <b>홈 화면에 추가한 JEPI</b>에서만 알림을 받을 수 있어요 (iOS 16.4 이상).</p><ol class="hint fr-list"><li>사파리에서 공유 버튼 → <b>홈 화면에 추가</b></li><li>홈 화면의 JEPI를 열고 여기로 다시 오기</li><li>이 기기에서 알림 받기를 켜기</li></ol>`:'<p class="hint" style="margin:0">이 브라우저는 알림을 지원하지 않아요. 크롬이나 홈 화면에 추가한 앱에서 열어 주세요.</p>';
  else if(!syncOn()) dev=`<p class="hint" style="margin-top:0">알림은 로그인한 기기로 보내요.</p><div class="row"><button class="small-btn primary" data-tab="settings">로그인하러 가기</button></div>`;
  else dev=`<div class="srow" style="margin:0"><span><b>이 기기에서 알림 받기</b><br><small class="hint">${NOTIFY.on?'켜져 있어요':'꺼져 있어요'}</small></span><button class="small-btn${NOTIFY.on?'':' primary'}" type="button" data-ntf="${NOTIFY.on?'off':'on'}">${NOTIFY.on?'끄기':'켜기'}</button></div>
    ${NOTIFY.on?'<div class="row"><button class="small-btn" type="button" data-ntf="test">테스트 알림 보내기</button></div>':''}`;
  const R=(k,opts)=>`<div class="radio">${opts.map(([v,l])=>`<button type="button" data-nset="${k}" data-val="${v}" aria-pressed="${String(NOTIFY[k])===String(v)}">${l}</button>`).join('')}</div>`;
  box.innerHTML=`<div class="mgroup pad">${dev}${msg}</div>
    <div class="mgroup pad"><h3 class="taste-h">어떤 일정에 알릴까요</h3>
      <div class="srow"><span>일정마다</span>${R('all',[['false','고른 일정만'],['true','모든 일정']])}</div>
      <p class="hint">일정 블록을 누르면 🔔 알림 켜기로 하나씩 고를 수 있어요.</p>
      <div class="srow"><span>언제</span>${R('lead',[[5,'5분 전'],[10,'10분 전'],[15,'15분 전'],[30,'30분 전']])}</div>
      <div class="srow"><span>기준</span>${R('depart',[['true','출발할 때'],['false','시작할 때']])}</div>
      <p class="hint">출발할 때: 다음 장소까지 이동 시간을 빼고 "이제 나가야 해요"를 알려요.</p>
      <div class="srow"><span>아침 일정 요약</span>${R('morning',[['true','받기'],['false','안 받기']])}</div></div>
    <p class="hint">알림은 지금 열어 둔 여행 기준으로 준비돼요. 시간은 여행지 현지 시간(${esc(tripTZ())})이에요. 저전력 모드에서는 조금 늦게 올 수 있어요.</p>`;
}};
document.addEventListener('click',async e=>{
  const a=e.target.closest('[data-alert]');
  if(a){const uid=$('#sheet').dataset.uid,{items}=analyze(day),it=items.find(i=>i.uid===uid);if(it){setAlert(it,day,a.dataset.alert==='on');openSheet(uid);renderAll()}return}
  const s=e.target.closest('[data-nset]');
  if(s){let v=s.dataset.val;v=v==='true'?true:v==='false'?false:+v;NOTIFY[s.dataset.nset]=v;saveNotify();alertsSoon(500);PANELS.notify.render();renderAll();return}
  const n=e.target.closest('[data-ntf]'); if(!n) return;
  n.disabled=true; notifyMsg='';
  try{if(n.dataset.ntf==='on'){await notifyEnable();notifyMsg='알림을 켰어요'}else if(n.dataset.ntf==='off'){await notifyDisable();notifyMsg='알림을 껐어요'}else{await notifyTest();notifyMsg='테스트 알림을 보냈어요. 몇 초 안에 와요.'}}
  catch(err){notifyMsg='✕ '+err.message}
  PANELS.notify.render(); renderMore(); renderAll();
});
// keep the server's list in step with the plan (cheap: only uploads when something changed)
setInterval(()=>{if(NOTIFY.on&&!document.hidden)alertsSoon(100)},30000);

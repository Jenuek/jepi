// ---------- 영업시간: real opening hours from Google Places (abroad), AI estimate in Korea ----------
// Only places that are on the schedule and carry an AI/estimated time ("확인 필요: 영업시간") are looked up.
// Each place is looked up once and kept in jepi.hours (30 days). Kakao has no opening hours, so
// places in Korea keep the estimate and say so. A monthly cap keeps Google inside its free tier.
const HOURS_CAP=900; // Google Place Details/Text Search with opening hours: 1,000 free per month
let hoursOff='', hoursBusy=false;
const hoursCache=()=>LS.get('jepi.hours',{})||{};
const hoursKey=p=>`${p.local||p.name}|${(+p.ll[0]).toFixed(3)}|${(+p.ll[1]).toFixed(3)}`;
function hoursUse(add){const m=new Date().toISOString().slice(0,7);let u=LS.get('jepi.hoursUse',{m,n:0});if(u.m!==m)u={m,n:0};if(add){u.n+=add;LS.set('jepi.hoursUse',u)}return u.n}
// Google periods → {hours:[o,c], hoursBy:{wd:[o,c]}, closed:[wd…]} in this app's shape
function hoursFromGoogle(oh){
  const per=(oh&&oh.periods)||[]; if(!per.length) return null;
  if(per.length===1&&per[0].open&&!per[0].close) return {always:true};
  const byDay={};
  per.forEach(x=>{if(!x.open)return;const d=x.open.day,o=x.open.hour*60+(x.open.minute||0);
    let c=x.close?x.close.hour*60+(x.close.minute||0):1440; if(x.close&&x.close.day!==d) c=1440; if(c<=o) c=1440;
    const cur=byDay[d]; byDay[d]=cur?[Math.min(cur[0],o),Math.max(cur[1],c)]:[o,c]});
  const days=Object.keys(byDay).map(Number); if(!days.length) return null;
  const count={}; days.forEach(d=>{const k=byDay[d].join('-');count[k]=(count[k]||0)+1});
  const base=Object.entries(count).sort((a,b)=>b[1]-a[1])[0][0].split('-').map(Number);
  const hoursBy={}; days.forEach(d=>{if(byDay[d].join('-')!==base.join('-'))hoursBy[d]=byDay[d]});
  return {hours:base,hoursBy:Object.keys(hoursBy).length?hoursBy:undefined,closed:[0,1,2,3,4,5,6].filter(d=>!(d in byDay))};
}
function hoursApply(p,h){
  if(!h) return false;
  if(h.gone){p.gone=true;return true}
  if(h.always){p.always=true;p.hours=undefined}else{p.always=false;p.hours=h.hours;p.hoursBy=h.hoursBy;p.closed=h.closed||[]}
  p.hsrc='google'; if(p.verify==='영업시간') p.verify=undefined; return true;
}
const hoursNeeds=p=>p&&p.ll&&!inKR(p.ll)&&p.hsrc!=='google'&&!p.always&&p.hours&&(p.verify==='영업시간'||p.ai);
async function hoursLookup(p,key){
  const r=await fetch('https://places.googleapis.com/v1/places:searchText',{method:'POST',
    headers:{'Content-Type':'application/json','X-Goog-Api-Key':key,'X-Goog-FieldMask':'places.displayName,places.location,places.regularOpeningHours,places.businessStatus'},
    body:JSON.stringify({textQuery:`${p.local||p.name} ${PACK.city||''}`.trim(),maxResultCount:1,languageCode:'ko',
      locationBias:{circle:{center:{latitude:+p.ll[0],longitude:+p.ll[1]},radius:1500}}})});
  if(r.status===403||r.status===400){let m='';try{m=(await r.json()).error.message||''}catch(_){}throw aiErr('off',/not been used|disabled|not enabled|blocked/i.test(m)?'Google Cloud에서 Places API (New)를 켜 주세요.':'Google 키가 장소 정보를 쓸 수 없어요.')}
  if(!r.ok) throw aiErr('net','HTTP '+r.status);
  const j=await r.json(), x=j.places&&j.places[0];
  if(!x||!x.location||km([x.location.latitude,x.location.longitude],p.ll)>0.8) return {miss:true};
  if(x.businessStatus==='CLOSED_PERMANENTLY') return {gone:true};
  return hoursFromGoogle(x.regularOpeningHours)||{miss:true};
}
async function hoursSweep(){
  if(hoursBusy||hoursOff||DEMO.on||document.hidden) return;
  const key=KEYS.gmaps; if(!key||isBad('gmaps')) return;
  const ids=[...new Set(placed.map(b=>b.id))], todo=ids.map(id=>PM[id]).filter(hoursNeeds);
  if(!todo.length) return;
  hoursBusy=true; const cache=hoursCache(), now=Date.now(); let changed=false, asked=0;
  try{
    for(const p of todo){
      const k=hoursKey(p), c=cache[k];
      if(c&&now-c.t<30*864e5){if(!c.miss&&hoursApply(p,c))changed=true;else if(c.miss)p.hsrc='miss';continue}
      if(hoursUse()>=HOURS_CAP||asked>=12) break;
      asked++; hoursUse(1);
      const h=await hoursLookup(p,key); cache[k]=Object.assign({t:now},h);
      if(!h.miss&&hoursApply(p,h)) changed=true; else p.hsrc='miss';
    }
  }catch(e){if(e.code==='off')hoursOff=e.message}
  LS.set('jepi.hours',cache); hoursBusy=false;
  if(changed){savePack();TRIP.save('custom',custom);renderAll();touchPlan()}
}
function hoursHint(){
  if(!KEYS.gmaps) return '';
  return `<p class="hint">영업시간: 해외 장소는 Google에서 실제 영업시간을 확인해요 (이번 달 ${hoursUse()}/${HOURS_CAP}곳, 월 1,000곳까지 무료). 국내 장소는 카카오가 영업시간을 주지 않아 AI 추정이에요.${hoursOff?` <b class="wtxt">${esc(hoursOff)}</b>`:''}</p>`;
}

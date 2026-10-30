// ---------- destination pack: everything that depends on where the trip goes ----------
const GENERIC_KW=['사색·고요함','대자연 풍경','오로라·별','휴양·쉼','드라이브','맛집','카페','혼밥','술집','데이트','아이와 함께','테마파크','체험','야경','산책','공원','미술관','박물관','역사','건축','쇼핑','빈티지','시장','음악','라이브','서점','사진','자연','스파·온천','액티비티','현지 문화'];
const TOKYO_PACK={example:true,city:'도쿄',country:'일본',intl:true,currency:'JPY',symbol:'¥',rate:8.4,transit:'전철',fare:{base:180,perKm:15,max:360},snack:1000,step:500,
  arrivalNote:'입국 심사와 짐 찾기. Visit Japan Web QR을 준비하세요.',
  areas:Object.entries(AREAS).map(([k,v])=>({key:k,name:v[0],lat:v[1],lng:v[2],zone:AREA_ZONE[k]})),
  zones:Object.assign({},ZONES),
  gateways:[{key:'hnd',iata:'HND',name:'하네다 공항',kind:'air',lat:35.5494,lng:139.7798,fare:650},{key:'nrt',iata:'NRT',name:'나리타 공항',kind:'air',lat:35.7720,lng:140.3929,fare:1300,min:75}],
  checks:STATIC_CHECKS.map(s=>s.t),
  places:P.map(p=>Object.assign({},p,{cost:COST[p.id]||[0,''],tags:TAGS[p.id]||[],zone:ZONE_OF[p.id]||'outer',must:MUST[p.id]||''}))};
let PACK=null;
const wipe=o=>{for(const k of Object.keys(o)) delete o[k]};
const firstArea=()=>Object.keys(AREAS)[0];
const firstGw=()=>Object.keys(AIRPORTS)[0];
function cityLL(){const a=Object.values(AREAS);if(!a.length)return [0,0];return [a.reduce((s,x)=>s+x[1],0)/a.length,a.reduce((s,x)=>s+x[2],0)/a.length]}
function nearestArea(ll){let best=null,bd=1e9;for(const [k,a] of Object.entries(AREAS)){const d=km(ll,[a[1],a[2]]);if(d<bd){bd=d;best=k}}return best}
const nice=n=>{if(!(n>0))return 0;const p=10**Math.floor(Math.log10(n));return Math.max(p,Math.round(n/p)*p)};
function addPackPlace(p){P.push(p);PM[p.id]=p;COST[p.id]=p.cost||[0,''];TAGS[p.id]=p.tags||[];ZONE_OF[p.id]=p.zone||'outer';if(p.must)MUST[p.id]=p.must}
function loadPack(pk){
  PACK=pk; [AREAS,AREA_ZONE,ZONES,ZONE_OF,COST,TAGS,MUST,PM,AIRPORTS].forEach(wipe); P.length=0;
  if(!pk.areas||!pk.areas.length) pk.areas=[{key:'center',name:'시내',lat:0,lng:0,zone:'center'}];
  pk.areas.forEach(a=>{AREAS[a.key]=[a.name,+a.lat,+a.lng];AREA_ZONE[a.key]=a.zone||a.key});
  Object.assign(ZONES,pk.zones||{});
  Object.entries(AREA_ZONE).forEach(([k,z])=>{if(!ZONES[z])ZONES[z]=AREAS[k][0]});
  ZONES.air=ZONES.air||'공항·역'; ZONES.outer=ZONES.outer||'그 밖의 곳';
  if(!pk.gateways||!pk.gateways.length){const c=cityLL();pk.gateways=[{key:'gw_main',name:`${pk.city||'여행지'} 도착 지점`,kind:'air',lat:c[0],lng:c[1]}]}
  pk.gateways.forEach(g=>{AIRPORTS[g.key]={iata:g.iata||'',name:g.name,kind:g.kind||'air',ll:[+g.lat,+g.lng],fare:g.fare,min:g.min}});
  (pk.places||(pk.places=[])).forEach(addPackPlace);
  STATIC_CHECKS.length=0; (pk.checks||[]).forEach((t,i)=>STATIC_CHECKS.push({id:`k${i}_${String(pk.city||'').slice(0,8)}`,t}));
  KRW_PER_JPY=+pk.rate>0?+pk.rate:1;
  if(!(pk.snack>0)) pk.snack=pk.currency==='KRW'?15000:nice(15000/KRW_PER_JPY);
  if(!(pk.step>0)) pk.step=nice(pk.snack/2);
  if(recState!=='off'){SHARED_IDS.clear();rebuildShared()}
}
const savePack=()=>store.set('gp.pack',PACK);
function packFrom(v){
  if(v==='tokyo') return TOKYO_PACK;
  if(v&&typeof v==='object'&&Array.isArray(v.areas)&&v.areas.length&&v.city) return v;
  return null;
}
function manualPack(dest){return {city:dest,country:'',intl:false,currency:'KRW',symbol:'₩',rate:1,transit:'대중교통',fare:{base:0,perKm:0,max:0},checks:[],areas:[],zones:{},gateways:[],places:[],manual:true}}
function cleanPack(r,dest){
  if(!r||r.ok===false) return null;
  const num=x=>x!==null&&x!==''&&Number.isFinite(+x)?+x:null;
  const key=(s,i,pre)=>(String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,16)||pre+i);
  const areas=[],seen=new Set();
  (Array.isArray(r.areas)?r.areas:[]).slice(0,16).forEach((a,i)=>{const la=num(a&&a.lat),ln=num(a&&a.lng);if(la==null||ln==null||Math.abs(la)>90||Math.abs(ln)>180||(!la&&!ln))return;
    let k=key(a.key,i,'a');while(seen.has(k))k+='x';seen.add(k);areas.push({key:k,name:String(a.name||k).slice(0,24),lat:la,lng:ln,zone:key(a.zone,i,'z')})});
  if(!areas.length) return null;
  const mid=[areas.map(a=>a.lat).sort((x,y)=>x-y)[areas.length>>1],areas.map(a=>a.lng).sort((x,y)=>x-y)[areas.length>>1]];
  const near=areas.filter(a=>km(mid,[a.lat,a.lng])<120); if(!near.length) return null;
  const zones={}; Object.entries(r.zones&&typeof r.zones==='object'?r.zones:{}).forEach(([k,v])=>{zones[key(k,0,'z')]=String(v).slice(0,30)});
  const gws=[]; (Array.isArray(r.gateways)?r.gateways:[]).slice(0,5).forEach((g,i)=>{const la=num(g&&g.lat),ln=num(g&&g.lng);if(la==null||ln==null||km(mid,[la,ln])>200)return;
    const k='gw_'+key(g.key,i,'g'); if(gws.some(x=>x.key===k))return;
    gws.push({key:k,iata:/^[A-Za-z]{3}$/.test(String(g.iata||''))?String(g.iata).toUpperCase():'',name:String(g.name||'도착 지점').slice(0,30),kind:['air','rail','bus'].includes(g.kind)?g.kind:'air',lat:la,lng:ln,min:num(g.min)>0?Math.min(180,num(g.min)):undefined,fare:num(g.fare)>=0?num(g.fare):undefined})});
  const f=r.fare||{}, cur=String(r.currency||'KRW').slice(0,3).toUpperCase();
  return {city:String(r.city||dest).slice(0,30),country:String(r.country||'').slice(0,30),intl:r.intl!==false&&cur!=='KRW',currency:cur,symbol:String(r.symbol||cur).slice(0,3),
    rate:cur==='KRW'?1:(num(r.rate)>0?num(r.rate):1),transit:String(r.transit||'대중교통').slice(0,10),fare:{base:num(f.base)||0,perKm:num(f.perKm)||0,max:num(f.max)||0},
    snack:num(r.snack)>0?num(r.snack):0,step:num(r.step)>0?num(r.step):0,arrivalNote:String(r.arrivalNote||'').slice(0,140),
    checks:(Array.isArray(r.checks)?r.checks:[]).map(x=>String(x).slice(0,80)).slice(0,8),areas:near,zones,gateways:gws,places:[]};
}
function cleanPlace(x){
  if(!x||!x.name) return null;
  let la=+x.lat, ln=+x.lng; const hasLL=Number.isFinite(la)&&Number.isFinite(ln)&&(la||ln);
  const ak=AREAS[x.area]?x.area:(hasLL?nearestArea([la,ln]):firstArea()); const A=AREAS[ak];
  if(!hasLL||km([la,ln],[A[1],A[2]])>15){la=A[1];ln=A[2]}
  const hm=/^(\d{1,2}:\d{2})\s*[-~–]\s*(\d{1,2}:\d{2})$/.exec(String(x.open||'').trim()); let hours=null;
  if(hm){const a=parse(hm[1]);let b=parse(hm[2]);if(a!=null&&b!=null){if(b<=a)b=1440;hours=[a,Math.min(1440,b)]}}
  return {id:'g'+Date.now().toString(36).slice(-4)+Math.random().toString(36).slice(2,7),name:String(x.name).slice(0,50),local:String(x.local||'').slice(0,60),
    cat:CATS[x.cat]?x.cat:'walk',area:A[0],ll:[la,ln],dur:Math.max(15,Math.min(300,Math.round((+x.dur||60)/15)*15)),
    hours:hours||undefined,always:!hours,closed:(Array.isArray(x.closed)?x.closed:[]).map(Number).filter(w=>Number.isInteger(w)&&w>=0&&w<=6),
    note:String(x.note||'').slice(0,160),verify:'영업시간',check:String(x.check||'').slice(0,80),drop:x.drop===true,
    cost:[Math.max(0,+x.cost||0),String(x.costNote||'').slice(0,40)],tags:(Array.isArray(x.tags)?x.tags:[]).map(t=>String(t).slice(0,16)).slice(0,6),
    zone:AREA_ZONE[ak]||'outer',must:String(x.must||'').slice(0,60),cash:x.cash===true,best:['morning','day','sunset','evening','night'].includes(x.best)?x.best:'any',ai:true};
}
const placeLink=p=>`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((p.local||p.name)+' '+(PACK.city||''))}`;
const rateTxt=()=>PACK.currency==='KRW'?'':` · 환율 ${yen(KRW_PER_JPY<50?100:1)} ≈ ${won(KRW_PER_JPY*(KRW_PER_JPY<50?100:1))}`;
let onbBusy=false, placeCtl=null;
const prog={};
function progStart(stId,label,btnIds,btnLabel){progStop(stId);const t0=Date.now();const old={};[...new Set(btnIds||[])].forEach(id=>{const b=document.getElementById(id);if(b){old[id]=b.textContent;b.textContent=btnLabel}});
  const tick=()=>{const e=document.getElementById(stId);if(e){e.classList.add('busy');e.textContent=`${label} · ${Math.round((Date.now()-t0)/1000)}초 지났어요`}};
  tick();const e=document.getElementById(stId);if(e&&e.scrollIntoView)e.scrollIntoView({block:'nearest'});prog[stId]={iv:setInterval(tick,1000),old}}
function progStop(stId){const p=prog[stId];if(!p)return;clearInterval(p.iv);const e=document.getElementById(stId);if(e)e.classList.remove('busy');Object.entries(p.old).forEach(([id,t])=>{const b=document.getElementById(id);if(b)b.textContent=t});delete prog[stId]}
const setSt=(id,t)=>{progStop(id);const e=document.getElementById(id);if(e)e.textContent=t};
function errText(e,what){return e&&e.code==='not_granted'?'AI 키가 맞지 않아서 할 수 없어요.':e&&e.code==='rate_limited'?'요청이 많아 잠시 쉬어야 해요. 조금 뒤에 다시 해 주세요.':`${what}. 다시 시도해 주세요.`}
async function genPack(dest,btn){
  if(!sample){setSt('st_pack','AI가 연결되어 있지 않아요. 더보기 → 설정에서 키를 넣어 주세요.');return false}
  if(onbBusy) return false; onbBusy=true; setBusy(true);
  const ctl=new AbortController(); const to=setTimeout(()=>ctl.abort(),120000);
  progStart('st_pack',`${dest} 정보를 준비하는 중이에요 (보통 20~40초)`,[btn||'genPack','genPack'],'준비하는 중…');
  const prompt=`You prepare destination data for a trip-planning app used by Korean travelers. Destination typed by the user: "${dest.slice(0,60)}". Travelers start from South Korea (Seoul area).
Reply with only JSON:
{"ok":true (false if this is not a real travel destination),
"city":"destination name in Korean","country":"country in Korean","intl":true if outside South Korea,
"currency":"ISO code","symbol":"₩, ¥, $, €, ฿ ...","rate":Korean won per 1 unit of the local currency (approximate, recent),
"transit":"Korean word for the main local public transport (지하철, 전철, 버스, 트램...)",
"fare":{"base":typical single public transport ride in local currency,"perKm":extra per km beyond 4 km,"max":fare cap or 0},
"snack":typical daily budget for snacks and drinks per person in local currency,"step":a round adjustment step for that budget,
"areas":[8-14 neighbourhoods or districts travellers actually use, {"key":"short ascii","name":"Korean name","lat":0.0000,"lng":0.0000,"zone":"zone key"}],
"zones":{"zone key":"Korean label"} (3-7 zones that group nearby areas),
"gateways":[1-4 arrival points: main airports and main rail or bus stations, {"key":"ascii","name":"Korean name","kind":"air|rail|bus","iata":"3-letter IATA code for airports, else empty","lat":0.0000,"lng":0.0000,"min":typical minutes to the centre by public transport,"fare":typical one-way fare to the centre in local currency}],
"checks":[4-7 short Korean pre-trip checklist items specific to this destination: entry rules or apps, payment, plugs, tax refund, local customs],
"arrivalNote":"one short Korean sentence about arrival procedures, or empty"}
Coordinates must be accurate WGS84 to 4 decimals.`;
  try{
    const r=await sample.json(prompt,{cache:false,signal:ctl.signal}); const pk=cleanPack(r,dest);
    if(!pk){setSt('st_pack','여행지를 찾지 못했어요. 도시 이름을 조금 더 정확히 적어 주세요.');return false}
    custom=[]; store.set('gp.custom',custom); placed=[]; save(); undoSnap=null;
    loadPack(pk); savePack();
    if(draft){draft.dest=pk.city; draft.stays.forEach(s=>{s.area=firstArea();if(/시부야/.test(s.name))s.name='숙소'}); draft.events.forEach(e=>e.area=firstArea()); draft.out.airport=draft.back.airport=firstGw(); if(pk.intl) draft.mode='flight'}
    if($('#onb').hidden&&draft&&tab==='me')autoSave();setSt('st_pack',`${pk.city} 준비 완료 · 동네 ${pk.areas.length}곳 · 공항·역 ${pk.gateways.length}곳`); return true;
  }catch(e){setSt('st_pack',e&&e.code==='cancelled'?'2분 안에 답을 받지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요.':errText(e,'여행지를 준비하지 못했어요')+(e&&e.code?` (${e.code})`:''));return false}
  finally{clearTimeout(to);onbBusy=false; setBusy(false)}
}
async function morePlaces(n,stId,focus,signal){
  if(!sample) return 0;
  progStart(stId,n>15?(kws.length?'고른 취향에 맞는 장소 후보를 찾는 중이에요 (보통 1~2분)':`${PACK.city}에서 가 볼 만한 곳을 골고루 찾는 중이에요 (보통 1~2분)`):'장소를 찾는 중이에요 (보통 30초~1분)',stId==='moreSt'?['moreBtn']:[],'찾는 중…');
  const areaList=Object.entries(AREAS).map(([k,v])=>`${k}=${v[0]}`).join(', ');
  const prompt=`Suggest ${n} real, currently operating places in ${PACK.city}${PACK.country?', '+PACK.country:''} for this traveler.
${profileSummary()}
Trip dates: ${(DAYS[0]||{}).iso||''} to ${(DAYS[DAYS.length-1]||{}).iso||''}.
${focus?`The traveler asks specifically for: "${String(focus).slice(0,120)}". All suggestions should fit this.`:`Spread them across these categories: food (meals and cafes that suit who is traveling), music, art, walk, shop, night, and include 2 luggage-storage options near the main station or centre (category "trip", drop true). ${kws.length?'Favour places matching the interest keywords.':'No interests were given: pick well-loved, varied places most visitors enjoy, so the traveler can discover what they like.'} Consider the trip dates: include seasonal highlights (blossoms, foliage, illuminations, festivals, seasonal food) only when they genuinely happen then.`}
Who is traveling matters most for the choice of places.
Area keys: ${areaList}
Do not repeat these: ${P.map(p=>p.name).slice(0,150).join(', ')||'(none)'}
Reply with only JSON: {"places":[{"name":"Korean name","local":"name in local language for map search","area":"area key","cat":"food|music|art|walk|shop|night|trip","lat":0.0000,"lng":0.0000,"dur":typical minutes,"open":"HH:MM-HH:MM or null if always open (24:00 for midnight)","closed":[weekday numbers, 0=Sunday],"cost":typical spend per person in ${PACK.currency},"costNote":"short Korean","tags":["2-5 short Korean keywords; reuse the traveler's keywords when they apply"],"note":"one Korean sentence: what it is and why go","must":"short Korean reason if it is a highlight for this traveler, else empty","drop":false,"cash":true only if the place mostly accepts cash only,"best":"morning|day|sunset|evening|night|any: when this place is best visited","check":"short Korean note if a booking or ticket is needed, else empty"}]}`;
  try{
    const r=await sample.json(prompt,{cache:false,signal}); let added=0; FRESH.clear();
    (Array.isArray(r&&r.places)?r.places:[]).slice(0,n+5).forEach(x=>{const pl=cleanPlace(x);if(pl&&!P.some(p=>norm(p.name)===norm(pl.name)||(p.local&&pl.local&&norm(p.local)===norm(pl.local)))&&!dupOf(pl)){PACK.places.push(pl);addPackPlace(pl);FRESH.add(pl.id);added++}});
    savePack(); setSt(stId,added?`새 장소 ${added}곳을 찾았어요. 장소 탭 맨 위 "✨ 방금 찾은 곳"에 모아 뒀어요.`:'이미 있는 곳과 겹쳐서 새로 추가할 장소가 없었어요. 찾는 말을 바꿔 보세요 (예: 현지인 맛집, 조용한 카페).'); return added;
  }catch(e){setSt(stId,e&&e.code==='cancelled'?'멈췄어요. 장소 블록 탭에서 언제든 다시 찾을 수 있어요.':errText(e,'장소를 찾지 못했어요'));return 0}
}
function setBusy(b){['onbNext','onbPrev','onbSkip','onbExample','genPack','meSave'].forEach(id=>{const e=document.getElementById(id);if(e)e.disabled=b||(id==='onbPrev'&&onbStep===0)})}
async function onbAdvance(){
  if(onbBusy) return;
  if(onbStep===0){
    if(draft.kind==='day'){if(draft.dateSet===false){setSt('st_dates','날짜를 골라 주세요.');return}}else if(!datesReady(draft)){needDates();return}
    const dest=String(draft.dest||'').trim();
    if(!dest){setSt('st_pack','여행지를 먼저 적어 주세요.');return}
    if(norm(dest)!==norm(PACK.city)){
      if(sample){if(!(await genPack(dest,'onbNext')))return}
      else{custom=[];store.set('gp.custom',custom);placed=[];save();loadPack(manualPack(dest));savePack();draft.stays.forEach(s=>s.area=firstArea());draft.events.forEach(e=>e.area=firstArea());draft.out.airport=draft.back.airport=firstGw()}
    }
  }
  if(onbStep<ONB.length-1){onbStep++;renderOnb()} else await finishOnb();
}
function fDest(p){
  if(p.destMode==='find') return fDestFinder(p);
  const tb='';
  const ready=PACK&&norm(PACK.city)===norm(p.dest||'');
  return tb+`<div class="fsec"><h3>여행지</h3><label class="fg" style="display:block"><span class="hint">도시나 지역 이름 (국내, 해외 모두 돼요)</span>${inp('dest',p.dest,'text','maxlength="40" placeholder="예: 오사카, 제주, 파리, 방콕" style="margin-top:4px"')}</label>
  <div class="row"><button class="small-btn" type="button" data-destmode="find">아직 못 정했어요 · 취향으로 추천받기</button></div>
  <div class="row">${sample?`<button class="small-btn primary" type="button" id="genPack">AI로 여행지 준비하기</button>`:''}<span class="ai-status" id="st_pack">${ready?`${esc(PACK.city)} 준비됨 · 동네 ${Object.keys(AREAS).length}곳 · 장소 ${P.length}곳`:''}</span></div>
  ${sample?`<p class="hint">AI가 동네, 공항·역, 화폐, 교통비를 정리해요. 여행지를 바꾸면 넣어 둔 블록은 지워져요.</p>`:`<p class="hint">새 여행지 정보는 AI를 연결해야 준비할 수 있어요 (더보기 → 설정). 지금은 장소 없이 블록을 직접 만들어 쓰거나, "예시로 둘러보기"로 도쿄 예시를 볼 수 있어요.</p>`}
  ${ready&&PACK.currency!=='KRW'?`<div class="fg"><label>환율: 1 ${esc(PACK.currency)}는 몇 원?<input type="number" step="any" min="0" data-pk="rate" value="${esc(+KRW_PER_JPY.toFixed(4))}"></label></div><p class="hint">AI가 넣은 대략적인 값이에요. 바꾸면 비용 계산에 바로 반영돼요.</p>`:''}</div>`;
}


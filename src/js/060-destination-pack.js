// ---------- destination pack: everything that depends on where the trip goes ----------
const GENERIC_KW=['사색·고요함','대자연 풍경','오로라·별','휴양·쉼','드라이브','맛집','카페','혼밥','술집','데이트','아이와 함께','테마파크','체험','야경','산책','공원','미술관','박물관','역사','건축','쇼핑','빈티지','시장','음악','라이브','서점','사진','자연','스파·온천','액티비티','현지 문화'];
// The destination's places and the lists made from them (AREAS, PM …), loading one (loadPack) and checking what the AI
// sends (cleanPack / cleanPlace) live in app/data/places.ts; the open destination is PK.pack.
PK.pack=null;
const wipe=o=>{for(const k of Object.keys(o)) delete o[k]};
const firstArea=PLC.firstArea, firstGw=PLC.firstGw, cityLL=PLC.cityLL, nearestArea=PLC.nearestArea, addPackPlace=PLC.addPackPlace,
  loadPack=PLC.loadPack, savePack=PLC.savePack, packFrom=PLC.packFrom, manualPack=PLC.manualPack, cleanPack=PLC.cleanPack, cleanPlace=PLC.cleanPlace;
// after a destination is loaded: other travelers' 👍 places of that city (070-shared-recs.js)
PLC.connectPlaces(pk=>{if(RS.status!=='off'){SHARED_IDS.clear();rebuildShared()}});
const placeLink=p=>`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((p.local||p.name)+' '+(PK.pack.city||''))}`;
const rateTxt=()=>PK.pack.currency==='KRW'?'':` · 환율 ${yen(PLC.rate()<50?100:1)} ≈ ${won(PLC.rate()*(PLC.rate()<50?100:1))}`;
let onbBusy=false, placeCtl=null;
const prog={};
// Status lines and buttons React drew are updated through a handle (app/ui/live.tsx), others the old way.
const liveEl=id=>{const e=document.getElementById(id);return e&&window.JEPI_UI.live(e)};
function progStart(stId,label,btnIds,btnLabel){progStop(stId);const t0=Date.now();const old={};[...new Set(btnIds||[])].forEach(id=>{const b=document.getElementById(id);if(!b)return;const L=window.JEPI_UI.live(b);if(L){old[id]=null;L.label(btnLabel)}else{old[id]=b.textContent;b.textContent=btnLabel}});
  const tick=()=>{const L=liveEl(stId),e=document.getElementById(stId),t=`${label} · ${Math.round((Date.now()-t0)/1000)}초 지났어요`;if(L){L.busy(true);L.text(t)}else if(e){e.classList.add('busy');e.textContent=t}};
  tick();const e=document.getElementById(stId);if(e&&e.scrollIntoView)e.scrollIntoView({block:'nearest'});prog[stId]={iv:setInterval(tick,1000),old}}
function progStop(stId){const p=prog[stId];if(!p)return;clearInterval(p.iv);const L=liveEl(stId),e=document.getElementById(stId);if(L)L.busy(false);else if(e)e.classList.remove('busy');
  Object.entries(p.old).forEach(([id,t])=>{const b=document.getElementById(id);if(!b)return;const BL=window.JEPI_UI.live(b);if(BL)BL.label(null);else if(t!=null)b.textContent=t});delete prog[stId]}
const setSt=(id,t)=>{progStop(id);const L=liveEl(id),e=document.getElementById(id);if(L)L.text(t);else if(e)e.textContent=t};
// what went wrong, in words the person can act on (the app already tried again a few times)
function errText(e,what){const c=e&&e.code;
  return c==='not_granted'?'AI 키가 맞지 않아서 할 수 없어요.':c==='rate_limited'?'요청이 많아 잠시 쉬어야 해요. 1분쯤 뒤에 다시 해 주세요.'
    :c==='timeout'?`${what}. AI가 너무 오래 걸렸어요. 다시 해 주세요.`:c==='busy'?`${what}. AI 서버가 지금 바빠요. 조금 뒤에 다시 해 주세요.`
    :c==='too_long'?`${what}. 답이 너무 길어 잘렸어요. 조건을 줄여 다시 해 주세요.`:c==='invalid_json'?`${what}. AI 답을 읽지 못했어요. 다시 해 주세요.`
    :`${what}. 다시 시도해 주세요.`}
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
    CUR.custom=[]; TRIP.save('custom',CUR.custom); CUR.placed=[]; save(); undoSnap=null;
    loadPack(pk); savePack();
    if(draft){draft.dest=pk.city; draft.stays.forEach(s=>{s.area=firstArea();if(/시부야/.test(s.name))s.name='숙소'}); draft.events.forEach(e=>e.area=firstArea()); draft.out.airport=draft.back.airport=firstGw(); if(pk.intl) draft.mode='flight'}
    if($('#onb').hidden&&draft&&tab==='me')autoSave();setSt('st_pack',`${pk.city} 준비 완료 · 동네 ${pk.areas.length}곳 · 공항·역 ${pk.gateways.length}곳`); return true;
  }catch(e){setSt('st_pack',e&&e.code==='cancelled'?'2분 안에 답을 받지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요.':errText(e,'여행지를 준비하지 못했어요')+(e&&e.code?` (${e.code})`:''));return false}
  finally{clearTimeout(to);onbBusy=false; setBusy(false)}
}
async function morePlaces(n,stId,focus,signal){
  if(!sample) return 0;
  progStart(stId,n>15?(CUR.kws.length?'고른 취향에 맞는 장소 후보를 찾는 중이에요 (보통 1~2분)':`${PK.pack.city}에서 가 볼 만한 곳을 골고루 찾는 중이에요 (보통 1~2분)`):'장소를 찾는 중이에요 (보통 30초~1분)',stId==='moreSt'?['moreBtn']:[],'찾는 중…');
  const areaList=Object.entries(AREAS).map(([k,v])=>`${k}=${v[0]}`).join(', ');
  const prompt=`Suggest ${n} real, currently operating places in ${PK.pack.city}${PK.pack.country?', '+PK.pack.country:''} for this traveler.
${profileSummary()}
Trip dates: ${(DY.days[0]||{}).iso||''} to ${(DY.days[DY.days.length-1]||{}).iso||''}.
${focus?`The traveler asks specifically for: "${String(focus).slice(0,120)}". All suggestions should fit this.`:`Spread them across these categories: food (meals and cafes that suit who is traveling), music, art, walk, shop, night, and include 2 luggage-storage options near the main station or centre (category "trip", drop true). ${CUR.kws.length?'Favour places matching the interest keywords.':'No interests were given: pick well-loved, varied places most visitors enjoy, so the traveler can discover what they like.'} Consider the trip dates: include seasonal highlights (blossoms, foliage, illuminations, festivals, seasonal food) only when they genuinely happen then.`}
Who is traveling matters most for the choice of places.
Area keys: ${areaList}
Do not repeat these: ${P.map(p=>p.name).slice(0,150).join(', ')||'(none)'}
Reply with only JSON: {"places":[{"name":"Korean name","local":"name in local language for map search","area":"area key","cat":"food|music|art|walk|shop|night|trip","lat":0.0000,"lng":0.0000,"dur":typical minutes,"open":"HH:MM-HH:MM or null if always open (24:00 for midnight)","closed":[weekday numbers, 0=Sunday],"cost":typical spend per person in ${PK.pack.currency},"costNote":"short Korean","tags":["2-5 short Korean keywords; reuse the traveler's keywords when they apply"],"note":"one Korean sentence: what it is and why go","must":"short Korean reason if it is a highlight for this traveler, else empty","drop":false,"cash":true only if the place mostly accepts cash only,"best":"morning|day|sunset|evening|night|any: when this place is best visited","check":"short Korean note if a booking or ticket is needed, else empty"}]}`;
  try{
    const r=await sample.json(prompt,{cache:false,signal}); let added=0; FRESH.clear();
    (Array.isArray(r&&r.places)?r.places:[]).slice(0,n+5).forEach(x=>{const pl=cleanPlace(x);if(pl&&!P.some(p=>norm(p.name)===norm(pl.name)||(p.local&&pl.local&&norm(p.local)===norm(pl.local)))&&!dupOf(pl)){PK.pack.places.push(pl);addPackPlace(pl);FRESH.add(pl.id);added++}});
    savePack(); setSt(stId,added?`새 장소 ${added}곳을 찾았어요. 장소 탭 맨 위 "✨ 방금 찾은 곳"에 모아 뒀어요.`:'이미 있는 곳과 겹쳐서 새로 추가할 장소가 없었어요. 찾는 말을 바꿔 보세요 (예: 현지인 맛집, 조용한 카페).'); return added;
  }catch(e){setSt(stId,e&&e.code==='cancelled'?'멈췄어요. 장소 블록 탭에서 언제든 다시 찾을 수 있어요.':errText(e,'장소를 찾지 못했어요'));return 0}
}
function setBusy(b){onbFrame({nextOff:b,prevOff:b||onbStep===0,skipOff:b,exampleOff:b});['genPack','meSave'].forEach(id=>{const e=document.getElementById(id);if(!e)return;const v=b,L=window.JEPI_UI.live(e);if(L)L.disabled(v);else e.disabled=v})}
async function onbAdvance(){
  if(onbBusy) return;
  if(onbStep===0){
    if(draft.kind==='day'){if(draft.dateSet===false){setSt('st_dates','날짜를 골라 주세요.');return}}else if(!datesReady(draft)){needDates();return}
    const dest=String(draft.dest||'').trim();
    if(!dest){setSt('st_pack','여행지를 먼저 적어 주세요.');return}
    if(norm(dest)!==norm(PK.pack.city)){
      if(sample){if(!(await genPack(dest,'onbNext')))return}
      else{CUR.custom=[];TRIP.save('custom',CUR.custom);CUR.placed=[];save();loadPack(manualPack(dest));savePack();draft.stays.forEach(s=>s.area=firstArea());draft.events.forEach(e=>e.area=firstArea());draft.out.airport=draft.back.airport=firstGw()}
    }
  }
  if(onbStep<ONB.length-1){onbStep++;renderOnb()} else await finishOnb();
}
// 여행지 (drawn by React: TripForms.tsx Dest). Not decided yet → the finder (OnbFinder.tsx).
function partDest(p){
  if(p.destMode==='find') return partFinder(p);
  const ready=PK.pack&&norm(PK.pack.city)===norm(p.dest||'');
  return {f:'dest',dest:p.dest??'',ai:!!sample,ready:ready?`${PK.pack.city} 준비됨 · 동네 ${Object.keys(AREAS).length}곳 · 장소 ${P.length}곳`:'',
    rate:ready&&PK.pack.currency!=='KRW'?{cur:PK.pack.currency,val:+PLC.rate().toFixed(4)}:null};
}


// ---------- routes: Google Routes (abroad), cached on this device ----------
// Korea: Kakao gives no walking / public-transport routes to outside apps, so trips in Korea use the
// straight-line estimate (≈), and "안내 시작" opens Kakao Map with the start and the destination filled in.
let RC=LS.get('jepi.routes',{})||{};
let rcT=0; function rcSave(){clearTimeout(rcT);rcT=setTimeout(()=>{const ks=Object.keys(RC);if(ks.length>700)ks.sort((a,b)=>(RC[a].t||0)-(RC[b].t||0)).slice(0,ks.length-600).forEach(k=>delete RC[k]);LS.set('jepi.routes',RC)},800)}
const inKR=ll=>!!ll&&ll[0]>33&&ll[0]<38.7&&ll[1]>124.4&&ll[1]<131.2;
function routeProvider(a,b){if(inKR(a)&&inKR(b))return null;return KEYS.gmaps&&!keyBad.gmaps?'google':null}
const rkey=(m,a,b)=>`${m}|${(+a[0]).toFixed(4)},${(+a[1]).toFixed(4)}|${(+b[0]).toFixed(4)},${(+b[1]).toFixed(4)}`;
const rq=[], rqSet=new Set(); let rqActive=0, routeStats={ok:0,fail:0};
function routeGet(m,a,b){
  if(!a||!b||!isFinite(a[0])||!isFinite(b[0])||(!a[0]&&!a[1])||(!b[0]&&!b[1])) return null;
  const k=rkey(m,a,b), v=RC[k];
  if(v&&!v.fail) return v;
  if(v&&v.fail&&Date.now()-v.t<6*3600e3) return null;
  const pv=routeProvider(a,b); if(!pv) return null;
  if(!rqSet.has(k)){rqSet.add(k);rq.push({k,m,a,b,pv});pumpRoutes()}
  return null;
}
function pumpRoutes(){
  while(rqActive<2&&rq.length){const j=rq.shift();rqActive++;
    fetchRoute(j).then(v=>{if(v){v.t=Date.now();RC[j.k]=v;routeStats.ok++}else{RC[j.k]={fail:1,t:Date.now()};routeStats.fail++}})
      .catch(e=>{if(e&&e.code==='not_granted'){keyBad[j.pv]=true;keyMsg[j.pv==='google'?'gmaps':'kakao']='✕ 키가 맞지 않거나 이 API가 켜져 있지 않아요'}else RC[j.k]={fail:1,t:Date.now()};routeStats.fail++})
      .finally(()=>{rqActive--;rqSet.delete(j.k);rcSave();routeDirty();pumpRoutes()})}
}
let rdT=0;
function routeDirty(){clearTimeout(rdT);rdT=setTimeout(()=>{
  const ae=document.activeElement; if(ae&&/^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)){routeDirty();return}
  if(!$('#onb').hidden||!$('#sheetBg').hidden){routeDirty();return}
  renderAll(); if(mapState.on) drawMap();
},600)}
function decodePoly(s){const out=[];let i=0,lat=0,lng=0;while(i<s.length){let b,sh=0,r=0;do{b=s.charCodeAt(i++)-63;r|=(b&31)<<sh;sh+=5}while(b>=32);lat+=r&1?~(r>>1):r>>1;sh=0;r=0;do{b=s.charCodeAt(i++)-63;r|=(b&31)<<sh;sh+=5}while(b>=32);lng+=r&1?~(r>>1):r>>1;out.push([lat/1e5,lng/1e5])}return out}
const thin=pts=>{if(pts.length<=160)return pts.map(p=>[+p[0].toFixed(5),+p[1].toFixed(5)]);const st=Math.ceil(pts.length/160),o=[];for(let i=0;i<pts.length;i+=st)o.push(pts[i]);o.push(pts[pts.length-1]);return o.map(p=>[+p[0].toFixed(5),+p[1].toFixed(5)])};
function middayAt(lng){const d=new Date(Date.now()+86400e3);const uh=12-Math.round(lng/15);d.setUTCHours(((uh%24)+24)%24,0,0,0);if(d.getTime()<Date.now()+3600e3)d.setTime(d.getTime()+86400e3);return d.toISOString()}
const VEH={SUBWAY:'지하철',HEAVY_RAIL:'기차',COMMUTER_TRAIN:'전철',HIGH_SPEED_TRAIN:'고속열차',LONG_DISTANCE_TRAIN:'기차',METRO_RAIL:'지하철',MONORAIL:'모노레일',RAIL:'철도',TRAM:'트램',LIGHT_RAIL:'경전철',BUS:'버스',INTERCITY_BUS:'버스',TROLLEYBUS:'버스',FERRY:'페리',CABLE_CAR:'케이블카',FUNICULAR:'푸니쿨라',SHARE_TAXI:'택시'};
async function fetchRoute(j){
  const {m,a,b,pv}=j;
  if(pv==='google'){
    const mode=m==='walk'?'WALK':m==='car'?'DRIVE':'TRANSIT';
    const body={origin:{location:{latLng:{latitude:+a[0],longitude:+a[1]}}},destination:{location:{latLng:{latitude:+b[0],longitude:+b[1]}}},travelMode:mode,languageCode:'ko'};
    if(mode==='TRANSIT')body.departureTime=middayAt(+a[1]);
    if(mode==='DRIVE')body.routingPreference='TRAFFIC_UNAWARE';
    let r;try{r=await fetch('https://routes.googleapis.com/directions/v2:computeRoutes',{method:'POST',headers:{'content-type':'application/json','X-Goog-Api-Key':KEYS.gmaps,
      'X-Goog-FieldMask':'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.steps.travelMode,routes.legs.steps.transitDetails.transitLine.nameShort,routes.legs.steps.transitDetails.transitLine.name,routes.legs.steps.transitDetails.transitLine.vehicle.type,routes.travelAdvisory.transitFare'},body:JSON.stringify(body)})}
    catch(_){throw aiErr('network')}
    if(r.status===401||r.status===403)throw aiErr('not_granted');
    if(!r.ok)return null;
    const jj=await r.json(), rt=(jj.routes||[])[0];
    if(!rt){if(mode==='TRANSIT'&&km(a,b)<2.5)return fetchRoute({m:'walk',a,b,pv});return null}
    const steps=((rt.legs||[])[0]||{}).steps||[], tr=steps.filter(s=>s.transitDetails&&s.transitDetails.transitLine);
    const kinds=[...new Set(tr.map(s=>VEH[((s.transitDetails.transitLine.vehicle||{}).type)]||'대중교통'))];
    const lines=tr.map(s=>{const L=s.transitDetails.transitLine;return L.nameShort||L.name||''}).filter(Boolean);
    const fare=rt.travelAdvisory&&rt.travelAdvisory.transitFare;
    return {min:Math.max(1,Math.ceil(parseInt(rt.duration||'0',10)/60)),label:mode==='WALK'||!tr.length?(mode==='DRIVE'?'차':'도보'):(kinds.length===1?kinds[0]:'대중교통'),
      lines:[...new Set(lines)].slice(0,4).join(' → '),tf:Math.max(0,tr.length-1),fare:fare?(+fare.units||0)+(fare.nanos||0)/1e9:null,cur:fare?fare.currencyCode:'',
      poly:rt.polyline&&rt.polyline.encodedPolyline?thin(decodePoly(rt.polyline.encodedPolyline)):null,km:(rt.distanceMeters||0)/1000,src:'google'};
  }
  return null;
}
const navLink=(a,b,mode,name)=>inKR(a)&&inKR(b)?`https://map.kakao.com/link/from/${encodeURIComponent('출발')},${a[0]},${a[1]}/to/${encodeURIComponent(name||'도착')},${b[0]},${b[1]}`:mapsLink(a,b,mode);

